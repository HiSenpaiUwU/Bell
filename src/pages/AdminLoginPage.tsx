import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { RedirectTo } from "../components/layout/RedirectTo";
import { getNavigationState, navigateTo } from "../utils/navigation";

interface AdminLoginLocationState {
  from?: string;
  message?: string;
}

const ADMIN_LOGIN_DELAY_MS = 1100;

export function AdminLoginPage() {
  const { isAdmin, isLoggedIn, loginAdmin } = useAuth();
  const { notify } = useNotifications();
  const state = getNavigationState<AdminLoginLocationState>();
  const timeoutRef = useRef<number | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(
    state?.message ? { tone: "success", text: state.message } : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (isLoggedIn && !isSubmitting) {
    return <RedirectTo path={state?.from ?? (isAdmin ? "/admin" : "/cart")} replace />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFeedback(null);
    const result = loginAdmin(identifier, password);

    if (!result.success) {
      setFeedback({ tone: "error", text: result.message });
      return;
    }

    setIsSubmitting(true);

    timeoutRef.current = window.setTimeout(() => {
      notify({
        title: "Admin access granted",
        message: "Opening the Bell Fresh dashboard.",
        tone: "success",
      });
      navigateTo(state?.from ?? "/admin", { replace: true });
    }, ADMIN_LOGIN_DELAY_MS);
  };

  return (
    <section className="auth-page">
      <div className="auth-layout shell">
        <aside className="auth-showcase auth-showcase--admin">
          <p className="eyebrow">Private admin area</p>
          <h1>Bell Fresh admin login</h1>
          <p className="auth-copy auth-copy--light">
            Use the dedicated admin sign-in to view saved customers, order history,
            receipt details, and profile records stored by this Bell Fresh demo.
          </p>

          <div className="auth-feature-list">
            <article className="auth-feature">
              <strong>Saved customer records</strong>
              <span>See usernames, names, email, phone number, GitHub link, and stored password data.</span>
            </article>
            <article className="auth-feature">
              <strong>Order history view</strong>
              <span>Review customer-linked orders and item details from the admin dashboard.</span>
            </article>
            <article className="auth-feature">
              <strong>Local-only security</strong>
              <span>This admin area is exclusive to the current browser storage, not a live backend.</span>
            </article>
          </div>

          <p className="auth-aside-link">
            Return to customer login:{" "}
            <button type="button" className="inline-nav-button" onClick={() => navigateTo("/login")}>
              Back to login
            </button>
          </p>
        </aside>

        <form
          className={`auth-card auth-card--enhanced auth-card--admin${isSubmitting ? " is-submitting" : ""}`}
          aria-busy={isSubmitting}
          onSubmit={handleSubmit}
        >
          <div className="auth-card__header">
            <p className="eyebrow">Bell Fresh admin</p>
            <h2>Admin Login</h2>
            <p className="auth-copy">
              Sign in with the admin username or email to access the private dashboard.
            </p>
          </div>

          {feedback ? (
            <p className={feedback.tone === "error" ? "auth-message auth-message--error" : "auth-message auth-message--success"}>
              {feedback.text}
            </p>
          ) : null}

          <label>
            <span>Admin username or email</span>
            <input
              type="text"
              autoComplete="username"
              value={identifier}
              disabled={isSubmitting}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Enter admin username or email"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              disabled={isSubmitting}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
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
                Opening admin...
              </>
            ) : (
              "Enter Admin"
            )}
          </button>

          <p className="auth-helper">
            {isSubmitting
              ? "Checking admin access and loading the dashboard..."
              : "Change the private admin account directly in AuthContext if you want your own custom admin credentials."}
          </p>

          <div className="auth-inline-links">
            <button
              type="button"
              className="inline-nav-button"
              onClick={() => navigateTo("/chat")}
            >
              Open chat
            </button>
            <button
              type="button"
              className="inline-nav-button"
              onClick={() => navigateTo("/admin/feed")}
            >
              Open news feed
            </button>
          </div>

          <p className="auth-switch auth-switch--secondary">
            Customer account instead?{" "}
            <button type="button" className="inline-nav-button" onClick={() => navigateTo("/login")}>
              Use customer login
            </button>
          </p>
        </form>
      </div>
    </section>
  );
}
