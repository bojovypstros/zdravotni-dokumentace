import { connection } from "next/server";

import { jsonOk } from "@/lib/api/http";
import { getSetupStatus } from "@/server/services/setup";

export async function GET() {
  await connection();
  const status = await getSetupStatus();
  return jsonOk({
    completed: status.completed,
    readyForSetup: status.readyForSetup,
    missingEnv: status.missingEnv,
    env: {
      databaseUrl: status.env.databaseUrl,
      sessionSecret: status.env.sessionSecret,
      appUrl: status.env.appUrl,
    },
    hasUsers: status.userCount > 0,
    hasPatients: status.patientCount > 0,
  });
}
