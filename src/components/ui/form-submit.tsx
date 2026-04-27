"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type FormSubmitProps = {
  idleLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  className?: string;
};

export function FormSubmit({
  idleLabel,
  pendingLabel = "กำลังบันทึก...",
  variant = "primary",
  className,
}: FormSubmitProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} disabled={pending} className={className}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}
