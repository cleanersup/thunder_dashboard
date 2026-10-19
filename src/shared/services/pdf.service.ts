/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PDFService — PDF generation and download for web.
 * Uses jsPDF to generate PDFs and FileService to trigger browser download.
 * Replaces the mobile-specific pdfMobileHelper.ts.
 */

import jsPDF from "jspdf";
import { FileService } from "./file.service";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";
import { normalizeLogo } from "@/shared/utils/pdfLogoHelper";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const _formatCurrency = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
  /** Banner title. Defaults keep estimate PDFs unchanged. */
  documentTitle?:  string;
  /** Label before the number, e.g. "Estimate #" / "Quote #". */
  numberLabel?:    string;
  companyWebsite?: string;
}

export interface EstimateSheetLine {
  description: string;
  qty: number;
  /** null renders as "---" — room rows have no unit price. */
  price: number | null;
  /** null leaves the subtotal cell empty. The package price sits on the first row. */
  amount: number | null;
}

export interface EstimateSheetModel {
  title: string;
  numberLabel: string;
  lines: EstimateSheetLine[];
  discountAmount: number;
  deposit: number;
  pending: number;
  homeSize: string;
  category: string;
}

function sheetNum(source: Record<string, unknown> | undefined, ...keys: string[]): number {
  if (!source) return 0;
  for (const key of keys) {
    const value = source[key];
    if (value === null || value === undefined || value === "") continue;
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

/** Rooms, extras, totals — shared by the PDF and the mobile sheet. */
export function buildEstimateSheet(data: EstimatePDFData): EstimateSheetModel {
  const main = data.mainData ?? {};
  const extra = data.extraServices ?? {};
  const additional = data.additionalData ?? {};
  const rooms: Array<[string, number]> = [
    ["Bedrooms", sheetNum(main, "bedrooms")],
    ["Bathrooms", sheetNum(main, "bathrooms") || sheetNum(main, "fullBaths", "full_baths") + sheetNum(main, "halfBaths", "half_baths")],
    ["Kitchen", sheetNum(main, "kitchens", "kitchen")],
    ["Office", sheetNum(main, "offices")],
    ["Living Room", sheetNum(main, "livingRooms", "living_rooms")],
    ["Dining Room", sheetNum(main, "diningRooms", "dining_rooms")],
  ];
  const extras: Array<[string, number]> = [
    ["Fans", sheetNum(additional, "fans")],
    ["Oven", sheetNum(additional, "oven")],
    ["Refrigerator", sheetNum(additional, "refrigerator")],
    ["Blinds", sheetNum(additional, "blinds")],
    ["Windows Inside", sheetNum(additional, "windowsInside", "windows_inside")],
    ["Windows Outside", sheetNum(additional, "windowsOutside", "windows_outside")],
  ];
  const flags: Array<[string, boolean]> = [
    ["Baseboards", !!(extra.baseboard)],
    ["Patio", !!(extra.patio)],
    ["Walls", !!(extra.walls)],
    ["Stairs", !!(extra.stairs)],
    ["Cabinet Inside", !!(extra.cabinetInside || extra.cabinet_inside)],
    ["Cabinet Outside", !!(extra.cabinetOutside || extra.cabinet_outside)],
    ["Wash Dishes", !!(extra.washDishes || extra.wash_dishes)],
    ["Hallways", !!(extra.hallways)],
    ["Basement", !!(extra.basement)],
  ];

  const lines: EstimateSheetLine[] = [];
  for (const [description, qty] of rooms) {
    if (qty > 0) lines.push({ description, qty, price: null, amount: null });
  }
  for (const [description, qty] of extras) {
    if (qty > 0) lines.push({ description, qty, price: null, amount: null });
  }
  for (const [description, on] of flags) {
    if (on) lines.push({ description, qty: 1, price: null, amount: null });
  }
  if (lines.length === 0) {
    const label = data.serviceType === "Commercial" ? "Commercial Cleaning Services" : "Residential Services";
    lines.push({ description: label, qty: 1, price: data.subtotal, amount: data.subtotal });
  } else {
    lines[0] = { ...lines[0], amount: data.subtotal };
  }

  const discountAmount = data.discountValue && data.discountValue > 0
    ? (data.discountType === "percentage" || data.discountType === "percent"
      ? (data.subtotal * data.discountValue) / 100
      : data.discountValue)
    : 0;

  const depositOn = !!(additional.deposit_required || additional.depositRequired);
  const depositValue = sheetNum(additional, "deposit_value", "depositValue");
  const depositType = String(additional.deposit_type ?? additional.depositType ?? "");
  const deposit = !depositOn || depositValue <= 0
    ? 0
    : (depositType === "percentage" || depositType === "percent"
      ? (data.total * depositValue) / 100
      : depositValue);

  const sqft = sheetNum(main, "squareFootage", "square_footage", "propertySize", "homeSize");
  const homeSize = sqft > 0 ? `${sqft} SQFT` : "";

  const rawLabel = (data.numberLabel ?? "Estimate #").replace("#", "").trim();
  return {
    title: data.documentTitle ?? "PROFESSIONAL CLEANING ESTIMATE",
    numberLabel: rawLabel.toUpperCase(),
    lines,
    discountAmount,
    deposit,
    pending: Math.max(0, data.total - deposit),
    homeSize,
    category: data.serviceSubType ?? "",
  };
}

/**
 * Generates a professional cleaning estimate PDF document.
 * @param data - All estimate data (company, client, service, pricing)
 * @returns jsPDF instance — call `.save(filename)` or `.output('blob')` on it
 */
function money(n: number): string {
  return `$${_formatCurrency(n)}`;
}

function labeled(doc: jsPDF, label: string, value: string, x: number, y: number, maxW: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(label, x, y);
  const labelW = doc.getTextWidth(label);
  doc.setFont("helvetica", "normal");
  const lines = doc.splitTextToSize(value || "", Math.max(20, maxW - labelW));
  doc.text(lines[0] ?? "", x + labelW, y);
  return lines.length > 1 ? lines.slice(1) : [];
}

async function generateEstimatePDF(data: EstimatePDFData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const navy: [number, number, number] = [18, 52, 99];
  const sheet = buildEstimateSheet(data);
  let y = margin;

  doc.setFillColor(...navy);
  doc.rect(margin, y, contentWidth, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(sheet.title, pageWidth / 2, y + 6.6, { align: "center" });
  y += 16;

  const logoSize = 22;
  if (data.companyLogo) {
    try {
      const logo = await normalizeLogo(data.companyLogo);
      if (logo) doc.addImage(logo.data, logo.format, margin, y, logoSize, logoSize);
    } catch { /* ignore a logo the PDF library cannot draw */ }
  }
  const textX = margin + (data.companyLogo ? logoSize + 4 : 0);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.companyName || "", textX, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const companyStreet = data.companyAddress || "";
  const locality = [data.companyCity, data.companyState, data.companyZip].filter(Boolean).join(" , ");
  const phoneStr = formatPhoneDisplay(data.companyPhone);
  const emailStr = data.companyEmail || "";
  const leftColW = Math.max(doc.getTextWidth(companyStreet), doc.getTextWidth(phoneStr));
  const pipeX = textX + leftColW + 3;
  const rightTextX = pipeX + doc.getTextWidth("|") + 3;
  let infoY = y + 12;
  if (companyStreet || locality) {
    if (companyStreet) doc.text(companyStreet, textX, infoY);
    if (companyStreet && locality) doc.text("|", pipeX, infoY);
    if (locality) doc.text(locality, companyStreet ? rightTextX : textX, infoY);
    infoY += 5;
  }
  if (phoneStr || emailStr) {
    if (phoneStr) doc.text(phoneStr, textX, infoY);
    if (phoneStr && emailStr) doc.text("|", pipeX, infoY);
    if (emailStr) doc.text(emailStr, phoneStr ? rightTextX : textX, infoY);
    infoY += 5;
  }
  if (data.companyWebsite) { doc.text(data.companyWebsite, textX, infoY); infoY += 5; }
  y = Math.max(y + logoSize, infoY) + 6;

  const rightX = margin + contentWidth * 0.58;
  const colW = pageWidth - margin - rightX;
  let leftY = y;
  let rightY = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CUSTOMER INFORMATION", margin, leftY);
  leftY += 7;
  const street = [data.clientAddress, data.clientApt].filter(Boolean).join(" ");
  const clientCity = [data.clientCity, [data.clientState, data.clientZip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  labeled(doc, "Name : ", data.clientName, margin, leftY, colW); leftY += 5;
  labeled(doc, "Phone : ", formatPhoneDisplay(data.clientPhone), margin, leftY, colW); leftY += 5;
  labeled(doc, "Email : ", data.clientEmail, margin, leftY, colW); leftY += 5;
  labeled(doc, "Address : ", street, margin, leftY, colW); leftY += 5;
  if (clientCity) { doc.setFont("helvetica", "normal"); doc.text(clientCity, margin, leftY); leftY += 5; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${sheet.numberLabel} : ${data.estimateNumber}`, rightX, rightY);
  rightY += 7;
  doc.setFontSize(10);
  doc.text("SERVICE DETAILS", rightX, rightY);
  rightY += 6;
  labeled(doc, "Date : ", data.estimateDate, rightX, rightY, colW); rightY += 5;
  labeled(doc, "Type of service : ", data.serviceType, rightX, rightY, colW); rightY += 5;
  if (sheet.category) { labeled(doc, "Category : ", sheet.category, rightX, rightY, colW); rightY += 5; }
  if (sheet.homeSize) { labeled(doc, "Home Size : ", sheet.homeSize, rightX, rightY, colW); rightY += 5; }

  y = Math.max(leftY, rightY) + 4;

  const cols = [14, 78, 28, 22, contentWidth - 14 - 78 - 28 - 22];
  const headers = ["ITEM", "DESCRIPTION", "PRICE", "QTY", "SUBTOTAL"];
  const rowH = 7;
  const drawHeader = () => {
    if (y > pageHeight - 40) { doc.addPage(); y = margin; }
    doc.setFillColor(...navy);
    doc.rect(margin, y, contentWidth, rowH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    let x = margin;
    headers.forEach((label, i) => {
      const align = i === 0 ? "left" : "center";
      const tx = i === 0 ? x + 2 : x + cols[i] / 2;
      doc.text(label, tx, y + 4.6, { align });
      x += cols[i];
    });
    y += rowH;
  };
  drawHeader();

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  sheet.lines.forEach((line, index) => {
    if (y > pageHeight - 28) { doc.addPage(); y = margin; drawHeader(); doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(8); }
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);
    let x = margin;
    const cells = [
      String(index + 1),
      line.description,
      line.price == null ? "---" : money(line.price),
      String(line.qty),
      line.amount == null ? "" : money(line.amount),
    ];
    cells.forEach((cell, i) => {
      doc.rect(x, y, cols[i], rowH);
      const align = i >= 2 ? "center" : "left";
      const tx = i >= 2 ? x + cols[i] / 2 : x + 2;
      doc.text(cell, tx, y + 4.6, { align });
      x += cols[i];
    });
    y += rowH;
  });

  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const amountRight = pageWidth - margin - 1.5;
  const amountColW = 22;
  const labelGap = 3;
  const labelW = Math.max(...["Subtotal :", "Discount :", "Deposit :", "Pending :", "Total :"].map((label) => doc.getTextWidth(label)));
  const labelX = amountRight - amountColW - labelGap - labelW;
  const drawTotalRow = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(label, labelX, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, amountRight, y, { align: "right" });
    y += 6;
  };
  drawTotalRow("Subtotal :", money(data.subtotal));
  drawTotalRow("Discount :", money(sheet.discountAmount));
  y += 1;
  const totalH = 8;
  const barLeft = labelX - 1.5;
  const valueBoxLeft = amountRight - amountColW;
  doc.setFillColor(...navy);
  doc.rect(barLeft, y - 5, valueBoxLeft - barLeft, totalH, "F");
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.1);
  doc.rect(valueBoxLeft, y - 5, pageWidth - margin - valueBoxLeft, totalH);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Total :", labelX, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(money(data.total), amountRight, y, { align: "right" });
  y += 10;
  drawTotalRow("Deposit :", money(sheet.deposit));
  drawTotalRow("Pending :", money(sheet.pending));

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
