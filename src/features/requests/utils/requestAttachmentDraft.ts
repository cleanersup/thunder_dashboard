/**
 * In-memory File[] stash for the request form.
 *
 * Nested Dialog/Sheet (client picker, add-client) can remount RequestForm and
 * reset `useState([])`. File objects cannot go in sessionStorage, so they live
 * here until the form is closed or saved.
 */
const filesByKey = new Map<string, File[]>();

export function readRequestAttachmentFiles(key: string): File[] {
  return filesByKey.get(key) ?? [];
}

export function writeRequestAttachmentFiles(key: string, files: File[]): void {
  filesByKey.set(key, files);
}

export function clearRequestAttachmentFiles(key: string): void {
  filesByKey.delete(key);
}
