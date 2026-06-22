const STORAGE_KEY = "contract-trial-modal-shown";

export function markContractTrialModalShown(): void {
  localStorage.setItem(STORAGE_KEY, "true");
}

export function wasContractTrialModalShown(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}
