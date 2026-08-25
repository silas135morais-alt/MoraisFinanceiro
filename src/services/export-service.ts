import { jsPDF } from "jspdf";

import { prisma } from "@/lib/prisma";
import { getMonthRange } from "@/lib/date-range";
import { createXlsx } from "@/lib/xlsx-lite";
import { logAudit } from "@/services/audit-service";

type ExportEntity = "incomes" | "expenses" | "cards" | "reports";
type ExportFormat = "csv" | "xlsx" | "pdf";

async function getRows(userId: string, entity: ExportEntity, referenceDate?: Date) {
  const range = referenceDate ? getMonthRange(referenceDate) : null;
  if (entity === "incomes") {
    const rows = await prisma.income.findMany({ where: { userId, ...(range ? { date: { gte: range.startsAt, lte: range.endsAt } } : {}) }, include: { category: true, account: true } });
    return rows.map((row) => ({
      titulo: row.title,
      categoria: row.category.name,
      conta: row.account.name,
      valor: row.amount.toNumber(),
      data: row.date.toISOString(),
      status: row.status,
    }));
  }

  if (entity === "expenses") {
    const rows = await prisma.expense.findMany({ where: { userId, ...(range ? { date: { gte: range.startsAt, lte: range.endsAt } } : {}) }, include: { category: true, account: true } });
    return rows.map((row) => ({
      titulo: row.title,
      categoria: row.category.name,
      conta: row.account.name,
      valor: row.amount.toNumber(),
      data: row.date.toISOString(),
      vencimento: row.dueDate?.toISOString() ?? "",
      status: row.status,
    }));
  }

  if (entity === "cards") {
    const rows = await prisma.creditCardPurchase.findMany({
      where: { userId, ...(range ? { date: { gte: range.startsAt, lte: range.endsAt } } : {}) },
      include: { card: true, category: true },
      orderBy: { date: "asc" },
    });
    return rows.map((row) => ({
      cartao: row.card.name,
      banco: row.card.bank,
      compra: row.title,
      categoria: row.category.name,
      valor: row.amount.toNumber(),
      data: row.date.toISOString(),
      parcela: `${row.installmentNumber}/${row.installments}`,
      status: row.status,
    }));
  }

  const rows = await prisma.transaction.findMany({ where: { userId, ...(range ? { OR: [{ date: { gte: range.startsAt, lte: range.endsAt } }, { paidAt: { gte: range.startsAt, lte: range.endsAt } }, { dueDate: { gte: range.startsAt, lte: range.endsAt } }] } : {}) }, include: { category: true, account: true } });
  return rows.map((row) => ({
    tipo: row.type,
    titulo: row.title,
    categoria: row.category?.name ?? "",
    conta: row.account?.name ?? "",
    valor: row.amount.toNumber(),
    data: row.date.toISOString(),
    status: row.status,
  }));
}

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export async function exportData(userId: string, entity: ExportEntity, format: ExportFormat, referenceDate?: Date) {
  const rows = await getRows(userId, entity, referenceDate);
  await logAudit({ userId, action: "EXPORTED", entity, message: `${entity} exportado em ${format}.` });

  if (format === "csv") {
    return { contentType: "text/csv", body: toCsv(rows), filename: `${entity}.csv` };
  }

  if (format === "xlsx") {
    const body = await createXlsx(rows, entity);
    return { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body, filename: `${entity}.xlsx` };
  }

  const doc = new jsPDF();
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const drawHeader = () => {
    doc.setFontSize(9);
    doc.text(`MoraisFinanceiro - ${entity}`, 10, 10);
    if (headers.length) {
      doc.setFontSize(7);
      doc.text(headers.join(" | ").slice(0, 110), 10, 17);
    }
  };
  drawHeader();
  let y = headers.length ? 24 : 20;
  doc.setFontSize(7);
  for (const row of rows) {
    if (y > 280) {
      doc.addPage();
      drawHeader();
      y = headers.length ? 24 : 20;
    }
    doc.text(Object.values(row).join(" | ").slice(0, 110), 10, y);
    y += 7;
  }
  return { contentType: "application/pdf", body: Buffer.from(doc.output("arraybuffer")), filename: `${entity}.pdf` };
}
