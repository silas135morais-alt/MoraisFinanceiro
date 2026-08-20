import { prisma } from "@/lib/prisma";
import { driverProfileSchema } from "@/validators/finance";

export const defaultDriverProfile = {
  dailyGrossTarget: 250,
  workDays: 26,
  fuelPercent: 25,
  maintenancePercent: 8,
  emergencyPercent: 10,
  taxPercent: 5,
  debtPercent: 15,
  minimumReserve: 500,
};

export async function getDriverProfile(userId: string) {
  try {
    const profile = await prisma.driverProfile.findUnique({ where: { userId } });
    if (profile) return profile;
    return { ...defaultDriverProfile, userId, id: null };
  } catch {
    // Mantém o dashboard funcional durante a janela entre publicação e aplicação da migração.
    return { ...defaultDriverProfile, userId, id: null };
  }
}

export async function upsertDriverProfile(userId: string, payload: unknown) {
  const data = driverProfileSchema.parse(payload);
  return prisma.driverProfile.upsert({
    where: { userId },
    update: data,
    create: { ...data, userId },
  });
}

export function serializeDriverProfile(profile: Awaited<ReturnType<typeof getDriverProfile>>) {
  return {
    dailyGrossTarget: Number(profile.dailyGrossTarget),
    workDays: Number(profile.workDays),
    fuelPercent: Number(profile.fuelPercent),
    maintenancePercent: Number(profile.maintenancePercent),
    emergencyPercent: Number(profile.emergencyPercent),
    taxPercent: Number(profile.taxPercent),
    debtPercent: Number(profile.debtPercent),
    minimumReserve: Number(profile.minimumReserve),
    saved: Boolean(profile.id),
  };
}
