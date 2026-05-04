# Architecture Documentation

## Overview

This system manages exam items with support for versioning, auditing, and scalable retrieval.
It is designed to run locally for development but targets a **serverless AWS deployment** using:

* API Gateway (HTTP API)
* AWS Lambda
* DynamoDB

The architecture prioritizes:

* Simplicity
* Scalability
* Clear data modeling
* Minimal infrastructure

---

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

### Write Pattern — LATEST + VERSION

Each write that modifies an item produces two records:

1. **Immutable version record**

   ```
   SK = VERSION#000001
   ```

2. **Current snapshot**

   ```
   SK = LATEST
   ```

Both records store the full item snapshot.

Writes are performed using **`TransactWriteItems`** to guarantee atomicity between the current state and version history.

---

### Optimistic Locking

Updates enforce concurrency control using:

```
ConditionExpression: metadata.version = :expectedVersion
```

This prevents concurrent writes from overwriting each other.

---

### Version Ordering

Version numbers are **zero-padded**:

```
VERSION#000001
VERSION#000002
```

This ensures correct lexicographic ordering in DynamoDB queries.

---

### Global Listing (GSI1)

To support `GET /api/items`, all `LATEST` records include:

```
GSI1PK = ENTITY#ITEM
GSI1SK = CREATED#<timestamp>
```

This enables:

* Efficient full-table listing without scans
* Sorting by creation time
* Cursor-based pagination using `LastEvaluatedKey`

Version records (`VERSION#<n>`) **do not include GSI attributes**, preventing index bloat.

---

## Versioning Model

### Change-Driven Versioning (Primary)

* Every update creates a new immutable version
* Each version represents a meaningful state transition
* Full snapshots simplify reads and auditing

---

### Snapshot Versioning (`createVersion`)

The `createVersion` method exists to satisfy the interface and provides snapshot-based versioning:

* Creates a new version without requiring changes
* Increments version number
* Updates timestamps

This may produce identical versions (except metadata).

Use cases:

* Manual checkpoints
* Audit snapshots
* Draft preservation

---

## Pagination and Filtering

### In-Memory Implementation

Supports:

* Offset-based pagination
* Filtering by subject and status

---

### DynamoDB Implementation

Supports:

* Cursor-based pagination via `nextKey` (`LastEvaluatedKey`)

Does **not** support:

* Offset-based pagination (inefficient in DynamoDB)
* Filtering (no GSIs defined for subject/status)

Unsupported parameters are accepted but ignored.

---

## Infrastructure (Terraform)

### Overview

The system is deployed using a serverless architecture:

* **API Gateway (HTTP API)** routes requests
* **AWS Lambda** executes business logic
* **DynamoDB** stores persistent data

---

### Key Infrastructure Decisions

#### API Gateway (HTTP API)

Chosen because:

* Lower cost and latency than REST API
* Simpler configuration
* Sufficient for proxy-based routing

Uses:

```
ANY /{proxy+}
```

Lambda handles routing internally.

---

#### Lambda

A **single Lambda function** is used.

Benefits:

* Simple deployment
* Minimal infrastructure

Trade-offs:

* Larger function size
* Less isolation between endpoints

---

#### DynamoDB

* Uses **PAY_PER_REQUEST**
* Single-table design
* One GSI aligned with listing endpoint

Benefits:

* No capacity planning
* Automatic scaling

---

#### IAM

Lambda is granted least-privilege access:

* `dynamodb:GetItem`
* `dynamodb:PutItem`
* `dynamodb:Query`
* `dynamodb:UpdateItem`
* `dynamodb:TransactWriteItems`

Access is scoped to:

* The table
* Its indexes

---

## Scalability

This architecture scales automatically:

* **Lambda** scales horizontally
* **DynamoDB** scales via on-demand mode
* **API Gateway** handles traffic distribution

---

### Future Improvements

* Split Lambda into **per-endpoint functions**
* Introduce **caching layer** (API Gateway / Redis)
* Add **read replicas / access pattern GSIs**
* Implement **TTL or archival for old versions**

---

## Observability

### Current

* CloudWatch logs via Lambda

---

### Improvements

* Configure **log retention policies**
* Add **structured logging (JSON)**
* Enable **API Gateway access logs**
* Add **CloudWatch metrics + alarms**:

  * Error rates
  * Latency
  * Throttling

Optional:

* AWS X-Ray for tracing

---

## Security

### Current

* IAM-based access between Lambda and DynamoDB

---

### Improvements

* Enable **KMS encryption for environment variables**
* Add **authentication (JWT / Cognito / IAM)**
* Restrict access via:

  * API Gateway authorizers
  * AWS WAF
* Separate environments into **different AWS accounts**

---

## Trade-offs

| Decision                 | Benefit      | Trade-off                 |
| ------------------------ | ------------ | ------------------------- |
| Single Lambda            | Simplicity   | Less isolation            |
| HTTP API                 | Lower cost   | Fewer advanced features   |
| Minimal GSIs             | Lower cost   | Limited querying          |
| Cursor pagination        | Scalable     | More complex client logic |
| Full snapshot versioning | Simple reads | More storage              |

---

## Future Work

If extended further:

* Add CI/CD pipeline for Terraform + Lambda
* Introduce per-endpoint Lambdas
* Add API Gateway request validation
* Implement rate limiting and throttling
* Add integration tests with DynamoDB Local

---

## Other Design Notes

* TypeScript types are derived from Zod schemas where applicable for consistency
* Logging implemented using Pino


## Caveats
* DynamoDB implementation untested