import { useEffect } from "react";
import { aboutValues, teamMembers } from "../data/menuData";
import avocadoGreenBowlImage from "../assets/images/Avocado Green Bowl.jpg";
import freshSaladImage from "../assets/images/fresh_salad.jpg";
import proteinPowerSaladImage from "../assets/images/Protein Power Salad.jpg";
import streetCornChickenSaladImage from "../assets/images/Street Corn Chicken salad.jpg";
import { navigateTo } from "../utils/navigation";

const aboutValueDescriptions: Record<string, string> = {
  "Freshness & Quality":
    "Ingredients, visuals, and presentation stay at the center of the Bell Fresh identity.",
  "Health & Nutrition":
    "Meals are designed to feel colorful, balanced, and easy to enjoy as part of everyday routines.",
  Sustainability:
    "We prefer a cleaner, more thoughtful product and interface experience over clutter and excess.",
  "Customer Happiness":
    "Every screen and interaction is shaped to feel supportive, reassuring, and easier to finish.",
};

interface AboutPageProps {
  initialSection?: "team";
}

export function AboutPage({ initialSection }: AboutPageProps) {
  useEffect(() => {
    if (initialSection !== "team") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      document.getElementById("team")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [initialSection]);

  return (
    <section className="shell section-stack about-page about-page--refined">
      <section className="about-hero-simple">
        <div className="about-hero-simple__copy">
          <p className="eyebrow">About Bell Fresh</p>
          <h1>Fresh food, calm design, and an easier Bell Fresh experience.</h1>
          <p className="section-copy">
            Bell Fresh is built for people who want colorful salads, customizable
            milk tea, and a web experience that feels clear, polished, and easy to trust.
          </p>
          <p className="section-copy">
            From menu browsing to checkout and receipt download, every step is
            designed to feel lighter and more focused instead of crowded.
          </p>

          <div className="about-pill-list about-pill-list--refined">
            <span>Fresh salads daily</span>
            <span>Custom milk tea flow</span>
            <span>Clean ordering experience</span>
          </div>

          <div className="hero-actions">
            <button type="button" className="cta-link" onClick={() => navigateTo("/menu")}>
              Explore Menu
            </button>
            <button type="button" className="ghost-link" onClick={() => navigateTo("/privacy")}>
              Privacy Policy
            </button>
          </div>
        </div>

        <div className="about-hero-simple__visual">
          <img src={freshSaladImage} alt="Bell Fresh salad bowl" className="about-hero-simple__image about-hero-simple__image--large" />
          <img src={streetCornChickenSaladImage} alt="Street Corn Chicken Salad" className="about-hero-simple__image about-hero-simple__image--small" />
        </div>
      </section>

      <section className="about-story-simple-grid">
        <article className="info-card about-story-simple-card">
          <p className="eyebrow">Our story</p>
          <h2>Made to feel fresh, not overwhelming.</h2>
          <p>
            Bell Fresh started with a simple goal: healthy food and drinks should
            be enjoyable, customizable, and easy to order without the website feeling messy.
          </p>
          <p>
            Instead of crowding the experience, we focus on warmth, clarity, and
            smoother flow so customers can move from curiosity to checkout with less friction.
          </p>
        </article>

        <article className="info-card about-story-simple-card about-story-simple-card--highlight">
          <p className="eyebrow">What makes us different</p>
          <h2>A more web-app feel from menu to receipt.</h2>
          <ul className="about-check-list">
            <li>Fresh bowls and milk tea that still feel easy to browse</li>
            <li>Cleaner checkout, notifications, and PDF receipt flow</li>
            <li>Responsive design that stays usable on desktop and mobile</li>
          </ul>
        </article>
      </section>

      <section className="about-showcase-simple-grid">
        <article className="about-showcase-simple-card">
          <img src={proteinPowerSaladImage} alt="Protein Power Salad" />
          <div>
            <p className="eyebrow">Crafted menu</p>
            <h3>Fresh bowls that still feel satisfying</h3>
            <p>
              Balanced picks for people who want color, crunch, and a cleaner meal flow.
            </p>
          </div>
        </article>

        <article className="about-showcase-simple-card about-showcase-simple-card--text">
          <div>
            <p className="eyebrow">Bell Fresh promise</p>
            <h3>Freshness should feel easy, not complicated.</h3>
            <p>
              That idea shapes the menu, the drink customization flow, and the layout of the website itself.
            </p>
          </div>
          <div className="about-mini-stats">
            <div>
              <strong>Daily picks</strong>
              <span>Fresh salads and lighter favorites designed for repeat ordering.</span>
            </div>
            <div>
              <strong>Digital flow</strong>
              <span>Notifications, receipts, and smoother interactions across the app.</span>
            </div>
          </div>
        </article>

        <article className="about-showcase-simple-card">
          <img src={avocadoGreenBowlImage} alt="Avocado Green Bowl" />
          <div>
            <p className="eyebrow">Visual direction</p>
            <h3>Warm, bright, and intentionally clean</h3>
            <p>
              The interface is meant to feel modern and premium without losing simplicity.
            </p>
          </div>
        </article>
      </section>

      <section className="about-values-simple-grid">
        {aboutValues.map((value, index) => (
          <article key={value} className="info-card about-value-simple-card">
            <span className="about-value-simple-card__number">0{index + 1}</span>
            <h3>{value}</h3>
            <p>{aboutValueDescriptions[value]}</p>
          </article>
        ))}
      </section>

      <article
        id="team"
        className="info-card info-card--team about-team-card about-team-card--simple"
      >
        <div className="about-team-card__header">
          <div>
            <p className="eyebrow">Meet the team</p>
            <h2>The people behind Bell Fresh</h2>
          </div>
          <p className="section-copy">
            A small team focused on freshness, nutrition, and a smoother web experience from menu to receipt.
          </p>
        </div>

        <div className="team-grid">
          {teamMembers.map((member) => (
            <div key={member.name} className="team-member about-team-member about-team-member--premium">
              <img src={member.image} alt={member.name} />
              <h3>{member.name}</h3>
              <p>{member.role}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
