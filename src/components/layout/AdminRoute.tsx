import { PropsWithChildren } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppLocation } from "../../hooks/useAppLocation";
import { RedirectTo } from "./RedirectTo";

export function AdminRoute({ children }: PropsWithChildren) {
  const { isAdmin, isLoggedIn } = useAuth();
  const { pathname } = useAppLocation();

  if (!isLoggedIn) {
    return (
      <RedirectTo
        path="/admin-login"
        replace
        state={{ from: pathname }}
      />
    );
  }

  if (!isAdmin) {
    return <RedirectTo path="/login" replace />;
  }

  return <>{children}</>;
}
