/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module CreateInvoicePage
 * Multi-section form for creating or editing an invoice.
 * Supports two rendering modes:
 *   - Page mode (default): full-page standalone route
 *   - Modal mode: full-screen Dialog when `open` + `onClose` props are provided
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ChevronLeft, Plus, Trash2,
  FileText, List, Calculator, StickyNote,
  Paperclip, X,
} from "lucide-react";
import { Button }   from "@/shared/components/ui/button";
import { Label }    from "@/shared/components/ui/label";
import { Badge }    from "@/shared/components/ui/badge";
import {
  FormSection, FloatingInput, SelectField, DateField,
  TextareaField, AttachmentsField,
} from "@/shared/components/forms";
import { FORM_SECTION_GAP } from "@/shared/constants/formTokens";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { ClientPropertyField } from "@/shared/components/common/ClientPropertyField";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { InvoicePreviewPage } from "./InvoicePreviewPage";
import { cn }       from "@/shared/utils/cn";
import { toast }    from "sonner";
import { useAuth }   from "@/shared/hooks/useAuth";
import { useProfile } from "@/shared/hooks/useProfile";
import { useInvoice, useCreateInvoice, useUpdateInvoice } from "../hooks/useInvoices";
import { useClients } from "@/features/crm/clients/hooks/useClients";
import { useClientProperties } from "@/features/crm/clients/hooks/useClientProperties";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";
import { labelFromClientProperty, matchClientProperty } from "@/shared/utils/bookingPropertyLabel";
import { useInvoiceNumber } from "../hooks/useInvoiceNumber";
import { useLineItems } from "../hooks/useLineItems";
import type { InvoiceFormData, InvoiceAttachment } from "../types/invoice.types";
import type { ClientEntity } from "@/shared/types/entities";
import { uploadInvoiceAttachments } from "../services/invoiceFilesService";
import { calculateInvoiceTotals } from "../utils/invoiceCalculations";
import { parseDateOnly } from "@/shared/utils/formatters";
import { StripeCheckModal } from "../components/StripeCheckModal";

function isSyntheticClientId(id: string): boolean {
  return id.startsWith("invoice-client-");
}

function resolveInvoiceAddress(
  selectedProperty: ClientProperty | null,
  selectedClient: ClientEntity | null,
) {
  if (selectedProperty) {
    const label = labelFromClientProperty(selectedProperty);
    return {
      address: selectedProperty.street,
      apt: selectedProperty.apt_suite || "",
      city: selectedProperty.city,
      state: selectedProperty.state,
      zip: selectedProperty.zip_code,
      propertyTitle: label?.title ?? null,
    };
  }
  if (selectedClient) {
    return {
      address: selectedClient.service_street,
      apt: selectedClient.service_apt ?? "",
      city: selectedClient.service_city,
      state: selectedClient.service_state,
      zip: selectedClient.service_zip,
      propertyTitle: null as string | null,
    };
  }
  return {
    address: "",
    apt: "",
    city: "",
    state: "",
    zip: "",
    propertyTitle: null as string | null,
  };
}

const INVOICE_TYPE_OPTIONS = [
  { value: "Single Payment", label: "Single Payment" },
  { value: "Recurring",      label: "Recurring" },
] as const;

const DISCOUNT_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage" },
  { value: "fixed",      label: "Fixed Amount" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface CreateInvoicePageProps {
  /** When provided, renders as a full-screen Dialog. Omit for standalone page mode. */
  open?: boolean;
  onClose?: () => void;
  /** Pass an invoice ID to open in edit mode from a modal (no URL param needed). */
  editId?: string;
}

export function CreateInvoicePage({ open, onClose, editId }: CreateInvoicePageProps = {}) {
  const navigate      = useNavigate();
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

  const stripeChecked    = useRef(false);

  // ── State ─────────────────────────────────────────────────────────────────
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceType,   setInvoiceType]   = useState("");
  const [issueDate,     setIssueDate]     = useState<Date | undefined>();
  const [dueDate,       setDueDate]       = useState<Date | undefined>();
  const [invoiceTitle,  setInvoiceTitle]  = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientEntity | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<ClientProperty | null>(null);
  const [invoicePropertyTitle, setInvoicePropertyTitle] = useState<string | null>(null);
  const [pendingInvoiceAddress, setPendingInvoiceAddress] = useState<{
    street: string;
    city: string;
    zip: string;
  } | null>(null);
  const createMutation = useCreateInvoice();
  const updateMutation = useUpdateInvoice();
  const { lineItems, updateLineItem, addLineItem, removeLineItem, resetLineItems } = useLineItems();
  const [discountType,  setDiscountType]  = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [taxRate,       setTaxRate]       = useState("");
  const [notes,         setNotes]         = useState("");
  const [attachmentFiles,    setAttachmentFiles]    = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<InvoiceAttachment[]>([]);
  const [currentStatus, setCurrentStatus] = useState<"Draft" | "Pending" | "Paid" | "Cancelled">("Draft");
  const [isLoading,     setIsLoading]     = useState(false);
  // Wizard step: "form" → "send" (preview + Choose Delivery Method, shown inline like estimates)
  const [step,           setStep]           = useState<"form" | "send">("form");
  const [sentInvoiceId,  setSentInvoiceId]  = useState<string | null>(null);
  const [showExitDialog,    setShowExitDialog]    = useState(false);
  const [showClientWarning, setShowClientWarning] = useState(false);
  const [showStripeModal,   setShowStripeModal]   = useState(false);
  const [errors, setErrors] = useState({
    invoiceType: false, issueDate: false, dueDate: false,
    selectedClient: false, lineItems: false,
  });
  const [isPrefilling, setIsPrefilling] = useState(!!isEditing);

  const { data: clientsRaw = [] } = useClients();
  const propertyClientId =
    selectedClient && !isSyntheticClientId(selectedClient.id) ? selectedClient.id : undefined;
  const { data: clientProperties = [] } = useClientProperties(propertyClientId);

  const handleClientSelect = useCallback((client: ClientEntity) => {
    setSelectedClient(client);
    setSelectedProperty(null);
    setInvoicePropertyTitle(null);
  }, []);

  useEffect(() => {
    if (!pendingInvoiceAddress || clientProperties.length === 0) return;
    const matched = matchClientProperty(clientProperties, {
      street: pendingInvoiceAddress.street,
      city: pendingInvoiceAddress.city,
      zip: pendingInvoiceAddress.zip,
    });
    if (matched) {
      setSelectedProperty(matched);
      setInvoicePropertyTitle(null);
    }
    setPendingInvoiceAddress(null);
  }, [pendingInvoiceAddress, clientProperties]);

  // ── Stripe check on mount (new invoices only) ─────────────────────────────
  useEffect(() => {
    if (isEditing || stripeChecked.current || !profile) return;
    stripeChecked.current = true;
    const p = profile as any;
    const isConfigured = !!(p.stripe_account_id && p.stripe_onboarding_completed);
    if (!isConfigured) setShowStripeModal(true);
  }, [isEditing, profile]);

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
    setInvoicePropertyTitle(invoiceData.property_title ?? null);

    const matchedClient = clientsRaw.find(
      (c) =>
        (invoiceData.email && c.email === invoiceData.email) ||
        (invoiceData.phone && c.phone === invoiceData.phone),
    );

    if (matchedClient) {
      setSelectedClient(matchedClient as unknown as ClientEntity);
      setPendingInvoiceAddress({
        street: invoiceData.address,
        city: invoiceData.city,
        zip: invoiceData.zip,
      });
    } else {
      const fakeClient: ClientEntity = {
        id: `invoice-client-${invoiceData.id}`,
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
    }
    setIsPrefilling(false);
  }, [invoiceData, clientsRaw]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const addr = resolveInvoiceAddress(selectedProperty, selectedClient);
      const propertyTitle = addr.propertyTitle ?? invoicePropertyTitle;

      // Once created (first Next), treat as editing so going Back→Next updates the
      // same invoice instead of creating a duplicate.
      const effectiveId     = id ?? sentInvoiceId;
      const editingExisting  = isEditing || !!sentInvoiceId;

      if (editingExisting && effectiveId) {
        // Upload any new files, then combine with existing
        const uploaded = await uploadInvoiceAttachments(effectiveId, attachmentFiles);
        const allAttachments = [...existingAttachments, ...uploaded];

        updateMutation.mutate(
          {
            id: effectiveId,
            updates: {
              invoice_name:   invoiceTitle || null,
              invoice_date:   format(issueDate, "yyyy-MM-dd"),
              due_date:       format(dueDate, "yyyy-MM-dd"),
              service_type:   invoiceType,
              status,
              client_name:    selectedClient.full_name,
              company_name:   selectedClient.company ?? null,
              email:          selectedClient.email,
              phone:          selectedClient.phone,
              property_title: propertyTitle,
              address:        addr.address,
              apt:            addr.apt || null,
              city:           addr.city,
              state:          addr.state,
              zip:            addr.zip,
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
              if (toPreview) { setSentInvoiceId(effectiveId); setStep("send"); }
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
          propertyTitle,
          address:       addr.address,
          apt:           addr.apt,
          city:          addr.city,
          state:         addr.state,
          zip:           addr.zip,
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
              if (toPreview) { setSentInvoiceId(inv.id); setStep("send"); }
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
    <div className={FORM_SECTION_GAP}>
      <FormSection
        icon={FileText}
        title="Invoice Details"
        subtitle="Number, type and the dates that rule the payment"
        invalid={errors.invoiceType || errors.issueDate || errors.dueDate}
      >
        {/* El número lo genera el sistema: se muestra, no se edita. */}
        <FloatingInput
          id="invoice-number"
          label="Invoice Number"
          value={invoiceNumber}
          onChange={() => {}}
          disabled
        />

        <SelectField
          placeholder="Invoice type"
          value={invoiceType}
          onChange={(v) => { setInvoiceType(v); setErrors((e) => ({ ...e, invoiceType: false })); }}
          options={INVOICE_TYPE_OPTIONS}
          required
          error={errors.invoiceType && "Required"}
        />

        <div className="grid grid-cols-2 gap-3">
          <DateField
            placeholder="Issue date"
            value={issueDate}
            onChange={(d) => { setIssueDate(d); setErrors((e) => ({ ...e, issueDate: false })); }}
            required
            error={errors.issueDate && "Required"}
          />
          <DateField
            placeholder="Due date"
            value={dueDate}
            onChange={(d) => { setDueDate(d); setErrors((e) => ({ ...e, dueDate: false })); }}
            required
            error={errors.dueDate && "Required"}
          />
        </div>

        <FloatingInput
          id="invoice-title"
          label="Invoice title"
          value={invoiceTitle}
          onChange={setInvoiceTitle}
        />
      </FormSection>

      {/* Misma sección de cliente que requests, estimates, walkthroughs y jobs.
          El selector de propiedad se oculta cuando el cliente es sintético (una
          factura cuyo cliente ya no existe como registro): no hay propiedades que
          ofrecer. La factura no guarda el property_id — guarda la dirección, y al
          editar la reconstruye por coincidencia (ver `pendingInvoiceAddress`). */}
      <ClientPropertyField
        title="Customer Information"
        subtitle="Who this invoice is for and where the service happened"
        client={selectedClient}
        onClientChange={(c) => { if (c) handleClientSelect(c); }}
        property={selectedProperty}
        onPropertyChange={(property) => {
          setSelectedProperty(property);
          setInvoicePropertyTitle(null);
        }}
        preferredPropertyId={selectedProperty?.id}
        showProperty={!!selectedClient && !isSyntheticClientId(selectedClient.id)}
        invalid={errors.selectedClient}
        errorMessage="Please select a customer."
      />

      <FormSection
        icon={List}
        title="Line Items"
        subtitle="What is being billed"
        invalid={errors.lineItems}
        action={
          <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        }
      >
        {lineItems.map((item, idx) => (
          <div key={item._id} className="rounded-lg border border-border p-4 space-y-3">
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

            <FloatingInput
              id={`item-desc-${item._id}`}
              label="Description"
              value={item.description}
              onChange={(v) => updateLineItem(idx, "description", v)}
              error={errors.lineItems && !item.description}
            />

            <div className="grid grid-cols-3 gap-3 items-end">
              <FloatingInput
                id={`item-price-${item._id}`}
                label="Price"
                type="decimal"
                value={item._price}
                onChange={(v) => updateLineItem(idx, "price", v)}
              />
              <FloatingInput
                id={`item-qty-${item._id}`}
                label="Qty"
                type="integer"
                value={item._qty}
                onChange={(v) => updateLineItem(idx, "qty", v)}
              />
              {/* El total es resultado, no campo: lleva etiqueta visible encima
                  (como `TimeField`) porque sin ella la casilla no dice qué es, y
                  el alto de un control para que la fila no se descuadre. */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Total</Label>
                <div className="flex items-center h-12 rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
                  ${item.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}

        {errors.lineItems && (
          <p className="text-xs text-destructive">Add at least one item with a description</p>
        )}
      </FormSection>

      <FormSection
        icon={Calculator}
        title="Pricing & Tax"
        subtitle="Discount and tax applied to the subtotal"
      >
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            placeholder="Discount type"
            value={discountType}
            onChange={(v) => setDiscountType(v as "percentage" | "fixed")}
            options={DISCOUNT_TYPE_OPTIONS}
          />
          <FloatingInput
            id="invoice-discount"
            label={discountType === "percentage" ? "Discount (%)" : "Discount ($)"}
            type="decimal"
            value={discountValue}
            onChange={setDiscountValue}
          />
        </div>

        <FloatingInput
          id="invoice-tax"
          label="Tax rate (%)"
          type="decimal"
          value={taxRate}
          onChange={setTaxRate}
        />

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
      </FormSection>

      <FormSection
        icon={StickyNote}
        title="Notes"
        subtitle="Anything the client should read with the invoice"
      >
        <TextareaField
          id="invoice-notes"
          label="Notes"
          placeholder="Add any additional notes..."
          value={notes}
          onChange={setNotes}
        />
      </FormSection>

      <FormSection
        icon={Paperclip}
        title="Attachments"
        subtitle="Files sent along with the invoice"
      >
        <AttachmentsField
          existing={existingAttachments.map((f, i) => ({ id: `${f.name}-${i}`, name: f.name, url: f.url, type: f.type }))}
          onRemoveExisting={(idx) => setExistingAttachments((prev) => prev.filter((_, i) => i !== idx))}
          files={attachmentFiles}
          onAddFiles={(picked) => setAttachmentFiles((prev) => [...prev, ...picked])}
          onRemoveFile={(idx) => setAttachmentFiles((prev) => prev.filter((_, i) => i !== idx))}
        />
      </FormSection>

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

  /* Primary actions grouped on the right. Page route (/invoices/new
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
          <AlertDialogFooter className="flex-col gap-2">
            {!isEditing && selectedClient && lineItems.length > 0 && (
              <AlertDialogAction
                className="w-full bg-background text-foreground border border-input hover:bg-accent"
                onClick={() => { setShowExitDialog(false); handleSaveDraft(); }}
              >
                Save Draft
              </AlertDialogAction>
            )}
            <AlertDialogAction
              className="w-full bg-destructive hover:bg-destructive/90"
              onClick={goBack}
            >
              Discard Changes
            </AlertDialogAction>
            <AlertDialogCancel className="mt-0 w-full">{isEditing ? "Keep Editing" : "Cancel"}</AlertDialogCancel>
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
        <FullScreenModal open={open ?? false} onClose={() => (step === "send" ? goBack() : setShowExitDialog(true))}>
          {/* Header — clean with bottom border only */}
          <div className="border-b flex-shrink-0 bg-white">
            <div className="max-w-2xl mx-auto">
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="w-1/3"></div>
                <div className="w-1/3 text-center">
                  <h1 className="font-semibold text-base leading-tight">
                    {step === "send" ? "Send Invoice" : isEditing ? "Edit Invoice" : "New Invoice"}
                  </h1>
                </div>
                <div className="flex items-center w-1/3 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => (step === "send" ? goBack() : setShowExitDialog(true))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable body — form or send step */}
          <div className="flex-1 overflow-y-auto bg-background">
            {step === "send" && sentInvoiceId ? (
              <InvoicePreviewPage
                embedded
                invoiceId={sentInvoiceId}
                onBack={() => setStep("form")}
                onSent={goBack}
              />
            ) : (
              <div className="max-w-2xl mx-auto px-4 space-y-4 py-6 pb-4">
                {formContent}
                {!isPrefilling && footerButtons}
              </div>
            )}
          </div>
        </FullScreenModal>
        {sharedDialogs}
      </>
    );
  }

  // ── Page mode ───────────────────────────────────────────────────────────────
  if (step === "send" && sentInvoiceId) {
    return (
      <InvoicePreviewPage
        invoiceId={sentInvoiceId}
        onBack={() => setStep("form")}
        onSent={goBack}
      />
    );
  }

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
