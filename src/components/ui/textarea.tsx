import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "block min-h-[104px] w-full rounded-sm border border-[#cccccc] bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#66afe9] focus:ring-2 focus:ring-[#66afe9]/25",
        className,
      )}
      {...props}
    />
  );
}
