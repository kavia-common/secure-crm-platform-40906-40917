import React from "react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/primitives/Button";
import "../components/forms/base.css";

/**
 * PUBLIC_INTERFACE
 * AuthLogin renders login form (stubbed) and triggers auth context login.
 */
export default function AuthLogin() {
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const pwd = e.target.password.value;
    await login(email, pwd);
  };

  return (
    <div style={{ maxWidth: 420, margin: "10vh auto", background: "var(--color-surface)", padding: 24, borderRadius: 10, boxShadow: "var(--shadow-lg)" }}>
      <h1>Sign in</h1>
      <form onSubmit={handleLogin} aria-label="Login form">
        <label>
          Email
          <input name="email" type="email" required aria-required="true" aria-label="Email" />
        </label>
        <label>
          Password
          <input name="password" type="password" required aria-required="true" aria-label="Password" />
        </label>
        <div style={{ marginTop: 12 }}>
          <Button type="submit">Login</Button>
        </div>
      </form>
    </div>
  );
}
