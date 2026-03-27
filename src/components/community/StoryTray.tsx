import { Story, User } from "../../types";

interface StoryWithAuthor extends Story {
  author: Pick<User, "id" | "firstName" | "lastName" | "username" | "avatarUrl" | "favoriteEmoji">;
}

interface StoryTrayProps {
  stories: StoryWithAuthor[];
  currentUserId?: string;
  onAddStory: () => void;
  onOpenStory: (storyId: string) => void;
  canAddStory?: boolean;
}

function formatStoryAge(createdAt: string) {
  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const elapsedHours = Math.max(1, Math.floor(elapsedMs / (1000 * 60 * 60)));

  if (elapsedHours < 24) {
    return `${elapsedHours}h`;
  }

  return "1d";
}

export function StoryTray({
  stories,
  currentUserId,
  onAddStory,
  onOpenStory,
  canAddStory = true,
}: StoryTrayProps) {
  const storyGroups = stories.reduce<
    Array<{
      authorId: string;
      latestStoryId: string;
      latestStory: StoryWithAuthor;
      stories: StoryWithAuthor[];
    }>
  >((groups, story) => {
    const existingGroup = groups.find((group) => group.authorId === story.authorId);

    if (existingGroup) {
      existingGroup.stories.push(story);

      if (
        new Date(story.createdAt).getTime() >
        new Date(existingGroup.latestStory.createdAt).getTime()
      ) {
        existingGroup.latestStory = story;
        existingGroup.latestStoryId = story.id;
      }

      return groups;
    }

    groups.push({
      authorId: story.authorId,
      latestStoryId: story.id,
      latestStory: story,
      stories: [story],
    });

    return groups;
  }, []);

  return (
    <section className="summary-card story-tray">
      <div className="story-tray__header">
        <div>
          <p className="eyebrow">Stories</p>
          <h2>Quick updates that disappear in 24 hours</h2>
        </div>
      </div>

      <div className="story-tray__list">
        <button
          type="button"
          className="story-pill story-pill--add"
          onClick={onAddStory}
          disabled={!canAddStory}
        >
          <span className="story-pill__avatar story-pill__avatar--add">+</span>
          <span className="story-pill__copy">
            <strong>{canAddStory ? "Your story" : "Story sharing"}</strong>
            <small>{canAddStory ? "Share a quick moment" : "Sign in to share a story"}</small>
          </span>
        </button>

        {storyGroups.map((group) => {
          const story = group.latestStory;
          const isUnseen = currentUserId
            ? group.stories.some(
                (currentStory) =>
                  currentStory.authorId !== currentUserId &&
                  !currentStory.viewedBy.includes(currentUserId),
              )
            : false;

          return (
            <button
              key={group.authorId}
              type="button"
              className={`story-pill${isUnseen ? " is-unseen" : ""}`}
              onClick={() => onOpenStory(group.latestStoryId)}
            >
              <span className="story-pill__avatar">
                {story.author.avatarUrl ? (
                  <img src={story.author.avatarUrl} alt={story.author.firstName} loading="lazy" />
                ) : (
                  story.author.favoriteEmoji ?? story.author.firstName.charAt(0)
                )}
              </span>
              <span className="story-pill__copy">
                <strong>{`${story.author.firstName} ${story.author.lastName}`}</strong>
                <small>{`${formatStoryAge(story.createdAt)} • ${story.caption || "Story update"}`}</small>
                <small>{`${group.stories.length} active stor${
                  group.stories.length === 1 ? "y" : "ies"
                }`}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
