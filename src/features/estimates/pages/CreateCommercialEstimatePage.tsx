import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileText, Building2 } from "lucide-react";
import { COMMERCIAL_STEPS } from "../config/steps.config";
import { EstimateClientStep, type ClientEntity, type LeadEntity, type EstimateEntityType } from "../components/EstimateClientStep";
import { EstimateFormLayout }    from "../components/EstimateFormLayout";
import { DraftStatusIndicator }  from "../components/DraftStatusIndicator";
import { ExitConfirmationDialog } from "../components/ExitConfirmationDialog";
import { CommPropertyStep } from "../components/commercial/CommPropertyStep";
import { CommDetailsStep }  from "../components/commercial/CommDetailsStep";
import { CommMainStep }     from "../components/commercial/CommMainStep";
import { CommScopeStep }    from "../components/commercial/CommScopeStep";
import { CommSummaryStep }  from "../components/commercial/CommSummaryStep";
import { CommPreviewStep }  from "../components/commercial/CommPreviewStep";
import { CommSendStep, type DeliveryMethod } from "../components/commercial/CommSendStep";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { toast } from "sonner";
import { useProfile, getCompanyAddress } from "@/shared/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { fetchClient } from "@/features/crm/clients/services/clientsService";
import { fetchLead } from "@/features/crm/leads/services/leadsService";
import { useCreateEstimate, useUpdateEstimate } from "../hooks/useEstimates";
import { useSendEstimateEmail } from "../hooks/useSendEstimateEmail";
import { useSendEstimateSMS }   from "../hooks/useSendEstimateSMS";
import { useDraftEstimate } from "../hooks/useDraftEstimate";
import { fetchEstimate } from "../services/estimatesService";
import { useCommercialPricing, isGroupB } from "../hooks/useCommercialPricing";
import type { DraftData } from "../types/estimate.types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  open?: boolean;
  onClose?: () => void;
  initialState?: { isEditing?: boolean; estimateId?: string; estimateData?: any; prefill?: any; };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CreateCommercialEstimatePage({ open, onClose, initialState }: Props = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as any) || {};
  const { isEditing, estimateId, estimateData, prefill } = initialState ?? locationState;
  const isModal = onClose !== undefined;
  const goBack = useCallback(() => {
    if (isModal) onClose!();
    else navigate(-1);
  }, [isModal, onClose, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutateAsync: createEstimate } = useCreateEstimate();
  const { mutateAsync: updateEstimate } = useUpdateEstimate();
  const { sendEstimateEmail, isSending: isSendingEmail } = useSendEstimateEmail();
  const { sendEstimateSMS }                              = useSendEstimateSMS();

  // ── Step ──────────────────────────────────────────────────────────────────
  const [currentStep,          setCurrentStep]          = useState(0);
  const [showExitDialog,       setShowExitDialog]       = useState(false);
  const [showCompanyInfoAlert, setShowCompanyInfoAlert] = useState(false);

  const [isSavingForm,   setIsSavingForm]   = useState(false);
  const [showSuccess,    setShowSuccess]    = useState(false);

  // ── Entity selection ──────────────────────────────────────────────────────
  const [estimateType,   setEstimateType]   = useState<EstimateEntityType | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientEntity | null>(null);
  const [selectedLead,   setSelectedLead]   = useState<LeadEntity | null>(null);

  // ── Step 1: Property ──────────────────────────────────────────────────────
  const [propertyType,       setPropertyType]       = useState("");
  const [isOtherProperty,    setIsOtherProperty]    = useState(false);
  const [otherPropertyType,  setOtherPropertyType]  = useState("");
  const [propertySize,       setPropertySize]       = useState("");
  const [serviceType,        setServiceType]        = useState<"one-time" | "recurrent" | "">("");
  const [recurringFrequency, setRecurringFrequency] = useState("");
  const [selectedWeekDays,   setSelectedWeekDays]   = useState<string[]>([]);
  const [contractDuration,   setContractDuration]   = useState("");
  const [contractTimeUnit,   setContractTimeUnit]   = useState("months");

  // ── Step 2: Details (Group B) ─────────────────────────────────────────────
  const [clientProvidesSupplies, setClientProvidesSupplies] = useState(false);
  const [serviceSchedule,        setServiceSchedule]        = useState("");
  const [greaseLevel,            setGreaseLevel]            = useState("");
  const [restaurantCondition,    setRestaurantCondition]    = useState("");
  const [extraServices,          setExtraServices]          = useState<string[]>([]);

  // ── Step 3: Main ──────────────────────────────────────────────────────────
  const [employeeCount,    setEmployeeCount]    = useState(0);
  const [hourlyRate,       setHourlyRate]       = useState("");
  const [cleaningDuration, setCleaningDuration] = useState(0);
  const [startTime,        setStartTime]        = useState("");

  // ── Step 4: Scope ─────────────────────────────────────────────────────────
  const [scopeDetails, setScopeDetails] = useState("");

  // ── Step 5: Summary ───────────────────────────────────────────────────────
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice,    setCustomPrice]    = useState("");
  const [applyDiscount,  setApplyDiscount]  = useState(false);
  const [discountType,   setDiscountType]   = useState<"percentage" | "amount">("percentage");
  const [discountValue,  setDiscountValue]  = useState("");

  // ── Step 6: Send ──────────────────────────────────────────────────────────
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);

  // ── Validation errors ─────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // ── Profile ───────────────────────────────────────────────────────────────
  const { data: profile }  = useProfile();
  const companyAddress     = getCompanyAddress(profile);

  // ── Company info check on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!profile || currentStep !== 0 || isEditing) return;
    if (isModal && !open) return; // skip when modal is mounted but not yet opened
    const complete = profile.company_address && profile.company_city &&
                     profile.company_state   && profile.company_zip;
    if (!complete) setShowCompanyInfoAlert(true);
  }, [profile, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Prefill when editing ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      let d = estimateData;
      if (!d && estimateId) {
        const fetched = await fetchEstimate(estimateId);
        if (!fetched) return;
        d = fetched;
      }
      if (!d) return;

      const md = (d.main_data as any) ?? {};
      const ad = (d.additional_data as any) ?? {};
      const propType = md.propertyType ?? "";
      console.log("main data", md);
      console.log("additional data", ad);
      const knownTypes = ["restaurant", "office", "warehouse", "school", "bank", "clinic", "church", "food-truck", "hotel", "gym", "movie-theater", "auto-dealership"];
      const isOther = propType !== "" && !knownTypes.includes(propType);
      setPropertyType(isOther ? "" : propType);
      setIsOtherProperty(isOther);
      setOtherPropertyType(isOther ? propType : "");
      setPropertySize(md.propertySize ?? "");
      setServiceType(md.serviceType ?? "");
      setRecurringFrequency(md.frequency ?? "");
      setSelectedWeekDays(Array.isArray(md.selectedWeekDays) ? md.selectedWeekDays : []);
      setContractDuration(md.contractDuration ?? "");
      setContractTimeUnit(md.contractTimeUnit ?? "months");
      setClientProvidesSupplies(md.clientProvidesSupplies ?? false);
      setServiceSchedule(ad.serviceSchedule ?? "");
      setGreaseLevel(ad.greaseLevel ?? "");
      setRestaurantCondition(ad.restaurantCondition ?? "");
      setExtraServices(Array.isArray(ad.extraServices) ? ad.extraServices : []);
      setEmployeeCount(md.employees ?? 0);
      setHourlyRate(md.hourlyRate?.toString() ?? "");
      setCleaningDuration(md.cleaningDuration ?? 0);
      setStartTime(md.startTime ?? "");
      setScopeDetails(d.service_scope ?? "");
      if (d.discount_type && d.discount_value != null) {
        setApplyDiscount(true);
        setDiscountType((d.discount_type as "percentage" | "amount") ?? "percentage");
        setDiscountValue(d.discount_value.toString());
      }

      if (d.client_id) {
        try {
          const client = await fetchClient(d.client_id);
          setEstimateType("client");
          setSelectedClient(client as ClientEntity);
          setSelectedLead(null);
          return;
        } catch { /* fall through */ }
      }
      if (d.lead_id) {
        try {
          const lead = await fetchLead(d.lead_id);
          setEstimateType("lead");
          setSelectedLead(lead as LeadEntity);
          setSelectedClient(null);
          return;
        } catch { /* fall through */ }
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: clientByEmail } = await supabase.from("clients").select("*").eq("user_id", user.id).eq("email", d.email).limit(1).maybeSingle();
      if (clientByEmail) {
        setEstimateType("client");
        setSelectedClient(clientByEmail as ClientEntity);
        setSelectedLead(null);
        return;
      }
      const { data: leadByEmail } = await supabase.from("leads").select("*").eq("user_id", user.id).eq("email", d.email).limit(1).maybeSingle();
      if (leadByEmail) {
        setEstimateType("lead");
        setSelectedLead(leadByEmail as LeadEntity);
        setSelectedClient(null);
        return;
      }
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
        } catch { /* ignore */ }
      } else if (prefill.lead_id) {
        setEstimateType("lead");
        try {
          const l = await fetchLead(prefill.lead_id);
          if (l) setSelectedLead(l as LeadEntity);
        } catch { /* ignore */ }
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pricing ───────────────────────────────────────────────────────────────
  const effectivePropertyType = isOtherProperty ? otherPropertyType : propertyType;
  const groupB = isGroupB(propertyType);

  const pricing = useCommercialPricing({
    propertyType: effectivePropertyType, propertySize, serviceType,
    recurringFrequency, selectedWeekDays,
    employeeCount, hourlyRate, cleaningDuration,
    serviceSchedule, greaseLevel, restaurantCondition,
    extraServices, clientProvidesSupplies,
    useCustomPrice, customPrice, applyDiscount, discountType, discountValue,
    companyState: profile?.company_state ?? undefined,
  });

  // ── Draft ─────────────────────────────────────────────────────────────────
  const { saveDraft, deleteDraft, isSaving, lastSaved } =
    useDraftEstimate({ serviceType: "Commercial" });

  const collectDraftData = useCallback((): DraftData => ({
    currentStep, estimateType,
    clientId: selectedClient?.id ?? null, leadId: selectedLead?.id ?? null,
    formData: {
      propertyType, isOtherProperty, otherPropertyType, propertySize,
      serviceType, recurringFrequency, selectedWeekDays, contractDuration, contractTimeUnit,
      clientProvidesSupplies, serviceSchedule, greaseLevel, restaurantCondition, extraServices,
      employeeCount, hourlyRate, cleaningDuration, startTime,
      scopeDetails, useCustomPrice, customPrice, applyDiscount, discountType, discountValue, deliveryMethod,
    },
  }), [
    currentStep, estimateType, selectedClient, selectedLead,
    propertyType, isOtherProperty, otherPropertyType, propertySize,
    serviceType, recurringFrequency, selectedWeekDays, contractDuration, contractTimeUnit,
    clientProvidesSupplies, serviceSchedule, greaseLevel, restaurantCondition, extraServices,
    employeeCount, hourlyRate, cleaningDuration, startTime,
    scopeDetails, useCustomPrice, customPrice, applyDiscount, discountType, discountValue, deliveryMethod,
  ]);

  useEffect(() => {
    if (!isEditing) saveDraft(collectDraftData());
  }, [collectDraftData, isEditing, saveDraft]);

  // ── Step navigation ───────────────────────────────────────────────────────
  const getNextStep = (from: number): number => {
    if (from === 1) return groupB ? 2 : serviceType === "recurrent" ? 3 : 4;
    if (from === 2) return 3;
    if (from === 3 || from === 4) return from + 1;
    return from + 1;
  };

  const getPrevStep = (from: number): number => {
    if (from === 3) return groupB ? 2 : 1;
    if (from === 4) return groupB ? 3 : serviceType === "recurrent" ? 3 : 1;
    return from - 1;
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (step: number): boolean => {
    const errs: Record<string, boolean> = {};
    if (step === 0) {
      if (!estimateType) errs.estimateType = true;
      if (estimateType === "client" && !selectedClient) errs.selectedEntity = true;
      if (estimateType === "lead"   && !selectedLead)   errs.selectedEntity = true;
    }
    if (step === 1) {
      if (!propertyType && !otherPropertyType) errs.propertyType = true;
      if (!propertySize)  errs.propertySize  = true;
      if (!serviceType)   errs.serviceType   = true;
      if (serviceType === "recurrent" && !recurringFrequency) errs.recurringFrequency = true;
    }
    if (step === 2 && groupB) {
      if (!serviceSchedule)     errs.serviceSchedule     = true;
      if (!greaseLevel)         errs.greaseLevel         = true;
      if (!restaurantCondition) errs.restaurantCondition = true;
    }
    if (step === 3 && serviceType === "recurrent") {
      if (employeeCount <= 0)    errs.employeeCount    = true;
      if (!hourlyRate)           errs.hourlyRate       = true;
      if (cleaningDuration <= 0) errs.cleaningDuration = true;
      if (!startTime)            errs.startTime        = true;
    }
    if (step === 7) {
      if (!deliveryMethod) errs.deliveryMethod = true;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  function handleNext() {
    if (!validate(currentStep)) return;
    const nextStep = getNextStep(currentStep);
    if (nextStep > COMMERCIAL_STEPS.length - 1 || currentStep === COMMERCIAL_STEPS.length - 1) {
      handleSubmit(); return;
    }
    setCurrentStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setCurrentStep(getPrevStep(currentStep));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleExit() {
    setShowExitDialog(true);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setIsSavingForm(true);
    try {
      const entity = (estimateType === "client" ? selectedClient : selectedLead)!;
      const { costs, subtotal, total } = pricing;

      const payload = {
        client_name:    entity.full_name,
        company_name:   estimateType === "client" ? (selectedClient?.company ?? null) : (selectedLead?.company_name ?? null),
        email:          entity.email,
        phone:          entity.phone,
        address:        estimateType === "client"
          ? `${selectedClient!.service_street}${selectedClient!.service_apt ? ` ${selectedClient!.service_apt}` : ""}`
          : selectedLead!.address,
        apt:            estimateType === "client" ? selectedClient!.service_apt : selectedLead!.apt_suite,
        city:           estimateType === "client" ? selectedClient!.service_city  : selectedLead!.city,
        state:          estimateType === "client" ? selectedClient!.service_state : selectedLead!.state,
        zip:            estimateType === "client" ? selectedClient!.service_zip   : selectedLead!.zip_code,
        service_type:   "Commercial" as const,
        service_sub_type: `${effectivePropertyType} - ${serviceType}`,
        service_scope:  scopeDetails || null,
        main_data: {
          propertyType: effectivePropertyType, propertySize, serviceType,
          employees: employeeCount, hourlyRate, cleaningDuration, startTime,
          clientProvidesSupplies, frequency: recurringFrequency,
          selectedWeekDays, contractDuration, contractTimeUnit,
        },
        additional_data: { serviceSchedule, greaseLevel, restaurantCondition, extraServices },
        labor_cost:           costs.laborCost,
        supplies_cost:        costs.suppliesCost,
        overhead_cost:        costs.overheadCost,
        total_operation_cost: costs.totalOperationCost,
        subtotal, total,
        discount_type:  applyDiscount && discountValue ? discountType : null,
        discount_value: applyDiscount && discountValue ? parseFloat(discountValue) : null,
        status:         "Pending" as const,
        estimate_date:  new Date().toISOString().split("T")[0],
      };

      let finalId: string;
      if (isEditing && estimateId) {
        await updateEstimate({ id: estimateId, update: payload });
        finalId = estimateId;
      } else {
        const created = await createEstimate(payload);
        finalId = created.id;
      }

      // Send email when delivery method includes email
      if ((deliveryMethod === "email" || deliveryMethod === "both") && entity.email) {
        await sendEstimateEmail({
          estimateData: { id: finalId, client_name: entity.full_name, total, email: entity.email },
          recipientEmail: entity.email,
          estimateType: "commercial",
        });
      }
      // Send SMS when delivery method includes sms
      if ((deliveryMethod === "sms" || deliveryMethod === "both") && entity.phone) {
        await sendEstimateSMS({
          phoneNumber:   entity.phone,
          clientName:    entity.full_name,
          estimateId:    finalId,
          estimateTotal: total,
          isUpdate:      !!isEditing,
        });
      }

      await deleteDraft();
      setShowSuccess(true);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save estimate");
    } finally {
      setIsSavingForm(false);
    }
  }

  // ── Step renderer ─────────────────────────────────────────────────────────
  const selectedEntity = estimateType === "client" ? selectedClient : selectedLead;

  function renderStep() {
    switch (currentStep) {
      case 0: return (
        <EstimateClientStep
          estimateType={estimateType}
          onEstimateTypeChange={(type) => { setEstimateType(type); setSelectedClient(null); setSelectedLead(null); }}
          selectedClient={selectedClient} selectedLead={selectedLead}
          onClientSelect={(c) => { setSelectedClient(c); setSelectedLead(null); }}
          onLeadSelect={(l)   => { setSelectedLead(l);   setSelectedClient(null); }}
          companyAddress={companyAddress || undefined}
          errors={{
            type:   errors.estimateType   ? "Please select a client type" : undefined,
            entity: errors.selectedEntity ? `Please select a ${estimateType ?? "client or lead"}` : undefined,
          }}
        />
      );
      case 1: return (
        <CommPropertyStep
          propertyType={propertyType} isOtherProperty={isOtherProperty}
          otherPropertyType={otherPropertyType} propertySize={propertySize}
          serviceType={serviceType} recurringFrequency={recurringFrequency}
          selectedWeekDays={selectedWeekDays}
          contractDuration={contractDuration} contractTimeUnit={contractTimeUnit}
          errors={errors}
          onPropertyTypeChange={setPropertyType}
          onIsOtherPropertyChange={setIsOtherProperty}
          onOtherPropertyTypeChange={setOtherPropertyType}
          onPropertySizeChange={setPropertySize}
          onServiceTypeChange={setServiceType}
          onRecurringFrequencyChange={setRecurringFrequency}
          onWeekDayToggle={(day) => setSelectedWeekDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
          )}
          onContractDurationChange={setContractDuration}
          onContractTimeUnitChange={setContractTimeUnit}
          onClearError={(key) => setErrors((e) => ({ ...e, [key]: false }))}
        />
      );
      case 2: return (
        <CommDetailsStep
          serviceSchedule={serviceSchedule} greaseLevel={greaseLevel}
          restaurantCondition={restaurantCondition} clientProvidesSupplies={clientProvidesSupplies}
          extraServices={extraServices} errors={errors}
          onServiceScheduleChange={setServiceSchedule}
          onGreaseLevelChange={setGreaseLevel}
          onRestaurantConditionChange={setRestaurantCondition}
          onClientProvidesSuppliesChange={setClientProvidesSupplies}
          onExtraServiceToggle={(s) => setExtraServices((prev) =>
            prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
          )}
          onClearError={(key) => setErrors((e) => ({ ...e, [key]: false }))}
        />
      );
      case 3: return (
        <CommMainStep
          employeeCount={employeeCount} hourlyRate={hourlyRate}
          cleaningDuration={cleaningDuration} startTime={startTime}
          errors={errors}
          onEmployeeCountChange={setEmployeeCount}
          onHourlyRateChange={setHourlyRate}
          onCleaningDurationChange={setCleaningDuration}
          onStartTimeChange={setStartTime}
          onClearError={(key) => setErrors((e) => ({ ...e, [key]: false }))}
        />
      );
      case 4: return <CommScopeStep scope={scopeDetails} onChange={setScopeDetails} />;
      case 5: return (
        <CommSummaryStep
          costs={pricing.costs} total={pricing.total}
          serviceSubType={`${effectivePropertyType} - ${serviceType}`}
          client={selectedEntity ? { name: selectedEntity.full_name, email: selectedEntity.email ?? "", phone: selectedEntity.phone ?? "" } : null}
          useCustomPrice={useCustomPrice} customPrice={customPrice}
          applyDiscount={applyDiscount} discountType={discountType} discountValue={discountValue}
          onUseCustomPriceChange={(v) => { setUseCustomPrice(v); if (!v) setCustomPrice(""); }}
          onCustomPriceChange={setCustomPrice}
          onApplyDiscountChange={(v) => { setApplyDiscount(v); if (!v) setDiscountValue(""); }}
          onDiscountTypeChange={setDiscountType}
          onDiscountValueChange={setDiscountValue}
        />
      );
      case 6: {
        const previewClient = selectedEntity ? {
          name:    selectedEntity.full_name,
          company: estimateType === "client" ? (selectedClient?.company ?? undefined) : (selectedLead?.company_name ?? undefined),
          email:   selectedEntity.email ?? "",
          phone:   selectedEntity.phone ?? "",
          address: estimateType === "client"
            ? [selectedClient?.service_street, selectedClient?.service_apt].filter(Boolean).join(" ")
            : (selectedLead?.address ?? undefined),
          city:    estimateType === "client" ? (selectedClient?.service_city  ?? undefined) : (selectedLead?.city      ?? undefined),
          state:   estimateType === "client" ? (selectedClient?.service_state ?? undefined) : (selectedLead?.state     ?? undefined),
          zip:     estimateType === "client" ? (selectedClient?.service_zip   ?? undefined) : (selectedLead?.zip_code  ?? undefined),
        } : null;
        return (
          <CommPreviewStep
            client={previewClient}
            company={{
              name:  profile?.company_name  ?? undefined,
              phone: profile?.company_phone ?? undefined,
              email: profile?.company_email ?? undefined,
              logo:  profile?.company_logo  ?? undefined,
            }}
            propertyType={effectivePropertyType}
            propertySize={propertySize}
            serviceType={serviceType}
            recurringFrequency={recurringFrequency}
            contractDuration={contractDuration}
            contractTimeUnit={contractTimeUnit}
            groupB={groupB}
            serviceSchedule={serviceSchedule}
            greaseLevel={greaseLevel}
            restaurantCondition={restaurantCondition}
            clientProvidesSupplies={clientProvidesSupplies}
            extraServices={extraServices}
            employeeCount={employeeCount}
            hourlyRate={hourlyRate}
            cleaningDuration={cleaningDuration}
            startTime={startTime}
            scope={scopeDetails}
            total={pricing.total}
            subtotal={pricing.subtotal}
            applyDiscount={applyDiscount}
            discountType={discountType}
            discountValue={discountValue}
          />
        );
      }
      case 7: return (
        <CommSendStep
          client={selectedEntity ? { name: selectedEntity.full_name, email: selectedEntity.email ?? "", phone: selectedEntity.phone ?? "" } : null}
          total={pricing.total}
          deliveryMethod={deliveryMethod}
          onChange={setDeliveryMethod}
          error={errors.deliveryMethod}
        />
      );
      default: return null;
    }
  }

  const isLoading = isSavingForm || isSendingEmail;

  // ── Shared dialogs (outside any modal) ───────────────────────────────────
  const formDialogs = (
    <>
      <ExitConfirmationDialog
        open={showExitDialog}
        onSave={() => { saveDraft(collectDraftData()); setShowExitDialog(false); goBack(); }}
        onDiscard={() => { deleteDraft(); setShowExitDialog(false); goBack(); }}
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
        <FullScreenModal open={open ?? false} onClose={goBack}>
          <EstimateFormLayout
            title={isEditing ? "Edit Commercial Estimate" : "New Commercial Estimate"}
            steps={COMMERCIAL_STEPS}
            currentStep={currentStep}
            onBack={handleBack}
            onNext={handleNext}
            onExit={handleExit}
            isLastStep={currentStep === COMMERCIAL_STEPS.length - 1}
            isLoading={isLoading}
            isEditing={isEditing}
            isModal
            draftIndicator={!isEditing ? <DraftStatusIndicator isSaving={isSaving} lastSaved={lastSaved} /> : undefined}
          >
            {renderStep()}
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
        title={isEditing ? "Edit Commercial Estimate" : "New Commercial Estimate"}
        steps={COMMERCIAL_STEPS}
        currentStep={currentStep}
        onBack={handleBack}
        onNext={handleNext}
        onExit={handleExit}
        isLastStep={currentStep === COMMERCIAL_STEPS.length - 1}
        isLoading={isLoading}
        isEditing={isEditing}
        draftIndicator={!isEditing ? <DraftStatusIndicator isSaving={isSaving} lastSaved={lastSaved} /> : undefined}
      >
        {renderStep()}
      </EstimateFormLayout>
    </>
  );
}

export default CreateCommercialEstimatePage;
