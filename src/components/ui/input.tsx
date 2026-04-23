import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      className={cn(
        "legacy-form-control placeholder:text-muted-foreground",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
