/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
import { fetchClient } from "@/features/crm/clients/services/clientsService";
import { fetchLead } from "@/features/crm/leads/services/leadsService";
import { useCreateEstimate, useUpdateEstimate } from "../hooks/useEstimates";
import { useSendEstimateEmail } from "../hooks/useSendEstimateEmail";
import { useSendEstimateSMS }   from "../hooks/useSendEstimateSMS";
import { useDraftEstimate } from "../hooks/useDraftEstimate";
import { fetchEstimate } from "../services/estimatesService";
import { useCommercialPricing, isGroupB } from "../hooks/useCommercialPricing";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";
import type { DraftData } from "../types/estimate.types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  open?: boolean;
  onClose?: () => void;
  initialState?: { isEditing?: boolean; estimateId?: string; estimateData?: any; prefill?: any; continueDraft?: boolean; };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CreateCommercialEstimatePage({ open, onClose, initialState }: Props = {}) {
  const navigate      = useNavigate();
  const location      = useLocation();
  const qc            = useQueryClient();
  const locationState = (location.state as any) || {};
  const { isEditing, estimateId, estimateData, prefill } = initialState ?? locationState;
  const fromRequestId = locationState.fromRequestId as string | undefined;
  const isModal      = onClose !== undefined;
  const continueDraft = initialState?.continueDraft ?? false;
  const goBack = useCallback(() => {
    if (isModal) onClose!();
    else navigate(-1);
  }, [isModal, onClose, navigate]);

  const { mutateAsync: createEstimate } = useCreateEstimate();
  const { mutateAsync: updateEstimate } = useUpdateEstimate();
  const { sendEstimateEmail, isSending: isSendingEmail } = useSendEstimateEmail();
  const { sendEstimateSMS }                              = useSendEstimateSMS();

  // ── Step ──────────────────────────────────────────────────────────────────
  const [currentStep,          setCurrentStep]          = useState(0);
  const [isPrefilling,         setIsPrefilling]         = useState(!!isEditing);
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

  // ── Step 2: Details ───────────────────────────────────────────────────────
  const [clientProvidesSupplies, setClientProvidesSupplies] = useState(false);
  const [serviceSchedule,        setServiceSchedule]        = useState("");
  const [greaseLevel,            setGreaseLevel]            = useState("");
  const [restaurantCondition,    setRestaurantCondition]    = useState("");
  const [dustLevel,              setDustLevel]              = useState("");
  const [propertyCondition,      setPropertyCondition]      = useState("");
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
      try {
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
        setDustLevel(ad.dustLevel ?? "");
        setPropertyCondition(ad.propertyCondition ?? "");
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
    const p = prefill as Record<string, unknown>;
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

      if (typeof p.propertyType === "string") setPropertyType(p.propertyType);
      if (typeof p.isOtherProperty === "boolean") setIsOtherProperty(p.isOtherProperty);
      if (typeof p.otherPropertyType === "string") setOtherPropertyType(p.otherPropertyType);
      if (typeof p.propertySize === "string") setPropertySize(p.propertySize);
      if (p.serviceType === "one-time" || p.serviceType === "recurrent") {
        setServiceType(p.serviceType);
      }
      if (typeof p.recurringFrequency === "string") setRecurringFrequency(p.recurringFrequency);
      if (Array.isArray(p.selectedWeekDays)) setSelectedWeekDays(p.selectedWeekDays as string[]);
      if (typeof p.contractDuration === "string") setContractDuration(p.contractDuration);
      if (typeof p.contractTimeUnit === "string") setContractTimeUnit(p.contractTimeUnit);
      if (typeof p.clientProvidesSupplies === "boolean") setClientProvidesSupplies(p.clientProvidesSupplies);
      if (typeof p.serviceSchedule === "string") setServiceSchedule(p.serviceSchedule);
      if (typeof p.greaseLevel === "string") setGreaseLevel(p.greaseLevel);
      if (typeof p.restaurantCondition === "string") setRestaurantCondition(p.restaurantCondition);
      if (typeof p.dustLevel === "string") setDustLevel(p.dustLevel);
      if (typeof p.propertyCondition === "string") setPropertyCondition(p.propertyCondition);
      if (Array.isArray(p.extraServices)) setExtraServices(p.extraServices as string[]);
      if (typeof p.employeeCount === "number") setEmployeeCount(p.employeeCount);
      if (typeof p.hourlyRate === "string") setHourlyRate(p.hourlyRate);
      if (typeof p.cleaningDuration === "number") setCleaningDuration(p.cleaningDuration);
      if (typeof p.startTime === "string") setStartTime(p.startTime);
      if (typeof p.scopeDetails === "string") setScopeDetails(p.scopeDetails);
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
  const { saveDraft, deleteDraft, isSaving, lastSaved, loadedDraft, clearLoadedDraft } =
    useDraftEstimate({ serviceType: "Commercial" });

  // Restore draft only when user explicitly chose "Continue" from the drafts list
  useEffect(() => {
    if (!loadedDraft || isEditing || !continueDraft) return;
    const { draftData } = loadedDraft;
    const fd = draftData.formData as any;

    setCurrentStep(draftData.currentStep ?? 0);
    if (draftData.estimateType) setEstimateType(draftData.estimateType);

    if (fd.propertyType           !== undefined) setPropertyType(fd.propertyType);
    if (fd.isOtherProperty        !== undefined) setIsOtherProperty(fd.isOtherProperty);
    if (fd.otherPropertyType      !== undefined) setOtherPropertyType(fd.otherPropertyType);
    if (fd.propertySize           !== undefined) setPropertySize(fd.propertySize);
    if (fd.serviceType            !== undefined) setServiceType(fd.serviceType);
    if (fd.recurringFrequency     !== undefined) setRecurringFrequency(fd.recurringFrequency);
    if (fd.selectedWeekDays       !== undefined) setSelectedWeekDays(fd.selectedWeekDays);
    if (fd.contractDuration       !== undefined) setContractDuration(fd.contractDuration);
    if (fd.contractTimeUnit       !== undefined) setContractTimeUnit(fd.contractTimeUnit);
    if (fd.clientProvidesSupplies !== undefined) setClientProvidesSupplies(fd.clientProvidesSupplies);
    if (fd.serviceSchedule        !== undefined) setServiceSchedule(fd.serviceSchedule);
    if (fd.greaseLevel            !== undefined) setGreaseLevel(fd.greaseLevel);
    if (fd.restaurantCondition    !== undefined) setRestaurantCondition(fd.restaurantCondition);
    if (fd.dustLevel              !== undefined) setDustLevel(fd.dustLevel);
    if (fd.propertyCondition      !== undefined) setPropertyCondition(fd.propertyCondition);
    if (fd.extraServices          !== undefined) setExtraServices(fd.extraServices);
    if (fd.employeeCount    !== undefined) setEmployeeCount(fd.employeeCount);
    if (fd.hourlyRate       !== undefined) setHourlyRate(fd.hourlyRate);
    if (fd.cleaningDuration !== undefined) setCleaningDuration(fd.cleaningDuration);
    if (fd.startTime        !== undefined) setStartTime(fd.startTime);
    if (fd.scopeDetails     !== undefined) setScopeDetails(fd.scopeDetails);
    if (fd.useCustomPrice   !== undefined) setUseCustomPrice(fd.useCustomPrice);
    if (fd.customPrice      !== undefined) setCustomPrice(fd.customPrice);
    if (fd.applyDiscount    !== undefined) setApplyDiscount(fd.applyDiscount);
    if (fd.discountType     !== undefined) setDiscountType(fd.discountType);
    if (fd.discountValue    !== undefined) setDiscountValue(fd.discountValue);
    if (fd.deliveryMethod   !== undefined) setDeliveryMethod(fd.deliveryMethod);

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
    currentStep, estimateType,
    clientId: selectedClient?.id ?? null, leadId: selectedLead?.id ?? null,
    formData: {
      propertyType, isOtherProperty, otherPropertyType, propertySize,
      serviceType, recurringFrequency, selectedWeekDays, contractDuration, contractTimeUnit,
      clientProvidesSupplies, serviceSchedule, greaseLevel, restaurantCondition,
      dustLevel, propertyCondition, extraServices,
      employeeCount, hourlyRate, cleaningDuration, startTime,
      scopeDetails, useCustomPrice, customPrice, applyDiscount, discountType, discountValue, deliveryMethod,
    },
  }), [
    currentStep, estimateType, selectedClient, selectedLead,
    propertyType, isOtherProperty, otherPropertyType, propertySize,
    serviceType, recurringFrequency, selectedWeekDays, contractDuration, contractTimeUnit,
    clientProvidesSupplies, serviceSchedule, greaseLevel, restaurantCondition,
    dustLevel, propertyCondition, extraServices,
    employeeCount, hourlyRate, cleaningDuration, startTime,
    scopeDetails, useCustomPrice, customPrice, applyDiscount, discountType, discountValue, deliveryMethod,
  ]);


  // ── Step navigation ───────────────────────────────────────────────────────
  const getNextStep = (from: number): number => from + 1;
  const getPrevStep = (from: number): number => from - 1;

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
    if (step === 2) {
      if (!serviceSchedule) errs.serviceSchedule = true;
      if (groupB) {
        if (!greaseLevel)         errs.greaseLevel         = true;
        if (!restaurantCondition) errs.restaurantCondition = true;
      } else {
        if (!dustLevel)        errs.dustLevel        = true;
        if (!propertyCondition) errs.propertyCondition = true;
      }
    }
    if (step === 3) {
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
        client_id:      estimateType === "client" ? (selectedClient?.id ?? null) : null,
        lead_id:        estimateType === "lead"   ? (selectedLead?.id   ?? null) : null,
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
        additional_data: { serviceSchedule, greaseLevel, restaurantCondition, dustLevel, propertyCondition, extraServices },
        labor_cost:           costs.laborCost,
        supplies_cost:        costs.suppliesCost,
        overhead_cost:        costs.overheadCost,
        total_operation_cost: costs.totalOperationCost,
        subtotal, total,
        discount_type:  applyDiscount && discountValue ? discountType : null,
        discount_value: applyDiscount && discountValue ? parseFloat(discountValue) : null,
        status: (deliveryMethod === "email" || deliveryMethod === "sms" || deliveryMethod === "both") ? "Pending" : "Draft",
        estimate_date:  new Date().toISOString().split("T")[0],
      };

      let finalId: string;
      if (isEditing && estimateId) {
        await updateEstimate({ id: estimateId, update: payload });
        finalId = estimateId;
      } else {
        const created = await createEstimate(payload);
        finalId = created.id;
        if (fromRequestId) {
          const contactType = estimateType as "client" | "lead";
          const contactId   = estimateType === "client" ? selectedClient?.id : selectedLead?.id;
          if (contactId) {
            await (supabase as any).rpc("finalize_booking_conversion", {
              p_booking_id:  fromRequestId,
              p_estimate_id: finalId,
              p_walkthrough_id: null,
            });
            qc.invalidateQueries({ queryKey: QK.requests });
          }
        }
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
          groupB={groupB}
          serviceSchedule={serviceSchedule} greaseLevel={greaseLevel}
          restaurantCondition={restaurantCondition} dustLevel={dustLevel}
          propertyCondition={propertyCondition} clientProvidesSupplies={clientProvidesSupplies}
          extraServices={extraServices} errors={errors}
          onServiceScheduleChange={setServiceSchedule}
          onGreaseLevelChange={setGreaseLevel}
          onRestaurantConditionChange={setRestaurantCondition}
          onDustLevelChange={setDustLevel}
          onPropertyConditionChange={setPropertyCondition}
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
            dustLevel={dustLevel}
            propertyCondition={propertyCondition}
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

  const isLoading = isSavingForm || isSendingEmail || isPrefilling;

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
        onSave={async () => { await saveDraft(collectDraftData()); setShowExitDialog(false); goBack(); }}
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
            {stepContent}
          </EstimateFormLayout>
        </FullScreenModal>
        {formDialogs}
      </>
    );
  }

  // ── Page mode ────────────────────────────────────────────────────────────
  // Walkthrough "Generate Estimate" navigates here with `prefill` — match the Estimates
  // feature modal shell (FullScreenModal + isModal layout) so styling is identical.
  if (prefill) {
    return (
      <>
        {formDialogs}
        <FullScreenModal open onClose={handleExit}>
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
            {stepContent}
          </EstimateFormLayout>
        </FullScreenModal>
      </>
    );
  }

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
