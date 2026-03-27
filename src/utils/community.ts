import { FeedComment, ReactionGroup } from "../types";

export const QUICK_REACTION_EMOJIS = ["\u2764\uFE0F", "\u2728", "\uD83D\uDE02", "\uD83D\uDE0D", "\uD83E\uDD7A", "\uD83D\uDC4D"];

export function toggleReactionGroups(
  reactions: ReactionGroup[] | undefined,
  emoji: string,
  userId: string,
) {
  const trimmedEmoji = emoji.trim();

  if (!trimmedEmoji) {
    return reactions ?? [];
  }

  const nextReactions = [...(reactions ?? [])];
  const targetIndex = nextReactions.findIndex((reaction) => reaction.emoji === trimmedEmoji);

  if (targetIndex < 0) {
    return [...nextReactions, { emoji: trimmedEmoji, userIds: [userId] }];
  }

  const targetReaction = nextReactions[targetIndex];
  const alreadyReacted = targetReaction.userIds.includes(userId);
  const nextUserIds = alreadyReacted
    ? targetReaction.userIds.filter((currentUserId) => currentUserId !== userId)
    : [...targetReaction.userIds, userId];

  if (nextUserIds.length === 0) {
    nextReactions.splice(targetIndex, 1);
    return nextReactions;
  }

  nextReactions[targetIndex] = {
    ...targetReaction,
    userIds: nextUserIds,
  };

  return nextReactions;
}

export function flattenComments(comments: FeedComment[] | undefined): FeedComment[] {
  if (!comments?.length) {
    return [];
  }

  return comments.flatMap((comment) => [comment, ...flattenComments(comment.replies)]);
}

export function countComments(comments: FeedComment[] | undefined) {
  return flattenComments(comments).length;
}

export function findCommentById(
  comments: FeedComment[] | undefined,
  commentId: string,
): FeedComment | null {
  if (!comments?.length) {
    return null;
  }

  for (const comment of comments) {
    if (comment.id === commentId) {
      return comment;
    }

    const nestedMatch = findCommentById(comment.replies, commentId);

    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

export function updateCommentTree(
  comments: FeedComment[] | undefined,
  commentId: string,
  updater: (comment: FeedComment) => FeedComment,
): FeedComment[] {
  return (comments ?? []).map((comment) => {
    if (comment.id === commentId) {
      return updater(comment);
    }

    if (!comment.replies?.length) {
      return comment;
    }

    return {
      ...comment,
      replies: updateCommentTree(comment.replies, commentId, updater),
    };
  });
}

export function insertCommentReply(
  comments: FeedComment[] | undefined,
  parentCommentId: string,
  nextReply: FeedComment,
): FeedComment[] {
  return (comments ?? []).map((comment) => {
    if (comment.id === parentCommentId) {
      return {
        ...comment,
        replies: [...(comment.replies ?? []), nextReply],
      };
    }

    if (!comment.replies?.length) {
      return comment;
    }

    return {
      ...comment,
      replies: insertCommentReply(comment.replies, parentCommentId, nextReply),
    };
  });
}

export function removeCommentFromTree(
  comments: FeedComment[] | undefined,
  commentId: string,
): { nextComments: FeedComment[]; removedComment: FeedComment | null } {
  const nextComments: FeedComment[] = [];
  let removedComment: FeedComment | null = null;

  for (const comment of comments ?? []) {
    if (comment.id === commentId) {
      removedComment = comment;
      continue;
    }

    if (comment.replies?.length) {
      const nestedResult = removeCommentFromTree(comment.replies, commentId);

      if (nestedResult.removedComment) {
        removedComment = nestedResult.removedComment;
        nextComments.push({
          ...comment,
          replies: nestedResult.nextComments,
        });
        continue;
      }
    }

    nextComments.push(comment);
  }

  return {
    nextComments,
    removedComment,
  };
}

export function collectCommentAttachments(comments: FeedComment[] | undefined) {
  return flattenComments(comments).flatMap((comment) => comment.attachments ?? []);
}
