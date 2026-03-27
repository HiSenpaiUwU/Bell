export type CurrencyCode = "USD" | "PHP";
export type ProductCategory = "salad" | "milk-tea" | "snack";
export type PaymentMethod = "cash" | "card" | "gcash";
export type MilkTeaSize = "Medium" | "Large";
export type SugarLevel = "0%" | "25%" | "50%" | "100%";
export type UserRole = "customer" | "admin";
export type SocialProvider = "google" | "facebook";
export type CouponType = "fixed" | "percent";
export type CouponCurrency = CurrencyCode | "ALL";
export type PasswordResetRequestStatus = "pending" | "approved" | "rejected";
export type FeedPostKind = "update" | "news" | "meme" | "photo";
export type AttachmentKind = "image" | "audio" | "video" | "file";

export interface ReactionGroup {
  emoji: string;
  userIds: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  currency: CurrencyCode;
  category: ProductCategory;
  image?: string;
  description?: string;
  calories?: number;
  serves?: number;
  customizable?: boolean;
  rating?: number;
  reviewCount?: number;
  reviewSnippet?: string;
  isVegan?: boolean;
  isPopular?: boolean;
  isBestSeller?: boolean;
  nutritionTags?: string[];
  liveOrdersLastHour?: number;
}

export interface TeamMember {
  name: string;
  role: string;
  image: string;
}

export interface MilkTeaExtra {
  name: string;
  price: number;
}

export interface MilkTeaCustomization {
  size: MilkTeaSize;
  sugarLevel: SugarLevel;
  extras: MilkTeaExtra[];
  instructions: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  image?: string;
  unitPrice: number;
  currency: CurrencyCode;
  quantity: number;
  notes?: string;
  kind: ProductCategory;
}

export interface SocialLinks {
  facebook?: string;
  googleEmail?: string;
}

export interface User {
  id: string;
  role: UserRole;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  github?: string;
  avatarUrl?: string;
  bio?: string;
  favoriteEmoji?: string;
  socialProvider?: SocialProvider;
  socialLinks?: SocialLinks;
  savedCheckoutDetails?: CheckoutDetails;
  password: string;
  createdAt: string;
}

export interface CouponTemplate {
  id: string;
  code: string;
  title: string;
  description: string;
  badge: string;
  type: CouponType;
  amount: number;
  currency: CouponCurrency;
  minSpend?: number;
}

export interface CouponInventoryItem extends CouponTemplate {
  inventoryId: string;
  userId: string;
  source: string;
  status: "active" | "used";
  unlockedAt: string;
  usedAt?: string;
}

export interface AppliedCouponSnapshot {
  inventoryId: string;
  code: string;
  title: string;
  description: string;
  badge: string;
  type: CouponType;
  amount: number;
  currency: CouponCurrency;
  source: string;
}

export interface RegisterInput {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  github?: string;
  avatarUrl?: string;
  favoriteEmoji?: string;
  socialLinks?: SocialLinks;
  password: string;
}

export interface ProfileUpdateInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  github?: string;
  avatarUrl?: string;
  bio?: string;
  favoriteEmoji?: string;
  socialLinks?: SocialLinks;
  savedCheckoutDetails?: CheckoutDetails | null;
}

export interface OrderCustomerSnapshot {
  userId: string;
  role: UserRole;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  github?: string;
}

export interface CheckoutDetails {
  fullName: string;
  address: string;
}

export interface CurrencyBreakdown {
  currency: CurrencyCode;
  subtotal: number;
  tax: number;
  discount: number;
  preDiscountTotal: number;
  total: number;
}

export interface PasswordResetRequest {
  id: string;
  userId: string;
  username: string;
  email: string;
  requestedPassword: string;
  note?: string;
  status: PasswordResetRequestStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface Order {
  orderNumber: string;
  date: string;
  payment: PaymentMethod;
  items: CartItem[];
  breakdowns: CurrencyBreakdown[];
  customer: OrderCustomerSnapshot | null;
  appliedCoupon: AppliedCouponSnapshot | null;
  checkoutDetails?: CheckoutDetails | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  attachments?: StoredAttachment[];
  reactions?: ReactionGroup[];
  replyToMessageId?: string;
  createdAt: string;
  readBy: string[];
}

export interface StoredAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  url: string;
  storageKey?: string;
  mimeType: string;
  size: number;
}

export interface Story {
  id: string;
  authorId: string;
  caption: string;
  emoji?: string;
  attachment?: StoredAttachment;
  location?: string;
  linkUrl?: string;
  background?: string;
  createdAt: string;
  expiresAt: string;
  viewedBy: string[];
}

export interface FeedComment {
  id: string;
  authorId: string;
  content: string;
  emoji?: string;
  attachments?: StoredAttachment[];
  reactions?: ReactionGroup[];
  replies?: FeedComment[];
  createdAt: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  content: string;
  emoji?: string;
  kind?: FeedPostKind;
  imageUrl?: string;
  attachments?: StoredAttachment[];
  comments?: FeedComment[];
  source?: string;
  autoGenerated?: boolean;
  createdAt: string;
  likedBy: string[];
  isAnnouncement?: boolean;
}

export interface AuthResult {
  success: boolean;
  message: string;
}
