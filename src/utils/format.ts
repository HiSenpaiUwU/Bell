import { CurrencyCode, PaymentMethod } from "../types";

export function formatCurrency(amount: number, currency: CurrencyCode) {
  return new Intl.NumberFormat(currency === "PHP" ? "en-PH" : "en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatPaymentMethod(payment: PaymentMethod) {
  switch (payment) {
    case "cash":
      return "Cash";
    case "card":
      return "Credit / Debit Card";
    case "gcash":
      return "GCash";
    default:
      return payment;
  }
}
