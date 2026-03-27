import { Product } from "../../types";
import { formatCurrency } from "../../utils/format";
import { navigateTo } from "../../utils/navigation";

interface FeaturedCardProps {
  product: Product;
}

export function FeaturedCard({ product }: FeaturedCardProps) {
  return (
    <button type="button" className="feature-card" onClick={() => navigateTo("/menu")}>
      <img
        src={product.image}
        alt={product.name}
        className="feature-card__image"
        loading="lazy"
        decoding="async"
      />
      <div className="feature-card__body">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        {product.liveOrdersLastHour ? (
          <p className="feature-card__live">
            {`\uD83D\uDD25 ${product.liveOrdersLastHour} people ordered this in the last hour`}
          </p>
        ) : null}
        <div className="feature-card__meta">
          <span>
            {product.calories} calories - {product.serves} persons
          </span>
          <strong>{formatCurrency(product.price, product.currency)}</strong>
        </div>
      </div>
    </button>
  );
}
