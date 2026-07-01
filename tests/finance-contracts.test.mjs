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

test("operational routes exist for core production flows", () => {
  [
    "../src/app/api/month-closing/confirm/route.ts",
    "../src/app/api/payables/route.ts",
    "../src/app/api/receivables/route.ts",
    "../src/app/api/export/route.ts",
    "../src/app/api/import/route.ts",
    "../src/app/api/search/route.ts",
  ].forEach((route) => assert.equal(existsSync(new URL(route, import.meta.url)), true, route));
});
