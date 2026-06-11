# psql-seed-reddit

A PostgreSQL sandbox for learning and experimentation, seeded with a Reddit-like dataset.

## Setup

Copy `.env` and set your database connection:

```
DATABASE_URL=postgres://user:password@localhost:5432/mydb
```

## Commands

| Command | Description |
|---|---|
| `npm run migrate` | Apply all pending migrations |
| `npm run migrate:down` | Roll back the last migration |
| `npm run migrate:create -- <name>` | Create a new migration file |
| `npm run seed` | Truncate all tables and reseed with fake data |

## Making schema changes

Every schema change gets its own migration file — never edit an existing one.

**1. Create a migration**

```bash
npm run migrate:create -- add_index_posts_created_at
```

This generates a timestamped file in `migrations/`, e.g. `migrations/1234567890000_add_index_posts_created_at.js`.

**2. Write the change**

```js
export const up = (pgm) => {
  pgm.sql(`CREATE INDEX posts_created_at_idx ON public.posts (created_at);`);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX posts_created_at_idx;`);
};
```

- `up` — the change you want to apply
- `down` — the exact reversal (used by `migrate:down`)

**3. Apply and experiment**

```bash
npm run migrate        # apply
npm run migrate:down   # undo
npm run migrate        # reapply
```

## Resetting everything

To wipe and start fresh (drops all tables, recreates schema, reseeds):

```bash
npm run migrate:down   # repeat until all migrations are rolled back
npm run migrate
npm run seed
```
