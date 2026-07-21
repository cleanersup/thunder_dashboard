/**
 * Returns the jsPDF-compatible format string for a given logo data URL.
 * Returns null for unknown/unsupported formats.
 */
export function getLogoFormat(dataUrl: string): string | null {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "JPEG";
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/gif")) return "GIF";
  return null;
}

/**
 * Converts a logo data URL to a JPEG data URL via an off-screen canvas.
 * Needed for WebP and other formats jsPDF doesn't support.
 */
export async function normalizeLogo(
  dataUrl: string,
): Promise<{ data: string; format: string } | null> {
  const fmt = getLogoFormat(dataUrl);
  if (fmt) return { data: dataUrl, format: fmt };

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL("image/jpeg", 0.92), format: "JPEG" });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
