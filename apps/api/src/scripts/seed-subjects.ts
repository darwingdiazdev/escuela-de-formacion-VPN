import { createAppContext } from "@gestion-notas/application";
import { disconnectDatabase } from "@gestion-notas/database";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PENSUM_SUBJECTS } from "./seed-subjects.data.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

function loadEnvFile() {
  try {
    const envPath = resolve(projectRoot, ".env");
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env opcional
  }
}

async function main() {
  loadEnvFile();

  const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DB ?? "gestion_notas";

  console.log(`Conectando a ${mongoUri} / ${dbName}...\n`);

  const { service } = await createAppContext({ mongoUri, dbName });
  const existing = await service.listSubjects();
  const existingByCode = new Map(existing.map((subject) => [subject.code, subject]));

  let created = 0;
  let updated = 0;

  for (const subject of PENSUM_SUBJECTS) {
    const current = existingByCode.get(subject.code);

    if (current) {
      await service.updateSubject(current.id, {
        name: subject.name,
        pensum: subject.pensum,
        priceUsd: subject.priceUsd,
      });
      console.log(`  actualizada: ${subject.code} — ${subject.name} [${subject.pensum}, $${subject.priceUsd}]`);
      updated++;
      continue;
    }

    await service.createSubject({ ...subject, offerings: [] });
    console.log(`  creada: ${subject.code} — ${subject.name} [${subject.pensum}]`);
    created++;
  }

  console.log(`\nListo: ${created} creadas, ${updated} actualizadas, ${PENSUM_SUBJECTS.length} en total.`);

  await disconnectDatabase();
}

main().catch((error) => {
  console.error("Error al cargar materias:", error);
  process.exit(1);
});
