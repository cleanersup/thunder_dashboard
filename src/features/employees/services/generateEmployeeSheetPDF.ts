import jsPDF from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmployeeSheetData {
  companyLogo?: string;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyZip: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthday?: string;
  gender: string;
  position: string;
  hourlyRate?: number;
  status: string;
  street?: string;
  aptSuite?: string;
  city?: string;
  state?: string;
  zip?: string;
  availability?: Record<string, { AM: boolean; PM: boolean; NIGHT: boolean }>;
  additionalNotes?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// ─── Generator ────────────────────────────────────────────────────────────────

export function generateEmployeeSheetPDF(data: EmployeeSheetData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  const primaryColor: [number, number, number] = [79, 129, 189];

  // ── Header: Logo + Title ─────────────────────────────────────────────────
  const topSectionY = yPosition - 5;

  if (data.companyLogo) {
    try {
      doc.addImage(data.companyLogo, "PNG", margin, topSectionY, 25, 25);
    } catch {
      // logo failed to load — skip
    }
  }

  const titleText = "EMPLOYEE INFORMATION SHEET";
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const titleWidth = doc.getTextWidth(titleText) + 10;
  const titleHeight = 10;
  const titleX = pageWidth - margin - titleWidth;
  const titleY = topSectionY + 8;

  doc.setFillColor(...primaryColor);
  doc.rect(titleX, titleY, titleWidth, titleHeight, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(titleText, titleX + titleWidth / 2, titleY + 7, { align: "center" });

  yPosition = topSectionY + 35;

  // ── Company info + Date ──────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Company Information", margin, yPosition);

  const now = new Date();
  const formattedDate = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
  doc.text(`Date: ${formattedDate}`, pageWidth - margin, yPosition, { align: "right" });

  yPosition += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.companyName.toUpperCase(), margin, yPosition);
  yPosition += 5;
  doc.text(formatPhoneNumber(data.companyPhone), margin, yPosition);
  yPosition += 5;
  doc.text(data.companyEmail, margin, yPosition);
  yPosition += 5;
  doc.text(
    `${data.companyAddress}, ${data.companyCity}, ${data.companyState} ${data.companyZip}`,
    margin,
    yPosition,
  );
  yPosition += 12;

  // ── Section 1: Personal Information ─────────────────────────────────────
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPosition, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PERSONAL INFORMATION", margin + 3, yPosition + 5);
  yPosition += 13;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const col1X = margin + 3;
  const col2X = pageWidth / 2 + 5;
  let col1Y = yPosition;
  let col2Y = yPosition;

  doc.setFont("helvetica", "bold");
  doc.text("Full Name:", col1X, col1Y);
  doc.setFont("helvetica", "normal");
  doc.text(`${data.firstName} ${data.lastName}`, col1X + 25, col1Y);
  col1Y += 6;

  if (data.email) {
    doc.setFont("helvetica", "bold");
    doc.text("Email:", col1X, col1Y);
    doc.setFont("helvetica", "normal");
    doc.text(data.email, col1X + 25, col1Y);
    col1Y += 6;
  }

  if (data.phone) {
    doc.setFont("helvetica", "bold");
    doc.text("Phone:", col2X, col2Y);
    doc.setFont("helvetica", "normal");
    doc.text(formatPhoneNumber(data.phone), col2X + 25, col2Y);
    col2Y += 6;
  }

  if (data.birthday) {
    doc.setFont("helvetica", "bold");
    doc.text("Date of Birth:", col2X, col2Y);
    doc.setFont("helvetica", "normal");
    doc.text(data.birthday, col2X + 25, col2Y);
    col2Y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Gender:", col1X, col1Y);
  doc.setFont("helvetica", "normal");
  doc.text(data.gender, col1X + 25, col1Y);

  yPosition = Math.max(col1Y, col2Y) + 10;

  // ── Section 2: Address ───────────────────────────────────────────────────
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPosition, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("ADDRESS", margin + 3, yPosition + 5);
  yPosition += 13;

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  if (data.street) {
    doc.setFont("helvetica", "bold");
    doc.text("Street:", margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(
      data.street + (data.aptSuite ? `, ${data.aptSuite}` : ""),
      margin + 23,
      yPosition,
    );
    yPosition += 6;
  }

  if (data.city && data.state && data.zip) {
    doc.setFont("helvetica", "bold");
    doc.text("City:", margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(data.city, margin + 13, yPosition);

    doc.setFont("helvetica", "bold");
    doc.text("/ State:", margin + 45, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(data.state, margin + 60, yPosition);

    doc.setFont("helvetica", "bold");
    doc.text("/ Zip:", margin + 72, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(data.zip, margin + 85, yPosition);
    yPosition += 6;
  }

  yPosition += 6;

  // ── Section 3: Employment Details ────────────────────────────────────────
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPosition, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("EMPLOYMENT DETAILS", margin + 3, yPosition + 5);
  yPosition += 13;

  doc.setTextColor(0, 0, 0);
  col1Y = yPosition;
  col2Y = yPosition;

  doc.setFont("helvetica", "bold");
  doc.text("Position:", col1X, col1Y);
  doc.setFont("helvetica", "normal");
  doc.text(data.position || "—", col1X + 25, col1Y);
  col1Y += 6;

  if (data.hourlyRate) {
    doc.setFont("helvetica", "bold");
    doc.text("Hourly Rate:", col1X, col1Y);
    doc.setFont("helvetica", "normal");
    doc.text(`$${data.hourlyRate.toFixed(2)}/hr`, col1X + 25, col1Y);
    col1Y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Status:", col2X, col2Y);
  doc.setFont("helvetica", "normal");

  const statusText = data.status.toUpperCase();
  const statusWidth = doc.getTextWidth(statusText) + 6;
  const statusColor: [number, number, number] = data.status === "active"
    ? [220, 252, 231]
    : [254, 226, 226];
  const textColor: [number, number, number] = data.status === "active"
    ? [34, 197, 94]
    : [244, 67, 54];

  doc.setFillColor(...statusColor);
  doc.roundedRect(col2X + 24, col2Y - 3.5, statusWidth, 6, 1, 1, "F");
  doc.setTextColor(...textColor);
  doc.text(statusText, col2X + 27, col2Y);
  doc.setTextColor(0, 0, 0);

  yPosition = Math.max(col1Y, col2Y) + 10;

  // ── Section 4: Availability ──────────────────────────────────────────────
  doc.setFillColor(...primaryColor);
  doc.rect(margin, yPosition, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("AVAILABILITY", margin + 3, yPosition + 5);
  yPosition += 13;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");

  if (data.availability && typeof data.availability === "object") {
    // Normalize keys to lowercase — swift-slate may store Title Case keys ("Monday")
    const availability = Object.fromEntries(
      Object.entries(data.availability).map(([k, v]) => [k.toLowerCase(), v])
    );

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayColWidth = contentWidth / 7;
    const xPos = margin + 3;

    doc.setFont("helvetica", "bold");
    dayLabels.forEach((dayLabel, index) => {
      doc.text(dayLabel, xPos + index * dayColWidth, yPosition);
    });
    yPosition += 5;

    let hasAny = false;
    doc.setFont("helvetica", "normal");
    days.forEach((day, index) => {
      const shifts = availability[day];
      if (shifts) {
        const active: string[] = [];
        if (shifts.AM) active.push("AM");
        if (shifts.PM) active.push("PM");
        if (shifts.NIGHT) active.push("Night");
        if (active.length > 0) {
          hasAny = true;
          doc.text(active.join(","), xPos + index * dayColWidth, yPosition);
        } else {
          doc.text("-", xPos + index * dayColWidth, yPosition);
        }
      } else {
        doc.text("-", xPos + index * dayColWidth, yPosition);
      }
    });

    if (!hasAny) {
      yPosition += 5;
      doc.text("No availability set", margin + 3, yPosition);
    }
    yPosition += 5;
  } else {
    doc.text("No availability information", margin + 3, yPosition);
    yPosition += 5;
  }

  doc.setFontSize(9);
  yPosition += 6;

  // ── Section 5: Signatures ────────────────────────────────────────────────
  const signaturesY = pageHeight - 75;

  doc.setFillColor(...primaryColor);
  doc.rect(margin, signaturesY, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SIGNATURES", margin + 3, signaturesY + 5);

  let sigY = signaturesY + 18;

  // Employee signature (left)
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Employee Signature:", margin + 3, sigY);
  sigY += 8;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin + 3, sigY, margin + 70, sigY);
  sigY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Date:", margin + 3, sigY);
  doc.line(margin + 15, sigY, margin + 45, sigY);

  // Manager/Owner signature (right)
  sigY = signaturesY + 15;
  const rightSigX = pageWidth / 2 + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Manager/Owner Signature:", rightSigX, sigY);
  sigY += 8;

  doc.setLineWidth(0.3);
  doc.line(rightSigX, sigY, rightSigX + 67, sigY);
  sigY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Date:", rightSigX, sigY);
  doc.line(rightSigX + 12, sigY, rightSigX + 42, sigY);

  // ── Footer ───────────────────────────────────────────────────────────────
  const footerY = pageHeight - 30;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This document is confidential and contains proprietary information",
    pageWidth / 2,
    footerY + 6,
    { align: "center" },
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(data.companyName.toUpperCase(), pageWidth / 2, footerY + 11, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(128, 128, 128);
  doc.text(
    "Service provided by © 2024 Thunder Pro Inc. | www.thunderpro.co",
    pageWidth / 2,
    footerY + 16,
    { align: "center" },
  );

  doc.save(`Employee_Sheet_${data.firstName}_${data.lastName}.pdf`);
}
