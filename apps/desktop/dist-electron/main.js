import { MongoClient, ObjectId } from "mongodb";
import { createHash } from "node:crypto";
import { app, BrowserWindow, ipcMain, dialog, nativeImage } from "electron";
import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import require$$0 from "fs";
import require$$1 from "path";
import require$$2 from "os";
import require$$3 from "crypto";
let client = null;
let db = null;
async function connectDatabase(config) {
  if (db)
    return db;
  client = new MongoClient(config.uri);
  await client.connect();
  db = client.db(config.dbName);
  return db;
}
function getDatabase() {
  if (!db) {
    throw new Error("Base de datos no conectada. Llama a connectDatabase() primero.");
  }
  return db;
}
async function disconnectDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
function serializeValue(value) {
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
    return serializeDocument(value);
  }
  return value;
}
function serializeDocument(doc) {
  const result = {};
  for (const [key, value] of Object.entries(doc)) {
    result[key] = serializeValue(value);
  }
  return result;
}
function toEntity(doc) {
  if (!doc)
    return null;
  const { _id, ...rest } = serializeDocument(doc);
  return { ...rest, id: String(_id) };
}
function toEntityList(docs) {
  return docs.map((doc) => toEntity(doc));
}
async function migrateSubjectsToOfferings(database) {
  const subjects = await database.collection("subjects").find().toArray();
  const byCode = /* @__PURE__ */ new Map();
  for (const doc of subjects) {
    const list = byCode.get(doc.code) ?? [];
    list.push(doc);
    byCode.set(doc.code, list);
  }
  for (const docs of byCode.values()) {
    const primary = docs[0];
    const offerings = [];
    for (const doc of docs) {
      if (Array.isArray(doc.offerings) && doc.offerings.length > 0) {
        for (const offering of doc.offerings) {
          if (!offerings.some((item) => item.church === offering.church)) {
            offerings.push({
              church: offering.church,
              ...offering.teacherId ? { teacherId: String(offering.teacherId) } : {}
            });
          }
        }
        continue;
      }
      const church = doc.church ?? "VPN MERIDA";
      if (!offerings.some((item) => item.church === church)) {
        offerings.push({
          church,
          ...doc.teacherId ? { teacherId: String(doc.teacherId) } : {}
        });
      }
    }
    await database.collection("subjects").updateOne({ _id: primary._id }, {
      $set: { offerings, updatedAt: /* @__PURE__ */ new Date() },
      $unset: { church: "", teacherId: "" }
    });
    for (const duplicate of docs.slice(1)) {
      await database.collection("subjects").deleteOne({ _id: duplicate._id });
    }
  }
}
async function migrateStudentsToEnrollments(database) {
  const students = await database.collection("students").find().toArray();
  for (const doc of students) {
    if (Array.isArray(doc.enrollments)) {
      continue;
    }
    const church = doc.church ?? "VPN MERIDA";
    const enrolledSubjectIds = Array.isArray(doc.enrolledSubjectIds) ? doc.enrolledSubjectIds : [];
    const enrollments = enrolledSubjectIds.map((subjectId) => ({
      subjectId,
      church,
      paymentStatus: "debt"
    }));
    await database.collection("students").updateOne({ _id: doc._id }, {
      $set: { enrollments },
      $unset: { church: "", enrolledSubjectIds: "" }
    });
  }
  for (const doc of students) {
    if (!Array.isArray(doc.enrollments))
      continue;
    let changed = false;
    const enrollments = doc.enrollments.map((enrollment) => {
      const paymentStatus = enrollment.paymentStatus ?? "debt";
      const teacherId = enrollment.teacherId ? String(enrollment.teacherId) : void 0;
      if (!enrollment.paymentStatus) {
        changed = true;
      }
      return {
        subjectId: enrollment.subjectId,
        church: enrollment.church,
        paymentStatus,
        ...teacherId ? { teacherId } : {}
      };
    });
    if (changed) {
      await database.collection("students").updateOne({ _id: doc._id }, { $set: { enrollments } });
    }
  }
}
async function migrateEnrollmentTeacherSnapshots(database) {
  const subjects = await database.collection("subjects").find().toArray();
  const subjectMap = new Map(subjects.map((subject) => [String(subject._id), subject]));
  const students = await database.collection("students").find().toArray();
  for (const doc of students) {
    if (!Array.isArray(doc.enrollments))
      continue;
    let changed = false;
    const enrollments = doc.enrollments.map((enrollment) => {
      const paymentStatus = enrollment.paymentStatus ?? "debt";
      const existingTeacherId = enrollment.teacherId ? String(enrollment.teacherId) : void 0;
      if (existingTeacherId) {
        return {
          subjectId: enrollment.subjectId,
          church: enrollment.church,
          paymentStatus,
          teacherId: existingTeacherId
        };
      }
      const subject = subjectMap.get(String(enrollment.subjectId));
      const offering = subject?.offerings?.find((item) => item.church === enrollment.church);
      const teacherId = offering?.teacherId ? String(offering.teacherId) : void 0;
      if (teacherId) {
        changed = true;
      }
      return teacherId ? {
        subjectId: enrollment.subjectId,
        church: enrollment.church,
        paymentStatus,
        teacherId
      } : {
        subjectId: enrollment.subjectId,
        church: enrollment.church,
        paymentStatus
      };
    });
    if (changed) {
      await database.collection("students").updateOne({ _id: doc._id }, { $set: { enrollments } });
    }
  }
}
async function migrateGradesToAttempts(database) {
  const grades = await database.collection("grades").find().toArray();
  for (const doc of grades) {
    const updates = {};
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
async function migrateGradeReferenceIds(database) {
  const grades = await database.collection("grades").find().toArray();
  for (const doc of grades) {
    const studentId = String(doc.studentId);
    const subjectId = String(doc.subjectId);
    if (doc.studentId === studentId && doc.subjectId === subjectId) {
      continue;
    }
    await database.collection("grades").updateOne({ _id: doc._id }, { $set: { studentId, subjectId } });
  }
}
async function ensureIndexes(database) {
  const legacyTeacherIndexes = ["employeeCode_1", "userId_1"];
  for (const indexName of legacyTeacherIndexes) {
    try {
      await database.collection("teachers").dropIndex(indexName);
    } catch {
    }
  }
  const legacyStudentIndexes = ["enrollmentCode_1", "userId_1"];
  for (const indexName of legacyStudentIndexes) {
    try {
      await database.collection("students").dropIndex(indexName);
    } catch {
    }
  }
  await migrateSubjectsToOfferings(database);
  await database.collection("users").createIndex({ email: 1 }, { unique: true });
  await database.collection("students").createIndex({ ci: 1 }, { unique: true });
  await database.collection("teachers").createIndex({ ci: 1 }, { unique: true });
  try {
    await database.collection("subjects").dropIndex("code_1_church_1");
  } catch {
  }
  try {
    await database.collection("subjects").dropIndex("code_1");
  } catch {
  }
  await database.collection("subjects").createIndex({ code: 1 }, { unique: true });
  await migrateStudentsToEnrollments(database);
  await migrateEnrollmentTeacherSnapshots(database);
  await migrateGradeReferenceIds(database);
  await migrateGradesToAttempts(database);
  try {
    await database.collection("grades").dropIndex("studentId_1_subjectId_1_church_1");
  } catch {
  }
  await database.collection("grades").createIndex({ studentId: 1, subjectId: 1, church: 1, attemptNumber: 1 }, { unique: true });
  await database.collection("grades").createIndex({ studentId: 1, subjectId: 1, church: 1 }, { unique: true, partialFilterExpression: { isCurrent: true } });
  await database.collection("events").createIndex({ occurredAt: -1 });
  await database.collection("events").createIndex({ aggregateId: 1 });
}
async function saveEvent(event) {
  const database = getDatabase();
  await database.collection("events").insertOne({
    eventId: event.id,
    type: event.type,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    payload: event.payload,
    occurredAt: event.occurredAt,
    version: event.version
  });
}
function now() {
  return /* @__PURE__ */ new Date();
}
function normalizeEnrollment(enrollment) {
  const teacherId = enrollment.teacherId == null || enrollment.teacherId === "" ? void 0 : String(enrollment.teacherId);
  return {
    subjectId: String(enrollment.subjectId),
    church: enrollment.church,
    paymentStatus: enrollment.paymentStatus ?? "debt",
    ...teacherId ? { teacherId } : {}
  };
}
function referenceIdVariants(id) {
  const normalized = String(id);
  const variants = [normalized];
  if (ObjectId.isValid(normalized)) {
    variants.push(new ObjectId(normalized));
  }
  return variants;
}
function normalizeOfferings(offerings) {
  return offerings.map((offering) => {
    const teacherId = offering.teacherId == null || offering.teacherId === "" ? void 0 : String(offering.teacherId);
    return teacherId ? { church: offering.church, teacherId } : { church: offering.church };
  });
}
class UserRepository {
  async create(input) {
    const database = getDatabase();
    const timestamp = now();
    const doc = {
      email: input.email,
      passwordHash: input.passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const result = await database.collection("users").insertOne(doc);
    return toEntity({ _id: result.insertedId, ...doc });
  }
  async findAll() {
    const database = getDatabase();
    const docs = await database.collection("users").find().sort({ createdAt: -1 }).toArray();
    return toEntityList(docs);
  }
  async findById(id) {
    const database = getDatabase();
    const doc = await database.collection("users").findOne({ _id: new ObjectId(id) });
    return toEntity(doc);
  }
  async findByEmail(email) {
    const database = getDatabase();
    const doc = await database.collection("users").findOne({ email });
    return toEntity(doc);
  }
  async update(id, input) {
    const database = getDatabase();
    const result = await database.collection("users").findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { ...input, updatedAt: now() } }, { returnDocument: "after" });
    return toEntity(result);
  }
}
class StudentRepository {
  async create(input) {
    const database = getDatabase();
    const timestamp = now();
    const enrollments = (input.enrollments ?? []).map(normalizeEnrollment);
    const doc = {
      firstName: input.firstName,
      lastName: input.lastName,
      ci: input.ci,
      gender: input.gender,
      birthDate: input.birthDate,
      birthPlace: input.birthPlace,
      maritalStatus: input.maritalStatus,
      address: input.address,
      phone: input.phone,
      email: input.email,
      conversionDate: input.conversionDate,
      ministry: input.ministry,
      educationLevel: input.educationLevel,
      profession: input.profession,
      occupation: input.occupation,
      workplace: input.workplace,
      enrollments,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const result = await database.collection("students").insertOne(doc);
    return toEntity({ _id: result.insertedId, ...doc });
  }
  async findAll() {
    const database = getDatabase();
    const docs = await database.collection("students").find().sort({ lastName: 1, firstName: 1 }).toArray();
    return toEntityList(docs);
  }
  async findById(id) {
    const database = getDatabase();
    const doc = await database.collection("students").findOne({ _id: new ObjectId(id) });
    return toEntity(doc);
  }
  async findByCi(ci) {
    const database = getDatabase();
    const doc = await database.collection("students").findOne({ ci });
    return toEntity(doc);
  }
  async update(id, input) {
    const database = getDatabase();
    const payload = {
      ...input,
      ...input.enrollments ? {
        enrollments: input.enrollments.map(normalizeEnrollment)
      } : {},
      updatedAt: now()
    };
    const result = await database.collection("students").findOneAndUpdate({ _id: new ObjectId(id) }, { $set: payload }, { returnDocument: "after" });
    return toEntity(result);
  }
  async delete(id) {
    const database = getDatabase();
    const result = await database.collection("students").deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}
class TeacherRepository {
  async create(input) {
    const database = getDatabase();
    const timestamp = now();
    const doc = {
      firstName: input.firstName,
      lastName: input.lastName,
      ci: input.ci,
      phone: input.phone,
      email: input.email,
      educationLevel: input.educationLevel,
      qualifiedSubjectIds: input.qualifiedSubjectIds ?? [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const result = await database.collection("teachers").insertOne(doc);
    return toEntity({ _id: result.insertedId, ...doc });
  }
  async findAll() {
    const database = getDatabase();
    const docs = await database.collection("teachers").find().sort({ lastName: 1, firstName: 1 }).toArray();
    return toEntityList(docs);
  }
  async findById(id) {
    const database = getDatabase();
    const doc = await database.collection("teachers").findOne({ _id: new ObjectId(id) });
    return toEntity(doc);
  }
  async findByCi(ci) {
    const database = getDatabase();
    const doc = await database.collection("teachers").findOne({ ci });
    return toEntity(doc);
  }
  async update(id, input) {
    const database = getDatabase();
    const result = await database.collection("teachers").findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { ...input, updatedAt: now() } }, { returnDocument: "after" });
    return toEntity(result);
  }
  async delete(id) {
    const database = getDatabase();
    const result = await database.collection("teachers").deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}
class SubjectRepository {
  async create(input) {
    const database = getDatabase();
    const timestamp = now();
    const doc = {
      code: input.code,
      name: input.name,
      pensum: input.pensum,
      priceUsd: input.priceUsd,
      offerings: normalizeOfferings(input.offerings ?? []),
      isActive: input.isActive ?? true,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const result = await database.collection("subjects").insertOne(doc);
    return toEntity({ _id: result.insertedId, ...doc });
  }
  async findAll() {
    const database = getDatabase();
    const docs = await database.collection("subjects").find().sort({ name: 1 }).toArray();
    return toEntityList(docs);
  }
  async findByCode(code) {
    const database = getDatabase();
    const doc = await database.collection("subjects").findOne({ code });
    return toEntity(doc);
  }
  async findById(id) {
    const database = getDatabase();
    const doc = await database.collection("subjects").findOne({ _id: new ObjectId(id) });
    return toEntity(doc);
  }
  async update(id, input) {
    const database = getDatabase();
    const payload = {
      ...input,
      ...input.offerings ? { offerings: normalizeOfferings(input.offerings) } : {},
      updatedAt: now()
    };
    const result = await database.collection("subjects").findOneAndUpdate({ _id: new ObjectId(id) }, { $set: payload }, { returnDocument: "after" });
    return toEntity(result);
  }
  async delete(id) {
    const database = getDatabase();
    const result = await database.collection("subjects").deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}
class GradeRepository {
  enrollmentFilter(studentId, subjectId, church) {
    return {
      church,
      studentId: { $in: referenceIdVariants(studentId) },
      subjectId: { $in: referenceIdVariants(subjectId) }
    };
  }
  async create(input) {
    const database = getDatabase();
    const timestamp = now();
    const doc = {
      studentId: String(input.studentId),
      subjectId: String(input.subjectId),
      church: input.church,
      finalGrade: input.finalGrade,
      attemptNumber: input.attemptNumber ?? 1,
      isCurrent: input.isCurrent ?? true,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const result = await database.collection("grades").insertOne(doc);
    return toEntity({ _id: result.insertedId, ...doc });
  }
  async findAll() {
    const database = getDatabase();
    const docs = await database.collection("grades").find().sort({ studentId: 1, subjectId: 1, attemptNumber: 1 }).toArray();
    return toEntityList(docs);
  }
  async findAllCurrent() {
    const database = getDatabase();
    const docs = await database.collection("grades").find({ isCurrent: true }).sort({ updatedAt: -1 }).toArray();
    return toEntityList(docs);
  }
  async findById(id) {
    const database = getDatabase();
    const doc = await database.collection("grades").findOne({ _id: new ObjectId(id) });
    return toEntity(doc);
  }
  async findByEnrollment(studentId, subjectId, church) {
    const database = getDatabase();
    const doc = await database.collection("grades").findOne({
      ...this.enrollmentFilter(studentId, subjectId, church),
      isCurrent: true
    });
    return toEntity(doc);
  }
  async findAllByEnrollment(studentId, subjectId, church) {
    const database = getDatabase();
    const docs = await database.collection("grades").find(this.enrollmentFilter(studentId, subjectId, church)).sort({ attemptNumber: 1 }).toArray();
    return toEntityList(docs);
  }
  async getNextAttemptNumber(studentId, subjectId, church) {
    const database = getDatabase();
    const docs = await database.collection("grades").find(this.enrollmentFilter(studentId, subjectId, church)).toArray();
    if (docs.length === 0)
      return 1;
    const maxAttempt = Math.max(...docs.map((doc) => doc.attemptNumber ?? 1));
    return maxAttempt + 1;
  }
  async archiveCurrentByEnrollment(studentId, subjectId, church) {
    const database = getDatabase();
    await database.collection("grades").updateMany({
      ...this.enrollmentFilter(studentId, subjectId, church),
      isCurrent: true
    }, { $set: { isCurrent: false, updatedAt: now() } });
  }
  async update(id, input) {
    const database = getDatabase();
    const payload = {
      ...input,
      ...input.studentId ? { studentId: String(input.studentId) } : {},
      ...input.subjectId ? { subjectId: String(input.subjectId) } : {},
      updatedAt: now()
    };
    const result = await database.collection("grades").findOneAndUpdate({ _id: new ObjectId(id) }, { $set: payload }, { returnDocument: "after" });
    return toEntity(result);
  }
  async deleteByStudentId(studentId) {
    const database = getDatabase();
    const result = await database.collection("grades").deleteMany({
      studentId: { $in: referenceIdVariants(studentId) }
    });
    return result.deletedCount;
  }
  async deleteBySubjectId(subjectId) {
    const database = getDatabase();
    const result = await database.collection("grades").deleteMany({
      subjectId: { $in: referenceIdVariants(subjectId) }
    });
    return result.deletedCount;
  }
}
class InMemoryEventBus {
  handlers = /* @__PURE__ */ new Map();
  subscribe(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, /* @__PURE__ */ new Set());
    }
    this.handlers.get(eventType).add(handler);
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }
  async publish(event) {
    const handlers = this.handlers.get(event.type);
    if (!handlers?.size)
      return;
    await Promise.all([...handlers].map((handler) => handler(event)));
  }
}
function createEventBus() {
  return new InMemoryEventBus();
}
const defaultLogger = {
  info: () => void 0
};
function createAuditLogHandler(logger = defaultLogger) {
  return (event) => {
    logger.info(`[AUDIT] ${event.type}`, {
      aggregateId: event.aggregateId,
      occurredAt: event.occurredAt.toISOString()
    });
  };
}
function registerDefaultHandlers(subscribe) {
  const auditHandler = createAuditLogHandler();
  const allEventTypes = [
    "user.created",
    "user.updated",
    "student.created",
    "student.updated",
    "teacher.created",
    "teacher.updated",
    "subject.created",
    "subject.updated"
  ];
  for (const eventType of allEventTypes) {
    subscribe(eventType, auditHandler);
  }
}
const PASSING_GRADE = 14;
const MAX_GRADE = 20;
function isPassingGrade(finalGrade) {
  return finalGrade >= PASSING_GRADE;
}
const EventTypes = {
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  STUDENT_CREATED: "student.created",
  STUDENT_UPDATED: "student.updated",
  TEACHER_CREATED: "teacher.created",
  TEACHER_UPDATED: "teacher.updated",
  SUBJECT_CREATED: "subject.created",
  SUBJECT_UPDATED: "subject.updated"
};
function generateEventId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0;
    const value = char === "x" ? random : random & 3 | 8;
    return value.toString(16);
  });
}
function createDomainEvent(type, aggregateId, aggregateType, payload, version = 1) {
  return {
    id: generateEventId(),
    type,
    aggregateId,
    aggregateType,
    payload,
    occurredAt: /* @__PURE__ */ new Date(),
    version
  };
}
function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}
class ApplicationService {
  eventBus;
  users = new UserRepository();
  students = new StudentRepository();
  teachers = new TeacherRepository();
  subjects = new SubjectRepository();
  grades = new GradeRepository();
  constructor(eventBus) {
    this.eventBus = eventBus;
  }
  async emit(event) {
    await saveEvent(event);
    await this.eventBus.publish(event);
  }
  // --- Usuarios ---
  async listUsers() {
    return this.users.findAll();
  }
  async authenticateUser(email, password) {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) {
      throw new Error("Credenciales inválidas.");
    }
    if (user.passwordHash !== hashPassword(password)) {
      throw new Error("Credenciales inválidas.");
    }
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }
  async createUser(input) {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new Error("Ya existe un usuario con ese correo.");
    }
    const user = await this.users.create({
      email: input.email,
      passwordHash: hashPassword(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role
    });
    await this.emit(createDomainEvent(EventTypes.USER_CREATED, user.id, "User", {
      userId: user.id,
      email: user.email,
      role: user.role
    }));
    return user;
  }
  async updateUser(id, input) {
    const updated = await this.users.update(id, input);
    if (!updated)
      throw new Error("Usuario no encontrado.");
    await this.emit(createDomainEvent(EventTypes.USER_UPDATED, id, "User", {
      userId: id,
      changes: input
    }));
    return updated;
  }
  // --- Estudiantes ---
  async listStudents() {
    return this.students.findAll();
  }
  async createStudent(input) {
    const existing = await this.students.findByCi(input.ci);
    if (existing)
      throw new Error("Ya existe un estudiante con esa CI.");
    const enrollments = await this.prepareEnrollments(input.enrollments ?? []);
    await this.validateStudentEnrollments(enrollments);
    const student = await this.students.create({
      ...input,
      enrollments
    });
    await this.emit(createDomainEvent(EventTypes.STUDENT_CREATED, student.id, "Student", {
      studentId: student.id,
      ci: student.ci,
      firstName: student.firstName,
      lastName: student.lastName
    }));
    return student;
  }
  async updateStudent(id, input) {
    if (input.ci) {
      const existing = await this.students.findByCi(input.ci);
      if (existing && existing.id !== id) {
        throw new Error("Ya existe un estudiante con esa CI.");
      }
    }
    const current = await this.students.findById(id);
    if (!current)
      throw new Error("Estudiante no encontrado.");
    const updatePayload = { ...input };
    if (input.enrollments) {
      await this.validateStudentEnrollments(input.enrollments);
      updatePayload.enrollments = await this.prepareEnrollments(input.enrollments, current.enrollments ?? []);
    }
    const updated = await this.students.update(id, updatePayload);
    if (!updated)
      throw new Error("Estudiante no encontrado.");
    await this.emit(createDomainEvent(EventTypes.STUDENT_UPDATED, id, "Student", {
      studentId: id,
      changes: input
    }));
    return updated;
  }
  async deleteStudent(id) {
    const student = await this.students.findById(id);
    if (!student)
      throw new Error("Estudiante no encontrado.");
    await this.grades.deleteByStudentId(id);
    const deleted = await this.students.delete(id);
    if (!deleted)
      throw new Error("Estudiante no encontrado.");
  }
  async setEnrollmentPayment(studentId, subjectId, church, paymentStatus) {
    const student = await this.students.findById(studentId);
    if (!student)
      throw new Error("Estudiante no encontrado.");
    const enrollments = (student.enrollments ?? []).map((enrollment) => {
      if (String(enrollment.subjectId) === String(subjectId) && enrollment.church === church) {
        return { ...enrollment, paymentStatus };
      }
      return enrollment;
    });
    const exists = enrollments.some((enrollment) => String(enrollment.subjectId) === String(subjectId) && enrollment.church === church);
    if (!exists) {
      throw new Error("El estudiante no está inscrito en esa materia.");
    }
    const updated = await this.students.update(studentId, { enrollments });
    if (!updated)
      throw new Error("Estudiante no encontrado.");
    return updated;
  }
  async retakeEnrollment(studentId, subjectId, church) {
    const student = await this.students.findById(studentId);
    if (!student)
      throw new Error("Estudiante no encontrado.");
    const isEnrolled = (student.enrollments ?? []).some((enrollment) => String(enrollment.subjectId) === String(subjectId) && enrollment.church === church);
    if (!isEnrolled) {
      throw new Error("El estudiante no está inscrito en esa materia.");
    }
    const grade = await this.grades.findByEnrollment(studentId, subjectId, church);
    if (grade && isPassingGrade(grade.finalGrade)) {
      throw new Error("Solo puede volver a cursar materias reprobadas.");
    }
    if (grade) {
      await this.grades.archiveCurrentByEnrollment(studentId, subjectId, church);
    }
    const teacherId = await this.resolveTeacherIdForOffering(subjectId, church);
    const enrollments = (student.enrollments ?? []).map((enrollment) => {
      if (String(enrollment.subjectId) === String(subjectId) && enrollment.church === church) {
        return {
          ...enrollment,
          paymentStatus: "debt",
          ...teacherId ? { teacherId } : {}
        };
      }
      return enrollment;
    });
    const updated = await this.students.update(studentId, { enrollments });
    if (!updated)
      throw new Error("Estudiante no encontrado.");
    return updated;
  }
  // --- Profesores ---
  async listTeachers() {
    return this.teachers.findAll();
  }
  async createTeacher(input) {
    const existing = await this.teachers.findByCi(input.ci);
    if (existing)
      throw new Error("Ya existe un profesor con esa CI.");
    await this.validateQualifiedSubjects(input.qualifiedSubjectIds);
    const teacher = await this.teachers.create(input);
    await this.emit(createDomainEvent(EventTypes.TEACHER_CREATED, teacher.id, "Teacher", {
      teacherId: teacher.id,
      ci: teacher.ci,
      firstName: teacher.firstName,
      lastName: teacher.lastName
    }));
    return teacher;
  }
  async updateTeacher(id, input) {
    if (input.ci) {
      const existing = await this.teachers.findByCi(input.ci);
      if (existing && existing.id !== id) {
        throw new Error("Ya existe un profesor con esa CI.");
      }
    }
    if (input.qualifiedSubjectIds) {
      await this.validateQualifiedSubjects(input.qualifiedSubjectIds);
    }
    const updated = await this.teachers.update(id, input);
    if (!updated)
      throw new Error("Profesor no encontrado.");
    await this.emit(createDomainEvent(EventTypes.TEACHER_UPDATED, id, "Teacher", {
      teacherId: id,
      changes: input
    }));
    return updated;
  }
  async deleteTeacher(id) {
    const teacher = await this.teachers.findById(id);
    if (!teacher)
      throw new Error("Profesor no encontrado.");
    const subjects = await this.subjects.findAll();
    for (const subject of subjects) {
      const offerings = subject.offerings ?? [];
      const nextOfferings = offerings.map((offering) => String(offering.teacherId) === String(id) ? { church: offering.church } : offering);
      const changed = offerings.some((offering) => String(offering.teacherId) === String(id));
      if (changed) {
        await this.subjects.update(subject.id, { offerings: nextOfferings });
      }
    }
    const students = await this.students.findAll();
    for (const student of students) {
      const enrollments = student.enrollments ?? [];
      const nextEnrollments = enrollments.map((enrollment) => {
        if (String(enrollment.teacherId) !== String(id))
          return enrollment;
        const { teacherId: _teacherId, ...rest } = enrollment;
        return rest;
      });
      const changed = enrollments.some((enrollment) => String(enrollment.teacherId) === String(id));
      if (changed) {
        await this.students.update(student.id, { enrollments: nextEnrollments });
      }
    }
    const deleted = await this.teachers.delete(id);
    if (!deleted)
      throw new Error("Profesor no encontrado.");
  }
  // --- Materias ---
  async listSubjects() {
    return this.subjects.findAll();
  }
  async createSubject(input) {
    const existing = await this.subjects.findByCode(input.code);
    if (existing) {
      throw new Error("Ya existe una materia con ese código.");
    }
    await this.validateOfferings(input.code, input.offerings ?? []);
    const subject = await this.subjects.create({
      ...input,
      offerings: input.offerings ?? []
    });
    await this.emit(createDomainEvent(EventTypes.SUBJECT_CREATED, subject.id, "Subject", {
      subjectId: subject.id,
      code: subject.code,
      name: subject.name
    }));
    return subject;
  }
  async updateSubject(id, input) {
    const current = await this.subjects.findById(id);
    if (!current)
      throw new Error("Materia no encontrada.");
    const nextCode = input.code ?? current.code;
    if (nextCode !== current.code) {
      const duplicate = await this.subjects.findByCode(nextCode);
      if (duplicate && duplicate.id !== id) {
        throw new Error("Ya existe una materia con ese código.");
      }
    }
    const nextOfferings = input.offerings ?? current.offerings ?? [];
    await this.validateOfferings(nextCode, nextOfferings);
    const updated = await this.subjects.update(id, input);
    if (!updated)
      throw new Error("Materia no encontrada.");
    await this.backfillMissingEnrollmentTeachers(id, updated.offerings ?? []);
    await this.emit(createDomainEvent(EventTypes.SUBJECT_UPDATED, id, "Subject", {
      subjectId: id,
      changes: input
    }));
    return updated;
  }
  async deleteSubject(id) {
    const subject = await this.subjects.findById(id);
    if (!subject)
      throw new Error("Materia no encontrada.");
    const teachers = await this.teachers.findAll();
    for (const teacher of teachers) {
      const qualified = teacher.qualifiedSubjectIds ?? [];
      const nextQualified = qualified.filter((subjectId) => String(subjectId) !== String(id));
      if (nextQualified.length !== qualified.length) {
        await this.teachers.update(teacher.id, { qualifiedSubjectIds: nextQualified });
      }
    }
    const students = await this.students.findAll();
    for (const student of students) {
      const enrollments = student.enrollments ?? [];
      const nextEnrollments = enrollments.filter((enrollment) => String(enrollment.subjectId) !== String(id));
      if (nextEnrollments.length !== enrollments.length) {
        await this.students.update(student.id, { enrollments: nextEnrollments });
      }
    }
    await this.grades.deleteBySubjectId(id);
    const deleted = await this.subjects.delete(id);
    if (!deleted)
      throw new Error("Materia no encontrada.");
  }
  // --- Notas ---
  async listGrades() {
    return this.grades.findAllCurrent();
  }
  async listAllGrades() {
    return this.grades.findAll();
  }
  async createGrade(input) {
    await this.validateGradeInput(input);
    const existing = await this.grades.findByEnrollment(input.studentId, input.subjectId, input.church);
    if (existing) {
      throw new Error("Ya existe una nota registrada para esa inscripción.");
    }
    await this.ensureEnrollmentTeacherSnapshot(input.studentId, input.subjectId, input.church);
    const attemptNumber = await this.grades.getNextAttemptNumber(input.studentId, input.subjectId, input.church);
    return this.grades.create({
      ...input,
      attemptNumber,
      isCurrent: true
    });
  }
  async updateGrade(id, input) {
    const current = await this.grades.findById(id);
    if (!current)
      throw new Error("Nota no encontrada.");
    const nextStudentId = input.studentId ?? current.studentId;
    const nextSubjectId = input.subjectId ?? current.subjectId;
    const nextChurch = input.church ?? current.church;
    const nextFinalGrade = input.finalGrade ?? current.finalGrade;
    await this.validateGradeInput({
      studentId: nextStudentId,
      subjectId: nextSubjectId,
      church: nextChurch,
      finalGrade: nextFinalGrade
    });
    if (nextStudentId !== current.studentId || nextSubjectId !== current.subjectId || nextChurch !== current.church) {
      const duplicate = await this.grades.findByEnrollment(nextStudentId, nextSubjectId, nextChurch);
      if (duplicate && duplicate.id !== id) {
        throw new Error("Ya existe una nota registrada para esa inscripción.");
      }
    }
    const updated = await this.grades.update(id, input);
    if (!updated)
      throw new Error("Nota no encontrada.");
    return updated;
  }
  enrollmentKey(subjectId, church) {
    return `${subjectId}:${church}`;
  }
  async resolveTeacherIdForOffering(subjectId, church) {
    const subject = await this.subjects.findById(subjectId);
    if (!subject)
      return void 0;
    const teacherId = subject.offerings?.find((offering) => offering.church === church)?.teacherId;
    return teacherId ? String(teacherId) : void 0;
  }
  async prepareEnrollments(nextEnrollments, currentEnrollments = []) {
    const currentByKey = new Map(currentEnrollments.map((enrollment) => [
      this.enrollmentKey(enrollment.subjectId, enrollment.church),
      enrollment
    ]));
    const prepared = [];
    for (const enrollment of nextEnrollments) {
      const key = this.enrollmentKey(enrollment.subjectId, enrollment.church);
      const existing = currentByKey.get(key);
      const teacherId = existing?.teacherId ?? await this.resolveTeacherIdForOffering(enrollment.subjectId, enrollment.church);
      prepared.push({
        subjectId: enrollment.subjectId,
        church: enrollment.church,
        paymentStatus: enrollment.paymentStatus ?? existing?.paymentStatus ?? "debt",
        ...teacherId ? { teacherId } : {}
      });
    }
    return prepared;
  }
  async backfillMissingEnrollmentTeachers(subjectId, offerings) {
    const students = await this.students.findAll();
    for (const student of students) {
      let changed = false;
      const enrollments = (student.enrollments ?? []).map((enrollment) => {
        if (String(enrollment.subjectId) !== String(subjectId) || enrollment.teacherId) {
          return enrollment;
        }
        const teacherId = offerings.find((offering) => offering.church === enrollment.church)?.teacherId;
        if (!teacherId) {
          return enrollment;
        }
        changed = true;
        return {
          ...enrollment,
          teacherId: String(teacherId)
        };
      });
      if (changed) {
        await this.students.update(student.id, { enrollments });
      }
    }
  }
  async ensureEnrollmentTeacherSnapshot(studentId, subjectId, church) {
    const student = await this.students.findById(studentId);
    if (!student)
      return;
    const enrollments = student.enrollments ?? [];
    const enrollment = enrollments.find((item) => String(item.subjectId) === String(subjectId) && item.church === church);
    if (!enrollment || enrollment.teacherId)
      return;
    const teacherId = await this.resolveTeacherIdForOffering(subjectId, church);
    if (!teacherId)
      return;
    const nextEnrollments = enrollments.map((item) => String(item.subjectId) === String(subjectId) && item.church === church ? { ...item, teacherId } : item);
    await this.students.update(studentId, { enrollments: nextEnrollments });
  }
  async validateQualifiedSubjects(subjectIds) {
    for (const subjectId of subjectIds) {
      const subject = await this.subjects.findById(subjectId);
      if (!subject)
        throw new Error("Una de las materias seleccionadas no existe.");
    }
  }
  async validateStudentEnrollments(enrollments) {
    const seen = /* @__PURE__ */ new Set();
    for (const enrollment of enrollments) {
      const key = `${enrollment.subjectId}:${enrollment.church}`;
      if (seen.has(key)) {
        throw new Error("No puede inscribir la misma materia dos veces en la misma iglesia.");
      }
      seen.add(key);
      const subject = await this.subjects.findById(enrollment.subjectId);
      if (!subject) {
        throw new Error("Una de las materias seleccionadas no existe.");
      }
      if (!subject.isActive) {
        throw new Error(`La materia ${subject.name} no está activa.`);
      }
      const offeredAtChurch = (subject.offerings ?? []).some((offering) => offering.church === enrollment.church);
      if (!offeredAtChurch) {
        throw new Error(`La materia ${subject.name} no se imparte en ${enrollment.church}.`);
      }
    }
  }
  async validateGradeInput(input) {
    if (!Number.isFinite(input.finalGrade)) {
      throw new Error("La nota final debe ser un número válido.");
    }
    if (input.finalGrade < 0 || input.finalGrade > MAX_GRADE) {
      throw new Error(`La nota final debe estar entre 0 y ${MAX_GRADE}.`);
    }
    const student = await this.students.findById(input.studentId);
    if (!student)
      throw new Error("El estudiante no existe.");
    const isEnrolled = (student.enrollments ?? []).some((enrollment) => enrollment.subjectId === input.subjectId && enrollment.church === input.church);
    if (!isEnrolled) {
      throw new Error("El estudiante no está inscrito en esa materia en la iglesia indicada.");
    }
    const subject = await this.subjects.findById(input.subjectId);
    if (!subject)
      throw new Error("La materia no existe.");
  }
  async validateOfferings(subjectCode, offerings) {
    const churches = /* @__PURE__ */ new Set();
    for (const offering of offerings) {
      if (churches.has(offering.church)) {
        throw new Error("No puede repetir la misma iglesia en una materia.");
      }
      churches.add(offering.church);
      if (offering.teacherId) {
        await this.validateTeacherForSubjectCode(offering.teacherId, subjectCode);
      }
    }
  }
  async validateTeacherForSubjectCode(teacherId, subjectCode) {
    const teacher = await this.teachers.findById(teacherId);
    if (!teacher)
      throw new Error("El profesor asignado no existe.");
    const qualifiedSubjectIds = teacher.qualifiedSubjectIds ?? [];
    const qualifiedSubjects = await Promise.all(qualifiedSubjectIds.map((id) => this.subjects.findById(id)));
    const isQualified = qualifiedSubjects.some((qualified) => qualified?.code === subjectCode);
    if (!isQualified) {
      throw new Error("El profesor no está apto para dictar esta materia.");
    }
  }
  async validateTeacherForSubject(teacherId, subjectId) {
    const subject = await this.subjects.findById(subjectId);
    if (!subject)
      throw new Error("La materia no existe.");
    await this.validateTeacherForSubjectCode(teacherId, subject.code);
  }
}
async function createAppContext(config) {
  const db2 = await connectDatabase({ uri: config.mongoUri, dbName: config.dbName });
  await ensureIndexes(db2);
  const eventBus = createEventBus();
  registerDefaultHandlers((eventType, handler) => eventBus.subscribe(eventType, handler));
  const service2 = new ApplicationService(eventBus);
  return { service: service2 };
}
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var main = { exports: {} };
var hasRequiredMain;
function requireMain() {
  if (hasRequiredMain) return main.exports;
  hasRequiredMain = 1;
  const fs = require$$0;
  const path2 = require$$1;
  const os = require$$2;
  const crypto = require$$3;
  const TIPS = [
    "◈ encrypted .env [www.dotenvx.com]",
    "◈ secrets for agents [www.dotenvx.com]",
    "⌁ auth for agents [www.vestauth.com]",
    "⌘ custom filepath { path: '/custom/path/.env' }",
    "⌘ enable debugging { debug: true }",
    "⌘ override existing { override: true }",
    "⌘ suppress logs { quiet: true }",
    "⌘ multiple files { path: ['.env.local', '.env'] }"
  ];
  function _getRandomTip() {
    return TIPS[Math.floor(Math.random() * TIPS.length)];
  }
  function parseBoolean(value) {
    if (typeof value === "string") {
      return !["false", "0", "no", "off", ""].includes(value.toLowerCase());
    }
    return Boolean(value);
  }
  function supportsAnsi() {
    return process.stdout.isTTY;
  }
  function dim(text) {
    return supportsAnsi() ? `\x1B[2m${text}\x1B[0m` : text;
  }
  const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
  function parse(src) {
    const obj = {};
    let lines = src.toString();
    lines = lines.replace(/\r\n?/mg, "\n");
    let match;
    while ((match = LINE.exec(lines)) != null) {
      const key = match[1];
      let value = match[2] || "";
      value = value.trim();
      const maybeQuote = value[0];
      value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
      if (maybeQuote === '"') {
        value = value.replace(/\\n/g, "\n");
        value = value.replace(/\\r/g, "\r");
      }
      obj[key] = value;
    }
    return obj;
  }
  function _parseVault(options) {
    options = options || {};
    const vaultPath = _vaultPath(options);
    options.path = vaultPath;
    const result = DotenvModule.configDotenv(options);
    if (!result.parsed) {
      const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
      err.code = "MISSING_DATA";
      throw err;
    }
    const keys = _dotenvKey(options).split(",");
    const length = keys.length;
    let decrypted;
    for (let i = 0; i < length; i++) {
      try {
        const key = keys[i].trim();
        const attrs = _instructions(result, key);
        decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
        break;
      } catch (error) {
        if (i + 1 >= length) {
          throw error;
        }
      }
    }
    return DotenvModule.parse(decrypted);
  }
  function _warn(message) {
    console.error(`⚠ ${message}`);
  }
  function _debug(message) {
    console.log(`┆ ${message}`);
  }
  function _log(message) {
    console.log(`◇ ${message}`);
  }
  function _dotenvKey(options) {
    if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
      return options.DOTENV_KEY;
    }
    if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
      return process.env.DOTENV_KEY;
    }
    return "";
  }
  function _instructions(result, dotenvKey) {
    let uri;
    try {
      uri = new URL(dotenvKey);
    } catch (error) {
      if (error.code === "ERR_INVALID_URL") {
        const err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      throw error;
    }
    const key = uri.password;
    if (!key) {
      const err = new Error("INVALID_DOTENV_KEY: Missing key part");
      err.code = "INVALID_DOTENV_KEY";
      throw err;
    }
    const environment = uri.searchParams.get("environment");
    if (!environment) {
      const err = new Error("INVALID_DOTENV_KEY: Missing environment part");
      err.code = "INVALID_DOTENV_KEY";
      throw err;
    }
    const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
    const ciphertext = result.parsed[environmentKey];
    if (!ciphertext) {
      const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
      err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
      throw err;
    }
    return { ciphertext, key };
  }
  function _vaultPath(options) {
    let possibleVaultPath = null;
    if (options && options.path && options.path.length > 0) {
      if (Array.isArray(options.path)) {
        for (const filepath of options.path) {
          if (fs.existsSync(filepath)) {
            possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
          }
        }
      } else {
        possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
      }
    } else {
      possibleVaultPath = path2.resolve(process.cwd(), ".env.vault");
    }
    if (fs.existsSync(possibleVaultPath)) {
      return possibleVaultPath;
    }
    return null;
  }
  function _resolveHome(envPath) {
    return envPath[0] === "~" ? path2.join(os.homedir(), envPath.slice(1)) : envPath;
  }
  function _configVault(options) {
    const debug = parseBoolean(process.env.DOTENV_CONFIG_DEBUG || options && options.debug);
    const quiet = parseBoolean(process.env.DOTENV_CONFIG_QUIET || options && options.quiet);
    if (debug || !quiet) {
      _log("loading env from encrypted .env.vault");
    }
    const parsed = DotenvModule._parseVault(options);
    let processEnv = process.env;
    if (options && options.processEnv != null) {
      processEnv = options.processEnv;
    }
    DotenvModule.populate(processEnv, parsed, options);
    return { parsed };
  }
  function configDotenv(options) {
    const dotenvPath = path2.resolve(process.cwd(), ".env");
    let encoding = "utf8";
    let processEnv = process.env;
    if (options && options.processEnv != null) {
      processEnv = options.processEnv;
    }
    let debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || options && options.debug);
    let quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || options && options.quiet);
    if (options && options.encoding) {
      encoding = options.encoding;
    } else {
      if (debug) {
        _debug("no encoding is specified (UTF-8 is used by default)");
      }
    }
    let optionPaths = [dotenvPath];
    if (options && options.path) {
      if (!Array.isArray(options.path)) {
        optionPaths = [_resolveHome(options.path)];
      } else {
        optionPaths = [];
        for (const filepath of options.path) {
          optionPaths.push(_resolveHome(filepath));
        }
      }
    }
    let lastError;
    const parsedAll = {};
    for (const path22 of optionPaths) {
      try {
        const parsed = DotenvModule.parse(fs.readFileSync(path22, { encoding }));
        DotenvModule.populate(parsedAll, parsed, options);
      } catch (e) {
        if (debug) {
          _debug(`failed to load ${path22} ${e.message}`);
        }
        lastError = e;
      }
    }
    const populated = DotenvModule.populate(processEnv, parsedAll, options);
    debug = parseBoolean(processEnv.DOTENV_CONFIG_DEBUG || debug);
    quiet = parseBoolean(processEnv.DOTENV_CONFIG_QUIET || quiet);
    if (debug || !quiet) {
      const keysCount = Object.keys(populated).length;
      const shortPaths = [];
      for (const filePath of optionPaths) {
        try {
          const relative = path2.relative(process.cwd(), filePath);
          shortPaths.push(relative);
        } catch (e) {
          if (debug) {
            _debug(`failed to load ${filePath} ${e.message}`);
          }
          lastError = e;
        }
      }
      _log(`injected env (${keysCount}) from ${shortPaths.join(",")} ${dim(`// tip: ${_getRandomTip()}`)}`);
    }
    if (lastError) {
      return { parsed: parsedAll, error: lastError };
    } else {
      return { parsed: parsedAll };
    }
  }
  function config(options) {
    if (_dotenvKey(options).length === 0) {
      return DotenvModule.configDotenv(options);
    }
    const vaultPath = _vaultPath(options);
    if (!vaultPath) {
      _warn(`you set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}`);
      return DotenvModule.configDotenv(options);
    }
    return DotenvModule._configVault(options);
  }
  function decrypt(encrypted, keyStr) {
    const key = Buffer.from(keyStr.slice(-64), "hex");
    let ciphertext = Buffer.from(encrypted, "base64");
    const nonce = ciphertext.subarray(0, 12);
    const authTag = ciphertext.subarray(-16);
    ciphertext = ciphertext.subarray(12, -16);
    try {
      const aesgcm = crypto.createDecipheriv("aes-256-gcm", key, nonce);
      aesgcm.setAuthTag(authTag);
      return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
    } catch (error) {
      const isRange = error instanceof RangeError;
      const invalidKeyLength = error.message === "Invalid key length";
      const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
      if (isRange || invalidKeyLength) {
        const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      } else if (decryptionFailed) {
        const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
        err.code = "DECRYPTION_FAILED";
        throw err;
      } else {
        throw error;
      }
    }
  }
  function populate(processEnv, parsed, options = {}) {
    const debug = Boolean(options && options.debug);
    const override = Boolean(options && options.override);
    const populated = {};
    if (typeof parsed !== "object") {
      const err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
      err.code = "OBJECT_REQUIRED";
      throw err;
    }
    for (const key of Object.keys(parsed)) {
      if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
        if (override === true) {
          processEnv[key] = parsed[key];
          populated[key] = parsed[key];
        }
        if (debug) {
          if (override === true) {
            _debug(`"${key}" is already defined and WAS overwritten`);
          } else {
            _debug(`"${key}" is already defined and was NOT overwritten`);
          }
        }
      } else {
        processEnv[key] = parsed[key];
        populated[key] = parsed[key];
      }
    }
    return populated;
  }
  const DotenvModule = {
    configDotenv,
    _configVault,
    _parseVault,
    config,
    decrypt,
    parse,
    populate
  };
  main.exports.configDotenv = DotenvModule.configDotenv;
  main.exports._configVault = DotenvModule._configVault;
  main.exports._parseVault = DotenvModule._parseVault;
  main.exports.config = DotenvModule.config;
  main.exports.decrypt = DotenvModule.decrypt;
  main.exports.parse = DotenvModule.parse;
  main.exports.populate = DotenvModule.populate;
  main.exports = DotenvModule;
  return main.exports;
}
var mainExports = requireMain();
const dotenv = /* @__PURE__ */ getDefaultExportFromCjs(mainExports);
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
function resolveAppIconPath() {
  const candidates = [
    path.join(__dirname$1, "../public/logos/logo-2.png"),
    path.join(__dirname$1, "../dist/logos/logo-2.png")
  ];
  return candidates.find((candidate) => existsSync(candidate));
}
let service;
async function initBackend() {
  const mongoUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DB ?? "gestion_notas";
  const ctx = await createAppContext({ mongoUri, dbName });
  service = ctx.service;
  await seedDemoAdmin();
}
async function seedDemoAdmin() {
  try {
    await service.createUser({
      email: "admin@VPN",
      password: "admin123",
      firstName: "Admin",
      lastName: "Sistema",
      role: "admin"
    });
  } catch (err) {
    if (!(err instanceof Error && err.message.includes("correo"))) throw err;
  }
}
function registerIpcHandlers() {
  ipcMain.handle(
    "auth:login",
    (_e, email, password) => service.authenticateUser(email, password)
  );
  ipcMain.handle("users:list", () => service.listUsers());
  ipcMain.handle("users:create", (_e, input) => service.createUser(input));
  ipcMain.handle("users:update", (_e, id, input) => service.updateUser(id, input));
  ipcMain.handle("students:list", () => service.listStudents());
  ipcMain.handle("students:create", (_e, input) => service.createStudent(input));
  ipcMain.handle("students:update", (_e, id, input) => service.updateStudent(id, input));
  ipcMain.handle("students:delete", (_e, id) => service.deleteStudent(id));
  ipcMain.handle(
    "students:setEnrollmentPayment",
    (_e, studentId, subjectId, church, paymentStatus) => service.setEnrollmentPayment(studentId, subjectId, church, paymentStatus)
  );
  ipcMain.handle(
    "students:retakeEnrollment",
    (_e, studentId, subjectId, church) => service.retakeEnrollment(studentId, subjectId, church)
  );
  ipcMain.handle("teachers:list", () => service.listTeachers());
  ipcMain.handle("teachers:create", (_e, input) => service.createTeacher(input));
  ipcMain.handle("teachers:update", (_e, id, input) => service.updateTeacher(id, input));
  ipcMain.handle("teachers:delete", (_e, id) => service.deleteTeacher(id));
  ipcMain.handle("subjects:list", () => service.listSubjects());
  ipcMain.handle("subjects:create", (_e, input) => service.createSubject(input));
  ipcMain.handle("subjects:update", (_e, id, input) => service.updateSubject(id, input));
  ipcMain.handle("subjects:delete", (_e, id) => service.deleteSubject(id));
  ipcMain.handle("grades:list", () => service.listGrades());
  ipcMain.handle("grades:listAll", () => service.listAllGrades());
  ipcMain.handle("grades:create", (_e, input) => service.createGrade(input));
  ipcMain.handle("grades:update", (_e, id, input) => service.updateGrade(id, input));
  ipcMain.handle(
    "export:saveExcel",
    async (_e, data, defaultFileName) => {
      const win = BrowserWindow.getFocusedWindow();
      const dialogOptions = {
        title: "Guardar Excel",
        defaultPath: defaultFileName,
        filters: [{ name: "Excel", extensions: ["xlsx"] }]
      };
      const { canceled, filePath } = win ? await dialog.showSaveDialog(win, dialogOptions) : await dialog.showSaveDialog(dialogOptions);
      if (canceled || !filePath) {
        return { saved: false };
      }
      await writeFile(filePath, Buffer.from(data));
      return { saved: true, filePath };
    }
  );
}
function createWindow() {
  const iconPath = resolveAppIconPath();
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Gestión de Notas",
    ...iconPath ? { icon: nativeImage.createFromPath(iconPath) } : {},
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname$1, "../renderer/index.html"));
  }
}
app.whenReady().then(async () => {
  try {
    await initBackend();
    registerIpcHandlers();
    createWindow();
  } catch (error) {
    console.error("Error al iniciar la aplicación:", error);
    app.quit();
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", async () => {
  await disconnectDatabase();
  if (process.platform !== "darwin") app.quit();
});
