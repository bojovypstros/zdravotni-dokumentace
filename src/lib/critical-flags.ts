import type { CriticalFlagCode, CriticalFlagSeverity } from "@prisma/client";

export const CRITICAL_FLAG_CODES: CriticalFlagCode[] = [
  "FALL_RISK",
  "NPO",
  "ISOLATION",
  "CODE_STATUS",
  "ANTICOAGULATION",
  "RESTRICTED_EXTREMITY",
  "ASPIRATION_RISK",
  "SEIZURE_PRECAUTIONS",
  "LATEX_SENSITIVITY",
  "IMPLANT_DEVICE",
  "PREGNANCY",
  "CUSTOM",
];

export const CRITICAL_FLAG_LABELS: Record<CriticalFlagCode, string> = {
  FALL_RISK: "Riziko pádu",
  NPO: "NPO (nic per os)",
  ISOLATION: "Izolace / ochranný režim",
  CODE_STATUS: "Stav resuscitace / DVP",
  ANTICOAGULATION: "Antikoagulace / ↑ riziko krvácení",
  RESTRICTED_EXTREMITY: "Šetřit končetinu (limb alert)",
  ASPIRATION_RISK: "Riziko aspirace / dysfagie",
  SEIZURE_PRECAUTIONS: "Epilepsie / záchvatová pohotovost",
  LATEX_SENSITIVITY: "Citlivost na latex",
  IMPLANT_DEVICE: "Implantát / cizí těleso",
  PREGNANCY: "Těhotenství / nelze vyloučit",
  CUSTOM: "Vlastní upozornění",
};

/** Default severity from research table §4.1. */
export const CRITICAL_FLAG_DEFAULT_SEVERITY: Record<
  CriticalFlagCode,
  CriticalFlagSeverity
> = {
  FALL_RISK: "high",
  NPO: "critical",
  ISOLATION: "high",
  CODE_STATUS: "critical",
  ANTICOAGULATION: "high",
  RESTRICTED_EXTREMITY: "high",
  ASPIRATION_RISK: "high",
  SEIZURE_PRECAUTIONS: "high",
  LATEX_SENSITIVITY: "medium",
  IMPLANT_DEVICE: "medium",
  PREGNANCY: "high",
  CUSTOM: "medium",
};

export const CRITICAL_FLAG_SEVERITY_LABELS: Record<
  CriticalFlagSeverity,
  string
> = {
  critical: "Kritická",
  high: "Vysoká",
  medium: "Střední",
};
