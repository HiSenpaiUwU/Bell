import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { emojiCatalog } from "../../data/emojiCatalog";

interface EmojiPickerProps {
  buttonLabel?: string;
  title?: string;
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({
  buttonLabel = "😊",
  title = "Pick an emoji",
  onSelect,
  disabled = false,
}: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState(emojiCatalog[0]?.id ?? "smileys");

  useEffect(() => {
    if (disabled && isOpen) {
      setIsOpen(false);
    }
  }, [disabled, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const visibleCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      const activeCategory =
        emojiCatalog.find((category) => category.id === activeCategoryId) ?? emojiCatalog[0];

      return activeCategory ? [activeCategory] : [];
    }

    return emojiCatalog.filter((category) => {
      const searchableText = [category.label, ...category.keywords].join(" ").toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [activeCategoryId, searchTerm]);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setIsOpen(false);
    setSearchTerm("");
  };

  const pickerOverlay =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              className="emoji-picker__backdrop"
              aria-label="Close emoji picker"
              onClick={() => setIsOpen(false)}
            />
            <div
              className="emoji-picker__panel"
              role="dialog"
              aria-modal="true"
              aria-label={title}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="emoji-picker__header">
                <div className="emoji-picker__title">
                  <strong>{title}</strong>
                  <span>Scroll, search, and tap any emoji you want.</span>
                </div>
                <button
                  type="button"
                  className="emoji-picker__close"
                  aria-label="Close emoji picker"
                  onClick={() => setIsOpen(false)}
                >
                  Close
                </button>
                <input
                  type="search"
                  className="emoji-picker__search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search emoji"
                />
              </div>

              <div className="emoji-picker__body">
                {visibleCategories.map((category) => (
                  <section key={category.id} className="emoji-picker__section">
                    <p>{category.label}</p>
                    <div className="emoji-picker__grid">
                      {category.emojis.map((emoji) => (
                        <button
                          key={`${category.id}-${emoji}`}
                          type="button"
                          className="emoji-picker__option"
                          onClick={() => handleSelect(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}

                {visibleCategories.length === 0 ? (
                  <div className="empty-state empty-state--compact">
                    <h2>No emoji matched.</h2>
                    <p>Try words like cute, food, drinks, hearts, animals, or people.</p>
                  </div>
                ) : null}
              </div>

              <div className="emoji-picker__tabs" role="tablist" aria-label="Emoji categories">
                {emojiCatalog.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`emoji-picker__tab${activeCategoryId === category.id ? " is-active" : ""}`}
                    aria-pressed={activeCategoryId === category.id}
                    onClick={() => {
                      setActiveCategoryId(category.id);
                      setSearchTerm("");
                    }}
                  >
                    <span>{category.icon}</span>
                    <small>{category.label.split(" ")[0]}</small>
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className={`emoji-picker${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        className="emoji-picker__trigger"
        aria-expanded={isOpen}
        aria-label={title}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        disabled={disabled}
      >
        {buttonLabel}
      </button>

      {pickerOverlay}
    </div>
  );
}
