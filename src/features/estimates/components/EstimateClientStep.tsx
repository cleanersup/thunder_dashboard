/**
 * @module EstimateClientStep
 * Thin wrapper around the shared ClientLeadPicker for the estimate wizard.
 *
 * Keeps the estimate-specific prop names (estimateType / onEstimateTypeChange)
 * for backwards compatibility with CreateResidentialEstimatePage and
 * CreateCommercialEstimatePage.
 */
import {
  ClientLeadPicker,
  type ClientLeadPickerProps,
} from "@/shared/components/common/ClientLeadPicker";

export type { ClientEntity, LeadEntity } from "@/shared/types/entities";
export type EstimateEntityType = "client" | "lead";

// ─── Props — keeps original names so call sites don't change ─────────────────

interface EstimateClientStepProps
  extends Omit<ClientLeadPickerProps, "entityType" | "onEntityTypeChange"> {
  estimateType:          "client" | "lead" | null;
  onEstimateTypeChange:  (type: "client" | "lead") => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EstimateClientStep({
  estimateType,
  onEstimateTypeChange,
  infoText = "Verify the email and phone number — they will be used to send the estimate.",
  ...rest
}: EstimateClientStepProps) {
  return (
    <ClientLeadPicker
      entityType={estimateType}
      onEntityTypeChange={onEstimateTypeChange}
      infoText={infoText}
      {...rest}
    />
  );
}
