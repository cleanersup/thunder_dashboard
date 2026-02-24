/**
 * ShareService — Web Share API with clipboard fallback.
 * Replaces @capacitor/share for web.
 */

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

/**
 * Shares content using the Web Share API if available,
 * otherwise falls back to copying the URL to the clipboard.
 * @param options - Content to share (title, text, url)
 * @returns true if shared natively, false if fell back to clipboard copy
 * @example
 * await ShareService.share({ title: "Estimate #123", url: estimateUrl });
 */
async function share(options: ShareOptions): Promise<boolean> {
  if (navigator.share && navigator.canShare?.(options)) {
    await navigator.share(options);
    return true;
  }

  // Fallback: copy URL to clipboard
  const textToCopy = options.url ?? options.text ?? options.title ?? "";
  if (textToCopy && navigator.clipboard) {
    await navigator.clipboard.writeText(textToCopy);
  }
  return false;
}

/**
 * Copies a text string to the clipboard.
 * @param text - Text to copy
 * @throws Error if clipboard API is unavailable
 */
async function copyToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error("Clipboard API not available.");
  }
  await navigator.clipboard.writeText(text);
}

export const ShareService = { share, copyToClipboard };
