import { useEffect, useState } from "react";
import { milkTeaExtras } from "../../data/menuData";
import {
  MilkTeaCustomization,
  MilkTeaExtra,
  MilkTeaSize,
  Product,
  SugarLevel,
} from "../../types";
import { formatCurrency } from "../../utils/format";
import { buildMilkTeaPrice } from "../../utils/orders";

interface MilkTeaModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (customization: MilkTeaCustomization) => void;
}

const sugarLevels: SugarLevel[] = ["0%", "25%", "50%", "100%"];

export function MilkTeaModal({
  product,
  isOpen,
  onClose,
  onAdd,
}: MilkTeaModalProps) {
  const [size, setSize] = useState<MilkTeaSize>("Medium");
  const [sugarLevel, setSugarLevel] = useState<SugarLevel>("50%");
  const [selectedExtraNames, setSelectedExtraNames] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    if (!product || !isOpen) {
      return;
    }

    setSize("Medium");
    setSugarLevel("50%");
    setSelectedExtraNames([]);
    setInstructions("");
  }, [product, isOpen]);

  if (!product || !isOpen) {
    return null;
  }

  const selectedExtras: MilkTeaExtra[] = milkTeaExtras.filter((extra) =>
    selectedExtraNames.includes(extra.name),
  );

  const customization: MilkTeaCustomization = {
    size,
    sugarLevel,
    extras: selectedExtras,
    instructions,
  };

  const finalPrice = buildMilkTeaPrice(product.price, customization);

  const toggleExtra = (extraName: string) => {
    setSelectedExtraNames((currentExtras) => {
      if (currentExtras.includes(extraName)) {
        return currentExtras.filter((name) => name !== extraName);
      }

      return [...currentExtras, extraName];
    });
  };

  const handleSubmit = () => {
    onAdd(customization);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-card__header">
          <div>
            <p className="eyebrow">Customize your drink</p>
            <h2>{product.name}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            x
          </button>
        </div>

        <div className="modal-grid">
          <label>
            <span>Size</span>
            <select
              value={size}
              onChange={(event) => setSize(event.target.value as MilkTeaSize)}
            >
              <option value="Medium">Medium</option>
              <option value="Large">Large (+PHP 13)</option>
            </select>
          </label>

          <label>
            <span>Sugar level</span>
            <select
              value={sugarLevel}
              onChange={(event) => setSugarLevel(event.target.value as SugarLevel)}
            >
              {sugarLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="extras-panel">
          <p>Extras</p>
          <div className="extras-grid">
            {milkTeaExtras.map((extra) => (
              <label key={extra.name} className="check-chip">
                <input
                  type="checkbox"
                  checked={selectedExtraNames.includes(extra.name)}
                  onChange={() => toggleExtra(extra.name)}
                />
                <span>
                  {extra.name} (+{formatCurrency(extra.price, "PHP")})
                </span>
              </label>
            ))}
          </div>
        </div>

        <label className="modal-textarea">
          <span>Special instructions</span>
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Extra cold, less ice, or no topping changes"
            rows={4}
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="cta-link modal-submit" onClick={handleSubmit}>
            Add to Cart - {formatCurrency(finalPrice, product.currency)}
          </button>
        </div>
      </div>
    </div>
  );
}
