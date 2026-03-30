/**
 * @module ContractPreview
 * CON-11: HTML contract preview rendered as paginated letter-size pages.
 * Uses ContractClause[] so order and custom titles are embedded in the data.
 */
import { format } from "date-fns";
import type { ContractClause } from "../types/contract.types";

export interface ContractPreviewProps {
  companyLogo?: string | null;
  companyName?: string;
  companyAddress?: string;
  companyCity?: string;
  companyState?: string;
  companyZip?: string;
  companyPhone?: string;
  companyEmail?: string;
  contractNumber?: string;
  recipientName?: string;
  startDate?: string;
  endDate?: string;
  whoWeAre?: string;
  whyChooseUs?: string;
  ourServices?: string;
  serviceCoverage?: string;
  sections?: ContractClause[];
}

// ─── Page wrapper ──────────────────────────────────────────────────────────────

function PageWrapper({ children, pageNumber }: { children: React.ReactNode; pageNumber: number }) {
  return (
    <div
      className="bg-white shadow-md mx-auto mb-6 relative"
      style={{ width: "100%", maxWidth: 612, minHeight: 792, padding: "48px 48px 64px" }}
    >
      {children}
      <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] text-gray-400">
        Page {pageNumber}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractPreview({
  companyLogo,
  companyName = "",
  companyAddress = "",
  companyCity = "",
  companyState = "",
  companyZip = "",
  companyPhone = "",
  companyEmail = "",
  contractNumber = "",
  recipientName = "",
  startDate,
  endDate,
  whoWeAre = "",
  whyChooseUs = "",
  ourServices = "",
  serviceCoverage = "",
  sections = [],
}: ContractPreviewProps) {
  const formattedStart = startDate ? format(new Date(startDate), "MMMM dd, yyyy") : "";
  const formattedEnd   = endDate   ? format(new Date(endDate),   "MMMM dd, yyyy") : "";

  // Filter out empty/disabled clauses and group into pages (3 per page)
  const activeClauses = sections.filter((c) => c.body?.trim());
  const clausePages: ContractClause[][] = [];
  for (let i = 0; i < activeClauses.length; i += 3) {
    clausePages.push(activeClauses.slice(i, i + 3));
  }

  return (
    <div className="py-4 px-2">
      {/* ── Page 1: Cover ─────────────────────────────────────────────── */}
      <PageWrapper pageNumber={1}>
        <div className="flex flex-col items-center justify-center h-full" style={{ minHeight: 680 }}>
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="max-w-[200px] max-h-[200px] object-contain mb-8"
            />
          ) : (
            <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center mb-8">
              <span className="text-3xl font-bold text-gray-300">
                {companyName?.charAt(0) || "C"}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">{companyName}</h1>
          <div className="w-16 h-[2px] bg-gray-300 my-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Service Agreement</h2>
          {contractNumber && (
            <p className="text-sm text-gray-500 mb-6">Contract #{contractNumber}</p>
          )}
          <div className="text-center text-sm text-gray-500 space-y-1 mt-4">
            {recipientName && (
              <p>Prepared for: <span className="font-medium text-gray-700">{recipientName}</span></p>
            )}
            {formattedStart && formattedEnd && (
              <p>Period: {formattedStart} — {formattedEnd}</p>
            )}
          </div>
          <div className="text-center text-xs text-gray-400 mt-auto pt-12 space-y-0.5">
            {companyAddress && <p>{companyAddress}</p>}
            {(companyCity || companyState) && (
              <p>{[companyCity, companyState, companyZip].filter(Boolean).join(", ")}</p>
            )}
            {companyPhone && <p>{companyPhone}</p>}
            {companyEmail && <p>{companyEmail}</p>}
          </div>
        </div>
      </PageWrapper>

      {/* ── Page 2: Company Info ───────────────────────────────────────── */}
      {(whoWeAre || whyChooseUs || ourServices || serviceCoverage) && (
        <PageWrapper pageNumber={2}>
          <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
            About {companyName}
          </h2>
          {whoWeAre && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-1.5">Who We Are</h3>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{whoWeAre}</p>
            </div>
          )}
          {whyChooseUs && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-1.5">Why Choose Us</h3>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{whyChooseUs}</p>
            </div>
          )}
          {ourServices && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-1.5">Our Services</h3>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{ourServices}</p>
            </div>
          )}
          {serviceCoverage && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-1.5">Service Coverage</h3>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{serviceCoverage}</p>
            </div>
          )}
        </PageWrapper>
      )}

      {/* ── Pages 3+: Contract Clauses ────────────────────────────────── */}
      {clausePages.map((group, pageIdx) => {
        const companyInfoPageCount = (whoWeAre || whyChooseUs || ourServices || serviceCoverage) ? 1 : 0;
        const pageNumber = 2 + companyInfoPageCount + pageIdx;
        return (
          <PageWrapper key={pageIdx} pageNumber={pageNumber}>
            {pageIdx === 0 && (
              <h2 className="text-lg font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
                Terms & Conditions
              </h2>
            )}
            {group.map((clause) => (
              <div key={clause.key} className="mb-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-1.5">{clause.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{clause.body}</p>
              </div>
            ))}
          </PageWrapper>
        );
      })}

      {/* ── Signature Page ────────────────────────────────────────────── */}
      <PageWrapper pageNumber={clausePages.length + (whoWeAre || whyChooseUs || ourServices || serviceCoverage ? 3 : 2)}>
        <h2 className="text-lg font-bold text-gray-900 mb-8 pb-2 border-b border-gray-200">
          Signatures
        </h2>
        <p className="text-xs text-gray-600 mb-8 leading-relaxed">
          By signing below, both parties acknowledge that they have read, understood, and agree to
          all terms and conditions outlined in this Service Agreement
          {contractNumber ? ` (Contract #${contractNumber})` : ""}.
        </p>
        <div className="grid grid-cols-2 gap-8 mt-12">
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">{companyName}</p>
            <div className="border-b border-gray-400 mt-12 mb-1" />
            <p className="text-[10px] text-gray-500">Authorized Signature</p>
            <div className="border-b border-gray-400 mt-8 mb-1" />
            <p className="text-[10px] text-gray-500">Printed Name</p>
            <div className="border-b border-gray-400 mt-8 mb-1" />
            <p className="text-[10px] text-gray-500">Date</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Client</p>
            <div className="border-b border-gray-400 mt-12 mb-1" />
            <p className="text-[10px] text-gray-500">Authorized Signature</p>
            <div className="border-b border-gray-400 mt-8 mb-1" />
            <p className="text-[10px] text-gray-500">Printed Name</p>
            <div className="border-b border-gray-400 mt-8 mb-1" />
            <p className="text-[10px] text-gray-500">Date</p>
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
