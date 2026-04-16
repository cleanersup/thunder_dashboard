/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { toast } from "sonner";
import { useCreateEstimate, useUpdateEstimate } from "../hooks/useEstimates";
import { useSendEstimateEmail } from "../hooks/useSendEstimateEmail";
import { useSendEstimateSMS }   from "../hooks/useSendEstimateSMS";
import { useDraftEstimate } from "../hooks/useDraftEstimate";
import { fetchEstimate } from "../services/estimatesService";
import { fetchClient } from "@/features/crm/clients/services/clientsService";
import { fetchLead } from "@/features/crm/leads/services/leadsService";
import { useResidentialPricing } from "../hooks/useResidentialPricing";
import { useProfile, getCompanyAddress } from "@/shared/hooks/useProfile";
import type { DraftData } from "../types/estimate.types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  open?: boolean;
  onClose?: () => void;
  initialState?: { isEditing?: boolean; estimateId?: string; estimateData?: any; prefill?: any; };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CreateResidentialEstimatePage({ open, onClose, initialState }: Props = {}) {
  const navigate    = useNavigate();
  const location    = useLocation();
  const locationState = (location.state as any) || {};
  const { isEditing, estimateId, estimateData, prefill } = initialState ?? locationState;
  const isModal = onClose !== undefined;
  const goBack = useCallback(() => {
    if (isModal) onClose!();
    else navigate(-1);
  }, [isModal, onClose, navigate]);
  const createEst   = useCreateEstimate();
  const updateEst   = useUpdateEstimate();
  const { sendEstimateEmail, isSending } = useSendEstimateEmail();
  const { sendEstimateSMS }              = useSendEstimateSMS();
  const { data: profile }                = useProfile();
  const companyAddress                   = getCompanyAddress(profile);

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [isPrefilling,         setIsPrefilling]         = useState(!!isEditing);
  const [showExitDialog,       setShowExitDialog]       = useState(false);
  const [showCompanyInfoAlert, setShowCompanyInfoAlert] = useState(false);

  // ── Company info check on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!profile || step !== 0 || isEditing) return;
    if (isModal && !open) return; // skip when modal is mounted but not yet opened
    const complete = profile.company_address && profile.company_city &&
                     profile.company_state   && profile.company_zip;
    if (!complete) setShowCompanyInfoAlert(true);
  }, [profile, open]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const p = profile as any;
    if (p?.company_state) setUserState(p.company_state);
  }, [profile]);

  // ── Prefill when editing ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      try {
        let d = estimateData;
        if (!d && estimateId) {
          const fetched = await fetchEstimate(estimateId);
          if (!fetched) return;
          d = fetched;
        }
        if (!d) return;

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

        const laundryStr = d.laundry ?? "";
        if (laundryStr && laundryStr !== "No") {
          const match = laundryStr.match(/^(wash-dry|wash-dry-fold)\s*-\s*(\d+)\s*pounds?/i);
          if (match) {
            setLaundryService((match[1] === "wash-dry-fold" ? "wash-dry-fold" : "wash-dry") as "wash-dry" | "wash-dry-fold");
            setLaundryPounds(parseInt(match[2], 10) || 0);
          }
        }

        if (d.client_id) {
          try {
            const client = await fetchClient(d.client_id);
            setEstimateType("client");
            setSelectedClient(client as ClientEntity);
            setSelectedLead(null);
            return;
          } catch { /* fall through to synthetic */ }
        }
        if (d.lead_id) {
          try {
            const lead = await fetchLead(d.lead_id);
            setEstimateType("lead");
            setSelectedLead(lead as LeadEntity);
            setSelectedClient(null);
            return;
          } catch { /* fall through to synthetic */ }
        }
        // Estimates store client data denormalized — client_id/lead_id are only
        // set on drafts. For finalized estimates use the stored fields directly.
        // Never fall back to email lookup: multiple contacts can share the same
        // email address, which would load the wrong entity.
        const syntheticClient: ClientEntity = {
          id: `estimate-edit-${d.id}`,
          full_name: d.client_name,
          company: d.company_name ?? null,
          phone: d.phone,
          email: d.email,
          service_street: d.address,
          service_apt: d.apt ?? null,
          service_city: d.city,
          service_state: d.state,
          service_zip: d.zip,
        };
        setEstimateType("client");
        setSelectedClient(syntheticClient);
        setSelectedLead(null);
      } finally {
        setIsPrefilling(false);
      }
    })();
  }, [isEditing, estimateId, estimateData]);

  // ── Prefill from walkthrough ──────────────────────────────────────────────
  useEffect(() => {
    if (!prefill) return;
    (async () => {
      if (prefill.client_id) {
        setEstimateType("client");
        try {
          const c = await fetchClient(prefill.client_id);
          if (c) setSelectedClient(c as ClientEntity);
        } catch { /* ignore — picker stays empty */ }
      } else if (prefill.lead_id) {
        setEstimateType("lead");
        try {
          const l = await fetchLead(prefill.lead_id);
          if (l) setSelectedLead(l as LeadEntity);
        } catch { /* ignore — picker stays empty */ }
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draft ─────────────────────────────────────────────────────────────────
  const { saveDraft, deleteDraft, isSaving, lastSaved, loadedDraft, clearLoadedDraft } =
    useDraftEstimate({ serviceType: "Residential" });

  // Auto-restore draft on open (runs once when loadedDraft arrives from DB)
  useEffect(() => {
    if (!loadedDraft || isEditing) return;
    const { draftData } = loadedDraft;
    const fd = draftData.formData as any;

    setStep(draftData.currentStep ?? 0);
    if (draftData.estimateType) setEstimateType(draftData.estimateType);

    if (fd.selectedService       !== undefined) setSelectedService(fd.selectedService);
    if (fd.squareFootage         !== undefined) setSquareFootage(fd.squareFootage);
    if (fd.postConstructionType  !== undefined) setPostConstructionType(fd.postConstructionType);
    if (fd.bedrooms    !== undefined) setBedrooms(fd.bedrooms);
    if (fd.kitchens    !== undefined) setKitchens(fd.kitchens);
    if (fd.livingRooms !== undefined) setLivingRooms(fd.livingRooms);
    if (fd.diningRooms !== undefined) setDiningRooms(fd.diningRooms);
    if (fd.offices     !== undefined) setOffices(fd.offices);
    if (fd.fullBaths   !== undefined) setFullBaths(fd.fullBaths);
    if (fd.halfBaths   !== undefined) setHalfBaths(fd.halfBaths);
    if (fd.fans           !== undefined) setFans(fd.fans);
    if (fd.oven           !== undefined) setOven(fd.oven);
    if (fd.refrigerator   !== undefined) setRefrigerator(fd.refrigerator);
    if (fd.blinds         !== undefined) setBlinds(fd.blinds);
    if (fd.windowsInside  !== undefined) setWindowsInside(fd.windowsInside);
    if (fd.windowsOutside !== undefined) setWindowsOutside(fd.windowsOutside);
    if (fd.extras         !== undefined) setExtras(fd.extras);
    if (fd.pets           !== undefined) setPets(fd.pets);
    if (fd.laundryService !== undefined) setLaundryService(fd.laundryService);
    if (fd.laundryPounds  !== undefined) setLaundryPounds(fd.laundryPounds);
    if (fd.scope          !== undefined) setScope(fd.scope);
    if (fd.useCustomPrice !== undefined) setUseCustomPrice(fd.useCustomPrice);
    if (fd.customPrice    !== undefined) setCustomPrice(fd.customPrice);
    if (fd.applyDiscount  !== undefined) setApplyDiscount(fd.applyDiscount);
    if (fd.discountType   !== undefined) setDiscountType(fd.discountType);
    if (fd.discountValue  !== undefined) setDiscountValue(fd.discountValue);
    if (fd.deliveryMethod !== undefined) setDeliveryMethod(fd.deliveryMethod);

    (async () => {
      if (draftData.clientId) {
        try {
          const client = await fetchClient(draftData.clientId);
          setEstimateType("client");
          setSelectedClient(client as ClientEntity);
          setSelectedLead(null);
        } catch { /* ignore */ }
      } else if (draftData.leadId) {
        try {
          const lead = await fetchLead(draftData.leadId);
          setEstimateType("lead");
          setSelectedLead(lead as LeadEntity);
          setSelectedClient(null);
        } catch { /* ignore */ }
      }
    })();

    clearLoadedDraft();
  }, [loadedDraft]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      client_id: estimateType === "client" ? (selectedClient?.id ?? null) : null,
      lead_id:   estimateType === "lead"   ? (selectedLead?.id   ?? null) : null,
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
      status: (deliveryMethod === "email" || deliveryMethod === "sms" || deliveryMethod === "both") ? "Pending" : "Draft",
      estimate_date: new Date().toISOString(),
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

  const isLoading = createEst.isPending || updateEst.isPending || isSending || isPrefilling;

  const stepContent = isPrefilling ? (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ) : renderStep();

  // ── Shared dialogs (outside any modal) ───────────────────────────────────
  const formDialogs = (
    <>
      <ExitConfirmationDialog
        open={showExitDialog}
        isEditing={isEditing}
        onSave={() => { saveDraft(collectDraftData()); setShowExitDialog(false); goBack(); }}
        onDiscard={async () => {
          if (!isEditing) await deleteDraft();
          setShowExitDialog(false);
          goBack();
        }}
        onCancel={() => setShowExitDialog(false)}
      />

      {/* ── Company info alert ────────────────────────────────────────── */}
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
            <AlertDialogAction onClick={() => { setShowSuccess(false); goBack(); }}>
              View Estimates
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // ── Modal mode ───────────────────────────────────────────────────────────
  if (isModal) {
    return (
      <>
        <FullScreenModal open={open ?? false} onClose={handleExit}>
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
            isModal
            draftIndicator={!isEditing ? <DraftStatusIndicator isSaving={isSaving} lastSaved={lastSaved} /> : undefined}
          >
            {stepContent}
          </EstimateFormLayout>
        </FullScreenModal>
        {formDialogs}
      </>
    );
  }

  // ── Page mode ────────────────────────────────────────────────────────────
  return (
    <>
      {formDialogs}
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
    </>
  );
}

export default CreateResidentialEstimatePage;
