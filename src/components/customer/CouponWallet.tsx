import { CouponInventoryItem } from "../../types";

interface CouponWalletProps {
  title: string;
  description: string;
  activeCoupons: CouponInventoryItem[];
  usedCoupons?: CouponInventoryItem[];
  appliedCouponId?: string | null;
  onApply?: (couponId: string) => void;
  onClearApplied?: () => void;
  emptyMessage: string;
}

function formatCouponValue(coupon: CouponInventoryItem) {
  if (coupon.type === "percent") {
    return `${coupon.amount}% off`;
  }

  if (coupon.currency === "PHP") {
    return `PHP ${coupon.amount.toFixed(0)} off`;
  }

  if (coupon.currency === "USD") {
    return `$${coupon.amount.toFixed(2)} off`;
  }

  return `${coupon.amount} off`;
}

export function CouponWallet({
  title,
  description,
  activeCoupons,
  usedCoupons = [],
  appliedCouponId,
  onApply,
  onClearApplied,
  emptyMessage,
}: CouponWalletProps) {
  const hasActions = Boolean(onApply);

  return (
    <section className="experience-card rewards-wallet">
      <div className="experience-card__header">
        <div>
          <p className="eyebrow">Rewards wallet</p>
          <h2>{title}</h2>
        </div>
        <span className="experience-count">{activeCoupons.length} ready</span>
      </div>

      <p className="section-copy">{description}</p>

      {activeCoupons.length === 0 ? (
        <p className="summary-note">{emptyMessage}</p>
      ) : (
        <div className="coupon-list">
          {activeCoupons.map((coupon) => {
            const isApplied = coupon.inventoryId === appliedCouponId;

            return (
              <article
                key={coupon.inventoryId}
                className={`coupon-card${isApplied ? " is-applied" : ""}`}
              >
                <div className="coupon-card__header">
                  <div>
                    <span className="coupon-card__badge">{coupon.badge}</span>
                    <h3>{coupon.code}</h3>
                  </div>
                  <strong>{formatCouponValue(coupon)}</strong>
                </div>

                <p>{coupon.title}</p>
                <small>{coupon.description}</small>

                <div className="coupon-card__footer">
                  <span>From {coupon.source}</span>
                  {hasActions ? (
                    isApplied ? (
                      <button type="button" className="ghost-button" onClick={onClearApplied}>
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="cta-link cta-link--soft"
                        onClick={() => onApply?.(coupon.inventoryId)}
                      >
                        Use coupon
                      </button>
                    )
                  ) : isApplied ? (
                    <span className="coupon-card__status">Active on this order</span>
                  ) : (
                    <span className="coupon-card__status">Available</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {usedCoupons.length > 0 ? (
        <div className="coupon-history">
          <p className="eyebrow">Used recently</p>
          <div className="coupon-history__list">
            {usedCoupons.slice(0, 3).map((coupon) => (
              <span key={coupon.inventoryId} className="coupon-history__pill">
                {coupon.code}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
