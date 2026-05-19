// tests/helpers/mock-blobs.js
/**
 * In-memory mock of @netlify/blobs `getStore()` for unit tests.
 * Each call to mockBlobs() returns a fresh independent store.
 */
export function mockBlobs() {
  const stores = new Map();

  return {
    getStore(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const data = stores.get(name);
      return {
        async get(key, { type = 'text' } = {}) {
          if (!data.has(key)) return null;
          const val = data.get(key);
          if (type === 'json') return JSON.parse(val);
          return val;
        },
        async set(key, value) {
          data.set(key, typeof value === 'string' ? value : JSON.stringify(value));
        },
        async setJSON(key, value) {
          data.set(key, JSON.stringify(value));
        },
        async delete(key) {
          data.delete(key);
        },
        async list({ prefix = '' } = {}) {
          const blobs = [];
          for (const k of data.keys()) {
            if (k.startsWith(prefix)) blobs.push({ key: k });
          }
          return { blobs };
        },
      };
    },
  };
}
