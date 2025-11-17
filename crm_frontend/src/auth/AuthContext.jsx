import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { configureApiAuth, getApiClient } from "../services/apiClient";

const AuthCtx = createContext(null);

// Feature flag: Dummy auth mode (DEV/DEMO ONLY).
// On by default. Set REACT_APP_FEATURE_DUMMY_AUTH=false to use real backend auth.
export const DUMMY_AUTH = String(process.env.REACT_APP_FEATURE_DUMMY_AUTH ?? "true") === "true";

/**
 * PUBLIC_INTERFACE
 * AuthProvider provides auth state: user, token, login/logout with API + localStorage persistence.
 */
export function AuthProvider({ children, value }) {
  const navigate = useNavigate?.() || null;

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem("auth_access_token");
    } catch {
      return null;
    }
  });
  const [refreshToken, setRefreshToken] = useState(() => {
    try {
      return localStorage.getItem("auth_refresh_token");
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const getToken = useCallback(async () => token, [token]);
  const api = useMemo(() => getApiClient(getToken), [getToken]);

  // Configure global API auth hooks for refresh + retry
  useEffect(() => {
    configureApiAuth({
      getAccessToken: async () => token,
      getRefreshToken: async () => refreshToken,
      onTokensUpdated: ({ access_token, refresh_token }) => {
        if (access_token) setToken(access_token);
        if (typeof refresh_token !== "undefined") setRefreshToken(refresh_token);
      },
      onLogout: async () => {
        // In dummy auth mode we never call backend for auth endpoints.
        if (!DUMMY_AUTH) {
          try {
            await api.post("/auth/logout");
          } catch {
            // ignore
          }
        }
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        setAuthError(null);
        if (navigate) navigate("/dashboard", { replace: true });
      },
    });
  }, [api, token, refreshToken, navigate]);

  // Persist changes
  useEffect(() => {
    try {
      if (token) localStorage.setItem("auth_access_token", token);
      else localStorage.removeItem("auth_access_token");
    } catch {}
  }, [token]);
  useEffect(() => {
    try {
      if (refreshToken) localStorage.setItem("auth_refresh_token", refreshToken);
      else localStorage.removeItem("auth_refresh_token");
    } catch {}
  }, [refreshToken]);
  useEffect(() => {
    try {
      if (user) localStorage.setItem("auth_user", JSON.stringify(user));
      else localStorage.removeItem("auth_user");
    } catch {}
  }, [user]);

  // Auto sign-in in DEMO mode to skip login page entirely.
  useEffect(() => {
    if (DUMMY_AUTH && !token && !user && !authLoading) {
      const email = "demo@example.com";
      const name = "Demo User";
      setToken("dummy-token");
      setRefreshToken(null);
      setUser({ id: "dummy", email, name, roles: ["user"] });
    }
  }, [token, user, authLoading]);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      if (data) setUser(data);
    } catch {
      // Ignore profile failure in demo
    }
  }, [api]);

  const login = useCallback(
    async (emailOrUsername, password) => {
      setAuthError(null);
      setAuthLoading(true);
      try {
        // DUMMY AUTH: Accept any credentials, create mock token/user, and skip network completely.
        if (DUMMY_AUTH) {
          const fakeToken = "dummy-token";
          setToken(fakeToken);
          setRefreshToken(null);
          // Derive a friendly name from email/username for demo
          const name =
            (emailOrUsername || "")
              .split("@")[0]
              .replace(/[^a-z0-9]+/gi, " ")
              .trim() || "Demo User";
          setUser({ id: "dummy", email: emailOrUsername, name, roles: ["user"] });
          return true;
        }

        const enableApi = String(process.env.REACT_APP_FEATURE_ENABLE_API || "true") === "true";
        if (enableApi) {
          // backend spec: POST /api/v1/auth/login with {username,password}
          const { data } = await api.post("/auth/login", {
            username: emailOrUsername,
            password,
          });
          const access = data?.access_token;
          const refresh = data?.refresh_token;
          if (!access) throw new Error("No access token returned");
          setToken(access);
          setRefreshToken(refresh || null);
          await fetchProfile();
        } else {
          // Mocked login path: generate local tokens (API disabled globally)
          const fakeToken = btoa(`${emailOrUsername}:${Date.now()}`);
          setToken(fakeToken);
          setRefreshToken(null);
          setUser({ id: "u1", email: emailOrUsername, name: "Demo User" });
        }
        return true;
      } catch (e) {
        // Build a user-friendly message without exposing secrets
        const base = api?.defaults?.baseURL || process.env.REACT_APP_API_BASE || "/api/v1";
        const hasResponse = !!e?.response;
        let msg;
        if (hasResponse) {
          const status = e.response?.status;
          if (status === 401 || status === 403) {
            msg = "Invalid credentials. Please check your email/username and password.";
          } else {
            msg = e?.response?.data?.message || `Server error (${status}). Please try again.`;
          }
        } else {
          // Network error or CORS/mixed-content
          const isHttps = typeof window !== "undefined" && window.location?.protocol === "https:";
          const apiIsHttp = /^http:\/\//i.test(String(base));
          const mixed = isHttps && apiIsHttp;
          msg = mixed
            ? "Network blocked: Frontend is HTTPS but API is HTTP. Use an HTTPS API URL or configure a dev proxy."
            : `Network error: could not reach API at ${base}. Check REACT_APP_API_BASE, backend availability, and CORS.`;
        }

        // Console log diagnostics for developers (no secrets)
        // eslint-disable-next-line no-console
        console.error("Login error", {
          code: e?.code,
          message: e?.message,
          baseURL: base,
          method: e?.config?.method,
          url: e?.config?.url,
          status: e?.response?.status,
          statusText: e?.response?.statusText,
          responseData: e?.response?.data,
        });

        setAuthError(msg);
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        return false;
      } finally {
        setAuthLoading(false);
      }
    },
    [api, fetchProfile]
  );

  const logout = useCallback(async () => {
    // In dummy auth mode we never call backend for auth endpoints.
    if (!DUMMY_AUTH) {
      try {
        await api.post("/auth/logout");
      } catch {
        // ignore
      }
    }
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setAuthError(null);
    if (navigate) navigate("/dashboard", { replace: true });
  }, [api, navigate]);

  const ctx = useMemo(
    () => ({
      user,
      token,
      refreshToken,
      authLoading,
      authError,
      login,
      logout,
      getToken,
      // Expose theme controls that are injected via AppProviders
      ...value,
      // Helpful flag for UI to show indicators
      dummyAuth: DUMMY_AUTH,
    }),
    [user, token, refreshToken, authLoading, authError, login, logout, getToken, value]
  );

  return <AuthCtx.Provider value={ctx}>{children}</AuthCtx.Provider>;
}

/**
 * PUBLIC_INTERFACE
 * useAuth exposes the auth context.
 */
export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * PUBLIC_INTERFACE
 * ProtectedRoute redirects to /login when not authenticated.
 */
export function ProtectedRoute() {
  const { token, dummyAuth } = useAuth();
  const location = useLocation();
  if (dummyAuth) return <Outlet />;
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
