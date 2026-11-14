import type { UserRole } from "@prisma/client";

/** Locked Phase 10 labels (Matěj). */
export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Vrchní lékař",
  DOCTOR: "Lékař",
};

export type StaffRole = UserRole;

export function isAdmin(role: UserRole | string): boolean {
  return role === "ADMIN";
}

export function isStaffRole(role: string): role is UserRole {
  return role === "ADMIN" || role === "DOCTOR";
}

/**
 * MVP permission helpers — only locked differences.
 * Detailed RBAC matrix is deferred (app-plan Fáze 10 placeholders).
 * Both ADMIN and DOCTOR work with patient records (kartotéka).
 * Only ADMIN may manage staff accounts.
 */
export function canManageStaff(role: UserRole | string): boolean {
  return isAdmin(role);
}

export function canAccessClinic(role: UserRole | string): boolean {
  return isStaffRole(role);
}
