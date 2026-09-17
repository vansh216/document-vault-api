# Document Vault — GraphQL API

A small backend API for organizing documents into collections, built with Bun, TypeScript, GraphQL Yoga, PostgreSQL, and Prisma.

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript (strict mode, no `any`)
- **API**: GraphQL Yoga (schema-first)
- **Database**: PostgreSQL (via Docker Compose)
- **ORM**: Prisma 7 (with `@prisma/adapter-pg`)


## Project Structure

```
document-vault-api/
├── prisma/
│   ├── schema.prisma              # Data model (Collection, Document)
│   └── migrations/
│       └── <timestamp>_init/
│           └── migration.sql       # Generated SQL migration (never hand-edited)
├── generated/
│   └── prisma/                     # Auto-generated Prisma Client (gitignored)
├── src/
│   ├── lib/
│   │   ├── prisma.ts                # Prisma client singleton (pg driver adapter)
│   │   ├── validation.ts             # Shared input validation helpers
│   │   └── validation.test.ts        # Unit tests for validation
│   ├── graphql/
│   │   ├── schema.graphql            # GraphQL SDL — types, queries, mutations
│   │   ├── resolvers.ts               # All resolver implementations
│   │   └── resolvers.test.ts          # Resolver + integration tests (real Postgres)
│   └── server.ts                     # Yoga server entrypoint
├── docker-compose.yml               # PostgreSQL container definition
├── prisma.config.ts                  # Prisma 7 config (schema path, datasource)
├── .env                               # Local environment variables (gitignored)
├── .env.example                       # Template for required env vars
├── package.json
├── tsconfig.json                      # Strict TypeScript config
└── README.md
```

## Setup

### Prerequisites

- [Bun](https://bun.sh) installed
- Docker & Docker Compose installed

### One-command setup

```bash
docker compose up -d && bun install && bun run gendb && bun run dev
```

This will:
1. Start a PostgreSQL container (via Docker Compose)
2. Install dependencies
3. Apply Prisma migrations and generate the Prisma Client
4. Start the dev server with hot-reload

The server runs at **http://localhost:4000/graphql** — open this URL in a browser for the interactive GraphiQL playground.

### Environment variables

Copy `.env.example` to `.env` and adjust if needed:

```bash
cp .env.example .env
```

> **Note**: The Docker Compose file maps Postgres to host port `5433` (not the default `5432`), to avoid conflicts with any local Postgres installation. If you don't have a local Postgres running, feel free to change this back to `5432:5432` in `docker-compose.yml` and update `DATABASE_URL` accordingly.

## Domain Model

**Collection**
- `id`, `name`, `slug` (unique), `createdAt`
- has many `documents`

**Document**
- `id`, `title`, `content`, `tags` (string array), `collectionId`, `isArchived`, `createdAt`
- belongs to one `collection`

## API

### Queries

| Query | Description |
|---|---|
| `collections` | List all collections |
| `collection(id)` | Fetch one collection with its nested documents |
| `documents(collectionId, search, isArchived, take, cursor)` | Search/filter documents with cursor-based pagination |

### Mutations

| Mutation | Description |
|---|---|
| `createCollection(name, slug)` | Create a new collection |
| `createDocument(title, content, collectionId, tags)` | Create a document inside a collection |
| `updateDocument(id, title?, content?, tags?, isArchived?)` | Partially update a document |
| `deleteDocument(id)` | Delete a document |
| `moveDocument(id, collectionId)` | Move a document to a different collection |

See `src/graphql/schema.graphql` for the full type definitions.

## Validation

The API returns real GraphQL errors (with `extensions.code: "BAD_USER_INPUT"`) rather than unhandled 500s for:
- Empty `title` / `content` / collection `name`
- Malformed `slug` (must be lowercase, alphanumeric, hyphen-separated)
- Duplicate collection `slug`
- References to a nonexistent `collectionId` or document `id`

## Testing

```bash
bun test
```

Runs:
- Unit tests for validation helpers (`src/lib/validation.test.ts`)
- Resolver tests against a real Dockerized PostgreSQL instance (`src/graphql/resolvers.test.ts`) — covers CRUD operations, search, cursor pagination, and `moveDocument`

> Ensure `docker compose up -d` has been run before executing tests, since resolver tests hit the real database.


## Design Decisions & Tradeoffs

- **Cursor pagination**: implemented via a "fetch `take + 1`" trick to detect a next page without a separate `COUNT` query — keeps it simple while remaining correct under concurrent inserts/deletes, unlike offset-based pagination.
- **Validation location**: validation lives in resolvers (via shared helpers in `src/lib/validation.ts`) rather than a separate middleware/decorator layer — kept intentionally simple given the scope.
- **Existence checks before writes**: `createDocument`, `moveDocument`, `updateDocument`, and `deleteDocument` all check for existence first, converting what would otherwise be generic Prisma/Postgres errors (foreign key violations, "record not found") into clear, actionable `ValidationError`s.
- **`onDelete: Cascade`** on the Document → Collection relation: deleting a collection also deletes its documents. This was chosen as the simplest, least-surprising default for this scope; a production system might instead prevent deleting a non-empty collection, or soft-delete.
- **Tests double as integration tests**: rather than mocking Prisma, resolver tests run directly against the real Dockerized Postgres (with `beforeEach` cleanup). This trades slightly slower test runs for much higher confidence, since actual SQL and constraints are exercised.
- **Prisma 7 driver adapters**: this project uses Prisma 7's newer explicit driver adapter pattern (`@prisma/adapter-pg`) rather than the older implicit `DATABASE_URL` auto-detection.

## How I'd Extend This

- **Auth & RBAC**: scope collections/documents to a user, add ownership checks in resolvers
- **Full-text search**: replace substring `contains` search with Postgres full-text search (`tsvector`/`tsquery`) or a dedicated search index for relevance ranking
- **Soft deletes**: add a `deletedAt` field instead of hard deletes, for recoverability
- **Bulk operations**: `moveDocuments(ids: [ID!]!, collectionId: ID!)` for moving multiple documents at once
- **DataLoader**: batch/cache the `Document.collection` reverse-lookup to avoid N+1 queries if that field is added as a proper field resolver later