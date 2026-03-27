import {
  AppliedCouponSnapshot,
  CartItem,
  CheckoutDetails,
  CurrencyBreakdown,
  CurrencyCode,
  MilkTeaCustomization,
  Order,
  OrderCustomerSnapshot,
  PaymentMethod,
  User,
} from "../types";

export const TAX_RATE = 0.05;
export const MILK_TEA_LARGE_UPCHARGE = 13;

export function buildMilkTeaNotes(customization: MilkTeaCustomization) {
  const parts = [`${customization.size} cup`, `${customization.sugarLevel} sugar`];

  if (customization.extras.length > 0) {
    parts.push(`Extras: ${customization.extras.map((extra) => extra.name).join(", ")}`);
  }

  if (customization.instructions.trim()) {
    parts.push(`Notes: ${customization.instructions.trim()}`);
  }

  return parts.join(" | ");
}

export function buildMilkTeaPrice(
  basePrice: number,
  customization: MilkTeaCustomization,
) {
  const extraTotal = customization.extras.reduce(
    (sum, extra) => sum + extra.price,
    0,
  );
  const sizeUpcharge = customization.size === "Large" ? MILK_TEA_LARGE_UPCHARGE : 0;

  return basePrice + sizeUpcharge + extraTotal;
}

export function buildCurrencyBreakdowns(items: CartItem[]): CurrencyBreakdown[] {
  const totals = new Map<CurrencyCode, number>();

  items.forEach((item) => {
    const current = totals.get(item.currency) ?? 0;
    totals.set(item.currency, current + item.unitPrice * item.quantity);
  });

  return Array.from(totals.entries()).map(([currency, subtotal]) => {
    const tax = subtotal * TAX_RATE;
    const preDiscountTotal = subtotal + tax;
    return {
      currency,
      subtotal,
      tax,
      discount: 0,
      preDiscountTotal,
      total: preDiscountTotal,
    };
  });
}

export function buildOrderCustomerSnapshot(
  user: User | null,
): OrderCustomerSnapshot | null {
  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    github: user.github,
  };
}

export function createOrder(
  items: CartItem[],
  payment: PaymentMethod,
  customer: User | null,
  breakdowns: CurrencyBreakdown[],
  appliedCoupon: AppliedCouponSnapshot | null,
  checkoutDetails?: CheckoutDetails | null,
): Order {
  return {
    orderNumber: `BF-${Math.floor(100000 + Math.random() * 900000)}`,
    date: new Date().toLocaleString(),
    payment,
    items,
    breakdowns,
    customer: buildOrderCustomerSnapshot(customer),
    appliedCoupon,
    checkoutDetails,
  };
}
