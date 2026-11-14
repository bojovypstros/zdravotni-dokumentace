import { prisma } from "@/lib/db/prisma";

const SETUP_KEY = "setup.completed";

export type EnvBootstrapStatus = {
  databaseUrl: boolean;
  sessionSecret: boolean;
  appUrl: boolean;
};

export type SetupStatus = {
  completed: boolean;
  userCount: number;
  patientCount: number;
  env: EnvBootstrapStatus;
  readyForSetup: boolean;
  missingEnv: string[];
};

function envPresent(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim().length > 0 && !value.includes("CHANGE_ME"));
}

export function getEnvBootstrapStatus(): EnvBootstrapStatus {
  return {
    databaseUrl: envPresent("DATABASE_URL"),
    sessionSecret: envPresent("SESSION_SECRET"),
    appUrl: envPresent("APP_URL"),
  };
}

export async function getSetupStatus(): Promise<SetupStatus> {
  const env = getEnvBootstrapStatus();
  const missingEnv: string[] = [];
  if (!env.databaseUrl) missingEnv.push("DATABASE_URL");
  if (!env.sessionSecret) missingEnv.push("SESSION_SECRET");
  if (!env.appUrl) missingEnv.push("APP_URL");

  const [meta, userCount, patientCount] = await Promise.all([
    prisma.appMeta.findUnique({ where: { key: SETUP_KEY } }),
    prisma.user.count(),
    prisma.patient.count(),
  ]);

  const completed = meta?.value === "true" || userCount > 0;

  return {
    completed,
    userCount,
    patientCount,
    env,
    readyForSetup: missingEnv.length === 0,
    missingEnv,
  };
}

export async function markSetupCompleted(): Promise<void> {
  await prisma.appMeta.upsert({
    where: { key: SETUP_KEY },
    create: { key: SETUP_KEY, value: "true" },
    update: { value: "true" },
  });
}
