import { useEffect } from "react";
import { navigateTo } from "../../utils/navigation";

interface RedirectToProps {
  path: string;
  replace?: boolean;
  state?: unknown;
}

export function RedirectTo({ path, replace = false, state }: RedirectToProps) {
  useEffect(() => {
    navigateTo(path, { replace, state });
  }, [path, replace, state]);

  return null;
}
