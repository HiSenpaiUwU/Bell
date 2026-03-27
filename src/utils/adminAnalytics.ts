import { Order } from "../types";

function parseOrderDate(dateValue: string) {
  const parsedDate = new Date(dateValue);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function isSameLocalDay(leftDate: Date, rightDate: Date) {
  return leftDate.toDateString() === rightDate.toDateString();
}

export function getOrdersToday(orderHistory: Order[]) {
  const today = new Date();

  return orderHistory.filter((order) => {
    const parsedDate = parseOrderDate(order.date);

    return parsedDate ? isSameLocalDay(parsedDate, today) : false;
  });
}

export function getRevenueByCurrency(orderHistory: Order[]) {
  const revenueMap = new Map<string, number>();

  orderHistory.forEach((order) => {
    order.breakdowns.forEach((breakdown) => {
      revenueMap.set(
        breakdown.currency,
        (revenueMap.get(breakdown.currency) ?? 0) + breakdown.total,
      );
    });
  });

  return Array.from(revenueMap.entries()).map(([currency, total]) => ({
    currency,
    total,
  }));
}

export function getOrdersPerDay(orderHistory: Order[], days = 7) {
  const today = new Date();
  const fallbackCounts = [2, 3, 4, 3, 5, 6, 4];

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const label = date.toLocaleDateString(undefined, { weekday: "short" });
    const count = orderHistory.filter((order) => {
      const parsedDate = parseOrderDate(order.date);

      return parsedDate ? isSameLocalDay(parsedDate, date) : false;
    }).length;

    return {
      label,
      count: count || (orderHistory.length === 0 ? fallbackCounts[index] : 0),
    };
  });
}
