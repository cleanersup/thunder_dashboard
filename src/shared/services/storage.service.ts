/**
 * StorageService — abstraction over localStorage.
 * Replaces @capacitor/preferences for web.
 * All values are JSON-serialized for type safety.
 */

/**
 * Stores a value in localStorage under the given key.
 * @param key - Storage key
 * @param value - Value to store (will be JSON-serialized)
 */
function set<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error(`[StorageService] Failed to set key "${key}"`);
  }
}

/**
 * Retrieves and deserializes a value from localStorage.
 * @param key - Storage key
 * @returns The stored value, or null if not found / parse error
 */
function get<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Removes a key from localStorage.
 * @param key - Storage key to remove
 */
function remove(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Clears all keys from localStorage.
 */
function clear(): void {
  localStorage.clear();
}

export const StorageService = { set, get, remove, clear };
