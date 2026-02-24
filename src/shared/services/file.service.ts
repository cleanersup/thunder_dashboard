/**
 * FileService — browser file download helper.
 * Replaces @capacitor/filesystem for web.
 */

/**
 * Triggers a file download in the browser from a Blob.
 * @param blob - The file content as a Blob
 * @param filename - The name for the downloaded file (e.g. "invoice-123.pdf")
 * @example
 * FileService.downloadBlob(pdfBlob, "estimate-001.pdf");
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a file download from a data URL string.
 * @param dataUrl - Base64 or object data URL
 * @param filename - The name for the downloaded file
 */
function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export const FileService = { downloadBlob, downloadDataUrl };
