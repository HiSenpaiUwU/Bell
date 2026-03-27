import { useMemo, useState } from "react";
import { CouponWallet } from "../components/customer/CouponWallet";
import { FreshReadsSection } from "../components/customer/FreshReadsSection";
import { MiniGameCard } from "../components/customer/MiniGameCard";
import { MenuCard } from "../components/menu/MenuCard";
import { MilkTeaModal } from "../components/menu/MilkTeaModal";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContextFixed";
import { useNotifications } from "../context/NotificationContext";
import { usePersonalization } from "../context/PersonalizationContext";
import { useRewards } from "../context/RewardsContext";
import { bestSellerProducts, milkTeaProducts, saladProducts, snackProducts } from "../data/menuData";
import { useDelayedReveal } from "../hooks/useDelayedReveal";
import { MilkTeaCustomization, Product } from "../types";
import {
  getRecommendedProducts,
  getSuggestedDrinkForFood,
  getUsualOrderProducts,
} from "../utils/recommendations";
import { navigateTo } from "../utils/navigation";

type MenuFilter = "all" | "salads" | "milk-tea" | "snacks" | "vegan" | "popular";

export function MenuPage() {
  const { currentUser, isAdmin, isLoggedIn } = useAuth();
  const { addCustomizedMilkTea, addProduct, cartItems, orderHistory } = useCart();
  const { notify } = useNotifications();
  const { recentlyViewedProductIds, recentlyViewedProducts, trackProductView } =
    usePersonalization();
  const { activeCoupons, appliedCoupon, usedCoupons } = useRewards();
  const [selectedMilkTea, setSelectedMilkTea] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<MenuFilter>("all");
  const isReady = useDelayedReveal(620);

  const allProducts = useMemo(() => [...saladProducts, ...milkTeaProducts, ...snackProducts], []);
  const usualOrderProducts = useMemo(
    () => getUsualOrderProducts(orderHistory, currentUser?.id, 2),
    [currentUser?.id, orderHistory],
  );
  const personalizedRecommendations = useMemo(
    () =>
      getRecommendedProducts({
        cartItems,
        orderHistory,
        recentlyViewedProductIds,
        userId: currentUser?.id,
        limit: 4,
      }),
    [cartItems, currentUser?.id, orderHistory, recentlyViewedProductIds],
  );
  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return allProducts.filter((product) => {
      const categorySearchTerms =
        product.category === "snack"
          ? "light snack light snacks snack snacks bites sides fruit"
          : product.category === "salad"
            ? "healthy salad salads bowl bowls fresh greens"
            : "milk tea milk-tea tea drink drinks customizable boba";

      const searchableParts = [
        product.name,
        product.description,
        product.reviewSnippet,
        product.category,
        categorySearchTerms,
        ...(product.nutritionTags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchableParts.includes(normalizedSearch);
      const matchesFilter = (() => {
        switch (activeFilter) {
          case "salads":
            return product.category === "salad";
          case "milk-tea":
            return product.category === "milk-tea";
          case "snacks":
            return product.category === "snack";
          case "vegan":
            return Boolean(product.isVegan);
          case "popular":
            return Boolean(product.isPopular || product.isBestSeller);
          default:
            return true;
        }
      })();

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, allProducts, searchTerm]);

  const rewardsTitle =
    isLoggedIn && currentUser && !isAdmin
      ? `${currentUser.firstName}'s rewards and coupons`
      : "Rewards waiting in your wallet";

  const rewardsDescription =
    isLoggedIn && currentUser && !isAdmin
      ? "Your active Bell Fresh coupons stay here while you browse, then you can use them in the cart."
      : "Customer coupons, small game rewards, and discounts show up here once you sign in with a customer account.";

  const rewardsEmptyMessage =
    isLoggedIn && !isAdmin
      ? "Play the mini game or let the admin send you a reward to start filling this wallet."
      : "Login as a customer to unlock coupons, play the quick quiz, and keep rewards tied to your account.";

  const filterButtons: Array<{ key: MenuFilter; label: string }> = [
    { key: "all", label: "\u2728 All" },
    { key: "salads", label: "\uD83E\uDD57 Salads" },
    { key: "snacks", label: "\uD83E\uDD68 Light Snacks" },
    { key: "milk-tea", label: "\uD83E\uDD64 Milk Tea" },
    { key: "vegan", label: "\uD83C\uDF31 Vegan" },
    { key: "popular", label: "\uD83D\uDD25 Popular" },
  ];

  const handleAddSalad = (product: Product) => {
    trackProductView(product.id);
    addProduct(product);

    const suggestedDrink = getSuggestedDrinkForFood(product);

    if (suggestedDrink) {
      notify({
        title: "You might also like",
        message: `Pair ${product.name} with ${suggestedDrink.name}.`,
        tone: "info",
      });
    }
  };

  const handleAddMilkTea = (customization: MilkTeaCustomization) => {
    if (!selectedMilkTea) {
      return;
    }

    trackProductView(selectedMilkTea.id);
    addCustomizedMilkTea(selectedMilkTea, customization);

    const suggestedSalad =
      personalizedRecommendations.find((product) => product.category === "salad") ??
      usualOrderProducts.find((product) => product.category === "salad") ??
      saladProducts[0];

    if (suggestedSalad) {
      notify({
        title: "Complete the order",
        message: `${selectedMilkTea.name} goes well with ${suggestedSalad.name}.`,
        tone: "info",
      });
    }
  };

  const handleProductAction = (product: Product) => {
    if (product.category === "milk-tea") {
      trackProductView(product.id);
      setSelectedMilkTea(product);
      return;
    }

    handleAddSalad(product);
  };

  return (
    <section className="shell menu-page section-stack page-reveal">
      <div className="section-heading section-heading--stacked">
        <div>
          <p className="eyebrow">Bell Fresh menu</p>
          <h1>Fresh salads, light snacks, and milk tea made just the way you like it</h1>
          <p className="section-copy">
            Browse the full menu, use quick filters, and search for the bowls,
            snacks, and drinks you are craving.
          </p>
        </div>
      </div>

      <div className="menu-section">
        <div className="section-heading section-heading--stacked">
          <div>
            <p className="eyebrow">Search + filters</p>
            <h2>Find the right order faster</h2>
            <p className="section-copy">
              Search by item name or browse with quick filter buttons to jump
              between salads, light snacks, and milk tea faster.
            </p>
          </div>
        </div>

        <div className="menu-toolbar">
          <label className="menu-search">
            <span>Search the menu</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search salads, light snacks, milk tea, flavors, or tags"
            />
          </label>

          <div className="menu-filter-row" aria-label="Menu filters">
            {filterButtons.map((filterButton) => (
              <button
                key={filterButton.key}
                type="button"
                className={`filter-chip${activeFilter === filterButton.key ? " is-active" : ""}`}
                onClick={() => setActiveFilter(filterButton.key)}
              >
                {filterButton.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="menu-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Browse results</p>
            <h2>
              {filteredProducts.length} menu item{filteredProducts.length === 1 ? "" : "s"} ready
              to order
            </h2>
          </div>
          <span className="experience-count">
            {activeFilter === "all"
              ? "Everything"
              : filterButtons.find((button) => button.key === activeFilter)?.label}
          </span>
        </div>

        {isReady ? (
          filteredProducts.length > 0 ? (
            <div className="menu-grid">
              {filteredProducts.map((product) => (
                <MenuCard
                  key={product.id}
                  product={product}
                  actionLabel={product.category === "milk-tea" ? "Customize" : "Add to Cart"}
                  onAction={() => handleProductAction(product)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state menu-empty-state">
              <h2>No items match that search yet.</h2>
              <p>Try a different keyword or switch back to the full menu.</p>
              <button
                type="button"
                className="cta-link"
                onClick={() => {
                  setSearchTerm("");
                  setActiveFilter("all");
                }}
              >
                Reset Filters
              </button>
            </div>
          )
        ) : (
          <div className="menu-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <article key={`browse-skeleton-${index}`} className="skeleton-card" />
            ))}
          </div>
        )}
      </div>

      {isLoggedIn && currentUser && !isAdmin ? (
        <section className="menu-section">
          <div className="section-heading section-heading--stacked">
            <div>
              <p className="eyebrow">Personalized for you</p>
              <h2>{`Welcome back, ${currentUser.firstName} \uD83D\uDC4B`}</h2>
              <p className="section-copy">
                Your usual order, recent views, and fresh picks help you get back
                to your favorites faster.
              </p>
            </div>
          </div>

          <div className="profile-summary-grid">
            <article className="summary-card profile-summary-card">
              <p className="eyebrow">Usual order</p>
              <h3>{usualOrderProducts[0]?.name ?? "Still learning"}</h3>
              <p>
                {usualOrderProducts.length > 0
                  ? "Built from your previous order history."
                  : "Order a few times and Bell Fresh will remember your go-to picks."}
              </p>
            </article>
            <article className="summary-card profile-summary-card">
              <p className="eyebrow">Recently viewed</p>
              <h3>{recentlyViewedProducts.length}</h3>
              <p>Your last browsed items stay ready for a quick return.</p>
            </article>
            <article className="summary-card profile-summary-card">
              <p className="eyebrow">Suggested next</p>
              <h3>{personalizedRecommendations[0]?.name ?? "Fresh picks ready"}</h3>
              <p>Recommendations balance what you viewed, ordered, and added to the cart.</p>
            </article>
          </div>

          <button type="button" className="ghost-link" onClick={() => navigateTo("/profile")}>
            Open full profile
          </button>
        </section>
      ) : null}

      {personalizedRecommendations.length > 0 ? (
        <section className="menu-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Picked for you</p>
              <h2>You might also like these next</h2>
            </div>
            <span className="experience-count">Fresh picks</span>
          </div>

          {isReady ? (
            <div className="menu-grid">
              {personalizedRecommendations.map((product) => (
                <MenuCard
                  key={`recommended-${product.id}`}
                  product={product}
                  actionLabel={product.category === "milk-tea" ? "Customize" : "Add to Cart"}
                  onAction={() => handleProductAction(product)}
                />
              ))}
            </div>
          ) : (
            <div className="menu-grid">
              {Array.from({ length: 4 }, (_, index) => (
                <article key={`menu-skeleton-${index}`} className="skeleton-card" />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className="menu-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Featured / Best Seller</p>
            <h2>Top picks customers grab first</h2>
            <p className="section-copy">
              Start with the crowd favorites before exploring the rest of the menu.
            </p>
          </div>
        </div>

        {isReady ? (
          <div className="menu-featured-grid">
            {bestSellerProducts.map((product) => (
              <article key={product.id} className="featured-menu-card">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="featured-menu-card__image"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="featured-menu-card__image featured-menu-card__image--placeholder">
                    {product.name}
                  </div>
                )}

                <div className="featured-menu-card__body">
                  <span className="featured-menu-card__badge">
                    {product.category === "milk-tea"
                      ? "\uD83E\uDD64 Best Seller"
                      : "\uD83D\uDD25 Crowd Favorite"}
                  </span>
                  <div className="featured-menu-card__copy">
                    <h3>{product.name}</h3>
                    <p>{product.reviewSnippet ?? product.description}</p>
                  </div>

                  <div className="featured-menu-card__footer">
                    <div>
                      <strong>{product.rating?.toFixed(1) ?? "4.8"} \u2605</strong>
                      <p>{`${product.liveOrdersLastHour ?? 3} orders in the last hour`}</p>
                    </div>
                    <button
                      type="button"
                      className="card-action"
                      onClick={() => handleProductAction(product)}
                    >
                      {product.category === "milk-tea" ? "Customize" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="menu-featured-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <article
                key={`featured-skeleton-${index}`}
                className="skeleton-card skeleton-card--feature"
              />
            ))}
          </div>
        )}
      </div>

      <div className="menu-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Light Snacks</p>
            <h2>Quick bites to pair with salads and drinks</h2>
            <p className="section-copy">
              Add a lighter side with crispy, sweet, and fresh snack options.
            </p>
          </div>
          <span className="experience-count">{`${snackProducts.length} snack picks`}</span>
        </div>

        <div className="menu-grid">
          {snackProducts.map((product) => (
            <MenuCard
              key={product.id}
              product={product}
              actionLabel="Add to Cart"
              onAction={() => handleProductAction(product)}
            />
          ))}
        </div>
      </div>

      {recentlyViewedProducts.length > 0 ? (
        <div className="menu-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recently viewed</p>
              <h2>Jump back into what you checked last</h2>
            </div>
            <span className="experience-count">Quick return</span>
          </div>

          <div className="menu-grid">
            {recentlyViewedProducts.slice(0, 4).map((product) => (
              <MenuCard
                key={`recent-view-${product.id}`}
                product={product}
                actionLabel={product.category === "milk-tea" ? "Customize" : "Add to Cart"}
                onAction={() => handleProductAction(product)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="menu-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Menu highlights</p>
            <h2>Fresh bowls and milk tea customization still stay front and center</h2>
          </div>
        </div>

        <div className="menu-discovery-grid">
          <article className="summary-card">
            <h3>{`\uD83E\uDD57 Fresh salads`}</h3>
            <p className="section-copy">
              Crisp bowls, protein-packed options, healthy badges, and vegan-friendly picks
              for lighter meals.
            </p>
          </article>
          <article className="summary-card">
            <h3>{`\uD83E\uDD64 Milk tea specials`}</h3>
            <p className="section-copy">
              Customize size, sugar level, add-ons, and notes before adding drinks to the cart.
            </p>
          </article>
        </div>
      </div>

      <div className="menu-section menu-section--extras">
        <div className="section-heading section-heading--stacked">
          <div>
            <p className="eyebrow">Extras</p>
            <h2>Rewards, quick game, and small things to explore</h2>
            <p className="section-copy">
              These stay lower on the page now, so the menu comes first and the extra
              customer features still feel nice without getting in the way.
            </p>
          </div>
        </div>

        <section className="menu-experience-grid">
          <CouponWallet
            title={rewardsTitle}
            description={rewardsDescription}
            activeCoupons={activeCoupons}
            usedCoupons={usedCoupons}
            appliedCouponId={appliedCoupon?.inventoryId ?? null}
            emptyMessage={rewardsEmptyMessage}
          />
          <MiniGameCard />
        </section>

        <FreshReadsSection />
      </div>

      <MilkTeaModal
        product={selectedMilkTea}
        isOpen={Boolean(selectedMilkTea)}
        onClose={() => setSelectedMilkTea(null)}
        onAdd={handleAddMilkTea}
      />
    </section>
  );
}
