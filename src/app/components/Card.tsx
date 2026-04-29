import React from "react";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "strong" | "gold" | "turf";
  className?: string;
};

const variantStyles: Record<string, string> = {
  default:
    "bg-[var(--gr-card)] border border-[var(--gr-border)]",
  strong:
    "bg-[var(--gr-card-strong)] border border-[var(--gr-border)]",
  gold:
    "bg-[var(--gr-card)] border-2 border-[var(--gr-gold-soft)]",
  turf:
    "bg-[var(--gr-card)] border-2 border-[var(--gr-turf-soft)]",
};

export const Card: React.FC<CardProps> = ({
  variant = "default",
  className = "",
  children,
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl shadow-sm p-4 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
