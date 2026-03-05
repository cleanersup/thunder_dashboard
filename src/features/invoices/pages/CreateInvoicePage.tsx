/**
 * @module CreateInvoicePage
 * Multi-section form for creating or editing an invoice.
 * Adapted from thunder-web-version/src/pages/CreateInvoice.tsx + swift-slate logic.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ChevronLeft, Calendar as CalendarIcon, Plus, Trash2,
  User, FileText, List, Calculator, StickyNote,
  Building2, Mail, Phone, MapPin, Paperclip, X,
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
import { ClientForm } from "@/features/crm/clients/components/ClientForm";
import { Calendar } from "@/shared/components/ui/calendar";
import { cn }       from "@/shared/utils/cn";
import { toast }    from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase }  from "@/integrations/supabase/client";
import { useAuth }   from "@/shared/hooks/useAuth";
import { QK }        from "@/shared/config/queryKeys";
import { generateInvoiceNumber, fetchInvoiceById, updateInvoice, createInvoice } from "../services/invoicesService";
import type { InvoiceFormData, LineItem } from "../types/invoice.types";
import type { ClientEntity } from "@/shared/types/entities";
import { calculateInvoiceTotals } from "../utils/invoiceCalculations";
import { toDecimalString, toIntegerString } from "@/shared/utils/numericInput";

// ─── Line item helpers ────────────────────────────────────────────────────────

// _price / _qty hold the raw text while typing so mid-entry "25." isn't lost
type LocalLineItem = LineItem & { _id: string; _price: string; _qty: string };

function newLineItem(): LocalLineItem {
  return { _id: crypto.randomUUID(), _price: "", _qty: "1", description: "", price: 0, qty: 1, total: 0 };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateInvoicePage() {
  const navigate      = useNavigate();
  const { id }        = useParams<{ id?: string }>();
  const { user }      = useAuth();
  const qc            = useQueryClient();
  const isEditing     = !!id;
  const fileInputRef  = useRef<HTMLInputElement>(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceType,   setInvoiceType]   = useState("");
  const [issueDate,     setIssueDate]     = useState<Date | undefined>();
  const [dueDate,       setDueDate]       = useState<Date | undefined>();
  const [invoiceTitle,  setInvoiceTitle]  = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientEntity | null>(null);
  const [lineItems, setLineItems] = useState<LocalLineItem[]>([newLineItem()]);
  const [discountType,  setDiscountType]  = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [taxRate,       setTaxRate]       = useState("");
  const [notes,         setNotes]         = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [currentStatus, setCurrentStatus] = useState<"Draft" | "Pending" | "Paid" | "Cancelled">("Draft");
  const [isLoading,     setIsLoading]     = useState(false);
  const [showExitDialog,    setShowExitDialog]    = useState(false);
  const [showClientWarning, setShowClientWarning] = useState(false);
  const [showNewClient,     setShowNewClient]     = useState(false);
  const [issueDateOpen, setIssueDateOpen] = useState(false);
  const [dueDateOpen,   setDueDateOpen]   = useState(false);
  const [errors, setErrors] = useState({
    invoiceType: false, issueDate: false, dueDate: false,
    selectedClient: false, lineItems: false,
  });

  // ── Clients query ──────────────────────────────────────────────────────────
  const { data: clients = [] } = useQuery<ClientEntity[]>({
    queryKey: QK.clientsForInvoice,
    queryFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return [];
      const { data } = await supabase
        .from("clients")
        .select("id, full_name, company, phone, email, service_street, service_city, service_state, service_zip, service_apt")
        .eq("user_id", u.id)
        .order("full_name");
      return (data ?? []) as ClientEntity[];
    },
  });

  // ── Load invoice on edit mode ──────────────────────────────────────────────
  useEffect(() => {
    if (isEditing && id) {
      fetchInvoiceById(id).then((inv) => {
        setInvoiceNumber(inv.invoice_number);
        setInvoiceType(inv.service_type);
        setIssueDate(new Date(inv.invoice_date));
        setDueDate(new Date(inv.due_date));
        setInvoiceTitle(inv.invoice_name ?? "");
        setLineItems(
          (inv.line_items ?? []).map((i) => ({
            ...i,
            _id:    crypto.randomUUID(),
            _price: String(i.price ?? ""),
            _qty:   String(i.qty   ?? 1),
          }))
        );
        setCurrentStatus((inv.status as "Draft" | "Pending" | "Paid" | "Cancelled") ?? "Draft");
        setDiscountType((inv.discount_type as "percentage" | "fixed") ?? "percentage");
        setDiscountValue(inv.discount_value?.toString() ?? "");
        setTaxRate(inv.tax_rate?.toString() ?? "");
        setNotes(inv.notes ?? "");
        // Reconstruct ClientEntity from invoice fields
        const fakeClient: ClientEntity = {
          id: "",
          full_name:      inv.client_name,
          company:        inv.company_name ?? null,
          email:          inv.email,
          phone:          inv.phone,
          service_street: inv.address,
          service_apt:    inv.apt ?? null,
          service_city:   inv.city,
          service_state:  inv.state,
          service_zip:    inv.zip,
        };
        setSelectedClient(fakeClient);
      }).catch(() => toast.error("Failed to load invoice"));
    }
  }, [isEditing, id]);

  // ── Auto-generate invoice number (new only) ────────────────────────────────
  useEffect(() => {
    if (!isEditing) {
      generateInvoiceNumber().then(setInvoiceNumber).catch(() => {});
    }
  }, [isEditing]);

  // ── Line item helpers ──────────────────────────────────────────────────────
  const updateLineItem = (idx: number, field: "description" | "price" | "qty", raw: string) => {
    setLineItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx] };
      if (field === "description") {
        item.description = raw;
      } else if (field === "price") {
        item._price = raw;
        item.price  = parseFloat(raw) || 0;
        item.total  = item.price * item.qty;
      } else if (field === "qty") {
        item._qty = raw;
        item.qty  = parseInt(raw) || 1;
        item.total = item.price * item.qty;
      }
      next[idx] = item;
      return next;
    });
  };

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
        lineItems:     lineItems.map(({ description, price, qty, total }) => ({
          description, price, qty, total,
        })),
        discountType,
        discountValue,
        taxRate,
        notes,
        attachments: [],
      };

      if (isEditing && id) {
        const discV   = parseFloat(discountValue) || 0;
        const taxR    = parseFloat(taxRate) || 0;
        const sub     = lineItems.reduce((s, i) => s + i.total, 0);
        const discAmt = discountType === "percentage" ? sub * (discV / 100) : discV;
        const after   = sub - discAmt;
        const taxAmt  = after * (taxR / 100);
        const tot     = after + taxAmt;

        await updateInvoice(id, {
          invoice_name:   invoiceTitle || null,
          invoice_date:   format(issueDate, "yyyy-MM-dd"),
          due_date:       format(dueDate, "yyyy-MM-dd"),
          service_type:   invoiceType,
          status,
          line_items:     formData.lineItems as any,
          discount_type:  discV > 0 ? discountType : null,
          discount_value: discV > 0 ? discV : null,
          tax_rate:       taxR > 0 ? taxR : null,
          total:          tot,
          notes:          notes || null,
        });
        if (toPreview) {
          navigate(`/invoices/${id}/preview`);
        } else {
          toast.success("Invoice updated");
          navigate("/invoices");
        }
      } else {
        const inv = await createInvoice(user.id, invoiceNumber, formData, status);
        if (toPreview) {
          navigate(`/invoices/${inv.id}/preview`);
        } else {
          toast.success("Draft saved");
          navigate("/invoices");
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save invoice");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Selected client address ────────────────────────────────────────────────
  const selectedClientAddress = selectedClient
    ? [
        selectedClient.service_street,
        selectedClient.service_city,
        selectedClient.service_state,
        selectedClient.service_zip,
      ].filter(Boolean).join(", ")
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
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

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-6">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={selectedClient?.id ?? ""}
              onValueChange={(clientId) => {
                const c = clients.find((c) => c.id === clientId);
                if (c) setSelectedClient(c);
              }}
            >
              <SelectTrigger className={cn(errors.selectedClient && "border-destructive")}>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
                {clients.length === 0 && (
                  <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No clients found
                  </p>
                )}
              </SelectContent>
            </Select>

            {errors.selectedClient && (
              <p className="text-xs text-destructive">Please select a client</p>
            )}

            <button
              type="button"
              onClick={() => setShowNewClient(true)}
              className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add New Client
            </button>

            {/* Selected client card */}
            {selectedClient && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="font-semibold text-sm">{selectedClient.full_name}</p>
                      {selectedClient.company && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3 flex-shrink-0" />
                          {selectedClient.company}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3 flex-shrink-0" /> {selectedClient.email}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3 flex-shrink-0" /> {selectedClient.phone}
                      </p>
                      {selectedClientAddress && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" /> {selectedClientAddress}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

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
                    onClick={() => setLineItems((prev) => prev.filter((_, i) => i !== idx))}
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
              onClick={() => setLineItems((prev) => [...prev, newLineItem()])}
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

            {attachmentFiles.length > 0 && (
              <ul className="space-y-2">
                {attachmentFiles.map((file, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2 text-sm bg-muted/30 rounded-md px-3 py-2">
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

      {/* ── Sticky footer ──────────────────────────────────────────────── */}
      <div className="sticky bottom-0 bg-background border-t px-4 py-3">
        <div className={`max-w-2xl mx-auto grid gap-3 ${isEditing ? "grid-cols-3" : "grid-cols-2"}`}>
          <Button
            variant="outline"
            className="h-12"
            onClick={() => navigate("/invoices")}
            disabled={isLoading}
          >
            Cancel
          </Button>
          {isEditing && (
            <Button
              variant="outline"
              className="h-12"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          )}
          <Button className="h-12" onClick={handleNext} disabled={isLoading}>
            {isLoading ? "Saving..." : "Next"}
          </Button>
        </div>
      </div>

      {/* ── Exit dialog ────────────────────────────────────────────────── */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Save Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              All unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-background text-foreground border border-input hover:bg-accent"
              onClick={() => { setShowExitDialog(false); handleSaveDraft(); }}
            >
              Save Draft
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => navigate("/invoices")}
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

      {/* ── Add New Client dialog (reuses CRM ClientForm) ──────────────── */}
      <ClientForm
        open={showNewClient}
        onClose={() => setShowNewClient(false)}
        onSuccess={(client) => {
          setSelectedClient(client);
          qc.invalidateQueries({ queryKey: QK.clientsForInvoice });
        }}
      />
    </div>
  );
}
