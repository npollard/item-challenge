# Architecture Documentation

## DynamoDB Storage Design

### Table Schema

**Table Name:** `ExamItems`

**Primary Key:**

* `PK` (Partition Key): `ITEM#<id>`
* `SK` (Sort Key):

  * `LATEST` for current item
  * `VERSION#<version>` for version history

---

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

---

### Indexes

| Index   | PK            | SK                       | Purpose                    |
| ------- | ------------- | ------------------------ | -------------------------- |
| Primary | `ITEM#<id>`   | `LATEST` / `VERSION#<n>` | Item + version history     |
| GSI1    | `ENTITY#ITEM` | `CREATED#<timestamp>`    | List all items (paginated) |

---

### Write Pattern - LATEST + VERSION

Each write operation that modifies an item creates:

1. A new immutable version record:

   ```txt
   SK = VERSION#000001
   ```

2. An updated current snapshot:

   ```txt
   SK = LATEST
   ```

Both records contain the full item snapshot.

Writes are performed using `TransactWriteItems` to ensure atomicity between the current state and version history.

Optimistic locking is enforced by checking `metadata.version` in a condition expression to prevent concurrent writes from overwriting each other.

Version numbers are zero-padded (e.g., `VERSION#000001`) to ensure correct lexicographic ordering.

---

### Global Listing (GSI1)

To support the `GET /api/items` endpoint, all current items (`SK = LATEST`) include:

```txt
GSI1PK = ENTITY#ITEM
GSI1SK = CREATED#<timestamp>
```

This enables:

* Efficient querying using a constant partition key
* Sorting by creation timestamp
* Cursor-based pagination using `LastEvaluatedKey`

Version records (`VERSION#<n>`) do not include GSI attributes to avoid index bloat.

---

### Versioning Model

The system uses **change-driven versioning**:

* Each update creates a new immutable version
* Each version represents a full snapshot of the item

#### Snapshot Versioning (`createVersion`)

The `createVersion` operation exists to satisfy the storage interface and provides snapshot-based versioning:

* Creates a new version without requiring content changes
* Increments version number
* Updates timestamps

This may produce versions that are identical except for metadata.

This operation is intended for manual checkpoints or auditing, while `updateItem` remains the primary mechanism for version creation.

---

### Pagination and Filtering

The in-memory implementation supports:

* Offset-based pagination
* Filtering by subject and status

The DynamoDB implementation uses:

* Cursor-based pagination via `nextKey` (DynamoDB `LastEvaluatedKey`)
* No filtering support (no GSIs defined for subject or status)

Unsupported query parameters are accepted but ignored.

This reflects a common tradeoff where a generic interface does not perfectly map to all storage backends.

---

### Design Trade-offs

* **Minimal GSIs**: Only indexes required by current API endpoints are implemented
* **No filtering support**: Avoids unnecessary write amplification and index complexity
* **Duplicate writes (LATEST + VERSION)**: Trades storage for fast reads and clean audit history
* **Cursor-based pagination**: Scales efficiently compared to offset-based pagination
* **Flexible evolution**: Additional GSIs can be added later as new access patterns emerge

---

## Other Design Notes

* TypeScript types are derived from Zod schemas where applicable for consistency
* Logging implemented using Pino


## Caveats
* DynamoDB implementation untested