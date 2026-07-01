import { parseXlsx } from "@/lib/xlsx-lite";
import { logAudit } from "@/services/audit-service";
import { expenseService } from "@/services/expense-service";
import { incomeService } from "@/services/income-service";
import { importSchema } from "@/validators/finance";

function parseCsv(content: string) {
  const [headerLine, ...lines] = content.trim().split(/\r?\n/);
  const headers = headerLine.split(",").map((item) => item.trim().replaceAll('"', ""));
  return lines.map((line) => {
    const values = line.split(",").map((item) => item.trim().replaceAll('"', ""));
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

async function parseRows(content: string) {
  if (content.startsWith("data:")) {
    const base64 = content.split(",")[1] ?? "";
    return parseXlsx(Buffer.from(base64, "base64"));
  }

  return parseCsv(content);
}

function mapRow(row: Record<string, string>) {
  return {
    title: row.titulo ?? row.title ?? row.descricao ?? "Importado",
    amount: Number(row.valor ?? row.amount ?? 0),
    date: row.data ?? row.date ?? new Date().toISOString(),
    categoryId: row.categoryId ?? row.categoriaId ?? row.category ?? "",
    accountId: row.accountId ?? row.contaId ?? row.account ?? "",
    status: row.status ?? "PENDING",
  };
}

export async function importData(userId: string, payload: unknown) {
  const data = importSchema.parse(payload);
  const rows = (await parseRows(data.content)).map(mapRow);
  const imported = [];

  for (const row of rows) {
    if (!row.categoryId || !row.accountId || !row.amount) continue;
    imported.push(
      data.entity === "incomes"
        ? await incomeService.create(userId, row)
        : await expenseService.create(userId, row),
    );
  }

  await logAudit({ userId, action: "IMPORTED", entity: data.entity, message: `${imported.length} registro(s) importado(s).` });
  return { imported: imported.length };
}
