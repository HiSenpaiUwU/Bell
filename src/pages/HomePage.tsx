import { useMemo } from "react";
import { HomeSideAds } from "../components/home/HomeSideAds";
import { FeaturedCard } from "../components/home/FeaturedCard";
import { HeroSection } from "../components/home/HeroSection";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContextFixed";
import { usePersonalization } from "../context/PersonalizationContext";
import { featuredProducts } from "../data/menuData";
import { useDelayedReveal } from "../hooks/useDelayedReveal";
import { getRecommendedProducts, getUsualOrderProducts } from "../utils/recommendations";
import { navigateTo } from "../utils/navigation";

export function HomePage() {
  const { currentUser, isLoggedIn, isAdmin } = useAuth();
  const { cartItems, orderHistory } = useCart();
  const { recentlyViewedProductIds } = usePersonalization();
  const isReady = useDelayedReveal(460);
  const usualOrder = useMemo(
    () => getUsualOrderProducts(orderHistory, currentUser?.id, 2),
    [currentUser?.id, orderHistory],
  );
  const recommendedProducts = useMemo(
    () =>
      getRecommendedProducts({
        cartItems,
        orderHistory,
        recentlyViewedProductIds,
        userId: currentUser?.id,
        limit: 3,
      }),
    [cartItems, currentUser?.id, orderHistory, recentlyViewedProductIds],
  );

  return (
    <>
      <HomeSideAds />
      <HeroSection />

      {isLoggedIn && currentUser && !isAdmin ? (
        <section className="shell section-stack page-reveal">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Personalized for you</p>
              <h2>{`Welcome back, ${currentUser.firstName} \uD83D\uDC4B`}</h2>
            </div>
            <button type="button" className="ghost-link" onClick={() => navigateTo("/profile")}>
              Open profile
            </button>
          </div>

          <div className="profile-summary-grid">
            <article className="summary-card profile-summary-card">
              <p className="eyebrow">Your usual order</p>
              <h3>{usualOrder[0]?.name ?? "Still learning"}</h3>
              <p>
                {usualOrder.length > 0
                  ? "Built from your recent order history."
                  : "Place a couple of orders and Bell Fresh will remember your favorites."}
              </p>
            </article>
            <article className="summary-card profile-summary-card">
              <p className="eyebrow">Recently viewed</p>
              <h3>{recentlyViewedProductIds.length}</h3>
              <p>Products you opened lately stay ready for a quick return.</p>
            </article>
            <article className="summary-card profile-summary-card">
              <p className="eyebrow">Recommended for you</p>
              <h3>{recommendedProducts[0]?.name ?? "Fresh picks ready"}</h3>
              <p>Suggestions adjust based on your cart, views, and previous orders.</p>
            </article>
          </div>
        </section>
      ) : null}

      <section className="shell section-stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Featured menu</p>
            <h2>Fresh favorites from Bell Fresh</h2>
          </div>
          <button type="button" className="ghost-link" onClick={() => navigateTo("/menu")}>
            View full menu
          </button>
        </div>

        {isReady ? (
          <div className="feature-grid page-reveal">
            {featuredProducts.map((product) => (
              <FeaturedCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="feature-grid">
            {Array.from({ length: 3 }, (_, index) => (
              <article key={`feature-skeleton-${index}`} className="skeleton-card skeleton-card--feature" />
            ))}
          </div>
        )}
      </section>

      {recommendedProducts.length > 0 ? (
        <section className="shell section-stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Picked for you</p>
              <h2>Fresh matches for your next order</h2>
            </div>
            <button type="button" className="ghost-link" onClick={() => navigateTo("/menu")}>
              Browse menu
            </button>
          </div>

          <div className="feature-grid page-reveal">
            {recommendedProducts.map((product) => (
              <FeaturedCard key={`recommended-${product.id}`} product={product} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
