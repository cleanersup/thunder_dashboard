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
  MoreHorizontal, X, Send, Clock, FileText,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { SidePanel } from "@/shared/components/common/SidePanel";
import { formatDisplayDateTime, formatDateOnly, formatCurrency } from "@/shared/utils/formatters";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { QK } from "@/shared/config/queryKeys";
import { useQuickQuote, useUpdateQuickQuoteStatus, useDeleteQuickQuote } from "../hooks/useQuickQuotes";
import { convertQuickQuoteToJob, convertQuickQuoteToInvoice } from "../services/quickQuoteService";
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
}

function InfoRow({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
      <span className="text-sm">{children}</span>
    </div>
  );
}

export function QuickQuoteDetailPanel({ open, onClose, quoteId, onEdit }: Props) {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { data: quote, isLoading } = useQuickQuote(open ? quoteId : null);
  const updateStatus = useUpdateQuickQuoteStatus();
  const deleteQuote  = useDeleteQuickQuote();

  const [isConverting,    setIsConverting]    = useState(false);
  const [convertTarget,   setConvertTarget]   = useState<"job" | "invoice" | null>(null);
  const [isDeleteOpen,    setIsDeleteOpen]    = useState(false);

  // El status puede cambiar desde el backend (`Sent` al enviar, `Viewed` cuando
  // el destinatario abre el link), así que el panel abierto se mantiene al día.
  useEffect(() => {
    if (!open || !quoteId) return;
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: QK.quickQuote(quoteId) });
    }, 30_000);
    return () => clearInterval(id);
  }, [open, quoteId, qc]);

  async function handleMarkAccepted() {
    if (!quote) return;
    await updateStatus.mutateAsync({ id: quote.id, status: "Accepted" });
    toast.success("Quick quote accepted");
  }

  async function handleDecline() {
    if (!quote) return;
    await updateStatus.mutateAsync({ id: quote.id, status: "Declined" });
    toast.success("Quick quote declined");
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
  const isConverted = !!quote?.job_id;
  const isInvoiced  = !!quote?.invoice_id;

  const footer = quote ? (
    <div className="flex items-center gap-2">
      {!isConverted ? (
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
      ) : (
        <Button size="sm" variant="outline" className="flex-1" disabled>
          Converted to job
        </Button>
      )}
      {!isInvoiced ? (
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => setConvertTarget("invoice")}
          disabled={isConverting}
        >
          <FileText className="w-4 h-4 mr-1.5" />
          {isConverting && convertTarget === "invoice" ? "Converting…" : "Convert to Invoice"}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => { onClose(); navigate("/invoices", { state: { openId: quote.invoice_id } }); }}
        >
          <FileText className="w-4 h-4 mr-1.5" /> View Invoice
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="px-2.5">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => { onClose(); onEdit?.(quote.id); }}>
            <Edit className="w-4 h-4 mr-2" /> Edit and resend
          </DropdownMenuItem>
          {status !== "Accepted" && (
            <DropdownMenuItem onClick={handleMarkAccepted}>
              <CheckCircle className="w-4 h-4 mr-2 text-green-600" /> Mark as Accepted
            </DropdownMenuItem>
          )}
          {status !== "Declined" && (
            <DropdownMenuItem onClick={handleDecline}>
              <X className="w-4 h-4 mr-2 text-orange-500" /> Mark as Declined
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : undefined;

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

            {/* Servicio y precio */}
            <Card className="border border-border/50">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Service
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{quote.service_sub_type || quote.service_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{formatDateOnly(quote.quote_date, "MMMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">${formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-base pt-1 border-t border-border/50">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">${formatCurrency(quote.total)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </SidePanel>

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
