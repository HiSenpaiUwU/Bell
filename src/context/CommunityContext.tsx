import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { autoFeedTemplates, feedSeedPosts } from "../data/liveFeedTemplates";
import { useSharedLocalStorageState } from "../hooks/useSharedLocalStorageState";
import {
  ChatMessage,
  FeedComment,
  FeedPost,
  FeedPostKind,
  ReactionGroup,
  StoredAttachment,
  Story,
} from "../types";
import {
  migrateStoredAttachmentToIndexedDb,
  migrateStoredAttachmentsToIndexedDb,
  normalizeStoredAttachment,
  releaseStoredAttachment,
  releaseStoredAttachments,
} from "../utils/attachments";
import {
  collectCommentAttachments,
  findCommentById,
  insertCommentReply,
  removeCommentFromTree,
  toggleReactionGroups,
  updateCommentTree,
} from "../utils/community";
import { getCurrentPath, subscribeToNavigation } from "../utils/navigation";
import { repairMojibakeText, repairOptionalText } from "../utils/text";
import { useAuth } from "./AuthContext";
import { useNotifications } from "./NotificationContext";

interface CreatePostOptions {
  emoji?: string;
  imageUrl?: string;
  attachments?: StoredAttachment[];
  kind?: FeedPostKind;
  source?: string;
  isAnnouncement?: boolean;
}

interface AddCommentOptions {
  emoji?: string;
  attachments?: StoredAttachment[];
  parentCommentId?: string;
}

interface CreateStoryOptions {
  caption?: string;
  emoji?: string;
  attachment?: StoredAttachment;
  location?: string;
  linkUrl?: string;
  background?: string;
}

interface ChatCommunityContextValue {
  messages: ChatMessage[];
  sendMessage: (
    recipientId: string,
    text: string,
    attachments?: StoredAttachment[],
    replyToMessageId?: string,
  ) => { success: boolean; message: string };
  markConversationRead: (otherUserId: string) => void;
  getConversation: (otherUserId: string) => ChatMessage[];
  getUnreadCount: (otherUserId?: string) => number;
  toggleMessageReaction: (messageId: string, emoji: string) => void;
}

interface FeedCommunityContextValue {
  posts: FeedPost[];
  stories: Story[];
  createPost: (
    content: string,
    options?: CreatePostOptions,
  ) => { success: boolean; message: string };
  addComment: (
    postId: string,
    content: string,
    options?: AddCommentOptions,
  ) => { success: boolean; message: string };
  removeComment: (
    postId: string,
    commentId: string,
  ) => { success: boolean; message: string };
  toggleCommentReaction: (postId: string, commentId: string, emoji: string) => void;
  togglePostLike: (postId: string) => void;
  removePost: (postId: string) => { success: boolean; message: string };
  createStory: (options: CreateStoryOptions) => { success: boolean; message: string };
  markStorySeen: (storyId: string) => void;
  removeStory: (storyId: string) => { success: boolean; message: string };
  markFeedSeen: () => void;
  getUnreadPostCount: () => number;
  getUnreadStoryCount: () => number;
}

type CommunityContextValue = ChatCommunityContextValue & FeedCommunityContextValue;

interface AutoFeedState {
  index: number;
  lastPostedAt: string;
}

type FeedSeenState = Record<string, string>;

const MESSAGES_STORAGE_KEY = "communityMessages";
const POSTS_STORAGE_KEY = "communityPosts";
const STORIES_STORAGE_KEY = "communityStories";
const FEED_SEEN_STORAGE_KEY = "communityFeedSeen";
const AUTO_FEED_STATE_STORAGE_KEY = "communityAutoFeedState";
const ADMIN_USER_ID = "admin-bell-fresh";
const AUTO_FEED_INTERVAL_MS = 20000;
const STORY_LIFETIME_MS = 1000 * 60 * 60 * 24;
const STORY_ROTATION_CHECK_MS = 60000;
const MAX_FEED_POSTS = 60;
const INITIAL_FEED_POSTS = [...feedSeedPosts].sort(
  (leftPost, rightPost) =>
    new Date(rightPost.createdAt).getTime() - new Date(leftPost.createdAt).getTime(),
);

const ChatCommunityContext = createContext<ChatCommunityContextValue | undefined>(undefined);
const FeedCommunityContext = createContext<FeedCommunityContextValue | undefined>(undefined);
const CommunityContext = createContext<CommunityContextValue | undefined>(undefined);

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function isStoryActive(story: Story) {
  return new Date(story.expiresAt).getTime() > Date.now();
}

function buildStoryExpiry(createdAt: string) {
  return new Date(new Date(createdAt).getTime() + STORY_LIFETIME_MS).toISOString();
}

function buildInitialStories() {
  const createdAt = new Date(Date.now() - 1000 * 60 * 40).toISOString();

  return [
    {
      id: "story-bell-fresh-welcome",
      authorId: ADMIN_USER_ID,
      caption: "Fresh drops, promos, and community moments now show up in Stories too.",
      emoji: "\u2728",
      background:
        "linear-gradient(135deg, rgba(19,104,67,0.95), rgba(86,175,128,0.88), rgba(255,226,154,0.82))",
      createdAt,
      expiresAt: buildStoryExpiry(createdAt),
      viewedBy: [],
    },
  ] satisfies Story[];
}

function buildAutoFeedPost(index: number): FeedPost {
  const template = autoFeedTemplates[(index * 5 + 2) % autoFeedTemplates.length];

  return {
    id: `auto-feed-${index}`,
    authorId: ADMIN_USER_ID,
    content: template.content,
    emoji: template.emoji,
    kind: template.kind,
    imageUrl: template.imageUrl,
    source: template.source,
    autoGenerated: true,
    isAnnouncement: template.isAnnouncement,
    comments: [],
    createdAt: new Date().toISOString(),
    likedBy: [],
  };
}

function buildComment(
  authorId: string,
  content: string,
  options?: AddCommentOptions,
): FeedComment {
  return {
    id: generateId("comment"),
    authorId,
    content: content.trim(),
    emoji: options?.emoji?.trim() || undefined,
    attachments: options?.attachments?.length ? options.attachments : undefined,
    reactions: [],
    replies: [],
    createdAt: new Date().toISOString(),
  };
}

function ensureStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function sanitizeReactions(value: unknown): ReactionGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((reaction) => {
      if (!reaction || typeof reaction !== "object") {
        return null;
      }

      const typedReaction = reaction as Partial<ReactionGroup>;
      const emoji =
        typeof typedReaction.emoji === "string" ? typedReaction.emoji.trim() : "";
      const userIds = ensureStringArray(typedReaction.userIds);

      if (!emoji) {
        return null;
      }

      return { emoji, userIds };
    })
    .filter((reaction): reaction is ReactionGroup => Boolean(reaction));
}

function sanitizeAttachments(value: unknown): StoredAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") {
        return null;
      }

      return normalizeStoredAttachment(attachment as StoredAttachment);
    })
    .filter((attachment): attachment is StoredAttachment => Boolean(attachment));
}

function sanitizeComment(comment: FeedComment): FeedComment {
  return {
    ...comment,
    id: typeof comment.id === "string" && comment.id.trim() ? comment.id : generateId("comment"),
    authorId:
      typeof comment.authorId === "string" && comment.authorId.trim()
        ? comment.authorId
        : ADMIN_USER_ID,
    content: typeof comment.content === "string" ? repairMojibakeText(comment.content) : "",
    emoji: repairOptionalText(comment.emoji),
    attachments: sanitizeAttachments(comment.attachments),
    reactions: sanitizeReactions(comment.reactions),
    replies: sanitizeComments(comment.replies),
    createdAt:
      typeof comment.createdAt === "string" && comment.createdAt
        ? comment.createdAt
        : new Date().toISOString(),
  };
}

function sanitizeComments(value: unknown): FeedComment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((comment): comment is FeedComment => Boolean(comment && typeof comment === "object"))
    .map((comment) => sanitizeComment(comment));
}

function sanitizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((message): message is ChatMessage => Boolean(message && typeof message === "object"))
    .map((message) => ({
      ...message,
      id: typeof message.id === "string" && message.id.trim() ? message.id : generateId("chat"),
      senderId:
        typeof message.senderId === "string" && message.senderId.trim()
          ? message.senderId
          : ADMIN_USER_ID,
      recipientId:
        typeof message.recipientId === "string" && message.recipientId.trim()
          ? message.recipientId
          : ADMIN_USER_ID,
      text: typeof message.text === "string" ? repairMojibakeText(message.text) : "",
      attachments: sanitizeAttachments(message.attachments),
      reactions: sanitizeReactions(message.reactions),
      replyToMessageId:
        typeof message.replyToMessageId === "string" && message.replyToMessageId.trim()
          ? message.replyToMessageId
          : undefined,
      createdAt:
        typeof message.createdAt === "string" && message.createdAt
          ? message.createdAt
          : new Date().toISOString(),
      readBy: ensureStringArray(message.readBy),
    }));
}

function sanitizePosts(value: unknown): FeedPost[] {
  if (!Array.isArray(value)) {
    return [...INITIAL_FEED_POSTS];
  }

  return value
    .filter((post): post is FeedPost => Boolean(post && typeof post === "object"))
    .map((post) => ({
      ...post,
      id: typeof post.id === "string" && post.id.trim() ? post.id : generateId("feed"),
      authorId:
        typeof post.authorId === "string" && post.authorId.trim() ? post.authorId : ADMIN_USER_ID,
      content: typeof post.content === "string" ? repairMojibakeText(post.content) : "",
      emoji: repairOptionalText(post.emoji),
      kind:
        post.kind === "news" || post.kind === "meme" || post.kind === "photo" || post.kind === "update"
          ? post.kind
          : "update",
      imageUrl:
        typeof post.imageUrl === "string" && post.imageUrl.trim() ? post.imageUrl : undefined,
      attachments: sanitizeAttachments(post.attachments),
      comments: sanitizeComments(post.comments),
      source: repairOptionalText(post.source),
      autoGenerated: Boolean(post.autoGenerated),
      createdAt:
        typeof post.createdAt === "string" && post.createdAt
          ? post.createdAt
          : new Date().toISOString(),
      likedBy: ensureStringArray(post.likedBy),
      isAnnouncement: Boolean(post.isAnnouncement),
    }));
}

function sanitizeStories(value: unknown): Story[] {
  const fallbackStories = buildInitialStories();

  if (!Array.isArray(value)) {
    return fallbackStories;
  }

  const nextStories = value
    .filter((story): story is Story => Boolean(story && typeof story === "object"))
    .map((story) => {
      const createdAt =
        typeof story.createdAt === "string" && story.createdAt
          ? story.createdAt
          : new Date().toISOString();

      return {
        ...story,
        id: typeof story.id === "string" && story.id.trim() ? story.id : generateId("story"),
        authorId:
          typeof story.authorId === "string" && story.authorId.trim()
            ? story.authorId
            : ADMIN_USER_ID,
        caption: typeof story.caption === "string" ? repairMojibakeText(story.caption) : "",
        emoji: repairOptionalText(story.emoji),
        attachment: story.attachment ? normalizeStoredAttachment(story.attachment) : undefined,
        location: repairOptionalText(story.location),
        linkUrl:
          typeof story.linkUrl === "string" && story.linkUrl.trim() ? story.linkUrl : undefined,
        background:
          typeof story.background === "string" && story.background.trim()
            ? story.background
            : undefined,
        createdAt,
        expiresAt:
          typeof story.expiresAt === "string" && story.expiresAt
            ? story.expiresAt
            : buildStoryExpiry(createdAt),
        viewedBy: ensureStringArray(story.viewedBy),
      };
    });

  return nextStories.length ? nextStories : fallbackStories;
}

async function migrateCommentAttachments(
  comments: FeedComment[] | undefined,
): Promise<{ nextComments: FeedComment[]; changed: boolean }> {
  let changed = false;

  const nextComments: FeedComment[] = await Promise.all(
    (comments ?? []).map(async (comment) => {
      const attachmentResult = await migrateStoredAttachmentsToIndexedDb(
        comment.attachments ?? [],
      );
      const nestedResult: { nextComments: FeedComment[]; changed: boolean } =
        await migrateCommentAttachments(comment.replies);
      const nextComment: FeedComment =
        attachmentResult.changed || nestedResult.changed
          ? {
              ...comment,
              attachments: attachmentResult.attachments.length
                ? attachmentResult.attachments
                : undefined,
              replies: nestedResult.nextComments.length ? nestedResult.nextComments : undefined,
            }
          : comment;

      if (attachmentResult.changed || nestedResult.changed) {
        changed = true;
      }

      return nextComment;
    }),
  );

  return {
    nextComments,
    changed,
  };
}

async function migratePostAttachments(posts: FeedPost[]) {
  let changed = false;

  const nextPosts = await Promise.all(
    posts.map(async (post) => {
      const attachmentResult = await migrateStoredAttachmentsToIndexedDb(post.attachments ?? []);
      const commentResult = await migrateCommentAttachments(post.comments);
      const nextPost =
        attachmentResult.changed || commentResult.changed
          ? {
              ...post,
              attachments: attachmentResult.attachments.length
                ? attachmentResult.attachments
                : undefined,
              comments: commentResult.nextComments.length ? commentResult.nextComments : [],
            }
          : post;

      if (attachmentResult.changed || commentResult.changed) {
        changed = true;
      }

      return nextPost;
    }),
  );

  return {
    nextPosts,
    changed,
  };
}

async function migrateMessageAttachments(messages: ChatMessage[]) {
  let changed = false;

  const nextMessages = await Promise.all(
    messages.map(async (message) => {
      const attachmentResult = await migrateStoredAttachmentsToIndexedDb(
        message.attachments ?? [],
      );

      if (!attachmentResult.changed) {
        return message;
      }

      changed = true;

      return {
        ...message,
        attachments: attachmentResult.attachments.length
          ? attachmentResult.attachments
          : undefined,
      };
    }),
  );

  return {
    nextMessages,
    changed,
  };
}

async function migrateStoryAttachments(stories: Story[]) {
  let changed = false;

  const nextStories = await Promise.all(
    stories.map(async (story) => {
      if (!story.attachment) {
        return story;
      }

      const nextAttachment = await migrateStoredAttachmentToIndexedDb(story.attachment);

      if (
        nextAttachment.url === story.attachment.url &&
        nextAttachment.storageKey === story.attachment.storageKey
      ) {
        return story;
      }

      changed = true;

      return {
        ...story,
        attachment: nextAttachment,
      };
    }),
  );

  return {
    nextStories,
    changed,
  };
}

export function CommunityProvider({ children }: PropsWithChildren) {
  const { currentUser, users } = useAuth();
  const { notify } = useNotifications();
  const currentPath = useSyncExternalStore(subscribeToNavigation, getCurrentPath, () => "/");
  const [messages, setMessages] = useSharedLocalStorageState<ChatMessage[]>(
    MESSAGES_STORAGE_KEY,
    [],
  );
  const [posts, setPosts] = useSharedLocalStorageState<FeedPost[]>(
    POSTS_STORAGE_KEY,
    INITIAL_FEED_POSTS,
  );
  const [stories, setStories] = useSharedLocalStorageState<Story[]>(
    STORIES_STORAGE_KEY,
    buildInitialStories(),
  );
  const [feedSeen, setFeedSeen] = useSharedLocalStorageState<FeedSeenState>(
    FEED_SEEN_STORAGE_KEY,
    {},
  );
  const [, setAutoFeedState] = useSharedLocalStorageState<AutoFeedState>(
    AUTO_FEED_STATE_STORAGE_KEY,
    {
      index: INITIAL_FEED_POSTS.length,
      lastPostedAt: INITIAL_FEED_POSTS[0]?.createdAt ?? new Date().toISOString(),
    },
  );
  const normalizedMessages = useMemo(() => sanitizeMessages(messages), [messages]);
  const normalizedPosts = useMemo(() => sanitizePosts(posts), [posts]);
  const normalizedStories = useMemo(() => sanitizeStories(stories), [stories]);
  const isRealtimeFeedPath = currentPath === "/admin";
  const normalizedFeedSeen = useMemo<FeedSeenState>(() => {
    if (!feedSeen || typeof feedSeen !== "object" || Array.isArray(feedSeen)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(feedSeen).filter((entry): entry is [string, string] => {
        const [key, value] = entry;
        return typeof key === "string" && typeof value === "string";
      }),
    );
  }, [feedSeen]);
  const repairedStorageRef = useRef(false);
  const migratedStorageRef = useRef(false);
  const seenIncomingMessageIdsRef = useRef<Set<string>>(new Set());
  const seenPostIdsRef = useRef<Set<string>>(new Set(normalizedPosts.map((post) => post.id)));
  const seenStoryIdsRef = useRef<Set<string>>(new Set(normalizedStories.map((story) => story.id)));

  useEffect(() => {
    if (repairedStorageRef.current) {
      return;
    }

    repairedStorageRef.current = true;

    if (JSON.stringify(messages) !== JSON.stringify(normalizedMessages)) {
      setMessages(normalizedMessages);
    }

    if (JSON.stringify(posts) !== JSON.stringify(normalizedPosts)) {
      setPosts(normalizedPosts);
    }

    if (JSON.stringify(stories) !== JSON.stringify(normalizedStories)) {
      setStories(normalizedStories);
    }

    if (JSON.stringify(feedSeen) !== JSON.stringify(normalizedFeedSeen)) {
      setFeedSeen(normalizedFeedSeen);
    }
  }, [
    feedSeen,
    messages,
    normalizedFeedSeen,
    normalizedMessages,
    normalizedPosts,
    normalizedStories,
    posts,
    setFeedSeen,
    setMessages,
    setPosts,
    setStories,
    stories,
  ]);

  useEffect(() => {
    if (migratedStorageRef.current) {
      return;
    }

    migratedStorageRef.current = true;
    let isCancelled = false;

    const migrateSavedCommunityMedia = async () => {
      const [messageResult, postResult, storyResult] = await Promise.all([
        migrateMessageAttachments(normalizedMessages),
        migratePostAttachments(normalizedPosts),
        migrateStoryAttachments(normalizedStories),
      ]);

      if (isCancelled) {
        return;
      }

      if (messageResult.changed) {
        setMessages(messageResult.nextMessages);
      }

      if (postResult.changed) {
        setPosts(postResult.nextPosts);
      }

      if (storyResult.changed) {
        setStories(storyResult.nextStories);
      }
    };

    void migrateSavedCommunityMedia();

    return () => {
      isCancelled = true;
    };
  }, [normalizedMessages, normalizedPosts, normalizedStories, setMessages, setPosts, setStories]);

  useEffect(() => {
    const pruneExpiredStories = () => {
      setStories((currentStories) => {
        const safeStories = sanitizeStories(currentStories);
        const activeStories: Story[] = [];

        safeStories.forEach((story) => {
          if (isStoryActive(story)) {
            activeStories.push(story);
            return;
          }

          if (story.attachment) {
            void releaseStoredAttachment(story.attachment);
          }
        });

        return activeStories;
      });
    };

    pruneExpiredStories();

    const intervalId = window.setInterval(pruneExpiredStories, STORY_ROTATION_CHECK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [setStories]);

  useEffect(() => {
    if (!currentUser) {
      seenIncomingMessageIdsRef.current = new Set();
      return;
    }

    seenIncomingMessageIdsRef.current = new Set(
      normalizedMessages
        .filter((message) => message.recipientId === currentUser.id)
        .map((message) => message.id),
    );
  }, [currentUser?.id, normalizedMessages]);

  useEffect(() => {
    if (!currentUser) {
      seenPostIdsRef.current = new Set(normalizedPosts.map((post) => post.id));
      seenStoryIdsRef.current = new Set(normalizedStories.map((story) => story.id));
      return;
    }

    if (seenPostIdsRef.current.size === 0) {
      seenPostIdsRef.current = new Set(normalizedPosts.map((post) => post.id));
    }

    if (seenStoryIdsRef.current.size === 0) {
      seenStoryIdsRef.current = new Set(normalizedStories.map((story) => story.id));
    }
  }, [currentUser, normalizedPosts, normalizedStories]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const nextSeenIds = new Set(seenIncomingMessageIdsRef.current);

    normalizedMessages.forEach((message) => {
      const isIncoming = message.recipientId === currentUser.id;

      if (!isIncoming || nextSeenIds.has(message.id)) {
        return;
      }

      const sender = users.find((user) => user.id === message.senderId);

      notify({
        title: `\uD83D\uDCAC ${sender?.firstName ?? "New message"}`,
        message:
          message.text ||
          `${message.attachments?.length ?? 0} attachment${message.attachments?.length === 1 ? "" : "s"} received.`,
        tone: "info",
      });

      nextSeenIds.add(message.id);
    });

    seenIncomingMessageIdsRef.current = nextSeenIds;
  }, [currentUser, normalizedMessages, notify, users]);

  useEffect(() => {
    if (!currentUser || !isRealtimeFeedPath) {
      return;
    }

    const nextSeenPostIds = new Set(seenPostIdsRef.current);

    normalizedPosts.forEach((post) => {
      const shouldNotify =
        !nextSeenPostIds.has(post.id) &&
        post.authorId !== currentUser.id &&
        (post.isAnnouncement || post.autoGenerated);

      if (!shouldNotify) {
        nextSeenPostIds.add(post.id);
        return;
      }

      notify({
        title: "\uD83D\uDCF0 News updated",
        message: post.content,
        tone: "info",
      });

      nextSeenPostIds.add(post.id);
    });

    seenPostIdsRef.current = nextSeenPostIds;
  }, [currentUser, isRealtimeFeedPath, notify, normalizedPosts]);

  useEffect(() => {
    if (!currentUser || !isRealtimeFeedPath) {
      return;
    }

    const nextSeenStoryIds = new Set(seenStoryIdsRef.current);

    normalizedStories.forEach((story) => {
      const shouldNotify =
        !nextSeenStoryIds.has(story.id) &&
        story.authorId !== currentUser.id &&
        isStoryActive(story);

      if (!shouldNotify) {
        nextSeenStoryIds.add(story.id);
        return;
      }

      const author = users.find((user) => user.id === story.authorId);

      notify({
        title: `\uD83D\uDCF8 ${author?.firstName ?? "Bell Fresh"} added a story`,
        message: story.caption || "Open Stories to check the latest update.",
        tone: "info",
      });

      nextSeenStoryIds.add(story.id);
    });

    seenStoryIdsRef.current = nextSeenStoryIds;
  }, [currentUser, isRealtimeFeedPath, notify, normalizedStories, users]);

  useEffect(() => {
    if (!currentUser || !isRealtimeFeedPath) {
      return;
    }

    const pushAutoPostIfNeeded = () => {
      setAutoFeedState((currentState) => {
        const lastPostedTime = new Date(currentState.lastPostedAt).getTime();

        if (Date.now() - lastPostedTime < AUTO_FEED_INTERVAL_MS) {
          return currentState;
        }

        const nextPost = buildAutoFeedPost(currentState.index);

        setPosts((currentPosts) => {
          const safePosts = sanitizePosts(currentPosts);

          if (safePosts.some((post) => post.id === nextPost.id)) {
            return safePosts;
          }

          return [nextPost, ...safePosts].slice(0, MAX_FEED_POSTS);
        });

        return {
          index: currentState.index + 1,
          lastPostedAt: new Date().toISOString(),
        };
      });
    };

    pushAutoPostIfNeeded();

    const intervalId = window.setInterval(pushAutoPostIfNeeded, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentUser, isRealtimeFeedPath, setAutoFeedState, setPosts]);

  const sendMessage = useCallback(
    (
      recipientId: string,
      text: string,
      attachments?: StoredAttachment[],
      replyToMessageId?: string,
    ) => {
      if (!currentUser) {
        return {
          success: false,
          message: "Please login before sending a message.",
        };
      }

      const trimmedText = text.trim();

      if (!recipientId || (!trimmedText && !(attachments?.length))) {
        return {
          success: false,
          message: "Choose someone and add a message or attachment first.",
        };
      }

      const recipient = users.find((user) => user.id === recipientId);

      if (!recipient) {
        return {
          success: false,
          message: "That person is no longer available.",
        };
      }

      if (replyToMessageId) {
        const replyTarget = normalizedMessages.find((message) => message.id === replyToMessageId);
        const isReplyWithinConversation =
          replyTarget &&
          ((replyTarget.senderId === currentUser.id && replyTarget.recipientId === recipientId) ||
            (replyTarget.senderId === recipientId && replyTarget.recipientId === currentUser.id));

        if (!isReplyWithinConversation) {
          return {
            success: false,
            message: "That reply target is no longer available.",
          };
        }
      }

      const nextMessage: ChatMessage = {
        id: generateId("chat"),
        senderId: currentUser.id,
        recipientId,
        text: trimmedText,
        attachments: attachments?.length ? attachments : undefined,
        reactions: [],
        replyToMessageId,
        createdAt: new Date().toISOString(),
        readBy: [currentUser.id],
      };

      setMessages((currentMessages) => [...sanitizeMessages(currentMessages), nextMessage]);

      return {
        success: true,
        message: `Message sent to ${recipient.firstName}.`,
      };
    },
    [currentUser, normalizedMessages, setMessages, users],
  );

  const toggleMessageReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!currentUser) {
        return;
      }

      setMessages((currentMessages) =>
        sanitizeMessages(currentMessages).map((message) => {
          const isConversationParticipant =
            message.senderId === currentUser.id || message.recipientId === currentUser.id;

          if (message.id !== messageId || !isConversationParticipant) {
            return message;
          }

          return {
            ...message,
            reactions: toggleReactionGroups(message.reactions, emoji, currentUser.id),
          };
        }),
      );
    },
    [currentUser, setMessages],
  );

  const markConversationRead = useCallback(
    (otherUserId: string) => {
      if (!currentUser) {
        return;
      }

      setMessages((currentMessages) => {
        const safeMessages = sanitizeMessages(currentMessages);
        let changed = false;

        const nextMessages = safeMessages.map((message) => {
          const shouldMarkRead =
            message.senderId === otherUserId &&
            message.recipientId === currentUser.id &&
            !message.readBy.includes(currentUser.id);

          if (!shouldMarkRead) {
            return message;
          }

          changed = true;

          return {
            ...message,
            readBy: [...message.readBy, currentUser.id],
          };
        });

        return changed ? nextMessages : currentMessages;
      });
    },
    [currentUser, setMessages],
  );

  const getConversation = useCallback(
    (otherUserId: string) => {
      if (!currentUser) {
        return [];
      }

      return normalizedMessages
        .filter(
          (message) =>
            (message.senderId === currentUser.id && message.recipientId === otherUserId) ||
            (message.senderId === otherUserId && message.recipientId === currentUser.id),
        )
        .sort(
          (leftMessage, rightMessage) =>
            new Date(leftMessage.createdAt).getTime() - new Date(rightMessage.createdAt).getTime(),
        );
    },
    [currentUser, normalizedMessages],
  );

  const getUnreadCount = useCallback(
    (otherUserId?: string) => {
      if (!currentUser) {
        return 0;
      }

      return normalizedMessages.filter((message) => {
        const isIncoming = message.recipientId === currentUser.id;
        const matchesConversation = otherUserId ? message.senderId === otherUserId : true;

        return isIncoming && matchesConversation && !message.readBy.includes(currentUser.id);
      }).length;
    },
    [currentUser, normalizedMessages],
  );

  const createPost = (content: string, options?: CreatePostOptions) => {
    if (!currentUser) {
      return {
        success: false,
        message: "Please login before posting to the feed.",
      };
    }

    const trimmedContent = content.trim();
    const trimmedEmoji = options?.emoji?.trim();
    const trimmedImageUrl = options?.imageUrl?.trim();
    const trimmedSource = options?.source?.trim();

    if (!trimmedContent && !trimmedImageUrl && !(options?.attachments?.length)) {
      return {
        success: false,
        message: "Write something or attach a file before posting.",
      };
    }

    const nextPost: FeedPost = {
      id: generateId("feed"),
      authorId: currentUser.id,
      content: trimmedContent,
      emoji: trimmedEmoji || undefined,
      imageUrl: trimmedImageUrl || undefined,
      attachments: options?.attachments?.length ? options.attachments : undefined,
      source: trimmedSource || undefined,
      kind: options?.kind ?? "update",
      comments: [],
      createdAt: new Date().toISOString(),
      likedBy: [],
      isAnnouncement: options?.isAnnouncement ?? false,
    };

    setPosts((currentPosts) => [nextPost, ...sanitizePosts(currentPosts)].slice(0, MAX_FEED_POSTS));

    return {
      success: true,
      message: "Post shared to the live feed.",
    };
  };

  const addComment = (
    postId: string,
    content: string,
    options?: AddCommentOptions,
  ) => {
    if (!currentUser) {
      return {
        success: false,
        message: "Please login before adding a comment.",
      };
    }

    const trimmedContent = content.trim();

    if (!trimmedContent && !(options?.attachments?.length)) {
      return {
        success: false,
        message: "Write a comment or attach something first.",
      };
    }

    const targetPost = normalizedPosts.find((post) => post.id === postId);
    const parentComment = options?.parentCommentId
      ? findCommentById(targetPost?.comments, options.parentCommentId)
      : null;

    if (!targetPost) {
      return {
        success: false,
        message: "That post is not available anymore.",
      };
    }

    if (options?.parentCommentId && !parentComment) {
      return {
        success: false,
        message: "That comment is no longer available to reply to.",
      };
    }

    const nextComment = buildComment(currentUser.id, trimmedContent, options);

    setPosts((currentPosts) =>
      sanitizePosts(currentPosts).map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: options?.parentCommentId
                ? insertCommentReply(post.comments, options.parentCommentId, nextComment)
                : [...(post.comments ?? []), nextComment],
            }
          : post,
      ),
    );

    return {
      success: true,
      message: options?.parentCommentId ? "Reply added." : "Comment added.",
    };
  };

  const removeComment = (postId: string, commentId: string) => {
    if (!currentUser) {
      return {
        success: false,
        message: "Please login before removing a comment.",
      };
    }

    const targetPost = normalizedPosts.find((post) => post.id === postId);
    const targetComment = findCommentById(targetPost?.comments, commentId);

    if (!targetPost || !targetComment) {
      return {
        success: false,
        message: "That comment is not available anymore.",
      };
    }

    const canRemove =
      currentUser.role === "admin" || targetComment.authorId === currentUser.id;

    if (!canRemove) {
      return {
        success: false,
        message: "Only the comment author or admin can remove this comment.",
      };
    }

    const removalResult = removeCommentFromTree(targetPost.comments, commentId);

    setPosts((currentPosts) =>
      sanitizePosts(currentPosts).map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: removalResult.nextComments,
            }
          : post,
      ),
    );

    void releaseStoredAttachments(collectCommentAttachments([targetComment]));

    return {
      success: true,
      message: "Comment removed.",
    };
  };

  const toggleCommentReaction = (postId: string, commentId: string, emoji: string) => {
    if (!currentUser) {
      return;
    }

    setPosts((currentPosts) =>
      sanitizePosts(currentPosts).map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: updateCommentTree(post.comments, commentId, (comment) => ({
                ...comment,
                reactions: toggleReactionGroups(comment.reactions, emoji, currentUser.id),
              })),
            }
          : post,
      ),
    );
  };

  const togglePostLike = (postId: string) => {
    if (!currentUser) {
      return;
    }

    setPosts((currentPosts) =>
      sanitizePosts(currentPosts).map((post) =>
        post.id === postId
          ? {
              ...post,
              likedBy: post.likedBy.includes(currentUser.id)
                ? post.likedBy.filter((userId) => userId !== currentUser.id)
                : [...post.likedBy, currentUser.id],
            }
          : post,
      ),
    );
  };

  const removePost = (postId: string) => {
    const targetPost = normalizedPosts.find((post) => post.id === postId);

    if (!currentUser || !targetPost) {
      return {
        success: false,
        message: "That post is not available anymore.",
      };
    }

    const canRemove = currentUser.role === "admin" || targetPost.authorId === currentUser.id;

    if (!canRemove) {
      return {
        success: false,
        message: "Only the post author or admin can remove this update.",
      };
    }

    setPosts((currentPosts) => sanitizePosts(currentPosts).filter((post) => post.id !== postId));
    void releaseStoredAttachments(targetPost.attachments ?? []);
    void releaseStoredAttachments(collectCommentAttachments(targetPost.comments));

    return {
      success: true,
      message: "Post removed from the feed.",
    };
  };

  const createStory = (options: CreateStoryOptions) => {
    if (!currentUser) {
      return {
        success: false,
        message: "Please login before sharing a story.",
      };
    }

    const caption = options.caption?.trim() ?? "";
    const emoji = options.emoji?.trim() || undefined;
    const location = options.location?.trim() || undefined;
    const linkUrl = options.linkUrl?.trim() || undefined;
    const background = options.background?.trim() || undefined;
    const attachment = options.attachment;

    if (!caption && !attachment) {
      return {
        success: false,
        message: "Add a caption or media before sharing your story.",
      };
    }

    const createdAt = new Date().toISOString();
    const nextStory: Story = {
      id: generateId("story"),
      authorId: currentUser.id,
      caption,
      emoji,
      attachment,
      location,
      linkUrl,
      background,
      createdAt,
      expiresAt: buildStoryExpiry(createdAt),
      viewedBy: [currentUser.id],
    };

    setStories((currentStories) =>
      [nextStory, ...sanitizeStories(currentStories)].filter(isStoryActive),
    );

    return {
      success: true,
      message: "Story shared for the next 24 hours.",
    };
  };

  const markStorySeen = (storyId: string) => {
    if (!currentUser) {
      return;
    }

    setStories((currentStories) =>
      sanitizeStories(currentStories).map((story) =>
        story.id === storyId && !story.viewedBy.includes(currentUser.id)
          ? { ...story, viewedBy: [...story.viewedBy, currentUser.id] }
          : story,
      ),
    );
  };

  const removeStory = (storyId: string) => {
    const targetStory = normalizedStories.find((story) => story.id === storyId);

    if (!currentUser || !targetStory) {
      return {
        success: false,
        message: "That story is not available anymore.",
      };
    }

    const canRemove = currentUser.role === "admin" || targetStory.authorId === currentUser.id;

    if (!canRemove) {
      return {
        success: false,
        message: "Only the story owner or admin can remove it.",
      };
    }

    setStories((currentStories) =>
      sanitizeStories(currentStories).filter((story) => story.id !== storyId),
    );
    if (targetStory.attachment) {
      void releaseStoredAttachment(targetStory.attachment);
    }

    return {
      success: true,
      message: "Story removed.",
    };
  };

  const markFeedSeen = useCallback(() => {
    if (!currentUser) {
      return;
    }

    setFeedSeen((currentFeedSeen) => ({
      ...(currentFeedSeen && typeof currentFeedSeen === "object" && !Array.isArray(currentFeedSeen)
        ? currentFeedSeen
        : {}),
      [currentUser.id]: new Date().toISOString(),
    }));
  }, [currentUser, setFeedSeen]);

  const getUnreadPostCount = useCallback(() => {
    if (!currentUser) {
      return 0;
    }

    const lastSeenAt = normalizedFeedSeen[currentUser.id];
    const lastSeenTime = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;

    return normalizedPosts.filter(
      (post) =>
        post.authorId !== currentUser.id &&
        new Date(post.createdAt).getTime() > lastSeenTime,
    ).length;
  }, [currentUser, normalizedFeedSeen, normalizedPosts]);

  const getUnreadStoryCount = useCallback(() => {
    if (!currentUser) {
      return 0;
    }

    return normalizedStories.filter(
      (story) =>
        isStoryActive(story) &&
        story.authorId !== currentUser.id &&
        !story.viewedBy.includes(currentUser.id),
    ).length;
  }, [currentUser, normalizedStories]);

  const activeStories = useMemo(
    () => normalizedStories.filter(isStoryActive),
    [normalizedStories],
  );

  const chatValue = useMemo<ChatCommunityContextValue>(
    () => ({
      messages: normalizedMessages,
      sendMessage,
      markConversationRead,
      getConversation,
      getUnreadCount,
      toggleMessageReaction,
    }),
    [
      normalizedMessages,
      sendMessage,
      markConversationRead,
      getConversation,
      getUnreadCount,
      toggleMessageReaction,
    ],
  );

  const feedValue = useMemo<FeedCommunityContextValue>(
    () => ({
      posts: normalizedPosts,
      stories: activeStories,
      createPost,
      addComment,
      removeComment,
      toggleCommentReaction,
      togglePostLike,
      removePost,
      createStory,
      markStorySeen,
      removeStory,
      markFeedSeen,
      getUnreadPostCount,
      getUnreadStoryCount,
    }),
    [
      normalizedPosts,
      activeStories,
      createPost,
      addComment,
      removeComment,
      toggleCommentReaction,
      togglePostLike,
      removePost,
      createStory,
      markStorySeen,
      removeStory,
      markFeedSeen,
      getUnreadPostCount,
      getUnreadStoryCount,
    ],
  );

  const value = useMemo<CommunityContextValue>(
    () => ({
      ...chatValue,
      ...feedValue,
    }),
    [chatValue, feedValue],
  );

  return (
    <ChatCommunityContext.Provider value={chatValue}>
      <FeedCommunityContext.Provider value={feedValue}>
        <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
      </FeedCommunityContext.Provider>
    </ChatCommunityContext.Provider>
  );
}

export function useChatCommunity() {
  const context = useContext(ChatCommunityContext);

  if (!context) {
    throw new Error("useChatCommunity must be used within a CommunityProvider");
  }

  return context;
}

export function useFeedCommunity() {
  const context = useContext(FeedCommunityContext);

  if (!context) {
    throw new Error("useFeedCommunity must be used within a CommunityProvider");
  }

  return context;
}

export function useCommunity() {
  const context = useContext(CommunityContext);

  if (!context) {
    throw new Error("useCommunity must be used within a CommunityProvider");
  }

  return context;
}
