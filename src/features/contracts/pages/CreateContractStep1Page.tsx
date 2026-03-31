/**
 * @module CreateContractPage
 * Thin orchestrator for the 3-step contract creation wizard.
 * Manages shared state (formData, step) and delegates all UI to step components.
 *
 * CON-3: Step 1 (Details) — CON-4: Step 2 (Policies) — CON-5: Step 3 (Preview + Send)
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
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
import { fetchClient }          from "@/features/crm/clients/services/clientsService";
import { ContractFormLayout }   from "../components/ContractFormLayout";
import { ContractDetailsStep }  from "../components/ContractDetailsStep";
import { ContractClausesStep }  from "../components/ContractClausesStep";
import { ContractSendStep }     from "../components/ContractSendStep";
import type { ContractFormData } from "../types/contract.types";
import type { ClientEntity } from "@/shared/types/entities";

const USE_MOCKS = import.meta.env.VITE_USE_CONTRACT_MOCKS === "true";

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

  // ── Edit-mode: pre-load client entity for ContractDetailsStep ───────────────
  const [initialClient, setInitialClient] = useState<ClientEntity | null>(null);

  // ── Data hooks ──────────────────────────────────────────────────────────────
  const { data: profile }          = useProfile();
  const { data: contractNumber }   = useContractNumber();
  const { data: existingContract } = useContract(editId);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createM   = useCreateContract();
  const updateM   = useUpdateContract();
  const sendEmail = useSendContractEmail();

  // ── Prefill from profile on new contract ────────────────────────────────────
  useEffect(() => {
    if (isEditing || !profile) return;
    const p = profile as Record<string, unknown>;
    patch({
      who_we_are:       (p.who_we_are_default    as string) ?? (p.company_description as string) ?? "",
      why_choose_us:    (p.why_choose_us_default  as string) ?? (p.why_choose_us      as string) ?? "",
      our_services:     (p.our_services_default   as string) ?? (p.our_services       as string) ?? "",
      service_coverage: (p.service_coverage_default as string) ?? (p.service_coverage as string) ?? "",
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
      recipient_type:    c.recipient_type,
      recipient_id:      c.recipient_id,
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

    // Load client entity so ClientPicker can pre-select it
    if (c.recipient_id) {
      fetchClient(c.recipient_id).then(setInitialClient).catch(() => null);
    }
  }, [existingContract, isEditing]);

  // ── Send handler (used by ContractSendStep) ──────────────────────────────────
  const handleSend = async (): Promise<void> => {
    let contractId: string;
    if (isEditing && editId) {
      const updated = await updateM.mutateAsync({ id: editId, data: formData });
      contractId = updated.id;
    } else {
      const created = await createM.mutateAsync(formData);
      contractId = created.id;
    }

    // Contract is complete — always set to Pending regardless of delivery method
    if (!USE_MOCKS) {
      const svc = await import("../services/contractsService");
      await svc.updateContractStatus(contractId, "Pending");
    }

    // Email send is best-effort: failure doesn't block the success flow
    if (!USE_MOCKS && formData.delivery_method === "email") {
      try {
        await sendEmail.mutateAsync({ contractId, recipientEmail: formData.recipient_email });
      } catch {
        // sendEmail shows its own error toast
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
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              Your changes will be lost. You can save as a draft to continue later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel className="mt-0">Keep editing</AlertDialogCancel>
            <Button variant="outline" onClick={handleSaveDraft} disabled={createM.isPending}>
              Save as Draft
            </Button>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={goBack}
            >
              Leave
            </AlertDialogAction>
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
