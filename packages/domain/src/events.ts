export interface DomainEvent<TPayload = unknown> {
  readonly id: string;
  readonly type: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly payload: TPayload;
  readonly occurredAt: Date;
  readonly version: number;
}

export const EventTypes = {
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  STUDENT_CREATED: "student.created",
  STUDENT_UPDATED: "student.updated",
  TEACHER_CREATED: "teacher.created",
  TEACHER_UPDATED: "teacher.updated",
  SUBJECT_CREATED: "subject.created",
  SUBJECT_UPDATED: "subject.updated",
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export interface UserCreatedPayload {
  userId: string;
  email: string;
  role: string;
}

export interface UserUpdatedPayload {
  userId: string;
  changes: Record<string, unknown>;
}

export interface StudentCreatedPayload {
  studentId: string;
  ci: string;
  firstName: string;
  lastName: string;
}

export interface StudentUpdatedPayload {
  studentId: string;
  changes: Record<string, unknown>;
}

export interface TeacherCreatedPayload {
  teacherId: string;
  ci: string;
  firstName: string;
  lastName: string;
}

export interface TeacherUpdatedPayload {
  teacherId: string;
  changes: Record<string, unknown>;
}

export interface SubjectCreatedPayload {
  subjectId: string;
  code: string;
  name: string;
}

export interface SubjectUpdatedPayload {
  subjectId: string;
  changes: Record<string, unknown>;
}

function generateEventId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createDomainEvent<TPayload>(
  type: EventType,
  aggregateId: string,
  aggregateType: string,
  payload: TPayload,
  version = 1,
): DomainEvent<TPayload> {
  return {
    id: generateEventId(),
    type,
    aggregateId,
    aggregateType,
    payload,
    occurredAt: new Date(),
    version,
  };
}
