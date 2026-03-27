import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { EmojiPicker } from "../components/community/EmojiPicker";
import { InstallAppButton } from "../components/layout/InstallAppButton";
import { MenuCard } from "../components/menu/MenuCard";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContextFixed";
import { useNotifications } from "../context/NotificationContext";
import { usePersonalization } from "../context/PersonalizationContext";
import { useRewards } from "../context/RewardsContext";
import { Product, User } from "../types";
import {
  getRecommendedProducts,
  getSuggestedDrinkForFood,
  getUsualOrderProducts,
} from "../utils/recommendations";
import { navigateTo } from "../utils/navigation";

interface ProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  github: string;
  avatarUrl: string;
  bio: string;
  favoriteEmoji: string;
  facebook: string;
  googleEmail: string;
  savedAddress: string;
}

function buildProfileFormState(currentUser: User | null): ProfileFormState {
  return {
    firstName: currentUser?.firstName ?? "",
    lastName: currentUser?.lastName ?? "",
    email: currentUser?.email ?? "",
    phone: currentUser?.phone ?? "",
    github: currentUser?.github ?? "",
    avatarUrl: currentUser?.avatarUrl ?? "",
    bio: currentUser?.bio ?? "",
    favoriteEmoji: currentUser?.favoriteEmoji ?? "🥗",
    facebook: currentUser?.socialLinks?.facebook ?? "",
    googleEmail: currentUser?.socialLinks?.googleEmail ?? "",
    savedAddress: currentUser?.savedCheckoutDetails?.address ?? "",
  };
}

export function ProfilePage() {
  const { currentUser, exportCurrentUserBackup, importUserBackup, updateProfile } = useAuth();
  const { addProduct, cartItems, orderHistory } = useCart();
  const { notify } = useNotifications();
  const { availableCouponCount } = useRewards();
  const { recentlyViewedProductIds, recentlyViewedProducts, trackProductView } =
    usePersonalization();
  const [formState, setFormState] = useState<ProfileFormState>(() =>
    buildProfileFormState(currentUser),
  );
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFormState(buildProfileFormState(currentUser));
  }, [currentUser]);

  const usualOrderProducts = useMemo(
    () => getUsualOrderProducts(orderHistory, currentUser?.id, 3),
    [currentUser?.id, orderHistory],
  );
  const recommendedProducts = useMemo(
    () =>
      getRecommendedProducts({
        cartItems,
        orderHistory,
        recentlyViewedProductIds,
        userId: currentUser?.id,
        limit: 4,
      }),
    [cartItems, currentUser?.id, orderHistory, recentlyViewedProductIds],
  );
  const orderCount = useMemo(
    () => orderHistory.filter((order) => order.customer?.userId === currentUser?.id).length,
    [currentUser?.id, orderHistory],
  );
  const displayName = useMemo(
    () => [formState.firstName, formState.lastName].filter(Boolean).join(" ").trim(),
    [formState.firstName, formState.lastName],
  );

  const handleFieldChange = (field: keyof ProfileFormState, value: string) => {
    setFormState((currentFormState) => ({
      ...currentFormState,
      [field]: value,
    }));
  };

  const handleProductAction = (product: Product) => {
    trackProductView(product.id);

    if (product.category === "milk-tea") {
      navigateTo("/menu");
      notify({
        title: "Open the menu to customize",
        message: `${product.name} opens with size, sugar, and add-on options.`,
        tone: "info",
      });
      return;
    }

    addProduct(product);

    const suggestedDrink = getSuggestedDrinkForFood(product);

    if (suggestedDrink) {
      notify({
        title: "You might also like",
        message: `Pair ${product.name} with ${suggestedDrink.name}.`,
        tone: "info",
      });
    }
  };

  const handleSaveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSavingProfile) {
      return;
    }

    setIsSavingProfile(true);

    const result = updateProfile({
      firstName: formState.firstName,
      lastName: formState.lastName,
      email: formState.email,
      phone: formState.phone,
      github: formState.github,
      avatarUrl: formState.avatarUrl,
      bio: formState.bio,
      favoriteEmoji: formState.favoriteEmoji,
      socialLinks: {
        facebook: formState.facebook,
        googleEmail: formState.googleEmail,
      },
      savedCheckoutDetails: {
        fullName: displayName,
        address: formState.savedAddress,
      },
    });

    notify({
      title: result.success ? "Profile updated" : "Profile not saved",
      message: result.message,
      tone: result.success ? "success" : "warning",
    });

    setIsSavingProfile(false);
  };

  const handleDownloadBackup = () => {
    const result = exportCurrentUserBackup();

    notify({
      title: result.success ? "Backup ready" : "Backup not created",
      message: result.message,
      tone: result.success ? "success" : "warning",
    });

    if (!result.success || !result.content || !result.fileName) {
      return;
    }

    const backupBlob = new Blob([result.content], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(backupBlob);
    const anchor = document.createElement("a");

    anchor.href = downloadUrl;
    anchor.download = result.fileName;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const handleImportBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const backupFile = event.target.files?.[0];

    if (!backupFile) {
      return;
    }

    const result = importUserBackup(await backupFile.text());

    notify({
      title: result.success ? "Backup restored" : "Backup not restored",
      message: result.message,
      tone: result.success ? "success" : "warning",
    });

    event.target.value = "";
  };

  return (
    <section className="shell section-stack profile-page page-reveal">
      <div className="section-heading section-heading--stacked">
        <div>
          <p className="eyebrow">Your profile</p>
          <h1>{`Welcome back, ${currentUser?.firstName ?? "Bell Fresh guest"} 👋`}</h1>
          <p className="section-copy">
            Keep your profile, saved address, socials, and favorite Bell Fresh picks in one place.
          </p>
        </div>
        <InstallAppButton />
      </div>

      <div className="profile-summary-grid">
        <article className="summary-card profile-summary-card">
          <p className="eyebrow">Orders placed</p>
          <h2>{orderCount}</h2>
          <p>Your recent customer orders saved in this browser.</p>
        </article>
        <article className="summary-card profile-summary-card">
          <p className="eyebrow">Rewards ready</p>
          <h2>{availableCouponCount}</h2>
          <p>Coupons and perks available for your next checkout.</p>
        </article>
        <article className="summary-card profile-summary-card">
          <p className="eyebrow">Recently viewed</p>
          <h2>{recentlyViewedProducts.length}</h2>
          <p>Items you looked at lately stay close for faster reordering.</p>
        </article>
      </div>

      <section className="menu-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Edit profile</p>
            <h2>Make your Bell Fresh account feel like yours ✨</h2>
            <p className="section-copy">
              Update your name, picture, socials, emoji, and default delivery address anytime.
            </p>
          </div>
        </div>

        <div className="profile-editor-grid">
          <article className="summary-card profile-preview-card">
            {formState.avatarUrl ? (
              <img
                src={formState.avatarUrl}
                alt={displayName || "Profile"}
                className="profile-avatar"
                loading="lazy"
              />
            ) : (
              <div className="profile-avatar profile-avatar--fallback">
                <span>{formState.favoriteEmoji || "🥗"}</span>
              </div>
            )}

            <div className="profile-preview-card__copy">
              <h3>{displayName || "Bell Fresh guest"}</h3>
              <p>{currentUser ? `@${currentUser.username}` : "@guest"}</p>
              <p>{formState.bio || "Add a short vibe, favorite order, or intro for your profile."}</p>
            </div>

            <div className="profile-preview-card__meta">
              <span>{formState.favoriteEmoji || "🥗"} Favorite emoji</span>
              <span>{formState.savedAddress ? "📍 Address saved" : "📍 Add your delivery address"}</span>
              <span>{formState.googleEmail || formState.facebook ? "🔗 Socials linked" : "🔗 Add your socials"}</span>
            </div>
          </article>

          <form className="summary-card profile-form-card" onSubmit={handleSaveProfile}>
            <div className="field-grid field-grid--auth">
              <label>
                <span>First name</span>
                <input
                  type="text"
                  value={formState.firstName}
                  onChange={(event) => handleFieldChange("firstName", event.target.value)}
                  placeholder="First name"
                />
              </label>
              <label>
                <span>Last name</span>
                <input
                  type="text"
                  value={formState.lastName}
                  onChange={(event) => handleFieldChange("lastName", event.target.value)}
                  placeholder="Last name"
                />
              </label>
            </div>

            <div className="field-grid field-grid--auth">
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) => handleFieldChange("email", event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label>
                <span>Phone</span>
                <input
                  type="tel"
                  value={formState.phone}
                  onChange={(event) => handleFieldChange("phone", event.target.value)}
                  placeholder="09XXXXXXXXX"
                />
              </label>
            </div>

            <div className="field-grid field-grid--auth">
              <label>
                <span>Profile photo URL</span>
                <input
                  type="url"
                  value={formState.avatarUrl}
                  onChange={(event) => handleFieldChange("avatarUrl", event.target.value)}
                  placeholder="https://image-link.com/photo.jpg"
                />
              </label>
              <label>
                <span>Favorite emoji</span>
                <div className="profile-emoji-row">
                  <input
                    type="text"
                    value={formState.favoriteEmoji}
                    onChange={(event) => handleFieldChange("favoriteEmoji", event.target.value)}
                    placeholder="🥤"
                    maxLength={8}
                  />
                  <EmojiPicker
                    buttonLabel={formState.favoriteEmoji || "😊"}
                    title="Choose your favorite emoji"
                    onSelect={(emoji) => handleFieldChange("favoriteEmoji", emoji)}
                  />
                </div>
              </label>
            </div>

            <label>
              <span>Short bio</span>
              <textarea
                value={formState.bio}
                onChange={(event) => handleFieldChange("bio", event.target.value)}
                placeholder="Say something about your go-to order or favorite Bell Fresh combo."
              />
            </label>

            <div className="field-grid field-grid--auth">
              <label>
                <span>Facebook link</span>
                <input
                  type="url"
                  value={formState.facebook}
                  onChange={(event) => handleFieldChange("facebook", event.target.value)}
                  placeholder="https://facebook.com/your-name"
                />
              </label>
              <label>
                <span>Google email</span>
                <input
                  type="email"
                  value={formState.googleEmail}
                  onChange={(event) => handleFieldChange("googleEmail", event.target.value)}
                  placeholder="you@gmail.com"
                />
              </label>
            </div>

            <label>
              <span>GitHub profile</span>
              <input
                type="url"
                value={formState.github}
                onChange={(event) => handleFieldChange("github", event.target.value)}
                placeholder="https://github.com/your-name"
              />
            </label>

            <label>
              <span>Default delivery address</span>
              <textarea
                value={formState.savedAddress}
                onChange={(event) => handleFieldChange("savedAddress", event.target.value)}
                placeholder="Street, barangay, city, landmark, and delivery notes"
              />
            </label>

            <div className="checkout-form-card__actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setFormState(buildProfileFormState(currentUser))}
              >
                Reset
              </button>
              <button type="submit" className="cta-link" disabled={isSavingProfile}>
                {isSavingProfile ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="menu-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Account backup</p>
            <h2>Take your Bell Fresh account to another browser</h2>
            <p className="section-copy">
              Download your saved account, then restore it from the login screen if you switch browsers or devices.
            </p>
          </div>
        </div>

        <article className="summary-card profile-backup-card">
          <p className="summary-note">
            Automatic cross-device sync still needs a real backend, but your backup file keeps this profile recoverable anywhere.
          </p>
          <div className="checkout-form-card__actions">
            <button type="button" className="ghost-button" onClick={handleDownloadBackup}>
              Download backup
            </button>
            <button
              type="button"
              className="cta-link cta-link--soft"
              onClick={() => backupInputRef.current?.click()}
            >
              Restore backup here
            </button>
            <input
              ref={backupInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => void handleImportBackup(event)}
            />
          </div>
        </article>
      </section>

      <section className="menu-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your usual order</p>
            <h2>Bell Fresh remembers the things you come back to</h2>
          </div>
        </div>

        {usualOrderProducts.length > 0 ? (
          <div className="menu-grid">
            {usualOrderProducts.map((product) => (
              <MenuCard
                key={`usual-${product.id}`}
                product={product}
                actionLabel={product.category === "milk-tea" ? "Open on Menu" : "Order Again"}
                onAction={() => handleProductAction(product)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>Your usual order is still learning.</h2>
            <p>Place an order or browse the menu and Bell Fresh will start personalizing this page.</p>
            <button type="button" className="cta-link" onClick={() => navigateTo("/menu")}>
              Browse Menu
            </button>
          </div>
        )}
      </section>

      {recentlyViewedProducts.length > 0 ? (
        <section className="menu-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recently viewed</p>
              <h2>Pick up where you left off</h2>
            </div>
          </div>

          <div className="menu-grid">
            {recentlyViewedProducts.slice(0, 4).map((product) => (
              <MenuCard
                key={`recent-${product.id}`}
                product={product}
                actionLabel={product.category === "milk-tea" ? "Open on Menu" : "Add Again"}
                onAction={() => handleProductAction(product)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="menu-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">You might also like</p>
            <h2>Fresh picks for your next order</h2>
          </div>
        </div>

        <div className="menu-grid">
          {recommendedProducts.map((product) => (
            <MenuCard
              key={`recommended-${product.id}`}
              product={product}
              actionLabel={product.category === "milk-tea" ? "Open on Menu" : "Add to Cart"}
              onAction={() => handleProductAction(product)}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
