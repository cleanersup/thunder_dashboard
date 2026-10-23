/**
 * Invoice sheet. Same layout as the estimate PDF: navy banner, company block,
 * customer column, number block on the right edge of the table, totals, notes, footer.
 */
import jsPDF from "jspdf";
import { normalizeLogo } from "@/shared/utils/pdfLogoHelper";
import { drawInitialsLogo } from "@/shared/services/pdfInitialsLogo";
import { formatPhoneDisplay } from "@/shared/utils/phoneInput";

const formatCurrency = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface InvoicePDFData {
  companyLogo?: string;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyStreet: string;
  companyApt?: string;
  companyCity: string;
  companyState: string;
  companyZip: string;
  companyWebsite?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress?: string;
  clientApt?: string;
  clientCity?: string;
  clientState?: string;
  clientZip?: string;
  invoiceNumber: string;
  invoiceName?: string;
  invoiceDate: string;
  dueDate: string;
  status?: string;
  lineItems: Array<{
    description: string;
    price: number;
    qty: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType?: string;
  discountValue?: number;
  discountAmount: number;
  total: number;
  notes?: string;
}

function money(n: number): string {
  return `$${formatCurrency(n || 0)}`;
}

function taxLabel(rate: number): string {
  const n = Number(rate) || 0;
  const text = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  return `Tax ${text} % :`;
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
  return lines.slice(1) as string[];
}

function drawSheetFooter(doc: jsPDF, pageWidth: number, pageHeight: number, navy: [number, number, number], contentBottom: number) {
  let footerY = pageHeight - 12;
  if (contentBottom > footerY - 8) footerY = contentBottom + 10;
  if (footerY > pageHeight - 8) {
    doc.addPage();
    footerY = pageHeight - 12;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  const brand = "Service Provide By Thunder Pro Inc";
  const site = "www.thunderpro.co";
  const gap = 10;
  const brandW = doc.getTextWidth(brand);
  const x = (pageWidth - brandW - gap - doc.getTextWidth(site)) / 2;
  doc.text(brand, x, footerY);
  doc.textWithLink(site, x + brandW + gap, footerY, { url: "https://www.thunderpro.co" });
}

export async function generateInvoicePDF(data: InvoicePDFData): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const navy: [number, number, number] = [18, 52, 99];
  let y = margin;

  doc.setFillColor(...navy);
  doc.rect(margin, y, contentWidth, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("INVOICE", pageWidth / 2, y + 6.6, { align: "center" });
  y += 16;

  const logoSize = 22;
  let drewLogo = false;
  if (data.companyLogo) {
    try {
      const logo = await normalizeLogo(data.companyLogo);
      if (logo) {
        doc.addImage(logo.data, logo.format, margin, y, logoSize, logoSize);
        drewLogo = true;
      }
    } catch { /* a logo the PDF library cannot draw falls through to initials */ }
  }
  if (!drewLogo) drewLogo = drawInitialsLogo(doc, margin, y, logoSize, data.companyName || "");
  const textX = margin + (drewLogo ? logoSize + 4 : 0);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.companyName || "", textX, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const companyStreet = [data.companyStreet, data.companyApt].filter(Boolean).join(" ");
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

  const taxText = taxLabel(data.taxRate);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const numberLine = `INVOICE : ${data.invoiceNumber}`;
  let blockW = doc.getTextWidth(numberLine);
  const pairW = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const labelWidth = doc.getTextWidth(label);
    doc.setFont("helvetica", "normal");
    return labelWidth + doc.getTextWidth(value || "");
  };
  blockW = Math.max(
    blockW,
    pairW("Date : ", data.invoiceDate),
    pairW("Issue Date : ", data.invoiceDate),
    pairW("Due Date : ", data.dueDate),
    data.invoiceName ? pairW("Title : ", data.invoiceName) : 0,
  );
  const rightX = Math.max(margin + 78, pageWidth - margin - blockW);
  const colW = pageWidth - margin - rightX;
  const customerColW = Math.max(40, rightX - margin - 4);
  let leftY = y;
  let rightY = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CUSTOMER INFORMATION", margin, leftY);
  leftY += 7;
  const street = [data.clientAddress, data.clientApt].filter(Boolean).join(" ");
  const clientCity = [data.clientCity, [data.clientState, data.clientZip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  labeled(doc, "Name : ", data.clientName, margin, leftY, customerColW); leftY += 5;
  labeled(doc, "Phone : ", formatPhoneDisplay(data.clientPhone), margin, leftY, customerColW); leftY += 5;
  labeled(doc, "Email : ", data.clientEmail, margin, leftY, customerColW); leftY += 5;
  labeled(doc, "Address : ", street, margin, leftY, customerColW); leftY += 5;
  if (clientCity) { doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(clientCity, margin, leftY); leftY += 5; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(numberLine, rightX, rightY);
  rightY += 7;
  labeled(doc, "Date : ", data.invoiceDate, rightX, rightY, colW); rightY += 5;
  labeled(doc, "Issue Date : ", data.invoiceDate, rightX, rightY, colW); rightY += 5;
  labeled(doc, "Due Date : ", data.dueDate, rightX, rightY, colW); rightY += 5;
  if (data.invoiceName) {
    const extra = labeled(doc, "Title : ", data.invoiceName, rightX, rightY, colW);
    rightY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    extra.forEach((line) => { doc.text(line, rightX, rightY); rightY += 5; });
  }

  y = Math.max(leftY, rightY) + 4;

  const cols = [14, 78, 28, 22, contentWidth - 14 - 78 - 28 - 22];
  const headers = ["ITEM", "DESCRIPTION", "PRICE", "QTY", "SUBTOTAL"];
  const rowH = 7;
  const lines = data.lineItems.length > 0
    ? data.lineItems
    : [{ description: data.invoiceName || "Services", price: data.subtotal, qty: 1, total: data.subtotal }];
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
  lines.forEach((line, index) => {
    if (y > pageHeight - 28) {
      doc.addPage(); y = margin; drawHeader();
      doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    }
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);
    const cells = [
      String(index + 1),
      line.description,
      money(line.price),
      String(line.qty),
      money(line.total),
    ];
    let x = margin;
    cells.forEach((cell, i) => {
      doc.rect(x, y, cols[i], rowH);
      const align = i >= 2 ? "center" : "left";
      const tx = i >= 2 ? x + cols[i] / 2 : x + 2;
      doc.text(String(cell), tx, y + 4.6, { align });
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
  const totalLabels = ["Subtotal :", "Discount :", taxText, "Total :"];
  const labelW = Math.max(...totalLabels.map((label) => doc.getTextWidth(label)));
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
  drawTotalRow("Discount :", money(data.discountAmount));
  drawTotalRow(taxText, money(data.taxAmount));
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
  y += 14;

  if (data.notes?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const notesLabel = "Notes : ";
    doc.text(notesLabel, margin, y);
    const notesX = margin + doc.getTextWidth(notesLabel);
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(data.notes.trim(), pageWidth - margin - notesX);
    doc.text(notesLines[0] ?? "", notesX, y);
    y += 5;
    if (notesLines.length > 1) {
      const rest = doc.splitTextToSize(notesLines.slice(1).join(" "), contentWidth);
      rest.forEach((line: string) => { doc.text(line, margin, y); y += 5; });
    }
  }

  drawSheetFooter(doc, pageWidth, pageHeight, navy, y);
  return doc;
}
