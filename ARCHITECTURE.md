# Architecture Documentation

- Singleton storage pattern for in-memory item storage
- Type-safe validation using Zod schemas
    - Derive TypeScript types from Zod schemas for consistency
- Logging with Pino

## DynamoDB Storage Design

### Table Schema

**Table Name:** `ExamItems`

**Primary Key:**
- `PK` (Partition Key): `ITEM#<id>`
- `SK` (Sort Key): `METADATA` for current item, `VERSION#<version>` for history

### Item Structure

**Current Item (SK = METADATA):**
```json
{
  "PK": "ITEM#<uuid>",
  "SK": "METADATA",
  "id": "<uuid>",
  "subject": "AP Biology",
  "itemType": "multiple-choice",
  "difficulty": 3,
  "content": { ... },
  "metadata": { ... },
  "securityLevel": "standard"
}
```

**Version History (SK = VERSION#<n>):**
```json
{
  "PK": "ITEM#<uuid>",
  "SK": "VERSION#1",
  "id": "<uuid>",
  "subject": "AP Biology",
  ...
}
```

### Access Patterns

1. **Get current item:** Query PK=`ITEM#<id>`, SK=`METADATA`
2. **Get all versions:** Query PK=`ITEM#<id>`, SK begins_with `VERSION#`
3. **List by subject:** GSI `GSI1` with PK=`SUBJECT#<subject>`, SK=`METADATA`
4. **List by status:** GSI `GSI2` with PK=`STATUS#<status>`, SK=`METADATA`

### Versioning Strategy

- Each update creates a new `VERSION#<n>` record before overwriting `METADATA`
- Versions are immutable (write-once)
- `metadata.version` tracks current version number
- Audit trail = all `VERSION#` items for a given `PK`

### Indexes

| Index | PK | SK | Purpose |
|-------|----|----|---------|
| Primary | `ITEM#<id>` | `METADATA` / `VERSION#<n>` | Item + history |
| GSI1 | `SUBJECT#<subject>` | `METADATA` | Query by subject |
| GSI2 | `STATUS#<status>` | `METADATA` | Query by status |