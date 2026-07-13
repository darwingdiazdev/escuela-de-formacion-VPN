import { ObjectId } from "mongodb";
import type {
  CreateGradeInput,
  CreateStudentInput,
  CreateSubjectInput,
  CreateTeacherInput,
  CreateUserInput,
  Grade,
  Student,
  StudentSubjectEnrollment,
  Subject,
  SubjectChurchOffering,
  Teacher,
  UpdateGradeInput,
  UpdateStudentInput,
  UpdateSubjectInput,
  UpdateTeacherInput,
  UpdateUserInput,
  User,
} from "@gestion-notas/domain";
import { getDatabase, toEntity, toEntityList } from "./connection.js";

function now() {
  return new Date();
}

function normalizeEnrollment(enrollment: StudentSubjectEnrollment): StudentSubjectEnrollment {
  const teacherId =
    enrollment.teacherId == null || enrollment.teacherId === ""
      ? undefined
      : String(enrollment.teacherId);

  return {
    subjectId: String(enrollment.subjectId),
    church: enrollment.church,
    paymentStatus: enrollment.paymentStatus ?? "debt",
    ...(teacherId ? { teacherId } : {}),
  };
}

function referenceIdVariants(id: string): Array<string | ObjectId> {
  const normalized = String(id);
  const variants: Array<string | ObjectId> = [normalized];

  if (ObjectId.isValid(normalized)) {
    variants.push(new ObjectId(normalized));
  }

  return variants;
}

function normalizeOfferings(offerings: SubjectChurchOffering[]): SubjectChurchOffering[] {
  return offerings.map((offering) => {
    const teacherId =
      offering.teacherId == null || offering.teacherId === ""
        ? undefined
        : String(offering.teacherId);

    return teacherId
      ? { church: offering.church, teacherId }
      : { church: offering.church };
  });
}

export class UserRepository {
  async create(input: CreateUserInput): Promise<User> {
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
      updatedAt: timestamp,
    };
    const result = await database.collection("users").insertOne(doc);
    return toEntity<User>({ _id: result.insertedId, ...doc })!;
  }

  async findAll(): Promise<User[]> {
    const database = getDatabase();
    const docs = await database.collection("users").find().sort({ createdAt: -1 }).toArray();
    return toEntityList<User>(docs);
  }

  async findById(id: string): Promise<User | null> {
    const database = getDatabase();
    const doc = await database.collection("users").findOne({ _id: new ObjectId(id) });
    return toEntity<User>(doc);
  }

  async findByEmail(email: string): Promise<User | null> {
    const database = getDatabase();
    const doc = await database.collection("users").findOne({ email });
    return toEntity<User>(doc);
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const database = getDatabase();
    const result = await database.collection("users").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...input, updatedAt: now() } },
      { returnDocument: "after" },
    );
    return toEntity<User>(result);
  }
}

export class StudentRepository {
  async create(input: CreateStudentInput): Promise<Student> {
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
      updatedAt: timestamp,
    };
    const result = await database.collection("students").insertOne(doc);
    return toEntity<Student>({ _id: result.insertedId, ...doc })!;
  }

  async findAll(): Promise<Student[]> {
    const database = getDatabase();
    const docs = await database.collection("students").find().sort({ lastName: 1, firstName: 1 }).toArray();
    return toEntityList<Student>(docs);
  }

  async findById(id: string): Promise<Student | null> {
    const database = getDatabase();
    const doc = await database.collection("students").findOne({ _id: new ObjectId(id) });
    return toEntity<Student>(doc);
  }

  async findByCi(ci: string): Promise<Student | null> {
    const database = getDatabase();
    const doc = await database.collection("students").findOne({ ci });
    return toEntity<Student>(doc);
  }

  async update(id: string, input: UpdateStudentInput): Promise<Student | null> {
    const database = getDatabase();
    const payload = {
      ...input,
      ...(input.enrollments
        ? {
            enrollments: input.enrollments.map(normalizeEnrollment),
          }
        : {}),
      updatedAt: now(),
    };
    const result = await database.collection("students").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: payload },
      { returnDocument: "after" },
    );
    return toEntity<Student>(result);
  }
}

export class TeacherRepository {
  async create(input: CreateTeacherInput): Promise<Teacher> {
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
      updatedAt: timestamp,
    };
    const result = await database.collection("teachers").insertOne(doc);
    return toEntity<Teacher>({ _id: result.insertedId, ...doc })!;
  }

  async findAll(): Promise<Teacher[]> {
    const database = getDatabase();
    const docs = await database.collection("teachers").find().sort({ lastName: 1, firstName: 1 }).toArray();
    return toEntityList<Teacher>(docs);
  }

  async findById(id: string): Promise<Teacher | null> {
    const database = getDatabase();
    const doc = await database.collection("teachers").findOne({ _id: new ObjectId(id) });
    return toEntity<Teacher>(doc);
  }

  async findByCi(ci: string): Promise<Teacher | null> {
    const database = getDatabase();
    const doc = await database.collection("teachers").findOne({ ci });
    return toEntity<Teacher>(doc);
  }

  async update(id: string, input: UpdateTeacherInput): Promise<Teacher | null> {
    const database = getDatabase();
    const result = await database.collection("teachers").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...input, updatedAt: now() } },
      { returnDocument: "after" },
    );
    return toEntity<Teacher>(result);
  }
}

export class SubjectRepository {
  async create(input: CreateSubjectInput): Promise<Subject> {
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
      updatedAt: timestamp,
    };
    const result = await database.collection("subjects").insertOne(doc);
    return toEntity<Subject>({ _id: result.insertedId, ...doc })!;
  }

  async findAll(): Promise<Subject[]> {
    const database = getDatabase();
    const docs = await database.collection("subjects").find().sort({ name: 1 }).toArray();
    return toEntityList<Subject>(docs);
  }

  async findByCode(code: string): Promise<Subject | null> {
    const database = getDatabase();
    const doc = await database.collection("subjects").findOne({ code });
    return toEntity<Subject>(doc);
  }

  async findById(id: string): Promise<Subject | null> {
    const database = getDatabase();
    const doc = await database.collection("subjects").findOne({ _id: new ObjectId(id) });
    return toEntity<Subject>(doc);
  }

  async update(id: string, input: UpdateSubjectInput): Promise<Subject | null> {
    const database = getDatabase();
    const payload = {
      ...input,
      ...(input.offerings ? { offerings: normalizeOfferings(input.offerings) } : {}),
      updatedAt: now(),
    };
    const result = await database.collection("subjects").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: payload },
      { returnDocument: "after" },
    );
    return toEntity<Subject>(result);
  }
}

export class GradeRepository {
  private enrollmentFilter(studentId: string, subjectId: string, church: Grade["church"]) {
    return {
      church,
      studentId: { $in: referenceIdVariants(studentId) },
      subjectId: { $in: referenceIdVariants(subjectId) },
    };
  }

  async create(input: CreateGradeInput): Promise<Grade> {
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
      updatedAt: timestamp,
    };
    const result = await database.collection("grades").insertOne(doc);
    return toEntity<Grade>({ _id: result.insertedId, ...doc })!;
  }

  async findAll(): Promise<Grade[]> {
    const database = getDatabase();
    const docs = await database
      .collection("grades")
      .find()
      .sort({ studentId: 1, subjectId: 1, attemptNumber: 1 })
      .toArray();
    return toEntityList<Grade>(docs);
  }

  async findAllCurrent(): Promise<Grade[]> {
    const database = getDatabase();
    const docs = await database
      .collection("grades")
      .find({ isCurrent: true })
      .sort({ updatedAt: -1 })
      .toArray();
    return toEntityList<Grade>(docs);
  }

  async findById(id: string): Promise<Grade | null> {
    const database = getDatabase();
    const doc = await database.collection("grades").findOne({ _id: new ObjectId(id) });
    return toEntity<Grade>(doc);
  }

  async findByEnrollment(
    studentId: string,
    subjectId: string,
    church: Grade["church"],
  ): Promise<Grade | null> {
    const database = getDatabase();
    const doc = await database.collection("grades").findOne({
      ...this.enrollmentFilter(studentId, subjectId, church),
      isCurrent: true,
    });
    return toEntity<Grade>(doc);
  }

  async findAllByEnrollment(
    studentId: string,
    subjectId: string,
    church: Grade["church"],
  ): Promise<Grade[]> {
    const database = getDatabase();
    const docs = await database
      .collection("grades")
      .find(this.enrollmentFilter(studentId, subjectId, church))
      .sort({ attemptNumber: 1 })
      .toArray();
    return toEntityList<Grade>(docs);
  }

  async getNextAttemptNumber(
    studentId: string,
    subjectId: string,
    church: Grade["church"],
  ): Promise<number> {
    const database = getDatabase();
    const docs = await database
      .collection("grades")
      .find(this.enrollmentFilter(studentId, subjectId, church))
      .toArray();

    if (docs.length === 0) return 1;

    const maxAttempt = Math.max(...docs.map((doc) => doc.attemptNumber ?? 1));
    return maxAttempt + 1;
  }

  async archiveCurrentByEnrollment(
    studentId: string,
    subjectId: string,
    church: Grade["church"],
  ): Promise<void> {
    const database = getDatabase();
    await database.collection("grades").updateMany(
      {
        ...this.enrollmentFilter(studentId, subjectId, church),
        isCurrent: true,
      },
      { $set: { isCurrent: false, updatedAt: now() } },
    );
  }

  async update(id: string, input: UpdateGradeInput): Promise<Grade | null> {
    const database = getDatabase();
    const payload = {
      ...input,
      ...(input.studentId ? { studentId: String(input.studentId) } : {}),
      ...(input.subjectId ? { subjectId: String(input.subjectId) } : {}),
      updatedAt: now(),
    };
    const result = await database.collection("grades").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: payload },
      { returnDocument: "after" },
    );
    return toEntity<Grade>(result);
  }
}
