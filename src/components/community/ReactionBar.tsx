import { ReactionGroup } from "../../types";
import { QUICK_REACTION_EMOJIS } from "../../utils/community";

interface ReactionBarProps {
  reactions?: ReactionGroup[];
  currentUserId?: string;
  onToggle: (emoji: string) => void;
  options?: string[];
  compact?: boolean;
  disabled?: boolean;
}

export function ReactionBar({
  reactions,
  currentUserId,
  onToggle,
  options = QUICK_REACTION_EMOJIS,
  compact = false,
  disabled = false,
}: ReactionBarProps) {
  const optionSet = new Set(options);

  reactions?.forEach((reaction) => {
    optionSet.add(reaction.emoji);
  });

  return (
    <div className={`reaction-bar${compact ? " reaction-bar--compact" : ""}`}>
      {[...optionSet].map((emoji) => {
        const reaction = reactions?.find((item) => item.emoji === emoji);
        const count = reaction?.userIds.length ?? 0;
        const isActive = Boolean(currentUserId && reaction?.userIds.includes(currentUserId));

        return (
          <button
            key={emoji}
            type="button"
            className={`reaction-chip${isActive ? " is-active" : ""}`}
            onClick={() => onToggle(emoji)}
            disabled={disabled}
          >
            <span>{emoji}</span>
            <small>{count > 0 ? count : "+"}</small>
          </button>
        );
      })}
    </div>
  );
}
