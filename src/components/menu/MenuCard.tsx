import { Product } from "../../types";
import { formatCurrency } from "../../utils/format";

interface MenuCardProps {
  product: Product;
  actionLabel: string;
  onAction: () => void;
}

const STAR_ICON = String.fromCharCode(9733);

function getFilledStarCount(rating: number) {
  if (rating >= 4.8) {
    return 5;
  }

  if (rating >= 3.8) {
    return 4;
  }

  if (rating >= 2.8) {
    return 3;
  }

  if (rating >= 1.8) {
    return 2;
  }

  return 1;
}

function renderStars(rating: number) {
  const filledStars = getFilledStarCount(rating);
  return Array.from({ length: 5 }, (_, index) => index < filledStars);
}

export function MenuCard({ product, actionLabel, onAction }: MenuCardProps) {
  const rating = product.rating ?? 4.8;
  const reviewCount = product.reviewCount ?? 120;
  const reviewSnippet =
    product.reviewSnippet ?? "Fresh favorite from Bell Fresh customers.";
  const productTags = product.nutritionTags?.slice(0, 3) ?? [];

  return (
    <article className="menu-card">
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          className="menu-card__image"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="menu-card__placeholder">
          <span>{product.name}</span>
          <small>Image missing in the original ZIP</small>
        </div>
      )}

      <div className="menu-card__body">
        <div className="menu-card__rating-row">
          <div className="menu-card__stars" aria-label={`${rating} out of 5 stars`}>
            {renderStars(rating).map((isFilled, index) => (
              <span
                key={`${product.id}-star-${index}`}
                className={isFilled ? "menu-card__star is-filled" : "menu-card__star"}
                aria-hidden="true"
              >
                {STAR_ICON}
              </span>
            ))}
          </div>
          <span className="menu-card__rating-text">
            {rating.toFixed(1)} ({reviewCount})
          </span>
        </div>

        <div className="menu-card__content">
          <div>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
          </div>
          {productTags.length > 0 ? (
            <div className="menu-card__tag-row">
              {productTags.map((tag) => (
                <span key={`${product.id}-${tag}`} className="menu-card__tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {product.liveOrdersLastHour ? (
            <p className="menu-card__live">
              {`\uD83D\uDD25 ${product.liveOrdersLastHour} people ordered this in the last hour`}
            </p>
          ) : null}
          <p className="menu-card__review">"{reviewSnippet}"</p>
        </div>

        <div className="menu-card__footer">
          <strong>{formatCurrency(product.price, product.currency)}</strong>
          <button type="button" className="card-action" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      </div>
    </article>
  );
}
