import React from "react";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "gold" | "turf" | "danger" | "warning" | "neutral";
  className?: string;
};

const variantStyles: Record<string, string> = {
  gold: "bg-[var(--gr-gold-soft)] text-[var(--gr-gold)] border border-[var(--gr-gold)]",
  turf: "bg-[var(--gr-turf-soft)] text-[var(--gr-turf)] border border-[var(--gr-turf)]",
  danger: "bg-[var(--gr-danger-soft)] text-[var(--gr-danger)] border border-[var(--gr-danger)]",
  warning: "bg-[var(--gr-warning)] text-[var(--gr-carbon)] border border-[var(--gr-warning)]",
  neutral: "bg-[var(--gr-card)] text-[var(--gr-sand)] border border-[var(--gr-border)]",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  className = "",
  children,
  ...props
}) => {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
