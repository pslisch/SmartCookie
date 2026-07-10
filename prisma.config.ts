import "dotenv/config";
import { defineConfig } from "prisma/config";

let databaseUrl = process.env["DATABASE_URL"];
if (databaseUrl) {
  // Strip enclosing quotes if they were added in the secrets configuration
  if (
    (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) ||
    (databaseUrl.startsWith("'") && databaseUrl.endsWith("'"))
  ) {
    databaseUrl = databaseUrl.slice(1, -1);
  }
}

export default defineConfig({
  schema: "server/prisma/schema.prisma",
  migrations: {
    path: "server/prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});

