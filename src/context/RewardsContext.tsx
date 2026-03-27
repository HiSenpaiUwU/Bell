import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { couponTemplates } from "../data/customerExperience";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import {
  AppliedCouponSnapshot,
  AuthResult,
  CartItem,
  CouponInventoryItem,
  CouponTemplate,
  CurrencyBreakdown,
} from "../types";
import { buildCurrencyBreakdowns } from "../utils/orders";
import { useAuth } from "./AuthContext";

interface RewardsContextValue {
  couponTemplates: CouponTemplate[];
  activeCoupons: CouponInventoryItem[];
  usedCoupons: CouponInventoryItem[];
  appliedCoupon: CouponInventoryItem | null;
  availableCouponCount: number;
  getDiscountedBreakdowns: (items: CartItem[]) => CurrencyBreakdown[];
  applyCoupon: (couponId: string, items: CartItem[]) => AuthResult;
  clearAppliedCoupon: () => void;
  grantCouponToUser: (userId: string, templateId: string, source?: string) => AuthResult;
  claimGameReward: (gameId: string, templateId: string) => AuthResult;
  hasClaimedGameReward: (gameId: string) => boolean;
  consumeAppliedCoupon: () => AppliedCouponSnapshot | null;
  getUserCoupons: (userId: string) => CouponInventoryItem[];
}

interface GameClaimRecord {
  userId: string;
  gameId: string;
  claimedAt: string;
}

type AppliedCouponMap = Record<string, string | undefined>;

const COUPON_INVENTORY_STORAGE_KEY = "couponInventory";
const APPLIED_COUPON_MAP_STORAGE_KEY = "appliedCouponMap";
const GAME_CLAIMS_STORAGE_KEY = "rewardGameClaims";

const RewardsContext = createContext<RewardsContextValue | undefined>(undefined);

function generateId(prefix = "coupon") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function roundAmount(value: number) {
  return Number(value.toFixed(2));
}

function buildCouponInventoryItem(
  userId: string,
  templateId: string,
  source: string,
): CouponInventoryItem | null {
  const template = couponTemplates.find((coupon) => coupon.id === templateId);

  if (!template) {
    return null;
  }

  return {
    ...template,
    inventoryId: generateId("inventory"),
    userId,
    source,
    status: "active",
    unlockedAt: new Date().toISOString(),
  };
}

function calculateDiscount(
  breakdown: CurrencyBreakdown,
  coupon: CouponInventoryItem,
) {
  const isEligibleCurrency =
    coupon.currency === "ALL" || coupon.currency === breakdown.currency;
  const meetsMinimum = !coupon.minSpend || breakdown.subtotal >= coupon.minSpend;

  if (!isEligibleCurrency || !meetsMinimum) {
    return 0;
  }

  if (coupon.type === "percent") {
    return roundAmount(breakdown.preDiscountTotal * (coupon.amount / 100));
  }

  return roundAmount(Math.min(coupon.amount, breakdown.preDiscountTotal));
}

export function RewardsProvider({ children }: PropsWithChildren) {
  const { currentUser, users } = useAuth();
  const [couponInventory, setCouponInventory] = useLocalStorageState<CouponInventoryItem[]>(
    COUPON_INVENTORY_STORAGE_KEY,
    [],
  );
  const [appliedCouponMap, setAppliedCouponMap] =
    useLocalStorageState<AppliedCouponMap>(APPLIED_COUPON_MAP_STORAGE_KEY, {});
  const [gameClaims, setGameClaims] = useLocalStorageState<GameClaimRecord[]>(
    GAME_CLAIMS_STORAGE_KEY,
    [],
  );

  useEffect(() => {
    setCouponInventory((currentCoupons) =>
      currentCoupons.filter((coupon) =>
        users.some((user) => user.id === coupon.userId),
      ),
    );

    setGameClaims((currentClaims) =>
      currentClaims.filter((claim) => users.some((user) => user.id === claim.userId)),
    );

    setAppliedCouponMap((currentMap) => {
      const nextMap: AppliedCouponMap = {};

      Object.entries(currentMap).forEach(([userId, inventoryId]) => {
        if (!inventoryId) {
          return;
        }

        const hasUser = users.some((user) => user.id === userId);
        const hasCoupon = couponInventory.some(
          (coupon) => coupon.inventoryId === inventoryId && coupon.status === "active",
        );

        if (hasUser && hasCoupon) {
          nextMap[userId] = inventoryId;
        }
      });

      return nextMap;
    });
  }, [couponInventory, setAppliedCouponMap, setCouponInventory, setGameClaims, users]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "customer") {
      return;
    }

    setCouponInventory((currentCoupons) => {
      const hasWelcomeCoupon = currentCoupons.some(
        (coupon) =>
          coupon.userId === currentUser.id && coupon.id === "welcome-any-order",
      );

      if (hasWelcomeCoupon) {
        return currentCoupons;
      }

      const welcomeCoupon = buildCouponInventoryItem(
        currentUser.id,
        "welcome-any-order",
        "Welcome reward",
      );

      if (!welcomeCoupon) {
        return currentCoupons;
      }

      return [welcomeCoupon, ...currentCoupons];
    });
  }, [currentUser, setCouponInventory]);

  const userCoupons = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return couponInventory.filter((coupon) => coupon.userId === currentUser.id);
  }, [couponInventory, currentUser]);

  const activeCoupons = useMemo(
    () => userCoupons.filter((coupon) => coupon.status === "active"),
    [userCoupons],
  );

  const usedCoupons = useMemo(
    () => userCoupons.filter((coupon) => coupon.status === "used"),
    [userCoupons],
  );

  const appliedCoupon = useMemo(() => {
    if (!currentUser) {
      return null;
    }

    const appliedCouponId = appliedCouponMap[currentUser.id];

    if (!appliedCouponId) {
      return null;
    }

    return (
      activeCoupons.find((coupon) => coupon.inventoryId === appliedCouponId) ?? null
    );
  }, [activeCoupons, appliedCouponMap, currentUser]);

  const getDiscountedBreakdowns = (items: CartItem[]) => {
    const baseBreakdowns = buildCurrencyBreakdowns(items);

    if (!appliedCoupon) {
      return baseBreakdowns;
    }

    return baseBreakdowns.map((breakdown) => {
      const discount = calculateDiscount(breakdown, appliedCoupon);

      return {
        ...breakdown,
        discount,
        total: roundAmount(Math.max(breakdown.preDiscountTotal - discount, 0)),
      };
    });
  };

  const applyCoupon = (couponId: string, items: CartItem[]): AuthResult => {
    if (!currentUser || currentUser.role !== "customer") {
      return {
        success: false,
        message: "Sign in with a customer account to use coupons.",
      };
    }

    if (items.length === 0) {
      return {
        success: false,
        message: "Add items to your cart before applying a coupon.",
      };
    }

    const targetCoupon = activeCoupons.find((coupon) => coupon.inventoryId === couponId);

    if (!targetCoupon) {
      return {
        success: false,
        message: "That coupon is no longer available.",
      };
    }

    const eligibleBreakdowns = buildCurrencyBreakdowns(items).filter(
      (breakdown) => calculateDiscount(breakdown, targetCoupon) > 0,
    );

    if (eligibleBreakdowns.length === 0) {
      return {
        success: false,
        message: "This coupon does not match the items currently in your cart.",
      };
    }

    setAppliedCouponMap((currentMap) => ({
      ...currentMap,
      [currentUser.id]: couponId,
    }));

    return {
      success: true,
      message: `${targetCoupon.code} is now active for this order.`,
    };
  };

  const clearAppliedCoupon = () => {
    if (!currentUser) {
      return;
    }

    setAppliedCouponMap((currentMap) => {
      const nextMap = { ...currentMap };
      delete nextMap[currentUser.id];
      return nextMap;
    });
  };

  const grantCouponToUser = (
    userId: string,
    templateId: string,
    source = "Admin gift",
  ): AuthResult => {
    const targetUser = users.find((user) => user.id === userId && user.role === "customer");

    if (!targetUser) {
      return {
        success: false,
        message: "That customer account is not available for rewards.",
      };
    }

    const nextCoupon = buildCouponInventoryItem(userId, templateId, source);

    if (!nextCoupon) {
      return {
        success: false,
        message: "That coupon reward could not be created.",
      };
    }

    setCouponInventory((currentCoupons) => [nextCoupon, ...currentCoupons]);

    return {
      success: true,
      message: `${nextCoupon.code} was added to @${targetUser.username}.`,
    };
  };

  const hasClaimedGameReward = (gameId: string) => {
    if (!currentUser) {
      return false;
    }

    return gameClaims.some(
      (claim) => claim.userId === currentUser.id && claim.gameId === gameId,
    );
  };

  const claimGameReward = (gameId: string, templateId: string): AuthResult => {
    if (!currentUser || currentUser.role !== "customer") {
      return {
        success: false,
        message: "Sign in with a customer account to unlock rewards.",
      };
    }

    if (hasClaimedGameReward(gameId)) {
      return {
        success: false,
        message: "You already claimed this Bell Fresh game reward.",
      };
    }

    const grantResult = grantCouponToUser(currentUser.id, templateId, "Mini game reward");

    if (!grantResult.success) {
      return grantResult;
    }

    setGameClaims((currentClaims) => [
      {
        userId: currentUser.id,
        gameId,
        claimedAt: new Date().toISOString(),
      },
      ...currentClaims,
    ]);

    return grantResult;
  };

  const consumeAppliedCoupon = () => {
    if (!currentUser || !appliedCoupon) {
      return null;
    }

    const snapshot: AppliedCouponSnapshot = {
      inventoryId: appliedCoupon.inventoryId,
      code: appliedCoupon.code,
      title: appliedCoupon.title,
      description: appliedCoupon.description,
      badge: appliedCoupon.badge,
      type: appliedCoupon.type,
      amount: appliedCoupon.amount,
      currency: appliedCoupon.currency,
      source: appliedCoupon.source,
    };

    setCouponInventory((currentCoupons) =>
      currentCoupons.map((coupon) =>
        coupon.inventoryId === appliedCoupon.inventoryId
          ? {
              ...coupon,
              status: "used",
              usedAt: new Date().toISOString(),
            }
          : coupon,
      ),
    );

    setAppliedCouponMap((currentMap) => {
      const nextMap = { ...currentMap };
      delete nextMap[currentUser.id];
      return nextMap;
    });

    return snapshot;
  };

  const getUserCoupons = (userId: string) => {
    return couponInventory.filter((coupon) => coupon.userId === userId);
  };

  const value: RewardsContextValue = {
    couponTemplates,
    activeCoupons,
    usedCoupons,
    appliedCoupon,
    availableCouponCount: activeCoupons.length,
    getDiscountedBreakdowns,
    applyCoupon,
    clearAppliedCoupon,
    grantCouponToUser,
    claimGameReward,
    hasClaimedGameReward,
    consumeAppliedCoupon,
    getUserCoupons,
  };

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

export function useRewards() {
  const context = useContext(RewardsContext);

  if (!context) {
    throw new Error("useRewards must be used within a RewardsProvider");
  }

  return context;
}

