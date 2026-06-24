"use client";

import { forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AmountInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: number;
  onChange?: (value: number) => void;
  className?: string;
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(
      value !== undefined && value !== 0 ? String(value) : ""
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^0-9.]/g, "");
      setDisplayValue(raw);
      const num = parseFloat(raw) || 0;
      onChange?.(num);
    };

    const handleBlur = () => {
      const num = parseFloat(displayValue) || 0;
      if (num > 0) {
        setDisplayValue(num.toFixed(2));
      }
      onChange?.(num);
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[12px] font-medium">₹</span>
        <input
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            "w-full pl-7 pr-3 py-2 text-right text-[12px] font-medium border border-border-subtle rounded-md bg-white",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
            "placeholder:text-text-muted",
            className
          )}
          placeholder="0.00"
          inputMode="decimal"
          {...props}
        />
      </div>
    );
  }
);

AmountInput.displayName = "AmountInput";
