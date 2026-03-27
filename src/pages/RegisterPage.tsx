import { FormEvent, useEffect, useRef, useState } from "react";
import { EmojiPicker } from "../components/community/EmojiPicker";
import { RedirectTo } from "../components/layout/RedirectTo";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { navigateTo } from "../utils/navigation";

const REGISTER_DELAY_MS = 1050;

export function RegisterPage() {
  const { isAdmin, isLoggedIn, register } = useAuth();
  const { notify } = useNotifications();
  const timeoutRef = useRef<number | null>(null);
  const facebookRef = useRef<HTMLInputElement | null>(null);
  const googleEmailRef = useRef<HTMLInputElement | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [github, setGithub] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [favoriteEmoji, setFavoriteEmoji] = useState("🥗");
  const [facebook, setFacebook] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (isLoggedIn) {
    return <RedirectTo path={isAdmin ? "/admin" : "/cart"} replace />;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const result = register({
      username,
      firstName,
      lastName,
      email,
      phone,
      github,
      avatarUrl,
      favoriteEmoji,
      socialLinks: {
        facebook,
        googleEmail,
      },
      password,
    });

    if (!result.success) {
      setFeedback(result.message);
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    timeoutRef.current = window.setTimeout(() => {
      notify({
        title: "Account created",
        message: "You can now sign in and continue to your cart.",
        tone: "success",
      });

      navigateTo("/login", {
        replace: true,
        state: { message: result.message },
      });
    }, REGISTER_DELAY_MS);
  };

  const handleProviderRegister = (provider: "google" | "facebook") => {
    if (provider === "google") {
      googleEmailRef.current?.focus();
      setFeedback(
        "Add your Google email here, finish registration, and the Google button on login will work for this saved account.",
      );
      return;
    }

    facebookRef.current?.focus();
    setFeedback(
      "Add your Facebook link here, finish registration, and the Facebook button on login will work for this saved account.",
    );
  };

  return (
    <section className="auth-page">
      <div className="auth-layout shell">
        <aside className="auth-showcase auth-showcase--register">
          <p className="eyebrow">Create your Bell Fresh space</p>
          <h1>Build your account with the details you want saved.</h1>
          <p className="auth-copy auth-copy--light">
            Register with your profile details so Bell Fresh can keep a clearer customer record for
            orders, receipts, and the admin dashboard view.
          </p>

          <div className="auth-feature-list">
            <article className="auth-feature">
              <strong>Full profile setup</strong>
              <span>Save your name, email, phone number, username, and optional GitHub link.</span>
            </article>
            <article className="auth-feature">
              <strong>Order-ready account</strong>
              <span>Your Bell Fresh orders can now be linked to the customer who placed them.</span>
            </article>
            <article className="auth-feature">
              <strong>Portable recovery</strong>
              <span>Use the backup restore option on login if you move to another browser later.</span>
            </article>
          </div>

          <p className="auth-aside-link">
            Already have an account?{" "}
            <button type="button" className="inline-nav-button" onClick={() => navigateTo("/login")}>
              Login here
            </button>
          </p>
        </aside>

        <form
          className={`auth-card auth-card--enhanced${isSubmitting ? " is-submitting" : ""}`}
          aria-busy={isSubmitting}
          onSubmit={handleSubmit}
        >
          <div className="auth-card__header">
            <p className="eyebrow">Create your account</p>
            <h2>Register</h2>
            <p className="auth-copy">
              Create a Bell Fresh account with your customer details and sign in after setup.
            </p>
          </div>

          <div className="social-auth-row">
            <button
              type="button"
              className="social-auth-button"
              disabled={isSubmitting}
              onClick={() => handleProviderRegister("google")}
            >
              ✨ Link Google
            </button>
            <button
              type="button"
              className="social-auth-button"
              disabled={isSubmitting}
              onClick={() => handleProviderRegister("facebook")}
            >
              📘 Link Facebook
            </button>
          </div>

          {feedback ? <p className="auth-message auth-message--error">{feedback}</p> : null}

          <div className="field-grid field-grid--auth">
            <label>
              <span>First name</span>
              <input
                type="text"
                autoComplete="given-name"
                value={firstName}
                disabled={isSubmitting}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Your first name"
              />
            </label>
            <label>
              <span>Last name</span>
              <input
                type="text"
                autoComplete="family-name"
                value={lastName}
                disabled={isSubmitting}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Your last name"
              />
            </label>
          </div>

          <label>
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              disabled={isSubmitting}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Choose a username"
            />
          </label>

          <div className="field-grid field-grid--auth">
            <label>
              <span>Email address</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                disabled={isSubmitting}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              <span>Phone number</span>
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                disabled={isSubmitting}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="09XXXXXXXXX"
              />
            </label>
          </div>

          <label>
            <span>GitHub profile (optional)</span>
            <input
              type="url"
              value={github}
              disabled={isSubmitting}
              onChange={(event) => setGithub(event.target.value)}
              placeholder="https://github.com/your-name"
            />
          </label>

          <div className="field-grid field-grid--auth">
            <label>
              <span>Profile picture URL (optional)</span>
              <input
                type="url"
                value={avatarUrl}
                disabled={isSubmitting}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://image-link.com/photo.jpg"
              />
            </label>
            <label>
              <span>Favorite emoji</span>
              <div className="profile-emoji-row">
                <input
                  type="text"
                  value={favoriteEmoji}
                  disabled={isSubmitting}
                  onChange={(event) => setFavoriteEmoji(event.target.value)}
                  placeholder="🥤"
                  maxLength={8}
                />
                <EmojiPicker
                  buttonLabel={favoriteEmoji || "😊"}
                  title="Choose your favorite emoji"
                  onSelect={setFavoriteEmoji}
                />
              </div>
            </label>
          </div>

          <div className="field-grid field-grid--auth">
            <label>
              <span>Facebook link (optional)</span>
              <input
                ref={facebookRef}
                type="url"
                value={facebook}
                disabled={isSubmitting}
                onChange={(event) => setFacebook(event.target.value)}
                placeholder="https://facebook.com/your-name"
              />
            </label>
            <label>
              <span>Google email (optional)</span>
              <input
                ref={googleEmailRef}
                type="email"
                value={googleEmail}
                disabled={isSubmitting}
                onChange={(event) => setGoogleEmail(event.target.value)}
                placeholder="you@gmail.com"
              />
            </label>
          </div>

          <label>
            <span>Password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              disabled={isSubmitting}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
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
                Creating account...
              </>
            ) : (
              "Register"
            )}
          </button>

          <p className="auth-helper">
            {isSubmitting
              ? "Creating your Bell Fresh account and preparing the sign-in screen..."
              : "Link your Google email or Facebook profile here, and use backup restore on the login page if you move to another browser later."}
          </p>

          <p className="auth-switch">
            Already have an account?{" "}
            <button type="button" className="inline-nav-button" onClick={() => navigateTo("/login")}>
              Login here
            </button>
          </p>
        </form>
      </div>
    </section>
  );
}
