import { jsPDF } from "jspdf";

import { prisma } from "@/lib/prisma";
import { createXlsx } from "@/lib/xlsx-lite";
import { logAudit } from "@/services/audit-service";

type ExportEntity = "incomes" | "expenses" | "cards" | "reports";
type ExportFormat = "csv" | "xlsx" | "pdf";

async function getRows(userId: string, entity: ExportEntity) {
  if (entity === "incomes") {
    const rows = await prisma.income.findMany({ where: { userId }, include: { category: true, account: true } });
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
    const rows = await prisma.expense.findMany({ where: { userId }, include: { category: true, account: true } });
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
    const rows = await prisma.creditCard.findMany({ where: { userId } });
    return rows.map((row) => ({
      banco: row.bank,
      nome: row.name,
      limite: row.limit.toNumber(),
      fechamento: row.closingDay,
      vencimento: row.dueDay,
      bandeira: row.brand,
      final: row.lastFourDigits,
    }));
  }

  const rows = await prisma.transaction.findMany({ where: { userId }, include: { category: true, account: true } });
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

export async function exportData(userId: string, entity: ExportEntity, format: ExportFormat) {
  const rows = await getRows(userId, entity);
  await logAudit({ userId, action: "EXPORTED", entity, message: `${entity} exportado em ${format}.` });

  if (format === "csv") {
    return { contentType: "text/csv", body: toCsv(rows), filename: `${entity}.csv` };
  }

  if (format === "xlsx") {
    const body = await createXlsx(rows, entity);
    return { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body, filename: `${entity}.xlsx` };
  }

  const doc = new jsPDF();
  doc.text(`MoraisFinanceiro - ${entity}`, 10, 10);
  rows.slice(0, 40).forEach((row, index) => {
    doc.text(Object.values(row).join(" | ").slice(0, 110), 10, 20 + index * 7);
  });
  return { contentType: "application/pdf", body: Buffer.from(doc.output("arraybuffer")), filename: `${entity}.pdf` };
}
