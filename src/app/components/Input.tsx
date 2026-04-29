import React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export const Input: React.FC<InputProps> = ({ className = "", ...props }) => {
  return (
    <input
      className={`w-full rounded-lg bg-[var(--gr-carbon)] border border-[var(--gr-border)] px-4 py-2 text-[var(--gr-sand)] placeholder-[var(--gr-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--gr-gold)] transition ${className}`}
      {...props}
    />
  );
};
