import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/wisejob-logo.png"
      alt="WiSEjOB"
      width={2172}
      height={724}
      priority={priority}
      className={cn("h-8 w-auto object-contain", className)}
    />
  );
}
