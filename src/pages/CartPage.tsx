import { CartItemRow } from "../components/cart/CartItemRow";
import { CouponWallet } from "../components/customer/CouponWallet";
import { OrderFlowSteps } from "../components/order/OrderFlowSteps";
import { useCart } from "../context/CartContextFixed";
import { useNotifications } from "../context/NotificationContext";
import { useRewards } from "../context/RewardsContext";
import { formatCurrency } from "../utils/format";
import { navigateTo } from "../utils/navigation";

export function CartPage() {
  const { cartItems, removeItem, updateQuantity } = useCart();
  const { notify } = useNotifications();
  const {
    activeCoupons,
    applyCoupon,
    appliedCoupon,
    clearAppliedCoupon,
    getDiscountedBreakdowns,
    usedCoupons,
  } = useRewards();
  const breakdowns = getDiscountedBreakdowns(cartItems);

  const handleApplyCoupon = (couponId: string) => {
    const result = applyCoupon(couponId, cartItems);

    notify({
      title: result.success ? "Coupon ready" : "Coupon update",
      message: result.message,
      tone: result.success ? "success" : "warning",
    });
  };

  const handleRemoveCoupon = () => {
    clearAppliedCoupon();
    notify({
      title: "Coupon removed",
      message: "Your cart is back to regular pricing.",
      tone: "info",
    });
  };

  const handleContinueToCheckout = () => {
    if (cartItems.length === 0) {
      notify({
        title: "Cart is empty",
        message: "Add something from the menu before checkout.",
        tone: "warning",
      });
      return;
    }

    navigateTo("/checkout");
  };

  return (
    <section className="shell cart-page section-stack">
      <OrderFlowSteps currentStep="cart" />

      <div className="section-heading section-heading--stacked">
        <div>
          <p className="eyebrow">Cart</p>
          <h1>Review your order before checkout</h1>
          <p className="section-copy">
            Update quantities, apply rewards, and move into a dedicated checkout step
            when you are ready to place the order.
          </p>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <>
          <div className="empty-state">
            <h2>Your cart is empty.</h2>
            <p>Add salads, snacks, or milk tea from the menu to start an order.</p>
            <button type="button" className="cta-link" onClick={() => navigateTo("/menu")}>
              Go to Menu
            </button>
          </div>

          <section className="cart-extras-section section-stack">
            <div className="section-heading section-heading--stacked">
              <div>
                <p className="eyebrow">Rewards</p>
                <h2>Your coupons are still ready when you need them</h2>
              </div>
            </div>

            <section className="cart-rewards-grid">
              <CouponWallet
                title="Use a coupon on your next order"
                description="Your Bell Fresh wallet stays here, but it no longer blocks the main cart view before customers can see their items."
                activeCoupons={activeCoupons}
                usedCoupons={usedCoupons}
                appliedCouponId={appliedCoupon?.inventoryId ?? null}
                onApply={handleApplyCoupon}
                onClearApplied={handleRemoveCoupon}
                emptyMessage="No active coupons yet. Try the menu mini game or let the admin send a reward to your account."
              />

              <section className="experience-card cart-side-note">
                <div className="experience-card__header">
                  <div>
                    <p className="eyebrow">Cart extras</p>
                    <h2>Small details that make it feel nicer</h2>
                  </div>
                  <span className="experience-count">Web app feel</span>
                </div>

                <div className="cart-side-note__list">
                  <article>
                    <strong>Coupon-aware checkout</strong>
                    <p>Your discount updates inside the same order summary you are already reading.</p>
                  </article>
                  <article>
                    <strong>Saved account orders</strong>
                    <p>Your receipt and order history stay linked to your customer profile.</p>
                  </article>
                  <article>
                    <strong>Smoother support</strong>
                    <p>The admin can review account requests and BellBot can answer quick site questions.</p>
                  </article>
                </div>
              </section>
            </section>
          </section>
        </>
      ) : (
        <>
          <div className="cart-list">
            {cartItems.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onDecrease={() => updateQuantity(item.id, item.quantity - 1)}
                onIncrease={() => updateQuantity(item.id, item.quantity + 1)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>

          <div className="checkout-summary-grid">
            <section className="summary-card">
              <h2>Order summary</h2>
              <div className="summary-stack">
                {breakdowns.map((breakdown) => (
                  <div key={breakdown.currency} className="summary-block">
                    <p className="summary-block__title">{breakdown.currency} totals</p>
                    <p>Subtotal: {formatCurrency(breakdown.subtotal, breakdown.currency)}</p>
                    <p>Tax (5%): {formatCurrency(breakdown.tax, breakdown.currency)}</p>
                    {breakdown.discount > 0 ? (
                      <p>Discount: -{formatCurrency(breakdown.discount, breakdown.currency)}</p>
                    ) : null}
                    <strong>Total: {formatCurrency(breakdown.total, breakdown.currency)}</strong>
                  </div>
                ))}
              </div>

              {appliedCoupon ? (
                <p className="summary-note">
                  Active coupon: <strong>{appliedCoupon.code}</strong> - {appliedCoupon.title}
                </p>
              ) : null}

              {breakdowns.length > 1 ? (
                <p className="summary-note">
                  This order contains both USD and PHP prices because the original website mixed currencies between salads and milk tea.
                </p>
              ) : null}

              <button
                type="button"
                className="cta-link summary-action"
                onClick={handleContinueToCheckout}
              >
                Continue to Checkout
              </button>
            </section>

            <section className="summary-card cart-next-step-card">
              <h2>Next step</h2>
              <p className="section-copy">
                Checkout now asks for your name, address, and payment method so the
                flow feels closer to a real food delivery app.
              </p>
              <div className="cart-next-step-card__list">
                <p>• Add delivery name and address</p>
                <p>• Choose Cash or GCash</p>
                <p>• Review totals one last time</p>
                <p>• Place order and open confirmation</p>
              </div>
            </section>
          </div>

          <section className="cart-extras-section section-stack">
            <div className="section-heading section-heading--stacked">
              <div>
                <p className="eyebrow">Rewards</p>
                <h2>Coupons and extra details for this order</h2>
                <p className="section-copy">
                  These are still available, but now they stay below your main cart content so the shopping flow feels smoother.
                </p>
              </div>
            </div>

            <section className="cart-rewards-grid">
              <CouponWallet
                title="Use a coupon on this order"
                description="Your Bell Fresh wallet stays visible here so discounts feel part of the real shopping flow, not hidden away."
                activeCoupons={activeCoupons}
                usedCoupons={usedCoupons}
                appliedCouponId={appliedCoupon?.inventoryId ?? null}
                onApply={handleApplyCoupon}
                onClearApplied={handleRemoveCoupon}
                emptyMessage="No active coupons yet. Try the menu mini game or let the admin send a reward to your account."
              />

              <section className="experience-card cart-side-note">
                <div className="experience-card__header">
                  <div>
                    <p className="eyebrow">Cart extras</p>
                    <h2>Small details that make it feel nicer</h2>
                  </div>
                  <span className="experience-count">Web app feel</span>
                </div>

                <div className="cart-side-note__list">
                  <article>
                    <strong>Coupon-aware checkout</strong>
                    <p>Your discount updates inside the same order summary you are already reading.</p>
                  </article>
                  <article>
                    <strong>Saved account orders</strong>
                    <p>Your receipt and order history stay linked to your customer profile.</p>
                  </article>
                  <article>
                    <strong>Smoother support</strong>
                    <p>The admin can review account requests and BellBot can answer quick site questions.</p>
                  </article>
                </div>
              </section>
            </section>
          </section>
        </>
      )}
    </section>
  );
}
