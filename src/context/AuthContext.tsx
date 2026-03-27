import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import {
  AuthResult,
  CheckoutDetails,
  PasswordResetRequest,
  ProfileUpdateInput,
  RegisterInput,
  SocialProvider,
  User,
  UserRole,
} from "../types";
import { repairMojibakeText, repairOptionalText } from "../utils/text";

interface AuthSession {
  userId: string;
  role: UserRole;
}

interface LegacyUserRecord {
  username?: string;
  password?: string;
}

interface UserBackupPayload {
  version: 1;
  exportedAt: string;
  user: User;
}

interface AuthContextValue {
  currentUser: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  users: User[];
  passwordResetRequests: PasswordResetRequest[];
  login: (identifier: string, password: string) => AuthResult;
  loginAdmin: (identifier: string, password: string) => AuthResult;
  register: (input: RegisterInput) => AuthResult;
  continueWithProvider: (provider: SocialProvider, identifier?: string) => AuthResult;
  updateProfile: (input: ProfileUpdateInput) => AuthResult;
  saveCheckoutDefaults: (details: CheckoutDetails) => AuthResult;
  exportCurrentUserBackup: () => {
    success: boolean;
    message: string;
    fileName?: string;
    content?: string;
  };
  importUserBackup: (content: string) => AuthResult;
  logout: () => void;
  removeUser: (userId: string) => AuthResult;
  requestPasswordReset: (
    identifier: string,
    nextPassword: string,
    note?: string,
  ) => AuthResult;
  approvePasswordReset: (requestId: string) => AuthResult;
  rejectPasswordReset: (requestId: string) => AuthResult;
}

const USERS_STORAGE_KEY = "users";
const SESSION_STORAGE_KEY = "session";
const PASSWORD_RESET_REQUESTS_STORAGE_KEY = "passwordResetRequests";
const LEGACY_USER_STORAGE_KEY = "user";
const LEGACY_LOGIN_STORAGE_KEY = "loggedIn";
const LEGACY_USERNAME_STORAGE_KEY = "username";
const ADMIN_USER_ID = "admin-bell-fresh";
const SOCIAL_PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: "Google",
  facebook: "Facebook",
};
const LEGACY_PROVIDER_PASSWORD_PATTERN = /demo|guest|provider|social/i;

const DEFAULT_ADMIN_USER: User = {
  id: ADMIN_USER_ID,
  role: "admin",
  username: "bellfreshadmin",
  firstName: "Bell",
  lastName: "Owner",
  email: "owner@bellfresh.local",
  phone: "09170000000",
  github: "https://github.com/bellfresh-admin",
  bio: "Owner dashboard for Bell Fresh analytics, messaging, and community updates.",
  favoriteEmoji: "👨‍💼",
  password: "BellFreshAdmin2026!",
  createdAt: "2026-03-23T00:00:00.000Z",
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function generateId(prefix = "user") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function trimOptional(value?: string) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : undefined;
}

function sanitizeStoredUser(user: User): User {
  return {
    ...user,
    id: user.id?.trim() || generateId(),
    role: user.role === "admin" ? "admin" : "customer",
    username: repairMojibakeText(user.username?.trim() || ""),
    firstName: repairMojibakeText(user.firstName?.trim() || ""),
    lastName: repairMojibakeText(user.lastName?.trim() || ""),
    email: user.email?.trim().toLowerCase() || "",
    phone: user.phone?.trim() || "",
    github: trimOptional(user.github),
    avatarUrl: trimOptional(user.avatarUrl),
    bio: repairOptionalText(user.bio),
    favoriteEmoji: repairOptionalText(user.favoriteEmoji),
    password: user.password?.trim() || "",
    socialLinks: user.socialLinks
      ? {
          facebook: trimOptional(user.socialLinks.facebook),
          googleEmail: trimOptional(user.socialLinks.googleEmail)?.toLowerCase(),
        }
      : undefined,
    savedCheckoutDetails: buildSavedCheckoutDetails(user.savedCheckoutDetails),
    createdAt: user.createdAt || new Date().toISOString(),
  };
}

function buildSavedCheckoutDetails(details?: CheckoutDetails | null) {
  if (!details) {
    return undefined;
  }

  const fullName = details.fullName.trim();
  const address = details.address.trim();

  if (!fullName && !address) {
    return undefined;
  }

  return {
    fullName,
    address,
  };
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string) {
  return phone.replace(/\D/g, "").length >= 7;
}

function normalizeSocialReference(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function getProviderReference(user: User, provider: SocialProvider) {
  if (provider === "google") {
    return user.socialLinks?.googleEmail?.toLowerCase();
  }

  return user.socialLinks?.facebook
    ? normalizeSocialReference(user.socialLinks.facebook)
    : undefined;
}

function isLegacyProviderPlaceholder(user: User) {
  const normalizedEmail = user.email.trim().toLowerCase();
  const normalizedUsername = user.username.trim().toLowerCase();
  const normalizedBio = user.bio?.trim().toLowerCase() ?? "";
  const hasLinkedProvider =
    Boolean(user.socialProvider) ||
    Boolean(user.socialLinks?.googleEmail) ||
    Boolean(user.socialLinks?.facebook);
  const looksTemporary =
    Boolean(user.socialProvider) ||
    LEGACY_PROVIDER_PASSWORD_PATTERN.test(user.password) ||
    normalizedUsername.includes("guest") ||
    normalizedBio.includes("guest") ||
    normalizedBio.includes("quick access") ||
    normalizedBio.includes("demo");

  return (
    user.role === "customer" &&
    hasLinkedProvider &&
    normalizedEmail.endsWith("@bellfresh.local") &&
    looksTemporary
  );
}

function matchesProviderLoginCandidate(
  user: User,
  provider: SocialProvider,
  identifier?: string,
) {
  const trimmedIdentifier = identifier?.trim();

  if (!trimmedIdentifier) {
    return true;
  }

  const normalizedIdentifier = normalizeIdentifier(trimmedIdentifier);
  const providerReference = getProviderReference(user, provider);

  return (
    user.username.toLowerCase() === normalizedIdentifier ||
    user.email.toLowerCase() === normalizedIdentifier ||
    providerReference?.includes(
      provider === "facebook"
        ? normalizeSocialReference(trimmedIdentifier)
        : normalizedIdentifier,
    ) === true
  );
}

function matchesIdentifier(user: User, identifier: string) {
  const normalizedIdentifier = normalizeIdentifier(identifier);

  return (
    user.username.toLowerCase() === normalizedIdentifier ||
    user.email.toLowerCase() === normalizedIdentifier ||
    user.socialLinks?.googleEmail?.toLowerCase() === normalizedIdentifier
  );
}

function sanitizeImportedUser(rawUser: User): User | null {
  const username = rawUser.username?.trim();
  const firstName = rawUser.firstName?.trim();
  const lastName = rawUser.lastName?.trim();
  const email = rawUser.email?.trim().toLowerCase();
  const phone = rawUser.phone?.trim();
  const password = rawUser.password?.trim();

  if (!username || !firstName || !lastName || !email || !phone || !password) {
    return null;
  }

  return {
    ...rawUser,
    id: rawUser.id?.trim() || generateId(),
    role: "customer",
    username: repairMojibakeText(username),
    firstName: repairMojibakeText(firstName),
    lastName: repairMojibakeText(lastName),
    email,
    phone,
    password,
    github: trimOptional(rawUser.github),
    avatarUrl: trimOptional(rawUser.avatarUrl),
    bio: repairOptionalText(rawUser.bio),
    favoriteEmoji: repairOptionalText(rawUser.favoriteEmoji),
    socialLinks: rawUser.socialLinks
      ? {
          facebook: trimOptional(rawUser.socialLinks.facebook),
          googleEmail: trimOptional(rawUser.socialLinks.googleEmail)?.toLowerCase(),
        }
      : undefined,
    createdAt: rawUser.createdAt || new Date().toISOString(),
  };
}

function buildLegacyUser(legacyUser: LegacyUserRecord): User | null {
  const username = legacyUser.username?.trim();
  const password = legacyUser.password?.trim();

  if (!username || !password) {
    return null;
  }

  return {
    id: generateId(),
    role: "customer",
    username,
    firstName: username,
    lastName: "Customer",
    email: `${username.toLowerCase()}@bellfresh.local`,
    phone: "0000000000",
    password,
    createdAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [users, setUsers] = useLocalStorageState<User[]>(USERS_STORAGE_KEY, [
    DEFAULT_ADMIN_USER,
  ]);
  const [session, setSession] = useLocalStorageState<AuthSession | null>(
    SESSION_STORAGE_KEY,
    null,
  );
  const [passwordResetRequests, setPasswordResetRequests] =
    useLocalStorageState<PasswordResetRequest[]>(
      PASSWORD_RESET_REQUESTS_STORAGE_KEY,
      [],
    );

  useEffect(() => {
    setUsers((currentUsers) => {
      let nextUsers = currentUsers.map((user) => sanitizeStoredUser(user)).filter(
        (user) => !isLegacyProviderPlaceholder(user),
      );

      if (!nextUsers.some((user) => user.id === ADMIN_USER_ID)) {
        nextUsers = [DEFAULT_ADMIN_USER, ...nextUsers];
      }

      if (typeof window === "undefined") {
        return nextUsers;
      }

      const legacyRaw = window.localStorage.getItem(LEGACY_USER_STORAGE_KEY);

      if (!legacyRaw) {
        window.localStorage.removeItem(LEGACY_LOGIN_STORAGE_KEY);
        window.localStorage.removeItem(LEGACY_USERNAME_STORAGE_KEY);
        return nextUsers;
      }

      try {
        const legacyUser = JSON.parse(legacyRaw) as LegacyUserRecord;
        const migratedUser = buildLegacyUser(legacyUser);

        if (
          migratedUser &&
          !nextUsers.some(
            (user) =>
              user.username.toLowerCase() === migratedUser.username.toLowerCase(),
          )
        ) {
          nextUsers = [...nextUsers, migratedUser];
        }
      } catch {
        window.localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
      }

      window.localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_LOGIN_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_USERNAME_STORAGE_KEY);

      return nextUsers;
    });
  }, [setUsers]);

  useEffect(() => {
    setPasswordResetRequests((currentRequests) =>
      currentRequests.filter((request) =>
        users.some((user) => user.id === request.userId),
      ),
    );
  }, [setPasswordResetRequests, users]);

  const currentUser = useMemo(() => {
    if (!session) {
      return null;
    }

    return users.find((user) => user.id === session.userId) ?? null;
  }, [session, users]);

  useEffect(() => {
    if (session && !currentUser) {
      setSession(null);
    }
  }, [currentUser, session, setSession]);

  const loginWithRole = (
    identifier: string,
    password: string,
    expectedRole: UserRole,
  ): AuthResult => {
    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();

    if (!trimmedIdentifier || !trimmedPassword) {
      return {
        success: false,
        message: "Please complete both login fields.",
      };
    }

    const matchedUser = users.find((user) => matchesIdentifier(user, trimmedIdentifier));

    if (!matchedUser) {
      return {
        success: false,
        message:
          expectedRole === "admin"
            ? "Admin account not found."
            : "No account found. Please register first.",
      };
    }

    if (matchedUser.role !== expectedRole) {
      return {
        success: false,
        message:
          expectedRole === "admin"
            ? "This account is not allowed in the admin login."
            : "Use the admin login for the admin account.",
      };
    }

    if (matchedUser.password !== trimmedPassword) {
      return {
        success: false,
        message: "Invalid login credentials.",
      };
    }

    setSession({ userId: matchedUser.id, role: matchedUser.role });

    return {
      success: true,
      message:
        expectedRole === "admin"
          ? `Welcome back, ${matchedUser.firstName}.`
          : `Welcome back, ${matchedUser.username}!`,
    };
  };

  const login = (identifier: string, password: string) => {
    return loginWithRole(identifier, password, "customer");
  };

  const loginAdmin = (identifier: string, password: string) => {
    return loginWithRole(identifier, password, "admin");
  };

  const register = ({
    username,
    firstName,
    lastName,
    email,
    phone,
    github,
    avatarUrl,
    favoriteEmoji,
    socialLinks,
    password,
  }: RegisterInput): AuthResult => {
    const trimmedUsername = username.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedGithub = trimOptional(github);
    const trimmedAvatarUrl = trimOptional(avatarUrl);
    const trimmedFavoriteEmoji = trimOptional(favoriteEmoji);
    const trimmedFacebook = trimOptional(socialLinks?.facebook);
    const trimmedGoogleEmail = trimOptional(socialLinks?.googleEmail)?.toLowerCase();
    const trimmedPassword = password.trim();

    if (
      !trimmedUsername ||
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      !trimmedPhone ||
      !trimmedPassword
    ) {
      return {
        success: false,
        message: "Please complete all required fields.",
      };
    }

    if (!validateEmail(trimmedEmail)) {
      return {
        success: false,
        message: "Please enter a valid email address.",
      };
    }

    if (!validatePhone(trimmedPhone)) {
      return {
        success: false,
        message: "Please enter a valid phone number.",
      };
    }

    if (trimmedGoogleEmail && !validateEmail(trimmedGoogleEmail)) {
      return {
        success: false,
        message: "Please enter a valid Google email address.",
      };
    }

    if (trimmedPassword.length < 6) {
      return {
        success: false,
        message: "Password must be at least 6 characters long.",
      };
    }

    if (
      users.some(
        (user) => user.username.toLowerCase() === trimmedUsername.toLowerCase(),
      )
    ) {
      return {
        success: false,
        message: "Username already exists.",
      };
    }

    if (users.some((user) => user.email.toLowerCase() === trimmedEmail)) {
      return {
        success: false,
        message: "Email already exists.",
      };
    }

    if (
      trimmedGoogleEmail &&
      users.some(
        (user) =>
          user.socialLinks?.googleEmail?.toLowerCase() === trimmedGoogleEmail,
      )
    ) {
      return {
        success: false,
        message: "That Google email is already linked to another account.",
      };
    }

    if (
      trimmedFacebook &&
      users.some(
        (user) =>
          user.socialLinks?.facebook &&
          normalizeSocialReference(user.socialLinks.facebook) ===
            normalizeSocialReference(trimmedFacebook),
      )
    ) {
      return {
        success: false,
        message: "That Facebook link is already linked to another account.",
      };
    }

    const nextUser: User = {
      id: generateId(),
      role: "customer",
      username: trimmedUsername,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
      phone: trimmedPhone,
      github: trimmedGithub,
      avatarUrl: trimmedAvatarUrl,
      favoriteEmoji: trimmedFavoriteEmoji,
      socialLinks:
        trimmedFacebook || trimmedGoogleEmail
          ? {
              facebook: trimmedFacebook,
              googleEmail: trimmedGoogleEmail,
            }
          : undefined,
      password: trimmedPassword,
      createdAt: new Date().toISOString(),
    };

    setUsers((currentUsers) => [...currentUsers, nextUser]);
    setSession(null);

    return {
      success: true,
      message:
        "Account created and saved successfully. Redirecting to login. Use backup restore later if you switch browsers.",
    };
  };

  const continueWithProvider = (
    provider: SocialProvider,
    identifier?: string,
  ): AuthResult => {
    const linkedUsers = users.filter(
      (user) =>
        user.role === "customer" &&
        !isLegacyProviderPlaceholder(user) &&
        Boolean(getProviderReference(user, provider)),
    );

    if (linkedUsers.length === 0) {
      return {
        success: false,
        message: `No Bell Fresh account is linked to ${SOCIAL_PROVIDER_LABELS[provider]} yet. Add your ${provider === "google" ? "Google email" : "Facebook link"} during registration or in Profile first.`,
      };
    }

    const matchedUsers = linkedUsers.filter((user) =>
      matchesProviderLoginCandidate(user, provider, identifier),
    );

    if (matchedUsers.length === 0) {
      return {
        success: false,
        message: `We could not match that ${SOCIAL_PROVIDER_LABELS[provider]} login to a saved linked account. Try your username, Bell Fresh email, or linked ${provider === "google" ? "Google email" : "Facebook name/link"}.`,
      };
    }

    if (matchedUsers.length > 1) {
      return {
        success: false,
        message: `More than one account is linked to ${SOCIAL_PROVIDER_LABELS[provider]}. Type your username or linked ${provider === "google" ? "Google email" : "Facebook name"} first, then tap the button again.`,
      };
    }

    const existingUser = matchedUsers[0];

    setSession({ userId: existingUser.id, role: existingUser.role });

    return {
      success: true,
      message: `${SOCIAL_PROVIDER_LABELS[provider]} linked login is ready. Welcome back, ${existingUser.firstName}!`,
    };
  };

  const updateProfile = ({
    firstName,
    lastName,
    email,
    phone,
    github,
    avatarUrl,
    bio,
    favoriteEmoji,
    socialLinks,
    savedCheckoutDetails,
  }: ProfileUpdateInput): AuthResult => {
    if (!currentUser) {
      return {
        success: false,
        message: "Please login before saving profile changes.",
      };
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedGithub = trimOptional(github);
    const trimmedAvatarUrl = trimOptional(avatarUrl);
    const trimmedBio = trimOptional(bio);
    const trimmedFavoriteEmoji = trimOptional(favoriteEmoji);
    const trimmedFacebook = trimOptional(socialLinks?.facebook);
    const trimmedGoogleEmail = trimOptional(socialLinks?.googleEmail)?.toLowerCase();
    const nextSavedCheckoutDetails = buildSavedCheckoutDetails(savedCheckoutDetails);

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedPhone) {
      return {
        success: false,
        message: "Please keep your name, email, and phone filled out.",
      };
    }

    if (!validateEmail(trimmedEmail)) {
      return {
        success: false,
        message: "Please enter a valid email address.",
      };
    }

    if (!validatePhone(trimmedPhone)) {
      return {
        success: false,
        message: "Please enter a valid phone number.",
      };
    }

    if (trimmedGoogleEmail && !validateEmail(trimmedGoogleEmail)) {
      return {
        success: false,
        message: "Please enter a valid Google email address.",
      };
    }

    const emailExists = users.some(
      (user) =>
        user.id !== currentUser.id && user.email.toLowerCase() === trimmedEmail,
    );

    if (emailExists) {
      return {
        success: false,
        message: "That email is already linked to another Bell Fresh account.",
      };
    }

    if (
      trimmedGoogleEmail &&
      users.some(
        (user) =>
          user.id !== currentUser.id &&
          user.socialLinks?.googleEmail?.toLowerCase() === trimmedGoogleEmail,
      )
    ) {
      return {
        success: false,
        message: "That Google email is already linked to another Bell Fresh account.",
      };
    }

    if (
      trimmedFacebook &&
      users.some(
        (user) =>
          user.id !== currentUser.id &&
          user.socialLinks?.facebook &&
          normalizeSocialReference(user.socialLinks.facebook) ===
            normalizeSocialReference(trimmedFacebook),
      )
    ) {
      return {
        success: false,
        message: "That Facebook link is already linked to another Bell Fresh account.",
      };
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              firstName: trimmedFirstName,
              lastName: trimmedLastName,
              email: trimmedEmail,
              phone: trimmedPhone,
              github: trimmedGithub,
              avatarUrl: trimmedAvatarUrl,
              bio: trimmedBio,
              favoriteEmoji: trimmedFavoriteEmoji,
              socialLinks:
                trimmedFacebook || trimmedGoogleEmail
                  ? {
                      facebook: trimmedFacebook,
                      googleEmail: trimmedGoogleEmail,
                    }
                  : undefined,
              savedCheckoutDetails: nextSavedCheckoutDetails,
            }
          : user,
      ),
    );

    return {
      success: true,
      message: "Profile saved successfully.",
    };
  };

  const saveCheckoutDefaults = (details: CheckoutDetails): AuthResult => {
    if (!currentUser) {
      return {
        success: false,
        message: "Please login before saving delivery details.",
      };
    }

    const nextSavedCheckoutDetails = buildSavedCheckoutDetails(details);

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              savedCheckoutDetails: nextSavedCheckoutDetails,
            }
          : user,
      ),
    );

    return {
      success: true,
      message: "Delivery details saved for your next order.",
    };
  };

  const exportCurrentUserBackup = () => {
    if (!currentUser || currentUser.role !== "customer") {
      return {
        success: false,
        message: "Login with a customer account before downloading a backup.",
      };
    }

    const payload: UserBackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      user: currentUser,
    };

    return {
      success: true,
      message: "Account backup is ready.",
      fileName: `bell-fresh-${currentUser.username}-backup.json`,
      content: JSON.stringify(payload, null, 2),
    };
  };

  const importUserBackup = (content: string): AuthResult => {
    try {
      const payload = JSON.parse(content) as UserBackupPayload;

      if (payload.version !== 1 || !payload.user) {
        return {
          success: false,
          message: "That backup file is not a valid Bell Fresh account backup.",
        };
      }

      const importedUser = sanitizeImportedUser(payload.user);

      if (!importedUser) {
        return {
          success: false,
          message: "That backup file is missing required account details.",
        };
      }

      if (importedUser.role === "admin") {
        return {
          success: false,
          message: "Admin accounts cannot be imported from backup here.",
        };
      }

      setUsers((currentUsers) => {
        const matchingUsers = currentUsers.filter(
          (user) =>
            user.role === "customer" &&
            (user.username.toLowerCase() === importedUser.username.toLowerCase() ||
              user.email.toLowerCase() === importedUser.email.toLowerCase()),
        );

        if (matchingUsers.length === 0) {
          return [...currentUsers, importedUser];
        }

        const matchedUser = matchingUsers[0];

        return currentUsers.map((user) =>
          user.id === matchedUser.id
            ? {
                ...importedUser,
                id: matchedUser.id,
                createdAt: matchedUser.createdAt || importedUser.createdAt,
              }
            : user,
        );
      });

      return {
        success: true,
        message: `Account backup restored for @${importedUser.username}. You can sign in now.`,
      };
    } catch {
      return {
        success: false,
        message: "That backup file could not be read.",
      };
    }
  };

  const requestPasswordReset = (
    identifier: string,
    nextPassword: string,
    note?: string,
  ): AuthResult => {
    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = nextPassword.trim();
    const trimmedNote = note?.trim();

    if (!trimmedIdentifier || !trimmedPassword) {
      return {
        success: false,
        message: "Enter your username or email and your new password request.",
      };
    }

    if (trimmedPassword.length < 6) {
      return {
        success: false,
        message: "Your new password request must be at least 6 characters.",
      };
    }

    const matchedUser = users.find(
      (user) => user.role === "customer" && matchesIdentifier(user, trimmedIdentifier),
    );

    if (!matchedUser) {
      return {
        success: false,
        message: "We could not find that customer account.",
      };
    }

    if (
      passwordResetRequests.some(
        (request) => request.userId === matchedUser.id && request.status === "pending",
      )
    ) {
      return {
        success: false,
        message: "A password reset request is already waiting for admin review.",
      };
    }

    const nextRequest: PasswordResetRequest = {
      id: generateId("reset"),
      userId: matchedUser.id,
      username: matchedUser.username,
      email: matchedUser.email,
      requestedPassword: trimmedPassword,
      note: trimmedNote || undefined,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setPasswordResetRequests((currentRequests) => [nextRequest, ...currentRequests]);

    return {
      success: true,
      message: "Password reset request sent. The admin can approve it from the dashboard.",
    };
  };

  const approvePasswordReset = (requestId: string): AuthResult => {
    const targetRequest = passwordResetRequests.find(
      (request) => request.id === requestId && request.status === "pending",
    );

    if (!targetRequest) {
      return {
        success: false,
        message: "That password reset request is no longer available.",
      };
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === targetRequest.userId
          ? { ...user, password: targetRequest.requestedPassword }
          : user,
      ),
    );

    setPasswordResetRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: "approved",
              resolvedAt: new Date().toISOString(),
              resolvedBy: currentUser?.username ?? DEFAULT_ADMIN_USER.username,
            }
          : request,
      ),
    );

    return {
      success: true,
      message: `Password updated for @${targetRequest.username}.`,
    };
  };

  const rejectPasswordReset = (requestId: string): AuthResult => {
    const targetRequest = passwordResetRequests.find(
      (request) => request.id === requestId && request.status === "pending",
    );

    if (!targetRequest) {
      return {
        success: false,
        message: "That password reset request is no longer available.",
      };
    }

    setPasswordResetRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: "rejected",
              resolvedAt: new Date().toISOString(),
              resolvedBy: currentUser?.username ?? DEFAULT_ADMIN_USER.username,
            }
          : request,
      ),
    );

    return {
      success: true,
      message: `Reset request rejected for @${targetRequest.username}.`,
    };
  };

  const removeUser = (userId: string): AuthResult => {
    const targetUser = users.find((user) => user.id === userId);

    if (!targetUser) {
      return {
        success: false,
        message: "That account no longer exists.",
      };
    }

    if (targetUser.id === ADMIN_USER_ID || targetUser.role === "admin") {
      return {
        success: false,
        message: "The private admin account cannot be removed here.",
      };
    }

    setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
    setPasswordResetRequests((currentRequests) =>
      currentRequests.filter((request) => request.userId !== userId),
    );

    if (session?.userId === userId) {
      setSession(null);
    }

    return {
      success: true,
      message: `Removed @${targetUser.username} from saved accounts.`,
    };
  };

  const logout = () => {
    setSession(null);
  };

  const value = useMemo(
    () => ({
      currentUser,
      isLoggedIn: Boolean(session && currentUser),
      isAdmin: currentUser?.role === "admin",
      users,
      passwordResetRequests,
      login,
      loginAdmin,
      register,
      continueWithProvider,
      updateProfile,
      saveCheckoutDefaults,
      exportCurrentUserBackup,
      importUserBackup,
      logout,
      removeUser,
      requestPasswordReset,
      approvePasswordReset,
      rejectPasswordReset,
    }),
    [currentUser, passwordResetRequests, session, users],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
