"use client";

import { usePathname } from "next/navigation";

import {
  chartSectionFromPath,
  sectionTone,
} from "@/lib/chart-section-colors";
import { cn } from "@/lib/utils";

/** Thin pastel edge under chart header — mirrors active dekurz module. */
export function ChartSectionAccent() {
  const pathname = usePathname();
  const tone = sectionTone(chartSectionFromPath(pathname));
  return (
    <div className={cn("h-0.5 w-full", tone.accentBar)} aria-hidden />
  );
}
