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
  PAYMENT_REGISTERED: "payment.registered",
  PAYMENT_VOIDED: "payment.voided",
  OUTFLOW_REGISTERED: "outflow.registered",
  OUTFLOW_VOIDED: "outflow.voided",
  INCOME_REGISTERED: "income.registered",
  INCOME_VOIDED: "income.voided",
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

export interface PaymentRegisteredPayload {
  paymentId: string;
  studentId: string;
  subjectId: string;
  church: string;
  amountUsd: number;
  amountLocal: number;
}

export interface PaymentVoidedPayload {
  paymentId: string;
  studentId: string;
  subjectId: string;
  church: string;
}

export interface OutflowRegisteredPayload {
  outflowId: string;
  reason: string;
  amountUsd: number;
  amountLocal: number;
}

export interface OutflowVoidedPayload {
  outflowId: string;
  reason: string;
}

export interface IncomeRegisteredPayload {
  incomeId: string;
  reason: string;
  amountUsd: number;
  amountLocal: number;
}

export interface IncomeVoidedPayload {
  incomeId: string;
  reason: string;
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
