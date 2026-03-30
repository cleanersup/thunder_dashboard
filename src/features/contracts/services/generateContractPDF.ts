/**
 * @module generateContractPDF
 * CON-11: jsPDF-based contract PDF generator.
 * Adapted from thunder-web-version to use ContractClause[] instead of Record<string,string>.
 */
import jsPDF from "jspdf";
import { format } from "date-fns";
import type { ContractClause } from "../types/contract.types";

export interface ContractPDFData {
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

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_WIDTH    = 612;
const PAGE_HEIGHT   = 792;
const MARGIN        = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addPageNumber(doc: jsPDF, pageNum: number) {
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(`Page ${pageNum}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 24, { align: "center" });
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  if (!text) return [];
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    if (para.trim() === "") { lines.push(""); continue; }
    lines.push(...doc.splitTextToSize(para, maxWidth));
  }
  return lines;
}

function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ─── Main generator ───────────────────────────────────────────────────────────

export async function generateContractPdf(data: ContractPDFData): Promise<jsPDF> {
  const doc     = new jsPDF({ unit: "pt", format: [PAGE_WIDTH, PAGE_HEIGHT] });
  let pageNum   = 1;

  const formattedStart = data.startDate ? format(new Date(data.startDate), "MMMM dd, yyyy") : "";
  const formattedEnd   = data.endDate   ? format(new Date(data.endDate),   "MMMM dd, yyyy") : "";
  const centerX        = PAGE_WIDTH / 2;

  // ── Page 1: Cover ────────────────────────────────────────────────────────
  let logoBase64: string | null = null;
  if (data.companyLogo) logoBase64 = await loadImageAsBase64(data.companyLogo);

  let coverY = 200;
  if (logoBase64) {
    try { doc.addImage(logoBase64, "PNG", centerX - 60, coverY, 120, 120); coverY += 140; }
    catch { coverY += 20; }
  } else {
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(centerX - 48, coverY, 96, 96, 8, 8, "F");
    doc.setFontSize(24);
    doc.setTextColor(200, 200, 200);
    doc.text(data.companyName?.charAt(0) || "C", centerX, coverY + 58, { align: "center" });
    coverY += 116;
  }

  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(data.companyName || "", centerX, coverY, { align: "center" });
  coverY += 30;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(1);
  doc.line(centerX - 32, coverY, centerX + 32, coverY);
  coverY += 20;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("Service Agreement", centerX, coverY, { align: "center" });
  coverY += 18;

  if (data.contractNumber) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 130, 130);
    doc.text(`Contract #${data.contractNumber}`, centerX, coverY, { align: "center" });
    coverY += 40;
  } else {
    coverY += 40;
  }

  if (data.recipientName) {
    doc.setFontSize(10);
    doc.setTextColor(130, 130, 130);
    doc.text("Prepared for:", centerX, coverY, { align: "center" });
    coverY += 14;
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "bold");
    doc.text(data.recipientName, centerX, coverY, { align: "center" });
    coverY += 18;
  }

  if (formattedStart && formattedEnd) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 130, 130);
    doc.text(`Period: ${formattedStart} — ${formattedEnd}`, centerX, coverY, { align: "center" });
  }

  let footerY = PAGE_HEIGHT - 80;
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.setFont("helvetica", "normal");
  if (data.companyAddress) { doc.text(data.companyAddress, centerX, footerY, { align: "center" }); footerY += 12; }
  const cityLine = [data.companyCity, data.companyState, data.companyZip].filter(Boolean).join(", ");
  if (cityLine)           { doc.text(cityLine,            centerX, footerY, { align: "center" }); footerY += 12; }
  if (data.companyPhone)  { doc.text(data.companyPhone,   centerX, footerY, { align: "center" }); footerY += 12; }
  if (data.companyEmail)  { doc.text(data.companyEmail,   centerX, footerY, { align: "center" }); }

  addPageNumber(doc, pageNum);

  // ── Page 2: About Company ────────────────────────────────────────────────
  const aboutSections = [
    { title: "Who We Are",       content: data.whoWeAre },
    { title: "Why Choose Us",    content: data.whyChooseUs },
    { title: "Our Services",     content: data.ourServices },
    { title: "Service Coverage", content: data.serviceCoverage },
  ].filter((s) => s.content?.trim());

  if (aboutSections.length > 0) {
    doc.addPage();
    pageNum++;
    let y = MARGIN;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`About ${data.companyName || ""}`, MARGIN, y + 14);
    y += 24;
    doc.setDrawColor(230, 230, 230);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 20;

    for (const section of aboutSections) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text(section.title, MARGIN, y);
      y += 14;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      for (const line of wrapText(doc, section.content!, CONTENT_WIDTH)) {
        if (y > PAGE_HEIGHT - 60) { addPageNumber(doc, pageNum); doc.addPage(); pageNum++; y = MARGIN; }
        doc.text(line, MARGIN, y);
        y += 12;
      }
      y += 10;
    }

    addPageNumber(doc, pageNum);
  }

  // ── Pages 3+: Clauses ────────────────────────────────────────────────────
  const activeClauses = (data.sections ?? []).filter((c) => c.body?.trim());

  if (activeClauses.length > 0) {
    doc.addPage();
    pageNum++;
    let y = MARGIN;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Terms & Conditions", MARGIN, y + 14);
    y += 24;
    doc.setDrawColor(230, 230, 230);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 20;

    for (const clause of activeClauses) {
      if (y > PAGE_HEIGHT - 100) { addPageNumber(doc, pageNum); doc.addPage(); pageNum++; y = MARGIN; }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 50, 50);
      doc.text(clause.title, MARGIN, y);
      y += 14;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      for (const line of wrapText(doc, clause.body, CONTENT_WIDTH)) {
        if (y > PAGE_HEIGHT - 60) { addPageNumber(doc, pageNum); doc.addPage(); pageNum++; y = MARGIN; }
        doc.text(line, MARGIN, y);
        y += 12;
      }
      y += 14;
    }

    addPageNumber(doc, pageNum);
  }

  // ── Signature Page ───────────────────────────────────────────────────────
  doc.addPage();
  pageNum++;
  let y = MARGIN;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text("Signatures", MARGIN, y + 14);
  y += 24;
  doc.setDrawColor(230, 230, 230);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 24;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const sigText = `By signing below, both parties acknowledge that they have read, understood, and agree to all terms and conditions outlined in this Service Agreement${data.contractNumber ? ` (Contract #${data.contractNumber})` : ""}.`;
  for (const line of wrapText(doc, sigText, CONTENT_WIDTH)) { doc.text(line, MARGIN, y); y += 12; }
  y += 40;

  const colWidth = CONTENT_WIDTH / 2 - 16;
  const col1X    = MARGIN;
  const col2X    = MARGIN + colWidth + 32;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text(data.companyName || "", col1X, y);
  doc.text("Client", col2X, y);
  y += 60;

  for (const [label, xArr] of [
    ["Authorized Signature", [col1X, col2X]],
    ["Printed Name",         [col1X, col2X]],
    ["Date",                 [col1X, col2X]],
  ] as [string, number[]][]) {
    doc.setDrawColor(160, 160, 160);
    doc.line(xArr[0], y, xArr[0] + colWidth, y);
    doc.line(xArr[1], y, xArr[1] + colWidth, y);
    y += 12;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 130, 130);
    doc.text(label, xArr[0], y);
    doc.text(label, xArr[1], y);
    y += 40;
  }

  addPageNumber(doc, pageNum);

  return doc;
}

export async function downloadContractPdf(data: ContractPDFData): Promise<void> {
  const doc = await generateContractPdf(data);
  doc.save(`Contract_${data.contractNumber || "draft"}.pdf`);
}
