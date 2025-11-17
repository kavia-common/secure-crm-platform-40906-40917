import React from "react";
import { Controller } from "react-hook-form";
import "../forms/base.css";

/**
 * PUBLIC_INTERFACE
 * FieldError renders accessible error text for form fields.
 */
export function FieldError({ message, id }) {
  if (!message) return null;
  return (
    <div id={id} role="alert" style={{ color: "var(--color-error)", fontSize: 12 }}>
      {message}
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Input: text/email/password/number input with label, hint and error support.
 */
export function Input({
  label,
  name,
  type = "text",
  register,
  required,
  hint,
  error,
  ...rest
}) {
  const errId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <label htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        type={type}
        aria-invalid={!!error}
        aria-errormessage={errId}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        {...(register ? register(name, { required }) : {})}
        {...rest}
      />
      {hint ? (
        <div id={hintId} style={{ fontSize: 12, color: "rgba(17,24,39,.7)" }}>
          {hint}
        </div>
      ) : null}
      <FieldError id={errId} message={error} />
    </label>
  );
}

/**
 * PUBLIC_INTERFACE
 * Select: native select with options prop [{label,value}].
 */
export function Select({
  label,
  name,
  options = [],
  register,
  required,
  hint,
  error,
  ...rest
}) {
  const errId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <label htmlFor={name}>
      {label}
      <select
        id={name}
        name={name}
        aria-invalid={!!error}
        aria-errormessage={errId}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        {...(register ? register(name, { required }) : {})}
        {...rest}
      >
        {options.map((opt) => (
          <option key={String(opt.value)} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? (
        <div id={hintId} style={{ fontSize: 12, color: "rgba(17,24,39,.7)" }}>
          {hint}
        </div>
      ) : null}
      <FieldError id={errId} message={error} />
    </label>
  );
}

/**
 * PUBLIC_INTERFACE
 * TextArea: multi-line text input.
 */
export function TextArea({
  label,
  name,
  rows = 4,
  register,
  required,
  hint,
  error,
  ...rest
}) {
  const errId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <label htmlFor={name}>
      {label}
      <textarea
        id={name}
        name={name}
        rows={rows}
        aria-invalid={!!error}
        aria-errormessage={errId}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        {...(register ? register(name, { required }) : {})}
        {...rest}
      />
      {hint ? (
        <div id={hintId} style={{ fontSize: 12, color: "rgba(17,24,39,.7)" }}>
          {hint}
        </div>
      ) : null}
      <FieldError id={errId} message={error} />
    </label>
  );
}

/**
 * PUBLIC_INTERFACE
 * DatePicker: simple date input wrapper that can be used with react-hook-form Controller or register.
 */
export function DatePicker({ label, name, control, rules, error, hint, ...rest }) {
  const errId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;

  if (control) {
    return (
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field }) => (
          <label htmlFor={name}>
            {label}
            <input
              id={name}
              type="date"
              aria-invalid={!!error}
              aria-errormessage={errId}
              aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
              {...field}
              {...rest}
            />
            {hint ? (
              <div id={hintId} style={{ fontSize: 12, color: "rgba(17,24,39,.7)" }}>
                {hint}
              </div>
            ) : null}
            <FieldError id={errId} message={error} />
          </label>
        )}
      />
    );
  }

  return (
    <label htmlFor={name}>
      {label}
      <input
        id={name}
        name={name}
        type="date"
        aria-invalid={!!error}
        aria-errormessage={errId}
        aria-describedby={[hintId, errId].filter(Boolean).join(" ") || undefined}
        {...rest}
      />
      {hint ? (
        <div id={hintId} style={{ fontSize: 12, color: "rgba(17,24,39,.7)" }}>
          {hint}
        </div>
      ) : null}
      <FieldError id={errId} message={error} />
    </label>
  );
}
