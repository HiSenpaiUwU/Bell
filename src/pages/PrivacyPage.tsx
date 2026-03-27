import { navigateTo } from "../utils/navigation";

export function PrivacyPage() {
  return (
    <section className="shell section-stack policy-page">
      <div className="section-heading section-heading--stacked">
        <div>
          <p className="eyebrow">Privacy Policy</p>
          <h1>Simple privacy details for Bell Fresh</h1>
          <p className="section-copy">
            We only keep the basic information needed to help you browse, sign in,
            manage your cart, and place an order through this website.
          </p>
        </div>
      </div>

      <div className="policy-grid">
        <article className="summary-card policy-card">
          <h2>What we store</h2>
          <p>
            Bell Fresh may store your username, cart items, recent order details,
            and the choices you make inside the app so the website feels smoother
            while you use it.
          </p>
        </article>

        <article className="summary-card policy-card">
          <h2>How we use it</h2>
          <p>
            That information is only used to support login, checkout, receipts,
            and a more convenient browsing experience in this demo website.
          </p>
        </article>

        <article className="summary-card policy-card">
          <h2>What we do not do</h2>
          <p>
            We do not claim to sell your data, run hidden tracking systems, or use
            your information for anything unrelated to the Bell Fresh website flow.
          </p>
        </article>
      </div>

      <p className="summary-note policy-note">
        If the website grows into a real production service, this page should be
        expanded with legal review and clearer compliance details.
      </p>

      <button type="button" className="cta-link policy-link" onClick={() => navigateTo("/menu")}>
        Back to Menu
      </button>
    </section>
  );
}
