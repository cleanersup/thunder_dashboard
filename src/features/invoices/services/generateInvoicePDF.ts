/**
 * @module generateInvoicePDF
 * Generates a single-page jsPDF invoice document.
 * Ported from swift-slate/src/lib/pdfGenerator.ts — generateInvoicePDF.
 */
import jsPDF from "jspdf";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Interface ────────────────────────────────────────────────────────────────

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
  clientName: string;
  clientPhone: string;
  clientEmail: string;
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

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Build a jsPDF invoice document from the given data.
 * Call `.save(filename)` on the returned instance to trigger download.
 *
 * @param data - Invoice data to render
 * @returns jsPDF instance
 */
export const generateInvoicePDF = (data: InvoicePDFData): jsPDF => {
  const doc       = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin     = 20;
  const contentWidth = pageWidth - margin * 2;

  // Blue color scheme matching swift-slate
  const blue: [number, number, number] = [79, 129, 189];

  let yPosition = margin;
  const topSectionY = yPosition - 5;

  // ── Company logo (left) ────────────────────────────────────────────────────
  if (data.companyLogo) {
    try {
      doc.addImage(data.companyLogo, "PNG", margin, topSectionY, 25, 25);
    } catch { /* non-fatal */ }
  }

  // ── INVOICE title + meta (right) ──────────────────────────────────────────
  const rightX = pageWidth - margin;
  let rightY = topSectionY + 5;

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(blue[0], blue[1], blue[2]);
  const invoiceTextWidth = doc.getTextWidth("INVOICE");
  doc.text("INVOICE", rightX, rightY, { align: "right" });

  if (data.status) {
    const statusText  = data.status.toUpperCase();
    const statusColor: [number, number, number] =
      data.status.toLowerCase() === "paid" ? [46, 125, 50] : [255, 152, 0];

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const statusWidth = doc.getTextWidth(statusText) + 6;
    const statusX = rightX - invoiceTextWidth - statusWidth - 5;

    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.rect(statusX, rightY - 7, statusWidth, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(statusText, statusX + 3, rightY - 2);
  }
  rightY += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text(data.invoiceDate, rightX, rightY, { align: "right" });
  rightY += 8;

  doc.setFontSize(9);
  doc.text(`Due Date: ${data.dueDate}`, rightX, rightY, { align: "right" });
  rightY += 6;
  doc.text(`Invoice #: ${data.invoiceNumber}`, rightX, rightY, { align: "right" });
  rightY += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Client Information", rightX, rightY, { align: "right" });
  rightY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.clientName,  rightX, rightY, { align: "right" }); rightY += 5;
  doc.text(data.clientPhone, rightX, rightY, { align: "right" }); rightY += 5;
  doc.text(data.clientEmail, rightX, rightY, { align: "right" });

  // ── Company info (left) ───────────────────────────────────────────────────
  yPosition = topSectionY + 28;
  let leftY = yPosition;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Company Information", margin, leftY); leftY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.companyName.toUpperCase(), margin, leftY); leftY += 5;
  doc.text(data.companyPhone, margin, leftY); leftY += 5;
  doc.text(data.companyEmail, margin, leftY); leftY += 5;
  doc.text(`${data.companyCity}, ${data.companyState}, ${data.companyZip}`, margin, leftY); leftY += 5;

  if (data.invoiceName) {
    doc.setFont("helvetica", "bold");
    doc.text("Invoice Name:", margin, leftY);
    const nameW = doc.getTextWidth("Invoice Name:");
    doc.setFont("helvetica", "normal");
    doc.text(data.invoiceName, margin + nameW + 2, leftY);
  }

  yPosition = Math.max(leftY, rightY) + 12;

  // ── Line items table ──────────────────────────────────────────────────────
  const tableTop = yPosition;
  const colWidths = { title: 90, price: 35, qty: 20, total: 35 };

  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(margin, tableTop, contentWidth, 8, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  let colX = margin + 5;
  doc.text("Title", colX, tableTop + 5.5);
  colX += colWidths.title;
  doc.text("Price", colX, tableTop + 5.5);
  colX += colWidths.price;
  doc.text("QTY", colX - 5, tableTop + 5.5);
  colX += colWidths.qty;
  doc.text("Total", colX, tableTop + 5.5);

  yPosition = tableTop + 12;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  data.lineItems.forEach((item) => {
    if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = margin; }

    colX = margin + 5;
    const titleLines = doc.splitTextToSize(item.description, colWidths.title - 8);
    doc.text(titleLines, colX, yPosition);

    const lineH = titleLines.length * 4;
    colX += colWidths.title;
    doc.text(`$${formatCurrency(item.price)}`, colX, yPosition);
    colX += colWidths.price;
    doc.text(item.qty.toString(), colX - 2, yPosition);
    colX += colWidths.qty;
    doc.text(`$${formatCurrency(item.total)}`, colX, yPosition);

    yPosition += Math.max(lineH, 6);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 4;
  });

  // ── Totals ────────────────────────────────────────────────────────────────
  yPosition += 8;
  const totalsX  = pageWidth - margin - 55;
  const valuesX  = pageWidth - margin - 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("SUBTOTAL:", totalsX, yPosition);
  doc.text(`$${formatCurrency(data.subtotal)}`, valuesX, yPosition, { align: "right" });
  yPosition += 6;

  doc.text(`Tax ${data.taxRate}%:`, totalsX, yPosition);
  doc.text(`$${formatCurrency(data.taxAmount)}`, valuesX, yPosition, { align: "right" });
  yPosition += 6;

  if (data.discountAmount > 0) {
    const discLabel =
      data.discountType === "percentage"
        ? `DISCOUNT ${data.discountValue}%:`
        : "DISCOUNT:";
    doc.text(discLabel, totalsX, yPosition);
    doc.text(`$${formatCurrency(data.discountAmount)}`, valuesX, yPosition, { align: "right" });
    yPosition += 6;
  }

  // Total Due banner
  const totalY = yPosition + 3;
  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(totalsX - 5, totalY - 5, 65, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL DUE:", totalsX, totalY);
  doc.text(`$${formatCurrency(data.total)}`, valuesX, totalY, { align: "right" });
  doc.setTextColor(0, 0, 0);
  yPosition = totalY + 12;

  // PAY NOW button for pending invoices
  if (data.status?.toLowerCase() === "pending") {
    const btnW = 65, btnH = 10;
    const btnX = totalsX - 5;
    const btnY = yPosition + 3;
    doc.setFillColor(129, 199, 132);
    doc.rect(btnX, btnY - 5, btnW, btnH, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("PAY NOW", btnX + btnW / 2, btnY, { align: "center" });
    yPosition = btnY + 10;
  }

  // Notes
  if (data.notes) {
    yPosition += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("Note:", margin, yPosition); yPosition += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const notesLines = doc.splitTextToSize(data.notes, contentWidth);
    doc.text(notesLines, margin, yPosition);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = pageHeight - 50;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(blue[0], blue[1], blue[2]);
  doc.text("Thank you for your Business", pageWidth / 2, footerY, { align: "center" });

  doc.setDrawColor(blue[0], blue[1], blue[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY + 5, pageWidth - margin, footerY + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(data.companyPhone, pageWidth / 2, footerY + 12, { align: "center" });
  doc.text(data.companyEmail, pageWidth / 2, footerY + 18, { align: "center" });

  return doc;
};
