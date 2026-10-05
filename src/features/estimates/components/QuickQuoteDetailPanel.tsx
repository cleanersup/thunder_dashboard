/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module QuickQuoteDetailPanel
 * Panel de detalle de un quick quote.
 *
 * Panel aparte del de estimates porque son entidades distintas: `quick_quotes`
 * no tiene cliente, dirección ni propiedad. Convertir a job o invoice exige
 * antes completar el cliente.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Mail, Phone, User, Zap, Edit, Trash2, Briefcase, CheckCircle,
  MoreHorizontal, X, Send, Clock, FileText, MessageSquare, Share, Download, ThumbsDown,
  ChevronRight, DollarSign, Calendar, Users, Box, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { SidePanel } from "@/shared/components/common/SidePanel";
import { formatDisplayDateTime, formatDateOnly, formatCurrency } from "@/shared/utils/formatters";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { QK } from "@/shared/config/queryKeys";
import { useProfile } from "@/shared/hooks/useProfile";
import { PDFService } from "@/shared/services/pdf.service";
import { useQuickQuote, useUpdateQuickQuoteStatus, useDeleteQuickQuote } from "../hooks/useQuickQuotes";
import { convertQuickQuoteToJob, convertQuickQuoteToInvoice, sendQuickQuoteEmail, sendQuickQuoteSMS, buildQuickQuotePublicUrl } from "../services/quickQuoteService";
import type { QuickQuoteRow } from "../types/quickQuote.types";
import { additionalItemEntries } from "../utils/additionalData";
import { supabase } from "@/integrations/supabase/client";
import {
  CompleteQuickQuoteClientDialog, type QuickQuoteJobOverrides,
} from "./CompleteQuickQuoteClientDialog";

// ─── Colores de status ────────────────────────────────────────────────────────
// Mismo lenguaje que la lista de estimates: el dueño no debería tener que
// aprender dos códigos de color.

function statusColors(status: string): { color: string; bg: string } {
  switch (status) {
    case "Draft":     return { color: "hsl(45 93% 40%)",  bg: "hsl(45 93% 40% / 0.15)" };
    case "Accepted":  return { color: "hsl(var(--green-vibrant))", bg: "hsl(var(--green-vibrant) / 0.15)" };
    case "Invoiced":
    case "Converted": return { color: "hsl(270 70% 50%)", bg: "hsl(270 70% 50% / 0.15)" };
    case "Canceled":
    case "Declined":  return { color: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.12)" };
    default:          return { color: "hsl(var(--orange-vibrant))", bg: "hsl(var(--orange-vibrant) / 0.12)" };
  }
}

interface Props {
  open:      boolean;
  onClose:   () => void;
  quoteId:   string | null;
  /** Abre el formulario para reenviar o corregir el quote. */
  onEdit?:   (quoteId: string) => void;
  /** Abre el picker Job/Invoice al entrar (desde la tabla). */
  openConvert?: boolean;
}

function InfoRow({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
      <span className="text-sm">{children}</span>
    </div>
  );
}

export function QuickQuoteDetailPanel({ open, onClose, quoteId, onEdit, openConvert }: Props) {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { data: fetchedQuote, isLoading } = useQuickQuote(open ? quoteId : null);
  const { data: profile } = useProfile();
  const updateStatus = useUpdateQuickQuoteStatus();
  const deleteQuote  = useDeleteQuickQuote();
  // Igual que EstimateDetailPanel: el badge y el footer leen estado local para
  // que Accept/Decline/Cancel se vean al instante, sin esperar un refetch.
  const [quote, setQuote] = useState<QuickQuoteRow | null>(null);

  const [isConverting,      setIsConverting]      = useState(false);
  const [convertTarget,     setConvertTarget]     = useState<"job" | "invoice" | null>(null);
  const [convertOpen,       setConvertOpen]       = useState(false);
  const [isDeleteOpen,      setIsDeleteOpen]      = useState(false);
  const [isAcceptOpen,      setIsAcceptOpen]      = useState(false);
  const [isCancelOpen,      setIsCancelOpen]      = useState(false);
  const [isSending,         setIsSending]         = useState(false);
  const [isSendingSMS,      setIsSendingSMS]      = useState(false);
  const [isGeneratingLink,  setIsGeneratingLink]  = useState(false);
  const [isDownloadingPDF,  setIsDownloadingPDF]  = useState(false);

  useEffect(() => {
    if (!open) {
      setQuote(null);
      setConvertOpen(false);
      return;
    }
    if (fetchedQuote && fetchedQuote.id === quoteId) {
      setQuote((prev) => {
        if (!prev || prev.id !== fetchedQuote.id) return fetchedQuote;
        const local = prev.status;
        const remote = fetchedQuote.status;
        if (
          (local === "Accepted" || local === "Declined" || local === "Canceled") &&
          (remote === "Pending" || remote === "Viewed" || remote === "Sent")
        ) {
          return { ...fetchedQuote, status: local };
        }
        return fetchedQuote;
      });
    }
  }, [open, fetchedQuote, quoteId]);

  useEffect(() => {
    if (open && openConvert && quote?.status === "Accepted") setConvertOpen(true);
  }, [open, openConvert, quote?.status]);

  // El status puede cambiar desde el backend (`Sent` al enviar, `Viewed` cuando
  // el destinatario abre el link) o desde Accept en este panel. Igual que estimates:
  // realtime sobre la fila abierta actualiza el badge sin recargar.
  useEffect(() => {
    if (!open || !quoteId) return;
    const channel = supabase
      .channel(`quick-quote-panel-${quoteId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quick_quotes", filter: `id=eq.${quoteId}` },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          setQuote((prev) => (prev ? { ...prev, ...n } as QuickQuoteRow : prev));
          qc.setQueryData(QK.quickQuote(quoteId), (prev: unknown) => {
            if (!prev || typeof prev !== "object") return prev;
            return { ...prev, ...n };
          });
          qc.invalidateQueries({ queryKey: QK.quickQuotes });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, quoteId, qc]);

  async function handleMarkAccepted() {
    if (!quote) return;
    await updateStatus.mutateAsync({ id: quote.id, status: "Accepted" });
    setQuote({ ...quote, status: "Accepted" });
    setIsAcceptOpen(false);
    toast.success("Quick quote accepted");
  }

  async function handleDecline() {
    if (!quote) return;
    await updateStatus.mutateAsync({ id: quote.id, status: "Declined" });
    setQuote({ ...quote, status: "Declined" });
    toast.success("Quick quote declined");
  }

  async function handleCancel() {
    if (!quote) return;
    await updateStatus.mutateAsync({ id: quote.id, status: "Canceled" });
    setQuote({ ...quote, status: "Canceled" });
    setIsCancelOpen(false);
    toast.success("Quick quote canceled");
  }

  async function handleSendEmail() {
    if (!quote?.recipient_email) return;
    setIsSending(true);
    try {
      await sendQuickQuoteEmail({
        quickQuoteId:   quote.id,
        recipientEmail: quote.recipient_email,
        recipientName:  quote.recipient_name ?? undefined,
        isUpdate:       true,
      });
      toast.success("Reminder sent by email");
      qc.invalidateQueries({ queryKey: QK.quickQuote(quote.id) });
      qc.invalidateQueries({ queryKey: QK.quickQuotes });
    } catch {
      toast.error("Failed to send email");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSendSMS() {
    if (!quote?.recipient_phone) return;
    setIsSendingSMS(true);
    try {
      await sendQuickQuoteSMS({
        quickQuoteId:  quote.id,
        phoneNumber:   quote.recipient_phone,
        recipientName: quote.recipient_name ?? undefined,
        quoteTotal:    quote.total,
        isUpdate:      true,
      });
      toast.success("Reminder sent by SMS");
      qc.invalidateQueries({ queryKey: QK.quickQuote(quote.id) });
      qc.invalidateQueries({ queryKey: QK.quickQuotes });
    } catch {
      toast.error("Failed to send SMS");
    } finally {
      setIsSendingSMS(false);
    }
  }

  async function handleShare() {
    if (!quote) return;
    setIsGeneratingLink(true);
    try {
      await navigator.clipboard.writeText(buildQuickQuotePublicUrl(quote));
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    } finally {
      setIsGeneratingLink(false);
    }
  }

  async function handleDownloadPDF() {
    if (!quote || !profile) { toast.error("Missing data to generate PDF"); return; }
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
        clientName:     quote.recipient_name    ?? "",
        clientPhone:    quote.recipient_phone   ?? "",
        clientEmail:    quote.recipient_email   ?? "",
        clientAddress:  "",
        clientCity:     "",
        clientState:    "",
        clientZip:      "",
        estimateNumber: quote.id.substring(0, 8).toUpperCase(),
        estimateDate:   formatDateOnly(quote.quote_date, "MMMM dd, yyyy"),
        documentTitle:  "PROFESSIONAL CLEANING QUOTE",
        numberLabel:    "Quote #",
        serviceType:    quote.service_type,
        serviceSubType: quote.service_sub_type ?? undefined,
        serviceScope:   quote.service_scope   ?? undefined,
        mainData:       (quote.main_data       as Record<string, any>) ?? undefined,
        additionalData: (quote.additional_data as Record<string, any>) ?? undefined,
        extraServices:  (quote.extra_services  as Record<string, boolean>) ?? undefined,
        subtotal:       quote.subtotal,
        discountType:   quote.discount_type   ?? undefined,
        discountValue:  quote.discount_value  ?? undefined,
        total:          quote.total,
      });
      const name = (quote.recipient_name || "quote").replace(/\s+/g, "_");
      doc.save(`Quote_${quote.id.substring(0, 8).toUpperCase()}_${name}.pdf`);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloadingPDF(false);
    }
  }

  async function handleDelete() {
    if (!quote) return;
    try {
      await deleteQuote.mutateAsync(quote.id);
      toast.success("Quick quote deleted");
      onClose();
    } catch {
      toast.error("Failed to delete quick quote");
    } finally {
      setIsDeleteOpen(false);
    }
  }

  /** Crea el job o la invoice con el cliente que el panel acaba de resolver. */
  async function handleConvert(overrides: QuickQuoteJobOverrides) {
    if (!quote || !convertTarget) return;
    if (quote.status !== "Accepted") {
      toast.error("Quote must be accepted before converting");
      return;
    }
    const target = convertTarget;
    setIsConverting(true);
    try {
      if (target === "job") {
        const jobId = await convertQuickQuoteToJob({
          quickQuoteId: quote.id,
          jobOverrides: overrides as unknown as Record<string, unknown>,
        });
        qc.invalidateQueries({ queryKey: QK.jobs });
        qc.invalidateQueries({ queryKey: QK.quickQuotes });
        qc.invalidateQueries({ queryKey: QK.quickQuote(quote.id) });
        qc.invalidateQueries({ queryKey: QK.clients });
        setConvertTarget(null);
        onClose();
        toast.success("Job created from quick quote");
        navigate("/jobs", { state: { openEditJobId: jobId } });
        return;
      }

      const invoiceId = await convertQuickQuoteToInvoice({
        quickQuoteId: quote.id,
        client: {
          name:   overrides.client_name,
          email:  overrides.client_email ?? "",
          phone:  overrides.client_phone ?? "",
          street: overrides.property_street,
          apt:    overrides.property_apt ?? "",
          city:   overrides.property_city,
          state:  overrides.property_state,
          zip:    overrides.property_zip,
        },
      });
      qc.invalidateQueries({ queryKey: QK.invoices });
      qc.invalidateQueries({ queryKey: QK.quickQuotes });
      qc.invalidateQueries({ queryKey: QK.quickQuote(quote.id) });
      qc.invalidateQueries({ queryKey: QK.clients });
      setConvertTarget(null);
      onClose();
      toast.success("Invoice created from quick quote");
      navigate("/invoices", { state: { openEditId: invoiceId } });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to convert quick quote");
    } finally {
      setIsConverting(false);
    }
  }

  const status = quote?.status ?? "";
  const colors = statusColors(status);
  const isAccepted  = status === "Accepted";
  const isAwaiting  = status === "Pending" || status === "Viewed" || status === "Sent";
  const isDraft     = status === "Draft";
  const isConverted = !!quote?.job_id;
  const isInvoiced  = !!quote?.invoice_id;
  const hasEmail    = !!quote?.recipient_email;
  const hasPhone    = !!quote?.recipient_phone;

  // Costos internos. Cuando la fila no los trae se estiman sobre el total con
  // los mismos porcentajes que swift-slate (45/5/10, 60 en total): el dueño ve
  // la misma cifra en el móvil y en el dashboard.
  const total        = quote?.total ?? 0;
  const laborCost    = quote?.labor_cost           ?? total * 0.45;
  const suppliesCost = quote?.supplies_cost        ?? total * 0.05;
  const overheadCost = quote?.overhead_cost        ?? total * 0.10;
  const operationCost = quote?.total_operation_cost ?? total * 0.60;

  const roomEntries = Object.entries(quote?.main_data ?? {})
    .map(([key, value]) => [key, Number(value)] as [string, number])
    .filter(([, value]) => value > 0);
  const additionalItems = additionalItemEntries(quote?.additional_data);
  const extraServices   = Object.entries(quote?.extra_services ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);

  const showPets     = !!quote?.pets    && quote.pets !== "No"    && quote.pets !== "No pets";
  const showLaundry  = !!quote?.laundry && quote.laundry !== "No";
  const hasDiscount  = !!quote?.discount_type && !!quote?.discount_value;

  const awaitingMenu = quote ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="px-2.5">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => { onClose(); onEdit?.(quote.id); }}>
          <Edit className="w-4 h-4 mr-2" /> Edit
        </DropdownMenuItem>
        {hasEmail && (
          <DropdownMenuItem onClick={handleSendEmail} disabled={isSending}>
            <Mail className="w-4 h-4 mr-2" /> {isSending ? "Sending…" : "Send reminder by email"}
          </DropdownMenuItem>
        )}
        {hasPhone && (
          <DropdownMenuItem onClick={handleSendSMS} disabled={isSendingSMS}>
            <MessageSquare className="w-4 h-4 mr-2" /> {isSendingSMS ? "Sending…" : "Send reminder by SMS"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleShare} disabled={isGeneratingLink}>
          <Share className="w-4 h-4 mr-2" /> {isGeneratingLink ? "Generating…" : "Share"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadPDF} disabled={isDownloadingPDF}>
          <Download className="w-4 h-4 mr-2" /> {isDownloadingPDF ? "Downloading…" : "Download PDF"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDecline}>
          <ThumbsDown className="w-4 h-4 mr-2 text-orange-500" /> Decline
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setIsCancelOpen(true)}>
          <X className="w-4 h-4 mr-2" /> Cancel Quote
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const acceptedMenu = quote ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="px-2.5">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleDownloadPDF} disabled={isDownloadingPDF}>
          <Download className="w-4 h-4 mr-2" /> {isDownloadingPDF ? "Downloading…" : "Download PDF"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare} disabled={isGeneratingLink}>
          <Share className="w-4 h-4 mr-2" /> {isGeneratingLink ? "Generating…" : "Share"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  /** Convertido a job y/o invoice: ya no hay nada que decidir, pero el quote se
   *  sigue pudiendo abrir, descargar y compartir — igual que en swift-slate. */
  const convertedMenu = quote ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="px-2.5">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {quote.job_id && (
          <DropdownMenuItem onClick={() => { onClose(); navigate("/jobs", { state: { openId: quote.job_id } }); }}>
            <Briefcase className="w-4 h-4 mr-2" /> View Job
          </DropdownMenuItem>
        )}
        {quote.invoice_id && (
          <DropdownMenuItem onClick={() => { onClose(); navigate("/invoices", { state: { openId: quote.invoice_id } }); }}>
            <FileText className="w-4 h-4 mr-2" /> View Invoice
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDownloadPDF} disabled={isDownloadingPDF}>
          <Download className="w-4 h-4 mr-2" /> {isDownloadingPDF ? "Downloading…" : "Download PDF"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare} disabled={isGeneratingLink}>
          <Share className="w-4 h-4 mr-2" /> {isGeneratingLink ? "Generating…" : "Share"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  const isTerminalConverted = status === "Converted" || status === "Invoiced" || (isConverted && isInvoiced);

  const footer = !quote ? undefined : isTerminalConverted ? (
    <div className="flex items-center justify-end">{convertedMenu}</div>
  ) : isDraft ? (
    <div className="flex items-center gap-2">
      <Button size="sm" className="flex-1" onClick={() => { onClose(); onEdit?.(quote.id); }}>
        <Edit className="w-4 h-4 mr-1.5" /> Continue
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="px-2.5">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete Draft
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : isAwaiting ? (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        className="flex-1"
        style={{ backgroundColor: "hsl(var(--green-vibrant))", color: "white" }}
        onClick={() => setIsAcceptOpen(true)}
      >
        <CheckCircle className="w-4 h-4 mr-1.5" /> Mark as Accepted
      </Button>
      {awaitingMenu}
    </div>
  ) : isAccepted ? (
    <div className="flex items-center gap-2">
      {!isConverted && (
        <Button
          size="sm"
          className="flex-1"
          style={{ backgroundColor: "hsl(var(--green-vibrant))", color: "white" }}
          onClick={() => setConvertTarget("job")}
          disabled={isConverting}
        >
          <Briefcase className="w-4 h-4 mr-1.5" />
          {isConverting && convertTarget === "job" ? "Converting…" : "Convert to Job"}
        </Button>
      )}
      {!isInvoiced && (
        <Button
          size="sm"
          className="flex-1"
          style={{ backgroundColor: "#202B3D", color: "white" }}
          onClick={() => setConvertTarget("invoice")}
          disabled={isConverting}
        >
          <FileText className="w-4 h-4 mr-1.5" />
          {isConverting && convertTarget === "invoice" ? "Converting…" : "Convert to Invoice"}
        </Button>
      )}
      {acceptedMenu}
    </div>
  ) : status === "Declined" ? (
    <div className="flex items-center gap-2">
      <Button size="sm" className="flex-1" onClick={() => { onClose(); onEdit?.(quote.id); }}>
        <Edit className="w-4 h-4 mr-1.5" /> Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="px-2.5">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setIsCancelOpen(true)}>
            <X className="w-4 h-4 mr-2" /> Cancel Quote
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="px-2.5">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete Quote
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={quote ? `QQ-${quote.id.slice(0, 6)}` : "Loading…"}
        badge={quote ? { label: status, color: colors.color, bg: colors.bg } : undefined}
        footer={footer}
      >
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">Loading quick quote...</p>
          </div>
        )}

        {!isLoading && !quote && (
          <div className="flex flex-col items-center justify-center h-40 gap-3 px-6">
            <p className="text-sm text-muted-foreground">Quick quote not found.</p>
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          </div>
        )}

        {!isLoading && quote && (
          <div className="p-4 space-y-3">
            {/* Destinatario — no hay cliente ni dirección: eso es lo que define
                un quick quote y por eso se dice explícitamente. */}
            <Card className="border border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-semibold">
                    {quote.recipient_name || "No recipient yet"}
                  </h3>
                </div>
                <div className="space-y-2">
                  {!!quote.recipient_email && <InfoRow icon={Mail}>{quote.recipient_email}</InfoRow>}
                  {!!quote.recipient_phone && (
                    <InfoRow icon={Phone}>{formatPhoneDisplay(quote.recipient_phone)}</InfoRow>
                  )}
                  <InfoRow icon={User}>
                    <span className="text-muted-foreground">
                      No client record — created when you convert this to a job or invoice
                    </span>
                  </InfoRow>
                </div>
              </CardContent>
            </Card>

            {/* Converted To — same card pattern as EstimateDetailPanel */}
            {(status === "Converted" || status === "Invoiced" || quote.job_id || quote.invoice_id) && (
              <Card className="border border-border/50">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Converted To
                  </p>
                  {quote.job_id ? (
                    <button
                      type="button"
                      onClick={() => { onClose(); navigate("/jobs", { state: { openId: quote.job_id } }); }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="p-2 rounded bg-blue-500/10 flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Job</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {quote.service_sub_type || quote.service_type}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ) : null}
                  {quote.invoice_id ? (
                    <button
                      type="button"
                      onClick={() => { onClose(); navigate("/invoices", { state: { openId: quote.invoice_id } }); }}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors text-left"
                    >
                      <div className="p-2 rounded bg-green-500/10 flex-shrink-0">
                        <FileText className="w-4 h-4 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Invoice</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {quote.service_sub_type || quote.service_type}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ) : null}
                  {!quote.job_id && !quote.invoice_id && (
                    <p className="text-sm text-muted-foreground">The linked job was deleted.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Envío y seguimiento */}
            <Card className="border border-border/50">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Delivery
                </p>
                {quote.sent_at ? (
                  <InfoRow icon={Send}>
                    Sent by {quote.last_sent_channel === "sms" ? "SMS" : "email"} ·{" "}
                    {formatDisplayDateTime(quote.sent_at)}
                  </InfoRow>
                ) : (
                  <InfoRow icon={Send}>
                    <span className="text-muted-foreground">Not sent yet</span>
                  </InfoRow>
                )}
                <InfoRow icon={Clock}>
                  {quote.viewed_at
                    ? `Viewed ${formatDisplayDateTime(quote.viewed_at)}`
                    : <span className="text-muted-foreground">Not viewed yet</span>}
                </InfoRow>
              </CardContent>
            </Card>

            {/* Total y beneficio — mismo bloque que EstimateDetailPanel: el
                desglose interno es lo primero que el dueño mira. */}
            <Card className="border border-border/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                <p className="text-3xl font-bold mb-3" style={{ color: colors.color }}>
                  ${formatCurrency(quote.total)}
                </p>
                {hasDiscount && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Subtotal ${formatCurrency(quote.subtotal)}
                  </p>
                )}
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
                    ${formatCurrency(quote.total - operationCost)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Servicio */}
            <Card className="border border-border/50">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-3">Service Details</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Service Type</p>
                      <p className="text-sm font-medium capitalize">{quote.service_type}</p>
                    </div>
                  </div>
                  {!!quote.service_sub_type && (
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Sub Type</p>
                        <p className="text-sm font-medium">{quote.service_sub_type}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 shrink-0 text-purple-vibrant" />
                    <div>
                      <p className="text-xs text-muted-foreground">Quote Date</p>
                      <p className="text-sm font-medium">
                        {formatDateOnly(quote.quote_date, "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Costos internos — nunca viajan al destinatario, solo se ven aquí. */}
            <Card className="border border-border/50">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-3">Operation Cost Breakdown</h4>
                <div className="space-y-2.5">
                  {[
                    { Icon: Users,      label: "Labor Cost",           val: laborCost },
                    { Icon: Box,        label: "Supplies & Materials", val: suppliesCost },
                    { Icon: TrendingUp, label: "Overhead",             val: overheadCost },
                  ].map(({ Icon, label, val }) => (
                    <div key={label} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">{label}</span>
                      </div>
                      <span className="text-sm font-semibold">${formatCurrency(val)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border/50 pt-2.5 flex justify-between items-center">
                    <span className="text-sm font-semibold">Total Operating Cost</span>
                    <span className="text-sm font-bold">${formatCurrency(operationCost)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conteos del formulario */}
            {roomEntries.length > 0 && (
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Rooms Breakdown</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {roomEntries.map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-secondary/30 rounded-md">
                        <span className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="text-sm font-semibold">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {additionalItems.length > 0 && (
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Additional Items</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {additionalItems.map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-2 bg-secondary/30 rounded-md">
                        <span className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="text-sm font-semibold">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {(showPets || showLaundry) && (
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Additional Info</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {showPets && (
                      <div className="p-2 bg-secondary/30 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Pets</p>
                        <span className="text-sm font-semibold">{quote.pets}</span>
                      </div>
                    )}
                    {showLaundry && (
                      <div className="p-2 bg-secondary/30 rounded-md">
                        <p className="text-xs text-muted-foreground mb-1">Laundry</p>
                        <span className="text-sm font-semibold">{quote.laundry}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!!quote.service_scope && (
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Service Scope</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{quote.service_scope}</p>
                </CardContent>
              </Card>
            )}

            {extraServices.length > 0 && (
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Extra Services</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {extraServices.map((key) => (
                      <div key={key} className="flex items-center gap-2 p-2 bg-secondary/30 rounded-md">
                        <span className="text-xs text-muted-foreground flex-1 capitalize">
                          {key.replace(/([A-Z])/g, " $1")}
                        </span>
                        <CheckCircle className="w-4 h-4 shrink-0" style={{ color: "hsl(var(--green-vibrant))" }} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {hasDiscount && (
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3">Discount Applied</h4>
                  <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-md">
                    <span className="text-sm font-semibold">Discount</span>
                    <span className="text-sm font-bold text-destructive">
                      {quote.discount_type === "percentage"
                        ? `${quote.discount_value}% off`
                        : `-$${formatCurrency(Number(quote.discount_value))}`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="pt-2 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Timeline</p>
              <p className="text-xs text-muted-foreground">
                Created {formatDisplayDateTime(quote.created_at)}
              </p>
              {quote.updated_at !== quote.created_at && (
                <p className="text-xs text-muted-foreground">
                  Updated {formatDisplayDateTime(quote.updated_at)}
                </p>
              )}
            </div>
          </div>
        )}
      </SidePanel>

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle className="text-lg font-bold">Convert Estimate</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Select what to create from{" "}
              <span className="font-medium">{quote?.recipient_name || "this quote"}</span>
              's estimate
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 space-y-2">
            {[
              {
                key: "job" as const,
                label: "Job",
                description: "Create a job from this estimate",
                icon: <Briefcase className="w-5 h-5 text-blue-500" />,
                done: isConverted,
              },
              {
                key: "invoice" as const,
                label: "Invoice",
                description: "Create an invoice from this estimate",
                icon: <FileText className="w-5 h-5 text-green-500" />,
                done: isInvoiced,
              },
            ].map((opt) => (
              <button
                key={opt.key}
                disabled={opt.done}
                onClick={() => {
                  setConvertOpen(false);
                  setConvertTarget(opt.key);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="p-2 rounded-lg bg-secondary/60 flex-shrink-0">
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {opt.done ? `Already converted to ${opt.label.toLowerCase()}` : opt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <CompleteQuickQuoteClientDialog
        open={convertTarget !== null}
        onClose={() => setConvertTarget(null)}
        quote={quote ? {
          id:              quote.id,
          recipient_name:  quote.recipient_name,
          recipient_email: quote.recipient_email,
          recipient_phone: quote.recipient_phone,
        } : null}
        onCompleted={handleConvert}
        title={convertTarget === "invoice" ? "Complete Invoice Details" : "Complete Client Details"}
        subtitle={convertTarget === "invoice"
          ? "An invoice needs the client and service address. Saving also adds this person to your clients."
          : "A job needs the full service address. Saving also adds this person to your clients."}
        submitLabel={convertTarget === "invoice" ? "Save and Convert to Invoice" : "Save and Convert to Job"}
      />

      <AlertDialog open={isAcceptOpen} onOpenChange={setIsAcceptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsl(var(--green-vibrant) / 0.1)" }}>
                <CheckCircle className="w-8 h-8" style={{ color: "hsl(var(--green-vibrant))" }} />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Accept Quote?</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              This will mark the quote as accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAccepted} style={{ backgroundColor: "hsl(var(--green-vibrant))", color: "white" }}>
              Accept
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancel Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quick Quote?</AlertDialogTitle>
            <AlertDialogDescription>
              This quick quote will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
