import React from "react";

export type LogoProps = {
  variant?: "primary" | "horizontal" | "icon" | "monogram" | "white" | "gold";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean;
  alt?: string;
};

const variantToPath: Record<string, string> = {
  primary: "/brand/logo-primary.svg",
  horizontal: "/brand/logo-horizontal.svg",
  icon: "/brand/logo-icon.svg",
  monogram: "/brand/logo-monogram.svg",
  white: "/brand/logo-white.svg",
  gold: "/brand/logo-gold.svg",
};

const sizeToHeight: Record<string, number> = {
  sm: 32,
  md: 48,
  lg: 72,
  xl: 110,
};

export const Logo: React.FC<LogoProps> = ({
  variant = "primary",
  size = "md",
  className = "",
  priority = false,
  alt = "Golf Rivals Logo",
}) => {
  const src = variantToPath[variant] || variantToPath["primary"];
  const height = sizeToHeight[size] || 48;
  return (
    <img
      src={src}
      alt={alt}
      height={height}
      style={{ height, width: "auto", maxWidth: "100%", display: "block" }}
      className={className}
      loading={priority ? "eager" : "lazy"}
      draggable={false}
    />
  );
};
