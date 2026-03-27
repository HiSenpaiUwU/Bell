import { useEffect, useMemo, useState } from "react";
import { StoredAttachment } from "../types";
import { normalizeStoredAttachment } from "../utils/attachments";
import { readAttachmentBlob } from "../utils/mediaStorage";

export interface ResolvedAttachment extends StoredAttachment {
  resolvedUrl: string | null;
  isLoading: boolean;
}

export function useResolvedAttachments(attachments: StoredAttachment[]) {
  const normalizedAttachments = useMemo(
    () => attachments.map((attachment) => normalizeStoredAttachment(attachment)),
    [attachments],
  );
  const attachmentSignature = useMemo(
    () =>
      normalizedAttachments
        .map((attachment) =>
          [
            attachment.id,
            attachment.storageKey ?? "",
            attachment.url,
            attachment.mimeType,
            attachment.kind,
            attachment.name,
          ].join("|"),
        )
        .join("||"),
    [normalizedAttachments],
  );
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let isActive = true;
    const objectUrls: string[] = [];

    const resolveUrls = async () => {
      const entries = await Promise.all(
        normalizedAttachments.map(async (attachment) => {
          if (!attachment.storageKey) {
            return [attachment.id, attachment.url] as const;
          }

          let blob: Blob | null = null;

          try {
            blob = await readAttachmentBlob(attachment.storageKey);
          } catch {
            return [attachment.id, attachment.url || ""] as const;
          }

          if (!blob) {
            return [attachment.id, attachment.url || ""] as const;
          }

          const objectUrl = URL.createObjectURL(blob);
          objectUrls.push(objectUrl);

          return [attachment.id, objectUrl] as const;
        }),
      );

      if (!isActive) {
        return;
      }

      const nextResolvedUrls = Object.fromEntries(entries);

      setResolvedUrls((currentResolvedUrls) => {
        const currentKeys = Object.keys(currentResolvedUrls);
        const nextKeys = Object.keys(nextResolvedUrls);

        if (
          currentKeys.length === nextKeys.length &&
          nextKeys.every((key) => currentResolvedUrls[key] === nextResolvedUrls[key])
        ) {
          return currentResolvedUrls;
        }

        return nextResolvedUrls;
      });
    };

    void resolveUrls();

    return () => {
      isActive = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [attachmentSignature]);

  return normalizedAttachments.map((attachment) => ({
    ...attachment,
    resolvedUrl: resolvedUrls[attachment.id] ?? (attachment.storageKey ? null : attachment.url),
    isLoading: Boolean(attachment.storageKey) && !resolvedUrls[attachment.id],
  })) satisfies ResolvedAttachment[];
}
