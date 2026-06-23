/**
 * Deposit flags stored in estimates.additional_data (residential + commercial).
 * Mirrors swift-slate's serialization. The deposit does NOT reduce the estimate
 * total — it's a payment requirement reflected in the job record.
 */

export interface DepositState {
  applyDeposit:  boolean;
  depositType:   "percentage" | "amount";
  depositValue:  string;
}

export const EMPTY_DEPOSIT: DepositState = {
  applyDeposit:  false,
  depositType:   "amount",
  depositValue:  "",
};

export function buildDepositAdditionalFields(
  applyDeposit: boolean,
  depositType: "percentage" | "amount",
  depositValue: string,
): { deposit_required: boolean; deposit_type: string | null; deposit_value: number | null } {
  return {
    deposit_required: applyDeposit,
    deposit_type:     applyDeposit ? depositType : null,
    deposit_value:    applyDeposit && depositValue ? parseFloat(depositValue) : null,
  };
}

export function restoreDepositFromAdditionalData(additionalData: unknown): DepositState {
  const ad = (additionalData || {}) as {
    deposit_required?: boolean;
    deposit_type?:     string | null;
    deposit_value?:    number | null;
  };
  if (!ad.deposit_required) return { ...EMPTY_DEPOSIT };
  const depositType: "percentage" | "amount" =
    ad.deposit_type === "percentage" || ad.deposit_type === "percent" ? "percentage" : "amount";
  return {
    applyDeposit: true,
    depositType,
    depositValue: ad.deposit_value != null ? String(ad.deposit_value) : "",
  };
}
