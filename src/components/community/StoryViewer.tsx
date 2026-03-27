import { useEffect, useMemo, useState } from "react";
import { useResolvedAttachments } from "../../hooks/useResolvedAttachments";
import { Story, User } from "../../types";

interface StoryWithAuthor extends Story {
  author: Pick<User, "id" | "firstName" | "lastName" | "username" | "avatarUrl" | "favoriteEmoji">;
}

interface StoryViewerProps {
  stories: StoryWithAuthor[];
  activeStoryId: string | null;
  currentUserId?: string;
  onClose: () => void;
  onSeen: (storyId: string) => void;
  onRemove?: (storyId: string) => void;
}

const STORY_ADVANCE_MS = 6500;

function formatStoryHeaderTime(createdAt: string) {
  const date = new Date(createdAt);

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function StoryViewer({
  stories,
  activeStoryId,
  currentUserId,
  onClose,
  onSeen,
  onRemove,
}: StoryViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!activeStoryId) {
      return;
    }

    const nextIndex = stories.findIndex((story) => story.id === activeStoryId);

    if (nextIndex >= 0) {
      setActiveIndex(nextIndex);
    }
  }, [activeStoryId, stories]);

  const activeStory = stories[activeIndex] ?? null;
  const resolvedAttachments = useResolvedAttachments(
    activeStory?.attachment ? [activeStory.attachment] : [],
  );
  const resolvedAttachment = resolvedAttachments[0];
  const canRemove =
    Boolean(activeStory) &&
    Boolean(currentUserId) &&
    (activeStory.authorId === currentUserId || currentUserId === "admin-bell-fresh");

  useEffect(() => {
    if (!activeStory) {
      return;
    }

    onSeen(activeStory.id);
  }, [activeStory?.id, onSeen]);

  useEffect(() => {
    if (!activeStoryId || stories.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) =>
        currentIndex >= stories.length - 1 ? 0 : currentIndex + 1,
      );
    }, STORY_ADVANCE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeStoryId, stories.length]);

  useEffect(() => {
    if (!activeStoryId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((currentIndex) =>
          currentIndex >= stories.length - 1 ? 0 : currentIndex + 1,
        );
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((currentIndex) =>
          currentIndex <= 0 ? stories.length - 1 : currentIndex - 1,
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeStoryId, onClose, stories.length]);

  const attachmentView = useMemo(() => {
    if (!activeStory || !resolvedAttachment?.resolvedUrl) {
      return null;
    }

    if (resolvedAttachment.kind === "image") {
      return (
        <img
          src={resolvedAttachment.resolvedUrl}
          alt={activeStory.caption || "Story image"}
          className="story-viewer__media"
        />
      );
    }

    if (resolvedAttachment.kind === "video") {
      return (
        <video
          className="story-viewer__media"
          controls
          autoPlay
          playsInline
          preload="metadata"
        >
          <source src={resolvedAttachment.resolvedUrl} type={resolvedAttachment.mimeType} />
        </video>
      );
    }

    if (resolvedAttachment.kind === "audio") {
      return (
        <div className="story-viewer__audio">
          <p>{activeStory.caption || "Audio story"}</p>
          <audio controls autoPlay preload="metadata">
            <source src={resolvedAttachment.resolvedUrl} type={resolvedAttachment.mimeType} />
          </audio>
        </div>
      );
    }

    return (
      <div className="story-viewer__file">
        <p>{resolvedAttachment.name}</p>
        <a href={resolvedAttachment.resolvedUrl} target="_blank" rel="noreferrer">
          Open attachment
        </a>
      </div>
    );
  }, [activeStory, resolvedAttachment]);

  if (!activeStoryId || !activeStory) {
    return null;
  }

  return (
    <div className="story-viewer">
      <button
        type="button"
        className="story-viewer__backdrop"
        aria-label="Close story viewer"
        onClick={onClose}
      />

      <div className="story-viewer__panel">
        <div className="story-viewer__progress">
          {stories.map((story, index) => (
            <span
              key={story.id}
              className={`story-viewer__progress-bar${
                index < activeIndex ? " is-complete" : index === activeIndex ? " is-active" : ""
              }`}
            />
          ))}
        </div>

        <div className="story-viewer__header">
          <div className="story-viewer__author">
            <span className="community-contact__avatar">
              {activeStory.author.avatarUrl ? (
                <img
                  src={activeStory.author.avatarUrl}
                  alt={activeStory.author.firstName}
                  loading="lazy"
                />
              ) : (
                activeStory.author.favoriteEmoji ?? activeStory.author.firstName.charAt(0)
              )}
            </span>
            <div>
              <strong>{`${activeStory.author.firstName} ${activeStory.author.lastName}`}</strong>
              <p>{formatStoryHeaderTime(activeStory.createdAt)}</p>
            </div>
          </div>

          <div className="story-viewer__actions">
            {canRemove && onRemove ? (
              <button
                type="button"
                className="ghost-button ghost-button--danger"
                onClick={() => onRemove(activeStory.id)}
              >
                Remove
              </button>
            ) : null}
            <button type="button" className="ghost-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div
          className="story-viewer__body"
          style={{
            background:
              activeStory.background ??
              "linear-gradient(135deg, rgba(17,35,28,0.98), rgba(34,77,58,0.95))",
          }}
        >
          {attachmentView ? attachmentView : (
            <div className="story-viewer__text-card">
              <span className="story-viewer__emoji">{activeStory.emoji ?? "\u2728"}</span>
              <p>{activeStory.caption || "Fresh Bell Fresh story"}</p>
            </div>
          )}

          <div className="story-viewer__caption">
            {activeStory.emoji ? <span>{activeStory.emoji}</span> : null}
            {activeStory.caption ? <p>{activeStory.caption}</p> : null}
            <div className="story-viewer__meta">
              {activeStory.location ? <span>{activeStory.location}</span> : null}
              <span>{`${activeStory.viewedBy.length} views`}</span>
              {activeStory.linkUrl ? (
                <a href={activeStory.linkUrl} target="_blank" rel="noreferrer">
                  Open link
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {stories.length > 1 ? (
          <>
            <button
              type="button"
              className="story-viewer__nav story-viewer__nav--prev"
              onClick={() =>
                setActiveIndex((currentIndex) =>
                  currentIndex <= 0 ? stories.length - 1 : currentIndex - 1,
                )
              }
            >
              {"\u2039"}
            </button>
            <button
              type="button"
              className="story-viewer__nav story-viewer__nav--next"
              onClick={() =>
                setActiveIndex((currentIndex) =>
                  currentIndex >= stories.length - 1 ? 0 : currentIndex + 1,
                )
              }
            >
              {"\u203A"}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
