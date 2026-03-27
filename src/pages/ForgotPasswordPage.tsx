import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { RedirectTo } from "../components/layout/RedirectTo";
import { navigateTo } from "../utils/navigation";

const FORGOT_DELAY_MS = 900;

export function ForgotPasswordPage() {
  const { isLoggedIn, requestPasswordReset } = useAuth();
  const { notify } = useNotifications();
  const timeoutRef = useRef<number | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (isLoggedIn && !isSubmitting) {
    return <RedirectTo path="/cart" replace />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFeedback(null);
    const result = requestPasswordReset(identifier, nextPassword, note);

    if (!result.success) {
      setFeedback({ tone: "error", text: result.message });
      return;
    }

    setIsSubmitting(true);

    timeoutRef.current = window.setTimeout(() => {
      notify({
        title: "Reset request sent",
        message: "The Bell Fresh admin can now review your password request.",
        tone: "info",
      });

      navigateTo("/login", {
        replace: true,
        state: {
          message: "Password reset request sent. Wait for admin approval before logging in again.",
        },
      });
    }, FORGOT_DELAY_MS);
  };

  return (
    <section className="auth-page">
      <div className="auth-layout shell">
        <aside className="auth-showcase auth-showcase--login">
          <p className="eyebrow">Bell Fresh support</p>
          <h1>Request a password reset the cleaner way.</h1>
          <p className="auth-copy auth-copy--light">
            This Bell Fresh demo stores reset requests locally, so the admin dashboard can review them and approve your new password.
          </p>

          <div className="auth-feature-list">
            <article className="auth-feature">
              <strong>Customer-first flow</strong>
              <span>Ask for a reset without leaving the web app.</span>
            </article>
            <article className="auth-feature">
              <strong>Admin review</strong>
              <span>The admin dashboard can approve or reject your request.</span>
            </article>
            <article className="auth-feature">
              <strong>Notification feedback</strong>
              <span>You still get the same smoother web-style alerts after sending it.</span>
            </article>
          </div>
        </aside>

        <form
          className={`auth-card auth-card--enhanced${isSubmitting ? " is-submitting" : ""}`}
          aria-busy={isSubmitting}
          onSubmit={handleSubmit}
        >
          <div className="auth-card__header">
            <p className="eyebrow">Customer reset</p>
            <h2>Forgot password</h2>
            <p className="auth-copy">
              Enter your username or email, then request the password you want the admin to approve.
            </p>
          </div>

          {feedback ? (
            <p className={feedback.tone === "error" ? "auth-message auth-message--error" : "auth-message auth-message--success"}>
              {feedback.text}
            </p>
          ) : null}

          <label>
            <span>Username or email</span>
            <input
              type="text"
              value={identifier}
              disabled={isSubmitting}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Enter your username or email"
            />
          </label>

          <label>
            <span>New password request</span>
            <input
              type="password"
              value={nextPassword}
              disabled={isSubmitting}
              onChange={(event) => setNextPassword(event.target.value)}
              placeholder="Enter your new password"
            />
          </label>

          <label>
            <span>Short note for admin (optional)</span>
            <textarea
              value={note}
              disabled={isSubmitting}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Example: I changed phones and need a fresh password."
              rows={4}
            />
          </label>

          <button
            type="submit"
            className={`cta-link auth-submit${isSubmitting ? " is-loading" : ""}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="auth-submit__spinner" aria-hidden="true" />
                Sending request...
              </>
            ) : (
              "Send reset request"
            )}
          </button>

          <p className="auth-helper">
            {isSubmitting
              ? "Sending your reset request to the Bell Fresh admin dashboard..."
              : "This is a local demo flow, so there is no email inbox involved yet."}
          </p>

          <p className="auth-switch">
            Remembered it?{" "}
            <button type="button" className="inline-nav-button" onClick={() => navigateTo("/login")}>
              Back to login
            </button>
          </p>
        </form>
      </div>
    </section>
  );
}
