import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface IconTooltipProps {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  /** Délai avant ouverture (ms) — défaut 300 */
  delay?: number;
  children: React.ReactNode;
}

/**
 * Wrapper léger autour de Radix Tooltip pour les boutons-icônes des tables.
 * Bien plus propre que l'attribut `title` natif.
 */
export default function IconTooltip({ label, side = "top", delay = 300, children }: IconTooltipProps) {
  return (
    <TooltipProvider delayDuration={delay}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
