import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { RedirectTo } from "../components/layout/RedirectTo";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { getNavigationState, navigateTo } from "../utils/navigation";

interface LoginLocationState {
  from?: string;
  message?: string;
}

const LOGIN_DELAY_MS = 950;

export function LoginPage() {
  const { continueWithProvider, importUserBackup, isAdmin, isLoggedIn, login } = useAuth();
  const { notify } = useNotifications();
  const state = getNavigationState<LoginLocationState>();
  const timeoutRef = useRef<number | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(
    state?.message ? { tone: "success", text: state.message } : null,
  );

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
    const result = login(identifier, password);

    if (!result.success) {
      setFeedback({ tone: "error", text: result.message });
      return;
    }

    setIsSubmitting(true);

    timeoutRef.current = window.setTimeout(() => {
      notify({
        title: "Welcome back",
        message: `${identifier || "Bell Fresh user"} is now signed in.`,
        tone: "success",
      });

      navigateTo(state?.from ?? "/cart", { replace: true });
    }, LOGIN_DELAY_MS);
  };

  const handleProviderLogin = (provider: "google" | "facebook") => {
    if (isSubmitting) {
      return;
    }

    const result = continueWithProvider(provider, identifier);

    if (!result.success) {
      setFeedback({ tone: "error", text: result.message });
      return;
    }

    notify({
      title: provider === "google" ? "Google linked login" : "Facebook linked login",
      message: result.message,
      tone: "success",
    });

    navigateTo(state?.from ?? "/cart", { replace: true });
  };

  const handleImportBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const backupFile = event.target.files?.[0];

    if (!backupFile) {
      return;
    }

    const result = importUserBackup(await backupFile.text());

    setFeedback({ tone: result.success ? "success" : "error", text: result.message });

    if (result.success) {
      notify({
        title: "Backup restored",
        message: result.message,
        tone: "success",
      });
    }

    event.target.value = "";
  };

  return (
    <section className="auth-page">
      <div className="auth-layout shell">
        <aside className="auth-showcase auth-showcase--login">
          <p className="eyebrow">Bell Fresh web app</p>
          <h1>Sign in and keep your order moving.</h1>
          <p className="auth-copy auth-copy--light">
            Access your cart, coupon wallet, checkout flow, receipt downloads, and profile-based
            orders through a cleaner Bell Fresh sign-in flow.
          </p>

          <div className="auth-feature-list">
            <article className="auth-feature">
              <strong>Saved account details</strong>
              <span>Use your username or email to get back into your Bell Fresh account.</span>
            </article>
            <article className="auth-feature">
              <strong>Rewards and coupons</strong>
              <span>Your wallet stays linked to your Bell Fresh customer profile.</span>
            </article>
            <article className="auth-feature">
              <strong>Private admin route</strong>
              <span>The admin dashboard uses its own dedicated login screen.</span>
            </article>
          </div>

          <p className="auth-aside-link">
            Need an account?{" "}
            <button
              type="button"
              className="inline-nav-button"
              onClick={() => navigateTo("/register")}
            >
              Create one here
            </button>
          </p>
        </aside>

        <form
          className={`auth-card auth-card--enhanced${isSubmitting ? " is-submitting" : ""}`}
          aria-busy={isSubmitting}
          onSubmit={handleSubmit}
        >
          <div className="auth-card__header">
            <p className="eyebrow">Bell Fresh account</p>
            <h2>Login</h2>
            <p className="auth-copy">
              Sign in with your username or email to continue to your cart, coupons, and checkout.
            </p>
          </div>

          <div className="social-auth-row">
            <button
              type="button"
              className="social-auth-button"
              disabled={isSubmitting}
              onClick={() => handleProviderLogin("google")}
            >
              Use linked Google account
            </button>
            <button
              type="button"
              className="social-auth-button"
              disabled={isSubmitting}
              onClick={() => handleProviderLogin("facebook")}
            >
              Use linked Facebook account
            </button>
          </div>

          {feedback ? (
            <p
              className={
                feedback.tone === "error"
                  ? "auth-message auth-message--error"
                  : "auth-message auth-message--success"
              }
            >
              {feedback.text}
            </p>
          ) : null}

          <label>
            <span>Username or email</span>
            <input
              type="text"
              autoComplete="username"
              value={identifier}
              disabled={isSubmitting}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Enter your username or email"
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
              placeholder="Enter your password"
            />
          </label>

          <div className="auth-inline-links">
            <button
              type="button"
              className="inline-nav-button"
              onClick={() => navigateTo("/forgot-password")}
            >
              Forgot password?
            </button>
            <button
              type="button"
              className="inline-nav-button"
              onClick={() => navigateTo("/admin-login")}
            >
              Admin login
            </button>
          </div>

          <button
            type="submit"
            className={`cta-link auth-submit${isSubmitting ? " is-loading" : ""}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="auth-submit__spinner" aria-hidden="true" />
                Signing in...
              </>
            ) : (
              "Login"
            )}
          </button>

          <p className="auth-helper">
            {isSubmitting
              ? "Signing you in and loading your Bell Fresh cart..."
              : "Use your password as usual, use a linked Google/Facebook account, or restore your backup file on another browser."}
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
              onClick={() => navigateTo("/customer/feed")}
            >
              Open news feed
            </button>
          </div>

          <div className="auth-inline-links">
            <button
              type="button"
              className="inline-nav-button"
              onClick={() => backupInputRef.current?.click()}
            >
              Restore account backup
            </button>
            <input
              ref={backupInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => void handleImportBackup(event)}
            />
          </div>

          <p className="auth-switch">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="inline-nav-button"
              onClick={() => navigateTo("/register")}
            >
              Register here
            </button>
          </p>
        </form>
      </div>
    </section>
  );
}
