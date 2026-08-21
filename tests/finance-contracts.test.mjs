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
const debtInterestMigration = readFileSync(
  new URL("../prisma/migrations/20260821190000_personal_debt_daily_interest/migration.sql", import.meta.url),
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
    "PersonalDebt",
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

test("personal debt interest migration stores the daily calculation base", () => {
  assert.match(schema, /interestBaseBalance Decimal\?/);
  assert.match(schema, /interestStartedAt\s+DateTime\?/);
  assert.match(debtInterestMigration, /ADD COLUMN "interestBaseBalance" DECIMAL/);
  assert.match(debtInterestMigration, /ADD COLUMN "interestStartedAt" TIMESTAMP/);
  assert.match(debtInterestMigration, /SET "interestBaseBalance" = "outstandingBalance"/);
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
  assert.match(incomeForm, /Recorrência/);
  assert.match(incomeForm, /Já recebida/);
  assert.match(expenseForm, /Recorrência/);
  assert.match(expenseForm, /Já paga/);
  assert.match(expenseForm, /Tipo de despesa/);
  assert.doesNotMatch(expenseForm, /Mais detalhes/);
  assert.doesNotMatch(expenseForm, />Parcelas</);
  assert.match(quickAdd, /name="installments"/);
});

test("daily navigation and multi-entry controls stay intentionally simple", () => {
  const sidebar = readFileSync(new URL("../src/components/layout/app-sidebar.tsx", import.meta.url), "utf8");
  const quickAdd = readFileSync(new URL("../src/components/shared/quick-add-modal.tsx", import.meta.url), "utf8");
  const button = readFileSync(new URL("../src/components/ui/button.tsx", import.meta.url), "utf8");

  assert.match(sidebar, /Navegação principal/);
  assert.doesNotMatch(sidebar, /label: "Patrimônio"/);
  assert.doesNotMatch(sidebar, /label: "Relatórios"/);
  assert.doesNotMatch(sidebar, /label: "Calendário"/);
  assert.doesNotMatch(sidebar, /label: "Exportação"/);
  assert.doesNotMatch(sidebar, /label: "Histórico"/);
  assert.doesNotMatch(sidebar, /label: "Configurações"/);
  assert.match(quickAdd, /Continuar lançando/);
  assert.match(quickAdd, /role="switch"/);
  assert.match(button, /active:scale-\[0\.98\]/);
});

test("personal debt interest and diagnostic simulation remain explicit", () => {
  const debtBoard = readFileSync(new URL("../src/app/(protected)/app/dividas/debt-board.tsx", import.meta.url), "utf8");
  const debtService = readFileSync(new URL("../src/services/personal-debt-service.ts", import.meta.url), "utf8");
  const diagnosticService = readFileSync(new URL("../src/services/diagnostic-service.ts", import.meta.url), "utf8");
  const diagnosticPanel = readFileSync(new URL("../src/app/(protected)/app/diagnostico/diagnostic-panel.tsx", import.meta.url), "utf8");

  assert.match(debtBoard, /Aplicar juros mensais/);
  assert.match(debtBoard, /aria-label="Taxa de juros mensais"/);
  assert.match(debtBoard, /saldo atualizado/);
  assert.match(debtService, /interestStartedAt/);
  assert.match(debtService, /Math\.pow\(1 \+ monthlyRate \/ 100/);
  assert.match(debtService, /accruedInterest/);
  assert.match(diagnosticService, /calculatePersonalDebtBalance/);
  assert.match(diagnosticPanel, /simulatePayoff/);
  assert.match(diagnosticPanel, /Juros do próximo mês/);
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

test("fast launch responds immediately and preserves recent choices", () => {
  const quickAdd = readFileSync(new URL("../src/components/shared/quick-add-modal.tsx", import.meta.url), "utf8");
  const recentPreferences = readFileSync(new URL("../src/lib/recent-preferences.ts", import.meta.url), "utf8");
  const dateInput = readFileSync(new URL("../src/lib/date-input.ts", import.meta.url), "utf8");
  const incomePage = readFileSync(new URL("../src/app/(protected)/app/receitas/page.tsx", import.meta.url), "utf8");
  const expensePage = readFileSync(new URL("../src/app/(protected)/app/despesas/page.tsx", import.meta.url), "utf8");
  const filterBar = readFileSync(new URL("../src/components/shared/filter-bar.tsx", import.meta.url), "utf8");

  assert.match(quickAdd, /submittingRef\.current/);
  assert.match(quickAdd, /Salvo\. Você pode registrar o próximo\./);
  assert.match(quickAdd, /prioritizeRecentOptions/);
  assert.match(recentPreferences, /count/);
  assert.match(recentPreferences, /lastUsed/);
  assert.match(dateInput, /getFullYear/);
  assert.match(incomePage, /Este mês/);
  assert.match(expensePage, /Este mês/);
  assert.match(expensePage, /Cartão/);
  assert.match(filterBar, /filter\.href/);
});

test("favorites and active filters stay visible in the fast flow", () => {
  const quickAdd = readFileSync(new URL("../src/components/shared/quick-add-modal.tsx", import.meta.url), "utf8");
  const recentPreferences = readFileSync(new URL("../src/lib/recent-preferences.ts", import.meta.url), "utf8");
  const filterBar = readFileSync(new URL("../src/components/shared/filter-bar.tsx", import.meta.url), "utf8");
  const incomeService = readFileSync(new URL("../src/services/income-service.ts", import.meta.url), "utf8");
  const expenseService = readFileSync(new URL("../src/services/expense-service.ts", import.meta.url), "utf8");

  assert.match(quickAdd, /Favoritos e recentes/);
  assert.match(quickAdd, /toggleFavoritePreference/);
  assert.match(recentPreferences, /favorites-v1/);
  assert.match(recentPreferences, /favorite/);
  assert.match(filterBar, /Filtros ativos/);
  assert.match(filterBar, /Limpar filtros/);
  assert.match(incomeService, /description: \{ contains: params\.q/);
  assert.match(incomeService, /category: \{ name: \{ contains: params\.q/);
  assert.match(expenseService, /account: \{ name: \{ contains: params\.q/);
});

test("editing and recovery paths remain explicit", () => {
  const incomeActions = readFileSync(new URL("../src/app/(protected)/app/receitas/income-row-actions.tsx", import.meta.url), "utf8");
  const expenseActions = readFileSync(new URL("../src/app/(protected)/app/despesas/expense-actions.tsx", import.meta.url), "utf8");
  const dashboard = readFileSync(new URL("../src/app/(protected)/app/page.tsx", import.meta.url), "utf8");
  const exportPage = readFileSync(new URL("../src/app/(protected)/app/exportacao/page.tsx", import.meta.url), "utf8");
  const metrics = readFileSync(new URL("../src/lib/performance-metrics.ts", import.meta.url), "utf8");

  assert.match(incomeActions, /Tentar novamente/);
  assert.match(expenseActions, /Tentar novamente/);
  assert.match(incomeActions, /Corrigir/);
  assert.match(expenseActions, /Apagar/);
  assert.match(dashboard, /Como o mês está se comportando/);
  assert.match(exportPage, /Checklist de backup/);
  assert.match(exportPage, /Nenhuma importação ou restauração é executada automaticamente/);
  assert.match(metrics, /morais:\$\{name\}:\$\{status\}/);
});
