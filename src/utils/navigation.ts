const APP_NAVIGATION_EVENT = "bellfresh:navigate";

function sanitizePath(path: string) {
  const trimmedPath = path.trim();

  if (!trimmedPath) {
    return "/";
  }

  const withoutHash = trimmedPath.startsWith("#") ? trimmedPath.slice(1) : trimmedPath;
  const normalizedSlashPath = withoutHash.replace(/^\/+/, "/").replace(/\/{2,}/g, "/");

  if (!normalizedSlashPath) {
    return "/";
  }

  return normalizedSlashPath.startsWith("/") ? normalizedSlashPath : `/${normalizedSlashPath}`;
}

function normalizePath(path: string) {
  if (!path) {
    return "/";
  }

  if (path.startsWith("#/") || path.startsWith("#//")) {
    return sanitizePath(path.slice(1));
  }

  return sanitizePath(path);
}

function buildNavigationUrl(path: string) {
  return `#${normalizePath(path)}`;
}

export function getNavigationSnapshot() {
  return getCurrentPath();
}

export function getCurrentPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  const { hash, pathname } = window.location;

  if (hash.startsWith("#/") || hash.startsWith("#//")) {
    return normalizePath(hash);
  }

  if (!pathname || pathname === "/index.html") {
    return "/";
  }

  return normalizePath(pathname);
}

export function getNavigationState<T>() {
  if (typeof window === "undefined") {
    return null;
  }

  return (window.history.state as T | null) ?? null;
}

export function navigateTo(
  path: string,
  options?: { replace?: boolean; state?: unknown },
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedPath = normalizePath(path);
  const targetPath = buildNavigationUrl(normalizedPath);

  if (!options?.replace && typeof options?.state === "undefined") {
    if (window.location.hash === targetPath) {
      return;
    }

    window.location.hash = targetPath;
    return;
  }

  const method = options?.replace ? "replaceState" : "pushState";

  window.history[method](options?.state ?? null, "", targetPath);
  window.dispatchEvent(new Event(APP_NAVIGATION_EVENT));
}

export function subscribeToNavigation(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => {
    listener();
  };

  window.addEventListener("popstate", handleChange);
  window.addEventListener("hashchange", handleChange);
  window.addEventListener(APP_NAVIGATION_EVENT, handleChange);

  return () => {
    window.removeEventListener("popstate", handleChange);
    window.removeEventListener("hashchange", handleChange);
    window.removeEventListener(APP_NAVIGATION_EVENT, handleChange);
  };
}
