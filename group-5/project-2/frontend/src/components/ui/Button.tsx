"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

const sizeClasses = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
  lg: "h-12 px-6 text-lg",
};

const variantClasses = {
  primary:
    "bg-gradient-to-r from-[#EA580C] to-[#F7931A] text-white uppercase tracking-wider font-semibold shadow-glow-orange hover:scale-105 hover:shadow-glow-orange-strong active:scale-95",
  secondary:
    "bg-transparent border-2 border-white/20 text-white hover:border-white hover:bg-white/10",
  ghost:
    "bg-transparent text-text-primary hover:bg-white/10 hover:text-[#F7931A]",
  link:
    "bg-transparent text-primary hover:underline",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        inline-flex items-center justify-center font-body rounded-full
        min-h-[44px] min-w-[44px]
        transition-all duration-200
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
