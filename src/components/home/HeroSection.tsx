import { useAuth } from "../../context/AuthContext";
import { InstallAppButton } from "../layout/InstallAppButton";
import { navigateTo } from "../../utils/navigation";

export function HeroSection() {
  const { currentUser, isLoggedIn, isAdmin } = useAuth();
  const greeting = isLoggedIn && currentUser && !isAdmin
    ? `Welcome back, ${currentUser.firstName} \uD83D\uDC4B`
    : "Bell Fresh healthy favorites";

  return (
    <section className="hero-section shell">
      <div className="hero-copy">
        <p className="eyebrow">{greeting}</p>
        <h1>Fresh salads, light bites, and milk tea made your way.</h1>
        <p className="hero-text">
          Explore Bell Fresh with featured favorites, lighter snacks, easy
          ordering, and a smoother food-first experience from menu to checkout.
        </p>
        <div className="hero-actions">
          <button type="button" className="cta-link" onClick={() => navigateTo("/menu")}>
            Explore Menu
          </button>
          {isLoggedIn && currentUser && !isAdmin ? (
            <button type="button" className="ghost-link" onClick={() => navigateTo("/profile")}>
              Open Profile
            </button>
          ) : null}
          <button type="button" className="ghost-link" onClick={() => navigateTo("/about/team")}>
            Meet the team
          </button>
          <InstallAppButton />
        </div>
      </div>
      <div className="hero-panel">
        <p className="hero-panel__label">Daily picks</p>
        <ul>
          <li>Fresh salad bowls</li>
          <li>Light snacks</li>
          <li>Milk tea your way</li>
          <li>Fresh picks for you</li>
        </ul>
      </div>
    </section>
  );
}
