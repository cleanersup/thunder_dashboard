/**
 * PDFService — PDF generation and download for web.
 * Uses jsPDF to generate PDFs and FileService to trigger browser download.
 * Replaces the mobile-specific pdfMobileHelper.ts.
 */

import jsPDF from "jspdf";
import { FileService } from "./file.service";

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

export const PDFService = { downloadFromElement, downloadFromDoc };
