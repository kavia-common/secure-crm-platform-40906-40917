import React from "react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/primitives/Button";
import { Input } from "../components/forms/Controls";
import "../components/forms/base.css";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * PUBLIC_INTERFACE
 * AuthLogin renders login form using RHF + Zod, calls AuthContext.login and handles loading/error.
 */
export default function AuthLogin() {
  const { login, authLoading, authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const schema = z.object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onSubmit",
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    const ok = await login(values.email, values.password);
    if (ok) {
      navigate(from, { replace: true });
    }
  };

  const loading = authLoading || isSubmitting;

  return (
    <div style={{ maxWidth: 420, margin: "10vh auto", background: "var(--color-surface)", padding: 24, borderRadius: 10, boxShadow: "var(--shadow-lg)" }}>
      <h1>Sign in</h1>
      {authError ? (
        <div role="alert" style={{ color: "var(--color-error)", marginTop: 8, marginBottom: 8 }}>
          {authError}
        </div>
      ) : null}
      <form onSubmit={handleSubmit(onSubmit)} aria-label="Login form" noValidate>
        <Input
          label="Email"
          name="email"
          type="email"
          register={register}
          required
          aria-required="true"
          aria-label="Email"
          autoFocus
          error={errors.email?.message}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          register={register}
          required
          aria-required="true"
          aria-label="Password"
          error={errors.password?.message}
        />
        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <Button type="submit" disabled={loading} aria-busy={loading}>
            {loading ? "Signing in…" : "Login"}
          </Button>
          <span aria-live="polite" style={{ fontSize: 12, opacity: 0.7 }}>
            {loading ? "Please wait…" : ""}
          </span>
        </div>
      </form>
      <p style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>
        Backend auth endpoint is expected at POST {process.env.REACT_APP_API_BASE || "/api/v1"}/auth/login
      </p>
    </div>
  );
}
