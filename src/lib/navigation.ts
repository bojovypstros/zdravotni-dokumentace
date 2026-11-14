import {
  Activity,
  Beaker,
  ClipboardList,
  CalendarDays,
  Droplets,
  FolderOpen,
  LayoutDashboard,
  MoreHorizontal,
  Pill,
  Settings,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Show in desktop sidebar */
  desktop?: boolean;
  /** Show in mobile bottom nav */
  mobile?: boolean;
};

/** Phase 10 clinic nav — kartotéka + clinical modules. Czech labels. */
export const desktopNav: NavItem[] = [
  { href: "/patients", label: "Kartotéka", icon: FolderOpen, desktop: true },
  { href: "/overview", label: "Přehled", icon: LayoutDashboard, desktop: true },
  { href: "/timeline", label: "Časová osa", icon: ClipboardList, desktop: true },
  { href: "/medications", label: "Medikace", icon: Pill, desktop: true },
  { href: "/observations", label: "Vitální funkce", icon: Activity, desktop: true },
  { href: "/symptoms", label: "Symptomy a deník", icon: Stethoscope, desktop: true },
  { href: "/lab", label: "Laboratoř", icon: Beaker, desktop: true },
  { href: "/fluids", label: "Tekutiny", icon: Droplets, desktop: true },
  { href: "/procedures", label: "Výkony", icon: Syringe, desktop: true },
  { href: "/encounters", label: "Události", icon: CalendarDays, desktop: true },
  { href: "/diagnoses", label: "Diagnózy a alergie", icon: ClipboardList, desktop: true },
  { href: "/settings", label: "Nastavení", icon: Settings, desktop: true },
];

export const mobilePrimaryNav: NavItem[] = [
  { href: "/patients", label: "Kartotéka", icon: FolderOpen, mobile: true },
  { href: "/overview", label: "Přehled", icon: LayoutDashboard, mobile: true },
  { href: "/timeline", label: "Časová osa", icon: ClipboardList, mobile: true },
  { href: "/medications", label: "Medikace", icon: Pill, mobile: true },
  { href: "/settings", label: "Více", icon: MoreHorizontal, mobile: true },
];

/** Secondary links reachable from Settings (mobile „Více“). */
export const secondaryNav: NavItem[] = [
  { href: "/observations", label: "Vitální funkce", icon: Activity },
  { href: "/symptoms", label: "Symptomy a deník", icon: Stethoscope },
  { href: "/lab", label: "Laboratoř", icon: Beaker },
  { href: "/fluids", label: "Tekutiny", icon: Droplets },
  { href: "/procedures", label: "Výkony", icon: Syringe },
  { href: "/encounters", label: "Události / pobyty", icon: CalendarDays },
  { href: "/diagnoses", label: "Diagnózy a alergie", icon: ClipboardList },
];
