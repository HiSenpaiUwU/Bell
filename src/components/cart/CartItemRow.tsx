import { CartItem } from "../../types";
import { formatCurrency } from "../../utils/format";

interface CartItemRowProps {
  item: CartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}

export function CartItemRow({
  item,
  onDecrease,
  onIncrease,
  onRemove,
}: CartItemRowProps) {
  return (
    <article className="cart-row">
      <div className="cart-row__product">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="cart-row__image"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="cart-row__image cart-row__image--placeholder">BF</div>
        )}

        <div>
          <h3>{item.name}</h3>
          {item.notes ? <p className="cart-row__notes">{item.notes}</p> : null}
          <p className="cart-row__price">
            {formatCurrency(item.unitPrice, item.currency)} each
          </p>
        </div>
      </div>

      <div className="cart-row__actions">
        <div className="qty-control">
          <button type="button" onClick={onDecrease}>
            -
          </button>
          <strong>{item.quantity}</strong>
          <button type="button" onClick={onIncrease}>
            +
          </button>
        </div>

        <strong className="cart-row__total">
          {formatCurrency(item.unitPrice * item.quantity, item.currency)}
        </strong>

        <button type="button" className="remove-link" onClick={onRemove}>
          Remove
        </button>
      </div>
    </article>
  );
}
