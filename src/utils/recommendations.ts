import { bestSellerProducts, featuredProducts, milkTeaProducts, saladProducts, snackProducts } from "../data/menuData";
import { CartItem, Order, Product } from "../types";

const allProducts = [...saladProducts, ...milkTeaProducts, ...snackProducts, ...featuredProducts];
const productMap = new Map<string, Product>();

allProducts.forEach((product) => {
  productMap.set(product.id, product);
});

export function getProductById(productId: string) {
  return productMap.get(productId) ?? null;
}

export function getProductsByIds(productIds: string[]) {
  return productIds
    .map((productId) => getProductById(productId))
    .filter((product): product is Product => Boolean(product));
}

export function getUsualOrderProducts(
  orderHistory: Order[],
  userId?: string | null,
  limit = 3,
) {
  const relevantOrders = userId
    ? orderHistory.filter((order) => order.customer?.userId === userId)
    : orderHistory;
  const productFrequency = new Map<string, number>();

  relevantOrders.forEach((order) => {
    order.items.forEach((item) => {
      productFrequency.set(
        item.productId,
        (productFrequency.get(item.productId) ?? 0) + item.quantity,
      );
    });
  });

  return Array.from(productFrequency.entries())
    .sort((leftEntry, rightEntry) => rightEntry[1] - leftEntry[1])
    .slice(0, limit)
    .map(([productId]) => getProductById(productId))
    .filter((product): product is Product => Boolean(product));
}

export function getSuggestedDrinkForFood(product: Product | null) {
  if (!product || product.category === "milk-tea") {
    return null;
  }

  if (product.isVegan) {
    return getProductById("matcha-milk-tea");
  }

  if (product.nutritionTags?.includes("High protein")) {
    return getProductById("okinawa-milk-tea");
  }

  return getProductById("brown-sugar-milk-tea");
}

export function getRecommendedProducts({
  cartItems,
  orderHistory,
  recentlyViewedProductIds,
  userId,
  limit = 4,
}: {
  cartItems: CartItem[];
  orderHistory: Order[];
  recentlyViewedProductIds: string[];
  userId?: string | null;
  limit?: number;
}) {
  const excludedProductIds = new Set(cartItems.map((item) => item.productId));
  const recentlyViewedSet = new Set(recentlyViewedProductIds);
  const usualOrderSet = new Set(
    getUsualOrderProducts(orderHistory, userId, 5).map((product) => product.id),
  );
  const cartKinds = new Set(cartItems.map((item) => item.kind));

  return Array.from(productMap.values())
    .filter((product) => !excludedProductIds.has(product.id))
    .map((product) => {
      let score = 0;

      if (product.isBestSeller) {
        score += 5;
      }

      if (product.isPopular) {
        score += 4;
      }

      if (product.nutritionTags?.includes("Healthy choice")) {
        score += 2;
      }

      if (recentlyViewedSet.has(product.id)) {
        score += 5;
      }

      if (usualOrderSet.has(product.id)) {
        score += 7;
      }

      if ((cartKinds.has("salad") || cartKinds.has("snack")) && product.category === "milk-tea") {
        score += 6;
      }

      if (cartKinds.has("milk-tea") && product.category !== "milk-tea") {
        score += 4;
      }

      if (recentlyViewedSet.size === 0 && cartKinds.size === 0 && product.isBestSeller) {
        score += 2;
      }

      return { product, score };
    })
    .sort((leftItem, rightItem) => rightItem.score - leftItem.score)
    .slice(0, limit)
    .map((entry) => entry.product);
}

export function getPopularProduct(orderHistory: Order[]) {
  const productFrequency = new Map<string, number>();

  orderHistory.forEach((order) => {
    order.items.forEach((item) => {
      productFrequency.set(
        item.productId,
        (productFrequency.get(item.productId) ?? 0) + item.quantity,
      );
    });
  });

  const topProductId = Array.from(productFrequency.entries()).sort(
    (leftEntry, rightEntry) => rightEntry[1] - leftEntry[1],
  )[0]?.[0];

  return (topProductId ? getProductById(topProductId) : null) ?? bestSellerProducts[0] ?? null;
}
