import type { FinanceOtherIncome, FinanceOutflow, FinancePayment, PaymentMethod, Student, Subject } from "@gestion-notas/domain";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { confirmAction, showError } from "../alerts";
import {
  buildFinanceWorkbook,
  defaultFinanceExportFileName,
} from "../exportFinanceExcel";
import { FiltersPanel } from "../components/FiltersPanel";
import { DeleteIcon, IconButton } from "../components/IconButton";
import { Modal } from "../components/Modal";
import { ErrorBanner, LoadingState, useAsync } from "../hooks";
import { Pagination, usePagination } from "../pagination";
import { includesSearch } from "../search";
import { useAuth } from "../useAuth";
import {
  debtEnrollmentOptionLabel,
  debtKey,
  emptyFinanceForm,
  emptyOtherIncomeForm,
  emptyOutflowForm,
  financeFormToPayload,
  formatLocalAmount,
  formatPaymentDate,
  formatPaymentMethod,
  formatUsd,
  computeLocalAmount,
  listPendingDebts,
  otherIncomeFormToPayload,
  outflowFormToPayload,
  PAYMENT_METHOD_OPTIONS,
  pendingDebtsForStudent,
  studentLabel,
  type FinanceFormState,
  type OtherIncomeFormState,
  type OutflowFormState,
} from "../financeForm";

type MethodFilter = "" | PaymentMethod;
type KindFilter = "all" | "in" | "out";
type IncomeKind = "subject" | "other";

interface CajaRow {
  id: string;
  kind: "in" | "out";
  date: Date;
  concept: string;
  church: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  usdRate: number;
  amountUsd: number;
  amountLocal: number;
  paymentId?: string;
  incomeId?: string;
  outflowId?: string;
  studentCi?: string;
  origin: "subject" | "other" | "outflow";
}

export function FinancePage() {
  const { user } = useAuth();
  const canDelete = user?.role === "admin";
  const { data: payments, loading, error, reload } = useAsync<FinancePayment[]>(
    () => window.api.payments.list(),
    [],
  );
  const {
    data: outflows,
    loading: loadingOutflows,
    error: outflowError,
    reload: reloadOutflows,
  } = useAsync<FinanceOutflow[]>(() => window.api.outflows.list(), []);
  const {
    data: otherIncomes,
    loading: loadingIncomes,
    error: incomeError,
    reload: reloadIncomes,
  } = useAsync<FinanceOtherIncome[]>(() => window.api.incomes.list(), []);
  const { data: students, reload: reloadStudents } = useAsync<Student[]>(
    () => window.api.students.list(),
    [],
  );
  const { data: subjects } = useAsync<Subject[]>(() => window.api.subjects.list(), []);

  const [formError, setFormError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showOutflowForm, setShowOutflowForm] = useState(false);
  const [form, setForm] = useState<FinanceFormState>(emptyFinanceForm());
  const [incomeKind, setIncomeKind] = useState<IncomeKind>("subject");
  const [otherIncomeForm, setOtherIncomeForm] = useState<OtherIncomeFormState>(emptyOtherIncomeForm());
  const [outflowForm, setOutflowForm] = useState<OutflowFormState>(emptyOutflowForm());
  const [searchFilter, setSearchFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const studentMap = useMemo(
    () => new Map((students ?? []).map((student) => [String(student.id), student])),
    [students],
  );
  const subjectMap = useMemo(
    () => new Map((subjects ?? []).map((subject) => [String(subject.id), subject])),
    [subjects],
  );

  const pendingDebts = useMemo(
    () => listPendingDebts(students ?? [], subjects ?? []),
    [students, subjects],
  );

  const cajaRows = useMemo<CajaRow[]>(() => {
    const income = (payments ?? []).map((payment) => {
      const student = studentMap.get(String(payment.studentId));
      const subject = subjectMap.get(String(payment.subjectId));
      const studentName = student ? `${student.firstName} ${student.lastName}` : "Estudiante";
      const subjectName = subject?.name ?? "Materia";
      return {
        id: `in-${payment.id}`,
        kind: "in" as const,
        date: new Date(payment.paymentDate),
        concept: `${studentName} — ${subjectName}`,
        church: payment.church,
        paymentMethod: payment.paymentMethod,
        reference: payment.reference,
        usdRate: payment.usdRate,
        amountUsd: payment.amountUsd,
        amountLocal: payment.amountLocal,
        paymentId: payment.id,
        studentCi: student?.ci ?? "",
        origin: "subject" as const,
      };
    });

    const expenses = (outflows ?? []).map((outflow) => ({
      id: `out-${outflow.id}`,
      kind: "out" as const,
      date: new Date(outflow.outflowDate),
      concept: outflow.reason,
      church: "",
      paymentMethod: outflow.paymentMethod,
      reference: outflow.reference,
      usdRate: outflow.usdRate,
      amountUsd: outflow.amountUsd,
      amountLocal: outflow.amountLocal,
      outflowId: outflow.id,
      studentCi: "",
      origin: "outflow" as const,
    }));

    const extraIncome = (otherIncomes ?? []).map((income) => ({
      id: `other-${income.id}`,
      kind: "in" as const,
      date: new Date(income.incomeDate),
      concept: income.reason,
      church: "",
      paymentMethod: income.paymentMethod,
      reference: income.reference,
      usdRate: income.usdRate,
      amountUsd: income.amountUsd,
      amountLocal: income.amountLocal,
      incomeId: income.id,
      studentCi: "",
      origin: "other" as const,
    }));

    return [...income, ...extraIncome, ...expenses].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [payments, otherIncomes, outflows, studentMap, subjectMap]);

  const filteredRows = useMemo(() => {
    return cajaRows.filter((row) => {
      if (kindFilter !== "all" && row.kind !== kindFilter) return false;
      if (methodFilter && row.paymentMethod !== methodFilter) return false;
      if (
        searchFilter &&
        !includesSearch(row.concept, searchFilter) &&
        !includesSearch(row.church, searchFilter) &&
        !includesSearch(row.studentCi ?? "", searchFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [cajaRows, kindFilter, methodFilter, searchFilter]);

  const { page, setPage, paginatedItems, total, totalPages, pageSize } =
    usePagination(filteredRows);

  useEffect(() => {
    setPage(1);
  }, [searchFilter, methodFilter, kindFilter, setPage]);

  const selectedStudent = form.studentId
    ? studentMap.get(String(form.studentId))
    : undefined;
  const selectedDebts = pendingDebtsForStudent(selectedStudent, subjects ?? []);
  const selectedDebt = selectedDebts.find((debt) => debtKey(debt.enrollment) === form.enrollmentKey);
  const selectedAmountUsd = selectedDebt?.subject?.priceUsd ?? 0;
  const typedUsdRate = Number(form.usdRate.replace(",", "."));
  const previewLocal = computeLocalAmount(selectedAmountUsd, typedUsdRate);

  const otherIncomeUsd = Number(otherIncomeForm.amountUsd.replace(",", "."));
  const otherIncomeRate = Number(otherIncomeForm.usdRate.replace(",", "."));
  const otherIncomePreview = computeLocalAmount(otherIncomeUsd, otherIncomeRate);

  const outflowUsd = Number(outflowForm.amountUsd.replace(",", "."));
  const outflowRate = Number(outflowForm.usdRate.replace(",", "."));
  const outflowPreview = computeLocalAmount(outflowUsd, outflowRate);

  const studentsWithDebts = useMemo(() => {
    const ids = new Set(pendingDebts.map((debt) => String(debt.student.id)));
    return (students ?? []).filter((student) => ids.has(String(student.id)));
  }, [students, pendingDebts]);

  const totals = useMemo(() => {
    return cajaRows.reduce(
      (acc, row) => {
        if (row.kind === "in") {
          acc.inUsd += row.amountUsd;
          acc.inLocal += row.amountLocal;
        } else {
          acc.outUsd += row.amountUsd;
          acc.outLocal += row.amountLocal;
        }
        return acc;
      },
      { inUsd: 0, inLocal: 0, outUsd: 0, outLocal: 0 },
    );
  }, [cajaRows]);

  async function refreshAll() {
    await Promise.all([reload(), reloadOutflows(), reloadIncomes(), reloadStudents()]);
  }

  function openPaymentForm() {
    setForm(emptyFinanceForm());
    setOtherIncomeForm(emptyOtherIncomeForm());
    setIncomeKind("subject");
    setFormError(null);
    setShowPaymentForm(true);
  }

  function closePaymentForm() {
    setShowPaymentForm(false);
    setForm(emptyFinanceForm());
    setOtherIncomeForm(emptyOtherIncomeForm());
    setIncomeKind("subject");
    setFormError(null);
  }

  function openOutflowForm() {
    setOutflowForm(emptyOutflowForm());
    setFormError(null);
    setShowOutflowForm(true);
  }

  function closeOutflowForm() {
    setShowOutflowForm(false);
    setOutflowForm(emptyOutflowForm());
    setFormError(null);
  }

  async function handlePaymentSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      if (incomeKind === "other") {
        await window.api.incomes.create(otherIncomeFormToPayload(otherIncomeForm));
      } else {
        await window.api.payments.create(financeFormToPayload(form));
      }
      closePaymentForm();
      await refreshAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al registrar el ingreso");
    }
  }

  async function handleOutflowSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await window.api.outflows.create(outflowFormToPayload(outflowForm));
      closeOutflowForm();
      await refreshAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al registrar la salida");
    }
  }

  async function handleExportExcel() {
    setExportError(null);
    setExporting(true);
    try {
      const buffer = buildFinanceWorkbook(
        cajaRows.map((row) => ({
          date: row.date,
          kind: row.kind,
          origin: row.origin,
          concept: row.concept,
          church: row.church,
          paymentMethod: row.paymentMethod,
          reference: row.reference,
          usdRate: row.usdRate,
          amountUsd: row.amountUsd,
          amountLocal: row.amountLocal,
        })),
      );
      const result = await window.api.export.saveExcel(
        new Uint8Array(buffer),
        defaultFinanceExportFileName(),
      );
      if (!result.saved) return;
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Error al exportar Excel");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(row: CajaRow) {
    if (!canDelete) return;
    const confirmed = await confirmAction({
      title: row.kind === "in" ? "Eliminar ingreso" : "Eliminar salida",
      text:
        row.kind === "in" && row.paymentId
          ? `¿Eliminar el ingreso de ${row.concept}? La materia volverá a quedar como deuda.`
          : `¿Eliminar ${row.kind === "in" ? "el ingreso" : "la salida"} "${row.concept}"?`,
      confirmText: "Eliminar",
    });
    if (!confirmed) return;

    try {
      if (row.kind === "in" && row.paymentId) {
        await window.api.payments.void(row.paymentId);
      } else if (row.kind === "in" && row.incomeId) {
        await window.api.incomes.void(row.incomeId);
      } else if (row.kind === "out" && row.outflowId) {
        await window.api.outflows.void(row.outflowId);
      }
      await refreshAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar el movimiento";
      await showError("No se pudo eliminar", message);
    }
  }

  const busy = loading || loadingOutflows || loadingIncomes;

  return (
    <>
      <div className="page-header">
        <div className="page-header-main">
          <h2>Finanzas</h2>
          <p className="page-subtitle">Caja de ingresos y salidas</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={exporting || cajaRows.length === 0}
            onClick={handleExportExcel}
          >
            {exporting ? "Exportando..." : "Descargar Excel"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={openOutflowForm}>
            Registrar salida
          </button>
          <button type="button" className="btn btn-primary" onClick={openPaymentForm}>
            Registrar ingreso
          </button>
        </div>
      </div>
      <ErrorBanner message={error ?? outflowError ?? incomeError ?? exportError} />

      <FiltersPanel>
        <div className="filters-bar">
          <label>
            Buscar
            <input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Estudiante, materia o motivo"
            />
          </label>
          <label>
            Tipo
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as KindFilter)}
            >
              <option value="all">Todos</option>
              <option value="in">Ingresos</option>
              <option value="out">Salidas</option>
            </select>
          </label>
          <label>
            Modo
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}
            >
              <option value="">Todos</option>
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </FiltersPanel>

      <Modal open={showPaymentForm} title="Registrar ingreso" onClose={closePaymentForm} size="lg">
        {formError && <p className="field-hint error-text">{formError}</p>}
        <form onSubmit={handlePaymentSubmit}>
          <div className="form-grid">
            <label>
              Tipo de ingreso
              <select
                value={incomeKind}
                onChange={(e) => setIncomeKind(e.target.value as IncomeKind)}
              >
                <option value="subject">Pago de materia</option>
                <option value="other">Otro motivo</option>
              </select>
            </label>
            {incomeKind === "subject" ? (
              <>
                <label>
                  Estudiante
                  <select
                    required
                    value={form.studentId}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        studentId: e.target.value,
                        enrollmentKey: "",
                      })
                    }
                  >
                    <option value="">Seleccione...</option>
                    {studentsWithDebts.map((student) => (
                      <option key={student.id} value={student.id}>
                        {studentLabel(student)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Materia pendiente
                  <select
                    required
                    value={form.enrollmentKey}
                    disabled={!form.studentId}
                    onChange={(e) => setForm({ ...form, enrollmentKey: e.target.value })}
                  >
                    <option value="">Seleccione...</option>
                    {selectedDebts.map((debt) => {
                      const key = debtKey(debt.enrollment);
                      return (
                        <option key={key} value={key}>
                          {debtEnrollmentOptionLabel(debt)}
                        </option>
                      );
                    })}
                  </select>
                  {form.studentId && selectedDebts.length === 0 && (
                    <span className="field-hint">Este estudiante no tiene materias pendientes de ingreso.</span>
                  )}
                  {!form.studentId && studentsWithDebts.length === 0 && (
                    <span className="field-hint">No hay materias pendientes. Use “Otro motivo” para un ingreso distinto.</span>
                  )}
                </label>
                <label>
                  Fecha de ingreso
                  <input
                    required
                    type="date"
                    value={form.paymentDate}
                    onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                  />
                </label>
                <label>
                  Modo
                  <select
                    required
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        paymentMethod: e.target.value as FinanceFormState["paymentMethod"],
                        reference: e.target.value === "mobile" ? form.reference : "",
                      })
                    }
                  >
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {form.paymentMethod === "mobile" && (
                  <label>
                    Referencia
                    <input
                      type="text"
                      value={form.reference}
                      onChange={(e) => setForm({ ...form, reference: e.target.value })}
                      placeholder="Opcional"
                    />
                  </label>
                )}
                <label>
                  Valor del dólar
                  <input
                    required
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={form.usdRate}
                    onChange={(e) => setForm({ ...form, usdRate: e.target.value })}
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Fecha de ingreso
                  <input
                    required
                    type="date"
                    value={otherIncomeForm.incomeDate}
                    onChange={(e) =>
                      setOtherIncomeForm({ ...otherIncomeForm, incomeDate: e.target.value })
                    }
                  />
                </label>
                <label>
                  Motivo
                  <input
                    required
                    type="text"
                    value={otherIncomeForm.reason}
                    onChange={(e) =>
                      setOtherIncomeForm({ ...otherIncomeForm, reason: e.target.value })
                    }
                    placeholder="Ej. donación, venta, ofrenda"
                  />
                </label>
                <label>
                  Modo
                  <select
                    required
                    value={otherIncomeForm.paymentMethod}
                    onChange={(e) =>
                      setOtherIncomeForm({
                        ...otherIncomeForm,
                        paymentMethod: e.target.value as OtherIncomeFormState["paymentMethod"],
                        reference: e.target.value === "mobile" ? otherIncomeForm.reference : "",
                      })
                    }
                  >
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {otherIncomeForm.paymentMethod === "mobile" && (
                  <label>
                    Referencia
                    <input
                      type="text"
                      value={otherIncomeForm.reference}
                      onChange={(e) =>
                        setOtherIncomeForm({ ...otherIncomeForm, reference: e.target.value })
                      }
                      placeholder="Opcional"
                    />
                  </label>
                )}
                <label>
                  Monto USD
                  <input
                    required
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={otherIncomeForm.amountUsd}
                    onChange={(e) =>
                      setOtherIncomeForm({ ...otherIncomeForm, amountUsd: e.target.value })
                    }
                  />
                </label>
                <label>
                  Valor del dólar
                  <input
                    required
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={otherIncomeForm.usdRate}
                    onChange={(e) =>
                      setOtherIncomeForm({ ...otherIncomeForm, usdRate: e.target.value })
                    }
                  />
                </label>
              </>
            )}
          </div>
          {incomeKind === "subject" && selectedDebt && (
            <div className="finance-preview">
              <span>
                Valor materia: <strong>{formatUsd(selectedAmountUsd)}</strong>
              </span>
              <span>
                Total del ingreso: <strong>{previewLocal > 0 ? formatLocalAmount(previewLocal) : "—"}</strong>
              </span>
            </div>
          )}
          {incomeKind === "other" && otherIncomePreview > 0 && (
            <div className="finance-preview">
              <span>
                Total del ingreso: <strong>{formatLocalAmount(otherIncomePreview)}</strong>
              </span>
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closePaymentForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Registrar ingreso
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={showOutflowForm} title="Registrar salida" onClose={closeOutflowForm} size="lg">
        {formError && <p className="field-hint error-text">{formError}</p>}
        <form onSubmit={handleOutflowSubmit}>
          <div className="form-grid">
            <label>
              Fecha
              <input
                required
                type="date"
                value={outflowForm.outflowDate}
                onChange={(e) => setOutflowForm({ ...outflowForm, outflowDate: e.target.value })}
              />
            </label>
            <label>
              Motivo
              <input
                required
                type="text"
                value={outflowForm.reason}
                onChange={(e) => setOutflowForm({ ...outflowForm, reason: e.target.value })}
                placeholder="Ej. compra de material"
              />
            </label>
            <label>
              Modo
              <select
                required
                value={outflowForm.paymentMethod}
                onChange={(e) =>
                  setOutflowForm({
                    ...outflowForm,
                    paymentMethod: e.target.value as OutflowFormState["paymentMethod"],
                    reference: e.target.value === "mobile" ? outflowForm.reference : "",
                  })
                }
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {outflowForm.paymentMethod === "mobile" && (
              <label>
                Referencia
                <input
                  type="text"
                  value={outflowForm.reference}
                  onChange={(e) => setOutflowForm({ ...outflowForm, reference: e.target.value })}
                  placeholder="Opcional"
                />
              </label>
            )}
            <label>
              Monto USD
              <input
                required
                type="number"
                min={0.01}
                step={0.01}
                value={outflowForm.amountUsd}
                onChange={(e) => setOutflowForm({ ...outflowForm, amountUsd: e.target.value })}
              />
            </label>
            <label>
              Valor del dólar
              <input
                required
                type="number"
                min={0.01}
                step={0.01}
                value={outflowForm.usdRate}
                onChange={(e) => setOutflowForm({ ...outflowForm, usdRate: e.target.value })}
              />
            </label>
          </div>
          {outflowPreview > 0 && (
            <div className="finance-preview">
              <span>
                Total salida: <strong>{formatLocalAmount(outflowPreview)}</strong>
              </span>
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeOutflowForm}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Registrar salida
            </button>
          </div>
        </form>
      </Modal>

      <div className="card">
        <LoadingState loading={busy} />
        {!busy && cajaRows.length > 0 && (
          <div className="finance-summary">
            <span>
              Ingresos: <strong>{formatUsd(totals.inUsd)}</strong> ({formatLocalAmount(totals.inLocal)})
            </span>
            <span>
              Salidas: <strong>{formatUsd(totals.outUsd)}</strong> ({formatLocalAmount(totals.outLocal)})
            </span>
            <span>
              Valor en caja:{" "}
              <strong>
                {formatUsd(totals.inUsd - totals.outUsd)} ({formatLocalAmount(totals.inLocal - totals.outLocal)})
              </strong>
            </span>
          </div>
        )}
        {!busy && filteredRows.length === 0 && (
          <p className="empty-state">
            {cajaRows.length === 0
              ? "Aún no hay movimientos de caja."
              : "Ningún movimiento coincide con los filtros."}
          </p>
        )}
        {!busy && filteredRows.length > 0 && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Concepto</th>
                    <th>Iglesia</th>
                    <th>Modo</th>
                    <th>Referencia</th>
                    <th>Dólar</th>
                    <th>USD</th>
                    <th>Bs.</th>
                    {canDelete && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((row) => (
                    <tr key={row.id} className={row.kind === "out" ? "finance-row-out" : undefined}>
                      <td>{formatPaymentDate(row.date)}</td>
                      <td>
                        <span className={`finance-kind${row.kind === "in" ? " is-in" : " is-out"}`}>
                          {row.kind === "in" ? "Ingreso" : "Salida"}
                        </span>
                      </td>
                      <td>{row.concept}</td>
                      <td>{row.church ? <span className="tag-badge">{row.church}</span> : "—"}</td>
                      <td>{formatPaymentMethod(row.paymentMethod)}</td>
                      <td>{row.reference?.trim() ? row.reference : "—"}</td>
                      <td>{formatLocalAmount(row.usdRate)}</td>
                      <td className="grade-score">{formatUsd(row.amountUsd)}</td>
                      <td className="grade-score">{formatLocalAmount(row.amountLocal)}</td>
                      {canDelete && (
                        <td>
                          <div className="table-actions">
                            <IconButton
                              label={row.kind === "in" ? "Eliminar ingreso" : "Eliminar salida"}
                              variant="danger"
                              onClick={() => handleDelete(row)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </>
  );
}
