export const safeStorage = {
  getItem(key: string, defaultValue: string = ''): string {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (e) {
      console.warn(`Storage access blocked for key "${key}":`, e);
      return defaultValue;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Storage access blocked for setting "${key}":`, e);
    }
  },
  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Storage access blocked for removing "${key}":`, e);
    }
  }
};
