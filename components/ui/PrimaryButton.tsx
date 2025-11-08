import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import "./PrimaryButton.css";

export interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

const PrimaryButton = forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ className, variant = "primary", children, ...props }, ref) => {
    const buttonClass = variant === "primary" ? "primaryButton" : "secondaryButton";
    
    return (
      <button
        className={cn(buttonClass, className)}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PrimaryButton.displayName = "PrimaryButton";

export default PrimaryButton;

