/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Walkthrough PDF — Thunder Pro brand (#1e3a8a), aligned with estimate/invoice PDFs.
 */
import jsPDF from "jspdf";
import { FileService } from "@/shared/services/file.service";

/**
 * Fetches a photo URL and normalizes it to a JPEG data URL (via canvas) so jsPDF
 * can embed it regardless of the source format (png/webp/jpg). Returns null on failure
 * so a single broken image never aborts the whole PDF.
 */
async function loadPhotoForPdf(
  url: string,
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = objUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return {
        dataUrl: canvas.toDataURL("image/jpeg", 0.8),
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  } catch {
    return null;
  }
}

export interface WalkthroughPDFData {
  companyLogo?: string;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  companyAddress: string;
  walkthroughId: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  estimateSentAt?: string;
  clientOrLeadInfo: {
    full_name: string;
    company?: string;
    phone: string;
    email: string;
    service_street: string;
    service_city: string;
    service_state: string;
    service_zip: string;
  };
  walkthroughType: string;
  serviceType: string;
  scheduledDate: string;
  scheduledTime: string;
  duration?: number;
  notes?: string;
  assignedEmployees?: Array<{
    first_name: string;
    last_name: string;
    position: string;
  }>;
  residentialData?: any;
  commercialData?: any;
}

export async function generateWalkthroughPDF(data: WalkthroughPDFData): Promise<InstanceType<typeof jsPDF>> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Define primary color (Thunder Pro blue)
  const primaryColor = [30, 58, 138]; // #1e3a8a

  // Helper function to add footer on every page
  const addFooter = () => {
    const footerY = pageHeight - 30;
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This document is confidential and contains proprietary information', pageWidth / 2, footerY + 6, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(data.companyName.toUpperCase(), pageWidth / 2, footerY + 11, { align: 'center' });

    // Add Thunder Pro attribution in a single line with vertical separator
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const leftText = 'Service provided by Thunder Pro Inc.';
    const rightText = 'www.thunderpro.co';
    const textY = footerY + 16;

    // Calculate positions
    const leftTextWidth = doc.getTextWidth(leftText);
    const rightTextWidth = doc.getTextWidth(rightText);
    const separatorSpace = 3;
    const totalWidth = leftTextWidth + separatorSpace + 2 + separatorSpace + rightTextWidth;
    const startX = (pageWidth - totalWidth) / 2;

    // Left text
    doc.text(leftText, startX, textY);

    // Vertical separator line
    const lineX = startX + leftTextWidth + separatorSpace;
    doc.setLineWidth(0.2);
    doc.setDrawColor(100, 100, 100);
    doc.line(lineX, textY - 3, lineX, textY + 1);

    // Right text
    doc.text(rightText, lineX + separatorSpace, textY);
  };

  // Header with logo only
  if (data.companyLogo) {
    try {
      const imgWidth = 30;
      const imgHeight = 30;
      doc.addImage(data.companyLogo, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (error) {
      console.error('Error adding logo:', error);
      yPosition += 15;
    }
  } else {
    yPosition += 15;
  }

  // Title in top right with blue container
  const titleText = 'WALKTHROUGH REPORT';
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titleWidth = doc.getTextWidth(titleText);
  const titleHeight = 8;
  const titlePadding = 4;
  const containerWidth = titleWidth + (titlePadding * 2);
  const titleContainerX = pageWidth - margin - containerWidth;
  const titleY = margin + 6;

  // Blue container background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(titleContainerX, margin, containerWidth, titleHeight, 'F');

  // White text
  doc.setTextColor(255, 255, 255);
  doc.text(titleText, titleContainerX + titlePadding, titleY);

  // Reset text color to black
  doc.setTextColor(0, 0, 0);
  yPosition += 5;

  // Add footer to first page
  addFooter();

  // Section 1: Basic Information
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('WALKTHROUGH INFORMATION', margin + 3, yPosition + 5);
  yPosition += 13;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Two columns layout
  let col1X = margin + 3;
  let col2X = margin + (contentWidth / 2);
  let col1Y = yPosition;
  let col2Y = yPosition;

  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.text('Walkthrough ID:', col1X, col1Y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.walkthroughId.substring(0, 8), col1X + 32, col1Y);
  col1Y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Type:', col1X, col1Y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.walkthroughType === 'client' ? 'Client' : 'Lead', col1X + 32, col1Y);
  col1Y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Service:', col1X, col1Y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.serviceType, col1X + 32, col1Y);
  col1Y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Created:', col1X, col1Y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.createdAt, col1X + 32, col1Y);
  col1Y += 6;

  // Column 2
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', col2X, col2Y);
  doc.setFont('helvetica', 'normal');

  // Draw badge for status
  const statusText = data.status === 'estimate_sent' ? 'Estimate Sent' : data.status;
  const statusWidth = doc.getTextWidth(statusText.toUpperCase()) + 6;
  const statusColors: Record<string, { bg: number[], text: number[] }> = {
    'Completed': { bg: [220, 252, 231], text: [34, 197, 94] },
    'estimate_sent': { bg: [219, 234, 254], text: [59, 130, 246] },
    'Scheduled': { bg: [254, 243, 199], text: [245, 158, 11] },
    'Cancelled': { bg: [254, 226, 226], text: [244, 67, 54] }
  };

  const statusColor = statusColors[data.status] || { bg: [229, 231, 235], text: [75, 85, 99] };
  doc.setFillColor(statusColor.bg[0], statusColor.bg[1], statusColor.bg[2]);
  doc.roundedRect(col2X + 24, col2Y - 3.5, statusWidth, 6, 1, 1, 'F');
  doc.setTextColor(statusColor.text[0], statusColor.text[1], statusColor.text[2]);
  doc.text(statusText.toUpperCase(), col2X + 27, col2Y);
  doc.setTextColor(0, 0, 0);
  col2Y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Scheduled Date:', col2X, col2Y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.scheduledDate, col2X + 32, col2Y);
  col2Y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Scheduled Time:', col2X, col2Y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.scheduledTime, col2X + 32, col2Y);
  col2Y += 6;

  if (data.duration) {
    doc.setFont('helvetica', 'bold');
    doc.text('Duration:', col2X, col2Y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.duration} min`, col2X + 32, col2Y);
    col2Y += 6;
  }

  yPosition = Math.max(col1Y, col2Y) + 10;

  // Section 2: Client/Lead Information
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.walkthroughType === 'client' ? 'CLIENT' : 'LEAD'} INFORMATION`, margin + 3, yPosition + 5);
  yPosition += 13;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  doc.setFont('helvetica', 'bold');
  doc.text('Name:', margin + 3, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientOrLeadInfo.full_name, margin + 23, yPosition);
  yPosition += 6;

  if (data.clientOrLeadInfo.company) {
    doc.setFont('helvetica', 'bold');
    doc.text('Company:', margin + 3, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientOrLeadInfo.company, margin + 23, yPosition);
    yPosition += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Phone:', margin + 3, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientOrLeadInfo.phone, margin + 23, yPosition);
  yPosition += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Email:', margin + 3, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(data.clientOrLeadInfo.email, margin + 23, yPosition);
  yPosition += 6;

  // Section 3: Service Address
  yPosition += 6;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, yPosition, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SERVICE ADDRESS', margin + 3, yPosition + 5);
  yPosition += 13;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  if (data.clientOrLeadInfo.service_street) {
    doc.setFont('helvetica', 'bold');
    doc.text('Street:', margin + 3, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientOrLeadInfo.service_street, margin + 23, yPosition);
    yPosition += 6;
  }

  if (data.clientOrLeadInfo.service_city && data.clientOrLeadInfo.service_state && data.clientOrLeadInfo.service_zip) {
    doc.setFont('helvetica', 'bold');
    doc.text('City:', margin + 3, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientOrLeadInfo.service_city, margin + 13, yPosition);

    doc.setFont('helvetica', 'bold');
    doc.text('/ State:', margin + 45, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientOrLeadInfo.service_state, margin + 60, yPosition);

    doc.setFont('helvetica', 'bold');
    doc.text('/ Zip:', margin + 72, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(data.clientOrLeadInfo.service_zip, margin + 85, yPosition);
    yPosition += 6;
  }

  // Section 4: Assigned Employees
  if (data.assignedEmployees && data.assignedEmployees.length > 0) {
    yPosition += 6;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, yPosition, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSIGNED EMPLOYEES', margin + 3, yPosition + 5);
    yPosition += 13;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    data.assignedEmployees.forEach((emp, index) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}.`, margin + 3, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.text(`${emp.first_name} ${emp.last_name} - ${emp.position}`, margin + 10, yPosition);
      yPosition += 6;
    });
  }

  // Section 5: Notes
  if (data.notes) {
    yPosition += 6;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, yPosition, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', margin + 3, yPosition + 5);
    yPosition += 13;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const noteLines = doc.splitTextToSize(data.notes, contentWidth - 6);
    noteLines.forEach((line: string) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        addFooter();
        yPosition = margin;
      }
      doc.text(line, margin + 3, yPosition);
      yPosition += 5;
    });
  }

  // Residential Walkthrough Data
  if (data.residentialData) {
    doc.addPage();
    addFooter();
    yPosition = margin + 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('RESIDENTIAL WALKTHROUGH DETAILS', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, yPosition, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPERTY INFORMATION', margin + 3, yPosition + 5);
    yPosition += 13;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    col1X = margin + 3;
    col2X = margin + (contentWidth / 2);
    col1Y = yPosition;
    col2Y = yPosition;

    // Column 1
    if (data.residentialData.property_type) {
      doc.setFont('helvetica', 'bold');
      doc.text('Property Type:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.property_type, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.residentialData.square_footage) {
      doc.setFont('helvetica', 'bold');
      doc.text('Square Footage:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.square_footage, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.residentialData.bedrooms) {
      doc.setFont('helvetica', 'bold');
      doc.text('Bedrooms:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.bedrooms, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.residentialData.full_bath) {
      doc.setFont('helvetica', 'bold');
      doc.text('Full Bathrooms:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.full_bath, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.residentialData.half_bath) {
      doc.setFont('helvetica', 'bold');
      doc.text('Half Bathrooms:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.half_bath, col1X + 30, col1Y);
      col1Y += 6;
    }

    // Column 2
    if (data.residentialData.kitchen) {
      doc.setFont('helvetica', 'bold');
      doc.text('Kitchen:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.kitchen, col2X + 30, col2Y);
      col2Y += 6;
    }

    if (data.residentialData.living_room) {
      doc.setFont('helvetica', 'bold');
      doc.text('Living Room:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.living_room, col2X + 30, col2Y);
      col2Y += 6;
    }

    if (data.residentialData.dining_room) {
      doc.setFont('helvetica', 'bold');
      doc.text('Dining Room:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.dining_room, col2X + 30, col2Y);
      col2Y += 6;
    }

    if (data.residentialData.office) {
      doc.setFont('helvetica', 'bold');
      doc.text('Office:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.office, col2X + 30, col2Y);
      col2Y += 6;
    }

    if (data.residentialData.has_pets) {
      doc.setFont('helvetica', 'bold');
      doc.text('Has Pets:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.has_pets, col2X + 30, col2Y);
      col2Y += 6;
    }

    yPosition = Math.max(col1Y, col2Y) + 10;

    // Additional features
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, yPosition, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('ADDITIONAL FEATURES', margin + 3, yPosition + 5);
    yPosition += 13;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    col1X = margin + 3;
    col2X = margin + (contentWidth / 2);
    col1Y = yPosition;
    col2Y = yPosition;

    if (data.residentialData.fans) {
      doc.setFont('helvetica', 'bold');
      doc.text('Fans:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.fans, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.residentialData.blinds) {
      doc.setFont('helvetica', 'bold');
      doc.text('Blinds:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.blinds, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.residentialData.oven) {
      doc.setFont('helvetica', 'bold');
      doc.text('Oven:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.oven, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.residentialData.refrigerator) {
      doc.setFont('helvetica', 'bold');
      doc.text('Refrigerator:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.refrigerator, col2X + 30, col2Y);
      col2Y += 6;
    }

    if (data.residentialData.windows_inside) {
      doc.setFont('helvetica', 'bold');
      doc.text('Windows Inside:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.windows_inside, col2X + 30, col2Y);
      col2Y += 6;
    }

    if (data.residentialData.windows_outside) {
      doc.setFont('helvetica', 'bold');
      doc.text('Windows Outside:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.residentialData.windows_outside, col2X + 30, col2Y);
      col2Y += 6;
    }

    yPosition = Math.max(col1Y, col2Y) + 10;

    if (Array.isArray(data.residentialData.extra_services) && data.residentialData.extra_services.length > 0) {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, yPosition, contentWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('EXTRA SERVICES', margin + 3, yPosition + 5);
      yPosition += 13;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      data.residentialData.extra_services.forEach((service: string) => {
        doc.text(`• ${service}`, margin + 6, yPosition);
        yPosition += 6;
      });
    }

    if (data.residentialData.notes) {
      yPosition += 6;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, yPosition, contentWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('ADDITIONAL NOTES', margin + 3, yPosition + 5);
      yPosition += 13;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      const noteLines = doc.splitTextToSize(data.residentialData.notes, contentWidth - 6);
      noteLines.forEach((line: string) => {
        doc.text(line, margin + 3, yPosition);
        yPosition += 5;
      });
    }
  }

  // Commercial Walkthrough Data
  if (data.commercialData) {
    doc.addPage();
    addFooter();
    yPosition = margin + 20;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('COMMERCIAL WALKTHROUGH DETAILS', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, yPosition, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PROPERTY INFORMATION', margin + 3, yPosition + 5);
    yPosition += 13;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    col1X = margin + 3;
    col2X = margin + (contentWidth / 2);
    col1Y = yPosition;
    col2Y = yPosition;

    // Column 1
    if (data.commercialData.property_type) {
      doc.setFont('helvetica', 'bold');
      doc.text('Property Type:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.commercialData.property_type, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.commercialData.property_size) {
      doc.setFont('helvetica', 'bold');
      doc.text('Property Size:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${data.commercialData.property_size} sqft`, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.commercialData.service_type) {
      doc.setFont('helvetica', 'bold');
      doc.text('Service Type:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.commercialData.service_type, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.commercialData.service_schedule) {
      doc.setFont('helvetica', 'bold');
      doc.text('Service Schedule:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.commercialData.service_schedule, col1X + 30, col1Y);
      col1Y += 6;
    }

    // Column 2
    if (data.commercialData.recurring_frequency) {
      doc.setFont('helvetica', 'bold');
      doc.text('Frequency:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.commercialData.recurring_frequency, col2X + 30, col2Y);
      col2Y += 6;
    }

    if (data.commercialData.employee_count) {
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Count:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.commercialData.employee_count, col2X + 30, col2Y);
      col2Y += 6;
    }

    if (data.commercialData.hourly_rate) {
      doc.setFont('helvetica', 'bold');
      doc.text('Hourly Rate:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(`$${data.commercialData.hourly_rate}`, col2X + 30, col2Y);
      col2Y += 6;
    }

    yPosition = Math.max(col1Y, col2Y) + 10;

    // Service details
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(margin, yPosition, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE DETAILS', margin + 3, yPosition + 5);
    yPosition += 13;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    col1X = margin + 3;
    col2X = margin + (contentWidth / 2);
    col1Y = yPosition;
    col2Y = yPosition;

    if (data.commercialData.start_time) {
      doc.setFont('helvetica', 'bold');
      doc.text('Start Time:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.commercialData.start_time, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.commercialData.cleaning_duration) {
      doc.setFont('helvetica', 'bold');
      doc.text('Duration:', col1X, col1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${data.commercialData.cleaning_duration} hours`, col1X + 30, col1Y);
      col1Y += 6;
    }

    if (data.commercialData.grease_level) {
      doc.setFont('helvetica', 'bold');
      doc.text('Grease Level:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.commercialData.grease_level, col2X + 30, col2Y);
      col2Y += 6;
    }

    if (data.commercialData.restaurant_condition) {
      doc.setFont('helvetica', 'bold');
      doc.text('Condition:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.commercialData.restaurant_condition, col2X + 30, col2Y);
      col2Y += 6;
    }

    if (data.commercialData.client_provides_supplies !== undefined) {
      doc.setFont('helvetica', 'bold');
      doc.text('Client Supplies:', col2X, col2Y);
      doc.setFont('helvetica', 'normal');
      doc.text(data.commercialData.client_provides_supplies ? 'Yes' : 'No', col2X + 30, col2Y);
      col2Y += 6;
    }

    yPosition = Math.max(col1Y, col2Y) + 10;

    const weekDays = data.commercialData.selected_week_days;
    if (Array.isArray(weekDays) && weekDays.length > 0) {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, yPosition, contentWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('SELECTED WEEK DAYS', margin + 3, yPosition + 5);
      yPosition += 13;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(weekDays.join(', '), margin + 3, yPosition);
      yPosition += 10;
    }

    if (Array.isArray(data.commercialData.extra_services) && data.commercialData.extra_services.length > 0) {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, yPosition, contentWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('EXTRA SERVICES', margin + 3, yPosition + 5);
      yPosition += 13;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      data.commercialData.extra_services.forEach((service: string) => {
        doc.text(`• ${service}`, margin + 6, yPosition);
        yPosition += 6;
      });
    }

    if (data.commercialData.notes) {
      yPosition += 6;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(margin, yPosition, contentWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('ADDITIONAL NOTES', margin + 3, yPosition + 5);
      yPosition += 13;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');

      const noteLines = doc.splitTextToSize(data.commercialData.notes, contentWidth - 6);
      noteLines.forEach((line: string) => {
        doc.text(line, margin + 3, yPosition);
        yPosition += 5;
      });
    }
  }

  // Section 6: Photos — 2-column grid on its own page(s)
  const photoUrls: string[] = (() => {
    const res = Array.isArray(data.residentialData?.photos) ? data.residentialData.photos : [];
    const com = Array.isArray(data.commercialData?.photos) ? data.commercialData.photos : [];
    return [...res, ...com].filter((u): u is string => typeof u === "string" && u.length > 0);
  })();

  if (photoUrls.length > 0) {
    const loaded = (await Promise.all(photoUrls.map(loadPhotoForPdf))).filter(
      (p): p is { dataUrl: string; width: number; height: number } => p !== null,
    );

    if (loaded.length > 0) {
      doc.addPage();
      addFooter();
      yPosition = margin + 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("WALKTHROUGH PHOTOS", pageWidth / 2, yPosition, { align: "center" });
      doc.setTextColor(0, 0, 0);
      yPosition += 12;

      // 2-column grid; each photo fits inside a fixed slot preserving aspect ratio
      const colGap = 8;
      const rowGap = 8;
      const slotW = (contentWidth - colGap) / 2;
      const slotH = 55;
      const bottomLimit = pageHeight - 35;

      loaded.forEach((photo, index) => {
        const col = index % 2;
        if (col === 0 && index > 0) yPosition += slotH + rowGap;

        if (yPosition + slotH > bottomLimit) {
          doc.addPage();
          addFooter();
          yPosition = margin + 5;
        }

        const slotX = margin + col * (slotW + colGap);
        const scale = Math.min(slotW / photo.width, slotH / photo.height);
        const drawW = photo.width * scale;
        const drawH = photo.height * scale;
        const offsetX = (slotW - drawW) / 2;

        try {
          doc.addImage(photo.dataUrl, "JPEG", slotX + offsetX, yPosition, drawW, drawH);
        } catch (err) {
          console.error("Error adding walkthrough photo to PDF:", err);
        }
      });
    }
  }

  return doc;
}

function walkthroughPdfFileName(data: WalkthroughPDFData): string {
  const name = (data.clientOrLeadInfo.full_name || "walkthrough").replace(/\s+/g, "_");
  return `Walkthrough_${name}_${data.scheduledDate.replace(/\//g, "-")}.pdf`;
}

/** Triggers a browser download of the walkthrough PDF. */
export async function downloadWalkthroughPdf(data: WalkthroughPDFData): Promise<void> {
  const doc = await generateWalkthroughPDF(data);
  FileService.downloadBlob(doc.output("blob"), walkthroughPdfFileName(data));
}
