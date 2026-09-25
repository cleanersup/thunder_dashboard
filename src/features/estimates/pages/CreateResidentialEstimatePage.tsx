/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText, Building2, X, Briefcase, Sparkles, Home, Package, Box,
  PawPrint, Shirt,
} from "lucide-react";
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
import {
  EMPTY_QUICK_QUOTE_CONTACT, isQuickQuoteContactComplete,
  quickQuoteNeedsEmail, quickQuoteNeedsPhone, type QuickQuoteContact,
} from "../utils/quickQuote";
import { useCreateQuickQuote, useUpdateQuickQuote } from "../hooks/useQuickQuotes";
import { fetchQuickQuote, sendQuickQuoteEmail, sendQuickQuoteSMS } from "../services/quickQuoteService";
import type { QuickQuoteInsert } from "../types/quickQuote.types";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";
import { DraftStatusIndicator }  from "../components/DraftStatusIndicator";
import { ExitConfirmDialog } from "@/shared/components/common/ExitConfirmDialog";
import { ResServiceStep }  from "../components/residential/ResServiceStep";
import { ResRoomsStep }    from "../components/residential/ResRoomsStep";
import { ResAdditionalStep } from "../components/residential/ResAdditionalStep";
import { ResExtrasStep, type ExtrasState } from "../components/residential/ResExtrasStep";
import { ResPetsStep }     from "../components/residential/ResPetsStep";
import { ResLaundryStep }  from "../components/residential/ResLaundryStep";
import { ResSummaryStep }  from "../components/residential/ResSummaryStep";
import { ResPreviewStep } from "../components/residential/ResPreviewStep";
import { ResSendStep, type DeliveryMethod } from "../components/residential/ResSendStep";
import { ResQuickSendStep } from "../components/residential/ResQuickSendStep";
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
import { useProfile } from "@/shared/hooks/useProfile";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";
import type { DraftData } from "../types/estimate.types";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Secciones del hub que se editan en su propio modal. */
type SectionId = "service" | "project" | "additional" | "extra" | "pets" | "laundry";

/** Las tres pantallas encadenadas del review. */
type ReviewStep = "summary" | "preview" | "send";

/** Estado restaurable al cancelar un modal de sección. */
interface SectionSnapshot {
  selectedService: string;
  squareFootage: string;
  postConstructionType: string | null;
  bedrooms: number; kitchens: number; livingRooms: number; diningRooms: number;
  offices: number; fullBaths: number; halfBaths: number;
  fans: number; oven: number; refrigerator: number;
  blinds: number; windowsInside: number; windowsOutside: number;
  extras: ExtrasState;
  pets: "yes" | "no" | null;
  laundryService: "wash-dry" | "wash-dry-fold" | null;
  laundryPounds: number;
  scope: string;
}

interface Props {
  open?: boolean;
  onClose?: () => void;
  initialState?: {
    isEditing?: boolean; isConversionDraft?: boolean; estimateId?: string;
    estimateData?: any; prefill?: any; continueDraft?: boolean;
    /** Quick Quote nuevo: sin cliente ni propiedad; los datos de la persona se piden al enviar. */
    quickQuote?: boolean;
    /** Quick Quote existente que se está editando — vive en `quick_quotes`, no en `estimates`. */
    quickQuoteId?: string;
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CreateResidentialEstimatePage({ open, onClose, initialState }: Props = {}) {
  const navigate    = useNavigate();
  const location    = useLocation();
  const qc          = useQueryClient();
  const locationState = (location.state as any) || {};
  const { isEditing, isConversionDraft, estimateId, estimateData, prefill, continueDraft } = initialState ?? locationState;
  // Quick quote: otra tabla (`quick_quotes`), sin cliente ni dirección. Se entra
  // en este modo al crear uno nuevo o al abrir uno existente por su id.
  const quickQuoteId = (initialState ?? locationState)?.quickQuoteId as string | undefined;
  const quickQuote   = !!(initialState ?? locationState)?.quickQuote || !!quickQuoteId;
  // `isEditing` keeps its save semantics (UPDATE the draft, don't delete on discard),
  // but a conversion draft is brand-new to the user, so display copy reads "New/Create".
  const displayEditing = isEditing && !isConversionDraft;
  const fromWalkthroughId  = locationState.fromWalkthroughId  as string | undefined;
  const isModal = onClose !== undefined;
  const goBack = useCallback(() => {
    if (isModal) onClose!();
    else navigate(-1);
  }, [isModal, onClose, navigate]);
  const createEst   = useCreateEstimate();
  const updateEst   = useUpdateEstimate();
  const createQuick = useCreateQuickQuote();
  const updateQuick = useUpdateQuickQuote();
  const { sendEstimateEmail, isSending } = useSendEstimateEmail();
  const { sendEstimateSMS }              = useSendEstimateSMS();
  const { data: profile }                = useProfile();

  // ── Hub: sección abierta + pantalla de review ─────────────────────────────
  // Un solo formulario: cada sección se edita en su modal y el review encadena
  // Summary → Preview → Send (paridad swift-slate).
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [reviewStep, setReviewStep]   = useState<ReviewStep | null>(null);
  const [isPrefilling,         setIsPrefilling]         = useState(!!isEditing || !!quickQuoteId);
  const [showExitDialog,       setShowExitDialog]       = useState(false);
  const [showCompanyInfoAlert, setShowCompanyInfoAlert] = useState(false);

  // ── Company info check on mount ───────────────────────────────────────────
  useEffect(() => {
    if (!profile || isEditing) return;
    if (isModal && !open) return; // skip when modal is mounted but not yet opened
    const complete = profile.company_address && profile.company_city &&
                     profile.company_state   && profile.company_zip;
    if (!complete) setShowCompanyInfoAlert(true);
  }, [profile, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step 0: Client ────────────────────────────────────────────────────────
  const [estimateType,   setEstimateType]   = useState<EstimateEntityType | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientEntity | null>(null);
  const [selectedLead,   setSelectedLead]   = useState<LeadEntity | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<ClientProperty | null>(null);
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(null);
  // Employees assigned in the originating walkthrough — carried invisibly through
  // additional_data so they can reach the job on conversion (estimates have no UI/column).
  const [carriedEmployees, setCarriedEmployees] = useState<string[]>([]);
  const [stepErrors,     setStepErrors]     = useState<Record<string, boolean>>({});

  // Resolve pendingPropertyId (from edit/draft/conversion) once the client's properties load
  const { data: clientProperties = [] } = useClientProperties(
    estimateType === "client" ? selectedClient?.id : undefined,
  );
  useEffect(() => {
    if (!pendingPropertyId || clientProperties.length === 0) return;
    const prop = clientProperties.find((p) => p.id === pendingPropertyId);
    if (prop) { setSelectedProperty(prop); setPendingPropertyId(null); }
  }, [pendingPropertyId, clientProperties]);

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
  // `scope` (service_scope) ya no se edita en el formulario, pero el dato sigue vivo:
  // llega desde la conversión de un request y viaja al job al convertir el estimate.
  // Se conserva en el estado para que editar un estimate no lo borre.
  const [scope, setScope] = useState("");

  // ── Step 8: Summary pricing ───────────────────────────────────────────────
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice,    setCustomPrice]    = useState("");
  const [applyDiscount,  setApplyDiscount]  = useState(false);
  const [discountType,   setDiscountType]   = useState<"percentage" | "amount">("percentage");
  const [discountValue,  setDiscountValue]  = useState("");

  // ── Deposit ───────────────────────────────────────────────────────────────
  const [applyDeposit,   setApplyDeposit]   = useState(false);
  const [depositType,    setDepositType]    = useState<"percentage" | "amount">("amount");
  const [depositValue,   setDepositValue]   = useState("");

  // ── Step 10: Send ─────────────────────────────────────────────────────────
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [showSuccess,    setShowSuccess]    = useState(false);
  // Quick quote: los datos de la persona se recogen en el paso de envío, no al empezar.
  const [quickContact,  setQuickContact]  = useState<QuickQuoteContact>(EMPTY_QUICK_QUOTE_CONTACT);
  const [sendErrors,    setSendErrors]    = useState<Record<string, boolean>>({});
  const [isSendingQuick, setIsSendingQuick] = useState(false);

  // ── User state ────────────────────────────────────────────────────────────
  const [userState, setUserState] = useState("");

  useEffect(() => {
    const p = profile as any;
    if (p?.company_state) setUserState(p.company_state);
  }, [profile]);

  // ── Prefill de un quick quote existente ───────────────────────────────────
  // Vive en `quick_quotes`: mismos campos de servicio, pero el "cliente" es el
  // destinatario al que se le envió, que vuelve al paso de envío.
  useEffect(() => {
    if (!quickQuoteId) return;
    (async () => {
      try {
        const q = await fetchQuickQuote(quickQuoteId);
        if (!q) return;

        setSelectedService(q.service_sub_type ?? "");
        setScope(q.service_scope ?? "");

        const md = (q.main_data ?? {}) as Record<string, any>;
        setSquareFootage(md.squareFootage ?? "");
        setBedrooms(md.bedrooms ?? 0); setKitchens(md.kitchens ?? 0); setLivingRooms(md.livingRooms ?? 0);
        setDiningRooms(md.diningRooms ?? 0); setOffices(md.offices ?? 0);
        setFullBaths(md.fullBaths ?? 0); setHalfBaths(md.halfBaths ?? 0);

        const ad = (q.additional_data ?? {}) as Record<string, any>;
        setFans(ad.fans ?? 0); setOven(ad.oven ?? 0); setRefrigerator(ad.refrigerator ?? 0);
        setBlinds(ad.blinds ?? 0); setWindowsInside(ad.windowsInside ?? 0); setWindowsOutside(ad.windowsOutside ?? 0);

        if (q.extra_services) setExtras((e) => ({ ...e, ...(q.extra_services as any) }));
        setPets(q.pets === "Yes" ? "yes" : q.pets === "No" ? "no" : null);

        const laundryStr = q.laundry ?? "";
        if (laundryStr && laundryStr !== "No") {
          const match = laundryStr.match(/^(wash-dry|wash-dry-fold)\s*-\s*(\d+)\s*pounds?/i);
          if (match) {
            setLaundryService((match[1] === "wash-dry-fold" ? "wash-dry-fold" : "wash-dry") as "wash-dry" | "wash-dry-fold");
            setLaundryPounds(parseInt(match[2], 10) || 0);
          }
        }

        if (q.discount_type) {
          setApplyDiscount(true);
          setDiscountType(q.discount_type === "amount" ? "amount" : "percentage");
          setDiscountValue(q.discount_value?.toString() ?? "");
        }

        setQuickContact({
          fullName: q.recipient_name  ?? "",
          email:    q.recipient_email ?? "",
          phone:    formatPhoneDisplay(q.recipient_phone),
        });
        // El canal con el que se mandó la última vez es el que propone por defecto.
        if (q.last_sent_channel === "email" || q.last_sent_channel === "sms") {
          setDeliveryMethod(q.last_sent_channel);
        }
      } finally {
        setIsPrefilling(false);
      }
    })();
  }, [quickQuoteId]);

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
        setPendingPropertyId(getEstimatePropertyId(d.additional_data));
        setCarriedEmployees(Array.isArray(ad.assignedEmployees) ? ad.assignedEmployees : []);
        const dep = restoreDepositFromAdditionalData(d.additional_data);
        setApplyDeposit(dep.applyDeposit); setDepositType(dep.depositType); setDepositValue(dep.depositValue);
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
        // Estimate legacy enlazado a un lead. El flujo de leads se retiró de la UI,
        // pero el registro existe: se muestra como contacto de solo lectura (id
        // sintético, no seleccionable) para que editarlo no borre el vínculo. Si el
        // usuario elige otro cliente, `estimateType` pasa a "client" y el lead se suelta.
        if (d.lead_id) {
          try {
            const lead = await fetchLead(d.lead_id);
            setEstimateType("lead");
            setSelectedLead(lead as LeadEntity);
            setSelectedClient({
              id: `estimate-lead-${d.lead_id}`,
              full_name: lead.full_name,
              company: lead.company_name ?? null,
              phone: lead.phone,
              email: lead.email,
              service_street: lead.address,
              service_apt: lead.apt_suite ?? null,
              service_city: lead.city,
              service_state: lead.state,
              service_zip: lead.zip_code,
            } as ClientEntity);
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
        } catch { /* ignore — picker stays empty */ }
      } else if (prefill.lead_id) {
        setEstimateType("lead");
        try {
          const l = await fetchLead(prefill.lead_id);
          if (l) setSelectedLead(l as LeadEntity);
        } catch { /* ignore — picker stays empty */ }
      }

      if (typeof p.selectedService === "string") setSelectedService(p.selectedService);
      if (typeof p.squareFootage === "string") setSquareFootage(p.squareFootage);
      if (typeof p.bedrooms === "number") setBedrooms(p.bedrooms);
      if (typeof p.kitchens === "number") setKitchens(p.kitchens);
      if (typeof p.livingRooms === "number") setLivingRooms(p.livingRooms);
      if (typeof p.diningRooms === "number") setDiningRooms(p.diningRooms);
      if (typeof p.offices === "number") setOffices(p.offices);
      if (typeof p.fullBaths === "number") setFullBaths(p.fullBaths);
      if (typeof p.halfBaths === "number") setHalfBaths(p.halfBaths);
      if (typeof p.fans === "number") setFans(p.fans);
      if (typeof p.oven === "number") setOven(p.oven);
      if (typeof p.refrigerator === "number") setRefrigerator(p.refrigerator);
      if (typeof p.blinds === "number") setBlinds(p.blinds);
      if (typeof p.windowsInside === "number") setWindowsInside(p.windowsInside);
      if (typeof p.windowsOutside === "number") setWindowsOutside(p.windowsOutside);
      if (p.extras && typeof p.extras === "object") {
        setExtras((prev) => ({ ...prev, ...(p.extras as ExtrasState) }));
      }
      if (p.pets === "yes" || p.pets === "no") setPets(p.pets);
      if (typeof p.scope === "string") setScope(p.scope);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draft ─────────────────────────────────────────────────────────────────
  // El autosave guarda UN borrador residencial por usuario, así que un quick quote
  // a medias adoptaría (y al enviarse borraría) el borrador del formulario normal.
  // Sin borrador: el quick quote se completa de una sentada, que es su razón de ser.
  const { saveDraft, deleteDraft, isSaving, lastSaved, loadedDraft, clearLoadedDraft } =
    useDraftEstimate({ serviceType: "Residential", enabled: !isEditing && !quickQuote });

  // Restore draft only when user explicitly chose "Continue" from the drafts list
  useEffect(() => {
    if (!loadedDraft || isEditing || !continueDraft) return;
    const { draftData } = loadedDraft;
    const fd = draftData.formData as any;

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
      selectedService, squareFootage, postConstructionType,
      bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths,
      fans, oven, refrigerator, blinds, windowsInside, windowsOutside,
      extras, pets, laundryService, laundryPounds, scope,
      useCustomPrice, customPrice, applyDiscount, discountType, discountValue, deliveryMethod,
      propertyId: selectedProperty?.id ?? null,
      applyDeposit, depositType, depositValue,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    estimateType, selectedClient, selectedLead, selectedService, squareFootage,
    bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths,
    fans, oven, refrigerator, blinds, windowsInside, windowsOutside,
    extras, pets, laundryService, laundryPounds, scope,
    useCustomPrice, customPrice, applyDiscount, discountType, discountValue, deliveryMethod,
    selectedProperty, applyDeposit, depositType, depositValue,
  ]);

  // ── Pricing ───────────────────────────────────────────────────────────────
  const pricing = useResidentialPricing({
    bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths,
    fans, oven, refrigerator, blinds, windowsInside, windowsOutside,
    extras, pets, laundryService, laundryPounds, selectedService, userState,
    useCustomPrice, customPrice, applyDiscount, discountType, discountValue,
  });

  // ── Client helpers ────────────────────────────────────────────────────────
  function getClientInfo() {
    // Quick quote: el destinatario se escribe en el paso de envío y no tiene
    // dirección de servicio, así que Summary y Preview van sin bloque de cliente
    // hasta que haya nombre.
    if (quickQuote) {
      if (!quickContact.fullName.trim()) return null;
      return {
        name: quickContact.fullName.trim(), company: "",
        phone: quickContact.phone, email: quickContact.email.trim(),
        address: "", apt: "", city: "", state: "", zip: "",
      };
    }
    if (estimateType === "client" && selectedClient) {
      // When a service property is selected, its address overrides the client's default address
      const addr = selectedProperty
        ? propertyToEstimateAddress(selectedProperty)
        : {
            address: selectedClient.service_street, apt: selectedClient.service_apt ?? "",
            city: selectedClient.service_city, state: selectedClient.service_state, zip: selectedClient.service_zip,
          };
      return {
        name: selectedClient.full_name, company: selectedClient.company ?? "",
        phone: selectedClient.phone, email: selectedClient.email,
        ...addr,
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

  /**
   * Guarda y envía un quick quote.
   *
   * Va a `quick_quotes`, no a `estimates`: es otra tabla, sin cliente ni dirección.
   * Se persiste ANTES de enviar porque las edge functions recargan la fila del lado
   * del servidor — mandan lo que hay en la base, no lo que viaje en el body.
   */
  async function handleQuickQuoteSubmit() {
    if (!validateQuickContact()) {
      toast.error("Please complete the recipient details");
      return;
    }
    const { subtotal, total, laborCost, suppliesCost, overheadCost, totalOpCost } = pricing;
    const name  = quickContact.fullName.trim();
    const email = quickContact.email.trim();
    const phone = quickContact.phone;

    const payload = {
      recipient_name:  name,
      recipient_email: email || null,
      recipient_phone: phone ? phone.replace(/\D/g, "") : null,
      service_sub_type: selectedService,
      service_scope:    scope || null,
      main_data:       { squareFootage, bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths },
      additional_data: { fans, oven, refrigerator, blinds, windowsInside, windowsOutside },
      extra_services:  { ...extras } as Record<string, boolean>,
      pets:    pets === "yes" ? "Yes" : "No",
      laundry: laundryService ? `${laundryService} - ${laundryPounds} pounds` : "No",
      discount_type:  applyDiscount ? discountType : null,
      discount_value: applyDiscount && discountValue ? parseFloat(discountValue) : null,
      subtotal, total,
      labor_cost: laborCost, supplies_cost: suppliesCost,
      overhead_cost: overheadCost, total_operation_cost: totalOpCost,
      is_draft: false,
    } as QuickQuoteInsert;

    setIsSendingQuick(true);
    try {
      const saved = quickQuoteId
        ? await updateQuick.mutateAsync({ id: quickQuoteId, update: payload })
        : await createQuick.mutateAsync(payload);

      // El envío es lo que pasa el status a `Sent` y sella `sent_at` — de eso se
      // encargan las propias funciones.
      if (quickQuoteNeedsEmail(deliveryMethod) && email) {
        await sendQuickQuoteEmail({
          quickQuoteId: saved.id, recipientEmail: email,
          recipientName: name, isUpdate: !!quickQuoteId,
        });
      }
      if (quickQuoteNeedsPhone(deliveryMethod) && phone) {
        await sendQuickQuoteSMS({
          quickQuoteId: saved.id, phoneNumber: phone,
          recipientName: name, quoteTotal: total, isUpdate: !!quickQuoteId,
        });
      }

      qc.invalidateQueries({ queryKey: QK.quickQuotes });
      setShowSuccess(true);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send quick quote");
    } finally {
      setIsSendingQuick(false);
    }
  }

  async function handleSubmit() {
    if (quickQuote) { await handleQuickQuoteSubmit(); return; }
    const client = getClientInfo();
    if (!client) { toast.error("Please select a client"); return; }
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
      additional_data: { fans, oven, refrigerator, blinds, windowsInside, windowsOutside, propertyId: selectedProperty?.id ?? null, assignedEmployees: carriedEmployees, ...buildDepositAdditionalFields(applyDeposit, depositType, depositValue) } as any,
      extra_services: extras as any,
      pets: pets === "yes" ? "Yes" : "No",
      laundry: laundryService ? `${laundryService} - ${laundryPounds} pounds` : "No",
      discount_type: applyDiscount ? discountType : null,
      discount_value: applyDiscount && discountValue ? parseFloat(discountValue) : null,
      subtotal, total, labor_cost: laborCost, supplies_cost: suppliesCost,
      overhead_cost: overheadCost, total_operation_cost: totalOpCost,
      status: (deliveryMethod === "email" || deliveryMethod === "sms" || deliveryMethod === "both") ? "Pending" : "Draft",
      estimate_date: new Date().toISOString(),
      is_draft: false,
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
        if (fromWalkthroughId) {
          await (supabase as any).rpc("finalize_walkthrough_to_estimate_conversion", {
            p_walkthrough_id: fromWalkthroughId,
            p_estimate_id:    savedId,
          });
          qc.invalidateQueries({ queryKey: QK.walkthroughs });
        }
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

  // ── Validación del hub ────────────────────────────────────────────────────
  // Todas las secciones requeridas se validan juntas al pulsar "Review", no una
  // por una: el usuario ve de golpe qué le falta en vez de descubrirlo paso a paso.
  const roomsComplete = (bedrooms + kitchens + livingRooms + diningRooms + offices + fullBaths + halfBaths) > 0;

  function validateAll(): boolean {
    const errs: Record<string, boolean> = {};
    // El quick quote no tiene sección de cliente que validar.
    if (!quickQuote && !selectedClient && !selectedLead) errs.selectedEntity = true;
    if (!selectedService) errs.selectedService = true;
    if (!roomsComplete)   errs.rooms           = true;
    setStepErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /** Datos del destinatario del quick quote — solo los exige el canal elegido. */
  function validateQuickContact(): boolean {
    const errs: Record<string, boolean> = {};
    if (!deliveryMethod) errs.deliveryMethod = true;
    if (!quickContact.fullName.trim()) errs.fullName = true;
    if (quickQuoteNeedsEmail(deliveryMethod) && !quickContact.email.trim()) errs.email = true;
    if (quickQuoteNeedsPhone(deliveryMethod) && !quickContact.phone.trim()) errs.phone = true;
    setSendErrors(errs);
    return Object.keys(errs).length === 0;
  }

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

  // ── Step renderer ─────────────────────────────────────────────────────────
  const client = getClientInfo();

  // ── Snapshot por sección: "Save" confirma, X/Cancel descarta ──────────────
  // Los cambios se aplican en vivo sobre el estado del hub, así que cancelar
  // significa restaurar lo que había al abrir el modal.
  const sectionSnapshot = useRef<SectionSnapshot | null>(null);

  function openSectionModal(id: SectionId) {
    sectionSnapshot.current = {
      selectedService, squareFootage, postConstructionType,
      bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths,
      fans, oven, refrigerator, blinds, windowsInside, windowsOutside,
      extras, pets, laundryService, laundryPounds, scope,
    };
    setOpenSection(id);
  }

  function cancelSection() {
    const snap = sectionSnapshot.current;
    if (snap) {
      setSelectedService(snap.selectedService);
      setSquareFootage(snap.squareFootage);
      setPostConstructionType(snap.postConstructionType);
      setBedrooms(snap.bedrooms); setKitchens(snap.kitchens); setLivingRooms(snap.livingRooms);
      setDiningRooms(snap.diningRooms); setOffices(snap.offices);
      setFullBaths(snap.fullBaths); setHalfBaths(snap.halfBaths);
      setFans(snap.fans); setOven(snap.oven); setRefrigerator(snap.refrigerator);
      setBlinds(snap.blinds); setWindowsInside(snap.windowsInside); setWindowsOutside(snap.windowsOutside);
      setExtras(snap.extras); setPets(snap.pets);
      setLaundryService(snap.laundryService); setLaundryPounds(snap.laundryPounds);
      setScope(snap.scope);
    }
    setOpenSection(null);
  }

  // ── Resúmenes de sección ──────────────────────────────────────────────────
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const projectSummary = [
    bedrooms    > 0 && plural(bedrooms, "bedroom"),
    fullBaths   > 0 && plural(fullBaths, "full bath"),
    halfBaths   > 0 && plural(halfBaths, "half bath"),
    kitchens    > 0 && plural(kitchens, "kitchen"),
    livingRooms > 0 && plural(livingRooms, "living room"),
    diningRooms > 0 && plural(diningRooms, "dining room"),
    offices     > 0 && plural(offices, "office"),
    // El metraje NO va aquí: se edita en la sección Service y se resume allí.
    // Repetirlo hacía que "Edit" en Project prometiera un campo que no contiene.
  ].filter(Boolean).join(" · ");

  const additionalSummary = [
    fans           > 0 && plural(fans, "fan"),
    oven           > 0 && `${oven} oven`,
    refrigerator   > 0 && `${refrigerator} refrigerator`,
    blinds         > 0 && plural(blinds, "blind"),
    windowsInside  > 0 && `${windowsInside} windows inside`,
    windowsOutside > 0 && `${windowsOutside} windows outside`,
  ].filter(Boolean).join(" · ");

  const extrasSummary = Object.entries(extras)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()))
    .join(" · ");

  const laundrySummary = laundryService
    ? `${laundryService === "wash-dry-fold" ? "Wash, dry and fold" : "Wash and dry"}${laundryPounds > 0 ? ` · ${plural(laundryPounds, "pound")}` : ""}`
    : "";

  // ── Secciones del hub ─────────────────────────────────────────────────────
  const hubSections = (
    <>
      {/* El quick quote empieza directamente por el servicio: no pide cliente ni
          propiedad, que es lo que hacía abandonar el formulario. Los datos de la
          persona se piden al final, en el paso de envío. */}
      {!quickQuote && (
        <ClientPropertyField
          client={selectedClient}
          onClientChange={(c) => {
            setSelectedClient(c);
            setEstimateType("client");
            setSelectedLead(null);
            setSelectedProperty(null);
            if (c) setStepErrors((e) => ({ ...e, selectedEntity: false }));
          }}
          property={selectedProperty}
          onPropertyChange={setSelectedProperty}
          preferredPropertyId={selectedProperty?.id ?? pendingPropertyId}
          invalid={stepErrors.selectedEntity}
          subtitle="Who the estimate is for and where the service happens"
        />
      )}

      {/* Service (requerido) */}
      <FormSection
        icon={Briefcase}
        title="Service"
        subtitle="Type of cleaning being quoted"
        invalid={stepErrors.selectedService}
        onEdit={selectedService ? () => openSectionModal("service") : undefined}
      >
        {selectedService ? (
          <SummaryRow
            icon={Sparkles}
            subtitle={[
              postConstructionType,
              squareFootage && `${squareFootage} sqft`,
            ].filter(Boolean).join(" · ") || undefined}
          >
            {selectedService}
          </SummaryRow>
        ) : (
          <SelectorRow
            label="+ Select Service"
            required
            error={stepErrors.selectedService}
            onClick={() => openSectionModal("service")}
          />
        )}
      </FormSection>

      {/* Project (requerido) */}
      <FormSection
        icon={Home}
        title="Project"
        subtitle="Rooms and areas included in the service"
        invalid={stepErrors.rooms}
        onEdit={roomsComplete ? () => openSectionModal("project") : undefined}
      >
        {roomsComplete ? (
          <SummaryRow icon={Home}>{projectSummary}</SummaryRow>
        ) : (
          <SelectorRow
            label="+ Add Project Details"
            required
            error={stepErrors.rooms}
            onClick={() => openSectionModal("project")}
          />
        )}
      </FormSection>

      {/* Additional */}
      <FormSection
        icon={Package}
        title="Additional"
        subtitle="Extra items priced per unit"
        onEdit={additionalSummary ? () => openSectionModal("additional") : undefined}
      >
        {additionalSummary ? (
          <SummaryRow icon={Package}>{additionalSummary}</SummaryRow>
        ) : (
          <SelectorRow label="+ Add Additional" onClick={() => openSectionModal("additional")} />
        )}
      </FormSection>

      {/* Extra */}
      <FormSection
        icon={Box}
        title="Extra"
        subtitle="Areas that add labor to the service"
        onEdit={extrasSummary ? () => openSectionModal("extra") : undefined}
      >
        {extrasSummary ? (
          <SummaryRow icon={Box}>{extrasSummary}</SummaryRow>
        ) : (
          <SelectorRow label="+ Add Extra" onClick={() => openSectionModal("extra")} />
        )}
      </FormSection>

      {/* Pets */}
      <FormSection
        icon={PawPrint}
        title="Pets"
        subtitle="Pets at the property affect the estimate"
        onEdit={pets ? () => openSectionModal("pets") : undefined}
      >
        {pets ? (
          <SummaryRow icon={PawPrint}>{pets === "yes" ? "Yes, there are pets" : "No pets"}</SummaryRow>
        ) : (
          <SelectorRow label="+ Set Pets" onClick={() => openSectionModal("pets")} />
        )}
      </FormSection>

      {/* Laundry */}
      <FormSection
        icon={Shirt}
        title="Laundry"
        subtitle="Optional laundry service"
        onEdit={laundrySummary ? () => openSectionModal("laundry") : undefined}
      >
        {laundrySummary ? (
          <SummaryRow icon={Shirt}>{laundrySummary}</SummaryRow>
        ) : (
          <SelectorRow label="+ Add Laundry" onClick={() => openSectionModal("laundry")} />
        )}
      </FormSection>

    </>
  );

  // ── Modales de sección ────────────────────────────────────────────────────
  const sectionModals = (
    <>
      <SectionModal
        open={openSection === "service"}
        onCancel={cancelSection}
        title="Service"
        onSave={() => setOpenSection(null)}
        saveDisabled={!selectedService}
      >
        <ResServiceStep
          service={selectedService} squareFootage={squareFootage}
          postConstructionType={postConstructionType}
          onServiceChange={(svc) => {
            setSelectedService(svc);
            if (svc !== "Post Construction") setPostConstructionType(null);
            setStepErrors((e) => ({ ...e, selectedService: false }));
          }}
          onSqftChange={setSquareFootage}
          onPostConstructionTypeChange={setPostConstructionType}
        />
      </SectionModal>

      <SectionModal
        open={openSection === "project"}
        onCancel={cancelSection}
        title="Project"
        onSave={() => setOpenSection(null)}
      >
        <ResRoomsStep
          bedrooms={bedrooms} kitchens={kitchens} livingRooms={livingRooms}
          diningRooms={diningRooms} offices={offices} fullBaths={fullBaths} halfBaths={halfBaths}
          onChange={(field, val) => {
            const map: Record<string, (v: number) => void> = {
              bedrooms: setBedrooms, kitchens: setKitchens, livingRooms: setLivingRooms,
              diningRooms: setDiningRooms, offices: setOffices, fullBaths: setFullBaths, halfBaths: setHalfBaths,
            };
            map[field]?.(val);
            setStepErrors((e) => ({ ...e, rooms: false }));
          }}
        />
      </SectionModal>

      <SectionModal
        open={openSection === "additional"}
        onCancel={cancelSection}
        title="Additional"
        subtitle="Add additional details to the estimate"
        onSave={() => setOpenSection(null)}
      >
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
      </SectionModal>

      <SectionModal
        open={openSection === "extra"}
        onCancel={cancelSection}
        title="Extra"
        subtitle="Add extra details to the cleaning estimate"
        onSave={() => setOpenSection(null)}
      >
        <ResExtrasStep
          extras={extras}
          onChange={(key, val) => setExtras((e) => ({ ...e, [key]: val }))}
        />
      </SectionModal>

      <SectionModal
        open={openSection === "pets"}
        onCancel={cancelSection}
        title="Pets"
        subtitle="Let us know if there are pets in the home"
        onSave={() => setOpenSection(null)}
        saveDisabled={!pets}
      >
        <ResPetsStep pets={pets} onChange={setPets} />
      </SectionModal>

      <SectionModal
        open={openSection === "laundry"}
        onCancel={cancelSection}
        title="Laundry"
        subtitle="Add laundry services if needed"
        onSave={() => setOpenSection(null)}
      >
        <ResLaundryStep
          laundryService={laundryService} laundryPounds={laundryPounds}
          onServiceChange={setLaundryService} onPoundsChange={setLaundryPounds}
        />
      </SectionModal>

    </>
  );

  // ── Review: Summary → Preview → Send ──────────────────────────────────────
  // Las tres pantallas comparten UN modal: cambiar de etapa cambia el contenido,
  // no el contenedor. Con un modal por etapa, cada paso cerraba un Dialog y abría
  // otro — parpadeo del overlay y salto de la página de fondo al soltarse y
  // retomarse el bloqueo de scroll.
  const reviewTitle = reviewStep === "preview" ? "Preview"
    : reviewStep === "send" ? "Send"
    : "Summary";

  const reviewSaveLabel = reviewStep === "preview" ? "Continue"
    : reviewStep === "send"
      ? (quickQuote
          ? (quickQuoteId ? "Resend Quote" : "Send Quote")
          : (displayEditing ? "Update Estimate" : "Send Estimate"))
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
      saveDisabled={reviewStep === "send" && (quickQuote
        ? !isQuickQuoteContactComplete(quickContact, deliveryMethod)
        : !deliveryMethod)}
      secondaryLabel={reviewStep === "summary" ? "Cancel" : "Back"}
      onSecondary={reviewStep === "preview" ? () => setReviewStep("summary")
        : reviewStep === "send" ? () => setReviewStep("preview")
        : undefined}
      isPending={reviewStep === "send" && (quickQuote
        ? (createQuick.isPending || updateQuick.isPending || isSendingQuick)
        : (createEst.isPending || updateEst.isPending || isSending))}
    >
      {reviewStep === "summary" && (
        <ResSummaryStep
          pricing={pricing} selectedService={selectedService}
          client={client ? { name: client.name, email: client.email, phone: client.phone, address: client.address, city: client.city, state: client.state, zip: client.zip } : null}
          useCustomPrice={useCustomPrice} customPrice={customPrice}
          applyDiscount={applyDiscount} discountType={discountType} discountValue={discountValue}
          applyDeposit={applyDeposit} depositType={depositType} depositValue={depositValue}
          onUseCustomPriceChange={setUseCustomPrice} onCustomPriceChange={setCustomPrice}
          onApplyDiscountChange={setApplyDiscount} onDiscountTypeChange={setDiscountType} onDiscountValueChange={setDiscountValue}
          onApplyDepositChange={setApplyDeposit} onDepositTypeChange={setDepositType} onDepositValueChange={setDepositValue}
          showDeposit={!quickQuote}
        />
      )}

      {reviewStep === "preview" && (
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
          applyDeposit={applyDeposit} depositType={depositType} depositValue={depositValue}
        />
      )}

      {reviewStep === "send" && (quickQuote ? (
        <ResQuickSendStep
          contact={quickContact}
          deliveryMethod={deliveryMethod}
          onContactChange={(c) => { setQuickContact(c); setSendErrors({}); }}
          onDeliveryMethodChange={(m) => { setDeliveryMethod(m); setSendErrors({}); }}
          errors={sendErrors}
        />
      ) : (
        <ResSendStep
          client={client ? { name: client.name, email: client.email, phone: client.phone } : null}
          total={pricing.total}
          deliveryMethod={deliveryMethod}
          onChange={setDeliveryMethod}
        />
      ))}
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
          {!isEditing && !quickQuote && <DraftStatusIndicator isSaving={isSaving} lastSaved={lastSaved} />}
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
                {quickQuote
                  ? (displayEditing ? "Edit Quick Quote" : "Quick Quote")
                  : (displayEditing ? "Edit Residential Estimate" : "Residential Estimate")}
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
        entityLabel={quickQuote ? "quick quote" : "estimate"}
        // Editar un estimate ya existente no ofrece borrador: la fila ya está guardada
        // y "guardar como draft" lo devolvería a un estado anterior. El quick quote
        // tampoco: comparte la única fila de borrador residencial (ver useDraftEstimate).
        onSaveDraft={isEditing || quickQuote ? undefined : async () => {
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
              {quickQuote
                ? (quickQuoteId ? "Quote Resent!" : "Quote Sent!")
                : (displayEditing ? "Estimate Updated!" : "Estimate Created!")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {quickQuote
                ? `The quote was sent to ${quickContact.fullName.trim() || "the recipient"}.`
                : deliveryMethod ? "The estimate has been created and sent successfully." : "The estimate has been saved successfully."}
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
  // Un solo formulario con sus modales. En modal (desde la lista o una conversión)
  // y en página se ve igual: cambia solo el contenedor.
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

export default CreateResidentialEstimatePage;
