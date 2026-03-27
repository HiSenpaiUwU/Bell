import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AttachmentPreviewList } from "../components/community/AttachmentPreviewList";
import { EmojiPicker } from "../components/community/EmojiPicker";
import { ReactionBar } from "../components/community/ReactionBar";
import { useAuth } from "../context/AuthContext";
import { useChatCommunity } from "../context/CommunityContext";
import { useNotifications } from "../context/NotificationContext";
import { useAutoScrollToBottom } from "../hooks/useAutoScrollToBottom";
import { ChatMessage, StoredAttachment } from "../types";
import {
  ATTACHMENT_INPUT_ACCEPT,
  buildUrlAttachment,
  filesToStoredAttachments,
  MAX_ATTACHMENT_SIZE_LABEL,
  MAX_ATTACHMENTS_PER_PICK,
  releaseStoredAttachment,
} from "../utils/attachments";
import { getNavigationState } from "../utils/navigation";

interface ChatLocationState {
  selectedUserId?: string;
}

function formatMessageTime(value: string) {
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

function buildAttachmentSummary(attachments: StoredAttachment[] | undefined) {
  if (!attachments?.length) {
    return "";
  }

  const firstAttachment = attachments[0];
  const remainingCount = attachments.length - 1;

  return remainingCount > 0
    ? `${firstAttachment.name} + ${remainingCount} more`
    : firstAttachment.name;
}

function buildMessagePreview(message?: ChatMessage | null) {
  if (!message) {
    return "No messages yet";
  }

  const trimmedText = message.text.trim();

  if (trimmedText) {
    return trimmedText.length > 56 ? `${trimmedText.slice(0, 53)}...` : trimmedText;
  }

  const attachmentSummary = buildAttachmentSummary(message.attachments);

  return attachmentSummary ? `Sent ${attachmentSummary}` : "Sent a message";
}

function getConversationTimestamp(message?: ChatMessage | null) {
  if (!message) {
    return 0;
  }

  const parsedTime = new Date(message.createdAt).getTime();

  return Number.isNaN(parsedTime) ? 0 : parsedTime;
}

export function ChatPage() {
  const { currentUser, users } = useAuth();
  const {
    markConversationRead,
    messages,
    sendMessage,
    toggleMessageReaction,
  } = useChatCommunity();
  const { notify } = useNotifications();
  const locationState = getNavigationState<ChatLocationState>();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [draft, setDraft] = useState("");
  const [draftMediaUrl, setDraftMediaUrl] = useState("");
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [draftAttachments, setDraftAttachments] = useState<StoredAttachment[]>([]);
  const handledPreferredUserIdRef = useRef("");
  const canInteract = Boolean(currentUser);
  const preferredUserId = locationState?.selectedUserId?.trim() ?? "";

  const conversationMap = useMemo(() => {
    if (!currentUser) {
      return {} as Record<string, ChatMessage[]>;
    }

    const nextConversationMap: Record<string, ChatMessage[]> = {};

    messages.forEach((message) => {
      const isParticipant =
        message.senderId === currentUser.id || message.recipientId === currentUser.id;

      if (!isParticipant) {
        return;
      }

      const otherUserId =
        message.senderId === currentUser.id ? message.recipientId : message.senderId;

      if (!nextConversationMap[otherUserId]) {
        nextConversationMap[otherUserId] = [];
      }

      nextConversationMap[otherUserId].push(message);
    });

    Object.values(nextConversationMap).forEach((conversation) => {
      conversation.sort(
        (leftMessage, rightMessage) =>
          new Date(leftMessage.createdAt).getTime() - new Date(rightMessage.createdAt).getTime(),
      );
    });

    return nextConversationMap;
  }, [currentUser?.id, messages]);

  const conversationMeta = useMemo(() => {
    const entries = users
      .filter((user) => user.id !== currentUser?.id)
      .map((user) => {
        const conversation = conversationMap[user.id] ?? [];
        const lastMessage = conversation[conversation.length - 1] ?? null;
        const unreadCount = currentUser
          ? conversation.reduce((count, message) => {
              const isUnreadIncoming =
                message.recipientId === currentUser.id &&
                message.senderId === user.id &&
                !message.readBy.includes(currentUser.id);

              return count + (isUnreadIncoming ? 1 : 0);
            }, 0)
          : 0;

        return [
          user.id,
          {
            lastMessage,
            previewText: buildMessagePreview(lastMessage),
            lastMessageTime: getConversationTimestamp(lastMessage),
            unreadCount,
          },
        ] as const;
      });

    return Object.fromEntries(entries);
  }, [conversationMap, currentUser?.id, users]);

  const otherUsers = useMemo(
    () =>
      users
        .filter((user) => user.id !== currentUser?.id)
        .sort(
          (leftUser, rightUser) =>
            (conversationMeta[rightUser.id]?.lastMessageTime ?? 0) -
            (conversationMeta[leftUser.id]?.lastMessageTime ?? 0),
        ),
    [conversationMeta, currentUser?.id, users],
  );
  const visibleUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return otherUsers.filter((user) => {
      const searchableText = [
        user.firstName,
        user.lastName,
        user.username,
        user.email,
        conversationMeta[user.id]?.previewText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return !normalizedSearch || searchableText.includes(normalizedSearch);
    });
  }, [conversationMeta, otherUsers, searchTerm]);
  const hasPreferredUser = Boolean(
    preferredUserId && otherUsers.some((user) => user.id === preferredUserId),
  );
  const resolvedSelectedUserId = selectedUserId || (hasPreferredUser ? preferredUserId : "");
  const activeUser =
    visibleUsers.find((user) => user.id === resolvedSelectedUserId) ??
    otherUsers.find((user) => user.id === resolvedSelectedUserId) ??
    visibleUsers[0] ??
    otherUsers[0] ??
    null;
  const activeConversation = useMemo(
    () => (activeUser ? conversationMap[activeUser.id] ?? [] : []),
    [activeUser, conversationMap],
  );
  const activeConversationMessageMap = useMemo(
    () => Object.fromEntries(activeConversation.map((message) => [message.id, message])),
    [activeConversation],
  );
  const replyTargetMessage =
    (replyToMessageId ? activeConversationMessageMap[replyToMessageId] : null) ?? null;
  const scrollAnchorRef = useAutoScrollToBottom(
    `${activeUser?.id ?? ""}:${activeConversation.length}:${
      activeConversation[activeConversation.length - 1]?.id ?? ""
    }`,
  );

  useEffect(() => {
    if (hasPreferredUser && handledPreferredUserIdRef.current !== preferredUserId) {
      handledPreferredUserIdRef.current = preferredUserId;
      setSelectedUserId(preferredUserId);
      return;
    }

    if (!selectedUserId && activeUser) {
      setSelectedUserId(activeUser.id);
    }
  }, [activeUser, hasPreferredUser, preferredUserId, selectedUserId]);

  useEffect(() => {
    if (!activeUser) {
      return;
    }

    markConversationRead(activeUser.id);
  }, [activeUser?.id, markConversationRead]);

  useEffect(() => {
    if (replyToMessageId && !activeConversation.some((message) => message.id === replyToMessageId)) {
      setReplyToMessageId(null);
    }
  }, [activeConversation, replyToMessageId]);

  const handleDraftFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files?.length) {
      return;
    }

    try {
      const nextAttachments = await filesToStoredAttachments(files);

      setDraftAttachments((currentAttachments) =>
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

  const handleRemoveDraftAttachment = async (attachmentId: string) => {
    const targetAttachment = draftAttachments.find((attachment) => attachment.id === attachmentId);

    setDraftAttachments((currentAttachments) =>
      currentAttachments.filter((attachment) => attachment.id !== attachmentId),
    );

    if (targetAttachment) {
      await releaseStoredAttachment(targetAttachment);
    }
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeUser) {
      return;
    }

    const nextAttachments = [
      ...draftAttachments,
      ...(draftMediaUrl.trim() ? [buildUrlAttachment(draftMediaUrl, "linked-chat-media")] : []),
    ];
    const result = sendMessage(activeUser.id, draft, nextAttachments, replyToMessageId ?? undefined);

    if (!result.success) {
      notify({
        title: "Message not sent",
        message: result.message,
        tone: "warning",
      });
      return;
    }

    setDraft("");
    setDraftMediaUrl("");
    setDraftAttachments([]);
    setReplyToMessageId(null);
  };

  return (
    <section className="shell section-stack page-reveal">
      <div className="section-heading section-heading--stacked">
        <div>
          <p className="eyebrow">Bell Fresh chat</p>
          <h1>Reply, react, and send pics, GIFs, video, audio, or files in one thread</h1>
          <p className="section-copy">
            Chats now keep richer thread context, better media support, and cleaner message previews without breaking the layout.
          </p>
        </div>
        <span className="experience-count">Live chat</span>
      </div>

      {!canInteract ? (
        <div className="notice-banner">
          Browse saved conversations without logging in. Sign in when you want to send messages,
          react, reply, or attach files.
        </div>
      ) : null}

      {otherUsers.length === 0 ? (
        <div className="empty-state">
          <h2>No one else is here yet.</h2>
          <p>Register another account first, then come back to start chatting.</p>
        </div>
      ) : (
        <div className="community-shell">
          <aside className="summary-card community-sidebar">
            <label className="community-search">
              <span>Find people</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, username, or last message"
              />
            </label>

            <div className="community-contact-list">
              {visibleUsers.map((user) => {
                const preview = conversationMeta[user.id];
                const unreadCount = preview?.unreadCount ?? 0;

                return (
                  <button
                    key={user.id}
                    type="button"
                    className={`community-contact${activeUser?.id === user.id ? " is-active" : ""}`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <span className="community-contact__avatar">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.firstName} loading="lazy" />
                      ) : (
                        user.favoriteEmoji ?? user.firstName.charAt(0)
                      )}
                    </span>
                    <span className="community-contact__copy">
                      <strong>{`${user.firstName} ${user.lastName}`}</strong>
                      <small>@{user.username}</small>
                      <small>{preview?.previewText ?? "No messages yet"}</small>
                    </span>
                    {unreadCount > 0 ? <span className="community-badge">{unreadCount}</span> : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="summary-card community-panel">
            {activeUser ? (
              <>
                <div className="community-panel__header">
                  <div>
                    <p className="eyebrow">Active chat</p>
                    <h2>{`${activeUser.firstName} ${activeUser.lastName}`}</h2>
                    <p className="summary-note">
                      {`${activeUser.favoriteEmoji ?? "\uD83D\uDCAC"} @${activeUser.username} • ${
                        activeConversation.length
                      } messages saved`}
                    </p>
                  </div>
                </div>

                <div className="community-messages">
                  {activeConversation.length === 0 ? (
                    <div className="empty-state empty-state--compact">
                      <h2>Start the conversation</h2>
                      <p>Say hi, send a photo, drop a GIF link, or upload a file and this thread will stay saved.</p>
                    </div>
                  ) : (
                    activeConversation.map((message) => {
                      const isMine = message.senderId === currentUser?.id;
                      const replyPreview =
                        (message.replyToMessageId
                          ? activeConversationMessageMap[message.replyToMessageId]
                          : null) ?? null;

                      return (
                        <article
                          key={message.id}
                          className={`community-message${isMine ? " is-mine" : ""}`}
                        >
                          {replyPreview ? (
                            <div className="message-reply-preview">
                              <strong>{replyPreview.senderId === currentUser?.id ? "You" : activeUser.firstName}</strong>
                              <span>{buildMessagePreview(replyPreview)}</span>
                            </div>
                          ) : null}

                          {message.text ? <p>{message.text}</p> : null}

                          <AttachmentPreviewList attachments={message.attachments ?? []} compact />

                          <div className="community-message__footer">
                            <small>{formatMessageTime(message.createdAt)}</small>
                            <button
                              type="button"
                              className="ghost-button"
                              onClick={() => setReplyToMessageId(message.id)}
                              disabled={!canInteract}
                            >
                              Reply
                            </button>
                          </div>

                          <ReactionBar
                            reactions={message.reactions}
                            currentUserId={currentUser?.id}
                            compact
                            onToggle={(emoji) => toggleMessageReaction(message.id, emoji)}
                            disabled={!canInteract}
                          />
                        </article>
                      );
                    })
                  )}
                  <div ref={scrollAnchorRef} />
                </div>

                <form className="community-composer" onSubmit={handleSendMessage}>
                  {replyTargetMessage ? (
                    <div className="reply-target-pill">
                      <span>
                        {`Replying to ${
                          replyTargetMessage.senderId === currentUser?.id ? "yourself" : activeUser.firstName
                        }: ${buildMessagePreview(replyTargetMessage)}`}
                      </span>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => setReplyToMessageId(null)}
                        disabled={!canInteract}
                      >
                        Clear
                      </button>
                    </div>
                  ) : null}

                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={`Message ${activeUser.firstName}...`}
                    disabled={!canInteract}
                  />

                  <label className="community-inline-input">
                    <span>GIF or media link</span>
                    <input
                      type="url"
                      value={draftMediaUrl}
                      onChange={(event) => setDraftMediaUrl(event.target.value)}
                      placeholder="https://media-link.com/funny-reply.gif"
                      disabled={!canInteract}
                    />
                  </label>

                  <AttachmentPreviewList
                    attachments={draftAttachments}
                    onRemove={(attachmentId) => void handleRemoveDraftAttachment(attachmentId)}
                    compact
                  />

                  <div className="community-composer__actions">
                    <div className="community-emoji-row">
                      <EmojiPicker
                        buttonLabel={"\uD83D\uDE0A"}
                        title="Add emoji to chat"
                        onSelect={(emoji) => setDraft((currentDraft) => `${currentDraft}${emoji} `)}
                        disabled={!canInteract}
                      />
                      <label className="ghost-button attachment-button">
                        Attach file
                        <input
                          type="file"
                          multiple
                          accept={ATTACHMENT_INPUT_ACCEPT}
                          onChange={handleDraftFiles}
                          disabled={!canInteract}
                        />
                      </label>
                      <span className="summary-note">{`Up to ${MAX_ATTACHMENTS_PER_PICK} attachments per message, with uploads up to ${MAX_ATTACHMENT_SIZE_LABEL} each.`}</span>
                    </div>
                    <button type="submit" className="cta-link" disabled={!canInteract}>
                      Send message
                    </button>
                  </div>
                </form>
              </>
            ) : null}
          </section>
        </div>
      )}
    </section>
  );
}
