import React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const variantStyles: Record<string, string> = {
  primary:
    "bg-[var(--gr-gold)] text-[var(--gr-carbon)] border-none hover:brightness-105",
  secondary:
    "bg-[var(--gr-carbon)] text-[var(--gr-sand)] border border-[var(--gr-border)] hover:bg-[var(--gr-midnight)]",
  danger:
    "bg-[var(--gr-danger)] text-[var(--gr-sand)] border-none hover:brightness-110",
  ghost:
    "bg-transparent text-[var(--gr-sand)] border-none hover:bg-[var(--gr-card)]",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2 text-base",
  lg: "px-7 py-3 text-lg",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  children,
  ...props
}) => {
  return (
    <button
      className={`rounded-full font-bold transition focus:outline-none focus:ring-2 focus:ring-[var(--gr-gold)] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
