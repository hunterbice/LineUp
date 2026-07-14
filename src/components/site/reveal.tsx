import type { ElementType, ReactNode } from "react";

import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
}

/** Fades + lifts its children into view on scroll. */
export function Reveal({ children, className, delay = 0, as: Tag = "div" }: RevealProps) {
  const { ref, shown } = useReveal<HTMLDivElement>(delay);
  return (
    <Tag ref={ref} data-show={shown} className={cn("reveal", className)}>
      {children}
    </Tag>
  );
}
