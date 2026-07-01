import type { AuditAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export function logAudit(input: {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({ data: input });
}

export function listAuditLogs(userId: string) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
