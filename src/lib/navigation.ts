import {
  Activity,
  Beaker,
  ClipboardList,
  CalendarDays,
  Droplets,
  LayoutDashboard,
  MoreHorizontal,
  Pill,
  Stethoscope,
  Syringe,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Show in desktop chart top nav */
  desktop?: boolean;
  /** Show in mobile chart bottom nav */
  mobile?: boolean;
};

/**
 * Clinical modules inside the chart (dekurz) shell.
 * Kartotéka and Nastavení are outside this strip (leave button / account).
 */
export const chartNav: NavItem[] = [
  { href: "/overview", label: "Přehled", icon: LayoutDashboard, desktop: true, mobile: true },
  { href: "/timeline", label: "Časová osa", icon: ClipboardList, desktop: true, mobile: true },
  { href: "/medications", label: "Medikace", icon: Pill, desktop: true, mobile: true },
  { href: "/observations", label: "Vitální funkce", icon: Activity, desktop: true },
  { href: "/symptoms", label: "Symptomy a deník", icon: Stethoscope, desktop: true },
  { href: "/lab", label: "Laboratoř", icon: Beaker, desktop: true },
  { href: "/fluids", label: "Tekutiny", icon: Droplets, desktop: true },
  { href: "/procedures", label: "Výkony", icon: Syringe, desktop: true },
  { href: "/encounters", label: "Události", icon: CalendarDays, desktop: true },
  { href: "/diagnoses", label: "Diagnózy a alergie", icon: ClipboardList, desktop: true },
];

/** Mobile bottom primary slots (chart shell). Last slot is „Více“. */
export const chartMobilePrimaryNav: NavItem[] = [
  { href: "/overview", label: "Přehled", icon: LayoutDashboard, mobile: true },
  { href: "/timeline", label: "Časová osa", icon: ClipboardList, mobile: true },
  { href: "/medications", label: "Medikace", icon: Pill, mobile: true },
  { href: "/observations", label: "Vitály", icon: Activity, mobile: true },
  { href: "#more", label: "Více", icon: MoreHorizontal, mobile: true },
];

/** Modules reachable from mobile „Více“ (not in the 4 primary slots). */
export const chartMobileMoreNav: NavItem[] = [
  { href: "/symptoms", label: "Symptomy a deník", icon: Stethoscope },
  { href: "/lab", label: "Laboratoř", icon: Beaker },
  { href: "/fluids", label: "Tekutiny", icon: Droplets },
  { href: "/procedures", label: "Výkony", icon: Syringe },
  { href: "/encounters", label: "Události / pobyty", icon: CalendarDays },
  { href: "/diagnoses", label: "Diagnózy a alergie", icon: ClipboardList },
];

export const profileNavItem: NavItem = {
  href: "/patients/active-profile",
  label: "Profil",
  icon: UserRound,
  desktop: true,
};

/** @deprecated Use chartNav — kept for any leftover imports during migration. */
export const desktopNav = chartNav;
/** @deprecated Use chartMobilePrimaryNav */
export const mobilePrimaryNav = chartMobilePrimaryNav;
/** @deprecated Use chartMobileMoreNav */
export const secondaryNav = chartMobileMoreNav;
