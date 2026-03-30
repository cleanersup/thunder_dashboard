/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PDFService — PDF generation and download for web.
 * Uses jsPDF to generate PDFs and FileService to trigger browser download.
 * Replaces the mobile-specific pdfMobileHelper.ts.
 */

import jsPDF from "jspdf";
import { FileService } from "./file.service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const _formatCurrency = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const _translateToEnglish = (value: string | number | boolean): string => {
  if (typeof value !== "string") return String(value);
  const map: Record<string, string> = {
    bajo: "low", medio: "medium", alto: "high",
    diurno: "day shift", nocturno: "night shift", madrugada: "early morning",
    limpio: "clean", sucio: "dirty", "muy sucio": "very dirty",
    restaurante: "restaurant", oficina: "office", tienda: "store",
    "una vez": "one-time", semanal: "weekly", mensual: "monthly",
    meses: "months", semanas: "weeks", dias: "days", "años": "years",
    ventanas: "windows", campanas: "hoods", refrigeradores: "refrigerators",
  };
  if (value.includes(",")) {
    const unique = new Set(value.split(",").map((s) => { const t = s.trim(); return map[t.toLowerCase()] ?? t; }));
    return Array.from(unique).join(", ");
  }
  return map[value.toLowerCase()] ?? value;
};

// ─── Estimate PDF ─────────────────────────────────────────────────────────────

export interface EstimatePDFData {
  companyLogo?:    string;
  companyName:     string;
  companyPhone:    string;
  companyEmail:    string;
  companyAddress:  string;
  companyCity:     string;
  companyState:    string;
  companyZip:      string;
  clientName:      string;
  clientPhone:     string;
  clientEmail:     string;
  clientAddress:   string;
  clientApt?:      string;
  clientCity:      string;
  clientState:     string;
  clientZip:       string;
  estimateNumber:  string;
  estimateDate:    string;
  serviceType:     string;
  serviceSubType?: string;
  serviceScope?:   string;
  mainData?:       Record<string, any>;
  additionalData?: Record<string, any>;
  extraServices?:  Record<string, boolean>;
  subtotal:        number;
  discountType?:   string;
  discountValue?:  number;
  total:           number;
}

/**
 * Generates a professional cleaning estimate PDF document.
 * @param data - All estimate data (company, client, service, pricing)
 * @returns jsPDF instance — call `.save(filename)` or `.output('blob')` on it
 */
async function generateEstimatePDF(data: EstimatePDFData): Promise<jsPDF> {
  const doc          = new jsPDF();
  const pageWidth    = doc.internal.pageSize.getWidth();
  const pageHeight   = doc.internal.pageSize.getHeight();
  const margin       = 20;
  const contentWidth = pageWidth - margin * 2;
  let   yPos         = margin;

  const primary: [number, number, number] = [30, 58, 138]; // #1e3a8a

  // Logo
  if (data.companyLogo) {
    try { doc.addImage(data.companyLogo, "PNG", margin, yPos, 30, 30); } catch { /* ignore */ }
  }

  // Title banner
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const titleText = "PROFESSIONAL CLEANING ESTIMATE";
  const titleW    = doc.getTextWidth(titleText);
  const pad       = 5;
  const titleCW   = titleW + pad * 2;
  const titleX    = pageWidth - margin - titleCW;
  const titleY    = yPos + 8;
  doc.setFillColor(...primary);
  doc.rect(titleX, titleY - 8, titleCW, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(titleText, titleX + pad, titleY);
  yPos += 25;

  // Date + Estimate #
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  const dateText = `Date: ${data.estimateDate}`;
  const estText  = `Estimate #: ${data.estimateNumber}`;
  const dateW    = doc.getTextWidth(dateText);
  doc.text(dateText, pageWidth - margin, yPos, { align: "right" });
  const sepX = pageWidth - margin - dateW - 8;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.line(sepX, yPos - 3, sepX, yPos + 2);
  doc.text(estText, sepX - 5, yPos, { align: "right" });
  yPos += 8;

  doc.setDrawColor(...primary);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Two-column: Company | Client
  const colW  = contentWidth / 2 - 5;
  const col2X = margin + colW + 10;
  let leftY = yPos, rightY = yPos;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primary);
  doc.text("Service Provider", margin, leftY); leftY += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  if (data.companyName) { doc.text(data.companyName.toUpperCase(), margin, leftY); leftY += 5; }
  if (data.companyPhone) { doc.text(data.companyPhone, margin, leftY); leftY += 5; }
  if (data.companyEmail) { doc.text(data.companyEmail, margin, leftY); leftY += 5; }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primary);
  doc.text("Client Information", col2X, rightY); rightY += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text(data.clientName, col2X, rightY); rightY += 5;
  doc.text(data.clientPhone, col2X, rightY); rightY += 5;
  doc.text(data.clientEmail, col2X, rightY); rightY += 5;
  const addr = `${data.clientAddress}${data.clientApt ? " " + data.clientApt : ""}, ${data.clientCity}, ${data.clientState} ${data.clientZip}`;
  doc.splitTextToSize(addr, colW).forEach((l: string) => { doc.text(l, col2X, rightY); rightY += 5; });
  yPos = Math.max(leftY, rightY) + 3;

  // Service Details
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primary);
  doc.text("Service Details", margin + 3, yPos + 5.5);
  yPos += 16;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text(`Service Type: ${data.serviceType}`, margin + 3, yPos); yPos += 5;
  if (data.serviceSubType) { doc.text(`Service Category: ${data.serviceSubType}`, margin + 3, yPos); yPos += 5; }

  // Breakdown columns
  if (data.mainData || data.additionalData || data.extraServices) {
    if (yPos > pageHeight - 100) { doc.addPage(); yPos = margin; }
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, contentWidth, 8, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primary);
    doc.text("Service Breakdown", margin + 3, yPos + 5.5);
    yPos += 16;

    const c1X = margin + 3, c2X = margin + 60, c3X = margin + 120;
    const c1Y = yPos, c2Y = yPos, c3Y = yPos;

    const renderBdCol = (colData: Record<string, any>, startX: number, yRef: { v: number }, header: string) => {
      if (!colData || !Object.keys(colData).length) return;
      doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text(header, startX, yRef.v); yRef.v += 4;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      Object.entries(colData).forEach(([key, value]) => {
        const skip = ["employees", "hourlyRate", "selectedWeekDays"];
        if (data.serviceType === "Commercial" && skip.includes(key)) return;
        if (!value) return;
        const label = key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
        let fVal = _translateToEnglish(value);
        if (key === "cleaningDuration") fVal = `${value} Hours`;
        else if (key === "propertySize") fVal = `${value} sq ft`;
        else if (key === "contractDuration") fVal = `${value} ${_translateToEnglish(data.mainData?.contractTimeUnit || "")}`;
        const row = (data.serviceType === "Commercial" && typeof value !== "boolean")
          ? `• ${label}: ${fVal}`
          : `${typeof value === "number" ? value : 1}x • ${label}`;
        doc.splitTextToSize(row, 52).forEach((l: string) => { doc.text(l, startX, yRef.v); yRef.v += 3.5; });
      });
    };

    const r1 = { v: c1Y }, r2 = { v: c2Y }, r3 = { v: c3Y };
    if (data.mainData)       renderBdCol(data.mainData,       c1X, r1, "Main Services:");
    if (data.additionalData) renderBdCol(data.additionalData, c2X, r2, "Additional Services:");
    if (data.extraServices) {
      const enabled = Object.entries(data.extraServices).filter(([, v]) => v === true);
      if (enabled.length) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.text("Extra Services:", c3X, r3.v); r3.v += 4;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        enabled.forEach(([key]) => {
          const label = key.replace(/([A-Z])/g, " $1").trim().replace(/\b\w/g, (c) => c.toUpperCase());
          doc.splitTextToSize(`1x • ${label}`, 52).forEach((l: string) => { doc.text(l, c3X, r3.v); r3.v += 3.5; });
        });
      }
    }
    yPos = Math.max(r1.v, r2.v, r3.v) + 8;
  }

  // Scope of work
  if (data.serviceScope) {
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos, contentWidth, 8, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primary);
    doc.text("Scope of Work", margin + 3, yPos + 5.5);
    yPos += 11;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.splitTextToSize(data.serviceScope, contentWidth - 6).forEach((l: string) => {
      if (yPos > pageHeight - 60) { doc.addPage(); yPos = margin; }
      doc.text(l, margin + 3, yPos); yPos += 5;
    });
    yPos += 10;
  }

  // Pricing table
  const pt1X = margin + 3, pt2X = margin + 75, pt3X = margin + 120, pt4X = margin + 145;
  const tableStartY = yPos;
  doc.setFillColor(...primary);
  doc.rect(margin, yPos - 5, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Title",    pt1X, yPos);
  doc.text("Price",    pt2X, yPos);
  doc.text("QTY",      pt3X, yPos);
  doc.text("Subtotal", pt4X, yPos);
  yPos += 10;

  const svcTitle = data.serviceType === "Commercial" ? "Commercial Cleaning Services" : "Residential Services";
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(svcTitle,                              pt1X, yPos);
  doc.text(`$${_formatCurrency(data.subtotal)}`,  pt2X, yPos);
  doc.text("1",                                   pt3X, yPos);
  doc.text(`$${_formatCurrency(data.subtotal)}`,  pt4X, yPos);
  yPos += 8;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(margin, tableStartY - 5, contentWidth, 18);
  yPos += 3;

  // Discount + total
  const priceX = pageWidth - margin - 50;
  const valX   = pageWidth - margin - 5;
  if (data.discountValue && data.discountValue > 0) {
    const discAmt   = data.discountType === "percentage" ? (data.subtotal * data.discountValue) / 100 : data.discountValue;
    const discLabel = data.discountType === "percentage" ? `Discount (${data.discountValue}%):` : "Discount:";
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(5, 150, 105);
    doc.text(discLabel, priceX, yPos);
    doc.text(`-$${_formatCurrency(discAmt)}`, valX, yPos, { align: "right" });
    yPos += 8;
  }
  yPos += 3;
  const totalCW = 65;
  const totalX  = pageWidth - margin - totalCW;
  doc.setFillColor(...primary);
  doc.rect(totalX, yPos - 5, totalCW, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Total:", totalX + 5, yPos);
  doc.text(`$${_formatCurrency(data.total)}`, totalX + totalCW - 5, yPos, { align: "right" });

  // Footer
  const footY = pageHeight - 30;
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.3);
  doc.line(margin, footY, pageWidth - margin, footY);
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Service provided by", pageWidth / 2, footY + 6, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primary);
  doc.text("© 2024 Thunder Pro Inc.", pageWidth / 2, footY + 11, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("www.thunderpro.co", pageWidth / 2, footY + 16, { align: "center" });

  return doc;
}

/**
 * Generates a PDF from an HTML element and downloads it in the browser.
 * @param element - The DOM element to render as PDF
 * @param filename - Output filename (e.g. "invoice-123.pdf")
 * @example
 * await PDFService.downloadFromElement(document.getElementById("invoice-preview"), "invoice-123.pdf");
 */
async function downloadFromElement(element: HTMLElement, filename: string): Promise<void> {
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = (canvas.height * pageWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
  const blob = pdf.output("blob");
  FileService.downloadBlob(blob, filename);
}

/**
 * Generates a PDF from raw jsPDF instance and downloads it.
 * @param doc - A configured jsPDF document instance
 * @param filename - Output filename (e.g. "estimate-001.pdf")
 */
function downloadFromDoc(doc: jsPDF, filename: string): void {
  const blob = doc.output("blob");
  FileService.downloadBlob(blob, filename);
}

export const PDFService = { downloadFromElement, downloadFromDoc, generateEstimatePDF };
