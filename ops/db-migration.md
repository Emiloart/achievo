# DB Migration Failure / Rollback

## Symptoms

- `prisma migrate deploy` fails
- App fails on startup with migration errors

## Commands

Check migration status:

```bash
npx --prefix backend prisma migrate status
```

Apply pending migrations:

```bash
npx --prefix backend prisma migrate deploy
```

Mark a failed migration as rolled back (requires investigation):

```bash
npx --prefix backend prisma migrate resolve --rolled-back "<migration_id>"
```

## Recovery

- Restore the last known-good DB snapshot if schema drift exists.
- Re-run migrations after restoring or fixing SQL errors.
