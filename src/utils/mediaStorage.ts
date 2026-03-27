const DATABASE_NAME = "bellFreshMedia";
const DATABASE_VERSION = 1;
const ATTACHMENT_STORE_NAME = "attachments";

let mediaDatabasePromise: Promise<IDBDatabase> | null = null;

function supportsIndexedDb() {
  return typeof indexedDB !== "undefined";
}

function wrapRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function openMediaDatabase() {
  if (!supportsIndexedDb()) {
    return Promise.reject(new Error("This browser does not support offline media storage."));
  }

  if (!mediaDatabasePromise) {
    mediaDatabasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(ATTACHMENT_STORE_NAME)) {
          database.createObjectStore(ATTACHMENT_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error("Could not open offline media storage."));
    });
  }

  return mediaDatabasePromise;
}

async function withAttachmentStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T>,
) {
  const database = await openMediaDatabase();
  const transaction = database.transaction(ATTACHMENT_STORE_NAME, mode);
  const store = transaction.objectStore(ATTACHMENT_STORE_NAME);
  const result = await callback(store);

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Media transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Media transaction was aborted."));
  });

  return result;
}

export async function saveAttachmentBlob(storageKey: string, blob: Blob) {
  return withAttachmentStore("readwrite", async (store) => {
    await wrapRequest(store.put(blob, storageKey));
  });
}

export async function readAttachmentBlob(storageKey: string) {
  return withAttachmentStore("readonly", async (store) => {
    const result = await wrapRequest(store.get(storageKey));

    return result instanceof Blob ? result : null;
  });
}

export async function deleteAttachmentBlob(storageKey: string) {
  return withAttachmentStore("readwrite", async (store) => {
    await wrapRequest(store.delete(storageKey));
  });
}

export function isIndexedMediaAvailable() {
  return supportsIndexedDb();
}
