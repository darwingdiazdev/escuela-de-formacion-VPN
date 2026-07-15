import { createAppContext } from "@gestion-notas/application";
import { disconnectDatabase } from "@gestion-notas/database";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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

const DEMO_SUBJECTS = [
  { code: "TST001", name: "Prueba Evangelismo", pensum: "Pensum 2", priceUsd: 1 },
  { code: "TST002", name: "Prueba Intercesión", pensum: "Pensum 2", priceUsd: 1.5 },
  { code: "TST003", name: "Prueba Hermenéutica", pensum: "Pensum 3", priceUsd: 2 },
] as const;

const DEMO_TEACHERS = [
  {
    firstName: "Ana",
    lastName: "Pérez",
    ci: "V-9100001",
    phone: "0414-1110001",
    email: "ana.perez.demo@vpn.test",
    educationLevel: "Licenciatura",
  },
  {
    firstName: "Carlos",
    lastName: "Ramírez",
    ci: "V-9100002",
    phone: "0414-1110002",
    email: "carlos.ramirez.demo@vpn.test",
    educationLevel: "Maestría",
  },
  {
    firstName: "María",
    lastName: "González",
    ci: "V-9100003",
    phone: "0414-1110003",
    email: "maria.gonzalez.demo@vpn.test",
    educationLevel: "Teología",
  },
] as const;

const DEMO_STUDENTS = [
  {
    firstName: "Luis",
    lastName: "Martínez",
    ci: "V-9200001",
    gender: "M" as const,
    phone: "0424-2220001",
    email: "luis.martinez.demo@vpn.test",
  },
  {
    firstName: "Sofía",
    lastName: "Hernández",
    ci: "V-9200002",
    gender: "F" as const,
    phone: "0424-2220002",
    email: "sofia.hernandez.demo@vpn.test",
  },
  {
    firstName: "José",
    lastName: "Torres",
    ci: "V-9200003",
    gender: "M" as const,
    phone: "0424-2220003",
    email: "jose.torres.demo@vpn.test",
  },
] as const;

async function main() {
  loadEnvFile();

  const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DB ?? "gestion_notas";

  console.log(`Sembrando datos demo en ${dbName}...\n`);
  const { service } = await createAppContext({ mongoUri, dbName });

  const existingSubjects = await service.listSubjects();
  const subjectByCode = new Map(existingSubjects.map((subject) => [subject.code, subject]));
  const subjects = [];

  for (const item of DEMO_SUBJECTS) {
    const current = subjectByCode.get(item.code);
    if (current) {
      console.log(`  materia existente: ${item.code} — ${item.name}`);
      subjects.push(current);
      continue;
    }

    const created = await service.createSubject({
      ...item,
      offerings: [{ church: "VPN MERIDA" }, { church: "VPN TABAY" }],
      isActive: true,
    });
    console.log(`  materia creada: ${item.code} — ${item.name}`);
    subjects.push(created);
  }

  const subjectIds = subjects.map((subject) => subject.id);
  const existingTeachers = await service.listTeachers();
  const teacherByCi = new Map(existingTeachers.map((teacher) => [teacher.ci, teacher]));
  const teachers = [];

  for (const item of DEMO_TEACHERS) {
    const current = teacherByCi.get(item.ci);
    if (current) {
      console.log(`  profesor existente: ${item.ci} — ${item.firstName} ${item.lastName}`);
      teachers.push(current);
      continue;
    }

    const created = await service.createTeacher({
      ...item,
      qualifiedSubjectIds: subjectIds,
    });
    console.log(`  profesor creado: ${item.ci} — ${item.firstName} ${item.lastName}`);
    teachers.push(created);
  }

  for (let index = 0; index < subjects.length; index++) {
    const subject = subjects[index];
    const teacher = teachers[index];
    await service.updateSubject(subject.id, {
      offerings: [
        { church: "VPN MERIDA", teacherId: teacher.id },
        { church: "VPN TABAY", teacherId: teachers[(index + 1) % teachers.length].id },
      ],
      isActive: true,
    });
  }
  console.log("  materias actualizadas con profesores asignados");

  const existingStudents = await service.listStudents();
  const studentByCi = new Map(existingStudents.map((student) => [student.ci, student]));

  for (let index = 0; index < DEMO_STUDENTS.length; index++) {
    const item = DEMO_STUDENTS[index];
    if (studentByCi.has(item.ci)) {
      console.log(`  estudiante existente: ${item.ci} — ${item.firstName} ${item.lastName}`);
      continue;
    }

    const enrollments = subjects.slice(0, index + 1).map((subject, subjectIndex) => ({
      subjectId: subject.id,
      church: subjectIndex % 2 === 0 ? ("VPN MERIDA" as const) : ("VPN TABAY" as const),
      paymentStatus: subjectIndex % 2 === 0 ? ("paid" as const) : ("debt" as const),
    }));

    await service.createStudent({
      firstName: item.firstName,
      lastName: item.lastName,
      ci: item.ci,
      gender: item.gender,
      birthDate: new Date(1995 + index, index, 10 + index),
      birthPlace: "Mérida",
      maritalStatus: "soltero",
      address: `Calle Demo ${index + 1}, Mérida`,
      phone: item.phone,
      email: item.email,
      conversionDate: "2020-01-15",
      ministry: "Jóvenes",
      educationLevel: "Bachiller",
      profession: "Estudiante",
      occupation: "Estudiante",
      workplace: "VPN",
      enrollments,
    });
    console.log(`  estudiante creado: ${item.ci} — ${item.firstName} ${item.lastName}`);
  }

  console.log("\nListo: 3 materias, 3 profesores y 3 estudiantes de prueba.");
  await disconnectDatabase();
}

main().catch((error) => {
  console.error("Error al sembrar datos demo:", error);
  process.exit(1);
});
