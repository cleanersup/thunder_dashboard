/**
 * @module CreateContractPage
 * Thin orchestrator for the 3-step contract creation wizard.
 * Manages shared state (formData, step) and delegates all UI to step components.
 *
 * CON-3: Step 1 (Details) — CON-4: Step 2 (Policies) — CON-5: Step 3 (Preview + Send)
 */
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import {
  AlertDialog,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useProfile } from "@/shared/hooks/useProfile";
import { useContract } from "../hooks/useContract";
import {
  useCreateContract,
  useUpdateContract,
} from "../hooks/useContracts";
import { useContractNumber }    from "../hooks/useContractNumber";
import { useSendContractEmail } from "../hooks/useSendContractEmail";
import { useSendContractSMS }   from "../hooks/useSendContractSMS";
import { useClient }            from "@/features/crm/clients/hooks/useClients";
import { ContractFormLayout }   from "../components/ContractFormLayout";
import { ContractDetailsStep }  from "../components/ContractDetailsStep";
import { ContractClausesStep }  from "../components/ContractClausesStep";
import { ContractSendStep }     from "../components/ContractSendStep";
import type { ContractFormData } from "../types/contract.types";
import type { ContractDescriptionDefaults } from "../components/ContractDetailsStep";

// ─── Default form data ────────────────────────────────────────────────────────

const DEFAULT_FORM: ContractFormData = {
  recipient_name:    "",
  recipient_email:   "",
  recipient_phone:   "",
  recipient_address: "",
  recipient_type:    "client",
  recipient_id:      null,
  start_date:        "",
  end_date:          "",
  total:             "",
  payment_frequency: "monthly",
  who_we_are:        "",
  why_choose_us:     "",
  our_services:      "",
  service_coverage:  "",
  sections:          [],
  delivery_method:   null,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateContractPageProps {
  /** Modal mode: pass open + onClose. Omit for standalone page (route). */
  open?:    boolean;
  onClose?: () => void;
  /** Edit mode when opened as modal (no URL param available). */
  editId?:  string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CreateContractStep1Page({
  open,
  onClose,
  editId: editIdProp,
}: CreateContractPageProps = {}) {
  const navigate             = useNavigate();
  const queryClient          = useQueryClient();
  const { id: editIdParam }  = useParams<{ id: string }>();
  const editId               = editIdProp ?? editIdParam;
  const isEditing            = !!editId;
  const isModal              = onClose !== undefined;
  const goBack               = () => { if (isModal) onClose!(); else navigate("/contracts"); };

  // ── Shared state ────────────────────────────────────────────────────────────
  const [step,      setStep]      = useState<1 | 2 | 3>(1);
  const [formData,  setFormData]  = useState<ContractFormData>(DEFAULT_FORM);
  const [showExit,  setShowExit]  = useState(false);

  const patch = (partial: Partial<ContractFormData>) =>
    setFormData((prev) => ({ ...prev, ...partial }));

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { data: profile }          = useProfile();
  const { data: contractNumber }   = useContractNumber();
  const { data: existingContract } = useContract(editId);

  // ── Edit-mode: pre-load client entity for ContractDetailsStep ───────────────
  // Derived reactively from the existing contract so no manual fetch is needed.
  const { data: initialClientData } = useClient(existingContract?.recipient_id ?? undefined);
  const initialClient = initialClientData ?? null;

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createM   = useCreateContract();
  const updateM   = useUpdateContract();
  const sendEmail = useSendContractEmail();
  const sendSMS   = useSendContractSMS();

  // ── Prefill from profile on new contract ────────────────────────────────────
  useEffect(() => {
    if (isEditing || !profile) return;
    const p = profile as Record<string, unknown>;
    patch({
      who_we_are:       (p.company_description as string) ?? "",
      why_choose_us:    (p.why_choose_us       as string) ?? "",
      our_services:     (p.our_services        as string) ?? "",
      service_coverage: (p.service_coverage    as string) ?? "",
    });
  }, [profile, isEditing]);

  // ── Prefill from existing contract on edit ───────────────────────────────────
  useEffect(() => {
    if (!isEditing || !existingContract) return;
    const c = existingContract;
    setFormData({
      recipient_name:    c.recipient_name,
      recipient_email:   c.recipient_email   ?? "",
      recipient_phone:   c.recipient_phone   ?? "",
      recipient_address: c.recipient_address ?? "",
      recipient_type:    "client",
      recipient_id:      c.recipient_id ?? null,
      start_date:        c.start_date,
      end_date:          c.end_date,
      total:             String(c.total),
      payment_frequency: c.payment_frequency,
      who_we_are:        c.who_we_are        ?? "",
      why_choose_us:     c.why_choose_us     ?? "",
      our_services:      c.our_services      ?? "",
      service_coverage:  c.service_coverage  ?? "",
      sections:          c.sections,
      delivery_method:   c.delivery_method,
    });

    // initialClient is derived reactively via useClient(existingContract.recipient_id)
  }, [existingContract, isEditing]);

  // ── Send handler (used by ContractSendStep) ──────────────────────────────────
  const handleSend = async (): Promise<void> => {
    // Keep the full contract object to access accept_token for the SMS URL
    const contract = isEditing && editId
      ? await updateM.mutateAsync({ id: editId, data: formData })
      : await createM.mutateAsync(formData);

    const contractId = contract.id;

    // Contract is complete — always set to Pending regardless of delivery method
    const svc = await import("../services/contractsService");
    await svc.updateContractStatus(contractId, "Pending");
    // Invalidate so the table reflects "Pending" immediately (not "Draft")
    queryClient.invalidateQueries({ queryKey: QK.contracts });

    // Build the public URL for the client to view/accept the contract
    const contractUrl = contract.public_share_token
      ? `${window.location.origin}/public/contract/${contract.public_share_token}`
      : `${window.location.origin}/public/contract/${contractId}`;

    const total = parseFloat(formData.total) || undefined;

    // Email — best-effort
    if (formData.delivery_method === "email" || formData.delivery_method === "both") {
      try {
        await sendEmail.mutateAsync({ contractId, recipientEmail: formData.recipient_email });
      } catch {
        // sendEmail shows its own error toast
      }
    }

    // SMS — best-effort
    if (formData.delivery_method === "sms" || formData.delivery_method === "both") {
      try {
        await sendSMS.mutateAsync({
          phoneNumber:   formData.recipient_phone,
          clientName:    formData.recipient_name,
          contractUrl,
          contractTotal: total,
          isUpdate:      isEditing,
        });
      } catch {
        // sendSMS shows its own error toast
      }
    }
  };

  // ── Save draft (exit dialog) ─────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!formData.recipient_name.trim()) { toast.error("Please enter a recipient name"); return; }
    if (isEditing && editId) {
      updateM.mutate({ id: editId, data: formData }, { onSuccess: goBack });
    } else {
      createM.mutate(formData, { onSuccess: goBack });
    }
  };

  // ── Saved description defaults (from profile) — drives "Load Default" buttons ─
  const savedDefaults: ContractDescriptionDefaults | undefined = profile
    ? (() => {
        const p = profile as Record<string, unknown>;
        return {
          who_we_are:       ((p.company_description as string) ?? "").trim() ? (p.company_description as string) : "",
          why_choose_us:    ((p.why_choose_us       as string) ?? "").trim() ? (p.why_choose_us       as string) : "",
          our_services:     ((p.our_services        as string) ?? "").trim() ? (p.our_services        as string) : "",
          service_coverage: ((p.service_coverage    as string) ?? "").trim() ? (p.service_coverage    as string) : "",
        };
      })()
    : undefined;

  // ── Step content ─────────────────────────────────────────────────────────────
  const profileRecord = (profile ?? null) as Record<string, unknown> | null;

  const stepContent = (() => {
    if (step === 1) {
      return (
        <ContractDetailsStep
          formData={formData}
          onChange={patch}
          contractNumber={contractNumber}
          initialClient={initialClient}
          savedDefaults={savedDefaults}
          onNext={() => setStep(2)}
          onCancel={() => setShowExit(true)}
        />
      );
    }
    if (step === 2) {
      return (
        <ContractClausesStep
          formData={formData}
          onChange={patch}
          profile={profileRecord}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      );
    }
    return (
      <ContractSendStep
        formData={formData}
        onChange={patch}
        profile={profileRecord}
        contractNumber={contractNumber}
        onBack={() => setStep(2)}
        onSend={handleSend}
        onSuccess={goBack}
      />
    );
  })();

  // ── Layout ───────────────────────────────────────────────────────────────────
  const layout = (
    <ContractFormLayout
      currentStep={step}
      isEditing={isEditing}
      isModal={isModal}
      onExit={() => setShowExit(true)}
    >
      {stepContent}

      {/* Exit confirmation (shared across all steps) */}
      <AlertDialog open={showExit} onOpenChange={setShowExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes will be lost. You can save as a draft to continue later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowExit(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" className="flex-1" onClick={goBack}>
              Leave
            </Button>
            <Button className="flex-1" onClick={handleSaveDraft} disabled={createM.isPending}>
              Save as Draft
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ContractFormLayout>
  );

  if (isModal) {
    return (
      <FullScreenModal open={open ?? false} onClose={goBack}>
        {layout}
      </FullScreenModal>
    );
  }
  return layout;
}
