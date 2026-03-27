import { navigateTo } from "../utils/navigation";

export function TermsPage() {
  return (
    <section className="shell section-stack policy-page">
      <div className="section-heading section-heading--stacked">
        <div>
          <p className="eyebrow">Terms of Use</p>
          <h1>Simple website terms for Bell Fresh</h1>
          <p className="section-copy">
            These terms keep the Bell Fresh web experience clear, lightweight, and
            focused on normal menu browsing and ordering behavior.
          </p>
        </div>
      </div>

      <div className="policy-grid">
        <article className="summary-card policy-card">
          <h2>Using the site</h2>
          <p>
            You may browse the menu, customize drinks, place demo orders, and use
            the account flow in a normal and respectful way.
          </p>
        </article>

        <article className="summary-card policy-card">
          <h2>Content and pricing</h2>
          <p>
            Menu items, prices, and visuals may change as the website is updated,
            improved, or adjusted for demo purposes.
          </p>
        </article>

        <article className="summary-card policy-card">
          <h2>Responsible use</h2>
          <p>
            Please do not misuse the website, attempt to break it, or rely on it
            as a legal or commercial contract without a fuller production policy.
          </p>
        </article>
      </div>

      <p className="summary-note policy-note">
        This page is intentionally simple and focused on the current Bell Fresh
        web app instead of heavy legal wording.
      </p>

      <button type="button" className="cta-link policy-link" onClick={() => navigateTo("/about")}>
        Back to About
      </button>
    </section>
  );
}
