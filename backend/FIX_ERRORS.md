# Fix Backend Errors - Run This Script

## Step 1: Stop the backend server
If your backend is running, **STOP IT** (Ctrl+C in the terminal)

## Step 2: Regenerate Prisma Client
```bash
cd backend
npm run db:generate
```

## Step 3: Apply Migration (if database is available)
```bash
npm run db:migrate
```

If migration fails with "can't reach database", that's okay - the migration file is already created.

## Step 4: Run Seed (if database is available)
```bash
npm run db:seed
```

## Step 5: Restart Backend
```bash
npm run start:dev
```

## What Was Fixed

✅ Fixed import paths in:
- `password-policy.service.ts` - Changed `../prisma` to `../../prisma`
- `rate-limit.guard.ts` - Changed `../prisma` to `../../prisma`
- `session.service.ts` - Changed `../prisma` to `../../prisma`
- `password-policy.service.ts` - Changed `bcrypt` to `bcryptjs` (already installed)

✅ Fixed audit log userId issue:
- Changed `userId` to `userId || undefined` to handle null values

## If You Still Get Errors

The remaining errors are because Prisma Client hasn't been regenerated with the new schema changes. These will disappear after running `npm run db:generate`.

The new fields that will be available after regeneration:
- `user.isLocked`
- `user.failedLoginAttempts`
- `user.lastLoginAt`
- `user.passwordChangedAt`
- `user.mustChangePassword`
- New roles: `SUPER_ADMIN`, `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTANT`

## Current Status

✅ Schema updated
✅ Migration file created
✅ Import paths fixed
✅ Code fixed

⚠️ Waiting for Prisma Client regeneration (requires stopping backend)
