import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

const AuthCtx = createContext(null);

/**
 * PUBLIC_INTERFACE
 * AuthProvider provides auth state: user, token, login/logout (stubbed for now).
 */
export function AuthProvider({ children, value }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const login = useCallback(async (email, password) => {
    // Stub: accept any credentials and generate a fake token
    const fakeToken = btoa(`${email}:${Date.now()}`);
    setToken(fakeToken);
    setUser({ id: "u1", email, name: "Demo User" });
    return true;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const getToken = useCallback(async () => token, [token]);

  const ctx = useMemo(
    () => ({ user, token, login, logout, getToken, ...value }),
    [user, token, login, logout, getToken, value]
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
