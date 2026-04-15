import React from "react";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "glass";
  hover?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const variantClasses = {
  default: "bg-card border border-white/10 rounded-2xl p-8",
  glass: "backdrop-blur-lg bg-white/5 border border-white/10 rounded-2xl p-8",
};

export function Card({
  children,
  variant = "default",
  hover = false,
  className = "",
  style,
}: CardProps) {
  return (
    <div
      className={`
        transition-all duration-300
        ${variantClasses[variant]}
        ${hover ? "hover:-translate-y-1 hover:border-[#F7931A]/50 hover:shadow-glow-card" : ""}
        ${className}
      `}
      style={style}
    >
      {children}
    </div>
  );
}
