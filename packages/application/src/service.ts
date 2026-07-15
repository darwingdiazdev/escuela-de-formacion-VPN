import { createHash } from "node:crypto";
import {
  createDomainEvent,
  EventTypes,
  type CreateGradeInput,
  type CreateStudentInput,
  type CreateSubjectInput,
  type CreateTeacherInput,
  type CreateUserInput,
  type Grade,
  isPassingGrade,
  MAX_GRADE,
  type PaymentStatus,
  type ChurchLocation,
  type StudentSubjectEnrollment,
  type SubjectChurchOffering,
  type Student,
  type Subject,
  type Teacher,
  type UpdateGradeInput,
  type UpdateStudentInput,
  type UpdateSubjectInput,
  type UpdateTeacherInput,
  type UpdateUserInput,
  type User,
} from "@gestion-notas/domain";
import type { EventBus } from "@gestion-notas/events";
import {
  saveEvent,
  GradeRepository,
  StudentRepository,
  SubjectRepository,
  TeacherRepository,
  UserRepository,
} from "@gestion-notas/database";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export type PublicUser = Omit<User, "passwordHash">;

export class ApplicationService {
  private users = new UserRepository();
  private students = new StudentRepository();
  private teachers = new TeacherRepository();
  private subjects = new SubjectRepository();
  private grades = new GradeRepository();

  constructor(private eventBus: EventBus) {}

  private async emit<TPayload>(event: ReturnType<typeof createDomainEvent<TPayload>>): Promise<void> {
    await saveEvent(event);
    await this.eventBus.publish(event);
  }

  // --- Usuarios ---

  async listUsers(): Promise<User[]> {
    return this.users.findAll();
  }

  async authenticateUser(email: string, password: string): Promise<PublicUser> {
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

  async createUser(input: Omit<CreateUserInput, "passwordHash"> & { password: string }): Promise<User> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new Error("Ya existe un usuario con ese correo.");
    }

    const user = await this.users.create({
      email: input.email,
      passwordHash: hashPassword(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
    });

    await this.emit(
      createDomainEvent(EventTypes.USER_CREATED, user.id, "User", {
        userId: user.id,
        email: user.email,
        role: user.role,
      }),
    );

    return user;
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const updated = await this.users.update(id, input);
    if (!updated) throw new Error("Usuario no encontrado.");

    await this.emit(
      createDomainEvent(EventTypes.USER_UPDATED, id, "User", {
        userId: id,
        changes: input,
      }),
    );

    return updated;
  }

  // --- Estudiantes ---

  async listStudents(): Promise<Student[]> {
    return this.students.findAll();
  }

  async createStudent(input: CreateStudentInput): Promise<Student> {
    const existing = await this.students.findByCi(input.ci);
    if (existing) throw new Error("Ya existe un estudiante con esa CI.");

    const enrollments = await this.prepareEnrollments(input.enrollments ?? []);
    await this.validateStudentEnrollments(enrollments);

    const student = await this.students.create({
      ...input,
      enrollments,
    });

    await this.emit(
      createDomainEvent(EventTypes.STUDENT_CREATED, student.id, "Student", {
        studentId: student.id,
        ci: student.ci,
        firstName: student.firstName,
        lastName: student.lastName,
      }),
    );

    return student;
  }

  async updateStudent(id: string, input: UpdateStudentInput): Promise<Student> {
    if (input.ci) {
      const existing = await this.students.findByCi(input.ci);
      if (existing && existing.id !== id) {
        throw new Error("Ya existe un estudiante con esa CI.");
      }
    }

    const current = await this.students.findById(id);
    if (!current) throw new Error("Estudiante no encontrado.");

    const updatePayload: UpdateStudentInput = { ...input };

    if (input.enrollments) {
      await this.validateStudentEnrollments(input.enrollments);
      updatePayload.enrollments = await this.prepareEnrollments(
        input.enrollments,
        current.enrollments ?? [],
      );
    }

    const updated = await this.students.update(id, updatePayload);
    if (!updated) throw new Error("Estudiante no encontrado.");

    await this.emit(
      createDomainEvent(EventTypes.STUDENT_UPDATED, id, "Student", {
        studentId: id,
        changes: input,
      }),
    );

    return updated;
  }

  async deleteStudent(id: string): Promise<void> {
    const student = await this.students.findById(id);
    if (!student) throw new Error("Estudiante no encontrado.");

    await this.grades.deleteByStudentId(id);
    const deleted = await this.students.delete(id);
    if (!deleted) throw new Error("Estudiante no encontrado.");
  }

  async setEnrollmentPayment(
    studentId: string,
    subjectId: string,
    church: ChurchLocation,
    paymentStatus: PaymentStatus,
  ): Promise<Student> {
    const student = await this.students.findById(studentId);
    if (!student) throw new Error("Estudiante no encontrado.");

    const enrollments = (student.enrollments ?? []).map((enrollment) => {
      if (String(enrollment.subjectId) === String(subjectId) && enrollment.church === church) {
        return { ...enrollment, paymentStatus };
      }
      return enrollment;
    });

    const exists = enrollments.some(
      (enrollment) =>
        String(enrollment.subjectId) === String(subjectId) && enrollment.church === church,
    );
    if (!exists) {
      throw new Error("El estudiante no está inscrito en esa materia.");
    }

    const updated = await this.students.update(studentId, { enrollments });
    if (!updated) throw new Error("Estudiante no encontrado.");

    return updated;
  }

  async retakeEnrollment(
    studentId: string,
    subjectId: string,
    church: ChurchLocation,
  ): Promise<Student> {
    const student = await this.students.findById(studentId);
    if (!student) throw new Error("Estudiante no encontrado.");

    const isEnrolled = (student.enrollments ?? []).some(
      (enrollment) =>
        String(enrollment.subjectId) === String(subjectId) && enrollment.church === church,
    );
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
          paymentStatus: "debt" as PaymentStatus,
          ...(teacherId ? { teacherId } : {}),
        };
      }
      return enrollment;
    });

    const updated = await this.students.update(studentId, { enrollments });
    if (!updated) throw new Error("Estudiante no encontrado.");

    return updated;
  }

  // --- Profesores ---

  async listTeachers(): Promise<Teacher[]> {
    return this.teachers.findAll();
  }

  async createTeacher(input: CreateTeacherInput): Promise<Teacher> {
    const existing = await this.teachers.findByCi(input.ci);
    if (existing) throw new Error("Ya existe un profesor con esa CI.");

    await this.validateQualifiedSubjects(input.qualifiedSubjectIds);

    const teacher = await this.teachers.create(input);

    await this.emit(
      createDomainEvent(EventTypes.TEACHER_CREATED, teacher.id, "Teacher", {
        teacherId: teacher.id,
        ci: teacher.ci,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
      }),
    );

    return teacher;
  }

  async updateTeacher(id: string, input: UpdateTeacherInput): Promise<Teacher> {
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
    if (!updated) throw new Error("Profesor no encontrado.");

    await this.emit(
      createDomainEvent(EventTypes.TEACHER_UPDATED, id, "Teacher", {
        teacherId: id,
        changes: input,
      }),
    );

    return updated;
  }

  async deleteTeacher(id: string): Promise<void> {
    const teacher = await this.teachers.findById(id);
    if (!teacher) throw new Error("Profesor no encontrado.");

    const subjects = await this.subjects.findAll();
    for (const subject of subjects) {
      const offerings = subject.offerings ?? [];
      const nextOfferings = offerings.map((offering) =>
        String(offering.teacherId) === String(id)
          ? { church: offering.church }
          : offering,
      );
      const changed = offerings.some((offering) => String(offering.teacherId) === String(id));
      if (changed) {
        await this.subjects.update(subject.id, { offerings: nextOfferings });
      }
    }

    const students = await this.students.findAll();
    for (const student of students) {
      const enrollments = student.enrollments ?? [];
      const nextEnrollments = enrollments.map((enrollment) => {
        if (String(enrollment.teacherId) !== String(id)) return enrollment;
        const { teacherId: _teacherId, ...rest } = enrollment;
        return rest;
      });
      const changed = enrollments.some((enrollment) => String(enrollment.teacherId) === String(id));
      if (changed) {
        await this.students.update(student.id, { enrollments: nextEnrollments });
      }
    }

    const deleted = await this.teachers.delete(id);
    if (!deleted) throw new Error("Profesor no encontrado.");
  }

  // --- Materias ---

  async listSubjects(): Promise<Subject[]> {
    return this.subjects.findAll();
  }

  async createSubject(input: CreateSubjectInput): Promise<Subject> {
    const existing = await this.subjects.findByCode(input.code);
    if (existing) {
      throw new Error("Ya existe una materia con ese código.");
    }

    await this.validateOfferings(input.code, input.offerings ?? []);

    const subject = await this.subjects.create({
      ...input,
      offerings: input.offerings ?? [],
    });

    await this.emit(
      createDomainEvent(EventTypes.SUBJECT_CREATED, subject.id, "Subject", {
        subjectId: subject.id,
        code: subject.code,
        name: subject.name,
      }),
    );

    return subject;
  }

  async updateSubject(id: string, input: UpdateSubjectInput): Promise<Subject> {
    const current = await this.subjects.findById(id);
    if (!current) throw new Error("Materia no encontrada.");

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
    if (!updated) throw new Error("Materia no encontrada.");

    await this.backfillMissingEnrollmentTeachers(id, updated.offerings ?? []);

    await this.emit(
      createDomainEvent(EventTypes.SUBJECT_UPDATED, id, "Subject", {
        subjectId: id,
        changes: input,
      }),
    );

    return updated;
  }

  async deleteSubject(id: string): Promise<void> {
    const subject = await this.subjects.findById(id);
    if (!subject) throw new Error("Materia no encontrada.");

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
      const nextEnrollments = enrollments.filter(
        (enrollment) => String(enrollment.subjectId) !== String(id),
      );
      if (nextEnrollments.length !== enrollments.length) {
        await this.students.update(student.id, { enrollments: nextEnrollments });
      }
    }

    await this.grades.deleteBySubjectId(id);
    const deleted = await this.subjects.delete(id);
    if (!deleted) throw new Error("Materia no encontrada.");
  }

  // --- Notas ---

  async listGrades(): Promise<Grade[]> {
    return this.grades.findAllCurrent();
  }

  async listAllGrades(): Promise<Grade[]> {
    return this.grades.findAll();
  }

  async createGrade(input: CreateGradeInput): Promise<Grade> {
    await this.validateGradeInput(input);

    const existing = await this.grades.findByEnrollment(
      input.studentId,
      input.subjectId,
      input.church,
    );
    if (existing) {
      throw new Error("Ya existe una nota registrada para esa inscripción.");
    }

    await this.ensureEnrollmentTeacherSnapshot(
      input.studentId,
      input.subjectId,
      input.church,
    );

    const attemptNumber = await this.grades.getNextAttemptNumber(
      input.studentId,
      input.subjectId,
      input.church,
    );

    return this.grades.create({
      ...input,
      attemptNumber,
      isCurrent: true,
    });
  }

  async updateGrade(id: string, input: UpdateGradeInput): Promise<Grade> {
    const current = await this.grades.findById(id);
    if (!current) throw new Error("Nota no encontrada.");

    const nextStudentId = input.studentId ?? current.studentId;
    const nextSubjectId = input.subjectId ?? current.subjectId;
    const nextChurch = input.church ?? current.church;
    const nextFinalGrade = input.finalGrade ?? current.finalGrade;

    await this.validateGradeInput({
      studentId: nextStudentId,
      subjectId: nextSubjectId,
      church: nextChurch,
      finalGrade: nextFinalGrade,
    });

    if (
      nextStudentId !== current.studentId ||
      nextSubjectId !== current.subjectId ||
      nextChurch !== current.church
    ) {
      const duplicate = await this.grades.findByEnrollment(
        nextStudentId,
        nextSubjectId,
        nextChurch,
      );
      if (duplicate && duplicate.id !== id) {
        throw new Error("Ya existe una nota registrada para esa inscripción.");
      }
    }

    const updated = await this.grades.update(id, input);
    if (!updated) throw new Error("Nota no encontrada.");

    return updated;
  }

  private enrollmentKey(subjectId: string, church: ChurchLocation): string {
    return `${subjectId}:${church}`;
  }

  private async resolveTeacherIdForOffering(
    subjectId: string,
    church: ChurchLocation,
  ): Promise<string | undefined> {
    const subject = await this.subjects.findById(subjectId);
    if (!subject) return undefined;

    const teacherId = subject.offerings?.find((offering) => offering.church === church)?.teacherId;
    return teacherId ? String(teacherId) : undefined;
  }

  private async prepareEnrollments(
    nextEnrollments: StudentSubjectEnrollment[],
    currentEnrollments: StudentSubjectEnrollment[] = [],
  ): Promise<StudentSubjectEnrollment[]> {
    const currentByKey = new Map(
      currentEnrollments.map((enrollment) => [
        this.enrollmentKey(enrollment.subjectId, enrollment.church),
        enrollment,
      ]),
    );

    const prepared: StudentSubjectEnrollment[] = [];

    for (const enrollment of nextEnrollments) {
      const key = this.enrollmentKey(enrollment.subjectId, enrollment.church);
      const existing = currentByKey.get(key);
      const teacherId =
        existing?.teacherId ??
        (await this.resolveTeacherIdForOffering(enrollment.subjectId, enrollment.church));

      prepared.push({
        subjectId: enrollment.subjectId,
        church: enrollment.church,
        paymentStatus: enrollment.paymentStatus ?? existing?.paymentStatus ?? "debt",
        ...(teacherId ? { teacherId } : {}),
      });
    }

    return prepared;
  }

  private async backfillMissingEnrollmentTeachers(
    subjectId: string,
    offerings: SubjectChurchOffering[],
  ): Promise<void> {
    const students = await this.students.findAll();

    for (const student of students) {
      let changed = false;
      const enrollments = (student.enrollments ?? []).map((enrollment) => {
        if (String(enrollment.subjectId) !== String(subjectId) || enrollment.teacherId) {
          return enrollment;
        }

        const teacherId = offerings.find((offering) => offering.church === enrollment.church)
          ?.teacherId;
        if (!teacherId) {
          return enrollment;
        }

        changed = true;
        return {
          ...enrollment,
          teacherId: String(teacherId),
        };
      });

      if (changed) {
        await this.students.update(student.id, { enrollments });
      }
    }
  }

  private async ensureEnrollmentTeacherSnapshot(
    studentId: string,
    subjectId: string,
    church: ChurchLocation,
  ): Promise<void> {
    const student = await this.students.findById(studentId);
    if (!student) return;

    const enrollments = student.enrollments ?? [];
    const enrollment = enrollments.find(
      (item) => String(item.subjectId) === String(subjectId) && item.church === church,
    );
    if (!enrollment || enrollment.teacherId) return;

    const teacherId = await this.resolveTeacherIdForOffering(subjectId, church);
    if (!teacherId) return;

    const nextEnrollments = enrollments.map((item) =>
      String(item.subjectId) === String(subjectId) && item.church === church
        ? { ...item, teacherId }
        : item,
    );

    await this.students.update(studentId, { enrollments: nextEnrollments });
  }

  private async validateQualifiedSubjects(subjectIds: string[]): Promise<void> {
    for (const subjectId of subjectIds) {
      const subject = await this.subjects.findById(subjectId);
      if (!subject) throw new Error("Una de las materias seleccionadas no existe.");
    }
  }

  private async validateStudentEnrollments(
    enrollments: StudentSubjectEnrollment[],
  ): Promise<void> {
    const seen = new Set<string>();

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
      const offeredAtChurch = (subject.offerings ?? []).some(
        (offering) => offering.church === enrollment.church,
      );
      if (!offeredAtChurch) {
        throw new Error(`La materia ${subject.name} no se imparte en ${enrollment.church}.`);
      }
    }
  }

  private async validateGradeInput(input: CreateGradeInput): Promise<void> {
    if (!Number.isFinite(input.finalGrade)) {
      throw new Error("La nota final debe ser un número válido.");
    }
    if (input.finalGrade < 0 || input.finalGrade > MAX_GRADE) {
      throw new Error(`La nota final debe estar entre 0 y ${MAX_GRADE}.`);
    }

    const student = await this.students.findById(input.studentId);
    if (!student) throw new Error("El estudiante no existe.");

    const isEnrolled = (student.enrollments ?? []).some(
      (enrollment) =>
        enrollment.subjectId === input.subjectId && enrollment.church === input.church,
    );
    if (!isEnrolled) {
      throw new Error("El estudiante no está inscrito en esa materia en la iglesia indicada.");
    }

    const subject = await this.subjects.findById(input.subjectId);
    if (!subject) throw new Error("La materia no existe.");
  }

  private async validateOfferings(
    subjectCode: string,
    offerings: SubjectChurchOffering[],
  ): Promise<void> {
    const churches = new Set<string>();

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

  private async validateTeacherForSubjectCode(
    teacherId: string,
    subjectCode: string,
  ): Promise<void> {
    const teacher = await this.teachers.findById(teacherId);
    if (!teacher) throw new Error("El profesor asignado no existe.");

    const qualifiedSubjectIds = teacher.qualifiedSubjectIds ?? [];
    const qualifiedSubjects = await Promise.all(
      qualifiedSubjectIds.map((id) => this.subjects.findById(id)),
    );

    const isQualified = qualifiedSubjects.some((qualified) => qualified?.code === subjectCode);
    if (!isQualified) {
      throw new Error("El profesor no está apto para dictar esta materia.");
    }
  }

  private async validateTeacherForSubject(teacherId: string, subjectId: string): Promise<void> {
    const subject = await this.subjects.findById(subjectId);
    if (!subject) throw new Error("La materia no existe.");
    await this.validateTeacherForSubjectCode(teacherId, subject.code);
  }
}
