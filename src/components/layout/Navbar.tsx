import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContextFixed";
import { useChatCommunity, useFeedCommunity } from "../../context/CommunityContext";
import { useNotifications } from "../../context/NotificationContext";
import { useRewards } from "../../context/RewardsContext";
import { useTheme } from "../../context/ThemeContext";
import { useAppLocation } from "../../hooks/useAppLocation";
import { navigateTo } from "../../utils/navigation";

function getNavButtonClass(isActive: boolean, isCta = false) {
  if (isCta) {
    return "cta-link cta-link--soft";
  }

  return isActive ? "nav-link active" : "nav-link";
}

export function Navbar() {
  const { currentUser, isAdmin, isLoggedIn, logout } = useAuth();
  const { notify } = useNotifications();
  const { availableCouponCount } = useRewards();
  const { itemCount } = useCart();
  const { getUnreadCount } = useChatCommunity();
  const { getUnreadPostCount, getUnreadStoryCount } = useFeedCommunity();
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useAppLocation();
  const logoutTimeoutRef = useRef<number | null>(null);
  const cartBounceTimeoutRef = useRef<number | null>(null);
  const previousItemCountRef = useRef(itemCount);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);
  const unreadMessages = isLoggedIn ? getUnreadCount() : 0;
  const unreadPosts = isLoggedIn ? getUnreadPostCount() : 0;
  const unreadStories = isLoggedIn ? getUnreadStoryCount() : 0;
  const unreadCommunityUpdates = unreadPosts + unreadStories;

  const isActivePath = (path: string) => pathname === path;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (logoutTimeoutRef.current) {
        window.clearTimeout(logoutTimeoutRef.current);
      }

      if (cartBounceTimeoutRef.current) {
        window.clearTimeout(cartBounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (itemCount > previousItemCountRef.current) {
      setIsCartBouncing(true);

      if (cartBounceTimeoutRef.current) {
        window.clearTimeout(cartBounceTimeoutRef.current);
      }

      cartBounceTimeoutRef.current = window.setTimeout(() => {
        setIsCartBouncing(false);
      }, 560);
    }

    previousItemCountRef.current = itemCount;
  }, [itemCount]);

  const handleLogout = () => {
    if (isLoggingOut) {
      return;
    }

    setMobileMenuOpen(false);
    setIsLoggingOut(true);

    const nextPath = isAdmin ? "/admin-login" : "/login";

    logoutTimeoutRef.current = window.setTimeout(() => {
      logout();
      notify({
        title: "Signed out",
        message: "Your session was ended successfully.",
        tone: "info",
      });
      navigateTo(nextPath, {
        replace: true,
        state: { message: "Signed out successfully." },
      });
      setIsLoggingOut(false);
    }, 850);
  };

  const renderPrimaryLinks = () => (
    <>
      <button
        type="button"
        className={getNavButtonClass(isActivePath("/"))}
        onClick={() => navigateTo("/")}
      >
        Home
      </button>
      <button
        type="button"
        className={getNavButtonClass(isActivePath("/menu"))}
        onClick={() => navigateTo("/menu")}
      >
        Menu
      </button>
      <button
        type="button"
        className={getNavButtonClass(isActivePath("/about") || isActivePath("/about/team"))}
        onClick={() => navigateTo("/about")}
      >
        About
      </button>
      {isLoggedIn && currentUser && !isAdmin ? (
        <button
          type="button"
          className={getNavButtonClass(isActivePath("/profile"))}
          onClick={() => navigateTo("/profile")}
        >
          Profile
        </button>
      ) : null}
      <button
        type="button"
        className={getNavButtonClass(isActivePath("/chat"))}
        onClick={() => navigateTo("/chat")}
      >
        {isLoggedIn && unreadMessages > 0 ? `Chat (${unreadMessages})` : "Chat"}
      </button>
      <button
        type="button"
        className={getNavButtonClass(isActivePath("/feed"))}
        onClick={() => navigateTo("/feed")}
      >
        {isLoggedIn && unreadCommunityUpdates > 0 ? `News (${unreadCommunityUpdates})` : "News"}
      </button>
    </>
  );

  const renderThemeToggle = () => (
    <button type="button" className="theme-toggle" onClick={toggleTheme}>
      {theme === "light" ? "\uD83C\uDF19 Dark Mode" : "\u2600\uFE0F Light Mode"}
    </button>
  );

  const renderCartButton = (className = "cart-badge") => (
    <button
      type="button"
      className={`${className}${isCartBouncing ? " is-bouncing" : ""}`}
      onClick={() => navigateTo("/cart")}
    >
      {`Cart (${itemCount})`}
    </button>
  );

  const renderAccountActions = (mobile = false) => {
    if (isLoggedIn && currentUser && isAdmin) {
      return (
        <>
          <button
            type="button"
            className="cart-badge cart-badge--admin"
            onClick={() => navigateTo("/admin")}
          >
            Admin Panel
          </button>
          <span className={mobile ? "profile-pill profile-pill--mobile" : "profile-pill"}>
            Admin, {currentUser.firstName}
          </span>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </>
      );
    }

    if (isLoggedIn && currentUser) {
      return (
        <>
          {renderCartButton()}
          <span className={mobile ? "profile-pill profile-pill--mobile" : "profile-pill"}>
            {`${currentUser.favoriteEmoji ?? "\uD83D\uDC4B"} ${currentUser.firstName} | ${availableCouponCount} rewards`}
          </span>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </>
      );
    }

    return (
      <>
        {renderCartButton()}
        <button
          type="button"
          className={getNavButtonClass(isActivePath("/login"))}
          onClick={() => navigateTo("/login")}
        >
          Login
        </button>
        <button
          type="button"
          className={getNavButtonClass(isActivePath("/register"), true)}
          onClick={() => navigateTo("/register")}
        >
          Register
        </button>
      </>
    );
  };

  return (
    <header className="site-header">
      <div className={`navbar shell${mobileMenuOpen ? " is-open" : ""}`}>
        <div className="navbar__bar">
          <button type="button" className="brand-mark" onClick={() => navigateTo("/")}>
            <span className="brand-mark__leaf">Bell</span>
            <span>Fresh</span>
          </button>

          <div className="navbar__desktop">
            <nav className="navbar-links" aria-label="Primary">
              {renderPrimaryLinks()}
            </nav>

            <div className="navbar-actions">
              {renderThemeToggle()}
              {renderAccountActions()}
            </div>
          </div>

          <button
            type="button"
            className="navbar-toggle"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((currentValue) => !currentValue)}
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </button>
        </div>

        <div id="mobile-navigation" className="navbar-mobile-panel">
          <nav className="navbar-links navbar-links--mobile" aria-label="Mobile primary">
            {renderPrimaryLinks()}
          </nav>

          <div className="navbar-actions navbar-actions--mobile">
            {renderThemeToggle()}
            {renderAccountActions(true)}
          </div>
        </div>
      </div>
    </header>
  );
}
