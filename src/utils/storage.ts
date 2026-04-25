/**
 * @file storage.ts
 * @layer utils
 * @desc Wrapper localStorage dengan JSON serialization + try/catch (SSR / private mode safe).
 * @exposes storage (get, set, remove, has)
 * @deps -
 */

function safeWindow(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export const storage = {
  get<T>(key: string): T | null {
    const ls = safeWindow();
    if (!ls) return null;
    try {
      const raw = ls.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): boolean {
    const ls = safeWindow();
    if (!ls) return false;
    try {
      ls.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): void {
    const ls = safeWindow();
    if (!ls) return;
    try {
      ls.removeItem(key);
    } catch {
      // ignore
    }
  },

  has(key: string): boolean {
    const ls = safeWindow();
    if (!ls) return false;
    try {
      return ls.getItem(key) !== null;
    } catch {
      return false;
    }
  },
};
