import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getApiClient } from "../services/apiClient";

const AuthCtx = createContext(null);

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
          // Mocked login path: generate local tokens
          const fakeToken = btoa(`${emailOrUsername}:${Date.now()}`);
          setToken(fakeToken);
          setRefreshToken(null);
          setUser({ id: "u1", email: emailOrUsername, name: "Demo User" });
        }
        return true;
      } catch (e) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Login failed";
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
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setAuthError(null);
    if (navigate) navigate("/login", { replace: true });
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
      ...value,
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
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
