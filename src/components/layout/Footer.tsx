import { navigateTo } from "../../utils/navigation";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid footer-grid--simple">
        <div>
          <p className="footer-title">Bell Fresh</p>
          <p className="footer-copy">
            Fresh salads, feel-good milk tea, and an easier ordering experience in
            one polished React website.
          </p>
        </div>

        <div className="footer-links footer-links--simple">
          <button type="button" onClick={() => navigateTo("/about")}>About Bell Fresh</button>
          <button type="button" onClick={() => navigateTo("/privacy")}>Privacy Policy</button>
          <button type="button" onClick={() => navigateTo("/terms")}>Terms of Use</button>
        </div>
      </div>
      <p className="footer-bottom">(c) 2026 Bell Fresh. All rights reserved.</p>
    </footer>
  );
}
