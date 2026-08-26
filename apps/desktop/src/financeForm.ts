import type {
  ChurchLocation,
  CreateFinanceOtherIncomeInput,
  CreateFinanceOutflowInput,
  CreateFinancePaymentInput,
  PaymentMethod,
  Student,
  StudentSubjectEnrollment,
  Subject,
} from "@gestion-notas/domain";
import { enrollmentKey, parseEnrollmentKey, studentLabel } from "./gradeForm";

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "mobile", label: "Pago móvil" },
];

export interface FinanceFormState {
  studentId: string;
  enrollmentKey: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  usdRate: string;
  reference: string;
}

export interface OtherIncomeFormState {
  incomeDate: string;
  reason: string;
  paymentMethod: PaymentMethod;
  usdRate: string;
  amountUsd: string;
  reference: string;
}

export interface OutflowFormState {
  outflowDate: string;
  reason: string;
  paymentMethod: PaymentMethod;
  usdRate: string;
  amountUsd: string;
  reference: string;
}

export interface PendingDebt {
  student: Student;
  enrollment: StudentSubjectEnrollment;
  subject?: Subject;
}

function todayInput(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function emptyFinanceForm(overrides: Partial<FinanceFormState> = {}): FinanceFormState {
  return {
    studentId: "",
    enrollmentKey: "",
    paymentDate: todayInput(),
    paymentMethod: "cash",
    usdRate: "",
    reference: "",
    ...overrides,
  };
}

export function emptyOutflowForm(overrides: Partial<OutflowFormState> = {}): OutflowFormState {
  return {
    outflowDate: todayInput(),
    reason: "",
    paymentMethod: "cash",
    usdRate: "",
    amountUsd: "",
    reference: "",
    ...overrides,
  };
}

export function emptyOtherIncomeForm(overrides: Partial<OtherIncomeFormState> = {}): OtherIncomeFormState {
  return {
    incomeDate: todayInput(),
    reason: "",
    paymentMethod: "cash",
    usdRate: "",
    amountUsd: "",
    reference: "",
    ...overrides,
  };
}

export function financeFormToPayload(form: FinanceFormState): CreateFinancePaymentInput {
  if (!form.studentId) {
    throw new Error("Seleccione un estudiante.");
  }
  if (!form.enrollmentKey) {
    throw new Error("Seleccione la materia pendiente.");
  }
  if (!form.paymentDate) {
    throw new Error("Ingrese la fecha de ingreso.");
  }

  const usdRate = Number(form.usdRate.replace(",", "."));
  if (!Number.isFinite(usdRate) || usdRate <= 0) {
    throw new Error("Ingrese el valor del dólar al día del ingreso.");
  }

  const { subjectId, church } = parseEnrollmentKey(form.enrollmentKey);
  const reference = form.paymentMethod === "mobile" ? form.reference.trim() : "";

  return {
    studentId: form.studentId,
    subjectId,
    church,
    paymentDate: new Date(form.paymentDate),
    paymentMethod: form.paymentMethod,
    usdRate,
    ...(reference ? { reference } : {}),
  };
}

export function outflowFormToPayload(form: OutflowFormState): CreateFinanceOutflowInput {
  if (!form.outflowDate) {
    throw new Error("Ingrese la fecha de la salida.");
  }
  const reason = form.reason.trim();
  if (!reason) {
    throw new Error("Ingrese el motivo de la salida.");
  }

  const usdRate = Number(form.usdRate.replace(",", "."));
  if (!Number.isFinite(usdRate) || usdRate <= 0) {
    throw new Error("Ingrese el valor del dólar al día de la salida.");
  }

  const amountUsd = Number(form.amountUsd.replace(",", "."));
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new Error("Ingrese el monto de la salida en dólares.");
  }

  const reference = form.paymentMethod === "mobile" ? form.reference.trim() : "";

  return {
    outflowDate: new Date(form.outflowDate),
    reason,
    paymentMethod: form.paymentMethod,
    usdRate,
    amountUsd,
    ...(reference ? { reference } : {}),
  };
}

export function otherIncomeFormToPayload(form: OtherIncomeFormState): CreateFinanceOtherIncomeInput {
  if (!form.incomeDate) {
    throw new Error("Ingrese la fecha de ingreso.");
  }
  const reason = form.reason.trim();
  if (!reason) {
    throw new Error("Ingrese el motivo del ingreso.");
  }

  const usdRate = Number(form.usdRate.replace(",", "."));
  if (!Number.isFinite(usdRate) || usdRate <= 0) {
    throw new Error("Ingrese el valor del dólar al día del ingreso.");
  }

  const amountUsd = Number(form.amountUsd.replace(",", "."));
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new Error("Ingrese el monto del ingreso en dólares.");
  }

  const reference = form.paymentMethod === "mobile" ? form.reference.trim() : "";

  return {
    incomeDate: new Date(form.incomeDate),
    reason,
    paymentMethod: form.paymentMethod,
    usdRate,
    amountUsd,
    ...(reference ? { reference } : {}),
  };
}

export function formatPaymentMethod(method: PaymentMethod): string {
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ?? method;
}

export function formatPaymentDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("es-VE");
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatLocalAmount(value: number): string {
  return `Bs. ${new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

export function computeLocalAmount(amountUsd: number, usdRate: number): number {
  if (!Number.isFinite(amountUsd) || !Number.isFinite(usdRate) || usdRate <= 0) return 0;
  return Math.round(amountUsd * usdRate * 100) / 100;
}

export function listPendingDebts(students: Student[], subjects: Subject[]): PendingDebt[] {
  const subjectMap = new Map(subjects.map((subject) => [String(subject.id), subject]));
  const pending: PendingDebt[] = [];

  for (const student of students) {
    for (const enrollment of student.enrollments ?? []) {
      if (enrollment.paymentStatus !== "debt") continue;
      pending.push({
        student,
        enrollment,
        subject: subjectMap.get(String(enrollment.subjectId)),
      });
    }
  }

  return pending.sort((a, b) => {
    const nameA = `${a.student.lastName} ${a.student.firstName}`;
    const nameB = `${b.student.lastName} ${b.student.firstName}`;
    const byName = nameA.localeCompare(nameB, "es");
    if (byName !== 0) return byName;
    const subjectA = a.subject?.name ?? "";
    const subjectB = b.subject?.name ?? "";
    return subjectA.localeCompare(subjectB, "es");
  });
}

export function pendingDebtsForStudent(
  student: Student | undefined,
  subjects: Subject[],
): PendingDebt[] {
  if (!student) return [];
  return listPendingDebts([student], subjects);
}

export function debtEnrollmentOptionLabel(debt: PendingDebt): string {
  const subjectName = debt.subject?.name ?? "Materia";
  const price = debt.subject ? ` — ${formatUsd(debt.subject.priceUsd)}` : "";
  return `${subjectName} — ${debt.enrollment.church}${price}`;
}

export function debtKey(enrollment: { subjectId: string; church: ChurchLocation }): string {
  return enrollmentKey(enrollment.subjectId, enrollment.church);
}

export { studentLabel };
