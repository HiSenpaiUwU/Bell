export interface SupportTopic {
  id: string;
  keywords: string[];
  answer: string;
  suggestions?: string[];
}

export const supportQuickActions = [
  "What is on the menu?",
  "Can I customize milk tea?",
  "How do I login?",
  "How do I checkout?",
  "How do I view my receipt?",
  "Tell me about Bell Fresh",
];

export const supportTopics: SupportTopic[] = [
  {
    id: "greeting",
    keywords: ["hello", "hi", "hey", "good morning", "good evening"],
    answer:
      "Hi! I can help with the Bell Fresh menu, account access, cart updates, checkout, and receipts.",
    suggestions: ["What is on the menu?", "How do I checkout?", "How do I login?"],
  },
  {
    id: "menu",
    keywords: ["menu", "food", "meal", "salad", "items"],
    answer:
      "Open the Menu page to browse fresh salads, light snacks, and milk tea specials. You can search the menu, use quick filters like Salads, Light Snacks, Milk Tea, Vegan, and Popular, then add food directly or customize milk tea before sending it to the cart.",
    suggestions: ["Can I customize milk tea?", "How do I checkout?"],
  },
  {
    id: "milk-tea",
    keywords: [
      "milk tea",
      "drink",
      "customize",
      "sugar",
      "size",
      "pearls",
      "nata",
      "coffee jelly",
      "cream puff",
    ],
    answer:
      "Yes. Milk tea can be customized with Medium or Large size, sugar level, extras like Pearls or Nata, and your own special instructions before adding it to the cart.",
    suggestions: ["What is on the menu?", "How do I checkout?"],
  },
  {
    id: "cart",
    keywords: ["cart", "quantity", "remove", "add to cart", "update item"],
    answer:
      "Use the Cart page to review your order, increase or decrease quantity, remove items, and start checkout when you are ready.",
    suggestions: ["How do I checkout?", "How do I view my receipt?"],
  },
  {
    id: "account",
    keywords: ["login", "register", "account", "password", "username", "sign in"],
    answer:
      "Create an account on the Register page, then log in from the Login page. This demo stores one browser-based account locally so you can access the cart, checkout, and receipt flow.",
    suggestions: ["How do I checkout?", "How do I view my receipt?"],
  },
  {
    id: "checkout",
    keywords: ["checkout", "purchase", "payment", "cash", "card", "gcash"],
    answer:
      "The flow is now Cart to Checkout to Confirmation. Review your cart first, then add your name and address, choose Cash or GCash, and place the order from the Checkout page.",
    suggestions: ["How do I view my receipt?", "How do I login?"],
  },
  {
    id: "receipt",
    keywords: ["receipt", "print", "invoice", "order number"],
    answer:
      "After you place an order, the confirmation page opens automatically. It shows the order number, payment method, delivery details, items, totals, and a receipt download button.",
    suggestions: ["How do I checkout?", "What is on the menu?"],
  },
  {
    id: "delivery",
    keywords: ["delivery", "shipping", "arrival", "when", "time"],
    answer:
      "This Bell Fresh app is a working storefront demo, so it does not calculate delivery schedules yet. You can still test the full browse, cart, checkout, and receipt experience.",
    suggestions: ["How do I checkout?", "Tell me about Bell Fresh"],
  },
  {
    id: "about",
    keywords: ["about", "mission", "vision", "values", "team", "who are you"],
    answer:
      "The About page keeps the original Bell Fresh mission, vision, values, and team section, now rebuilt as reusable React components.",
    suggestions: ["What is on the menu?", "How do I login?"],
  },
  {
    id: "support",
    keywords: ["help", "support", "problem", "issue", "broken", "not working"],
    answer:
      "I can help with menu browsing, account access, cart questions, checkout, and receipts. Tell me which page or step is giving you trouble and I will point you in the right direction.",
    suggestions: ["How do I login?", "How do I checkout?", "How do I view my receipt?"],
  },
];

export const fallbackSupportReply: SupportTopic = {
  id: "fallback",
  keywords: [],
  answer:
    "I can answer basic Bell Fresh support questions about the menu, milk tea customization, login, cart, checkout, and receipts. Try asking one of the quick questions below.",
  suggestions: supportQuickActions.slice(0, 4),
};
