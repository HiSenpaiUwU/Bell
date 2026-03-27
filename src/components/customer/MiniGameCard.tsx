import { FormEvent, useState } from "react";
import { menuMiniGame } from "../../data/customerExperience";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useRewards } from "../../context/RewardsContext";
import { navigateTo } from "../../utils/navigation";

export function MiniGameCard() {
  const { currentUser, isLoggedIn, isAdmin } = useAuth();
  const { notify } = useNotifications();
  const { claimGameReward, hasClaimedGameReward } = useRewards();
  const [selectedOption, setSelectedOption] = useState("");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultTone, setResultTone] = useState<"success" | "error" | "info">("info");

  const alreadyClaimed = hasClaimedGameReward(menuMiniGame.id);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isLoggedIn || !currentUser || isAdmin) {
      setResultTone("info");
      setResultMessage("Sign in with a customer account to play and unlock coupons.");
      return;
    }

    if (!selectedOption) {
      setResultTone("error");
      setResultMessage("Pick one answer first.");
      return;
    }

    if (selectedOption !== menuMiniGame.correctOptionId) {
      setResultTone("error");
      setResultMessage("Almost. Try again and look at the menu customization options.");
      notify({
        title: "Not quite yet",
        message: "Try the Bell Fresh quiz one more time.",
        tone: "warning",
      });
      return;
    }

    const result = claimGameReward(menuMiniGame.id, menuMiniGame.rewardTemplateId);
    setResultTone(result.success ? "success" : "info");
    setResultMessage(result.message);

    notify({
      title: result.success ? "Reward unlocked" : "Reward update",
      message: result.message,
      tone: result.success ? "success" : "info",
    });
  };

  return (
    <section className="experience-card mini-game-card">
      <div className="experience-card__header">
        <div>
          <p className="eyebrow">Killing time</p>
          <h2>{menuMiniGame.title}</h2>
        </div>
        <span className="experience-count">{alreadyClaimed ? "Reward claimed" : "1 quick reward"}</span>
      </div>

      <p className="section-copy">{menuMiniGame.description}</p>
      <p className="mini-game-card__question">{menuMiniGame.question}</p>

      <form className="mini-game-card__form" onSubmit={handleSubmit}>
        <div className="mini-game-card__options">
          {menuMiniGame.options.map((option) => (
            <label key={option.id} className="mini-game-option">
              <input
                type="radio"
                name="menu-mini-game"
                value={option.id}
                checked={selectedOption === option.id}
                onChange={(event) => setSelectedOption(event.target.value)}
                disabled={alreadyClaimed}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>

        <button type="submit" className="cta-link" disabled={alreadyClaimed}>
          {alreadyClaimed ? "Already unlocked" : "Check my answer"}
        </button>
      </form>

      {resultMessage ? (
        <p className={`experience-feedback experience-feedback--${resultTone}`}>
          {resultMessage}
        </p>
      ) : null}

      {!isLoggedIn ? (
        <p className="summary-note">
          Want the reward?{" "}
          <button type="button" className="inline-nav-button" onClick={() => navigateTo("/login")}>
            Login first
          </button>{" "}
          so the coupon can stay in your Bell Fresh wallet.
        </p>
      ) : null}
    </section>
  );
}

