import React from "react";
import clsx from "clsx";
import "./button.css";

/**
 * PUBLIC_INTERFACE
 * Button component with variants: primary, secondary, danger; sizes: sm, md, lg.
 */
export function Button({ children, variant = "primary", size = "md", className, ...rest }) {
  return (
    <button
      className={clsx("btn", `btn-${variant}`, `btn-${size}`, className)}
      {...rest}
    >
      {children}
    </button>
  );
}
