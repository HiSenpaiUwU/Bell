import { createContext, PropsWithChildren, useContext } from "react";
import { useNotifications } from "./NotificationContext";
import { useAuth } from "./AuthContext";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useRewards } from "./RewardsContext";
import {
  CartItem,
  MilkTeaCustomization,
  Order,
  PaymentMethod,
  Product,
} from "../types";
import {
  buildMilkTeaNotes,
  buildMilkTeaPrice,
  createOrder,
} from "../utils/orders";
import { formatPaymentMethod } from "../utils/format";

interface CartContextValue {
  cartItems: CartItem[];
  itemCount: number;
  lastOrder: Order | null;
  orderHistory: Order[];
  addProduct: (product: Product) => void;
  addCustomizedMilkTea: (
    product: Product,
    customization: MilkTeaCustomization,
  ) => void;
  updateQuantity: (itemId: string, nextQuantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  confirmOrder: (payment: PaymentMethod) => Order;
  clearLastOrder: () => void;
  deleteOrder: (orderNumber: string) => void;
}

const CART_STORAGE_KEY = "cart";
const LAST_ORDER_STORAGE_KEY = "lastOrder";
const ORDER_HISTORY_STORAGE_KEY = "orderHistory";

const CartContext = createContext<CartContextValue | undefined>(undefined);

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `line-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function CartProvider({ children }: PropsWithChildren) {
  const { notify } = useNotifications();
  const { currentUser } = useAuth();
  const { appliedCoupon, consumeAppliedCoupon, getDiscountedBreakdowns } = useRewards();
  const [cartItems, setCartItems] = useLocalStorageState<CartItem[]>(
    CART_STORAGE_KEY,
    [],
  );
  const [lastOrder, setLastOrder] = useLocalStorageState<Order | null>(
    LAST_ORDER_STORAGE_KEY,
    null,
  );
  const [orderHistory, setOrderHistory] = useLocalStorageState<Order[]>(
    ORDER_HISTORY_STORAGE_KEY,
    [],
  );

  const addProduct = (product: Product) => {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.productId === product.id && !item.notes,
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          id: generateId(),
          productId: product.id,
          name: product.name,
          image: product.image,
          unitPrice: product.price,
          currency: product.currency,
          quantity: 1,
          kind: product.category,
        },
      ];
    });

    notify({
      title: "Added to cart",
      message: product.name,
      tone: "success",
    });
  };

  const addCustomizedMilkTea = (
    product: Product,
    customization: MilkTeaCustomization,
  ) => {
    const notes = buildMilkTeaNotes(customization);
    const unitPrice = buildMilkTeaPrice(product.price, customization);

    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) =>
          item.productId === product.id &&
          item.notes === notes &&
          item.unitPrice === unitPrice,
      );

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...currentItems,
        {
          id: generateId(),
          productId: product.id,
          name: product.name,
          image: product.image,
          unitPrice,
          currency: product.currency,
          quantity: 1,
          notes,
          kind: product.category,
        },
      ];
    });

    notify({
      title: "Customized drink added",
      message: `${product.name} � ${customization.size} � ${customization.sugarLevel}`,
      tone: "success",
    });
  };

  const updateQuantity = (itemId: string, nextQuantity: number) => {
    const targetItem = cartItems.find((item) => item.id === itemId);

    if (!targetItem) {
      return;
    }

    if (nextQuantity <= 0) {
      setCartItems((currentItems) =>
        currentItems.filter((item) => item.id !== itemId),
      );

      notify({
        title: "Removed from cart",
        message: targetItem.name,
        tone: "warning",
      });
      return;
    }

    setCartItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, quantity: nextQuantity } : item,
      ),
    );

    notify({
      title: "Quantity updated",
      message: `${targetItem.name} x${nextQuantity}`,
      tone: "info",
    });
  };

  const removeItem = (itemId: string) => {
    const targetItem = cartItems.find((item) => item.id === itemId);

    setCartItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId),
    );

    if (targetItem) {
      notify({
        title: "Removed from cart",
        message: targetItem.name,
        tone: "warning",
      });
    }
  };

  const clearCart = () => {
    setCartItems([]);

    notify({
      title: "Cart cleared",
      message: "Your items were removed.",
      tone: "warning",
    });
  };

  const confirmOrder = (payment: PaymentMethod) => {
    const breakdowns = getDiscountedBreakdowns(cartItems);
    const couponWasUsed = breakdowns.some((breakdown) => breakdown.discount > 0);
    const appliedCouponSnapshot = couponWasUsed ? consumeAppliedCoupon() : null;
    const order = createOrder(
      cartItems,
      payment,
      currentUser,
      breakdowns,
      appliedCouponSnapshot,
    );

    setLastOrder(order);
    setOrderHistory((currentOrders) => [order, ...currentOrders]);
    setCartItems([]);

    notify({
      title: "Order confirmed",
      message: appliedCouponSnapshot
        ? `${order.orderNumber} � ${formatPaymentMethod(payment)} � ${appliedCouponSnapshot.code} used`
        : `${order.orderNumber} � ${formatPaymentMethod(payment)}`,
      tone: "success",
    });

    return order;
  };

  const clearLastOrder = () => {
    setLastOrder(null);
  };

  const deleteOrder = (orderNumber: string) => {
    setOrderHistory((currentOrders) =>
      currentOrders.filter((order) => order.orderNumber !== orderNumber),
    );

    if (lastOrder?.orderNumber === orderNumber) {
      setLastOrder(null);
    }

    notify({
      title: "Order removed",
      message: `${orderNumber} was removed from saved admin records.`,
      tone: "info",
    });
  };

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        itemCount,
        lastOrder,
        orderHistory,
        addProduct,
        addCustomizedMilkTea,
        updateQuantity,
        removeItem,
        clearCart,
        confirmOrder,
        clearLastOrder,
        deleteOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
