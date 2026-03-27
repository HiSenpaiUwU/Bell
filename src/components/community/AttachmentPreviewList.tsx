import { useResolvedAttachments } from "../../hooks/useResolvedAttachments";
import { StoredAttachment } from "../../types";

function AudioIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 18V6l10-2v12" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="18.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        d="M9 12.5 14.5 7a3.2 3.2 0 1 1 4.5 4.5l-7.4 7.4a4.2 4.2 0 0 1-5.9-5.9l7.1-7.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface AttachmentPreviewListProps {
  attachments: StoredAttachment[];
  onRemove?: (attachmentId: string) => void;
  compact?: boolean;
}

export function AttachmentPreviewList({
  attachments,
  onRemove,
  compact = false,
}: AttachmentPreviewListProps) {
  const resolvedAttachments = useResolvedAttachments(attachments);

  if (resolvedAttachments.length === 0) {
    return null;
  }

  return (
    <div className={`attachment-grid${compact ? " attachment-grid--compact" : ""}`}>
      {resolvedAttachments.map((attachment) => (
        <article key={attachment.id} className="attachment-card">
          {attachment.isLoading ? (
            <div className="attachment-card__loading">Loading preview...</div>
          ) : attachment.kind === "image" && attachment.resolvedUrl ? (
            <img
              src={attachment.resolvedUrl}
              alt={attachment.name}
              className="attachment-card__image"
              loading="lazy"
              decoding="async"
            />
          ) : attachment.kind === "video" && attachment.resolvedUrl ? (
            <video className="attachment-card__media" controls preload="metadata">
              <source src={attachment.resolvedUrl} type={attachment.mimeType} />
            </video>
          ) : attachment.kind === "audio" && attachment.resolvedUrl ? (
            <div className="attachment-card__audio">
              <span className="attachment-card__icon" aria-hidden="true">
                <AudioIcon />
              </span>
              <audio controls preload="metadata">
                <source src={attachment.resolvedUrl} type={attachment.mimeType} />
              </audio>
            </div>
          ) : (
            <div className="attachment-card__file">
              <span className="attachment-card__icon" aria-hidden="true">
                <FileIcon />
              </span>
              <div className="attachment-card__file-copy">
                <strong>{attachment.name}</strong>
                <a href={attachment.resolvedUrl ?? attachment.url} download={attachment.name}>
                  Download file
                </a>
              </div>
            </div>
          )}

          <div className="attachment-card__footer">
            <span>{attachment.name}</span>
            {onRemove ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => onRemove(attachment.id)}
              >
                Remove
              </button>
            ) : (
              <a href={attachment.resolvedUrl ?? attachment.url} target="_blank" rel="noreferrer">
                Open
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
