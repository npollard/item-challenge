# Architecture Documentation

## DynamoDB Storage Design

### Table Schema

**Table Name:** `ExamItems`

**Primary Key:**
- `PK` (Partition Key): `ITEM#<id>`
- `SK` (Sort Key): `LATEST` for current item, `VERSION#<version>` for history

### Item Structure
```json
{
  "PK": "ITEM#<uuid>",
  "SK": "LATEST" | "VERSION#<version>",
  "id": "<uuid>",
  "subject": "AP Biology",
  "itemType": "multiple-choice",
  "difficulty": 3,
  "content": { ... },
  "metadata": { ... },
  "securityLevel": "standard"
}
```

### Indexes

| Index | PK | SK | Purpose |
|-------|----|----|---------|
| Primary | `ITEM#<id>` | `LATEST` / `VERSION#<n>` | Item + history |
| GSI1 | `SUBJECT#<subject>` | `DIFFICULTY#<difficulty>#TYPE#<itemType>` | Query by subject |
| GSI2 | `STATUS#<status>` | `CREATED#<timestamp>` | Query by status
| GSI3 | `SECURITY#<securityLevel>` | `SUBJECT#<subject>#DIFFICULTY#<difficulty>#TYPE#<itemType>` | Query by security level - restrict access via IAM policies

Note: GSI2 could have subject or other fields added depending on usage to increase query performance.

### Design Considerations
#### Single Table vs Separate Tables
Use a single table for current items and version history for simplicity and query flexibility without duplicating GSIs.

Would be worth considering separate tables for current items and history if:
- Large number of versions per item (thousands+) causing performance issues
- Separate retention policies are needed (e.g., current items kept forever, versions retained for 1 year)
- Different teams or services need to access current items vs history with different permissions
- Item versions contain sensitive data that should be isolated

#### Write Pattern - LATEST plus VERSION
Write each new item version twice: once as the current item pointer (LATEST) and once as an immutable version history record (VERSION#<n>). This allows fast (constant time) reads of current item and clean, append-only version history for audit trails. LATEST and VERSION#<n> are both the full item snapshot with identical schema, simplifying indexing and query logic. Use transactional writes so LATEST pointer and version history never diverge. Use optomistic locking, checking the version number in the condition expression to prevent concurrent writes from overwriting each other. Pad version numbers to 6 digits for lexicographic sorting (e.g., VERSION#000001). Only LATEST items should include GSI attributes (GSI1PK, GSI1SK, etc.). VERSION# records should omit these attributes to prevent index bloat and duplicate entries. Version creation is tied to item updates; see Snapshot Versioning below for exceptions.

#### Snapshot Versioning (`createVersion`)

The `createVersion` operation is implemented to satisfy the storage interface but is not part of the primary versioning strategy.

This system uses **change-driven versioning**, where new versions are created automatically during `updateItem` operations and represent meaningful state changes.

The `createVersion` method instead provides **snapshot-driven versioning**:
- Creates a new version from the current state without requiring any changes
- Increments the version number and updates timestamps
- May result in a version identical to the previous one except for metadata

This operation is intended for edge cases such as manual checkpoints, audit snapshots, or draft preservation. Most application workflows should rely on `updateItem`, which maintains a cleaner and more semantically meaningful version history.

#### Security Level Indexing
Use GSI3 with security level prefix to enable efficient filtering by security level. Restrict access to items with higher security levels via IAM policies on the GSI3 query operation. This provides a simple, query-based approach to security filtering without requiring complex conditional logic in the application layer. IAM conditions on GSI3 only apply to Query operations on the index. Note that direct access to the base table (GetItem/Query on PK) must also be restricted,otherwise clients can bypass GSI3 and access all items. Note that GSI3-based IAM restrictions provide logical isolation but not full security boundaries. If this approach is not considered sufficiently secure, use separate tables and/or AWS accounts for physical isolation.

## Other Design Notes
- Singleton storage pattern for in-memory item storage
- Type-safe validation using Zod schemas
    - Derive TypeScript types from Zod schemas for consistency
- Logging with Pino