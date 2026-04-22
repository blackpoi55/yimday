import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm border px-3 py-2 text-sm font-normal transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none",
  {
    variants: {
      variant: {
        primary: "border-[#4cae4c] bg-[#5cb85c] text-white hover:bg-[#449d44]",
        secondary: "border-[#46b8da] bg-[#5bc0de] text-white hover:bg-[#31b0d5]",
        outline: "border-border bg-white text-foreground hover:bg-[#e6e6e6]",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-[#f5f5f5]",
        danger: "border-[#d43f3a] bg-[#d9534f] text-white hover:bg-[#c9302c]",
      },
      size: {
        sm: "h-[30px] px-3",
        md: "h-[34px] px-3",
        lg: "h-[38px] px-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      type={type}
      {...props}
    />
  );
}
