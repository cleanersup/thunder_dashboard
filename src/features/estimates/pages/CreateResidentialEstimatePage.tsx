import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileText, Building2 } from "lucide-react";
import { RESIDENTIAL_STEPS } from "../config/steps.config";
import { EstimateClientStep, type ClientEntity, type LeadEntity, type EstimateEntityType } from "../components/EstimateClientStep";
import { EstimateFormLayout }    from "../components/EstimateFormLayout";
import { DraftStatusIndicator }  from "../components/DraftStatusIndicator";
import { ExitConfirmationDialog } from "../components/ExitConfirmationDialog";
import { ResServiceStep }  from "../components/residential/ResServiceStep";
import { ResRoomsStep }    from "../components/residential/ResRoomsStep";
import { ResAdditionalStep } from "../components/residential/ResAdditionalStep";
import { ResExtrasStep, type ExtrasState } from "../components/residential/ResExtrasStep";
import { ResPetsStep }     from "../components/residential/ResPetsStep";
import { ResLaundryStep }  from "../components/residential/ResLaundryStep";
import { ResScopeStep }    from "../components/residential/ResScopeStep";
import { ResSummaryStep }  from "../components/residential/ResSummaryStep";
import { ResPreviewStep } from "../components/residential/ResPreviewStep";
import { ResSendStep, type DeliveryMethod } from "../components/residential/ResSendStep";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCreateEstimate, useUpdateEstimate } from "../hooks/useEstimates";
import { useSendEstimateEmail } from "../hooks/useSendEstimateEmail";
import { useSendEstimateSMS }   from "../hooks/useSendEstimateSMS";
import { useDraftEstimate } from "../hooks/useDraftEstimate";
import { useResidentialPricing } from "../hooks/useResidentialPricing";
import { useProfile, getCompanyAddress } from "@/shared/hooks/useProfile";
import type { DraftData } from "../types/estimate.types";

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CreateResidentialEstimatePage() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { isEditing, estimateId, estimateData, prefill } = (location.state as any) || {};
  const createEst   = useCreateEstimate();
  const updateEst   = useUpdateEstimate();
  const { sendEstimateEmail, isSending } = useSendEstimateEmail();
  const { sendEstimateSMS }              = useSendEstimateSMS();
  const { data: profile }                = useProfile();
  const companyAddress                   = getCompanyAddress(profile);

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [showExitDialog,       setShowExitDialog]       = useState(false);
  const [showCompanyInfoAlert, setShowCompanyInfoAlert] = useState(false);

  // ── Company info check on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!profile || step !== 0 || isEditing) return;
    const complete = profile.company_address && profile.company_city &&
                     profile.company_state   && profile.company_zip;
    if (!complete) setShowCompanyInfoAlert(true);
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 0: Client ────────────────────────────────────────────────────────
  const [estimateType,   setEstimateType]   = useState<EstimateEntityType | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientEntity | null>(null);
  const [selectedLead,   setSelectedLead]   = useState<LeadEntity | null>(null);
  const [stepErrors,     setStepErrors]     = useState<Record<string, boolean>>({});

  // ── Step 1: Service ───────────────────────────────────────────────────────
  const [selectedService,      setSelectedService]      = useState("");
  const [squareFootage,        setSquareFootage]        = useState("");
  const [postConstructionType, setPostConstructionType] = useState<string | null>(null);

  // ── Step 2: Rooms ─────────────────────────────────────────────────────────
  const [bedrooms,    setBedrooms]    = useState(0);
  const [kitchens,    setKitchens]    = useState(0);
  const [livingRooms, setLivingRooms] = useState(0);
  const [diningRooms, setDiningRooms] = useState(0);
  const [offices,     setOffices]     = useState(0);
  const [fullBaths,   setFullBaths]   = useState(0);
  const [halfBaths,   setHalfBaths]   = useState(0);

  // ── Step 3: Additional ────────────────────────────────────────────────────
  const [fans,           setFans]           = useState(0);
  const [oven,           setOven]           = useState(0);
  const [refrigerator,   setRefrigerator]   = useState(0);
  const [blinds,         setBlinds]         = useState(0);
  const [windowsInside,  setWindowsInside]  = useState(0);
  const [windowsOutside, setWindowsOutside] = useState(0);

  // ── Step 4: Extras ────────────────────────────────────────────────────────
  const [extras, setExtras] = useState<ExtrasState>({
    baseboard: false, patio: false, walls: false, stairs: false,
    cabinetInside: false, cabinetOutside: false, washDishes: false, hallways: false, basement: false,
  });

  // ── Step 5: Pets ──────────────────────────────────────────────────────────
  const [pets, setPets] = useState<"yes" | "no" | null>(null);

  // ── Step 6: Laundry ───────────────────────────────────────────────────────
  const [laundryService, setLaundryService] = useState<"wash-dry" | "wash-dry-fold" | null>(null);
  const [laundryPounds,  setLaundryPounds]  = useState(0);

  // ── Step 7: Scope ─────────────────────────────────────────────────────────
  const [scope, setScope] = useState("");

  // ── Step 8: Summary pricing ───────────────────────────────────────────────
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice,    setCustomPrice]    = useState("");
  const [applyDiscount,  setApplyDiscount]  = useState(false);
  const [discountType,   setDiscountType]   = useState<"percentage" | "amount">("percentage");
  const [discountValue,  setDiscountValue]  = useState("");

  // ── Step 10: Send ─────────────────────────────────────────────────────────
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [showSuccess,    setShowSuccess]    = useState(false);

  // ── User state ────────────────────────────────────────────────────────────
  const [userState, setUserState] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("company_state").eq("user_id", user.id).maybeSingle();
      if (data?.company_state) setUserState(data.company_state);
    })();
  }, []);

  // ── Prefill when editing ──────────────────────────────────────────────────
  useEffect(() => {
    if (isEditing && estimateData) {
      const d = estimateData;
      setSelectedService(d.service_sub_type ?? "");
      const md = (d.main_data as any) ?? {};
      setSquareFootage(md.squareFootage ?? "");
      setBedrooms(md.bedrooms ?? 0); setKitchens(md.kitchens ?? 0); setLivingRooms(md.livingRooms ?? 0);
      setDiningRooms(md.diningRooms ?? 0); setOffices(md.offices ?? 0); setFullBaths(md.fullBaths ?? 0); setHalfBaths(md.halfBaths ?? 0);
      const ad = (d.additional_data as any) ?? {};
      setFans(ad.fans ?? 0); setOven(ad.oven ?? 0); setRefrigerator(ad.refrigerator ?? 0);
      setBlinds(ad.blinds ?? 0); setWindowsInside(ad.windowsInside ?? 0); setWindowsOutside(ad.windowsOutside ?? 0);
      if (d.extra_services) setExtras(d.extra_services as any);
      setPets(d.pets === "Yes" ? "yes" : d.pets === "No" ? "no" : null);
      setScope(d.service_scope ?? "");
      if (d.discount_type) { setApplyDiscount(true); setDiscountType(d.discount_type as any); setDiscountValue(d.discount_value?.toString() ?? ""); }
    }
  }, [isEditing, estimateData]);

  // ── Prefill from walkthrough ──────────────────────────────────────────────
  useEffect(() => {
    if (!prefill) return;
    (async () => {
      if (prefill.client_id) {
        setEstimateType("client");
        const { data: c } = await supabase.from("clients").select("*").eq("id", prefill.client_id).maybeSingle();
        if (c) setSelectedClient(c as ClientEntity);
      } else if (prefill.lead_id) {
        setEstimateType("lead");
        const { data: l } = await supabase.from("leads").select("*").eq("id", prefill.lead_id).maybeSingle();
        if (l) setSelectedLead(l as LeadEntity);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draft ─────────────────────────────────────────────────────────────────
  const { saveDraft, deleteDraft, isSaving, lastSaved } =
    useDraftEstimate({ serviceType: "Residential" });

  const collectDraftData = useCallback((): DraftData => ({
    currentStep: step, estimateType,
    clientId: selectedClient?.id ?? null, leadId: selectedLead?.id ?? null,
    formData: {
      selectedService, squareFootage, postConstructionType,
      bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths,
      fans, oven, refrigerator, blinds, windowsInside, windowsOutside,
      extras, pets, laundryService, laundryPounds, scope,
      useCustomPrice, customPrice, applyDiscount, discountType, discountValue, deliveryMethod,
    },
  }), [
    step, estimateType, selectedClient, selectedLead, selectedService, squareFootage,
    bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths,
    fans, oven, refrigerator, blinds, windowsInside, windowsOutside,
    extras, pets, laundryService, laundryPounds, scope,
    useCustomPrice, customPrice, applyDiscount, discountType, discountValue, deliveryMethod,
  ]);

  // Auto-save on any field change (via collectDraftData dependencies)
  useEffect(() => {
    if (!isEditing) saveDraft(collectDraftData());
  }, [collectDraftData, isEditing, saveDraft]);

  // ── Pricing ───────────────────────────────────────────────────────────────
  const pricing = useResidentialPricing({
    bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths,
    fans, oven, refrigerator, blinds, windowsInside, windowsOutside,
    extras, pets, laundryService, laundryPounds, selectedService, userState,
    useCustomPrice, customPrice, applyDiscount, discountType, discountValue,
  });

  // ── Client helpers ────────────────────────────────────────────────────────
  function getClientInfo() {
    if (estimateType === "client" && selectedClient) {
      return {
        name: selectedClient.full_name, company: selectedClient.company ?? "",
        phone: selectedClient.phone, email: selectedClient.email,
        address: selectedClient.service_street, apt: selectedClient.service_apt ?? "",
        city: selectedClient.service_city, state: selectedClient.service_state, zip: selectedClient.service_zip,
      };
    }
    if (estimateType === "lead" && selectedLead) {
      return {
        name: selectedLead.full_name, company: selectedLead.company_name ?? "",
        phone: selectedLead.phone, email: selectedLead.email,
        address: selectedLead.address, apt: selectedLead.apt_suite ?? "",
        city: selectedLead.city, state: selectedLead.state, zip: selectedLead.zip_code,
      };
    }
    return null;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const client = getClientInfo();
    if (!client) { toast.error("Please select a client or lead"); return; }
    const { subtotal, total, laborCost, suppliesCost, overheadCost, totalOpCost } = pricing;

    const payload = {
      client_name: client.name, company_name: client.company,
      email: client.email, phone: client.phone.replace(/\D/g, ""),
      address: client.address, apt: client.apt || null,
      city: client.city, state: client.state, zip: client.zip,
      service_type: "Residential", service_sub_type: selectedService,
      service_scope: scope || null,
      main_data: { squareFootage, bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths } as any,
      additional_data: { fans, oven, refrigerator, blinds, windowsInside, windowsOutside } as any,
      extra_services: extras as any,
      pets: pets === "yes" ? "Yes" : "No",
      laundry: laundryService ? `${laundryService} - ${laundryPounds} pounds` : "No",
      discount_type: applyDiscount ? discountType : null,
      discount_value: applyDiscount && discountValue ? parseFloat(discountValue) : null,
      subtotal, total, labor_cost: laborCost, supplies_cost: suppliesCost,
      overhead_cost: overheadCost, total_operation_cost: totalOpCost,
      status: "Pending", estimate_date: new Date().toISOString(),
    };

    try {
      let savedId: string;
      if (isEditing && estimateId) {
        await updateEst.mutateAsync({ id: estimateId, update: payload });
        savedId = estimateId;
        toast.success("Estimate updated");
      } else {
        const saved = await createEst.mutateAsync(payload);
        savedId = saved.id;
      }
      if (deliveryMethod === "email" || deliveryMethod === "both") {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
        await sendEstimateEmail({
          estimateData: { ...payload, id: savedId, company_logo: profile?.company_logo, company_name: profile?.company_name, company_email: profile?.company_email, company_phone: profile?.company_phone },
          recipientEmail: client.email, estimateType: "residential",
        });
      }
      // Send SMS when delivery method includes sms
      if ((deliveryMethod === "sms" || deliveryMethod === "both") && client.phone) {
        await sendEstimateSMS({
          phoneNumber:   client.phone,
          clientName:    client.name,
          estimateId:    savedId,
          estimateTotal: payload.total ?? 0,
          isUpdate:      !!isEditing,
        });
      }
      await deleteDraft();
      setShowSuccess(true);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save estimate");
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(s: number): boolean {
    const errs: Record<string, boolean> = {};
    if (s === 0) {
      if (!estimateType) errs.estimateType = true;
      if (estimateType === "client" && !selectedClient) errs.selectedEntity = true;
      if (estimateType === "lead"   && !selectedLead)   errs.selectedEntity = true;
    }
    if (s === 1 && !selectedService) errs.selectedService = true;
    if (s === 2 && (bedrooms + kitchens + livingRooms + diningRooms + offices + fullBaths + halfBaths) === 0) errs.rooms = true;
    if (s === 5  && !pets)           errs.pets           = true;
    if (s === 10 && !deliveryMethod) errs.deliveryMethod = true;
    setStepErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (!validate(step)) return;
    if (step === RESIDENTIAL_STEPS.length - 1) { handleSubmit(); return; }
    setStep((s) => s + 1);
  }

  function handleBack() {
    setStep((s) => s - 1);
  }

  function handleExit() {
    setShowExitDialog(true);
  }

  // ── Step renderer ─────────────────────────────────────────────────────────
  const client = getClientInfo();

  function renderStep() {
    switch (step) {
      case 0: return (
        <EstimateClientStep
          estimateType={estimateType}
          onEstimateTypeChange={(type) => { setEstimateType(type); setSelectedClient(null); setSelectedLead(null); }}
          selectedClient={selectedClient} selectedLead={selectedLead}
          onClientSelect={(c) => { setSelectedClient(c); setSelectedLead(null); }}
          onLeadSelect={(l) => { setSelectedLead(l); setSelectedClient(null); }}
          companyAddress={companyAddress || undefined}
          errors={{
            type:   stepErrors.estimateType   ? "Please select a client type" : undefined,
            entity: stepErrors.selectedEntity ? `Please select a ${estimateType ?? "client or lead"}` : undefined,
          }}
        />
      );
      case 1: return (
        <ResServiceStep
          service={selectedService} squareFootage={squareFootage}
          postConstructionType={postConstructionType}
          onServiceChange={(svc) => {
            setSelectedService(svc);
            if (svc !== "Post Construction") setPostConstructionType(null);
          }}
          onSqftChange={setSquareFootage}
          onPostConstructionTypeChange={setPostConstructionType}
          error={stepErrors.selectedService}
        />
      );
      case 2: return (
        <ResRoomsStep
          bedrooms={bedrooms} kitchens={kitchens} livingRooms={livingRooms}
          diningRooms={diningRooms} offices={offices} fullBaths={fullBaths} halfBaths={halfBaths}
          onChange={(field, val) => {
            const map: Record<string, (v: number) => void> = {
              bedrooms: setBedrooms, kitchens: setKitchens, livingRooms: setLivingRooms,
              diningRooms: setDiningRooms, offices: setOffices, fullBaths: setFullBaths, halfBaths: setHalfBaths,
            };
            map[field]?.(val);
          }}
          error={stepErrors.rooms}
        />
      );
      case 3: return (
        <ResAdditionalStep
          fans={fans} oven={oven} refrigerator={refrigerator}
          blinds={blinds} windowsInside={windowsInside} windowsOutside={windowsOutside}
          onChange={(field, val) => {
            const map: Record<string, (v: number) => void> = {
              fans: setFans, oven: setOven, refrigerator: setRefrigerator,
              blinds: setBlinds, windowsInside: setWindowsInside, windowsOutside: setWindowsOutside,
            };
            map[field]?.(val);
          }}
        />
      );
      case 4: return (
        <ResExtrasStep
          extras={extras}
          onChange={(key, val) => setExtras((e) => ({ ...e, [key]: val }))}
        />
      );
      case 5: return <ResPetsStep pets={pets} onChange={setPets} error={stepErrors.pets} />;
      case 6: return (
        <ResLaundryStep
          laundryService={laundryService} laundryPounds={laundryPounds}
          onServiceChange={setLaundryService} onPoundsChange={setLaundryPounds}
        />
      );
      case 7: return <ResScopeStep scope={scope} onChange={setScope} />;
      case 8: return (
        <ResSummaryStep
          pricing={pricing} selectedService={selectedService}
          client={client ? { name: client.name, email: client.email, phone: client.phone, address: client.address, city: client.city, state: client.state, zip: client.zip } : null}
          useCustomPrice={useCustomPrice} customPrice={customPrice}
          applyDiscount={applyDiscount} discountType={discountType} discountValue={discountValue}
          onUseCustomPriceChange={setUseCustomPrice} onCustomPriceChange={setCustomPrice}
          onApplyDiscountChange={setApplyDiscount} onDiscountTypeChange={setDiscountType} onDiscountValueChange={setDiscountValue}
        />
      );
      case 9: return (
        <ResPreviewStep
          client={client}
          selectedService={selectedService}
          bedrooms={bedrooms} kitchens={kitchens} livingRooms={livingRooms}
          diningRooms={diningRooms} offices={offices} fullBaths={fullBaths} halfBaths={halfBaths}
          fans={fans} oven={oven} refrigerator={refrigerator}
          blinds={blinds} windowsInside={windowsInside} windowsOutside={windowsOutside}
          extras={extras} pets={pets} laundryService={laundryService} laundryPounds={laundryPounds}
          scope={scope}
          total={pricing.total} subtotal={pricing.subtotal}
          applyDiscount={applyDiscount} discountType={discountType} discountValue={discountValue}
        />
      );
      case 10: return (
        <ResSendStep
          client={client ? { name: client.name, email: client.email, phone: client.phone } : null}
          total={pricing.total}
          deliveryMethod={deliveryMethod}
          onChange={setDeliveryMethod}
          error={stepErrors.deliveryMethod}
        />
      );
      default: return null;
    }
  }

  const isLoading = createEst.isPending || updateEst.isPending || isSending;

  return (
    <>
      <ExitConfirmationDialog
        open={showExitDialog}
        onSave={() => { saveDraft(collectDraftData()); setShowExitDialog(false); navigate(-1); }}
        onDiscard={() => { deleteDraft(); setShowExitDialog(false); navigate(-1); }}
        onCancel={() => setShowExitDialog(false)}
      />

      <EstimateFormLayout
        title="Residential Estimate"
        steps={RESIDENTIAL_STEPS}
        currentStep={step}
        onBack={handleBack}
        onNext={handleNext}
        onExit={handleExit}
        isLastStep={step === RESIDENTIAL_STEPS.length - 1}
        isLoading={isLoading}
        isEditing={isEditing}
        draftIndicator={!isEditing ? <DraftStatusIndicator isSaving={isSaving} lastSaved={lastSaved} /> : undefined}
      >
        {renderStep()}
      </EstimateFormLayout>

      {/* ── Company info alert ──────────────────────────────────────────── */}
      <AlertDialog open={showCompanyInfoAlert} onOpenChange={setShowCompanyInfoAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-destructive" />
              Complete Company Information
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Para calcular el estimado debes llenar todos los datos de la dirección de tu empresa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="w-full"
              onClick={() => { setShowCompanyInfoAlert(false); navigate("/profile", { state: { section: "company-info" } }); }}
            >
              Go to Company Information
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--green-vibrant) / 0.1)" }}>
                <FileText className="w-8 h-8" style={{ color: "hsl(var(--green-vibrant))" }} />
              </div>
            </div>
            <AlertDialogTitle className="text-center">
              {isEditing ? "Estimate Updated!" : "Estimate Created!"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {deliveryMethod ? "The estimate has been created and sent successfully." : "The estimate has been saved successfully."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => { setShowSuccess(false); navigate("/estimates"); }}>
              View Estimates
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CreateResidentialEstimatePage;
