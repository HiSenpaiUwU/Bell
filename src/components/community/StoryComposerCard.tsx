import { ChangeEvent, FormEvent } from "react";
import { StoredAttachment } from "../../types";
import {
  ATTACHMENT_INPUT_ACCEPT,
  MAX_ATTACHMENT_SIZE_LABEL,
} from "../../utils/attachments";
import { AttachmentPreviewList } from "./AttachmentPreviewList";
import { EmojiPicker } from "./EmojiPicker";

interface StoryComposerCardProps {
  storyCaption: string;
  storyEmoji: string;
  storyLocation: string;
  storyLink: string;
  storyMediaUrl: string;
  storyAttachment: StoredAttachment | null;
  storyBackground: string;
  backgrounds: string[];
  onCaptionChange: (value: string) => void;
  onEmojiChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  onMediaUrlChange: (value: string) => void;
  onFilePick: (event: ChangeEvent<HTMLInputElement>) => void;
  onBackgroundChange: (value: string) => void;
  onRemoveAttachment: () => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function StoryComposerCard({
  storyCaption,
  storyEmoji,
  storyLocation,
  storyLink,
  storyMediaUrl,
  storyAttachment,
  storyBackground,
  backgrounds,
  onCaptionChange,
  onEmojiChange,
  onLocationChange,
  onLinkChange,
  onMediaUrlChange,
  onFilePick,
  onBackgroundChange,
  onRemoveAttachment,
  onCancel,
  onSubmit,
}: StoryComposerCardProps) {
  return (
    <form className="summary-card story-composer" onSubmit={onSubmit}>
      <div className="community-panel__header">
        <div>
          <p className="eyebrow">Add a story</p>
          <h2>Share a quick moment</h2>
          <p className="summary-note">
            Stories stay up for 24 hours and can hold a caption, location, link, or one media file.
          </p>
        </div>
        <EmojiPicker
          buttonLabel={storyEmoji}
          title="Choose a story emoji"
          onSelect={onEmojiChange}
        />
      </div>

      <textarea
        value={storyCaption}
        onChange={(event) => onCaptionChange(event.target.value)}
        placeholder="What is happening right now?"
      />

      <div className="field-grid field-grid--auth">
        <label>
          <span>Location / vibe</span>
          <input
            type="text"
            value={storyLocation}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="At the Bell Fresh counter"
          />
        </label>
        <label>
          <span>Link (optional)</span>
          <input
            type="url"
            value={storyLink}
            onChange={(event) => onLinkChange(event.target.value)}
            placeholder="https://..."
          />
        </label>
      </div>

      <div className="field-grid field-grid--auth">
        <label>
          <span>Story media link</span>
          <input
            type="url"
            value={storyMediaUrl}
            onChange={(event) => onMediaUrlChange(event.target.value)}
            placeholder="https://link.com/story.mp4"
          />
        </label>
        <label className="attachment-input">
          <span>{`Upload story media (photo, GIF, video, audio, or file up to ${MAX_ATTACHMENT_SIZE_LABEL})`}</span>
          <input type="file" accept={ATTACHMENT_INPUT_ACCEPT} onChange={onFilePick} />
        </label>
      </div>

      <div className="story-backgrounds" aria-label="Story background styles">
        {backgrounds.map((background) => (
          <button
            key={background}
            type="button"
            className={`story-background-swatch${storyBackground === background ? " is-active" : ""}`}
            style={{ background }}
            onClick={() => onBackgroundChange(background)}
          />
        ))}
      </div>

      {storyAttachment ? (
        <AttachmentPreviewList
          attachments={[storyAttachment]}
          onRemove={onRemoveAttachment}
          compact
        />
      ) : null}

      <div className="community-composer__actions">
        <div className="community-emoji-row">
          <span className="community-badge">{`${storyEmoji} Story`}</span>
          <span className="summary-note">Text-only stories work too if you want a cleaner look.</span>
        </div>
        <div className="story-composer__actions">
          <button type="button" className="ghost-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="cta-link">
            Share story
          </button>
        </div>
      </div>
    </form>
  );
}
