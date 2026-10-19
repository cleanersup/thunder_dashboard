import { useEffect, useState } from "react";
import { EstimateSheetView } from "../components/EstimateSheetView";
import { PDFService, type EstimatePDFData } from "@/shared/services/pdf.service";

const LOGO =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="38" fill="#0b2a4a" stroke="#e8a317" stroke-width="4"/>
      <text x="40" y="44" text-anchor="middle" fill="white" font-size="11" font-family="Arial" font-weight="700">LOGO</text>
    </svg>`,
  );

/** Sample from the design sheet, so the preview can be compared with it. */
const SAMPLE: EstimatePDFData = {
  companyLogo: LOGO,
  companyName: "Clean Up Company LLC",
  companyPhone: "3237929215",
  companyEmail: "info@cleanersup.com",
  companyAddress: "818 W Huntington Dr",
  companyCity: "Arcadia",
  companyState: "CA",
  companyZip: "91007",
  companyWebsite: "www.cleanersup.com",
  clientName: "Javier Silva",
  clientPhone: "2134644428",
  clientEmail: "javiers058@gmail.com",
  clientAddress: "818 West Huntington Drive",
  clientCity: "Arcadia",
  clientState: "CA",
  clientZip: "91007",
  estimateNumber: "EST-2026-089",
  estimateDate: "May 22, 2025",
  documentTitle: "PROFESSIONAL CLEANING ESTIMATE",
  numberLabel: "Estimate #",
  serviceType: "Residential",
  serviceSubType: "Deep Cleaning",
  mainData: {
    bedrooms: 3,
    bathrooms: 2,
    kitchens: 1,
    offices: 1,
    livingRooms: 1,
    diningRooms: 1,
    squareFootage: 1800,
  },
  additionalData: { deposit_required: true, deposit_value: 80, deposit_type: "fixed" },
  subtotal: 200,
  discountType: "fixed",
  discountValue: 20,
  total: 180,
};

/**
 * Local-only preview of the estimate sheet and the PDF it produces.
 * Not linked from the app. Dev server only.
 */
export function EstimateSheetPreviewPage() {
  const [mode, setMode] = useState<"sheet" | "pdf">("sheet");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      const doc = await PDFService.generateEstimatePDF(SAMPLE);
      if (cancelled) return;
      url = URL.createObjectURL(doc.output("blob"));
      setPdfUrl(url);
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <div className="min-h-screen bg-muted">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background px-3 py-2">
        <p className="text-sm text-muted-foreground">Sample data — same layout the customer receives</p>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${mode === "sheet" ? "bg-primary text-primary-foreground" : "border border-border"}`}
            onClick={() => setMode("sheet")}
          >
            Sheet
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${mode === "pdf" ? "bg-primary text-primary-foreground" : "border border-border"}`}
            onClick={() => setMode("pdf")}
          >
            PDF
          </button>
        </div>
      </div>
      {mode === "sheet" ? (
        <div className="py-4">
          <EstimateSheetView data={SAMPLE} />
        </div>
      ) : pdfUrl ? (
        <iframe title="Estimate PDF" src={pdfUrl} className="h-[calc(100vh-49px)] w-full border-0 bg-white" />
      ) : (
        <p className="p-6 text-sm text-muted-foreground">Preparing PDF…</p>
      )}
    </div>
  );
}

export default EstimateSheetPreviewPage;
