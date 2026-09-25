/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Building2, X, Users } from "lucide-react";
import type { ClientEntity, LeadEntity, EstimateEntityType } from "@/shared/types/entities";
import { Button } from "@/shared/components/ui/button";
import {
  FormSection, SectionModal, SummaryRow, SelectorRow,
} from "@/shared/components/forms";
import { ClientPropertyField } from "@/shared/components/common/ClientPropertyField";
import { FORM_SECTION_GAP } from "@/shared/constants/formTokens";
import { useClientProperties } from "@/features/crm/clients/hooks/useClientProperties";
import { getEstimatePropertyId, propertyToEstimateAddress } from "../utils/estimateProperty";
import { buildDepositAdditionalFields, restoreDepositFromAdditionalData } from "../utils/estimateDeposit";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";
import { DraftStatusIndicator }  from "../components/DraftStatusIndicator";
import { ExitConfirmDialog } from "@/shared/components/common/ExitConfirmDialog";
import { CommPropertyStep } from "../components/commercial/CommPropertyStep";
import { CommDetailsStep }  from "../components/commercial/CommDetailsStep";
import { CommMainStep }     from "../components/commercial/CommMainStep";
import { CommSummaryStep }  from "../components/commercial/CommSummaryStep";
import { CommPreviewStep }  from "../components/commercial/CommPreviewStep";
import { CommSendStep, type DeliveryMethod } from "../components/commercial/CommSendStep";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { toast } from "sonner";
import { useProfile } from "@/shared/hooks/useProfile";
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

/** Secciones del hub que se editan en su propio modal. */
type SectionId = "property" | "details" | "labor";

/** Las tres pantallas encadenadas del review. */
type ReviewStep = "summary" | "preview" | "send";

/** Estado restaurable al cancelar un modal de sección. */
interface SectionSnapshot {
  propertyType: string; isOtherProperty: boolean; otherPropertyType: string; propertySize: string;
  serviceType: "one-time" | "recurrent" | ""; recurringFrequency: string;
  selectedWeekDays: string[]; contractDuration: string; contractTimeUnit: string;
  serviceSchedule: string; greaseLevel: string; restaurantCondition: string;
  dustLevel: string; propertyCondition: string;
  clientProvidesSupplies: boolean; extraServices: string[];
  employeeCount: number; hourlyRate: string; cleaningDuration: number; startTime: string;
  scopeDetails: string;
}
interface Props {
  open?: boolean;
  onClose?: () => void;
  initialState?: { isEditing?: boolean; isConversionDraft?: boolean; estimateId?: string; estimateData?: any; prefill?: any; continueDraft?: boolean; };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CreateCommercialEstimatePage({ open, onClose, initialState }: Props = {}) {
  const navigate      = useNavigate();
  const location      = useLocation();
  const qc            = useQueryClient();
  const locationState = (location.state as any) || {};
  const { isEditing, isConversionDraft, estimateId, estimateData, prefill } = initialState ?? locationState;
  const fromWalkthroughId = locationState.fromWalkthroughId as string | undefined;
  // `isEditing` keeps its save semantics (UPDATE the draft, don't delete on discard),
  // but a conversion draft is brand-new to the user, so display copy reads "New/Create".
  const displayEditing = isEditing && !isConversionDraft;
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
  // ── Hub: sección abierta + pantalla de review ─────────────────────────────
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [reviewStep,  setReviewStep]  = useState<ReviewStep | null>(null);
  const [isPrefilling,         setIsPrefilling]         = useState(!!isEditing);
  const [showExitDialog,       setShowExitDialog]       = useState(false);
  const [showCompanyInfoAlert, setShowCompanyInfoAlert] = useState(false);

  const [isSavingForm,   setIsSavingForm]   = useState(false);
  const [showSuccess,    setShowSuccess]    = useState(false);

  // ── Entity selection ──────────────────────────────────────────────────────
  const [estimateType,   setEstimateType]   = useState<EstimateEntityType | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientEntity | null>(null);
  const [selectedLead,   setSelectedLead]   = useState<LeadEntity | null>(null);
  const [selectedProperty,  setSelectedProperty]  = useState<ClientProperty | null>(null);
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(null);
  // Employees assigned in the originating walkthrough — carried invisibly through
  // additional_data so they can reach the job on conversion (estimates have no UI/column).
  const [carriedEmployees, setCarriedEmployees] = useState<string[]>([]);

  // Resolve pendingPropertyId (from edit/draft/conversion) once the client's properties load
  const { data: clientPropertiesList = [] } = useClientProperties(
    estimateType === "client" ? selectedClient?.id : undefined,
  );
  useEffect(() => {
    if (!pendingPropertyId || clientPropertiesList.length === 0) return;
    const prop = clientPropertiesList.find((p) => p.id === pendingPropertyId);
    if (prop) { setSelectedProperty(prop); setPendingPropertyId(null); }
  }, [pendingPropertyId, clientPropertiesList]);

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
  // `scopeDetails` (service_scope) ya no se edita en el formulario, pero el dato sigue
  // vivo: llega desde la conversión de un request y viaja al job al convertir el
  // estimate. Se conserva en el estado para que editar un estimate no lo borre.
  const [scopeDetails, setScopeDetails] = useState("");

  // ── Step 5: Summary ───────────────────────────────────────────────────────
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice,    setCustomPrice]    = useState("");
  const [applyDiscount,  setApplyDiscount]  = useState(false);
  const [discountType,   setDiscountType]   = useState<"percentage" | "amount">("percentage");
  const [discountValue,  setDiscountValue]  = useState("");

  // ── Deposit ───────────────────────────────────────────────────────────────
  const [applyDeposit,   setApplyDeposit]   = useState(false);
  const [depositType,    setDepositType]    = useState<"percentage" | "amount">("amount");
  const [depositValue,   setDepositValue]   = useState("");

  // ── Step 6: Send ──────────────────────────────────────────────────────────
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);

  // ── Validation errors ─────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // ── Profile ───────────────────────────────────────────────────────────────
  const { data: profile }  = useProfile();

  // ── Company info check on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!profile || isEditing) return;
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
        setPendingPropertyId(getEstimatePropertyId(d.additional_data));
        setCarriedEmployees(Array.isArray(ad.assignedEmployees) ? ad.assignedEmployees : []);
        const dep = restoreDepositFromAdditionalData(d.additional_data);
        setApplyDeposit(dep.applyDeposit); setDepositType(dep.depositType); setDepositValue(dep.depositValue);
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
    useDraftEstimate({ serviceType: "Commercial", enabled: !isEditing });

  // Restore draft only when user explicitly chose "Continue" from the drafts list
  useEffect(() => {
    if (!loadedDraft || isEditing || !continueDraft) return;
    const { draftData } = loadedDraft;
    const fd = draftData.formData as any;

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
    if (fd.propertyId) setPendingPropertyId(fd.propertyId as string);
    if (fd.applyDeposit  !== undefined) setApplyDeposit(fd.applyDeposit);
    if (fd.depositType   !== undefined) setDepositType(fd.depositType);
    if (fd.depositValue  !== undefined) setDepositValue(fd.depositValue);

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
    currentStep: 0, estimateType,
    clientId: selectedClient?.id ?? null, leadId: selectedLead?.id ?? null,
    formData: {
      propertyType, isOtherProperty, otherPropertyType, propertySize,
      serviceType, recurringFrequency, selectedWeekDays, contractDuration, contractTimeUnit,
      clientProvidesSupplies, serviceSchedule, greaseLevel, restaurantCondition,
      dustLevel, propertyCondition, extraServices,
      employeeCount, hourlyRate, cleaningDuration, startTime,
      scopeDetails, useCustomPrice, customPrice, applyDiscount, discountType, discountValue, deliveryMethod,
      propertyId: selectedProperty?.id ?? null,
      applyDeposit, depositType, depositValue,
    },
  }), [
    estimateType, selectedClient, selectedLead,
    propertyType, isOtherProperty, otherPropertyType, propertySize,
    serviceType, recurringFrequency, selectedWeekDays, contractDuration, contractTimeUnit,
    clientProvidesSupplies, serviceSchedule, greaseLevel, restaurantCondition,
    dustLevel, propertyCondition, extraServices,
    employeeCount, hourlyRate, cleaningDuration, startTime,
    scopeDetails, useCustomPrice, customPrice, applyDiscount, discountType, discountValue, deliveryMethod,
    selectedProperty, applyDeposit, depositType, depositValue,
  ]);


  // ── Step navigation ───────────────────────────────────────────────────────

  // ── Validation ────────────────────────────────────────────────────────────
  const validateAll = (): boolean => {
    const errs: Record<string, boolean> = {};
    if (!selectedClient && !selectedLead) errs.selectedEntity = true;

    if (!propertyType && !otherPropertyType) errs.propertyType = true;
    if (!propertySize)  errs.propertySize  = true;
    if (!serviceType)   errs.serviceType   = true;
    if (serviceType === "recurrent" && !recurringFrequency) errs.recurringFrequency = true;

    if (!serviceSchedule) errs.serviceSchedule = true;
    if (groupB) {
      if (!greaseLevel)         errs.greaseLevel         = true;
      if (!restaurantCondition) errs.restaurantCondition = true;
    } else {
      if (!dustLevel)         errs.dustLevel         = true;
      if (!propertyCondition) errs.propertyCondition = true;
    }

    if (employeeCount <= 0)    errs.employeeCount    = true;
    if (!hourlyRate)           errs.hourlyRate       = true;
    if (cleaningDuration <= 0) errs.cleaningDuration = true;
    if (!startTime)            errs.startTime        = true;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  function handleReview() {
    if (!validateAll()) {
      toast.error("Please complete the required sections");
      return;
    }
    setReviewStep("summary");
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

      // When a service property is selected, its address overrides the client's default address
      const clientAddr = selectedProperty
        ? propertyToEstimateAddress(selectedProperty)
        : {
            address: `${selectedClient?.service_street ?? ""}${selectedClient?.service_apt ? ` ${selectedClient.service_apt}` : ""}`,
            apt:     selectedClient?.service_apt   ?? "",
            city:    selectedClient?.service_city  ?? "",
            state:   selectedClient?.service_state ?? "",
            zip:     selectedClient?.service_zip   ?? "",
          };

      const payload = {
        client_id:      estimateType === "client" ? (selectedClient?.id ?? null) : null,
        lead_id:        estimateType === "lead"   ? (selectedLead?.id   ?? null) : null,
        client_name:    entity.full_name,
        company_name:   estimateType === "client" ? (selectedClient?.company ?? null) : (selectedLead?.company_name ?? null),
        email:          entity.email,
        phone:          entity.phone,
        address:        estimateType === "client" ? clientAddr.address : selectedLead!.address,
        apt:            estimateType === "client" ? clientAddr.apt   : selectedLead!.apt_suite,
        city:           estimateType === "client" ? clientAddr.city  : selectedLead!.city,
        state:          estimateType === "client" ? clientAddr.state : selectedLead!.state,
        zip:            estimateType === "client" ? clientAddr.zip   : selectedLead!.zip_code,
        service_type:   "Commercial" as const,
        service_sub_type: `${effectivePropertyType} - ${serviceType}`,
        service_scope:  scopeDetails || null,
        main_data: {
          propertyType: effectivePropertyType, propertySize, serviceType,
          employees: employeeCount, hourlyRate, cleaningDuration, startTime,
          clientProvidesSupplies, frequency: recurringFrequency,
          selectedWeekDays, contractDuration, contractTimeUnit,
        },
        additional_data: { serviceSchedule, greaseLevel, restaurantCondition, dustLevel, propertyCondition, extraServices, propertyId: selectedProperty?.id ?? null, assignedEmployees: carriedEmployees, ...buildDepositAdditionalFields(applyDeposit, depositType, depositValue) },
        labor_cost:           costs.laborCost,
        supplies_cost:        costs.suppliesCost,
        overhead_cost:        costs.overheadCost,
        total_operation_cost: costs.totalOperationCost,
        subtotal, total,
        discount_type:  applyDiscount && discountValue ? discountType : null,
        discount_value: applyDiscount && discountValue ? parseFloat(discountValue) : null,
        status: (deliveryMethod === "email" || deliveryMethod === "sms" || deliveryMethod === "both") ? "Pending" : "Draft",
        estimate_date:  new Date().toISOString().split("T")[0],
        is_draft: false,
      };

      let finalId: string;
      if (isEditing && estimateId) {
        await updateEstimate({ id: estimateId, update: payload });
        finalId = estimateId;
      } else {
        const created = await createEstimate(payload);
        finalId = created.id;
        if (fromWalkthroughId) {
          await (supabase as any).rpc("finalize_walkthrough_to_estimate_conversion", {
            p_walkthrough_id: fromWalkthroughId,
            p_estimate_id:    finalId,
          });
          qc.invalidateQueries({ queryKey: QK.walkthroughs });
        }
      }

      // Send email when delivery method includes email
      if ((deliveryMethod === "email" || deliveryMethod === "both") && entity.email) {
        await sendEstimateEmail({
          estimateData: { ...payload, id: finalId, company_logo: profile?.company_logo, company_name: profile?.company_name, company_email: profile?.company_email, company_phone: profile?.company_phone },
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

  // ── Snapshot por sección: "Save" confirma, X/Cancel descarta ──────────────
  const sectionSnapshot = useRef<SectionSnapshot | null>(null);

  function openSectionModal(id: SectionId) {
    sectionSnapshot.current = {
      propertyType, isOtherProperty, otherPropertyType, propertySize,
      serviceType, recurringFrequency, selectedWeekDays, contractDuration, contractTimeUnit,
      serviceSchedule, greaseLevel, restaurantCondition, dustLevel, propertyCondition,
      clientProvidesSupplies, extraServices,
      employeeCount, hourlyRate, cleaningDuration, startTime, scopeDetails,
    };
    setOpenSection(id);
  }

  function cancelSection() {
    const snap = sectionSnapshot.current;
    if (snap) {
      setPropertyType(snap.propertyType); setIsOtherProperty(snap.isOtherProperty);
      setOtherPropertyType(snap.otherPropertyType); setPropertySize(snap.propertySize);
      setServiceType(snap.serviceType); setRecurringFrequency(snap.recurringFrequency);
      setSelectedWeekDays(snap.selectedWeekDays);
      setContractDuration(snap.contractDuration); setContractTimeUnit(snap.contractTimeUnit);
      setServiceSchedule(snap.serviceSchedule); setGreaseLevel(snap.greaseLevel);
      setRestaurantCondition(snap.restaurantCondition); setDustLevel(snap.dustLevel);
      setPropertyCondition(snap.propertyCondition);
      setClientProvidesSupplies(snap.clientProvidesSupplies); setExtraServices(snap.extraServices);
      setEmployeeCount(snap.employeeCount); setHourlyRate(snap.hourlyRate);
      setCleaningDuration(snap.cleaningDuration); setStartTime(snap.startTime);
      setScopeDetails(snap.scopeDetails);
    }
    setOpenSection(null);
  }

  // ── Resúmenes de sección ──────────────────────────────────────────────────
  const propertyFilled = !!(propertyType || otherPropertyType || propertySize);
  const propertySummary = [
    effectivePropertyType,
    propertySize && `${propertySize} sqft`,
    serviceType === "recurrent" ? recurringFrequency || "Recurrent" : serviceType,
  ].filter(Boolean).join(" · ");

  const detailsFilled = !!(serviceSchedule || greaseLevel || dustLevel || propertyCondition || restaurantCondition);
  const detailsSummary = [
    serviceSchedule,
    groupB ? greaseLevel && `${greaseLevel} grease` : dustLevel && `${dustLevel} dust`,
    groupB ? restaurantCondition : propertyCondition,
    extraServices.length > 0 && `${extraServices.length} extra${extraServices.length === 1 ? "" : "s"}`,
  ].filter(Boolean).join(" · ");

  const laborFilled = employeeCount > 0 || !!hourlyRate || cleaningDuration > 0 || !!startTime;
  const laborSummary = [
    employeeCount > 0 && `${employeeCount} employee${employeeCount === 1 ? "" : "s"}`,
    hourlyRate && `$${hourlyRate}/h`,
    cleaningDuration > 0 && `${cleaningDuration}h`,
    startTime && `from ${startTime}`,
  ].filter(Boolean).join(" · ");

  // ── Secciones del hub ─────────────────────────────────────────────────────
  const hubSections = (
    <>
      <ClientPropertyField
        client={selectedClient}
        onClientChange={(c) => {
          setSelectedClient(c);
          setEstimateType("client");
          setSelectedLead(null);
          setSelectedProperty(null);
          if (c) setErrors((e) => ({ ...e, selectedEntity: false }));
        }}
        property={selectedProperty}
        onPropertyChange={setSelectedProperty}
        preferredPropertyId={selectedProperty?.id ?? pendingPropertyId}
        invalid={errors.selectedEntity}
        subtitle="Who the estimate is for and where the service happens"
      />

      <FormSection
        icon={Building2}
        title="Property"
        subtitle="Type, size and how often the service runs"
        invalid={errors.propertyType || errors.propertySize || errors.serviceType || errors.recurringFrequency}
        onEdit={propertyFilled ? () => openSectionModal("property") : undefined}
      >
        {propertyFilled ? (
          <SummaryRow icon={Building2}>{propertySummary}</SummaryRow>
        ) : (
          <SelectorRow
            label="+ Add Property Details"
            required
            error={errors.propertyType || errors.propertySize}
            onClick={() => openSectionModal("property")}
          />
        )}
      </FormSection>

      <FormSection
        icon={FileText}
        title="Details"
        subtitle="Condition of the property and extra services"
        invalid={errors.serviceSchedule || errors.greaseLevel || errors.dustLevel || errors.propertyCondition || errors.restaurantCondition}
        onEdit={detailsFilled ? () => openSectionModal("details") : undefined}
      >
        {detailsFilled ? (
          <SummaryRow icon={FileText}>{detailsSummary}</SummaryRow>
        ) : (
          <SelectorRow
            label="+ Add Details"
            required
            error={errors.serviceSchedule}
            onClick={() => openSectionModal("details")}
          />
        )}
      </FormSection>

      <FormSection
        icon={Users}
        title="Labor"
        subtitle="Crew size, rate and duration of each visit"
        invalid={errors.employeeCount || errors.hourlyRate || errors.cleaningDuration || errors.startTime}
        onEdit={laborFilled ? () => openSectionModal("labor") : undefined}
      >
        {laborFilled ? (
          <SummaryRow icon={Users}>{laborSummary}</SummaryRow>
        ) : (
          <SelectorRow
            label="+ Add Labor"
            required
            error={errors.employeeCount || errors.hourlyRate}
            onClick={() => openSectionModal("labor")}
          />
        )}
      </FormSection>

    </>
  );

  // ── Modales de sección ────────────────────────────────────────────────────
  const sectionModals = (
    <>
      <SectionModal
        open={openSection === "property"}
        onCancel={cancelSection}
        title="Property"
        onSave={() => setOpenSection(null)}
      >
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
      </SectionModal>

      <SectionModal
        open={openSection === "details"}
        onCancel={cancelSection}
        title="Details"
        onSave={() => setOpenSection(null)}
      >
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
          onExtraServiceToggle={(sv) => setExtraServices((prev) =>
            prev.includes(sv) ? prev.filter((x) => x !== sv) : [...prev, sv]
          )}
          onClearError={(key) => setErrors((e) => ({ ...e, [key]: false }))}
        />
      </SectionModal>

      <SectionModal
        open={openSection === "labor"}
        onCancel={cancelSection}
        title="Labor"
        onSave={() => setOpenSection(null)}
      >
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
      </SectionModal>

    </>
  );

  // ── Review: Summary → Preview → Send ──────────────────────────────────────
  const previewAddr = selectedProperty
    ? propertyToEstimateAddress(selectedProperty)
    : {
        address: selectedClient?.service_street ?? "",
        apt:     selectedClient?.service_apt    ?? "",
        city:    selectedClient?.service_city   ?? "",
        state:   selectedClient?.service_state  ?? "",
        zip:     selectedClient?.service_zip    ?? "",
      };
  const previewClient = selectedEntity ? {
    name:    selectedEntity.full_name,
    company: estimateType === "client" ? (selectedClient?.company ?? undefined) : (selectedLead?.company_name ?? undefined),
    email:   selectedEntity.email ?? "",
    phone:   selectedEntity.phone ?? "",
    address: estimateType === "client"
      ? [previewAddr.address, previewAddr.apt].filter(Boolean).join(" ")
      : (selectedLead?.address ?? undefined),
    city:    estimateType === "client" ? (previewAddr.city  || undefined) : (selectedLead?.city     ?? undefined),
    state:   estimateType === "client" ? (previewAddr.state || undefined) : (selectedLead?.state    ?? undefined),
    zip:     estimateType === "client" ? (previewAddr.zip   || undefined) : (selectedLead?.zip_code ?? undefined),
  } : null;

  // Las tres pantallas comparten UN modal: cambiar de etapa cambia el contenido,
  // no el contenedor. Con un modal por etapa, cada paso cerraba un Dialog y abría
  // otro — parpadeo del overlay y salto de la página de fondo al soltarse y
  // retomarse el bloqueo de scroll.
  const reviewTitle = reviewStep === "preview" ? "Preview"
    : reviewStep === "send" ? "Send"
    : "Summary";

  const reviewSaveLabel = reviewStep === "preview" ? "Continue"
    : reviewStep === "send" ? (displayEditing ? "Update Estimate" : "Send Estimate")
    : "Preview";

  function handleReviewSave() {
    if (reviewStep === "summary") { setReviewStep("preview"); return; }
    if (reviewStep === "preview") { setReviewStep("send");    return; }
    handleSubmit();
  }

  const reviewModals = (
    <SectionModal
      open={reviewStep !== null}
      onCancel={() => setReviewStep(null)}
      title={reviewTitle}
      contentKey={reviewStep ?? ""}
      variant="fullscreen"
      onSave={handleReviewSave}
      saveLabel={reviewSaveLabel}
      saveDisabled={reviewStep === "send" && !deliveryMethod}
      secondaryLabel={reviewStep === "summary" ? "Cancel" : "Back"}
      onSecondary={reviewStep === "preview" ? () => setReviewStep("summary")
        : reviewStep === "send" ? () => setReviewStep("preview")
        : undefined}
      isPending={reviewStep === "send" && (isSavingForm || isSendingEmail)}
    >
      {reviewStep === "summary" && (
        <CommSummaryStep
          costs={pricing.costs} total={pricing.total}
          serviceSubType={`${effectivePropertyType} - ${serviceType}`}
          client={selectedEntity ? { name: selectedEntity.full_name, email: selectedEntity.email ?? "", phone: selectedEntity.phone ?? "" } : null}
          useCustomPrice={useCustomPrice} customPrice={customPrice}
          applyDiscount={applyDiscount} discountType={discountType} discountValue={discountValue}
          applyDeposit={applyDeposit} depositType={depositType} depositValue={depositValue}
          onUseCustomPriceChange={(v) => { setUseCustomPrice(v); if (!v) setCustomPrice(""); }}
          onCustomPriceChange={setCustomPrice}
          onApplyDiscountChange={(v) => { setApplyDiscount(v); if (!v) setDiscountValue(""); }}
          onDiscountTypeChange={setDiscountType}
          onDiscountValueChange={setDiscountValue}
          onApplyDepositChange={(v) => { setApplyDeposit(v); if (!v) setDepositValue(""); }}
          onDepositTypeChange={setDepositType}
          onDepositValueChange={setDepositValue}
        />
      )}

      {reviewStep === "preview" && (
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
      )}

      {reviewStep === "send" && (
        <CommSendStep
          client={selectedEntity ? { name: selectedEntity.full_name, email: selectedEntity.email ?? "", phone: selectedEntity.phone ?? "" } : null}
          total={pricing.total}
          deliveryMethod={deliveryMethod}
          onChange={setDeliveryMethod}
        />
      )}
    </SectionModal>
  );

  // ── Cuerpo del formulario (mismo en modal y en página) ────────────────────
  const formBody = isPrefilling ? (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ) : (
    <div className={FORM_SECTION_GAP}>
      {hubSections}
      <div className="bg-card p-4 flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" type="button" onClick={handleExit}>
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          {!isEditing && <DraftStatusIndicator isSaving={isSaving} lastSaved={lastSaved} />}
          <Button size="sm" type="button" onClick={handleReview}>
            Review
          </Button>
        </div>
      </div>
    </div>
  );

  const formShell = (
    <>
      <div className="flex-shrink-0 bg-card">
        <div className="max-w-2xl mx-auto">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="w-1/3" />
            <div className="w-1/3 text-center">
              <h1 className="font-semibold text-base leading-tight">
                {displayEditing ? "Edit Commercial Estimate" : "Commercial Estimate"}
              </h1>
            </div>
            <div className="flex items-center w-1/3 justify-end">
              <Button variant="ghost" size="icon" className="h-8 w-8" type="button" onClick={handleExit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/40">
        <div className="max-w-2xl mx-auto px-4 py-2.5">
          {formBody}
        </div>
      </div>
    </>
  );

  // ── Shared dialogs (outside any modal) ───────────────────────────────────
  const formDialogs = (
    <>
      <ExitConfirmDialog
        open={showExitDialog}
        entityLabel="estimate"
        // Editar un estimate ya existente no ofrece borrador: la fila ya está guardada
        // y "guardar como draft" lo devolvería a un estado anterior.
        onSaveDraft={isEditing ? undefined : async () => {
          await saveDraft(collectDraftData());
          setShowExitDialog(false);
          goBack();
        }}
        onDiscard={async () => {
          if (!isEditing) await deleteDraft();
          setShowExitDialog(false);
          goBack();
        }}
        onKeepEditing={() => setShowExitDialog(false)}
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
              {displayEditing ? "Estimate Updated!" : "Estimate Created!"}
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

  // ── Render ───────────────────────────────────────────────────────────────
  const modals = (
    <>
      {sectionModals}
      {reviewModals}
      {formDialogs}
    </>
  );

  if (isModal || prefill || isEditing) {
    return (
      <>
        <FullScreenModal open={isModal ? (open ?? false) : true} onClose={handleExit}>
          {formShell}
        </FullScreenModal>
        {modals}
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex flex-col bg-background">
        {formShell}
      </div>
      {modals}
    </>
  );
}

export default CreateCommercialEstimatePage;
