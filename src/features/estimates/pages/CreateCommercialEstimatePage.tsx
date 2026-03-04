import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileText } from "lucide-react";
import { COMMERCIAL_STEPS } from "../config/steps.config";
import { EstimateClientStep, type ClientEntity, type LeadEntity, type EstimateEntityType } from "../components/EstimateClientStep";
import { EstimateFormLayout }    from "../components/EstimateFormLayout";
import { DraftStatusIndicator }  from "../components/DraftStatusIndicator";
import { DraftRecoveryDialog }   from "../components/DraftRecoveryDialog";
import { ExitConfirmationDialog } from "../components/ExitConfirmationDialog";
import { CommPropertyStep } from "../components/commercial/CommPropertyStep";
import { CommDetailsStep }  from "../components/commercial/CommDetailsStep";
import { CommMainStep }     from "../components/commercial/CommMainStep";
import { CommScopeStep }    from "../components/commercial/CommScopeStep";
import { CommSummaryStep }  from "../components/commercial/CommSummaryStep";
import { CommPreviewStep }  from "../components/commercial/CommPreviewStep";
import { CommSendStep, type DeliveryMethod } from "../components/commercial/CommSendStep";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateEstimate, useUpdateEstimate } from "../hooks/useEstimates";
import { useSendEstimateEmail } from "../hooks/useSendEstimateEmail";
import { useSendEstimateSMS }   from "../hooks/useSendEstimateSMS";
import { useDraftEstimate } from "../hooks/useDraftEstimate";
import { useCommercialPricing, isGroupB } from "../hooks/useCommercialPricing";
import type { DraftData } from "../types/estimate.types";

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CreateCommercialEstimatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isEditing, estimateId, estimateData } = (location.state as any) || {};

  const { mutateAsync: createEstimate } = useCreateEstimate();
  const { mutateAsync: updateEstimate } = useUpdateEstimate();
  const { sendEstimateEmail, isSending: isSendingEmail } = useSendEstimateEmail();
  const { sendEstimateSMS }                              = useSendEstimateSMS();

  // ── Step ──────────────────────────────────────────────────────────────────
  const [currentStep,    setCurrentStep]    = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
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
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles")
        .select("company_address, company_state, company_zip, company_logo, company_name, company_phone, company_email")
        .eq("user_id", user.id).maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Prefill when editing ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isEditing || !estimateData) return;
    setPropertyType(estimateData.mainData?.propertyType || "");
    setPropertySize(estimateData.mainData?.propertySize || "");
    setServiceType(estimateData.mainData?.serviceType || "");
    setRecurringFrequency(estimateData.mainData?.frequency || "");
    setSelectedWeekDays(estimateData.mainData?.selectedWeekDays || []);
    setContractDuration(estimateData.mainData?.contractDuration || "");
    setContractTimeUnit(estimateData.mainData?.contractTimeUnit || "months");
    setClientProvidesSupplies(estimateData.mainData?.clientProvidesSupplies || false);
    setServiceSchedule(estimateData.additionalData?.serviceSchedule || "");
    setGreaseLevel(estimateData.additionalData?.greaseLevel || "");
    setRestaurantCondition(estimateData.additionalData?.restaurantCondition || "");
    setExtraServices(estimateData.additionalData?.extraServices || []);
    setEmployeeCount(estimateData.mainData?.employees || 0);
    setHourlyRate(estimateData.mainData?.hourlyRate?.toString() || "");
    setCleaningDuration(estimateData.mainData?.cleaningDuration || 0);
    setStartTime(estimateData.mainData?.startTime || "");
    setScopeDetails(estimateData.serviceScope || "");
    if (estimateData.discountType && estimateData.discountValue) {
      setApplyDiscount(true);
      setDiscountType(estimateData.discountType);
      setDiscountValue(estimateData.discountValue.toString());
    }
  }, [isEditing, estimateData]);

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
  const { loadedDraft, clearLoadedDraft, saveDraft, deleteDraft, isSaving, lastSaved } =
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

  const restoreDraftData = useCallback(async (d: DraftData) => {
    clearLoadedDraft();
    setCurrentStep(d.currentStep);
    if (d.estimateType) setEstimateType(d.estimateType);

    // Restore selected client or lead from DB
    if (d.estimateType === "client" && d.clientId) {
      const { data: c } = await supabase.from("clients").select("*").eq("id", d.clientId).maybeSingle();
      if (c) setSelectedClient(c as ClientEntity);
    } else if (d.estimateType === "lead" && d.leadId) {
      const { data: l } = await supabase.from("leads").select("*").eq("id", d.leadId).maybeSingle();
      if (l) setSelectedLead(l as LeadEntity);
    }

    const f = d.formData as any;
    if (f.propertyType           !== undefined) setPropertyType(f.propertyType);
    if (f.isOtherProperty        !== undefined) setIsOtherProperty(f.isOtherProperty);
    if (f.otherPropertyType      !== undefined) setOtherPropertyType(f.otherPropertyType);
    if (f.propertySize           !== undefined) setPropertySize(f.propertySize);
    if (f.serviceType            !== undefined) setServiceType(f.serviceType);
    if (f.recurringFrequency     !== undefined) setRecurringFrequency(f.recurringFrequency);
    if (f.selectedWeekDays       !== undefined) setSelectedWeekDays(f.selectedWeekDays);
    if (f.contractDuration       !== undefined) setContractDuration(f.contractDuration);
    if (f.contractTimeUnit       !== undefined) setContractTimeUnit(f.contractTimeUnit);
    if (f.clientProvidesSupplies !== undefined) setClientProvidesSupplies(f.clientProvidesSupplies);
    if (f.serviceSchedule        !== undefined) setServiceSchedule(f.serviceSchedule);
    if (f.greaseLevel            !== undefined) setGreaseLevel(f.greaseLevel);
    if (f.restaurantCondition    !== undefined) setRestaurantCondition(f.restaurantCondition);
    if (f.extraServices          !== undefined) setExtraServices(f.extraServices);
    if (f.employeeCount          !== undefined) setEmployeeCount(f.employeeCount);
    if (f.hourlyRate             !== undefined) setHourlyRate(f.hourlyRate);
    if (f.cleaningDuration       !== undefined) setCleaningDuration(f.cleaningDuration);
    if (f.startTime              !== undefined) setStartTime(f.startTime);
    if (f.scopeDetails           !== undefined) setScopeDetails(f.scopeDetails);
    if (f.useCustomPrice         !== undefined) setUseCustomPrice(f.useCustomPrice);
    if (f.customPrice            !== undefined) setCustomPrice(f.customPrice);
    if (f.applyDiscount          !== undefined) setApplyDiscount(f.applyDiscount);
    if (f.discountType           !== undefined) setDiscountType(f.discountType);
    if (f.discountValue          !== undefined) setDiscountValue(f.discountValue);
    if (f.deliveryMethod         !== undefined) setDeliveryMethod(f.deliveryMethod);
  }, [clearLoadedDraft]);

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

  return (
    <>
      <DraftRecoveryDialog
        draft={!isEditing ? loadedDraft : null}
        onContinue={restoreDraftData}
        onDiscard={() => { deleteDraft(); clearLoadedDraft(); }}
      />
      <ExitConfirmationDialog
        open={showExitDialog}
        onSave={() => { saveDraft(collectDraftData()); setShowExitDialog(false); navigate(-1); }}
        onDiscard={() => { deleteDraft(); setShowExitDialog(false); navigate(-1); }}
        onCancel={() => setShowExitDialog(false)}
      />

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

export default CreateCommercialEstimatePage;
