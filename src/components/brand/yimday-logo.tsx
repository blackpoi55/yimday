import Image from "next/image";
import { cn } from "@/lib/utils";

type YimdayLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function YimdayLogo({
  size = 48,
  className,
  priority = false,
}: YimdayLogoProps) {
  return (
    <Image
      src="/pwa/icon-192.png"
      alt="Yimday logo"
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-[18px]", className)}
    />
  );
}
