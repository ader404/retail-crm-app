# MySQL Setup Guide — Retail CRM Desktop Edition

This backend now runs on MySQL instead of PostgreSQL. MySQL Server must be installed and running — MySQL Workbench alone is not enough, since Workbench is just a management UI and does not run the actual database server.

## 1. Recommended MySQL version

MySQL Server **8.0** (tested against 8.0.45). MySQL 5.7.8+ also supports the native `JSON` column type this schema relies on, but 8.0 is recommended for better default performance and long-term support.

## 2. Installing MySQL Server

- Windows: download the MySQL Installer from https://dev.mysql.com/downloads/installer/ and choose the "MySQL Server" component (Workbench is optional, add it only if you want a GUI for managing the database).
- During setup you will be asked to set a root password — remember it, it goes into `DATABASE_URL` below.
- Confirm the Windows service is running: open **Services** (`services.msc`) and check that `MySQL80` (or similar) shows **Running**.

## 3. Creating the CRM database

You do not need to manually create the database — running the initialization script below will create it automatically if it doesn't exist. If you prefer to do it manually via MySQL Workbench or the `mysql` CLI:

```sql
CREATE DATABASE retail_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 4. Required MySQL user permissions

For local desktop use, the `root` user is normally sufficient since MySQL runs entirely on the customer's own machine. If you want a dedicated, less-privileged user instead:

```sql
CREATE USER 'retailcrm'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON retail_crm.* TO 'retailcrm'@'localhost';
FLUSH PRIVILEGES;
```

The application needs standard DML/DDL privileges (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `INDEX`, `REFERENCES`) on its own database — it does not need any server-wide/global privileges.

## 5. Configuring DATABASE_URL

Set this in `.env`:

```
DATABASE_URL="mysql://<user>:<password>@localhost:3306/retail_crm"
```

Example with root:

```
DATABASE_URL="mysql://root:your-mysql-root-password@localhost:3306/retail_crm"
```

Never commit a real password to `.env.example` or any tracked file — only placeholder values belong there.

## 6. Initializing an empty database

Two-step process:

```bash
# 1. Create the database if it doesn't already exist
node scripts/init-mysql.js

# 2. Create tables/relations/indexes from the Prisma schema
pnpm prisma db push
```

`init-mysql.js` reads `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` from `.env`, connects to the MySQL **server** (not a specific database), checks whether the target database exists, and creates it only if missing — it never drops or overwrites an existing database.

`prisma db push` then syncs the schema (tables, relations, indexes, constraints) into that database. For a fresh, empty database this is safe and non-destructive.

## 7. How Prisma migrations are applied

This project currently ships one migration folder (`prisma/migrations/20260801193123_add_better_auth_support`), rewritten from PostgreSQL to plain MySQL 8.0-compatible SQL (backtick identifiers, `information_schema`-based existence checks instead of Postgres's `pg_catalog`/`DO $$ ... $$` blocks). To apply pending migrations against a database that already has the base schema:

```bash
pnpm prisma migrate deploy
```

For local development where you're evolving the schema, use `pnpm prisma migrate dev` instead (interactive, generates new migration files) — note this requires an interactive terminal, it will fail in non-interactive/CI contexts.

## 8. Backing up the database

Use `mysqldump` (ships with MySQL Server):

```bash
mysqldump -u root -p retail_crm > retail_crm_backup.sql
```

For a timestamped backup:

```bash
mysqldump -u root -p retail_crm > "retail_crm_backup_$(date +%Y%m%d_%H%M%S).sql"
```

## 9. Restoring the database

```bash
mysql -u root -p retail_crm < retail_crm_backup.sql
```

If the target database doesn't exist yet, create it first (see section 3) before restoring into it.

## Notes

- Money fields (`Decimal @db.Decimal(10,2)`) map to MySQL's native `DECIMAL(10,2)` — no precision loss compared to PostgreSQL.
- Free-text fields (descriptions, notes, addresses, reasons) were changed to `@db.Text` during the MySQL migration to avoid MySQL's default `VARCHAR(191)` cap on `String` fields — see the Phase 3 report for the full list.
- The `AuditLog.details` field uses MySQL's native `JSON` column type, same as it used natively in PostgreSQL.
