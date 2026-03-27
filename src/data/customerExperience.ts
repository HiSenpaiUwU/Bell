import { CouponTemplate } from "../types";

export interface FreshReadCard {
  id: string;
  title: string;
  description: string;
  tag: string;
  to: string;
}

export interface MiniGameOption {
  id: string;
  label: string;
}

export interface MiniGameDefinition {
  id: string;
  rewardTemplateId: string;
  title: string;
  description: string;
  question: string;
  correctOptionId: string;
  options: MiniGameOption[];
}

export const couponTemplates: CouponTemplate[] = [
  {
    id: "welcome-any-order",
    code: "WELCOME8",
    title: "8% off your order",
    description: "A warm Bell Fresh welcome for your next order.",
    badge: "Welcome perk",
    type: "percent",
    amount: 8,
    currency: "ALL",
  },
  {
    id: "tea-time-treat",
    code: "TEA20",
    title: "PHP 20 off milk tea",
    description: "Take a little off your milk tea checkout total.",
    badge: "Drink treat",
    type: "fixed",
    amount: 20,
    currency: "PHP",
    minSpend: 120,
  },
  {
    id: "salad-glow",
    code: "SALAD10",
    title: "10% off salad bowls",
    description: "A lighter total for your fresh salad picks.",
    badge: "Fresh bowl",
    type: "percent",
    amount: 10,
    currency: "USD",
    minSpend: 10,
  },
  {
    id: "vip-any-order",
    code: "VIP15",
    title: "15% off any order",
    description: "An admin reward for loyal Bell Fresh customers.",
    badge: "VIP reward",
    type: "percent",
    amount: 15,
    currency: "ALL",
  },
];

export const freshReads: FreshReadCard[] = [
  {
    id: "reads-1",
    tag: "Fresh read",
    title: "How to build a lighter lunch without making it boring",
    description:
      "Pick one crunchy base, one creamy note, and one brighter topping so every bowl still feels complete.",
    to: "/menu",
  },
  {
    id: "reads-2",
    tag: "Menu tip",
    title: "What to pair with milk tea when you want something balanced",
    description:
      "Fresh salads and softer milk tea flavors work best together when you want something refreshing, not heavy.",
    to: "/menu",
  },
  {
    id: "reads-3",
    tag: "Bell Fresh note",
    title: "Why the app feels smoother from menu to receipt",
    description:
      "Notifications, coupon cards, and a cleaner checkout flow keep the Bell Fresh experience feeling more like a real web app.",
    to: "/about",
  },
];

export const menuMiniGame: MiniGameDefinition = {
  id: "menu-master-quiz",
  rewardTemplateId: "tea-time-treat",
  title: "Bell Fresh quick game",
  description: "Answer one fast question while you browse and unlock a reward if you get it right.",
  question: "Which Bell Fresh category lets you customize the size, sugar level, and extras?",
  correctOptionId: "milk-tea",
  options: [
    {
      id: "salad",
      label: "Salads",
    },
    {
      id: "milk-tea",
      label: "Milk tea",
    },
    {
      id: "about",
      label: "About page",
    },
  ],
};
