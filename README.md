# MoraisFinanceiro

Sistema financeiro pessoal/familiar construído com Next.js, Auth.js, Prisma e PostgreSQL.

## Stack

- Next.js 15, React 19 e TypeScript
- Tailwind CSS e componentes no padrão Shadcn/UI
- Auth.js com login Google
- Prisma ORM
- PostgreSQL
- Zod e React Hook Form
- Exportação CSV, XLSX e PDF

## Requisitos

- Node.js 20+
- npm
- PostgreSQL
- Conta Google Cloud com OAuth configurado

## Instalação

```bash
npm install
```

Crie o arquivo `.env` a partir do `.env.example`:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Variáveis de ambiente

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/banco?schema=public"
AUTH_SECRET="um-segredo-forte"
AUTH_GOOGLE_ID="client-id-google"
AUTH_GOOGLE_SECRET="client-secret-google"
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"
```

Em produção na Vercel, configure `AUTH_URL` e `NEXTAUTH_URL` com a URL pública do projeto.

## PostgreSQL

Crie um banco PostgreSQL e configure `DATABASE_URL`.

Para desenvolvimento:

```bash
npm run prisma:migrate
npm run db:seed
```

Para produção:

```bash
npm run prisma:deploy
npm run db:seed
```

## Login Google

No Google Cloud Console:

1. Crie um OAuth Client do tipo Web.
2. Adicione a origem autorizada, por exemplo `http://localhost:3000`.
3. Adicione o redirect URI:

```txt
http://localhost:3000/api/auth/callback/google
```

Em produção:

```txt
https://seu-dominio.vercel.app/api/auth/callback/google
```

Copie o Client ID para `AUTH_GOOGLE_ID` e o Secret para `AUTH_GOOGLE_SECRET`.

## Desenvolvimento

```bash
npm run dev
```

Aplicação local:

```txt
http://localhost:3000
```

## Validação

Execute a suíte completa antes de publicar:

```bash
npm run validate
```

Comandos individuais:

```bash
npm run test
npm run lint
npm run typecheck
npx prisma validate
npx prisma generate
npm run build
```

## Deploy na Vercel

1. Suba o projeto para o GitHub.
2. Importe o repositório na Vercel.
3. Configure as variáveis de ambiente.
4. Configure um PostgreSQL gerenciado.
5. Rode as migrations de produção:

```bash
npm run prisma:deploy
```

Build command:

```bash
npm run build
```

Install command:

```bash
npm install
```

## Backup

Para PostgreSQL:

```bash
pg_dump "$DATABASE_URL" > backup.sql
```

Restauração:

```bash
psql "$DATABASE_URL" < backup.sql
```

Em bancos gerenciados, prefira snapshots automáticos e backups agendados.

## Atualização do sistema

1. Atualize dependências com cuidado.
2. Rode `npm run validate`.
3. Gere migrations quando houver alteração no Prisma.
4. Aplique `npm run prisma:deploy` em produção.
5. Faça backup antes de qualquer mudança estrutural no banco.
