import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "legacy-form-control placeholder:text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
