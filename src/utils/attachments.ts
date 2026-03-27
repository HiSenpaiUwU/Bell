import { FeedPost, StoredAttachment } from "../types";
import {
  deleteAttachmentBlob,
  isIndexedMediaAvailable,
  saveAttachmentBlob,
} from "./mediaStorage";

const DATA_URL_FALLBACK_LIMIT_BYTES = 1024 * 1024 * 8;

export const MAX_ATTACHMENT_SIZE_BYTES = 1024 * 1024 * 64;
export const MAX_ATTACHMENTS_PER_PICK = 6;
export const ATTACHMENT_INPUT_ACCEPT =
  "image/*,video/*,audio/*,.pdf,.txt,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
export const MAX_ATTACHMENT_SIZE_LABEL = `${(
  MAX_ATTACHMENT_SIZE_BYTES /
  (1024 * 1024)
).toFixed(0)} MB`;

function generateAttachmentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `attachment-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizeUrlForDetection(url: string) {
  return url.trim().toLowerCase().split("#")[0].split("?")[0];
}

function getDefaultMimeType(kind: StoredAttachment["kind"]) {
  switch (kind) {
    case "image":
      return "image/*";
    case "video":
      return "video/*";
    case "audio":
      return "audio/*";
    default:
      return "application/octet-stream";
  }
}

export function getAttachmentStorageKey(attachment: StoredAttachment) {
  if (attachment.storageKey) {
    return attachment.storageKey;
  }

  if (attachment.url.startsWith("idb://")) {
    return attachment.url.replace("idb://", "");
  }

  return undefined;
}

function getAttachmentNameFromUrl(url: string) {
  if (!url || url.trim().toLowerCase().startsWith("data:") || url.startsWith("idb://")) {
    return undefined;
  }

  const rawPath = url.trim().split("#")[0].split("?")[0];
  const fileName = rawPath.split("/").filter(Boolean).pop();

  if (!fileName) {
    return undefined;
  }

  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
}

function detectAttachmentKind(
  url: string,
  mimeType?: string,
  name?: string,
  preferredKind?: StoredAttachment["kind"],
) {
  const lowerCaseUrl = normalizeUrlForDetection(url);
  const normalizedMimeType = mimeType?.trim().toLowerCase() ?? "";
  const normalizedName = name?.trim().toLowerCase() ?? "";
  const imageLikeName =
    normalizedName === "linked-image" || normalizedName.startsWith("linked-image.");
  const isImage =
    normalizedMimeType.startsWith("image/") ||
    lowerCaseUrl.startsWith("data:image/") ||
    lowerCaseUrl.endsWith(".png") ||
    lowerCaseUrl.endsWith(".jpg") ||
    lowerCaseUrl.endsWith(".jpeg") ||
    lowerCaseUrl.endsWith(".gif") ||
    lowerCaseUrl.endsWith(".webp") ||
    lowerCaseUrl.endsWith(".svg") ||
    imageLikeName;
  const isVideo =
    normalizedMimeType.startsWith("video/") ||
    lowerCaseUrl.startsWith("data:video/") ||
    lowerCaseUrl.endsWith(".mp4") ||
    lowerCaseUrl.endsWith(".webm") ||
    lowerCaseUrl.endsWith(".ogg") ||
    lowerCaseUrl.endsWith(".mov");
  const isAudio =
    normalizedMimeType.startsWith("audio/") ||
    lowerCaseUrl.startsWith("data:audio/") ||
    lowerCaseUrl.endsWith(".mp3") ||
    lowerCaseUrl.endsWith(".wav") ||
    lowerCaseUrl.endsWith(".m4a") ||
    lowerCaseUrl.endsWith(".aac") ||
    lowerCaseUrl.endsWith(".oga");

  if (isImage) {
    return "image";
  }

  if (isVideo) {
    return "video";
  }

  if (isAudio) {
    return "audio";
  }

  return preferredKind ?? "file";
}

function detectKindFromFile(file: File): StoredAttachment["kind"] {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  return "file";
}

export function normalizeStoredAttachment(
  attachment: StoredAttachment,
  preferredKind?: StoredAttachment["kind"],
): StoredAttachment {
  const nextKind = detectAttachmentKind(
    attachment.url || `idb://${attachment.storageKey ?? attachment.id}`,
    attachment.mimeType,
    attachment.name,
    preferredKind,
  );
  const nextName =
    attachment.name?.trim() ||
    getAttachmentNameFromUrl(attachment.url) ||
    "attachment";
  const storageKey = getAttachmentStorageKey(attachment);

  return {
    ...attachment,
    kind: nextKind,
    name: nextName,
    mimeType: attachment.mimeType || getDefaultMimeType(nextKind),
    url:
      attachment.url ||
      (storageKey ? `idb://${storageKey}` : ""),
    storageKey,
  };
}

export function buildUrlAttachment(
  url: string,
  fallbackName = "linked-image",
  preferredKind?: StoredAttachment["kind"],
): StoredAttachment {
  const trimmedUrl = url.trim();
  const nextKind = detectAttachmentKind(trimmedUrl, undefined, fallbackName, preferredKind);
  const nextName = getAttachmentNameFromUrl(trimmedUrl) ?? fallbackName;

  return {
    id: generateAttachmentId(),
    kind: nextKind,
    name: nextName,
    url: trimmedUrl,
    mimeType: getDefaultMimeType(nextKind),
    size: 0,
  };
}

export function getPostAttachments(post: FeedPost) {
  const attachments = (post.attachments ?? []).map((attachment) =>
    normalizeStoredAttachment(
      attachment,
      attachment.name === "linked-image" ? "image" : undefined,
    ),
  );

  if (post.imageUrl && !attachments.some((attachment) => attachment.url === post.imageUrl)) {
    attachments.unshift({
      ...buildUrlAttachment(post.imageUrl, "linked-image", "image"),
      id: `feed-image-${post.id}`,
    });
  }

  return attachments;
}

async function fileToDataUrlAttachment(file: File, attachmentId: string) {
  return new Promise<StoredAttachment>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("That file could not be read."));
        return;
      }

      resolve({
        id: attachmentId,
        kind: detectKindFromFile(file),
        name: file.name,
        url: result,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
      });
    };

    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [header, encodedContent] = dataUrl.split(",");

  if (!header || !encodedContent) {
    throw new Error("That file could not be moved into offline storage.");
  }

  const mimeTypeMatch = header.match(/^data:(.*?);base64$/i);
  const mimeType = mimeTypeMatch?.[1] || "application/octet-stream";
  const binaryString = atob(encodedContent);
  const bytes = new Uint8Array(binaryString.length);

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

export async function fileToStoredAttachment(file: File) {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(
      `Uploaded files stay under ${MAX_ATTACHMENT_SIZE_LABEL} each. For anything bigger, use a media link instead.`,
    );
  }

  const attachmentId = generateAttachmentId();

  if (isIndexedMediaAvailable()) {
    try {
      await saveAttachmentBlob(attachmentId, file);
    } catch {
      throw new Error(
        "That file could not be saved offline. Try a smaller upload or use a direct media link instead.",
      );
    }

    return {
      id: attachmentId,
      kind: detectKindFromFile(file),
      name: file.name,
      url: `idb://${attachmentId}`,
      storageKey: attachmentId,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    } satisfies StoredAttachment;
  }

  if (file.size > DATA_URL_FALLBACK_LIMIT_BYTES) {
    throw new Error(
      "Large uploads need IndexedDB-enabled browser storage. Try a smaller file or paste a media link instead.",
    );
  }

  return fileToDataUrlAttachment(file, attachmentId);
}

export async function filesToStoredAttachments(fileList: FileList | File[]) {
  const files = Array.from(fileList).slice(0, MAX_ATTACHMENTS_PER_PICK);

  return Promise.all(files.map((file) => fileToStoredAttachment(file)));
}

export async function releaseStoredAttachment(attachment: StoredAttachment) {
  const storageKey = getAttachmentStorageKey(attachment);

  if (!storageKey) {
    return;
  }

  try {
    await deleteAttachmentBlob(storageKey);
  } catch {
    return;
  }
}

export async function releaseStoredAttachments(attachments: StoredAttachment[]) {
  await Promise.all(attachments.map((attachment) => releaseStoredAttachment(attachment)));
}

export function shouldMigrateAttachmentToIndexedDb(attachment: StoredAttachment) {
  return Boolean(
    isIndexedMediaAvailable() &&
      !attachment.storageKey &&
      attachment.url?.trim().toLowerCase().startsWith("data:"),
  );
}

export async function migrateStoredAttachmentToIndexedDb(attachment: StoredAttachment) {
  if (!shouldMigrateAttachmentToIndexedDb(attachment)) {
    return attachment;
  }

  const storageKey = attachment.id || generateAttachmentId();

  try {
    const blob = dataUrlToBlob(attachment.url);
    await saveAttachmentBlob(storageKey, blob);

    return normalizeStoredAttachment(
      {
        ...attachment,
        url: `idb://${storageKey}`,
        storageKey,
      },
      attachment.kind,
    );
  } catch {
    return attachment;
  }
}

export async function migrateStoredAttachmentsToIndexedDb(attachments: StoredAttachment[]) {
  let changed = false;
  const nextAttachments = await Promise.all(
    attachments.map(async (attachment) => {
      const nextAttachment = await migrateStoredAttachmentToIndexedDb(attachment);

      if (
        nextAttachment.url !== attachment.url ||
        nextAttachment.storageKey !== attachment.storageKey
      ) {
        changed = true;
      }

      return nextAttachment;
    }),
  );

  return {
    attachments: nextAttachments,
    changed,
  };
}
