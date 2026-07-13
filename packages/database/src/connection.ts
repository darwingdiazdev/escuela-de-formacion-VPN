import { MongoClient, ObjectId, type Db, type Document } from "mongodb";

export interface DatabaseConfig {
  uri: string;
  dbName: string;
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDatabase(config: DatabaseConfig): Promise<Db> {
  if (db) return db;

  client = new MongoClient(config.uri);
  await client.connect();
  db = client.db(config.dbName);
  return db;
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error("Base de datos no conectada. Llama a connectDatabase() primero.");
  }
  return db;
}

export async function disconnectDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

function serializeValue(value: unknown): unknown {
  if (value instanceof ObjectId) {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === "object") {
    return serializeDocument(value as Document);
  }
  return value;
}

function serializeDocument(doc: Document): Document {
  const result: Document = {};
  for (const [key, value] of Object.entries(doc)) {
    result[key] = serializeValue(value);
  }
  return result;
}

export function toEntity<T extends { id: string }>(doc: Document | null): T | null {
  if (!doc) return null;
  const { _id, ...rest } = serializeDocument(doc);
  return { ...rest, id: String(_id) } as T;
}

export function toEntityList<T extends { id: string }>(docs: Document[]): T[] {
  return docs.map((doc) => toEntity<T>(doc)!);
}

async function migrateSubjectsToOfferings(database: Db): Promise<void> {
  const subjects = await database.collection("subjects").find().toArray();
  const byCode = new Map<string, Document[]>();

  for (const doc of subjects) {
    const list = byCode.get(doc.code) ?? [];
    list.push(doc);
    byCode.set(doc.code, list);
  }

  for (const docs of byCode.values()) {
    const primary = docs[0]!;
    const offerings: { church: string; teacherId?: string }[] = [];

    for (const doc of docs) {
      if (Array.isArray(doc.offerings) && doc.offerings.length > 0) {
        for (const offering of doc.offerings) {
          if (!offerings.some((item) => item.church === offering.church)) {
            offerings.push({
              church: offering.church,
              ...(offering.teacherId ? { teacherId: String(offering.teacherId) } : {}),
            });
          }
        }
        continue;
      }

      const church = doc.church ?? "VPN MERIDA";
      if (!offerings.some((item) => item.church === church)) {
        offerings.push({
          church,
          ...(doc.teacherId ? { teacherId: String(doc.teacherId) } : {}),
        });
      }
    }

    await database.collection("subjects").updateOne(
      { _id: primary._id },
      {
        $set: { offerings, updatedAt: new Date() },
        $unset: { church: "", teacherId: "" },
      },
    );

    for (const duplicate of docs.slice(1)) {
      await database.collection("subjects").deleteOne({ _id: duplicate._id });
    }
  }
}

async function migrateStudentsToEnrollments(database: Db): Promise<void> {
  const students = await database.collection("students").find().toArray();

  for (const doc of students) {
    if (Array.isArray(doc.enrollments)) {
      continue;
    }

    const church = doc.church ?? "VPN MERIDA";
    const enrolledSubjectIds = Array.isArray(doc.enrolledSubjectIds) ? doc.enrolledSubjectIds : [];
    const enrollments = enrolledSubjectIds.map((subjectId: string) => ({
      subjectId,
      church,
      paymentStatus: "debt",
    }));

    await database.collection("students").updateOne(
      { _id: doc._id },
      {
        $set: { enrollments },
        $unset: { church: "", enrolledSubjectIds: "" },
      },
    );
  }

  for (const doc of students) {
    if (!Array.isArray(doc.enrollments)) continue;

    let changed = false;
    const enrollments = doc.enrollments.map((enrollment: Document) => {
      const paymentStatus = enrollment.paymentStatus ?? "debt";
      const teacherId = enrollment.teacherId ? String(enrollment.teacherId) : undefined;

      if (!enrollment.paymentStatus) {
        changed = true;
      }

      return {
        subjectId: enrollment.subjectId,
        church: enrollment.church,
        paymentStatus,
        ...(teacherId ? { teacherId } : {}),
      };
    });

    if (changed) {
      await database.collection("students").updateOne(
        { _id: doc._id },
        { $set: { enrollments } },
      );
    }
  }
}

async function migrateEnrollmentTeacherSnapshots(database: Db): Promise<void> {
  const subjects = await database.collection("subjects").find().toArray();
  const subjectMap = new Map(subjects.map((subject) => [String(subject._id), subject]));

  const students = await database.collection("students").find().toArray();

  for (const doc of students) {
    if (!Array.isArray(doc.enrollments)) continue;

    let changed = false;
    const enrollments = doc.enrollments.map((enrollment: Document) => {
      const paymentStatus = enrollment.paymentStatus ?? "debt";
      const existingTeacherId = enrollment.teacherId ? String(enrollment.teacherId) : undefined;

      if (existingTeacherId) {
        return {
          subjectId: enrollment.subjectId,
          church: enrollment.church,
          paymentStatus,
          teacherId: existingTeacherId,
        };
      }

      const subject = subjectMap.get(String(enrollment.subjectId));
      const offering = subject?.offerings?.find(
        (item: Document) => item.church === enrollment.church,
      );
      const teacherId = offering?.teacherId ? String(offering.teacherId) : undefined;

      if (teacherId) {
        changed = true;
      }

      return teacherId
        ? {
            subjectId: enrollment.subjectId,
            church: enrollment.church,
            paymentStatus,
            teacherId,
          }
        : {
            subjectId: enrollment.subjectId,
            church: enrollment.church,
            paymentStatus,
          };
    });

    if (changed) {
      await database.collection("students").updateOne(
        { _id: doc._id },
        { $set: { enrollments } },
      );
    }
  }
}

async function migrateGradesToAttempts(database: Db): Promise<void> {
  const grades = await database.collection("grades").find().toArray();

  for (const doc of grades) {
    const updates: Record<string, unknown> = {};

    if (doc.attemptNumber == null) {
      updates.attemptNumber = 1;
    }
    if (doc.isCurrent == null) {
      updates.isCurrent = true;
    }

    if (Object.keys(updates).length === 0) {
      continue;
    }

    await database.collection("grades").updateOne({ _id: doc._id }, { $set: updates });
  }
}
async function migrateGradeReferenceIds(database: Db): Promise<void> {
  const grades = await database.collection("grades").find().toArray();

  for (const doc of grades) {
    const studentId = String(doc.studentId);
    const subjectId = String(doc.subjectId);

    if (doc.studentId === studentId && doc.subjectId === subjectId) {
      continue;
    }

    await database.collection("grades").updateOne(
      { _id: doc._id },
      { $set: { studentId, subjectId } },
    );
  }
}

export async function ensureIndexes(database: Db): Promise<void> {
  const legacyTeacherIndexes = ["employeeCode_1", "userId_1"];
  for (const indexName of legacyTeacherIndexes) {
    try {
      await database.collection("teachers").dropIndex(indexName);
    } catch {
      // El índice ya no existe
    }
  }

  const legacyStudentIndexes = ["enrollmentCode_1", "userId_1"];
  for (const indexName of legacyStudentIndexes) {
    try {
      await database.collection("students").dropIndex(indexName);
    } catch {
      // El índice ya no existe
    }
  }

  await migrateSubjectsToOfferings(database);

  await database.collection("users").createIndex({ email: 1 }, { unique: true });
  await database.collection("students").createIndex({ ci: 1 }, { unique: true });
  await database.collection("teachers").createIndex({ ci: 1 }, { unique: true });

  try {
    await database.collection("subjects").dropIndex("code_1_church_1");
  } catch {
    // El índice ya no existe
  }

  try {
    await database.collection("subjects").dropIndex("code_1");
  } catch {
    // El índice ya no existe
  }

  await database.collection("subjects").createIndex({ code: 1 }, { unique: true });

  await migrateStudentsToEnrollments(database);
  await migrateEnrollmentTeacherSnapshots(database);
  await migrateGradeReferenceIds(database);
  await migrateGradesToAttempts(database);

  try {
    await database.collection("grades").dropIndex("studentId_1_subjectId_1_church_1");
  } catch {
    // El índice ya no existe o ya fue reemplazado
  }

  await database.collection("grades").createIndex(
    { studentId: 1, subjectId: 1, church: 1, attemptNumber: 1 },
    { unique: true },
  );

  await database.collection("grades").createIndex(
    { studentId: 1, subjectId: 1, church: 1 },
    { unique: true, partialFilterExpression: { isCurrent: true } },
  );

  await database.collection("events").createIndex({ occurredAt: -1 });
  await database.collection("events").createIndex({ aggregateId: 1 });
}
