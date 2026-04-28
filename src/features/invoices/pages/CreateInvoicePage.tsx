/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module CreateInvoicePage
 * Multi-section form for creating or editing an invoice.
 * Supports two rendering modes:
 *   - Page mode (default): full-page standalone route
 *   - Modal mode: full-screen Dialog when `open` + `onClose` props are provided
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { format } from "date-fns";
import {
  ChevronLeft, Calendar as CalendarIcon, Plus, Trash2,
  FileText, List, Calculator, StickyNote,
  Paperclip, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button }   from "@/shared/components/ui/button";
import { Input }    from "@/shared/components/ui/input";
import { Label }    from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge }    from "@/shared/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { ClientPicker } from "@/shared/components/common/ClientPicker";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { Calendar } from "@/shared/components/ui/calendar";
import { cn }       from "@/shared/utils/cn";
import { toast }    from "sonner";
import { useAuth }   from "@/shared/hooks/useAuth";
import { useProfile } from "@/shared/hooks/useProfile";
import { useInvoice, useCreateInvoice, useUpdateInvoice, useDeleteInvoice } from "../hooks/useInvoices";
import { useInvoiceNumber } from "../hooks/useInvoiceNumber";
import { useLineItems } from "../hooks/useLineItems";
import type { InvoiceFormData, InvoiceAttachment } from "../types/invoice.types";
import type { ClientEntity } from "@/shared/types/entities";
import { uploadInvoiceAttachments } from "../services/invoiceFilesService";
import { calculateInvoiceTotals } from "../utils/invoiceCalculations";
import { toDecimalString, toIntegerString } from "@/shared/utils/numericInput";
import { parseDateOnly } from "@/shared/utils/formatters";
import { StripeCheckModal } from "../components/StripeCheckModal";

// ─── Component ────────────────────────────────────────────────────────────────

export interface InvoicePrefill {
  selectedClient?: { full_name: string; company?: string; phone: string; email: string; service_street: string; service_apt?: string; service_city: string; service_state: string; service_zip: string };
  invoiceType?: string;
  issueDate?: Date;
  dueDate?: Date;
  invoiceTitle?: string;
  lineItems?: { id: string; description: string; price: string; qty: string; total: number }[];
  discountType?: string;
  discountValue?: string;
  notes?: string;
}

interface CreateInvoicePageProps {
  /** When provided, renders as a full-screen Dialog. Omit for standalone page mode. */
  open?: boolean;
  onClose?: () => void;
  /** Pass an invoice ID to open in edit mode from a modal (no URL param needed). */
  editId?: string;
  /** Prefill form data when opening from a modal (e.g. Convert to Invoice from estimate). */
  prefill?: InvoicePrefill;
}

export function CreateInvoicePage({ open, onClose, editId, prefill: prefillProp }: CreateInvoicePageProps = {}) {
  const navigate      = useNavigate();
  const location      = useLocation();
  const { id: urlId } = useParams<{ id?: string }>();
  const id            = editId ?? urlId;
  const { user }      = useAuth();
  const { data: profile } = useProfile();
  const isEditing        = !!id;
  const isModal          = onClose !== undefined;
  const goBack           = useCallback(() => {
    if (isModal) onClose?.();
    else navigate("/invoices");
  }, [isModal, onClose, navigate]);

  const fileInputRef     = useRef<HTMLInputElement>(null);
  const stripeChecked    = useRef(false);

  // ── State ─────────────────────────────────────────────────────────────────
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceType,   setInvoiceType]   = useState("");
  const [issueDate,     setIssueDate]     = useState<Date | undefined>();
  const [dueDate,       setDueDate]       = useState<Date | undefined>();
  const [invoiceTitle,  setInvoiceTitle]  = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientEntity | null>(null);
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();
  const deleteMutation = useDeleteInvoice();
  const { lineItems, updateLineItem, addLineItem, removeLineItem, resetLineItems } = useLineItems();
  const [discountType,  setDiscountType]  = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [taxRate,       setTaxRate]       = useState("");
  const [notes,         setNotes]         = useState("");
  const [attachmentFiles,    setAttachmentFiles]    = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<InvoiceAttachment[]>([]);
  const [currentStatus, setCurrentStatus] = useState<"Draft" | "Pending" | "Paid" | "Cancelled">("Draft");
  const [isLoading,     setIsLoading]     = useState(false);
  const [showExitDialog,    setShowExitDialog]    = useState(false);
  const [showClientWarning, setShowClientWarning] = useState(false);
  const [showStripeModal,   setShowStripeModal]   = useState(false);
  const [issueDateOpen, setIssueDateOpen] = useState(false);
  const [dueDateOpen,   setDueDateOpen]   = useState(false);
  const [errors, setErrors] = useState({
    invoiceType: false, issueDate: false, dueDate: false,
    selectedClient: false, lineItems: false,
  });
  const [isPrefilling, setIsPrefilling] = useState(!!isEditing);

  // ── Stripe check on mount (new invoices only) ─────────────────────────────
  useEffect(() => {
    if (isEditing || stripeChecked.current || !profile) return;
    stripeChecked.current = true;
    const p = profile as any;
    const isConfigured = !!(p.stripe_account_id && p.stripe_onboarding_completed);
    if (!isConfigured) setShowStripeModal(true);
  }, [isEditing, profile]);

  // ── Prefill from estimate conversion ──────────────────────────────────────
  useEffect(() => {
    if (isEditing) return;
    // In modal mode, only apply when the modal is opening
    if (isModal && !open) return;
    const state = (prefillProp ?? location.state) as InvoicePrefill | null;
    if (!state?.selectedClient) return;

    const client: ClientEntity = {
      id: "",
      full_name: state.selectedClient.full_name,
      company: state.selectedClient.company ?? null,
      phone: state.selectedClient.phone,
      email: state.selectedClient.email,
      service_street: state.selectedClient.service_street,
      service_apt: state.selectedClient.service_apt ?? null,
      service_city: state.selectedClient.service_city,
      service_state: state.selectedClient.service_state,
      service_zip: state.selectedClient.service_zip,
    };
    setSelectedClient(client);
    setInvoiceType(state.invoiceType ?? "");
    setIssueDate(state.issueDate);
    setDueDate(state.dueDate);
    setInvoiceTitle(state.invoiceTitle ?? "");
    setDiscountType((state.discountType === "amount" ? "fixed" : (state.discountType ?? "percentage")) as "percentage" | "fixed");
    setDiscountValue(state.discountValue ?? "");
    setNotes(state.notes ?? "");
    if (state.lineItems?.length) {
      resetLineItems(state.lineItems.map((i) => ({
        _id: i.id,
        _price: i.price,
        _qty: i.qty,
        description: i.description,
        price: typeof i.price === "string" ? parseFloat(i.price) || 0 : i.price,
        qty: parseInt(i.qty, 10) || 1,
        total: typeof i.total === "number" ? i.total : parseFloat(String(i.total)) || 0,
      })));
    }
  }, [open, prefillProp]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load invoice on edit mode ──────────────────────────────────────────────
  const { data: invoiceData } = useInvoice(isEditing ? id : undefined);

  useEffect(() => {
    if (!invoiceData) return;
    setInvoiceNumber(invoiceData.invoice_number);
    setInvoiceType(invoiceData.service_type);
    setIssueDate(parseDateOnly(invoiceData.invoice_date));
    setDueDate(parseDateOnly(invoiceData.due_date));
    setInvoiceTitle(invoiceData.invoice_name ?? "");
    resetLineItems(
      (invoiceData.line_items ?? []).map((i) => ({
        ...i,
        _id:    crypto.randomUUID(),
        // Coerce to numbers — price/qty/total can arrive as strings from the DB JSON column
        price:  Number(i.price) || 0,
        qty:    Number(i.qty)   || 1,
        total:  Number(i.total) || 0,
        _price: String(i.price ?? ""),
        _qty:   String(i.qty   ?? 1),
      }))
    );
    setCurrentStatus((invoiceData.status as "Draft" | "Pending" | "Paid" | "Cancelled") ?? "Draft");
    setDiscountType((invoiceData.discount_type as "percentage" | "fixed") ?? "percentage");
    setDiscountValue(invoiceData.discount_value?.toString() ?? "");
    setTaxRate(invoiceData.tax_rate?.toString() ?? "");
    setNotes(invoiceData.notes ?? "");
    if (invoiceData.attachments && Array.isArray(invoiceData.attachments)) {
      setExistingAttachments(invoiceData.attachments);
    }
    const fakeClient: ClientEntity = {
      id: "",
      full_name:      invoiceData.client_name,
      company:        invoiceData.company_name ?? null,
      email:          invoiceData.email,
      phone:          invoiceData.phone,
      service_street: invoiceData.address,
      service_apt:    invoiceData.apt ?? null,
      service_city:   invoiceData.city,
      service_state:  invoiceData.state,
      service_zip:    invoiceData.zip,
    };
    setSelectedClient(fakeClient);
    setIsPrefilling(false);
  }, [invoiceData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-generate invoice number (new only) ────────────────────────────────
  const { data: generatedNumber } = useInvoiceNumber(!isEditing);
  useEffect(() => {
    if (!isEditing && generatedNumber) setInvoiceNumber(generatedNumber);
  }, [generatedNumber, isEditing]);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const { subtotal, discountAmount, taxAmount, total } = calculateInvoiceTotals({
    lineItems,
    discountType,
    discountValue: parseFloat(discountValue) || 0,
    taxRate:       parseFloat(taxRate) || 0,
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    const e = {
      invoiceType:    !invoiceType,
      issueDate:      !issueDate,
      dueDate:        !dueDate,
      selectedClient: !selectedClient,
      lineItems:      lineItems.length === 0 || lineItems.some((i) => !i.description),
    };
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }, [invoiceType, issueDate, dueDate, selectedClient, lineItems]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  // Next → validate → save → always go to preview (create or edit)
  const handleNext = async () => {
    if (!validate()) { toast.error("Please fill in all required fields"); return; }
    if (!selectedClient) return;
    if (!selectedClient.email || !selectedClient.phone) {
      setShowClientWarning(true);
      return;
    }
    handleSubmit("Pending", true);
  };

  // Save (edit only) → save preserving current status → go back to list
  const handleSave = () => {
    if (!validate()) { toast.error("Please fill in all required fields"); return; }
    handleSubmit(currentStatus as "Draft" | "Pending", false);
  };

  // Save Draft (exit dialog) → minimal validation → Draft → go to list
  const handleSaveDraft = () => {
    if (!selectedClient || !issueDate || !dueDate) {
      toast.error("Please select a client and dates before saving as draft");
      return;
    }
    handleSubmit("Draft", false);
  };

  const handleSubmit = async (status: "Draft" | "Pending", toPreview: boolean) => {
    if (!user || !selectedClient || !issueDate || !dueDate) return;
    setIsLoading(true);

    try {
      const discV = parseFloat(discountValue) || 0;
      const taxR  = parseFloat(taxRate) || 0;

      if (isEditing && id) {
        // Upload any new files, then combine with existing
        const uploaded = await uploadInvoiceAttachments(id, attachmentFiles);
        const allAttachments = [...existingAttachments, ...uploaded];

        updateMutation.mutate(
          {
            id,
            updates: {
              invoice_name:   invoiceTitle || null,
              invoice_date:   format(issueDate, "yyyy-MM-dd"),
              due_date:       format(dueDate, "yyyy-MM-dd"),
              service_type:   invoiceType,
              status,
              line_items:     lineItems.map(({ description, price, qty, total }) => ({ description, price, qty, total })) as any,
              discount_type:  discV > 0 ? discountType : null,
              discount_value: discV > 0 ? discV : null,
              tax_rate:       taxR > 0 ? taxR : null,
              total,
              notes:          notes || null,
              attachments:    allAttachments.length > 0 ? (allAttachments as any) : null,
            },
          },
          {
            onSuccess: () => {
              setIsLoading(false);
              if (toPreview) navigate(`/invoices/${id}/preview`);
              else { toast.success("Invoice updated"); goBack(); }
            },
            onError: () => setIsLoading(false),
          }
        );
      } else {
        // For create: attachments are uploaded after the row is created in the mutation's onSuccess
        const formData: InvoiceFormData = {
          serviceType:   invoiceType,
          invoiceDate:   format(issueDate, "yyyy-MM-dd"),
          dueDate:       format(dueDate, "yyyy-MM-dd"),
          invoiceName:   invoiceTitle,
          clientId:      selectedClient.id,
          clientName:    selectedClient.full_name,
          companyName:   selectedClient.company ?? "",
          email:         selectedClient.email,
          phone:         selectedClient.phone,
          address:       selectedClient.service_street,
          apt:           selectedClient.service_apt ?? "",
          city:          selectedClient.service_city,
          state:         selectedClient.service_state,
          zip:           selectedClient.service_zip,
          lineItems:     lineItems.map(({ description, price, qty, total }) => ({ description, price, qty, total })),
          discountType,
          discountValue,
          taxRate,
          notes,
          attachments: [],
        };

        createMutation.mutate(
          { userId: user.id, invoiceNumber, formData, status },
          {
            onSuccess: async (inv) => {
              // Upload attachments now that the invoice row exists
              if (attachmentFiles.length > 0) {
                try {
                  const uploaded = await uploadInvoiceAttachments(inv.id, attachmentFiles);
                  if (uploaded.length > 0) {
                    // Fire-and-forget update to persist attachments
                    updateMutation.mutate({ id: inv.id, updates: { attachments: uploaded as any } });
                  }
                } catch {
                  toast.error("Invoice saved but attachments failed to upload");
                }
              }
              setIsLoading(false);
              if (toPreview) navigate(`/invoices/${inv.id}/preview`);
              else { toast.success("Draft saved"); goBack(); }
            },
            onError: () => setIsLoading(false),
          }
        );
      }
    } catch {
      toast.error("Failed to upload attachments");
      setIsLoading(false);
    }
  };

  // ─── Shared JSX blocks ────────────────────────────────────────────────────

  const formCards = (
    <div className="space-y-4">
      {/* ── Invoice Details ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invoice Number (read-only) */}
          <div className="space-y-1">
            <Label>Invoice Number</Label>
            <Input value={invoiceNumber} readOnly className="bg-muted/30 font-mono" />
          </div>

          {/* Invoice Type */}
          <div className="space-y-1">
            <Label>Invoice Type <span className="text-destructive">*</span></Label>
            <Select value={invoiceType} onValueChange={setInvoiceType}>
              <SelectTrigger className={cn(errors.invoiceType && "border-destructive")}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single Payment">Single Payment</SelectItem>
                <SelectItem value="Recurring">Recurring</SelectItem>
              </SelectContent>
            </Select>
            {errors.invoiceType && <p className="text-xs text-destructive">Required</p>}
          </div>

          {/* Issue Date */}
          <div className="space-y-1">
            <Label>Issue Date <span className="text-destructive">*</span></Label>
            <Popover open={issueDateOpen} onOpenChange={setIssueDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !issueDate && "text-muted-foreground",
                    errors.issueDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {issueDate ? format(issueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={issueDate}
                  onSelect={(d) => { setIssueDate(d); setIssueDateOpen(false); }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.issueDate && <p className="text-xs text-destructive">Required</p>}
          </div>

          {/* Due Date */}
          <div className="space-y-1">
            <Label>Due Date <span className="text-destructive">*</span></Label>
            <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground",
                    errors.dueDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) => { setDueDate(d); setDueDateOpen(false); }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {errors.dueDate && <p className="text-xs text-destructive">Required</p>}
          </div>
        </CardContent>
      </Card>

      {/* ── Invoice Title ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Invoice Title
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Enter invoice title"
            value={invoiceTitle}
            onChange={(e) => setInvoiceTitle(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* ── Customer Information ────────────────────────────────────── */}
      <ClientPicker
        selectedClient={selectedClient}
        onClientSelect={setSelectedClient}
        error={errors.selectedClient}
      />

      {/* ── Line Items ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <List className="h-4 w-4" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineItems.map((item, idx) => (
            <div key={item._id} className="border border-border rounded-lg p-4 space-y-3">
              {/* ── Item header ──────────────────────────────────── */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Item {idx + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLineItem(idx)}
                  disabled={lineItems.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* ── Description ──────────────────────────────────── */}
              <Input
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                className={cn(errors.lineItems && !item.description && "border-destructive")}
              />

              {/* ── Price / Qty / Total ───────────────────────────── */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Price</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={item._price}
                    onChange={(e) => updateLineItem(idx, "price", toDecimalString(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="1"
                    value={item._qty}
                    onChange={(e) => updateLineItem(idx, "qty", toIntegerString(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Total</Label>
                  <div className="flex items-center h-9 rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
                    ${item.total.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {errors.lineItems && (
            <p className="text-xs text-destructive">Add at least one item with a description</p>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLineItem}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add an Item
          </Button>
        </CardContent>
      </Card>

      {/* ── Pricing & Tax ───────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Pricing &amp; Tax
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Discount type */}
            <div className="space-y-1">
              <Label>Discount Type</Label>
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as "percentage" | "fixed")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Discount value */}
            <div className="space-y-1">
              <Label>Discount Value</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {discountType === "percentage" ? "%" : "$"}
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(toDecimalString(e.target.value))}
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Tax rate */}
          <div className="space-y-1">
            <Label>Tax Rate %</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={taxRate}
                onChange={(e) => setTaxRate(toDecimalString(e.target.value))}
                className="pl-7"
              />
            </div>
          </div>

          {/* Live totals */}
          <div className="bg-muted/30 rounded-md p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">${taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border/50 pt-2 font-bold">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Notes ───────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* ── Attachments ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              setAttachmentFiles((prev) => [...prev, ...files]);
              e.target.value = "";
            }}
          />

          {(existingAttachments.length > 0 || attachmentFiles.length > 0) && (
            <ul className="space-y-2">
              {existingAttachments.map((file, idx) => (
                <li key={`existing-${idx}`} className="flex items-center justify-between gap-2 text-sm bg-muted/30 rounded-md px-3 py-2">
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">
                    {file.name}
                  </a>
                  <button
                    type="button"
                    onClick={() => setExistingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {attachmentFiles.map((file, idx) => (
                <li key={`new-${idx}`} className="flex items-center justify-between gap-2 text-sm bg-muted/30 rounded-md px-3 py-2">
                  <span className="truncate text-muted-foreground">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachmentFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Upload Files
          </Button>
        </CardContent>
      </Card>

      {/* Status badge for edit mode */}
      {isEditing && (
        <div className="flex justify-center">
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Editing existing invoice
          </Badge>
        </div>
      )}
    </div>
  );

  /* Match EstimateFormLayout: primary actions grouped on the right. Page route (/invoices/new
     from estimate conversion) previously rendered footer full-bleed + justify-between →
     Cancel/Next on opposite screen edges; constrain width and group like modal + estimates. */
  const footerButtons = (
    <div
      className={cn(
        isModal ? "flex-shrink-0" : "sticky bottom-0 w-full max-w-2xl mx-auto px-4 pb-6",
      )}
    >
      <div className="bg-white rounded-lg border p-4 flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={goBack} disabled={isLoading}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save"}
            </Button>
          )}
          <Button size="sm" onClick={handleNext} disabled={isLoading}>
            {isLoading ? "Saving..." : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );

  const sharedDialogs = (
    <>
      {/* ── Exit dialog ────────────────────────────────────────────────── */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{isEditing ? "Discard changes?" : "Save Invoice?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isEditing ? "Your unsaved changes will be lost." : "All unsaved changes will be lost."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">{isEditing ? "Keep Editing" : "Cancel"}</AlertDialogCancel>
            {!isEditing && (
              <AlertDialogAction
                className="bg-background text-foreground border border-input hover:bg-accent"
                onClick={() => { setShowExitDialog(false); handleSaveDraft(); }}
              >
                Save Draft
              </AlertDialogAction>
            )}
            {isEditing && currentStatus === "Draft" && (
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => {
                  if (id) deleteMutation.mutate(id);
                  setShowExitDialog(false);
                  goBack();
                }}
              >
                Delete Draft
              </AlertDialogAction>
            )}
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={goBack}
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Client warning dialog ───────────────────────────────────────── */}
      <AlertDialog open={showClientWarning} onOpenChange={setShowClientWarning}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Client Contact Information Missing</AlertDialogTitle>
            <AlertDialogDescription>
              The selected client doesn't have a complete email or phone number. You can still
              save as a draft, but the invoice won't be sendable until the client info is updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowClientWarning(false); handleSubmit("Pending", true); }}>
              Save anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Stripe check modal ──────────────────────────────────────────── */}
      <StripeCheckModal open={showStripeModal} onOpenChange={setShowStripeModal} />

    </>
  );

  const formContent = isPrefilling ? (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  ) : formCards;

  // ── Modal mode ──────────────────────────────────────────────────────────────
  if (isModal) {
    return (
      <>
        <FullScreenModal open={open ?? false} onClose={() => setShowExitDialog(true)}>
          {/* Header — clean with bottom border only */}
          <div className="border-b flex-shrink-0 bg-white">
            <div className="max-w-2xl mx-auto">
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="w-1/3"></div>
                <div className="w-1/3 text-center">
                  <h1 className="font-semibold text-base leading-tight">
                    {isEditing ? "Edit Invoice" : "New Invoice"}
                  </h1>
                </div>
                <div className="flex items-center w-1/3 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => setShowExitDialog(true)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="max-w-2xl mx-auto px-4 space-y-4 py-6 pb-4">
              {formContent}
              {!isPrefilling && footerButtons}
            </div>
          </div>
        </FullScreenModal>
        {sharedDialogs}
      </>
    );
  }

  // ── Page mode ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background">
        <Button variant="ghost" size="icon" onClick={() => setShowExitDialog(true)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold flex-1">
          {isEditing ? "Edit Invoice" : "New Invoice"}
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {formContent}
      </div>

      {!isPrefilling && footerButtons}

      {sharedDialogs}
    </div>
  );
}
