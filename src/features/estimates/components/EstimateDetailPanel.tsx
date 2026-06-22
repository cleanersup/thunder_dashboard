/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module EstimateDetailPanel
 * Right-side detail panel for estimates — replaces EstimateDetailsModal.
 *
 * Uses SidePanel as the shell (layout/animation) and migrates all content
 * and action handlers from EstimateDetailsModal to a single-column layout.
 *
 * Footer actions by status:
 *   Draft    → Continue · More (Delete Draft)
 *   Pending  → Mark as Accepted · More (Edit, Send email/SMS, Share, Download PDF, Decline, Cancel)
 *   Accepted → Convert to Job/Invoice · More (Edit, Download PDF, Share, Add to Route)
 *   Declined → Edit · More (Edit and Send, Cancel)
 *   Canceled → Delete
 * (Linked-job "View Job" link is rendered in the content card, not the footer.)
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  CheckCircle, Mail, MessageSquare, Phone, MapPin, Building2, Calendar,
  FileText, Edit, Share, Download, Eye, EyeOff,
  Users, Box, TrendingUp, DollarSign, X, Play, Trash2, Clock, MoreHorizontal, Briefcase, ThumbsDown, ChevronRight,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { format } from "date-fns";
import { formatDateOnly } from "@/shared/utils/formatters";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/shared/hooks/useProfile";
import { fetchEstimate, deleteDraftEstimate } from "../services/estimatesService";
import { RESIDENTIAL_STEPS, COMMERCIAL_STEPS } from "../config/steps.config";
import type { DraftData } from "../types/estimate.types";
import { useUpdateEstimateStatus } from "../hooks/useEstimates";
import { useEstimateShare } from "../hooks/useEstimateShare";
import { useSendEstimateEmail } from "../hooks/useSendEstimateEmail";
import { useSendEstimateSMS }   from "../hooks/useSendEstimateSMS";
import { PDFService } from "@/shared/services/pdf.service";
import { SidePanel } from "@/shared/components/common/SidePanel";
import { buildInvoicePrefillFromEstimate } from "../utils/buildInvoicePrefill";
import { useConvertEstimateToJob } from "@/features/jobs/hooks/useConvertEstimateToJob";

// ─── Local helpers ────────────────────────────────────────────────────────────

function formatPhone(phone: string) {
  const c = phone.replace(/\D/g, "");
  return c.length === 10 ? `(${c.slice(0, 3)}) ${c.slice(3, 6)}-${c.slice(6)}` : phone;
}

function getStatusColor(status: string) {
  switch (status) {
    case "Draft":     return "hsl(45 93% 42%)";
    case "Pending":
    case "Viewed":    return "hsl(var(--orange-vibrant))";
    case "Accepted":  return "hsl(var(--green-vibrant))";
    case "Invoiced":
    case "Converted": return "hsl(270 70% 50%)";
    case "Canceled":  return "hsl(var(--destructive))";
    default:          return "hsl(var(--muted-foreground))";
  }
}

function getStatusBg(status: string) {
  switch (status) {
    case "Draft":     return "hsl(45 93% 47% / 0.15)";
    case "Pending":
    case "Viewed":    return "hsl(var(--orange-vibrant) / 0.1)";
    case "Accepted":  return "hsl(var(--green-vibrant) / 0.1)";
    case "Invoiced":
    case "Converted": return "hsl(270 70% 50% / 0.15)";
    case "Canceled":  return "hsl(var(--destructive) / 0.1)";
    default:          return "hsl(var(--muted))";
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EstimateDetailPanelProps {
  open:         boolean;
  onClose:      () => void;
  estimateId:   string | null;
  /** Called when user clicks Edit — parent opens the create/edit wizard */
  onEdit?:      (estimate: any) => void;
  /** Called after Continue / Start Fresh — parent opens the estimate wizard */
  onOpenEstimateWizard?: (serviceType: string, continueDraft?: boolean) => void;
  /** Called when user clicks Convert to Invoice — parent opens invoice modal with prefill */
  onConvertToInvoice?: (prefill: import("@/features/invoices/pages/CreateInvoicePage").InvoicePrefill) => void;
}

// ─── Footer component ─────────────────────────────────────────────────────────

interface FooterProps {
  status:              string;
  isSending:           boolean;
  isSendingSMS:        boolean;
  isGeneratingLink:    boolean;
  isDownloadingPDF:    boolean;
  isAlreadyInRoute:    boolean;
  isAddingToRoute:     boolean;
  hasPhone:            boolean;
  hasJobConversion:    boolean;
  isConvertingToJob:   boolean;
  onAccept:            () => void;
  onDecline:           () => void;
  onSendEmail:         () => void;
  onSendSMS:           () => void;
  onEdit:              () => void;
  onShare:             () => void;
  onDownloadPDF:       () => void;
  onConvert:           () => void;
  onConvertToJob:      () => void;
  onAddToRoute:        () => void;
  onCancel:            () => void;
  onDelete:            () => void;
  onDeleteDraft:       () => void;
  onContinueDraft:     () => void;
  onEditAndSend:       () => void;
}

function PanelFooter({
  status, isSending, isSendingSMS, isGeneratingLink, isDownloadingPDF, isAlreadyInRoute, isAddingToRoute, hasPhone,
  hasJobConversion, isConvertingToJob,
  onAccept, onDecline, onSendEmail, onSendSMS, onEdit, onShare, onDownloadPDF, onConvert, onConvertToJob, onAddToRoute, onCancel,
  onDelete, onDeleteDraft, onContinueDraft, onEditAndSend,
}: FooterProps) {
  // Draft: Continue + More (Delete Draft)
  if (status === "Draft") {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" className="flex-1" onClick={onContinueDraft}>
          <Play className="w-4 h-4 mr-1.5" /> Continue
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="px-2.5">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDeleteDraft}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete Draft
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Pending / Viewed: Mark as Accepted (primary) + More (Edit, Send Email, SMS, Share, PDF, Decline, Cancel)
  if (status === "Pending" || status === "Viewed") {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" className="flex-1" style={{ backgroundColor: "hsl(var(--green-vibrant))", color: "white" }} onClick={onAccept}>
          <CheckCircle className="w-4 h-4 mr-1.5" /> Mark as Accepted
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="px-2.5">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSendEmail} disabled={isSending}>
              <Mail className="w-4 h-4 mr-2" /> {isSending ? "Sending…" : "Send reminder by email"}
            </DropdownMenuItem>
            {hasPhone && (
              <DropdownMenuItem onClick={onSendSMS} disabled={isSendingSMS}>
                <MessageSquare className="w-4 h-4 mr-2" /> {isSendingSMS ? "Sending…" : "Send reminder by SMS"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onShare} disabled={isGeneratingLink}>
              <Share className="w-4 h-4 mr-2" /> {isGeneratingLink ? "Generating…" : "Share"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadPDF} disabled={isDownloadingPDF}>
              <Download className="w-4 h-4 mr-2" /> {isDownloadingPDF ? "Downloading…" : "Download PDF"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDecline}>
              <ThumbsDown className="w-4 h-4 mr-2 text-orange-500" /> Decline
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" /> Cancel Estimate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Accepted: Convert to Job (primary, if no job) / Convert to Invoice + More (Edit, PDF, Share)
  if (status === "Accepted") {
    return (
      <div className="flex items-center gap-2">
        {!hasJobConversion ? (
          <Button size="sm" className="flex-1" style={{ backgroundColor: "hsl(var(--green-vibrant))", color: "white" }} onClick={onConvertToJob} disabled={isConvertingToJob}>
            <Briefcase className="w-4 h-4 mr-1.5" />
            {isConvertingToJob ? "Converting…" : "Convert to Job"}
          </Button>
        ) : (
          <Button size="sm" className="flex-1" onClick={onConvert}>
            <FileText className="w-4 h-4 mr-1.5" /> Convert to Invoice
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="px-2.5">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadPDF} disabled={isDownloadingPDF}>
              <Download className="w-4 h-4 mr-2" /> {isDownloadingPDF ? "Downloading…" : "Download PDF"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare} disabled={isGeneratingLink}>
              <Share className="w-4 h-4 mr-2" /> {isGeneratingLink ? "Generating…" : "Share"}
            </DropdownMenuItem>
            {isAlreadyInRoute ? (
              <DropdownMenuItem disabled>
                <MapPin className="w-4 h-4 mr-2" /> Already in Route
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onAddToRoute} disabled={isAddingToRoute}>
                <MapPin className="w-4 h-4 mr-2" /> {isAddingToRoute ? "Adding…" : "Add to Route"}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Converted / Invoiced: link shown in content card — no footer needed
  if (status === "Converted" || status === "Invoiced") {
    return null;
  }

  // Declined: Edit (→Draft) primary + Edit and Send + More (Cancel)
  if (status === "Declined") {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" className="flex-1" onClick={onEdit}>
          <Edit className="w-4 h-4 mr-1.5" /> Edit
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="px-2.5">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEditAndSend}>
              <Share className="w-4 h-4 mr-2" /> Edit and Send
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" /> Cancel Estimate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Canceled: Delete
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
        <Trash2 className="w-4 h-4" /> Delete
      </Button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EstimateDetailPanel({
  open, onClose, estimateId, onEdit, onOpenEstimateWizard, onConvertToInvoice,
}: EstimateDetailPanelProps) {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { data: profile }                         = useProfile();
  const { generateShareLink, isGeneratingLink }   = useEstimateShare();
  const { sendEstimateEmail, isSending }          = useSendEstimateEmail();
  const { sendEstimateSMS, isSendingSMS }         = useSendEstimateSMS();
  const updateStatus                              = useUpdateEstimateStatus();

  const [estimate,              setEstimate]              = useState<any>(null);
  const [loading,               setLoading]               = useState(true);
  const [isDownloadingPDF,      setIsDownloadingPDF]      = useState(false);
  const [isAcceptDialogOpen,    setIsAcceptDialogOpen]    = useState(false);
  const [isCancelDialogOpen,    setIsCancelDialogOpen]    = useState(false);
  const [isEmailSuccessOpen,    setIsEmailSuccessOpen]    = useState(false);
  const [isDeleteDraftOpen,     setIsDeleteDraftOpen]     = useState(false);
  const [isDeletingDraft,       setIsDeletingDraft]       = useState(false);
  const [isDeleteOpen,          setIsDeleteOpen]          = useState(false);
  const [isDeleting,            setIsDeleting]            = useState(false);
  const [isAlreadyInRoute,      setIsAlreadyInRoute]      = useState(false);
  const [isAddingToRoute,       setIsAddingToRoute]       = useState(false);
  const [isConvertingToJob,     setIsConvertingToJob]     = useState(false);
  const convertEstimateToJob = useConvertEstimateToJob();
  const [draftClientInfo, setDraftClientInfo] = useState<{
    name: string; email: string; phone: string;
    address: string; city: string; state: string; zip: string;
  } | null>(null);

  // ── Load estimate when panel opens ──────────────────────────────────────────

  useEffect(() => {
    if (open && estimateId) {
      setDraftClientInfo(null);
      setIsAlreadyInRoute(false);
      loadEstimate();
      checkIfInRoute();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, estimateId]);

  // ── Real-time: update viewed_at and status ───────────────────────────────────

  useEffect(() => {
    if (!estimateId || !open) return;
    const channel = supabase
      .channel(`estimate-panel-${estimateId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "estimates", filter: `id=eq.${estimateId}` },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          setEstimate((prev: any) => ({
            ...prev,
            ...(n.viewed_at != null && { viewed_at: n.viewed_at }),
            ...(n.status    != null && { status:    n.status    }),
          }));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [estimateId, open]);

  // ── Data loaders ─────────────────────────────────────────────────────────────

  async function loadEstimate() {
    if (!estimateId) return;
    setLoading(true);
    try {
      const data = await fetchEstimate(estimateId);
      setEstimate(data);
      if (data?.status === "Draft") loadDraftClientData(data);
    } catch {
      toast.error("Failed to load estimate");
    } finally {
      setLoading(false);
    }
  }

  async function loadDraftClientData(data: any) {
    if (data.client_id) {
      const { data: c } = await supabase
        .from("clients")
        .select("full_name, email, phone, service_street, service_apt, service_city, service_state, service_zip")
        .eq("id", data.client_id)
        .maybeSingle();
      if (c) setDraftClientInfo({
        name: c.full_name, email: c.email, phone: c.phone,
        address: `${c.service_street}${c.service_apt ? `, ${c.service_apt}` : ""}`,
        city: c.service_city, state: c.service_state, zip: c.service_zip,
      });
    } else if (data.lead_id) {
      const { data: l } = await supabase
        .from("leads")
        .select("full_name, email, phone, address, apt_suite, city, state, zip_code")
        .eq("id", data.lead_id)
        .maybeSingle();
      if (l) setDraftClientInfo({
        name: l.full_name, email: l.email, phone: l.phone,
        address: `${l.address}${l.apt_suite ? `, ${l.apt_suite}` : ""}`,
        city: l.city, state: l.state, zip: l.zip_code,
      });
    }
  }

  async function checkIfInRoute() {
    if (!estimateId) return;
    const { data } = await supabase
      .from("route_appointments")
      .select("id")
      .eq("estimate_id", estimateId)
      .maybeSingle();
    setIsAlreadyInRoute(!!data);
  }

  // ── Action handlers ───────────────────────────────────────────────────────────

  async function handleAccept() {
    if (!estimate) return;
    await updateStatus.mutateAsync({ id: estimate.id, status: "Accepted", estimate: { client_name: estimate.client_name, total: estimate.total } });
    setEstimate({ ...estimate, status: "Accepted" });
    setIsAcceptDialogOpen(false);
    toast.success("Estimate accepted");
  }

  async function handleCancel() {
    if (!estimate) return;
    await updateStatus.mutateAsync({ id: estimate.id, status: "Canceled", estimate: { client_name: estimate.client_name, total: estimate.total } });
    setEstimate({ ...estimate, status: "Canceled" });
    setIsCancelDialogOpen(false);
    toast.success("Estimate canceled");
  }

  async function handleDecline() {
    if (!estimate) return;
    await updateStatus.mutateAsync({ id: estimate.id, status: "Declined", estimate: { client_name: estimate.client_name, total: estimate.total } });
    setEstimate({ ...estimate, status: "Declined" });
    toast.success("Estimate declined");
  }

  async function handleDelete() {
    if (!estimate) return;
    setIsDeleting(true);
    try {
      const { deleteEstimate } = await import("../services/estimatesService");
      await deleteEstimate(estimate.id);
      qc.invalidateQueries({ queryKey: QK.estimates });
      toast.success("Estimate deleted");
      onClose();
    } catch {
      toast.error("Failed to delete estimate");
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  }

  async function handleDownloadPDF() {
    if (!estimate || !profile) { toast.error("Missing data to generate PDF"); return; }
    setIsDownloadingPDF(true);
    try {
      toast.info("Generating PDF...");
      const doc = await PDFService.generateEstimatePDF({
        companyLogo:    profile.company_logo    ?? undefined,
        companyName:    profile.company_name    ?? "",
        companyPhone:   profile.company_phone   ?? "",
        companyEmail:   profile.company_email   ?? "",
        companyAddress: profile.company_address ?? "",
        companyCity:    profile.company_city    ?? "",
        companyState:   profile.company_state   ?? "",
        companyZip:     profile.company_zip     ?? "",
        clientName:     estimate.client_name,
        clientPhone:    estimate.phone,
        clientEmail:    estimate.email,
        clientAddress:  estimate.address,
        clientApt:      estimate.apt            ?? undefined,
        clientCity:     estimate.city,
        clientState:    estimate.state,
        clientZip:      estimate.zip,
        estimateNumber: estimate.id.substring(0, 8).toUpperCase(),
        estimateDate:   formatDateOnly(estimate.estimate_date, "MMMM dd, yyyy"),
        serviceType:    estimate.service_type,
        serviceSubType: estimate.service_sub_type ?? undefined,
        serviceScope:   estimate.service_scope   ?? undefined,
        mainData:       (estimate.main_data       as Record<string, any>) ?? undefined,
        additionalData: (estimate.additional_data as Record<string, any>) ?? undefined,
        extraServices:  (estimate.extra_services  as Record<string, boolean>) ?? undefined,
        subtotal:       estimate.subtotal,
        discountType:   estimate.discount_type  ?? undefined,
        discountValue:  estimate.discount_value ?? undefined,
        total:          estimate.total,
      });
      doc.save(`Estimate_${estimate.id.substring(0, 8).toUpperCase()}_${estimate.client_name.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloadingPDF(false);
    }
  }

  async function handleShare() {
    if (!estimate) return;
    await generateShareLink(estimate.id);
  }

  async function handleSendEmail() {
    if (!estimate) return;
    const result = await sendEstimateEmail({
      estimateData: {
        ...estimate,
        company_logo:  profile?.company_logo,
        company_email: profile?.company_email,
        company_phone: profile?.company_phone,
        company_name:  profile?.company_name,
      },
      recipientEmail: estimate.email,
      estimateType:   "residential",
    });
    if (result.success) setIsEmailSuccessOpen(true);
    else toast.error(result.error ?? "Failed to send email");
  }

  async function handleSendSMS() {
    if (!estimate?.phone) return;
    await sendEstimateSMS({
      phoneNumber:   estimate.phone,
      clientName:    estimate.client_name,
      estimateId:    estimate.id,
      estimateTotal: estimate.total,
      isUpdate:      true,
    });
  }

  async function handleEdit() {
    if (!estimate) return;
    // Reset status before editing (mirrors swift-slate behavior)
    if (estimate.status === "Accepted") {
      await updateStatus.mutateAsync({ id: estimate.id, status: "Pending", estimate: { client_name: estimate.client_name, total: estimate.total } });
    } else if (estimate.status === "Declined") {
      await updateStatus.mutateAsync({ id: estimate.id, status: "Draft", estimate: { client_name: estimate.client_name, total: estimate.total } });
    }
    onClose();
    if (onEdit) {
      onEdit(estimate);
    } else {
      const route = estimate.service_type === "Commercial" ? "/estimates/new/commercial" : "/estimates/new/residential";
      navigate(route, { state: { isEditing: true, estimateId: estimate.id, estimateData: estimate } });
    }
  }

  function handleEditAndSend() {
    if (!estimate) return;
    onClose();
    const route = estimate.service_type === "Commercial" ? "/estimates/new/commercial" : "/estimates/new/residential";
    navigate(route, { state: { isEditing: true, estimateId: estimate.id, estimateData: estimate } });
  }

  async function handleAddToRoute() {
    if (!estimate) return;
    setIsAddingToRoute(true);
    try {
      // 1. Try to reuse the FK client from the estimate (only set on drafts)
      let clientId: string | null = estimate.client_id ?? null;
      let clientRow: any = null;

      if (clientId) {
        const { data } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
        clientRow = data ?? null;
        if (!clientRow) clientId = null; // FK dangling — fall through
      }

      // 2. Search by email (same account).
      // Use .limit(1) instead of .maybeSingle() so that if duplicates already
      // exist (PGRST116 would make maybeSingle return null and trigger step 3,
      // creating yet another duplicate).
      if (!clientId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: rows } = await supabase.from("clients").select("*")
            .eq("user_id", user.id).ilike("email", estimate.email).limit(1);
          const found = rows?.[0] ?? null;
          if (found) { clientId = found.id; clientRow = found; }
        }
      }

      // 3. Create a new client from the denormalized estimate fields
      if (!clientId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { toast.error("Not authenticated"); return; }
        const { data: newClient, error } = await supabase.from("clients").insert({
          user_id: user.id,
          full_name: estimate.client_name,
          company: estimate.company_name ?? null,
          email: estimate.email,
          phone: estimate.phone,
          service_street: estimate.address,
          service_apt: estimate.apt ?? null,
          service_city: estimate.city,
          service_state: estimate.state,
          service_zip: estimate.zip,
          billing_street: estimate.address,
          billing_apt: estimate.apt ?? null,
          billing_city: estimate.city,
          billing_state: estimate.state,
          billing_zip: estimate.zip,
          client_type: estimate.service_type ?? "Residential",
          contact_preference: "Email",
          status: "active",
        }).select().maybeSingle();
        if (error || !newClient) { toast.error("Failed to set up client for route"); return; }
        clientId = newClient.id;
        clientRow = newClient;
        // Ensure the new client appears in the appointment wizard's client list
        await qc.invalidateQueries({ queryKey: QK.clients });
      }

      onClose();
      navigate("/create-route", {
        state: {
          fromEstimate: {
            clientId,
            clientObject: {
              id: clientRow.id,
              full_name: clientRow.full_name,
              company: clientRow.company ?? null,
              phone: clientRow.phone,
              email: clientRow.email,
              service_street: clientRow.service_street,
              service_apt: clientRow.service_apt ?? null,
              service_city: clientRow.service_city,
              service_state: clientRow.service_state,
              service_zip: clientRow.service_zip,
            },
            // Route appointments use "One time" / "Recurring" for service_type.
            // Estimates are always single jobs, so we default to "One time".
            // The cleaning_type maps from the estimate's service_sub_type.
            serviceType: "One time",
            cleaningType: estimate.service_sub_type ?? null,
            estimateId: estimate.id,
          },
        },
      });
    } finally {
      setIsAddingToRoute(false);
    }
  }

  async function handleConvertToJob() {
    if (!estimate) return;
    await convertEstimateToJob({
      estimate,
      onStart:   () => setIsConvertingToJob(true),
      onFinally: () => setIsConvertingToJob(false),
      onSuccess: () => onClose(),
    });
  }

  function handleConvertToInvoice() {
    if (!estimate) return;
    const prefill = buildInvoicePrefillFromEstimate(estimate);
    onClose();
    if (onConvertToInvoice) {
      onConvertToInvoice(prefill);
    } else {
      navigate("/invoices/new", { state: prefill });
    }
  }

  function handleContinueDraft() {
    if (!estimate) return;
    onClose();
    if (onOpenEstimateWizard) onOpenEstimateWizard(estimate.service_type, true);
    else navigate(estimate.service_type === "Commercial" ? "/estimates/new/commercial" : "/estimates/new/residential");
  }

  async function handleDeleteDraft() {
    if (!estimate) return;
    setIsDeletingDraft(true);
    try {
      await deleteDraftEstimate(estimate.id);
      qc.invalidateQueries({ queryKey: QK.estimates });
      toast.success("Draft deleted");
      onClose();
    } catch {
      toast.error("Failed to delete draft");
    } finally {
      setIsDeletingDraft(false);
      setIsDeleteDraftOpen(false);
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const f = estimate ? {
    estimateNumber: `EST-${estimate.id.slice(0, 6)}`,
    clientName:     estimate.client_name,
    companyName:    estimate.company_name ?? "",
    email:          estimate.email,
    phone:          estimate.phone,
    address:        estimate.address,
    apt:            estimate.apt ?? "",
    city:           estimate.city,
    state:          estimate.state,
    zip:            estimate.zip,
    serviceType:    estimate.service_type,
    serviceSubType: estimate.service_sub_type ?? "",
    serviceScope:   estimate.service_scope    ?? "",
    total:          estimate.total,
    subtotal:       estimate.subtotal,
    status:         estimate.status,
    estimateDate:   formatDateOnly(estimate.estimate_date, "MMMM d, yyyy"),
    mainData:       (estimate.main_data       as Record<string, any>) ?? {},
    additionalData: (estimate.additional_data as Record<string, any>) ?? {},
    extraServices:  (estimate.extra_services  as Record<string, boolean>) ?? {},
    pets:           estimate.pets    ?? "",
    laundry:        estimate.laundry ?? "",
    discountType:   estimate.discount_type,
    discountValue:  estimate.discount_value,
  } : null;

  // Draft data helpers
  const draftData: DraftData | null = f?.status === "Draft" && estimate?.draft_data
    ? (estimate.draft_data as unknown as DraftData)
    : null;
  const draftFd = (draftData?.formData ?? {}) as Record<string, unknown>;
  const draftSteps = f?.serviceType === "Commercial" ? COMMERCIAL_STEPS : RESIDENTIAL_STEPS;
  const draftCurrentStep = draftData?.currentStep ?? 0;
  const draftStepProgress = `Step ${draftCurrentStep + 1} of ${draftSteps.length} — ${draftSteps[draftCurrentStep]?.label ?? ""}`;

  const draftRooms: [string, number][] = f?.status === "Draft" && f?.serviceType === "Residential"
    ? ([
        ["Bedrooms",      draftFd.bedrooms],
        ["Kitchens",      draftFd.kitchens],
        ["Living Rooms",  draftFd.livingRooms],
        ["Dining Rooms",  draftFd.diningRooms],
        ["Offices",       draftFd.offices],
        ["Full Baths",    draftFd.fullBaths],
        ["Half Baths",    draftFd.halfBaths],
      ] as [string, unknown][])
        .filter(([, v]) => v !== undefined && Number(v) > 0)
        .map(([k, v]) => [k, Number(v)])
    : [];

  const draftAdditional: [string, number][] = f?.status === "Draft" && f?.serviceType === "Residential"
    ? ([
        ["Ceiling Fans",    draftFd.fans],
        ["Oven",            draftFd.oven],
        ["Refrigerator",    draftFd.refrigerator],
        ["Blinds",          draftFd.blinds],
        ["Windows Inside",  draftFd.windowsInside],
        ["Windows Outside", draftFd.windowsOutside],
      ] as [string, unknown][])
        .filter(([, v]) => v !== undefined && Number(v) > 0)
        .map(([k, v]) => [k, Number(v)])
    : [];

  // extras is stored as { baseboard: true, patio: false, … } — convert to label array
  const draftExtras: string[] = f?.status === "Draft" && f?.serviceType === "Residential"
    ? (() => {
        const raw = draftFd.extras;
        if (Array.isArray(raw)) return raw as string[];
        if (typeof raw === "object" && raw !== null) {
          return Object.entries(raw as Record<string, boolean>)
            .filter(([, v]) => v === true)
            .map(([k]) =>
              k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()),
            );
        }
        return [];
      })()
    : [];

  const draftCommercialRows: [string, string][] = f?.status === "Draft" && f?.serviceType === "Commercial"
    ? ([
        ["Property Type", draftFd.isOtherProperty ? draftFd.otherPropertyType : draftFd.propertyType],
        ["Property Size",  draftFd.propertySize ? `${draftFd.propertySize} sq ft` : null],
        ["Frequency",      draftFd.serviceType],
        ["Recurring",      draftFd.recurringFrequency],
        ["Employees",      draftFd.employeeCount && Number(draftFd.employeeCount) > 0 ? String(draftFd.employeeCount) : null],
        ["Hourly Rate",    draftFd.hourlyRate ? `$${draftFd.hourlyRate}/hr` : null],
      ] as [string, unknown][])
        .filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== 0)
        .map(([k, v]) => [k as string, String(v)])
    : [];

  // ── Render ───────────────────────────────────────────────────────────────────

  const statusColor = f ? getStatusColor(f.status) : "";
  const statusBg    = f ? getStatusBg(f.status)    : "";

  const footer = f ? (
    <PanelFooter
      status={f.status}
      isSending={isSending}
      isSendingSMS={isSendingSMS}
      isGeneratingLink={isGeneratingLink}
      isDownloadingPDF={isDownloadingPDF}
      isAlreadyInRoute={isAlreadyInRoute}
      isAddingToRoute={isAddingToRoute}
      hasPhone={!!estimate?.phone}
      hasJobConversion={!!estimate?.job_id}
      isConvertingToJob={isConvertingToJob}
      onAccept={() => setIsAcceptDialogOpen(true)}
      onDecline={handleDecline}
      onSendEmail={handleSendEmail}
      onSendSMS={handleSendSMS}
      onEdit={handleEdit}
      onShare={handleShare}
      onDownloadPDF={handleDownloadPDF}
      onConvert={handleConvertToInvoice}
      onConvertToJob={handleConvertToJob}
      onAddToRoute={handleAddToRoute}
      onCancel={() => setIsCancelDialogOpen(true)}
      onDelete={() => setIsDeleteOpen(true)}
      onDeleteDraft={() => setIsDeleteDraftOpen(true)}
      onContinueDraft={handleContinueDraft}
      onEditAndSend={handleEditAndSend}
    />
  ) : undefined;

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={f?.estimateNumber ?? "Loading…"}
        badge={f ? { label: f.status, color: statusColor, bg: statusBg } : undefined}
        footer={footer}
      >
        {/* ── Loading ────────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">Loading estimate...</p>
          </div>
        )}

        {/* ── Not found ─────────────────────────────────────────────────────── */}
        {!loading && !f && (
          <div className="flex flex-col items-center justify-center h-40 gap-3 px-6">
            <p className="text-sm text-muted-foreground">Estimate not found.</p>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}

        {/* ── Content ───────────────────────────────────────────────────────── */}
        {!loading && f && (
          <div className="p-4 space-y-3">

            {/* ── DRAFT branch ─────────────────────────────────────────────── */}
            {f.status === "Draft" ? (
              <>
                {/* Client info */}
                <Card className="border border-border/50">
                  <CardContent className="p-4">
                    {draftClientInfo ? (
                      <>
                        <h3 className="text-base font-semibold mb-3">{draftClientInfo.name}</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm">{formatPhone(draftClientInfo.phone)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm">{draftClientInfo.email}</span>
                          </div>
                          <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                            <span className="text-sm">
                              {draftClientInfo.address}<br />
                              {draftClientInfo.city}, {draftClientInfo.state} {draftClientInfo.zip}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No client selected yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* Service details + progress */}
                <Card className="border border-border/50">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3">Service Details</h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Service Type</p>
                          <p className="text-sm font-medium">{f.serviceType}</p>
                        </div>
                      </div>
                      {!!(draftFd.selectedService || draftFd.propertyType) && (
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {f.serviceType === "Residential" ? "Service" : "Property Type"}
                            </p>
                            <p className="text-sm font-medium">
                              {f.serviceType === "Residential"
                                ? String(draftFd.selectedService)
                                : String(draftFd.isOtherProperty ? draftFd.otherPropertyType : draftFd.propertyType)}
                            </p>
                          </div>
                        </div>
                      )}
                      {!!draftFd.squareFootage && (
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Square Footage</p>
                            <p className="text-sm font-medium">{String(draftFd.squareFootage)} sq ft</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Draft Progress</p>
                          <p className="text-sm font-medium">{draftStepProgress}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Residential: Rooms */}
                {f.serviceType === "Residential" && draftRooms.length > 0 && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Rooms Breakdown</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {draftRooms.map(([label, value], i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-secondary/30 rounded-md">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <span className="text-sm font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Residential: Additional services */}
                {f.serviceType === "Residential" && draftAdditional.length > 0 && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Additional Services</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {draftAdditional.map(([label, value], i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-secondary/30 rounded-md">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <span className="text-sm font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Residential: Extra services */}
                {f.serviceType === "Residential" && draftExtras.length > 0 && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Extra Services</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {draftExtras.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-md">
                            <span className="text-xs text-muted-foreground flex-1">{item}</span>
                            <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--green-vibrant))" }} />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Residential: Pets & Laundry (from draftFd) */}
                {f.serviceType === "Residential" && (
                  (draftFd.pets && draftFd.pets !== "No" && draftFd.pets !== "No pets") ||
                  (draftFd.laundryService && draftFd.laundryService !== null)
                ) && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Additional Info</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {!!(draftFd.pets && draftFd.pets !== "No" && draftFd.pets !== "No pets") && (
                          <div className="p-2 bg-secondary/30 rounded-md">
                            <p className="text-xs text-muted-foreground mb-1">Pets</p>
                            <span className="text-sm font-semibold">{String(draftFd.pets)}</span>
                          </div>
                        )}
                        {!!(draftFd.laundryService) && (
                          <div className="p-2 bg-secondary/30 rounded-md">
                            <p className="text-xs text-muted-foreground mb-1">Laundry</p>
                            <span className="text-sm font-semibold">{String(draftFd.laundryService)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Commercial: Property details */}
                {f.serviceType === "Commercial" && draftCommercialRows.length > 0 && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Property Details</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {draftCommercialRows.map(([label, value], i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-secondary/30 rounded-md">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <span className="text-sm font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Scope */}
                {(draftFd.scope || draftFd.scopeDetails) && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Service Scope</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {String(draftFd.scope ?? draftFd.scopeDetails)}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <>
                {/* ── NON-DRAFT branch ──────────────────────────────────────── */}

                {/* Client info */}
                <Card className="border border-border/50">
                  <CardContent className="p-4">
                    <h3 className="text-base font-semibold mb-3">{f.clientName}</h3>
                    <div className="space-y-2">
                      {f.companyName && (
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm">{f.companyName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm">{formatPhone(f.phone)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm">{f.email}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 shrink-0 text-muted-foreground mt-0.5" />
                        <span className="text-sm">
                          {f.address}{f.apt && `, ${f.apt}`}<br />
                          {f.city}, {f.state} {f.zip}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Converted To — same card pattern as Request & Walkthrough panels */}
                {(f.status === "Converted" || f.status === "Invoiced") && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Converted To
                      </p>
                      {(estimate as any)?.job_id ? (
                        <button
                          type="button"
                          onClick={() => { onClose(); navigate("/jobs", { state: { openId: (estimate as any).job_id } }); }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors text-left"
                        >
                          <div className="p-2 rounded bg-blue-500/10 flex-shrink-0">
                            <Briefcase className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Job</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {f.serviceType}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                      ) : (
                        <p className="text-sm text-muted-foreground">The linked job was deleted.</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Total Amount + Net Profit */}
                <Card className="border border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-3xl font-bold mb-3" style={{ color: statusColor }}>
                      ${f.total.toFixed(2)}
                    </p>
                    <div
                      className="flex justify-between items-center p-3 rounded-lg"
                      style={{ backgroundColor: "hsl(var(--green-vibrant) / 0.05)" }}
                    >
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" style={{ color: "hsl(var(--green-vibrant))" }} />
                        <span className="text-sm font-semibold" style={{ color: "hsl(var(--green-vibrant))" }}>
                          Net Profit
                        </span>
                      </div>
                      <span className="text-lg font-bold" style={{ color: "hsl(var(--green-vibrant))" }}>
                        ${(f.total - (estimate.total_operation_cost ?? f.total * 0.60)).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Service Details */}
                <Card className="border border-border/50">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3">Service Details</h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 shrink-0 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Service Type</p>
                          <p className="text-sm font-medium">{f.serviceType}</p>
                        </div>
                      </div>
                      {f.serviceSubType && (
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 shrink-0 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">Sub Type</p>
                            <p className="text-sm font-medium">{f.serviceSubType}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 shrink-0 text-purple-vibrant" />
                        <div>
                          <p className="text-xs text-muted-foreground">Estimate Date</p>
                          <p className="text-sm font-medium">{f.estimateDate}</p>
                        </div>
                      </div>
                      {f.status === "Pending" && (
                        <div className="flex items-center gap-3">
                          {estimate.viewed_at
                            ? <Eye    className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--green-vibrant))" }} />
                            : <EyeOff className="w-4 h-4 shrink-0 text-muted-foreground" />}
                          <div>
                            <p className="text-xs text-muted-foreground">Client View Status</p>
                            <p className="text-sm font-medium" style={{ color: estimate.viewed_at ? "hsl(var(--green-vibrant))" : "hsl(var(--muted-foreground))" }}>
                              {estimate.viewed_at ? "Viewed" : "Not viewed yet"}
                            </p>
                            {estimate.viewed_at && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(estimate.viewed_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Operation Cost Breakdown */}
                <Card className="border border-border/50">
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold mb-3">Operation Cost Breakdown</h4>
                    <div className="space-y-2.5">
                      {[
                        { Icon: Users,      label: "Labor Cost",           val: estimate.labor_cost    ?? f.total * 0.45 },
                        { Icon: Box,        label: "Supplies & Materials",  val: estimate.supplies_cost ?? f.total * 0.05 },
                        { Icon: TrendingUp, label: "Overhead",              val: estimate.overhead_cost ?? f.total * 0.10 },
                      ].map(({ Icon, label, val }) => (
                        <div key={label} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-primary" />
                            <span className="text-sm text-muted-foreground">{label}</span>
                          </div>
                          <span className="text-sm font-semibold">${val.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t border-border/50 pt-2.5 flex justify-between items-center">
                        <span className="text-sm font-semibold">Total Operating Cost</span>
                        <span className="text-sm font-bold">
                          ${(estimate.total_operation_cost ?? f.total * 0.60).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Rooms Breakdown */}
                {f.serviceType === "Residential" && Object.values(f.mainData).some((v) => Number(v) > 0) && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Rooms Breakdown</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(f.mainData).map(([key, value], i) => {
                          const n = Number(value);
                          return n > 0 ? (
                            <div key={i} className="flex justify-between items-center p-2 bg-secondary/30 rounded-md">
                              <span className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                              <span className="text-sm font-semibold">{n}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Items */}
                {Object.values(f.additionalData).some((v) => Number(v) > 0) && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Additional Items</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(f.additionalData).map(([key, value], i) => {
                          const n = Number(value);
                          return n > 0 ? (
                            <div key={i} className="flex justify-between items-center p-2 bg-secondary/30 rounded-md">
                              <span className="text-xs text-muted-foreground capitalize">{key}</span>
                              <span className="text-sm font-semibold">{n}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pets & Laundry */}
                {((f.pets && f.pets !== "No" && f.pets !== "No pets") || (f.laundry && f.laundry !== "No")) && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Additional Info</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {f.pets && f.pets !== "No" && f.pets !== "No pets" && (
                          <div className="p-2 bg-secondary/30 rounded-md">
                            <p className="text-xs text-muted-foreground mb-1">Pets</p>
                            <span className="text-sm font-semibold">{f.pets}</span>
                          </div>
                        )}
                        {f.laundry && f.laundry !== "No" && (
                          <div className="p-2 bg-secondary/30 rounded-md">
                            <p className="text-xs text-muted-foreground mb-1">Laundry</p>
                            <span className="text-sm font-semibold">{f.laundry}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Service Scope */}
                {f.serviceScope && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Service Scope</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.serviceScope}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Extra Services */}
                {Object.values(f.extraServices).some(Boolean) && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Extra Services</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(f.extraServices).map(([key, value], i) =>
                          value ? (
                            <div key={i} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-md">
                              <span className="text-xs text-muted-foreground flex-1 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                              <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--green-vibrant))" }} />
                            </div>
                          ) : null
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Discount */}
                {f.discountType && f.discountValue && (
                  <Card className="border border-border/50">
                    <CardContent className="p-4">
                      <h4 className="text-sm font-semibold mb-3">Discount Applied</h4>
                      <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-md">
                        <span className="text-sm font-semibold">Discount</span>
                        <span className="text-sm font-bold text-destructive">
                          {f.discountType === "percentage" ? `${f.discountValue}% off` : `-$${Number(f.discountValue).toFixed(2)}`}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ── Timeline ────────────────────────────────────────────── */}
            {estimate && (
              <div className="pt-2 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timeline</p>
                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(estimate.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
                {estimate.updated_at !== estimate.created_at && (
                  <p className="text-xs text-muted-foreground">
                    Updated {format(new Date(estimate.updated_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </SidePanel>

      {/* ── Accept confirmation ──────────────────────────────────────────────── */}
      <AlertDialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--green-vibrant) / 0.1)" }}>
                <CheckCircle className="w-8 h-8" style={{ color: "hsl(var(--green-vibrant))" }} />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Accept Estimate?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              This will mark the estimate as accepted. The client will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept} style={{ backgroundColor: "hsl(var(--green-vibrant))", color: "white" }}>
              Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Cancel confirmation ──────────────────────────────────────────────── */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this estimate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Estimate</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Estimate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete estimate confirmation ─────────────────────────────────────── */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Estimate?</AlertDialogTitle>
            <AlertDialogDescription>
              This estimate will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete draft confirmation ────────────────────────────────────────── */}
      <AlertDialog open={isDeleteDraftOpen} onOpenChange={setIsDeleteDraftOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This draft will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDraft}
              disabled={isDeletingDraft}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingDraft ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Email success ────────────────────────────────────────────────────── */}
      <AlertDialog open={isEmailSuccessOpen} onOpenChange={setIsEmailSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--green-vibrant) / 0.1)" }}>
                <CheckCircle className="w-8 h-8" style={{ color: "hsl(var(--green-vibrant))" }} />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Email Sent!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              The estimate has been sent to {estimate?.email}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogAction onClick={() => { setIsEmailSuccessOpen(false); qc.invalidateQueries({ queryKey: QK.activities }); }}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
