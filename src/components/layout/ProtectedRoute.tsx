import { PropsWithChildren } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppLocation } from "../../hooks/useAppLocation";
import { RedirectTo } from "./RedirectTo";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isLoggedIn } = useAuth();
  const { pathname } = useAppLocation();

  if (!isLoggedIn) {
    return (
      <RedirectTo
        path="/login"
        replace
        state={{ from: pathname }}
      />
    );
  }

  return <>{children}</>;
}
