import { prisma } from "@/lib/prisma";

export async function globalSearch(userId: string, query: string) {
  if (!query.trim()) return [];

  const [transactions, categories, accounts, cards] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { category: { name: { contains: query, mode: "insensitive" } } },
          { account: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: { category: true, account: true },
      take: 20,
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({
      where: { userId, name: { contains: query, mode: "insensitive" } },
      take: 10,
    }),
    prisma.financialAccount.findMany({
      where: { userId, name: { contains: query, mode: "insensitive" } },
      take: 10,
    }),
    prisma.creditCard.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { bank: { contains: query, mode: "insensitive" } },
          { lastFourDigits: { contains: query } },
        ],
      },
      take: 10,
    }),
  ]);

  return [
    ...transactions.map((item) => ({ type: "transaction", item })),
    ...categories.map((item) => ({ type: "category", item })),
    ...accounts.map((item) => ({ type: "account", item })),
    ...cards.map((item) => ({ type: "card", item })),
  ];
}
