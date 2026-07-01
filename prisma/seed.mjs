import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const incomeCategories = ["Salário", "Freelance", "Comissão", "Investimentos", "Outros"];
const expenseCategories = [
  "Alimentação",
  "Transporte",
  "Combustível",
  "Moradia",
  "Internet",
  "Celular",
  "Marketing",
  "Ferramentas",
  "Saúde",
  "Educação",
  "Lazer",
  "Assinaturas",
  "Outros",
];
const accounts = ["Carteira", "Nubank", "PicPay", "Banco do Brasil", "Caixa", "Inter", "Dinheiro"];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@moraisfinanceiro.local" },
    update: {},
    create: { name: "Usuário Demo", email: "demo@moraisfinanceiro.local" },
  });

  for (const name of incomeCategories) {
    await prisma.category.upsert({
      where: { userId_type_name: { userId: user.id, type: "INCOME", name } },
      update: {},
      create: { userId: user.id, name, type: "INCOME", isDefault: true },
    });
  }

  for (const name of expenseCategories) {
    await prisma.category.upsert({
      where: { userId_type_name: { userId: user.id, type: "EXPENSE", name } },
      update: {},
      create: { userId: user.id, name, type: "EXPENSE", isDefault: true },
    });
  }

  for (const [index, name] of accounts.entries()) {
    await prisma.financialAccount.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: {},
      create: {
        userId: user.id,
        name,
        institution: name === "Dinheiro" ? null : name,
        type: name === "Dinheiro" || name === "Carteira" ? "CASH" : "CHECKING",
        isDefault: index === 0,
      },
    });
  }

  const monthStart = new Date("2026-06-01T00:00:00.000Z");
  await prisma.month.upsert({
    where: { userId_year_month: { userId: user.id, year: 2026, month: 6 } },
    update: {},
    create: {
      userId: user.id,
      year: 2026,
      month: 6,
      label: "Junho 2026",
      startsAt: monthStart,
      endsAt: new Date("2026-06-30T23:59:59.999Z"),
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
