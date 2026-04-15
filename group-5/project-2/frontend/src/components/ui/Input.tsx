"use client";

import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-text-secondary text-sm mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-black/50 border-0 border-b-2 px-4 h-12
            ${error ? "border-error" : "border-white/20 focus-visible:border-[#F7931A]"}
            text-text-primary placeholder:text-white/30 text-sm
            outline-none focus-visible:outline-none
            focus-visible:shadow-glow-input
            transition-all duration-200
            font-body
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-error text-sm mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
