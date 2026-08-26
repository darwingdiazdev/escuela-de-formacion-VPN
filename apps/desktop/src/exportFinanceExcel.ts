import * as XLSX from "xlsx";
import { formatPaymentDate, formatPaymentMethod } from "./financeForm";
import type { PaymentMethod } from "@gestion-notas/domain";

export type FinanceExportOrigin = "subject" | "other" | "outflow";

export interface FinanceExportMovement {
  date: Date;
  kind: "in" | "out";
  origin: FinanceExportOrigin;
  concept: string;
  church: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  usdRate: number;
  amountUsd: number;
  amountLocal: number;
}

function originLabel(origin: FinanceExportOrigin): string {
  if (origin === "subject") return "Pago de materia";
  if (origin === "other") return "Otro motivo";
  return "Salida";
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildFinanceWorkbook(movements: FinanceExportMovement[]): ArrayBuffer {
  const sorted = [...movements].sort((a, b) => a.date.getTime() - b.date.getTime());
  const inUsd = roundMoney(
    sorted.filter((item) => item.kind === "in").reduce((sum, item) => sum + item.amountUsd, 0),
  );
  const inLocal = roundMoney(
    sorted.filter((item) => item.kind === "in").reduce((sum, item) => sum + item.amountLocal, 0),
  );
  const outUsd = roundMoney(
    sorted.filter((item) => item.kind === "out").reduce((sum, item) => sum + item.amountUsd, 0),
  );
  const outLocal = roundMoney(
    sorted.filter((item) => item.kind === "out").reduce((sum, item) => sum + item.amountLocal, 0),
  );

  const issuedAt = new Date();
  const consolidado = XLSX.utils.aoa_to_sheet([
    ["Caja — Consolidado"],
    ["Fecha de emisión", issuedAt.toLocaleString("es-VE")],
    ["Movimientos", sorted.length],
    [],
    ["Concepto", "USD", "Bs."],
    ["Ingresos", inUsd, inLocal],
    ["Salidas", outUsd, outLocal],
    ["Valor actual en caja", roundMoney(inUsd - outUsd), roundMoney(inLocal - outLocal)],
  ]);
  consolidado["!cols"] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }];

  const movimientoRows = sorted.map((item) => ({
    Fecha: formatPaymentDate(item.date),
    Tipo: item.kind === "in" ? "Ingreso" : "Salida",
    Origen: originLabel(item.origin),
    Concepto: item.concept,
    Iglesia: item.church || "—",
    Modo: formatPaymentMethod(item.paymentMethod),
    Referencia: item.reference?.trim() || "—",
    "Valor dólar": roundMoney(item.usdRate),
    USD: roundMoney(item.kind === "in" ? item.amountUsd : -item.amountUsd),
    "Bs.": roundMoney(item.kind === "in" ? item.amountLocal : -item.amountLocal),
  }));

  const movimientos = XLSX.utils.json_to_sheet(
    movimientoRows.length > 0
      ? movimientoRows
      : [
          {
            Fecha: "—",
            Tipo: "—",
            Origen: "—",
            Concepto: "Sin movimientos",
            Iglesia: "—",
            Modo: "—",
            Referencia: "—",
            "Valor dólar": 0,
            USD: 0,
            "Bs.": 0,
          },
        ],
  );
  movimientos["!cols"] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 40 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, consolidado, "Consolidado");
  XLSX.utils.book_append_sheet(workbook, movimientos, "Movimientos");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export function defaultFinanceExportFileName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `caja-consolidado-${date}.xlsx`;
}
