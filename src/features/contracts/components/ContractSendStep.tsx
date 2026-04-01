/**
 * @module ContractSendStep
 * Step 3 of the contract wizard: delivery method, preview, PDF download, send.
 */
import { useState, useMemo } from "react";
import { Loader2, Download, PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog, DialogContent,
} from "@/shared/components/ui/dialog";
import { toast } from "sonner";
import { DeliveryMethodSelector } from "@/shared/components/DeliveryMethodSelector";
import { ContractPreview }        from "./ContractPreview";
import { downloadContractPdf }    from "../services/generateContractPDF";
import type { ContractFormData, ContractDeliveryMethod } from "../types/contract.types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContractSendStepProps {
  formData:       ContractFormData;
  onChange:       (partial: Partial<ContractFormData>) => void;
  profile:        Record<string, unknown> | null;
  contractNumber: string | undefined;
  onBack:         () => void;
  /** Async function that creates/updates the contract and sends via email/SMS. */
  onSend:         () => Promise<void>;
  /** Called after the success dialog closes. */
  onSuccess:      () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractSendStep({
  formData,
  onChange,
  profile,
  contractNumber,
  onBack,
  onSend,
  onSuccess,
}: ContractSendStepProps) {
  const [isSending,     setIsSending]     = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showSuccess,   setShowSuccess]   = useState(false);

  const p = profile ?? {} as Record<string, unknown>;

  const deliveryOptions = useMemo(() => [
    {
      value: "email",
      title: "Email Delivery",
      description: `Send PDF contract to ${formData.recipient_email || "recipient's email"}`,
      detail: "PDF Attachment · Professional Format",
    },
    {
      value: "sms",
      title: "SMS Delivery",
      description: `Send contract link to ${formData.recipient_phone || "recipient's phone"}`,
      detail: "Text Message · Direct Link",
    },
    {
      value: "both",
      title: "Email & SMS",
      description: "Send via email and text message",
      detail: "PDF Attachment + Direct Link",
    },
  ], [formData.recipient_email, formData.recipient_phone]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadContractPdf({
        companyLogo:     (p.company_logo    as string | null) ?? null,
        companyName:     (p.company_name    as string) ?? "",
        companyAddress:  (p.company_address as string) ?? "",
        companyCity:     (p.company_city    as string) ?? "",
        companyState:    (p.company_state   as string) ?? "",
        companyZip:      (p.company_zip     as string) ?? "",
        companyPhone:    (p.company_phone   as string) ?? "",
        companyEmail:    (p.company_email   as string) ?? "",
        contractNumber:  contractNumber ?? "",
        recipientName:   formData.recipient_name,
        startDate:       formData.start_date,
        endDate:         formData.end_date,
        whoWeAre:        formData.who_we_are,
        whyChooseUs:     formData.why_choose_us,
        ourServices:     formData.our_services,
        serviceCoverage: formData.service_coverage,
        sections:        formData.sections,
      });
      toast.success("PDF downloaded!");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSend = async () => {
    if (!formData.delivery_method) {
      toast.error("Please select a delivery method");
      return;
    }
    setIsSending(true);
    try {
      await onSend();
      setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); onSuccess(); }, 3000);
    } catch {
      // onSend handles toast errors internally
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Delivery Method */}
      <Card className="rounded-lg border">
        <CardContent className="px-6 py-4">
          <DeliveryMethodSelector
            options={deliveryOptions}
            value={formData.delivery_method}
            onChange={(v) => onChange({ delivery_method: v as ContractDeliveryMethod })}
          />
        </CardContent>
      </Card>

      {/* Contract Preview */}
      <Card className="rounded-lg border">
        <CardHeader className="px-6 py-3">
          <CardTitle className="text-sm font-medium">Contract Preview</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-4">
          <div className="bg-muted/50 rounded-lg overflow-auto max-h-[600px]">
            <ContractPreview
              companyLogo={p.company_logo as string | null}
              companyName={(p.company_name as string) ?? ""}
              companyAddress={(p.company_address as string) ?? ""}
              companyCity={(p.company_city as string) ?? ""}
              companyState={(p.company_state as string) ?? ""}
              companyZip={(p.company_zip as string) ?? ""}
              companyPhone={(p.company_phone as string) ?? ""}
              companyEmail={(p.company_email as string) ?? ""}
              contractNumber={contractNumber ?? ""}
              recipientName={formData.recipient_name}
              startDate={formData.start_date}
              endDate={formData.end_date}
              whoWeAre={formData.who_we_are}
              whyChooseUs={formData.why_choose_us}
              ourServices={formData.our_services}
              serviceCoverage={formData.service_coverage}
              sections={formData.sections}
            />
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white rounded-lg border p-4 flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>Back</Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isDownloading}
            onClick={handleDownload}
          >
            {isDownloading
              ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Generating...</>
              : <><Download className="w-4 h-4 mr-1.5" /> PDF</>
            }
          </Button>
          <Button
            size="sm"
            disabled={isSending}
            onClick={handleSend}
          >
            {isSending
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
              : "Send Contract"
            }
          </Button>
        </div>
      </div>

      {/* Success dialog */}
      <Dialog open={showSuccess}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <PartyPopper className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Contract Sent!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your contract has been sent to {formData.recipient_name}.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
