/**
 * @module PublicContractPage
 * CON-9: Public contract acceptance page — no auth required.
 * Fetches contract by accept_token, renders preview, and lets the recipient accept.
 *
 * Route: /public/contract/:token
 */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, FileSignature, AlertCircle, Loader2 } from "lucide-react";
import { Button }  from "@/shared/components/ui/button";
import { ContractPreview } from "../components/ContractPreview";
import { useContractByToken, useAcceptContract } from "../hooks/useContract";
import { useContractOwnerProfile } from "../hooks/useContractOwnerProfile";
import { format, parseISO } from "date-fns";

// ─── Component ────────────────────────────────────────────────────────────────

export function PublicContractPage() {
  const { token } = useParams<{ token: string }>();
  const [accepted, setAccepted] = useState(false);

  const { data: contract, isLoading, error } = useContractByToken(token);
  const { data: profile, isLoading: profileLoading } = useContractOwnerProfile(contract?.user_id);
  const acceptM = useAcceptContract(token);

  const handleAccept = () => {
    acceptM.mutate(undefined, {
      onSuccess: () => setAccepted(true),
    });
  };

  // ── States ────────────────────────────────────────────────────────────────

  if (isLoading || profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading contract…</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-background px-4 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <h1 className="text-xl font-semibold">Contract Not Found</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          This link may be invalid or has already expired.
        </p>
      </div>
    );
  }

  const isAlreadyAccepted = !!contract.accepted_at || accepted;

  // ── Accepted confirmation ─────────────────────────────────────────────────

  if (isAlreadyAccepted) {
    const acceptedDate = accepted
      ? new Date().toISOString()
      : contract.accepted_at!;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background px-4 text-center">
        <CheckCircle className="w-14 h-14 text-green-600" />
        <h1 className="text-2xl font-bold">Contract Accepted</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          {contract.contract_number} has been accepted on{" "}
          <span className="font-medium text-foreground">
            {format(parseISO(acceptedDate), "MMMM d, yyyy")}
          </span>
          .
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Thank you, {contract.recipient_name}.
        </p>
      </div>
    );
  }

  // ── Preview + Accept CTA ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <FileSignature className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{contract.contract_number}</p>
              <p className="text-xs text-muted-foreground truncate">
                Prepared for {contract.recipient_name}
              </p>
            </div>
          </div>
          <Button
            onClick={handleAccept}
            disabled={acceptM.isPending}
            className="shrink-0"
          >
            {acceptM.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Accepting…
              </>
            ) : (
              "Accept Contract"
            )}
          </Button>
        </div>
      </div>

      {/* Contract preview */}
      <div className="max-w-3xl mx-auto px-2 py-6">
        <ContractPreview
          companyLogo={profile?.company_logo ?? null}
          companyName={profile?.company_name ?? ""}
          companyAddress={profile?.company_address ?? ""}
          companyCity={profile?.company_city ?? ""}
          companyState={profile?.company_state ?? ""}
          companyZip={profile?.company_zip ?? ""}
          companyPhone={profile?.company_phone ?? ""}
          companyEmail={profile?.company_email ?? ""}
          contractNumber={contract.contract_number}
          recipientName={contract.recipient_name}
          startDate={contract.start_date}
          endDate={contract.end_date}
          whoWeAre={contract.who_we_are ?? ""}
          whyChooseUs={contract.why_choose_us ?? ""}
          ourServices={contract.our_services ?? ""}
          serviceCoverage={contract.service_coverage ?? ""}
          sections={contract.sections}
        />
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 bg-white border-t border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            By clicking Accept, you agree to all terms and conditions in this contract.
          </p>
          <Button
            onClick={handleAccept}
            disabled={acceptM.isPending}
            className="shrink-0"
          >
            {acceptM.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Accepting…
              </>
            ) : (
              "Accept Contract"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
