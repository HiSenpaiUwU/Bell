import { useEffect } from "react";
import { useAppLocation } from "../../hooks/useAppLocation";

export function RouteScrollToTop() {
  const { pathname } = useAppLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
