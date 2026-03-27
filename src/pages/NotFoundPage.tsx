import { navigateTo } from "../utils/navigation";

export function NotFoundPage() {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="auth-copy">
          The page you tried to open is not part of the Bell Fresh React app.
        </p>
        <button type="button" className="cta-link auth-submit" onClick={() => navigateTo("/")}>
          Back to Home
        </button>
      </div>
    </section>
  );
}
