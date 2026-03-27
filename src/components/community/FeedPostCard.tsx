import { ChangeEvent, FormEvent } from "react";
import { ATTACHMENT_INPUT_ACCEPT } from "../../utils/attachments";
import { FeedPost, ReactionGroup, StoredAttachment, User } from "../../types";
import { AttachmentPreviewList } from "./AttachmentPreviewList";
import { EmojiPicker } from "./EmojiPicker";
import { ReactionBar } from "./ReactionBar";

interface FeedAuthor
  extends Pick<User, "id" | "firstName" | "lastName" | "username" | "avatarUrl" | "favoriteEmoji"> {}

interface EnrichedComment {
  id: string;
  authorId: string;
  content: string;
  emoji?: string;
  attachments?: StoredAttachment[];
  reactions?: ReactionGroup[];
  replies?: EnrichedComment[];
  createdAt: string;
  author: FeedAuthor;
}

interface EnrichedPost extends FeedPost {
  author: FeedAuthor;
  comments?: EnrichedComment[];
}

interface CommentReplyTarget {
  id: string;
  authorName: string;
}

interface FeedPostCardProps {
  post: EnrichedPost;
  currentUserId?: string;
  currentUserRole?: string;
  interactionDisabled?: boolean;
  postAttachments: StoredAttachment[];
  commentDraft: string;
  commentMediaUrl: string;
  commentReplyTarget?: CommentReplyTarget | null;
  commentAttachments: StoredAttachment[];
  commentCount: number;
  formatFeedTime: (value: string) => string;
  getFeedBadgeLabel: (kind?: FeedPost["kind"], isAnnouncement?: boolean) => string;
  onToggleLike: (postId: string) => void;
  onRemovePost: (postId: string) => void;
  onCommentDraftChange: (postId: string, value: string) => void;
  onCommentMediaUrlChange: (postId: string, value: string) => void;
  onCommentReplyTargetChange: (postId: string, target: CommentReplyTarget | null) => void;
  onCommentFilePick: (postId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onCommentRemoveAttachment: (postId: string, attachmentId: string) => void;
  onAddComment: (event: FormEvent<HTMLFormElement>, postId: string) => void;
  onRemoveComment: (postId: string, commentId: string) => void;
  onToggleCommentReaction: (postId: string, commentId: string, emoji: string) => void;
  onCommentEmojiSelect: (postId: string, emoji: string) => void;
}

function getAuthorName(author: FeedAuthor) {
  return `${author.firstName} ${author.lastName}`.trim();
}

export function FeedPostCard({
  post,
  currentUserId,
  currentUserRole,
  interactionDisabled = false,
  postAttachments,
  commentDraft,
  commentMediaUrl,
  commentReplyTarget,
  commentAttachments,
  commentCount,
  formatFeedTime,
  getFeedBadgeLabel,
  onToggleLike,
  onRemovePost,
  onCommentDraftChange,
  onCommentMediaUrlChange,
  onCommentReplyTargetChange,
  onCommentFilePick,
  onCommentRemoveAttachment,
  onAddComment,
  onRemoveComment,
  onToggleCommentReaction,
  onCommentEmojiSelect,
}: FeedPostCardProps) {
  const canRemovePost = currentUserRole === "admin" || post.authorId === currentUserId;
  const isLiked = Boolean(currentUserId && post.likedBy.includes(currentUserId));

  const renderComment = (comment: EnrichedComment, depth = 0) => {
    const canRemoveComment = currentUserRole === "admin" || comment.authorId === currentUserId;
    const isReplyTarget = commentReplyTarget?.id === comment.id;
    const commentAuthorName = getAuthorName(comment.author);

    return (
      <article
        key={comment.id}
        className={`feed-comment-card${depth > 0 ? " feed-comment-card--reply" : ""}`}
      >
        <div className="feed-comment-card__header">
          <div className="feed-card__author">
            <span className="community-contact__avatar">
              {comment.author.avatarUrl ? (
                <img src={comment.author.avatarUrl} alt={comment.author.firstName} loading="lazy" />
              ) : (
                comment.author.favoriteEmoji ?? "\uD83D\uDCAC"
              )}
            </span>
            <div>
              <strong>{commentAuthorName}</strong>
              <p>{`@${comment.author.username} • ${formatFeedTime(comment.createdAt)}`}</p>
            </div>
          </div>

          <div className="feed-comment-card__tools">
            <button
              type="button"
              className={`ghost-button${isReplyTarget ? " is-active" : ""}`}
              onClick={() =>
                onCommentReplyTargetChange(
                  post.id,
                  isReplyTarget ? null : { id: comment.id, authorName: commentAuthorName },
                )
              }
              disabled={interactionDisabled}
            >
              {isReplyTarget ? "Cancel reply" : "Reply"}
            </button>
            {canRemoveComment ? (
              <button
                type="button"
                className="ghost-button ghost-button--danger"
                onClick={() => onRemoveComment(post.id, comment.id)}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>

        {comment.content ? (
          <p className="feed-comment-card__content">
            {`${comment.emoji ?? ""} ${comment.content}`.trim()}
          </p>
        ) : null}

        <AttachmentPreviewList attachments={comment.attachments ?? []} compact />

        <div className="feed-comment-card__meta">
          <ReactionBar
            reactions={comment.reactions}
            currentUserId={currentUserId}
            compact
            onToggle={(emoji) => onToggleCommentReaction(post.id, comment.id, emoji)}
            disabled={interactionDisabled}
          />
          {comment.replies?.length ? (
            <span className="summary-note">{`${comment.replies.length} repl${
              comment.replies.length === 1 ? "y" : "ies"
            }`}</span>
          ) : null}
        </div>

        {comment.replies?.length ? (
          <div className="feed-comment-replies">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <article
      className={`summary-card feed-card${post.isAnnouncement ? " feed-card--announcement" : ""}`}
    >
      <div className="feed-card__header">
        <div className="feed-card__author">
          <span className="community-contact__avatar">
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt={post.author.firstName} loading="lazy" />
            ) : (
              post.author.favoriteEmoji ?? "\uD83E\uDD57"
            )}
          </span>
          <div>
            <strong>{getAuthorName(post.author)}</strong>
            <p>{`@${post.author.username} • ${formatFeedTime(post.createdAt)}`}</p>
          </div>
        </div>

        <div className="feed-card__meta">
          <span className="community-badge">
            {`${post.emoji ?? "\uD83D\uDCF0"} ${getFeedBadgeLabel(post.kind, post.isAnnouncement)}`}
          </span>
          {post.source ? <span className="community-badge">{post.source}</span> : null}
        </div>
      </div>

      {post.content ? <p className="feed-card__content">{post.content}</p> : null}

      <AttachmentPreviewList attachments={postAttachments} />

      <div className="feed-card__actions">
        <button
          type="button"
          className={`ghost-button${isLiked ? " is-active" : ""}`}
          onClick={() => onToggleLike(post.id)}
          disabled={interactionDisabled}
        >
          {isLiked
            ? `\uD83D\uDC9A Liked (${post.likedBy.length})`
            : `\uD83E\uDD0D Like (${post.likedBy.length})`}
        </button>
        <span className="summary-note">{`${commentCount} comment${commentCount === 1 ? "" : "s"}`}</span>
        {canRemovePost ? (
          <button
            type="button"
            className="ghost-button ghost-button--danger"
            onClick={() => onRemovePost(post.id)}
          >
            Remove
          </button>
        ) : null}
      </div>

      <section className="feed-comments">
        <div className="feed-comments__header">
          <strong>Comments</strong>
          <span className="summary-note">
            {commentCount > 0 ? `${commentCount} saved` : "Be the first"}
          </span>
        </div>

        {post.comments?.length ? (
          <div className="feed-comment-list">{post.comments.map((comment) => renderComment(comment))}</div>
        ) : (
          <p className="summary-note">No comments yet. Start the conversation.</p>
        )}

        <form className="feed-comment-form" onSubmit={(event) => onAddComment(event, post.id)}>
          {commentReplyTarget ? (
            <div className="reply-target-pill">
              <span>{`Replying to ${commentReplyTarget.authorName}`}</span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => onCommentReplyTargetChange(post.id, null)}
              >
                Clear
              </button>
            </div>
          ) : null}

          <textarea
            value={commentDraft}
            onChange={(event) => onCommentDraftChange(post.id, event.target.value)}
            placeholder={
              commentReplyTarget
                ? `Reply to ${commentReplyTarget.authorName}...`
                : `Comment on ${post.author.firstName}'s post...`
            }
            disabled={interactionDisabled}
          />

          <label className="community-inline-input">
            <span>GIF or media link</span>
            <input
              type="url"
              value={commentMediaUrl}
              onChange={(event) => onCommentMediaUrlChange(post.id, event.target.value)}
              placeholder="https://media-link.com/cute-reply.gif"
              disabled={interactionDisabled}
            />
          </label>

          <AttachmentPreviewList
            attachments={commentAttachments}
            onRemove={(attachmentId) => onCommentRemoveAttachment(post.id, attachmentId)}
            compact
          />

          <div className="community-composer__actions">
            <div className="community-emoji-row">
              <EmojiPicker
                buttonLabel={"\uD83D\uDE0A"}
                title="Add emoji to comment"
                onSelect={(emoji) => onCommentEmojiSelect(post.id, emoji)}
                disabled={interactionDisabled}
              />

              <label className="ghost-button attachment-button">
                Attach
                <input
                  type="file"
                  multiple
                  accept={ATTACHMENT_INPUT_ACCEPT}
                  onChange={(event) => onCommentFilePick(post.id, event)}
                  disabled={interactionDisabled}
                />
              </label>
            </div>

            <button type="submit" className="cta-link cta-link--soft" disabled={interactionDisabled}>
              {commentReplyTarget ? "Reply" : "Comment"}
            </button>
          </div>
        </form>
      </section>
    </article>
  );
}
