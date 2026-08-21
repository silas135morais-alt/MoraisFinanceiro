import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../prisma/migrations/20260630153000_financial_core/migration.sql", import.meta.url),
  "utf8",
);
const driverDailyMigration = readFileSync(
  new URL("../prisma/migrations/20260820190000_driver_daily_earnings/migration.sql", import.meta.url),
  "utf8",
);

test("schema contains required financial models", () => {
  [
    "User",
    "Account",
    "Category",
    "Income",
    "Expense",
    "CreditCard",
    "CreditCardPurchase",
    "Budget",
    "Investment",
    "InvestmentContribution",
    "Asset",
    "Month",
    "RecurringTransaction",
    "Attachment",
    "Transaction",
    "MonthClosing",
    "Subscription",
    "Financing",
    "Notification",
    "AuditLog",
    "DriverProfile",
    "DriverDailyEarning",
  ].forEach((model) => assert.match(schema, new RegExp(`model ${model} \\{`)));
});

test("relationships protect user data through userId indexes", () => {
  ["Category", "Income", "Expense", "CreditCard", "CreditCardPurchase", "Budget", "Investment", "Asset"].forEach((model) => {
    const block = schema.match(new RegExp(`model ${model} \\{[\\s\\S]*?\\n\\}`))?.[0] ?? "";
    assert.match(block, /userId\s+String/);
    assert.match(block, /@@index\(\[userId|@@unique\(\[userId/);
  });
});

test("migration creates unified transaction table and financial tables", () => {
  assert.match(migration, /CREATE TABLE "Transaction"/);
  assert.match(migration, /CREATE TABLE "Income"/);
  assert.match(migration, /CREATE TABLE "Expense"/);
  assert.match(migration, /CREATE TABLE "CreditCardPurchase"/);
  assert.match(migration, /CREATE UNIQUE INDEX "Transaction_userId_sourceType_sourceId_key"/);
});

test("driver daily earnings migration protects one realized entry per day", () => {
  assert.match(driverDailyMigration, /CREATE TABLE "DriverDailyEarning"/);
  assert.match(driverDailyMigration, /CREATE UNIQUE INDEX "DriverDailyEarning_userId_date_key"/);
  assert.match(driverDailyMigration, /REFERENCES "Income"\("id"\)/);
});

test("operational cycle migration creates closing, notifications and history", () => {
  const operationalMigration = readFileSync(
    new URL("../prisma/migrations/20260630170000_operational_cycle/migration.sql", import.meta.url),
    "utf8",
  );
  assert.match(operationalMigration, /CREATE TABLE "MonthClosing"/);
  assert.match(operationalMigration, /CREATE TABLE "Notification"/);
  assert.match(operationalMigration, /CREATE TABLE "AuditLog"/);
  assert.match(operationalMigration, /CREATE TABLE "Subscription"/);
  assert.match(operationalMigration, /CREATE TABLE "Financing"/);
});

test("production scripts and environment template are present", () => {
  ["validate", "typecheck", "prisma:deploy", "db:seed", "build"].forEach((script) => {
    assert.ok(packageJson.scripts[script], `${script} script is required`);
  });

  ["DATABASE_URL", "AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET", "AUTH_URL"].forEach((key) => {
    assert.match(envExample, new RegExp(`${key}=`));
  });
});

test("no legacy mock data module remains in production source", () => {
  assert.equal(existsSync(new URL("../src/lib/mock-data.ts", import.meta.url)), false);
});

test("99 daily earning form is centralized in income flow", () => {
  const incomePage = readFileSync(new URL("../src/app/(protected)/app/receitas/page.tsx", import.meta.url), "utf8");
  const diagnosticPanel = readFileSync(new URL("../src/app/(protected)/app/diagnostico/diagnostic-panel.tsx", import.meta.url), "utf8");
  const earningPanel = readFileSync(new URL("../src/app/(protected)/app/diagnostico/driver-daily-earning-panel.tsx", import.meta.url), "utf8");

  assert.match(incomePage, /<DriverDailyEarningPanel \/>/);
  assert.match(diagnosticPanel, /<DriverDailyEarningPanel compact/);
  assert.match(earningPanel, /Registrar em Receitas/);
});

test("quick launch keeps frequent actions close", () => {
  const quickAdd = readFileSync(new URL("../src/components/shared/quick-add-modal.tsx", import.meta.url), "utf8");
  const filterBar = readFileSync(new URL("../src/components/shared/filter-bar.tsx", import.meta.url), "utf8");
  const incomeForm = readFileSync(new URL("../src/components/forms/income-form.tsx", import.meta.url), "utf8");
  const expenseForm = readFileSync(new URL("../src/components/forms/expense-form.tsx", import.meta.url), "utf8");

  assert.match(quickAdd, /Ganho da 99/);
  assert.match(quickAdd, /Salvar e lançar outro/);
  assert.match(quickAdd, /last-account-v1/);
  assert.match(filterBar, /quickFilters/);
  assert.match(incomeForm, /Mais opções/);
  assert.match(expenseForm, /Mais opções/);
});

test("operational routes exist for core production flows", () => {
  [
    "../src/app/api/month-closing/confirm/route.ts",
    "../src/app/api/payables/route.ts",
    "../src/app/api/receivables/route.ts",
    "../src/app/api/export/route.ts",
    "../src/app/api/import/route.ts",
    "../src/app/api/search/route.ts",
    "../src/app/api/motorista-99/realizado/route.ts",
    "../src/app/api/motorista-99/realizado/[id]/route.ts",
  ].forEach((route) => assert.equal(existsSync(new URL(route, import.meta.url)), true, route));
});
