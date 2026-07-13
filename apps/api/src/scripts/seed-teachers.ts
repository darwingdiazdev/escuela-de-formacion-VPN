import { createAppContext } from "@gestion-notas/application";
import { disconnectDatabase } from "@gestion-notas/database";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PENSUM_TEACHERS } from "./seed-teachers.data.js";

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

function resolveSubjectIds(
  subjectCodes: string[],
  subjectsByCode: Map<string, { id: string; code: string }>,
): string[] {
  const ids: string[] = [];
  for (const code of subjectCodes) {
    const subject = subjectsByCode.get(code);
    if (!subject) {
      throw new Error(`Materia no encontrada: ${code}. Ejecute primero pnpm run seed:subjects`);
    }
    ids.push(subject.id);
  }
  return ids;
}

async function main() {
  loadEnvFile();

  const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DB ?? "gestion_notas";

  console.log(`Conectando a ${mongoUri} / ${dbName}...\n`);

  const { service } = await createAppContext({ mongoUri, dbName });
  const subjects = await service.listSubjects();
  const subjectsByCode = new Map(subjects.map((subject) => [subject.code, subject]));

  const existingTeachers = await service.listTeachers();
  const teachersByCi = new Map(existingTeachers.map((teacher) => [teacher.ci, teacher]));

  let created = 0;
  let updated = 0;

  for (const teacher of PENSUM_TEACHERS) {
    const qualifiedSubjectIds = resolveSubjectIds(teacher.subjectCodes, subjectsByCode);
    const payload = {
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      ci: teacher.ci,
      phone: teacher.phone,
      email: teacher.email,
      educationLevel: teacher.educationLevel,
      qualifiedSubjectIds,
    };

    const current = teachersByCi.get(teacher.ci);

    if (current) {
      await service.updateTeacher(current.id, payload);
      console.log(
        `  actualizado: ${teacher.firstName} ${teacher.lastName} — ${teacher.subjectCodes.join(", ")}`,
      );
      updated++;
      continue;
    }

    await service.createTeacher(payload);
    console.log(
      `  creado: ${teacher.firstName} ${teacher.lastName} — ${teacher.subjectCodes.join(", ")}`,
    );
    created++;
  }

  console.log(`\nListo: ${created} creados, ${updated} actualizados, ${PENSUM_TEACHERS.length} en total.`);

  await disconnectDatabase();
}

main().catch((error) => {
  console.error("Error al cargar profesores:", error);
  process.exit(1);
});
