import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { FeedPostCard } from "../components/community/FeedPostCard";
import { AttachmentPreviewList } from "../components/community/AttachmentPreviewList";
import { EmojiPicker } from "../components/community/EmojiPicker";
import { StoryComposerCard } from "../components/community/StoryComposerCard";
import { StoryTray } from "../components/community/StoryTray";
import { StoryViewer } from "../components/community/StoryViewer";
import { useAuth } from "../context/AuthContext";
import { useFeedCommunity } from "../context/CommunityContext";
import { useNotifications } from "../context/NotificationContext";
import { FeedComment, FeedPostKind, StoredAttachment, User } from "../types";
import {
  ATTACHMENT_INPUT_ACCEPT,
  buildUrlAttachment,
  filesToStoredAttachments,
  getPostAttachments,
  MAX_ATTACHMENTS_PER_PICK,
  MAX_ATTACHMENT_SIZE_LABEL,
  releaseStoredAttachment,
} from "../utils/attachments";
import { countComments } from "../utils/community";
import { repairMojibakeText, repairOptionalText } from "../utils/text";

type FeedFilter = "all" | FeedPostKind | "announcements";
type DraftMap = Record<string, string>;
type AttachmentMap = Record<string, StoredAttachment[]>;
type UrlMap = Record<string, string>;

interface CommentReplyTarget {
  id: string;
  authorName: string;
}

type ReplyTargetMap = Record<string, CommentReplyTarget | null>;
type CommentSearchNode = { content: string; replies?: CommentSearchNode[] };
type EnrichedCommentNode = FeedComment & {
  author: ReturnType<typeof enrichAuthor>;
  replies: EnrichedCommentNode[];
};

const STORY_BACKGROUNDS = [
  "linear-gradient(135deg, rgba(19,104,67,0.96), rgba(68,168,116,0.88), rgba(255,224,160,0.86))",
  "linear-gradient(135deg, rgba(44,24,70,0.96), rgba(158,88,196,0.9), rgba(255,182,193,0.8))",
  "linear-gradient(135deg, rgba(14,42,74,0.97), rgba(47,118,184,0.9), rgba(173,216,230,0.82))",
  "linear-gradient(135deg, rgba(73,33,11,0.97), rgba(202,112,42,0.9), rgba(255,222,173,0.84))",
];

function formatFeedTime(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getFeedBadgeLabel(kind?: FeedPostKind, isAnnouncement?: boolean) {
  if (isAnnouncement) {
    return "Announcement";
  }

  switch (kind) {
    case "news":
      return "News";
    case "meme":
      return "Meme";
    case "photo":
      return "Photo";
    default:
      return "Update";
  }
}

function appendEmoji(currentValue: string, emoji: string) {
  return `${currentValue}${emoji} `;
}

function getFallbackAuthor(userId: string) {
  if (userId === "admin-bell-fresh" || userId === "bellfresh") {
    return {
      id: "bellfresh",
      firstName: "Bell",
      lastName: "Fresh",
      username: "bellfreshadmin",
      favoriteEmoji: "\uD83E\uDD57",
      avatarUrl: undefined,
    } as const;
  }

  return {
    id: "guest",
    firstName: "Bell",
    lastName: "Guest",
    username: "guest",
    favoriteEmoji: "\uD83D\uDCAC",
    avatarUrl: undefined,
  } as const;
}

function enrichAuthor(users: User[], authorId: string) {
  const author = users.find((user) => user.id === authorId) ?? getFallbackAuthor(authorId);
  const repairedFavoriteEmoji = repairOptionalText(author.favoriteEmoji);

  return {
    ...author,
    favoriteEmoji:
      repairedFavoriteEmoji ??
      (author.id === "bellfresh" ? "\uD83E\uDD57" : author.id === "guest" ? "\uD83D\uDCAC" : undefined),
  };
}

function enrichComments(users: User[], comments: FeedComment[] = []): EnrichedCommentNode[] {
  return comments.map((comment) => ({
    ...comment,
    author: enrichAuthor(users, comment.authorId),
    replies: enrichComments(users, comment.replies ?? []),
  }));
}

function flattenCommentContent(comments: CommentSearchNode[] = []): string[] {
  return comments.flatMap((comment) => [
    comment.content,
    ...flattenCommentContent(comment.replies ?? []),
  ]);
}

export function NewsFeedPage() {
  const { currentUser, users } = useAuth();
  const {
    addComment,
    createPost,
    createStory,
    getUnreadPostCount,
    markFeedSeen,
    markStorySeen,
    posts,
    removeComment,
    removePost,
    removeStory,
    stories,
    toggleCommentReaction,
    togglePostLike,
  } = useFeedCommunity();
  const { notify } = useNotifications();
  const [postText, setPostText] = useState("");
  const [postEmoji, setPostEmoji] = useState("\uD83D\uDCF0");
  const [postKind, setPostKind] = useState<FeedPostKind>("update");
  const [postMediaUrl, setPostMediaUrl] = useState("");
  const [postAttachments, setPostAttachments] = useState<StoredAttachment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FeedFilter>("all");
  const [commentDrafts, setCommentDrafts] = useState<DraftMap>({});
  const [commentMediaUrls, setCommentMediaUrls] = useState<UrlMap>({});
  const [commentReplyTargets, setCommentReplyTargets] = useState<ReplyTargetMap>({});
  const [commentAttachments, setCommentAttachments] = useState<AttachmentMap>({});
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [storyCaption, setStoryCaption] = useState("");
  const [storyEmoji, setStoryEmoji] = useState("\u2728");
  const [storyLocation, setStoryLocation] = useState("");
  const [storyLink, setStoryLink] = useState("");
  const [storyMediaUrl, setStoryMediaUrl] = useState("");
  const [storyAttachment, setStoryAttachment] = useState<StoredAttachment | null>(null);
  const [storyBackground, setStoryBackground] = useState(STORY_BACKGROUNDS[0]);
  const canInteract = Boolean(currentUser);

  useEffect(() => {
    markFeedSeen();
  }, [markFeedSeen, posts.length]);

  useEffect(() => {
    const repairedEmoji = repairMojibakeText(postEmoji);

    if (repairedEmoji !== postEmoji) {
      setPostEmoji(repairedEmoji);
    }
  }, [postEmoji]);

  useEffect(() => {
    const repairedEmoji = repairMojibakeText(storyEmoji);

    if (repairedEmoji !== storyEmoji) {
      setStoryEmoji(repairedEmoji);
    }
  }, [storyEmoji]);

  const enrichedPosts = useMemo(
    () =>
      posts
        .map((post) => ({
          ...post,
          author: enrichAuthor(users, post.authorId),
          comments: enrichComments(users, post.comments ?? []),
        }))
        .sort(
          (leftPost, rightPost) =>
            new Date(rightPost.createdAt).getTime() - new Date(leftPost.createdAt).getTime(),
        ),
    [posts, users],
  );

  const enrichedStories = useMemo(
    () =>
      [...stories]
        .map((story) => ({
          ...story,
          author: enrichAuthor(users, story.authorId),
        }))
        .sort(
          (leftStory, rightStory) =>
            new Date(rightStory.createdAt).getTime() - new Date(leftStory.createdAt).getTime(),
        ),
    [stories, users],
  );

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return enrichedPosts.filter((post) => {
      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "announcements"
            ? Boolean(post.isAnnouncement)
            : post.kind === activeFilter;

      const searchableText = [
        post.content,
        post.source,
        post.kind,
        post.author.firstName,
        post.author.lastName,
        post.author.username,
        ...flattenCommentContent(post.comments ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [activeFilter, enrichedPosts, searchTerm]);

  const newsCount = enrichedPosts.filter((post) => post.kind === "news").length;
  const memeCount = enrichedPosts.filter((post) => post.kind === "meme").length;
  const photoCount = enrichedPosts.filter((post) => post.kind === "photo").length;
  const unreadPostCount = getUnreadPostCount();
  const spotlightPosts = useMemo(
    () =>
      enrichedPosts
        .filter((post) => post.kind === "news" || post.kind === "meme" || post.kind === "photo")
        .slice(0, 1),
    [enrichedPosts],
  );
  const activeSpotlightPost = spotlightPosts[0] ?? null;

  const handlePostFilePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    try {
      const nextAttachments = await filesToStoredAttachments(files);

      setPostAttachments((currentAttachments) =>
        [...currentAttachments, ...nextAttachments].slice(0, MAX_ATTACHMENTS_PER_PICK),
      );
    } catch (error) {
      notify({
        title: "Attachment not added",
        message: error instanceof Error ? error.message : "That attachment could not be added.",
        tone: "warning",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleStoryFilePick = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    try {
      const [nextAttachment] = await filesToStoredAttachments(files);

      if (storyAttachment) {
        await releaseStoredAttachment(storyAttachment);
      }

      setStoryAttachment(nextAttachment ?? null);
    } catch (error) {
      notify({
        title: "Story attachment not added",
        message: error instanceof Error ? error.message : "That story file could not be added.",
        tone: "warning",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleCommentFilePick = async (
    postId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    try {
      const nextAttachments = await filesToStoredAttachments(files);

      setCommentAttachments((currentAttachments) => ({
        ...currentAttachments,
        [postId]: [...(currentAttachments[postId] ?? []), ...nextAttachments].slice(
          0,
          MAX_ATTACHMENTS_PER_PICK,
        ),
      }));
    } catch (error) {
      notify({
        title: "Attachment not added",
        message: error instanceof Error ? error.message : "That attachment could not be added.",
        tone: "warning",
      });
    } finally {
      event.target.value = "";
    }
  };

  const handleRemovePostDraftAttachment = async (attachmentId: string) => {
    const targetAttachment = postAttachments.find((attachment) => attachment.id === attachmentId);

    setPostAttachments((currentAttachments) =>
      currentAttachments.filter((attachment) => attachment.id !== attachmentId),
    );

    if (targetAttachment) {
      await releaseStoredAttachment(targetAttachment);
    }
  };

  const handleRemoveCommentDraftAttachment = async (postId: string, attachmentId: string) => {
    const targetAttachment = (commentAttachments[postId] ?? []).find(
      (attachment) => attachment.id === attachmentId,
    );

    setCommentAttachments((currentAttachments) => ({
      ...currentAttachments,
      [postId]: (currentAttachments[postId] ?? []).filter(
        (attachment) => attachment.id !== attachmentId,
      ),
    }));

    if (targetAttachment) {
      await releaseStoredAttachment(targetAttachment);
    }
  };

  const resetStoryComposer = async () => {
    if (storyAttachment) {
      await releaseStoredAttachment(storyAttachment);
    }

    setStoryCaption("");
    setStoryEmoji("\u2728");
    setStoryLocation("");
    setStoryLink("");
    setStoryMediaUrl("");
    setStoryAttachment(null);
    setStoryBackground(STORY_BACKGROUNDS[0]);
    setStoryComposerOpen(false);
  };

  const handleRemoveStoryDraftAttachment = async () => {
    if (!storyAttachment) {
      return;
    }

    await releaseStoredAttachment(storyAttachment);
    setStoryAttachment(null);
  };

  const handleSubmitPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextAttachments = [
      ...postAttachments,
      ...(postMediaUrl.trim() ? [buildUrlAttachment(postMediaUrl, "linked-media")] : []),
    ];

    const result = createPost(postText, {
      emoji: postEmoji,
      attachments: nextAttachments,
      kind: postKind,
      source: "Bell Fresh Community",
    });

    notify({
      title: result.success ? "Posted to feed" : "Post not shared",
      message: result.message,
      tone: result.success ? "success" : "warning",
    });

    if (!result.success) {
      return;
    }

    setPostText("");
    setPostEmoji("\uD83D\uDCF0");
    setPostKind("update");
    setPostMediaUrl("");
    setPostAttachments([]);
    markFeedSeen();
  };

  const handleSubmitStory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = createStory({
      caption: storyCaption,
      emoji: storyEmoji,
      attachment:
        storyAttachment ?? (storyMediaUrl.trim() ? buildUrlAttachment(storyMediaUrl, "story-media") : undefined),
      location: storyLocation,
      linkUrl: storyLink,
      background: storyBackground,
    });

    notify({
      title: result.success ? "Story shared" : "Story not shared",
      message: result.message,
      tone: result.success ? "success" : "warning",
    });

    if (!result.success) {
      return;
    }

    setStoryCaption("");
    setStoryEmoji("\u2728");
    setStoryLocation("");
    setStoryLink("");
    setStoryMediaUrl("");
    setStoryAttachment(null);
    setStoryBackground(STORY_BACKGROUNDS[0]);
    setStoryComposerOpen(false);
  };

  const handleSubmitComment = (event: FormEvent<HTMLFormElement>, postId: string) => {
    event.preventDefault();

    const nextAttachments = [
      ...(commentAttachments[postId] ?? []),
      ...(commentMediaUrls[postId]?.trim()
        ? [buildUrlAttachment(commentMediaUrls[postId], "linked-comment-media")]
        : []),
    ];
    const result = addComment(postId, commentDrafts[postId] ?? "", {
      attachments: nextAttachments,
      parentCommentId: commentReplyTargets[postId]?.id,
    });

    notify({
      title: result.success ? "Comment added" : "Comment not added",
      message: result.message,
      tone: result.success ? "success" : "warning",
    });

    if (!result.success) {
      return;
    }

    setCommentDrafts((currentDrafts) => ({ ...currentDrafts, [postId]: "" }));
    setCommentMediaUrls((currentMediaUrls) => ({ ...currentMediaUrls, [postId]: "" }));
    setCommentAttachments((currentAttachments) => ({ ...currentAttachments, [postId]: [] }));
    setCommentReplyTargets((currentTargets) => ({ ...currentTargets, [postId]: null }));
  };

  const handleRemovePost = (postId: string) => {
    const result = removePost(postId);

    notify({
      title: result.success ? "Post removed" : "Post not removed",
      message: result.message,
      tone: result.success ? "success" : "warning",
    });
  };

  const handleRemoveComment = (postId: string, commentId: string) => {
    const result = removeComment(postId, commentId);

    notify({
      title: result.success ? "Comment removed" : "Comment not removed",
      message: result.message,
      tone: result.success ? "success" : "warning",
    });

    if (result.success && commentReplyTargets[postId]?.id === commentId) {
      setCommentReplyTargets((currentTargets) => ({ ...currentTargets, [postId]: null }));
    }
  };

  const handleRemoveStory = (storyId: string) => {
    const result = removeStory(storyId);

    notify({
      title: result.success ? "Story removed" : "Story not removed",
      message: result.message,
      tone: result.success ? "success" : "warning",
    });

    if (result.success) {
      setActiveStoryId((currentStoryId) => (currentStoryId === storyId ? null : currentStoryId));
    }
  };

  const filterButtons: Array<{ key: FeedFilter; label: string }> = [
    { key: "all", label: "\u2728 All" },
    { key: "news", label: "\uD83D\uDCF0 News" },
    { key: "meme", label: "\uD83D\uDE02 Memes" },
    { key: "photo", label: "\uD83D\uDCF8 Photos" },
    { key: "announcements", label: "\uD83D\uDCE2 Updates" },
  ];

  return (
    <section className="shell section-stack page-reveal news-feed-page">
      <div className="section-heading section-heading--stacked">
        <div>
          <p className="eyebrow">Bell Fresh live feed</p>
          <h1>Fresh stories, news, memes, comments, and media in one place</h1>
          <p className="section-copy">
            Share quick stories, upload bigger files, and keep the community feed feeling more alive.
          </p>
        </div>
        <span className="experience-count">
          {unreadPostCount > 0 ? `${unreadPostCount} new updates` : "Live now"}
        </span>
      </div>

      {!canInteract ? (
        <div className="notice-banner">
          The feed is open in browse mode. Sign in when you want to post, like, comment, react, or
          share a story.
        </div>
      ) : null}

      <div className="profile-summary-grid">
        <article className="summary-card profile-summary-card">
          <p className="eyebrow">Breaking now</p>
          <h2>{newsCount}</h2>
          <p>Fresh news-style posts and kitchen updates.</p>
        </article>
        <article className="summary-card profile-summary-card">
          <p className="eyebrow">Meme drops</p>
          <h2>{memeCount}</h2>
          <p>Funny posts to keep the feed less boring.</p>
        </article>
        <article className="summary-card profile-summary-card">
          <p className="eyebrow">Photo posts</p>
          <h2>{photoCount}</h2>
          <p>Images and videos stay fixed and neatly cropped.</p>
        </article>
      </div>

      <StoryTray
        stories={enrichedStories}
        currentUserId={currentUser?.id}
        onAddStory={() => setStoryComposerOpen(true)}
        onOpenStory={(storyId) => setActiveStoryId(storyId)}
        canAddStory={canInteract}
      />

      {storyComposerOpen ? (
        <section className="menu-section">
          <StoryComposerCard
            storyCaption={storyCaption}
            storyEmoji={storyEmoji}
            storyLocation={storyLocation}
            storyLink={storyLink}
            storyMediaUrl={storyMediaUrl}
            storyAttachment={storyAttachment}
            storyBackground={storyBackground}
            backgrounds={STORY_BACKGROUNDS}
            onCaptionChange={setStoryCaption}
            onEmojiChange={setStoryEmoji}
            onLocationChange={setStoryLocation}
            onLinkChange={setStoryLink}
            onMediaUrlChange={setStoryMediaUrl}
            onFilePick={handleStoryFilePick}
            onBackgroundChange={setStoryBackground}
            onRemoveAttachment={() => void handleRemoveStoryDraftAttachment()}
            onCancel={() => void resetStoryComposer()}
            onSubmit={handleSubmitStory}
          />
        </section>
      ) : null}

      {activeSpotlightPost ? (
        <section className="menu-section">
          <article className="summary-card live-spotlight-card">
            <div className="live-spotlight-card__copy">
              <p className="eyebrow">Live spotlight</p>
              <h2>{`${activeSpotlightPost.emoji ?? "\uD83D\uDCF0"} ${getFeedBadgeLabel(activeSpotlightPost.kind, activeSpotlightPost.isAnnouncement)}`}</h2>
              <p>{activeSpotlightPost.content}</p>
              <div className="community-emoji-row">
                <span className="community-badge">
                  {activeSpotlightPost.source ?? "Bell Fresh Feed"}
                </span>
                <span className="community-badge">Updates every few seconds</span>
              </div>
            </div>

            <AttachmentPreviewList
              attachments={getPostAttachments(activeSpotlightPost).slice(0, 1)}
              compact
            />
          </article>
        </section>
      ) : null}

      <section className="menu-section">
        <div className="news-feed-stream">
          <form className="summary-card feed-composer feed-composer--full" onSubmit={handleSubmitPost}>
            <div className="community-panel__header">
              <div>
                <p className="eyebrow">Post something</p>
                <h2>{`What's new, ${currentUser?.firstName ?? "friend"}?`}</h2>
              </div>
              <EmojiPicker
                buttonLabel={postEmoji}
                title="Choose a post emoji"
                onSelect={setPostEmoji}
                disabled={!canInteract}
              />
            </div>

            <div className="menu-filter-row" aria-label="Feed post type">
              {(["update", "news", "meme", "photo"] as FeedPostKind[]).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  className={`filter-chip${postKind === kind ? " is-active" : ""}`}
                  onClick={() => setPostKind(kind)}
                  disabled={!canInteract}
                >
                  {kind === "update"
                    ? "\u2728 Update"
                    : kind === "news"
                      ? "\uD83D\uDCF0 News"
                      : kind === "meme"
                        ? "\uD83D\uDE02 Meme"
                        : "\uD83D\uDCF8 Photo"}
                </button>
              ))}
            </div>

            <textarea
              value={postText}
              onChange={(event) => setPostText(event.target.value)}
              placeholder="Share your favorite combo, a funny Bell Fresh moment, or a quick live update."
              disabled={!canInteract}
            />

            <div className="field-grid field-grid--auth">
              <label>
                <span>Media link</span>
                <input
                  type="url"
                  value={postMediaUrl}
                  onChange={(event) => setPostMediaUrl(event.target.value)}
                  placeholder="https://link.com/photo.jpg or clip.mp4"
                  disabled={!canInteract}
                />
              </label>
              <label className="attachment-input">
                <span>{`Attach pics, videos, audio, or files (up to ${MAX_ATTACHMENT_SIZE_LABEL} each)`}</span>
                <input
                  type="file"
                  multiple
                  accept={ATTACHMENT_INPUT_ACCEPT}
                  onChange={handlePostFilePick}
                  disabled={!canInteract}
                />
              </label>
            </div>

            <AttachmentPreviewList
              attachments={postAttachments}
              onRemove={(attachmentId) => void handleRemovePostDraftAttachment(attachmentId)}
              compact
            />

            <div className="community-composer__actions">
              <div className="community-emoji-row">
                <span className="community-badge">{`${postEmoji} ${getFeedBadgeLabel(postKind)}`}</span>
                <span className="summary-note">
                  {`You can now upload up to ${MAX_ATTACHMENTS_PER_PICK} files, including mp3 and mp4, at up to ${MAX_ATTACHMENT_SIZE_LABEL} each.`}
                </span>
              </div>
              <button type="submit" className="cta-link" disabled={!canInteract}>
                Share update
              </button>
            </div>
          </form>

          <div className="feed-list">
            <article className="summary-card feed-toolbar">
              <label className="community-search">
                <span>Search the feed</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search news, stories, memes, comments, or usernames"
                />
              </label>

              <div className="menu-filter-row" aria-label="Feed filters">
                {filterButtons.map((filterButton) => (
                  <button
                    key={filterButton.key}
                    type="button"
                    className={`filter-chip${activeFilter === filterButton.key ? " is-active" : ""}`}
                    onClick={() => setActiveFilter(filterButton.key)}
                  >
                    {repairMojibakeText(filterButton.label)}
                  </button>
                ))}
              </div>
            </article>

            {filteredPosts.length === 0 ? (
              <div className="empty-state">
                <h2>No posts match that filter.</h2>
                <p>Try another search or switch back to All to see the latest Bell Fresh updates.</p>
              </div>
            ) : (
              filteredPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  currentUserId={currentUser?.id}
                  currentUserRole={currentUser?.role}
                  interactionDisabled={!canInteract}
                  postAttachments={getPostAttachments(post)}
                  commentDraft={commentDrafts[post.id] ?? ""}
                  commentMediaUrl={commentMediaUrls[post.id] ?? ""}
                  commentReplyTarget={commentReplyTargets[post.id] ?? null}
                  commentAttachments={commentAttachments[post.id] ?? []}
                  commentCount={countComments(post.comments)}
                  formatFeedTime={formatFeedTime}
                  getFeedBadgeLabel={getFeedBadgeLabel}
                  onToggleLike={togglePostLike}
                  onRemovePost={handleRemovePost}
                  onCommentDraftChange={(postId, value) =>
                    setCommentDrafts((currentDrafts) => ({ ...currentDrafts, [postId]: value }))
                  }
                  onCommentMediaUrlChange={(postId, value) =>
                    setCommentMediaUrls((currentMediaUrls) => ({
                      ...currentMediaUrls,
                      [postId]: value,
                    }))
                  }
                  onCommentReplyTargetChange={(postId, target) =>
                    setCommentReplyTargets((currentTargets) => ({
                      ...currentTargets,
                      [postId]: target,
                    }))
                  }
                  onCommentFilePick={handleCommentFilePick}
                  onCommentRemoveAttachment={(postId, attachmentId) =>
                    void handleRemoveCommentDraftAttachment(postId, attachmentId)
                  }
                  onAddComment={handleSubmitComment}
                  onRemoveComment={handleRemoveComment}
                  onToggleCommentReaction={toggleCommentReaction}
                  onCommentEmojiSelect={(postId, emoji) =>
                    setCommentDrafts((currentDrafts) => ({
                      ...currentDrafts,
                      [postId]: appendEmoji(currentDrafts[postId] ?? "", emoji),
                    }))
                  }
                />
              ))
            )}
          </div>
        </div>
      </section>

      <StoryViewer
        stories={enrichedStories}
        activeStoryId={activeStoryId}
        currentUserId={currentUser?.id}
        onClose={() => setActiveStoryId(null)}
        onSeen={markStorySeen}
        onRemove={handleRemoveStory}
      />
    </section>
  );
}
