import { PropsWithChildren, createContext, useContext, useMemo } from "react";
import { featuredProducts, milkTeaProducts, saladProducts, snackProducts } from "../data/menuData";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { Product } from "../types";

interface PersonalizationContextValue {
  recentlyViewedProductIds: string[];
  recentlyViewedProducts: Product[];
  trackProductView: (productId: string) => void;
}

const RECENTLY_VIEWED_STORAGE_KEY = "recentlyViewedProducts";
const MAX_RECENTLY_VIEWED = 8;
const allProducts = [...saladProducts, ...milkTeaProducts, ...snackProducts, ...featuredProducts];
const uniqueProductMap = new Map(allProducts.map((product) => [product.id, product]));

const PersonalizationContext = createContext<PersonalizationContextValue | undefined>(
  undefined,
);

export function PersonalizationProvider({ children }: PropsWithChildren) {
  const [recentlyViewedProductIds, setRecentlyViewedProductIds] = useLocalStorageState<string[]>(
    RECENTLY_VIEWED_STORAGE_KEY,
    [],
  );

  const recentlyViewedProducts = useMemo(
    () =>
      recentlyViewedProductIds
        .map((productId) => uniqueProductMap.get(productId))
        .filter((product): product is Product => Boolean(product)),
    [recentlyViewedProductIds],
  );

  const value = useMemo(
    () => ({
      recentlyViewedProductIds,
      recentlyViewedProducts,
      trackProductView: (productId: string) => {
        setRecentlyViewedProductIds((currentProductIds) => [
          productId,
          ...currentProductIds.filter((currentId) => currentId !== productId),
        ].slice(0, MAX_RECENTLY_VIEWED));
      },
    }),
    [recentlyViewedProductIds, recentlyViewedProducts, setRecentlyViewedProductIds],
  );

  return (
    <PersonalizationContext.Provider value={value}>
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization() {
  const context = useContext(PersonalizationContext);

  if (!context) {
    throw new Error("usePersonalization must be used within a PersonalizationProvider");
  }

  return context;
}
