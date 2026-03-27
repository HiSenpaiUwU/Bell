import { useEffect, useMemo, useState } from "react";
import { OrderFlowSteps } from "../components/order/OrderFlowSteps";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContextFixed";
import { useNotifications } from "../context/NotificationContext";
import { useRewards } from "../context/RewardsContext";
import { CheckoutDetails, PaymentMethod } from "../types";
import { formatCurrency, formatPaymentMethod } from "../utils/format";
import { navigateTo } from "../utils/navigation";

export function CheckoutPage() {
  const { currentUser, saveCheckoutDefaults } = useAuth();
  const { cartItems, confirmOrder } = useCart();
  const { notify } = useNotifications();
  const { appliedCoupon, getDiscountedBreakdowns } = useRewards();
  const customerName = useMemo(
    () => [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ").trim(),
    [currentUser?.firstName, currentUser?.lastName],
  );
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutDetails>(() => ({
      fullName: currentUser?.savedCheckoutDetails?.fullName || customerName,
      address: currentUser?.savedCheckoutDetails?.address ?? "",
    }));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const breakdowns = getDiscountedBreakdowns(cartItems);

  useEffect(() => {
    if (!checkoutDetails.fullName.trim() && customerName) {
      setCheckoutDetails((currentDetails) => ({
        ...currentDetails,
        fullName: customerName,
      }));
    }
  }, [checkoutDetails.fullName, customerName]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setCheckoutDetails((currentDetails) => ({
      fullName:
        currentDetails.fullName.trim() ||
        currentUser.savedCheckoutDetails?.fullName ||
        customerName,
      address: currentDetails.address.trim() || currentUser.savedCheckoutDetails?.address || "",
    }));
  }, [currentUser, customerName]);

  const handleDetailChange = (field: keyof CheckoutDetails, value: string) => {
    setCheckoutDetails((currentDetails) => ({
      ...currentDetails,
      [field]: value,
    }));
  };

  const handlePlaceOrder = () => {
    if (cartItems.length === 0) {
      notify({
        title: "Cart is empty",
        message: "Add something from the menu before placing an order.",
        tone: "warning",
      });
      return;
    }

    if (!checkoutDetails.fullName.trim() || !checkoutDetails.address.trim()) {
      notify({
        title: "Checkout incomplete",
        message: "Please add your name and delivery address before placing the order.",
        tone: "warning",
      });
      return;
    }

    confirmOrder(paymentMethod, {
      fullName: checkoutDetails.fullName.trim(),
      address: checkoutDetails.address.trim(),
    });
    saveCheckoutDefaults({
      fullName: checkoutDetails.fullName.trim(),
      address: checkoutDetails.address.trim(),
    });
    setCheckoutDetails({
      fullName: checkoutDetails.fullName.trim(),
      address: checkoutDetails.address.trim(),
    });
    setPaymentMethod("cash");
    navigateTo("/receipt");
  };

  if (cartItems.length === 0) {
    return (
      <section className="shell checkout-page section-stack">
        <OrderFlowSteps currentStep="checkout" />

        <div className="empty-state">
          <h1>Your cart is empty.</h1>
          <p>Add a few salads, snacks, or milk tea favorites before opening checkout.</p>
          <button type="button" className="cta-link" onClick={() => navigateTo("/menu")}>
            Browse Menu
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="shell checkout-page section-stack">
      <OrderFlowSteps currentStep="checkout" />

      <div className="section-heading section-heading--stacked">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1>Finish your order like a real food app</h1>
          <p className="section-copy">
            Add your delivery details, choose Cash or GCash, and review the final
            summary before placing the order.
          </p>
        </div>
      </div>

      <div className="checkout-page__grid">
        <section className="summary-card checkout-form-card">
          <h2>Delivery details</h2>

          <label>
            <span>Name</span>
            <input
              type="text"
              value={checkoutDetails.fullName}
              onChange={(event) => handleDetailChange("fullName", event.target.value)}
              placeholder="Your full name"
            />
          </label>

          <label>
            <span>Address</span>
            <textarea
              value={checkoutDetails.address}
              onChange={(event) => handleDetailChange("address", event.target.value)}
              placeholder="Street, barangay, city, and delivery notes"
            />
          </label>

          {currentUser?.savedCheckoutDetails?.address ? (
            <p className="summary-note">
              Saved delivery details stay here for your next order, and you can still edit them anytime.
            </p>
          ) : null}

          <div className="checkout-payment-stack">
            <span>Payment</span>
            <div className="payment-toggle-row">
              {(["cash", "gcash"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`payment-toggle${paymentMethod === method ? " is-active" : ""}`}
                  onClick={() => setPaymentMethod(method)}
                >
                  {method === "cash" ? "💵 Cash" : "📱 GCash"}
                </button>
              ))}
            </div>
            <p className="summary-note">
              Selected payment: <strong>{formatPaymentMethod(paymentMethod)}</strong>
            </p>
          </div>

          <div className="checkout-form-card__actions">
            <button type="button" className="ghost-button" onClick={() => navigateTo("/cart")}>
              Back to Cart
            </button>
            <button type="button" className="cta-link" onClick={handlePlaceOrder}>
              Place Order
            </button>
          </div>
        </section>

        <section className="summary-card">
          <h2>Order summary</h2>

          <div className="order-summary-list">
            {cartItems.map((item) => (
              <article key={item.id} className="order-summary-item">
                <div>
                  <strong>
                    {item.name} x{item.quantity}
                  </strong>
                  <p>{item.notes ?? "No special notes."}</p>
                </div>
                <strong>{formatCurrency(item.unitPrice * item.quantity, item.currency)}</strong>
              </article>
            ))}
          </div>

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
        </section>
      </div>
    </section>
  );
}
