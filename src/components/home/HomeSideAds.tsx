import { navigateTo } from "../../utils/navigation";

const sideAds = [
  {
    id: "left-premium",
    railClassName: "home-side-ads__card home-side-ads__card--left",
    eyebrow: "Bell Fresh Drop",
    badge: "Today only",
    title: "Sunrise bowl and milk tea glow-up",
    copy:
      "Bright greens, chewy pearls, and a cleaner lunch combo that still feels like a treat.",
    actionLabel: "Open the menu",
    destination: "/menu",
  },
  {
    id: "right-funny",
    railClassName: "home-side-ads__card home-side-ads__card--right",
    eyebrow: "Definitely an Ad",
    badge: "Funny one",
    title: "Your milk tea asked for a salad sidekick.",
    copy:
      "Our legal team says drinks cannot talk. Our menu says they still pair suspiciously well.",
    actionLabel: "See the duo",
    destination: "/menu",
  },
];

export function HomeSideAds() {
  return (
    <div className="home-side-ads" aria-label="Bell Fresh promotions">
      {sideAds.map((ad) => (
        <aside key={ad.id} className={ad.railClassName}>
          <div className="home-side-ads__topline">
            <p className="eyebrow">{ad.eyebrow}</p>
            <span className="home-side-ads__badge">{ad.badge}</span>
          </div>
          <h3>{ad.title}</h3>
          <p>{ad.copy}</p>
          <button
            type="button"
            className="home-side-ads__action"
            onClick={() => navigateTo(ad.destination)}
          >
            {ad.actionLabel}
          </button>
        </aside>
      ))}
    </div>
  );
}
