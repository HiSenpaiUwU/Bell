import { SupportChatbot } from "./components/chat/SupportChatbot";
import { AdminRoute } from "./components/layout/AdminRoute";
import { MainLayout } from "./components/layout/MainLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { RecoverablePageBoundary } from "./components/layout/RecoverablePageBoundary";
import { RedirectTo } from "./components/layout/RedirectTo";
import { RouteScrollToTop } from "./components/layout/RouteScrollToTop";
import { useAppLocation } from "./hooks/useAppLocation";
import { AboutPage } from "./pages/AboutPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminLoginPage } from "./pages/AdminLoginPage";
import { CartPage } from "./pages/CartPage";
import { ChatPage } from "./pages/ChatPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { MenuPage } from "./pages/MenuPage";
import { NewsFeedPage } from "./pages/NewsFeedPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReceiptPage } from "./pages/ReceiptPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TermsPage } from "./pages/TermsPage";

const COMMUNITY_STORAGE_KEYS = [
  "communityMessages",
  "communityPosts",
  "communityStories",
  "communityFeedSeen",
  "communityAutoFeedState",
];

function App() {
  const { pathname } = useAppLocation();

  const mainPage = (() => {
    switch (pathname) {
      case "/":
        return <HomePage />;
      case "/menu":
        return <MenuPage />;
      case "/about":
        return <AboutPage />;
      case "/about/team":
        return <AboutPage initialSection="team" />;
      case "/privacy":
        return <PrivacyPage />;
      case "/terms":
        return <TermsPage />;
      case "/cart":
        return (
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        );
      case "/checkout":
        return (
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        );
      case "/profile":
        return (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        );
      case "/chat":
        return (
          <RecoverablePageBoundary
            pageLabel="Chat"
            storageKeysToClear={COMMUNITY_STORAGE_KEYS}
          >
            <ChatPage />
          </RecoverablePageBoundary>
        );
      case "/chats":
      case "/messages":
        return <RedirectTo path="/chat" replace />;
      case "/feed":
        return (
          <ProtectedRoute>
            <RecoverablePageBoundary
              pageLabel="News feed"
              storageKeysToClear={COMMUNITY_STORAGE_KEYS}
              autoRepairKey="news-feed"
            >
              <NewsFeedPage />
            </RecoverablePageBoundary>
          </ProtectedRoute>
        );
      case "/customer/feed":
      case "/customer/news":
        return (
          <ProtectedRoute>
            <RedirectTo path="/feed" replace />
          </ProtectedRoute>
        );
      case "/admin/feed":
      case "/admin/news":
        return (
          <AdminRoute>
            <RedirectTo path="/feed" replace />
          </AdminRoute>
        );
      case "/feeds":
      case "/news":
      case "/live-feed":
        return <RedirectTo path="/feed" replace />;
      case "/admin":
        return (
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        );
      default:
        return null;
    }
  })();

  const standalonePage = (() => {
    switch (pathname) {
      case "/login":
        return <LoginPage />;
      case "/register":
        return <RegisterPage />;
      case "/forgot-password":
        return <ForgotPasswordPage />;
      case "/admin-login":
        return <AdminLoginPage />;
      case "/receipt":
        return (
          <ProtectedRoute>
            <ReceiptPage />
          </ProtectedRoute>
        );
      case "/home":
        return <RedirectTo path="/" replace />;
      default:
        return null;
    }
  })();

  return (
    <>
      <RouteScrollToTop />
      {mainPage ? (
        <MainLayout key={`main:${pathname}`}>{mainPage}</MainLayout>
      ) : (
        <div key={`standalone:${pathname}`}>{standalonePage ?? <NotFoundPage />}</div>
      )}
      <SupportChatbot />
    </>
  );
}

export default App;
