import jsPDF from "jspdf";
import type { Job } from "../types/job.types";

interface EmployeeInfo {
  first_name: string;
  last_name: string;
}

interface CompanyInfo {
  company_name?: string | null;
  company_logo?: string | null;
  company_phone?: string | null;
  company_email?: string | null;
  company_address?: string | null;
  company_city?: string | null;
  company_state?: string | null;
  company_zip?: string | null;
}

const PRIMARY: [number, number, number] = [79, 129, 189];
const DARK:    [number, number, number] = [30,  30,  30];
const GRAY:    [number, number, number] = [120, 120, 120];
const LIGHT:   [number, number, number] = [240, 244, 248];

function drawHRule(doc: jsPDF, y: number, margin: number) {
  const w = doc.internal.pageSize.getWidth() - margin * 2;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + w, y);
}

function formatCurrency(v: number): string {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatTime(t: string | null | undefined): string {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Generates and downloads a PDF work order for the given job.
 * @param job - The Job object to render
 * @param employees - List of assigned employees (first_name, last_name)
 * @param company - Company profile info for the header
 */
export async function generateJobPDF(
  job: Job,
  employees: EmployeeInfo[],
  company: CompanyInfo = {},
): Promise<void> {
  const doc = new jsPDF();
  const PW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const CW = PW - margin * 2;
  let y = margin;

  // ── Header ────────────────────────────────────────────────────────────────

  if (company.company_logo) {
    try {
      doc.addImage(company.company_logo, "PNG", margin, y - 3, 25, 25);
    } catch { /* skip if image fails */ }
  }

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.text("JOB WORK ORDER", PW - margin, y + 5, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(`Job #: ${job.jobNumber}`, PW - margin, y + 14, { align: "right" });
  doc.text(`Date: ${formatDate(job.jobDate)}`, PW - margin, y + 21, { align: "right" });

  y += 32;
  drawHRule(doc, y, margin);
  y += 8;

  // ── Company + Client ──────────────────────────────────────────────────────

  const colW = CW / 2 - 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRIMARY);
  doc.text("FROM",   margin,            y);
  doc.text("CLIENT", margin + colW + 10, y);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(company.company_name || "Thunder Pro", margin,            y);
  doc.text(job.clientName,                        margin + colW + 10, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);

  const companyLines = [
    company.company_address,
    [company.company_city, company.company_state, company.company_zip].filter(Boolean).join(", "),
    company.company_phone,
    company.company_email,
  ].filter(Boolean) as string[];

  const addressLines = [
    job.propertyStreet ? [job.propertyStreet, job.propertyApt].filter(Boolean).join(", ") : null,
    [job.propertyCity, job.propertyState, job.propertyZip].filter(Boolean).join(", ") || null,
  ].filter(Boolean) as string[];

  const maxLines = Math.max(companyLines.length, addressLines.length);
  for (let i = 0; i < maxLines; i++) {
    if (companyLines[i]) doc.text(companyLines[i], margin,            y);
    if (addressLines[i]) doc.text(addressLines[i], margin + colW + 10, y);
    y += 5;
  }

  y += 6;
  drawHRule(doc, y, margin);
  y += 8;

  // ── Schedule ──────────────────────────────────────────────────────────────

  doc.setFillColor(...LIGHT);
  doc.rect(margin, y - 3, CW, 22, "F");

  const schedCols = [
    { label: "Service Type", value: job.serviceType.charAt(0).toUpperCase() + job.serviceType.slice(1) },
    { label: "Start Time",   value: formatTime(job.startTime) },
    { label: "End Time",     value: formatTime(job.endTime) },
    {
      label: "Employees",
      value: employees.length > 0
        ? employees.map((e) => `${e.first_name} ${e.last_name}`).join(", ")
        : "—",
    },
  ];

  const colWidth = CW / schedCols.length;
  schedCols.forEach((col, i) => {
    const x = margin + i * colWidth;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GRAY);
    doc.text(col.label, x + 4, y + 3);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    const wrapped = doc.splitTextToSize(col.value, colWidth - 8);
    doc.text(wrapped[0], x + 4, y + 11);
  });

  y += 28;

  // ── Services table ────────────────────────────────────────────────────────

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Services", margin, y);
  y += 6;

  doc.setFillColor(...PRIMARY);
  doc.rect(margin, y, CW, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Description",    margin + 3,        y + 5.5);
  doc.text("Qty",            margin + CW * 0.6,  y + 5.5, { align: "center" });
  doc.text("Unit Price",     margin + CW * 0.75, y + 5.5, { align: "right" });
  doc.text("Total",          margin + CW,         y + 5.5, { align: "right" });
  y += 8;

  job.services.forEach((svc, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, CW, 7, "F");
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK);
    doc.text(doc.splitTextToSize(svc.name, CW * 0.55)[0], margin + 3,        y + 5);
    doc.text(String(svc.quantity),                          margin + CW * 0.6,  y + 5, { align: "center" });
    doc.text(formatCurrency(svc.unitPrice),                 margin + CW * 0.75, y + 5, { align: "right" });
    doc.text(formatCurrency(svc.total),                     margin + CW,         y + 5, { align: "right" });
    y += 7;
  });

  y += 4;
  drawHRule(doc, y, margin);
  y += 6;

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalsX = margin + CW * 0.6;
  const totalsW = CW * 0.4;

  const addTotalRow = (label: string, value: string, bold = false) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...GRAY);
    doc.text(label, totalsX, y);
    doc.setTextColor(...DARK);
    doc.text(value, margin + CW, y, { align: "right" });
    y += 6;
  };

  addTotalRow("Subtotal", formatCurrency(job.subtotal));
  if (job.applyDiscount && job.discountAmount > 0)
    addTotalRow("Discount", `-${formatCurrency(job.discountAmount)}`);
  if (job.applyTax && job.taxAmount > 0)
    addTotalRow(`Tax${job.taxRate ? ` (${job.taxRate}%)` : ""}`, formatCurrency(job.taxAmount));

  y += 2;
  doc.setFillColor(...PRIMARY);
  doc.rect(totalsX - 4, y - 5, totalsW + 4, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL", totalsX, y + 2);
  doc.text(formatCurrency(job.total), margin + CW, y + 2, { align: "right" });
  y += 12;

  if (job.applyDeposit && job.depositAmount > 0) {
    addTotalRow("Deposit",     formatCurrency(job.depositAmount));
    addTotalRow("Balance Due", formatCurrency(Math.max(job.total - job.depositAmount, 0)), true);
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  if (job.jobDetails || job.notes) {
    y += 4;
    drawHRule(doc, y, margin);
    y += 8;

    if (job.jobDetails) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text("Job Details", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      const lines = doc.splitTextToSize(job.jobDetails, CW);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
    }

    if (job.notes) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK);
      doc.text("Internal Notes", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...GRAY);
      const lines = doc.splitTextToSize(job.notes, CW);
      doc.text(lines, margin, y);
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────

  const PH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(company.company_name || "Thunder Pro", PW / 2, PH - 10, { align: "center" });

  doc.save(`Job_${job.jobNumber}_${job.jobDate}.pdf`);
}
