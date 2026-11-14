/**
 * Pastel module colors for dekurz — nav, timeline, quick-add, overview.
 * One tone per clinical source so the origin is obvious at a glance.
 */

import type { TimelineEventType } from "@/lib/timeline/types";

export type ChartSectionKey =
  | "overview"
  | "timeline"
  | "medications"
  | "observations"
  | "symptoms"
  | "lab"
  | "fluids"
  | "procedures"
  | "encounters"
  | "diagnoses"
  | "profile"
  | "notes";

/** Full Tailwind class sets — keep literals so the compiler can see them. */
export type SectionTone = {
  key: ChartSectionKey;
  /** Soft fill */
  bg: string;
  fg: string;
  border: string;
  accent: string;
  navActive: string;
  navIdle: string;
  card: string;
  chip: string;
  chipOn: string;
  iconWell: string;
  accentBar: string;
};

export const SECTION_TONES: Record<ChartSectionKey, SectionTone> = {
  overview: {
    key: "overview",
    bg: "bg-section-overview",
    fg: "text-section-overview-fg",
    border: "border-section-overview-border",
    accent: "bg-section-overview-accent",
    navActive:
      "bg-section-overview text-section-overview-fg font-medium ring-1 ring-section-overview-border",
    navIdle:
      "text-muted-foreground hover:bg-section-overview/80 hover:text-section-overview-fg",
    card: "border border-section-overview-border border-l-4 border-l-section-overview-accent bg-section-overview/55",
    chip: "border border-section-overview-border bg-section-overview text-section-overview-fg",
    chipOn:
      "border border-section-overview-accent bg-section-overview text-section-overview-fg ring-1 ring-section-overview-accent",
    iconWell: "bg-section-overview text-section-overview-fg",
    accentBar: "bg-section-overview-accent",
  },
  timeline: {
    key: "timeline",
    bg: "bg-section-timeline",
    fg: "text-section-timeline-fg",
    border: "border-section-timeline-border",
    accent: "bg-section-timeline-accent",
    navActive:
      "bg-section-timeline text-section-timeline-fg font-medium ring-1 ring-section-timeline-border",
    navIdle:
      "text-muted-foreground hover:bg-section-timeline/80 hover:text-section-timeline-fg",
    card: "border border-section-timeline-border border-l-4 border-l-section-timeline-accent bg-section-timeline/55",
    chip: "border border-section-timeline-border bg-section-timeline text-section-timeline-fg",
    chipOn:
      "border border-section-timeline-accent bg-section-timeline text-section-timeline-fg ring-1 ring-section-timeline-accent",
    iconWell: "bg-section-timeline text-section-timeline-fg",
    accentBar: "bg-section-timeline-accent",
  },
  medications: {
    key: "medications",
    bg: "bg-section-medications",
    fg: "text-section-medications-fg",
    border: "border-section-medications-border",
    accent: "bg-section-medications-accent",
    navActive:
      "bg-section-medications text-section-medications-fg font-medium ring-1 ring-section-medications-border",
    navIdle:
      "text-muted-foreground hover:bg-section-medications/80 hover:text-section-medications-fg",
    card: "border border-section-medications-border border-l-4 border-l-section-medications-accent bg-section-medications/55",
    chip: "border border-section-medications-border bg-section-medications text-section-medications-fg",
    chipOn:
      "border border-section-medications-accent bg-section-medications text-section-medications-fg ring-1 ring-section-medications-accent",
    iconWell: "bg-section-medications text-section-medications-fg",
    accentBar: "bg-section-medications-accent",
  },
  observations: {
    key: "observations",
    bg: "bg-section-observations",
    fg: "text-section-observations-fg",
    border: "border-section-observations-border",
    accent: "bg-section-observations-accent",
    navActive:
      "bg-section-observations text-section-observations-fg font-medium ring-1 ring-section-observations-border",
    navIdle:
      "text-muted-foreground hover:bg-section-observations/80 hover:text-section-observations-fg",
    card: "border border-section-observations-border border-l-4 border-l-section-observations-accent bg-section-observations/55",
    chip: "border border-section-observations-border bg-section-observations text-section-observations-fg",
    chipOn:
      "border border-section-observations-accent bg-section-observations text-section-observations-fg ring-1 ring-section-observations-accent",
    iconWell: "bg-section-observations text-section-observations-fg",
    accentBar: "bg-section-observations-accent",
  },
  symptoms: {
    key: "symptoms",
    bg: "bg-section-symptoms",
    fg: "text-section-symptoms-fg",
    border: "border-section-symptoms-border",
    accent: "bg-section-symptoms-accent",
    navActive:
      "bg-section-symptoms text-section-symptoms-fg font-medium ring-1 ring-section-symptoms-border",
    navIdle:
      "text-muted-foreground hover:bg-section-symptoms/80 hover:text-section-symptoms-fg",
    card: "border border-section-symptoms-border border-l-4 border-l-section-symptoms-accent bg-section-symptoms/55",
    chip: "border border-section-symptoms-border bg-section-symptoms text-section-symptoms-fg",
    chipOn:
      "border border-section-symptoms-accent bg-section-symptoms text-section-symptoms-fg ring-1 ring-section-symptoms-accent",
    iconWell: "bg-section-symptoms text-section-symptoms-fg",
    accentBar: "bg-section-symptoms-accent",
  },
  lab: {
    key: "lab",
    bg: "bg-section-lab",
    fg: "text-section-lab-fg",
    border: "border-section-lab-border",
    accent: "bg-section-lab-accent",
    navActive:
      "bg-section-lab text-section-lab-fg font-medium ring-1 ring-section-lab-border",
    navIdle:
      "text-muted-foreground hover:bg-section-lab/80 hover:text-section-lab-fg",
    card: "border border-section-lab-border border-l-4 border-l-section-lab-accent bg-section-lab/55",
    chip: "border border-section-lab-border bg-section-lab text-section-lab-fg",
    chipOn:
      "border border-section-lab-accent bg-section-lab text-section-lab-fg ring-1 ring-section-lab-accent",
    iconWell: "bg-section-lab text-section-lab-fg",
    accentBar: "bg-section-lab-accent",
  },
  fluids: {
    key: "fluids",
    bg: "bg-section-fluids",
    fg: "text-section-fluids-fg",
    border: "border-section-fluids-border",
    accent: "bg-section-fluids-accent",
    navActive:
      "bg-section-fluids text-section-fluids-fg font-medium ring-1 ring-section-fluids-border",
    navIdle:
      "text-muted-foreground hover:bg-section-fluids/80 hover:text-section-fluids-fg",
    card: "border border-section-fluids-border border-l-4 border-l-section-fluids-accent bg-section-fluids/55",
    chip: "border border-section-fluids-border bg-section-fluids text-section-fluids-fg",
    chipOn:
      "border border-section-fluids-accent bg-section-fluids text-section-fluids-fg ring-1 ring-section-fluids-accent",
    iconWell: "bg-section-fluids text-section-fluids-fg",
    accentBar: "bg-section-fluids-accent",
  },
  procedures: {
    key: "procedures",
    bg: "bg-section-procedures",
    fg: "text-section-procedures-fg",
    border: "border-section-procedures-border",
    accent: "bg-section-procedures-accent",
    navActive:
      "bg-section-procedures text-section-procedures-fg font-medium ring-1 ring-section-procedures-border",
    navIdle:
      "text-muted-foreground hover:bg-section-procedures/80 hover:text-section-procedures-fg",
    card: "border border-section-procedures-border border-l-4 border-l-section-procedures-accent bg-section-procedures/55",
    chip: "border border-section-procedures-border bg-section-procedures text-section-procedures-fg",
    chipOn:
      "border border-section-procedures-accent bg-section-procedures text-section-procedures-fg ring-1 ring-section-procedures-accent",
    iconWell: "bg-section-procedures text-section-procedures-fg",
    accentBar: "bg-section-procedures-accent",
  },
  encounters: {
    key: "encounters",
    bg: "bg-section-encounters",
    fg: "text-section-encounters-fg",
    border: "border-section-encounters-border",
    accent: "bg-section-encounters-accent",
    navActive:
      "bg-section-encounters text-section-encounters-fg font-medium ring-1 ring-section-encounters-border",
    navIdle:
      "text-muted-foreground hover:bg-section-encounters/80 hover:text-section-encounters-fg",
    card: "border border-section-encounters-border border-l-4 border-l-section-encounters-accent bg-section-encounters/55",
    chip: "border border-section-encounters-border bg-section-encounters text-section-encounters-fg",
    chipOn:
      "border border-section-encounters-accent bg-section-encounters text-section-encounters-fg ring-1 ring-section-encounters-accent",
    iconWell: "bg-section-encounters text-section-encounters-fg",
    accentBar: "bg-section-encounters-accent",
  },
  diagnoses: {
    key: "diagnoses",
    bg: "bg-section-diagnoses",
    fg: "text-section-diagnoses-fg",
    border: "border-section-diagnoses-border",
    accent: "bg-section-diagnoses-accent",
    navActive:
      "bg-section-diagnoses text-section-diagnoses-fg font-medium ring-1 ring-section-diagnoses-border",
    navIdle:
      "text-muted-foreground hover:bg-section-diagnoses/80 hover:text-section-diagnoses-fg",
    card: "border border-section-diagnoses-border border-l-4 border-l-section-diagnoses-accent bg-section-diagnoses/55",
    chip: "border border-section-diagnoses-border bg-section-diagnoses text-section-diagnoses-fg",
    chipOn:
      "border border-section-diagnoses-accent bg-section-diagnoses text-section-diagnoses-fg ring-1 ring-section-diagnoses-accent",
    iconWell: "bg-section-diagnoses text-section-diagnoses-fg",
    accentBar: "bg-section-diagnoses-accent",
  },
  profile: {
    key: "profile",
    bg: "bg-section-profile",
    fg: "text-section-profile-fg",
    border: "border-section-profile-border",
    accent: "bg-section-profile-accent",
    navActive:
      "bg-section-profile text-section-profile-fg font-medium ring-1 ring-section-profile-border",
    navIdle:
      "text-muted-foreground hover:bg-section-profile/80 hover:text-section-profile-fg",
    card: "border border-section-profile-border border-l-4 border-l-section-profile-accent bg-section-profile/55",
    chip: "border border-section-profile-border bg-section-profile text-section-profile-fg",
    chipOn:
      "border border-section-profile-accent bg-section-profile text-section-profile-fg ring-1 ring-section-profile-accent",
    iconWell: "bg-section-profile text-section-profile-fg",
    accentBar: "bg-section-profile-accent",
  },
  notes: {
    key: "notes",
    bg: "bg-section-notes",
    fg: "text-section-notes-fg",
    border: "border-section-notes-border",
    accent: "bg-section-notes-accent",
    navActive:
      "bg-section-notes text-section-notes-fg font-medium ring-1 ring-section-notes-border",
    navIdle:
      "text-muted-foreground hover:bg-section-notes/80 hover:text-section-notes-fg",
    card: "border border-section-notes-border border-l-4 border-l-section-notes-accent bg-section-notes/55",
    chip: "border border-section-notes-border bg-section-notes text-section-notes-fg",
    chipOn:
      "border border-section-notes-accent bg-section-notes text-section-notes-fg ring-1 ring-section-notes-accent",
    iconWell: "bg-section-notes text-section-notes-fg",
    accentBar: "bg-section-notes-accent",
  },
};

const HREF_PREFIXES: Array<{ prefix: string; key: ChartSectionKey }> = [
  { prefix: "/overview", key: "overview" },
  { prefix: "/timeline", key: "timeline" },
  { prefix: "/medications", key: "medications" },
  { prefix: "/observations", key: "observations" },
  { prefix: "/symptoms", key: "symptoms" },
  { prefix: "/lab", key: "lab" },
  { prefix: "/fluids", key: "fluids" },
  { prefix: "/procedures", key: "procedures" },
  { prefix: "/encounters", key: "encounters" },
  { prefix: "/diagnoses", key: "diagnoses" },
  { prefix: "/patients/", key: "profile" },
];

export function chartSectionFromPath(pathname: string): ChartSectionKey {
  for (const { prefix, key } of HREF_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}`)) {
      if (prefix === "/patients/") {
        // /patients list is kartotéka; only detail is profile
        if (pathname === "/patients" || pathname.startsWith("/patients?")) {
          return "overview";
        }
      }
      return key;
    }
  }
  return "overview";
}

export function chartSectionFromHref(href: string): ChartSectionKey | null {
  if (href.startsWith("/patients/") && href !== "/patients/active-profile") {
    return "profile";
  }
  if (href === "/patients/active-profile") return "profile";
  const match = HREF_PREFIXES.find(
    (h) => href === h.prefix || href.startsWith(`${h.prefix}/`),
  );
  return match?.key ?? null;
}

export const TIMELINE_SECTION: Record<TimelineEventType, ChartSectionKey> = {
  observation: "observations",
  medication_administration: "medications",
  clinical_note: "notes",
  symptom: "symptoms",
  diary_scale: "symptoms",
  lab_panel: "lab",
  fluid_balance: "fluids",
  procedure: "procedures",
  encounter: "encounters",
};

export function sectionTone(key: ChartSectionKey): SectionTone {
  return SECTION_TONES[key];
}

export function timelineSectionTone(type: TimelineEventType): SectionTone {
  return SECTION_TONES[TIMELINE_SECTION[type]];
}

export type QuickAddSectionAction =
  | "measurement"
  | "medication"
  | "symptom"
  | "note"
  | "lab"
  | "fluids";

const QUICK_ADD_SECTION: Record<QuickAddSectionAction, ChartSectionKey> = {
  measurement: "observations",
  medication: "medications",
  symptom: "symptoms",
  note: "notes",
  lab: "lab",
  fluids: "fluids",
};

export function quickAddSectionTone(action: QuickAddSectionAction): SectionTone {
  return SECTION_TONES[QUICK_ADD_SECTION[action]];
}
