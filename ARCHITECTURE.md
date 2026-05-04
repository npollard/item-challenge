# Architecture Documentation

## Data Model Design (DynamoDB)

### Table: `ExamItems`

**Primary Key**

* `PK`: `ITEM#<id>`
* `SK`:

  * `LATEST` → current version
  * `VERSION#<n>` → immutable history

### Item Shape (simplified)

```json
{
  "PK": "ITEM#<id>",
  "SK": "LATEST | VERSION#000001",
  "id": "<id>",
  "subject": "...",
  "itemType": "...",
  "difficulty": 1-5,
  "content": { ... },
  "metadata": {
    "created": number,
    "lastModified": number,
    "version": number,
    ...
  },
  "securityLevel": "..."
}
```

---

### Versioning Strategy

* **Snapshot-based versioning**
* Each update writes:

  1. `VERSION#<n>` (immutable history)
  2. `LATEST` (current state)

**Rationale**

* Simple reads (no reconstruction required)
* Clear audit trail
* Avoids complexity of diff-based versioning

---

### Access Patterns

| Use Case    | Query                                     |
| ----------- | ----------------------------------------- |
| Get item    | `PK = ITEM#id`, `SK = LATEST`             |
| Update item | same as get + write new version           |
| Audit trail | `PK = ITEM#id`, `SK begins_with VERSION#` |
| List items  | GSI                                       |

---

### GSI Strategy

**GSI1 (listing index)**

* `GSI1PK`: `ENTITY#ITEM`
* `GSI1SK`: `CREATED#<timestamp>`

Only `LATEST` items are indexed.

**Rationale**

* Avoids full table scans
* Enables pagination
* Keeps index minimal and cost-efficient

---

## Infrastructure Choices

### API Gateway (HTTP API)

* Lower cost and latency than REST API
* Simpler configuration
* Uses proxy routing (`ANY /{proxy+}`)

---

### AWS Lambda

* Single Lambda handles all endpoints
* Internal router maps requests to handlers

**Trade-off**

* Simpler deployment vs. reduced isolation between endpoints

---

### DynamoDB

* Single-table design
* On-demand billing (`PAY_PER_REQUEST`)
* Minimal GSIs aligned with access patterns

---

### IAM

* Least-privilege access for Lambda:

  * `GetItem`, `PutItem`, `UpdateItem`, `Query`, `TransactWriteItems`
* Scoped to table and index ARNs

---

## Scalability & Performance

### Scalability

* Lambda scales horizontally with demand
* DynamoDB on-demand scales automatically
* API Gateway supports high request throughput

---

### Performance Characteristics

* Constant-time reads for current item (`LATEST`)
* Efficient range queries for version history
* Indexed access for listing (no scans)

---

### Potential Bottlenecks

* High version counts per item (large partitions)
* Single Lambda handling all routes
* No caching layer for read-heavy workloads

---

## Security

### Current Approach

* IAM-based access control between Lambda and DynamoDB
* No authentication layer (out of scope for exercise)

---

### Recommended Enhancements

* Add authentication (JWT / Cognito / IAM authorizers)
* Enable encryption for environment variables (KMS)
* Apply fine-grained IAM policies
* Add WAF for production environments

---

## Trade-offs

| Decision            | Benefit      | Trade-off                 |
| ------------------- | ------------ | ------------------------- |
| Single Lambda       | Simplicity   | Less isolation            |
| HTTP API            | Lower cost   | Fewer advanced features   |
| Snapshot versioning | Simple reads | Higher storage usage      |
| Minimal GSIs        | Lower cost   | Limited query flexibility |

---

## Future Improvements

### Scalability

* Split into per-endpoint Lambdas
* Add caching (API Gateway cache or Redis)
* Introduce additional GSIs (subject, status)

### Observability

* Add metrics and alarms (CloudWatch)
* Enable distributed tracing (X-Ray)

### Security

* Implement authentication and authorization
* Multi-account isolation
* Data access controls based on `securityLevel`

### Data Lifecycle

* Add TTL or archival strategy for old versions
* Separate hot vs. cold storage if needed

---

## Other Design Notes

* TypeScript types are derived from Zod schemas where applicable for consistency
* Logging implemented using Pino


## Caveats
* DynamoDB implementation untested