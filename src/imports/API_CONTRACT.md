# Rule Engine API Contract

**Version:** v1  
**Base URL:** `https://<host>/api/v1`  
**Content-Type:** `application/json` (unless stated otherwise)

---

## Table of Contents

1. [Authentication & Headers](#1-authentication--headers)
2. [Common Patterns](#2-common-patterns)
3. [Spaces](#3-spaces)
4. [Space Members](#4-space-members)
5. [Rules](#5-rules)
   - [Rule CRUD](#51-rule-crud)
   - [Rule Versions](#52-rule-versions)
   - [Rule Execution](#53-rule-execution)
   - [Rule Version Comparison](#54-rule-version-comparison)
6. [Decision Tables](#6-decision-tables)
   - [Table CRUD](#61-table-crud)
   - [Table Versions](#62-table-versions)
   - [Table Execution](#63-table-execution)
   - [Table Import](#64-table-import)
7. [Flows](#7-flows)
   - [Flow CRUD](#71-flow-crud)
   - [Flow Versions](#72-flow-versions)
   - [Flow Execution](#73-flow-execution)
   - [Flow Version Comparison](#74-flow-version-comparison)
8. [Lookup Tables](#8-lookup-tables)
9. [Unified Execution](#9-unified-execution)
10. [Fact Type Definitions](#10-fact-type-definitions)
11. [Field Schemas](#11-field-schemas)
12. [Audit & Analytics](#12-audit--analytics)
13. [Metadata Reference](#13-metadata-reference)

---

## 1. Authentication & Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Bearer token from Keycloak / OIDC provider |
| `X-User-Id` | Conditional | Required on any create or delete operation for the audit trail |
| `Content-Type` | Yes (mutating) | `application/json` |

All data endpoints are scoped to a `spaceId`. A space is an isolated tenant partition — rules, tables, and flows in one space are not visible to another.

**Roles:** `ADMIN`, `RULE_AUTHOR`, `RULE_APPROVER`, `RULE_EXECUTOR`, `VIEWER`

---

## 2. Common Patterns

### Pagination

List endpoints accept `?page=0&size=50` and return pagination metadata in response headers:

| Header | Description |
|--------|-------------|
| `X-Total-Count` | Total matching records |
| `X-Page` | Current page (0-indexed) |
| `X-Page-Size` | Records per page |
| `X-Total-Pages` | Total pages |

Maximum page size: `100`.

### Error Response

```json
{
  "error": "Version 5 not found for rule 42"
}
```

### Fact Input

Facts are the input data objects evaluated by rules. All facts are flat key-value maps:

```json
{
  "factType": "ApplicantInfo",
  "factData": {
    "age": 35,
    "annualIncome": 850000,
    "productCode": "PA"
  }
}
```

`factType` is the logical name registered in the space's fact type registry.

### Version-First Design

Rules, tables, flows, and lookup tables are **document containers**. All executable logic lives in **versions**. A document with no active version cannot be executed.

Lifecycle operations (activate, deactivate, delete) target specific **versions**, not the document.

**Metadata ownership:**

| Field | Level | Notes |
|-------|-------|-------|
| `name` | Document (immutable) | Uniqueness key within a space; shared by all versions |
| `tags`, `category` | Document | Organisational/discovery metadata |
| `description`, `effectiveFrom`, `effectiveUntil`, `changeSummary` | Version | Describes what *this version* does; can differ per version |

### Version Lifecycle States

| State |
|-------|
| `DRAFT` | 
| `PEER_REVIEW` | 
| `BUSINESS_REVIEW` | 
| `COMPLIANCE_REVIEW` | 
| `APPROVED` | 
| `ACTIVE` | 
| `INACTIVE` | 
| `DEPRECATED` | 
| `ARCHIVE` | 

Multiple versions of a rule can be `ACTIVE` simultaneously. The `?status=ACTIVE` filter returns all active versions; the engine uses the highest version number when executing without a pinned version.

---

## 3. Spaces

Spaces are the top-level isolation boundary. Every rule, table, and flow belongs to exactly one space.

```
POST   /api/v1/spaces
GET    /api/v1/spaces
GET    /api/v1/spaces/{spaceId}
PUT    /api/v1/spaces/{spaceId}
DELETE /api/v1/spaces/{spaceId}
```

---

#### `POST /api/v1/spaces`

Create a new space. Requires `ADMIN` role.

**Headers:** `X-User-Id: <userId>`

**Request Body:**
```json
{
  "name": "acme-underwriting",
  "description": "Underwriting rules for ACME Insurance"
}
```

**Response:** `201 Created`
```json
{
  "id": "acme-underwriting",
  "name": "acme-underwriting",
  "description": "Underwriting rules for ACME Insurance",
  "createdAt": "2026-05-11T08:00:00"
}
```

---

#### `GET /api/v1/spaces`

List all spaces the calling user has access to.

---

#### `GET /api/v1/spaces/{spaceId}`

Get a single space by ID.

---

#### `PUT /api/v1/spaces/{spaceId}`

Update space name or description.

**Request Body:**
```json
{
  "name": "acme-uw-v2",
  "description": "Updated description"
}
```

---

#### `DELETE /api/v1/spaces/{spaceId}`

Soft-delete a space. Rules and data are retained but the space becomes inaccessible.

---

### Space Analytics

```
GET /api/v1/spaces/{spaceId}/analytics
GET /api/v1/spaces/{spaceId}/audit-trail
```

#### `GET /api/v1/spaces/{spaceId}/analytics`

Returns rule counts, execution counts, and activity summary for the space.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | ISO-8601 datetime | Filter from date |
| `to` | ISO-8601 datetime | Filter to date |

---

#### `GET /api/v1/spaces/{spaceId}/audit-trail`

Returns a filtered audit trail for the space.

**Query Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `eventType` | — | Filter by event type |
| `userId` | — | Filter by user |
| `severity` | — | Filter by severity |
| `from` | — | ISO-8601 start date |
| `to` | — | ISO-8601 end date |
| `limit` | `50` | Max results |

---

## 4. Space Members

Manage which users have access to a space and what role they hold.

```
GET    /api/v1/spaces/{spaceId}/members
GET    /api/v1/spaces/{spaceId}/members/{userId}
POST   /api/v1/spaces/{spaceId}/members
PUT    /api/v1/spaces/{spaceId}/members/{userId}
DELETE /api/v1/spaces/{spaceId}/members/{userId}
```

#### `POST /api/v1/spaces/{spaceId}/members`

Add a user to a space with a role.

**Request Body:**
```json
{
  "userId": "user-abc123",
  "role": "RULE_AUTHOR"
}
```

Available roles: `ADMIN`, `RULE_AUTHOR`, `RULE_APPROVER`, `RULE_EXECUTOR`, `VIEWER`

---

#### `PUT /api/v1/spaces/{spaceId}/members/{userId}`

Update a member's role.

**Request Body:**
```json
{
  "role": "RULE_APPROVER"
}
```

---

## 5. Rules

Rules are the core authoring unit. Each rule encodes `when` (conditions) and `then` (actions) logic. The executable artifact is always a **version** of a rule.

### 5.1 Rule CRUD

```
GET    /api/v1/spaces/{spaceId}/rules
GET    /api/v1/spaces/{spaceId}/rules/{id}
GET    /api/v1/spaces/{spaceId}/rules/deleted
POST   /api/v1/spaces/{spaceId}/rules
PUT    /api/v1/spaces/{spaceId}/rules/{id}
DELETE /api/v1/spaces/{spaceId}/rules/{id}
POST   /api/v1/spaces/{spaceId}/rules/{id}/restore
```

---

#### `GET /api/v1/spaces/{spaceId}/rules`

List all rules in a space (excludes decision tables).

**Query Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `status` | — | Filter by status: `DRAFT`, `ACTIVE`, `INACTIVE`, `APPROVED`... |
| `page` | `0` | Page number (0-indexed) |
| `size` | `50` | Page size (max 100) |

**Response:** `200 OK` — array of rule objects with pagination headers.

---

#### `GET /api/v1/spaces/{spaceId}/rules/{id}`

Get a single rule by ID.

---

#### `GET /api/v1/spaces/{spaceId}/rules/deleted`

List soft-deleted rules in a space.

**Query Parameters:** `page`, `size`

---

#### `POST /api/v1/spaces/{spaceId}/rules`

Create a new rule document or add a new draft version to an existing one — determined by the `name` field:

- If no document with this `name` exists in the space → creates a new document and auto-assigns **version 1**.
- If a document with this `name` already exists → creates a new **draft version** (auto-assigned the next version number). The `name` in the request body must match the existing document name exactly.

The document `name` is immutable after first creation.

**Headers:** `X-User-Id: <userId>` (required)

**Request Body:**
```json
{
  "name": "Age Eligibility Check",
  "description": "Rejects applicants under 18 or over 65",
  "tags": ["eligibility", "age"],
  "category": "Underwriting",
  "effectiveFrom": "2026-01-01T00:00:00",
  "effectiveUntil": null,
  "changeSummary": "Initial version",
  "inputSchema": {
    "facts": [
      {
        "factType": "ApplicantInfo",
        "fields": [
          { "name": "age", "dataType": "number", "required": true },
          { "name": "annualIncome", "dataType": "number", "required": false }
        ]
      }
    ],
    "onDemand": []
  },
  "outputSchema": {
    "facts": [
      {
        "factType": "ApplicantInfo",
        "fields": [
          { "name": "eligible", "dataType": "boolean" }
        ]
      }
    ],
    "decisions": [
      { "name": "eligibilityDecision", "dataType": "string" }
    ],
    "reasons": []
  },
  "rule": {
    "when": {
      "match": "and",
      "conditions": [
        {
          "field": "ApplicantInfo.age",
          "operator": "LESS_THAN",
          "value": 18
        }
      ]
    },
    "then": [
      {
        "type": "ASSIGN",
        "field": "ApplicantInfo.eligible",
        "value": false,
        "dataType": "boolean"
      },
      {
        "type": "ADD_MESSAGE",
        "config": { "template": "Applicant is below minimum age requirement" }
      }
    ]
  }
}
```

| Field | Level | Required | Notes |
|-------|-------|----------|-------|
| `name` | Document | Yes | Must be unique within the space; immutable after first creation |
| `tags` | Document | No | Organisational labels |
| `category` | Document | No | Organisational grouping |
| `description` | Version | No | Describes what this version does |
| `effectiveFrom` | Version | No | When this version becomes effective |
| `effectiveUntil` | Version | No | When this version expires |
| `changeSummary` | Version | No | Human-readable description of what changed |
| `inputSchema` | Version | No | Declares input fact types and their fields per `schema.json#/$defs/inputSchema`. Drives authoring-time validation and UI scaffolding. `onDemand` lists fact types fetched at runtime. |
| `outputSchema` | Version | No | Declares output fact fields and top-level decisions per `schema.json#/$defs/outputSchema`. |
| `rule` | Version | Yes | Full rule logic per `schema.json#/$defs/ruleContent` |

**Response:** `201 Created` — rule object with `id`, `status: DRAFT`, and the new version details.

---

#### `PUT /api/v1/spaces/{spaceId}/rules/{id}`

Update document-level organisational metadata: `tags`, `category`. The document `name` is immutable after creation and cannot be changed here.

To update version-specific metadata (`description`, `effectiveFrom`, `effectiveUntil`, `changeSummary`), use `PATCH /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}`.
To change rule logic, create a new version via `POST /api/v1/spaces/{spaceId}/rules`.

**Request Body:**
```json
{
  "tags": ["eligibility", "age", "underwriting"],
  "category": "Underwriting"
}
```

---

#### `DELETE /api/v1/spaces/{spaceId}/rules/{id}`

Soft-delete a rule by default; permanently removes with `?hard=true`.

**Query Parameters:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `hard` | `false` | If `true`, permanently deletes the rule and all versions |

**Headers:** `X-User-Id` is used as `deletedBy` for audit.

---

#### `POST /api/v1/spaces/{spaceId}/rules/{id}/restore`

Restore a soft-deleted rule.

---

### 5.2 Rule Versions

Every rule can have many versions. Only specific versions are activated and executed — the document itself is just a container.

```
GET    /api/v1/spaces/{spaceId}/rules/{ruleId}/versions
GET    /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}
PATCH  /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}
POST   /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}/activate
POST   /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}/deactivate
POST   /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}/restore
DELETE /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}
```

> To create a new version, use `POST /api/v1/spaces/{spaceId}/rules` with the existing document `name` — the backend auto-increments the version number.

---

#### `GET /api/v1/spaces/{spaceId}/rules/{ruleId}/versions`

List all versions of a rule, newest first.

**Query Parameters:**

| Parameter | Description |
|-----------|-------------|
| `status` | `ACTIVE` — returns only currently active versions |

---

#### `GET /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}`

Get a specific version (e.g., `/versions/3`).

**Response includes:** full source JSON (schema.json document body), `description`, `effectiveFrom`, `effectiveUntil`, `changeSummary`, status, created/activated timestamps, `requiredOnDemandFactTypes` snapshot. 

---

#### `PATCH /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}`

Update version-specific metadata. Only permitted on **DRAFT** versions — activating a version freezes its metadata for audit integrity.

**Headers:** `X-User-Id: <userId>` (required)

**Request Body:**
```json
{
  "description": "Rejects applicants under 21 or over 65",
  "effectiveFrom": "2026-07-01T00:00:00",
  "effectiveUntil": null,
  "changeSummary": "Raised minimum age from 18 to 21"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `description` | No | What this version does |
| `effectiveFrom` | No | When this version becomes effective |
| `effectiveUntil` | No | When this version expires |
| `changeSummary` | No | Human-readable description of what changed |

**Response:** `200 OK` — updated version object.

---

#### `POST /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}/activate`

Activate a specific version number. Supports multiple simultaneously active versions.

**Response:** `200 OK` — the activated version object.

---

#### `POST /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}/deactivate`

Deactivate a specific version. Used for rollbacks. Execution calls targeting this version will fail after deactivation.

**Response:** `200 OK` — the deactivated version object.

---

#### `POST /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}/restore`

Restore a soft-deleted version. The version is returned to **DRAFT** state — it must be explicitly re-activated before it can be executed. This allows the operator to review the restored version before re-enabling it.

**Headers:** `X-User-Id: <userId>` (required)

**Response:** `200 OK` — the restored version object with `status: DRAFT`.

---

#### `DELETE /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}`

Soft-delete a specific version. Active versions are deactivated first. The version record is retained for 7-year audit compliance but is no longer accessible via normal list or get endpoints. Use the restore endpoint to recover a soft-deleted version.

**Headers:** `X-User-Id: <userId>` — recorded as `deletedBy`.

**Response:** `204 No Content`

---

### 5.3 Rule Execution

```
POST /api/v1/spaces/{spaceId}/rules/{ruleId}/execute
```

Execute the active version of a rule against a set of input facts.

**Request Body:**
```json
{
  "facts": [
    {
      "factType": "ApplicantInfo",
      "factData": {
        "age": 35,
        "annualIncome": 1200000
      }
    }
  ],
  "globalVariables": {
    "effectiveDate": "2026-05-01"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `facts` | Yes | One or more input facts |
| `versionId` | No | Pin execution to a specific version number; omit to use the latest active version |
| `globalVariables` | No | Key-value pairs accessible to all rules in the session |

**Response:** `200 OK`
```json
{
  "executionId": "exec-a1b2c3",
  "ruleId": 42,
  "versionId": 3,
  "status": "SUCCESS",
  "rulesFired": [
    {
      "ruleName": "Age Eligibility Check",
      "activationCount": 1,
      "durationMs": 2
    }
  ],
  "facts": [
    {
      "factType": "ApplicantInfo",
      "factData": {
        "age": 35,
        "annualIncome": 1200000,
        "eligible": true
      }
    }
  ],
  "messages": ["Applicant meets all eligibility criteria"],
  "tasks": [],
  "executionMetrics": {
    "durationMs": 8,
    "rulesEvaluated": 5,
    "rulesFired": 1,
    "factCount": 1
  },
  "executedAt": "2026-05-11T08:30:00"
}
```

**Execution status values:** `SUCCESS`, `ERROR`, `PARTIAL`

---

### 5.4 Rule Version Comparison

```
POST /api/v1/spaces/{spaceId}/rules/{ruleId}/compare
```

Run two versions of the same rule against identical input and compare outputs side by side. Used for A/B testing before promoting a new version to production.

**Request Body:**
```json
{
  "baselineVersionId": 2,
  "candidateVersionId": 3,
  "facts": [
    {
      "factType": "ApplicantInfo",
      "factData": { "age": 28, "annualIncome": 500000 }
    }
  ]
}
```

**Response:** side-by-side output diff with rule firing differences highlighted.

---

## 6. Decision Tables

Decision tables express rules as a grid — each row is a rule, columns are conditions and actions.

### 6.1 Table CRUD

```
GET    /api/v1/spaces/{spaceId}/tables
GET    /api/v1/spaces/{spaceId}/tables/{tableId}
GET    /api/v1/spaces/{spaceId}/tables/deleted
POST   /api/v1/spaces/{spaceId}/tables
PUT    /api/v1/spaces/{spaceId}/tables/{tableId}
DELETE /api/v1/spaces/{spaceId}/tables/{tableId}
POST   /api/v1/spaces/{spaceId}/tables/{tableId}/restore
PUT    /api/v1/spaces/{spaceId}/tables/{tableId}/rows/{rowId}/enable
PUT    /api/v1/spaces/{spaceId}/tables/{tableId}/rows/{rowId}/disable
```

---

#### `GET /api/v1/spaces/{spaceId}/tables`

List all decision tables in a space.

**Query Parameters:** `status`, `page`, `size` — same semantics as the rules list.

---

#### `POST /api/v1/spaces/{spaceId}/tables`

Create a new decision table or add a new draft version to an existing one — determined by the `name` field:

- If no document with this `name` exists in the space → creates a new document and auto-assigns **version 1**.
- If a document with this `name` already exists → creates a new **draft version** (auto-assigned the next version number). The `name` in the request body must match the existing document name exactly.

The document `name` is immutable after first creation.

**Headers:** `X-User-Id: <userId>` (required)

**Request Body:**
```json
{
  "name": "Premium Rate Table",
  "description": "Rates by age band and product type",
  "tags": ["premium", "rating"],
  "category": "Underwriting",
  "effectiveFrom": "2026-01-01T00:00:00",
  "effectiveUntil": null,
  "changeSummary": "Initial version",
  "kind": "table",
  "inputSchema": {
    "facts": [
      {
        "factType": "ApplicantInfo",
        "fields": [
          { "name": "age", "dataType": "number", "required": true },
          { "name": "productCode", "dataType": "string", "required": true }
        ]
      }
    ]
  },
  "outputSchema": {
    "facts": [
      {
        "factType": "ApplicantInfo",
        "fields": [
          { "name": "premiumRate", "dataType": "number" }
        ]
      }
    ]
  },
  "table": {
    "hitPolicy": "first_match",
    "inputs": [
      { "field": "ApplicantInfo.age", "operator": "BETWEEN", "dataType": "number", "label": "Age" },
      { "field": "ApplicantInfo.productCode", "operator": "EQUALS", "dataType": "string", "label": "Product" }
    ],
    "outputs": [
      { "field": "ApplicantInfo.premiumRate", "dataType": "number", "label": "Rate" }
    ],
    "rows": [
      {
        "id": 1,
        "isEnabled": true,
        "inputs": [18, 35, "PA"],
        "outputs": [5]
      },
      {
        "id": 2,
        "isEnabled": true,
        "inputs": [36, 50, "PA"],
        "outputs": [7]
      }
    ]
  }
}
```

**Hit policies** (`table.hitPolicy` — all lowercase with underscore per `schema.json`):

| Value | Description |
|-------|-------------|
| `first_match` | First matching row wins |
| `unique_match` | Exactly one row must match |
| `collect_all` | All matching rows are collected |
| `priority_order` | Rows evaluated in priority order; highest priority match wins |

**Table input columns** (`table.inputs[*]`): each entry must include `field`, `operator`, and `dataType`. The `operator` declares the comparison applied when evaluating the column (e.g. `BETWEEN`, `EQUALS`). `label` is optional.

**Table rows** (`table.rows[*]`): `inputs` is a positional array aligned to `table.inputs`; `outputs` is a positional array aligned to `table.outputs`. For a `BETWEEN` column provide the two boundary values as consecutive entries. Use `null` to skip a column. `isEnabled: false` suppresses the row without requiring a new version.

**Response:** `201 Created`

---

#### `PUT /api/v1/spaces/{spaceId}/tables/{id}`

Update document-level organisational metadata: `tags`, `category`. The document `name` is immutable after creation.

To update version-specific metadata (`description`, `effectiveFrom`, `effectiveUntil`, `changeSummary`), use `PATCH /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}`.
To change table logic, create a new version via `POST /api/v1/spaces/{spaceId}/tables`.

**Request Body:**
```json
{
  "tags": ["premium", "rating"],
  "category": "Underwriting"
}
```

---

#### `DELETE /api/v1/spaces/{spaceId}/tables/{id}`

Soft-delete a table by default; permanently removes with `?hard=true`. Requires `ADMIN` role.

---

#### `POST /api/v1/spaces/{spaceId}/tables/{id}/restore`

Restore a soft-deleted table. Requires `ADMIN` role.

---

#### `PUT /api/v1/spaces/{spaceId}/tables/{tableId}/rows/{rowId}/enable`

Enable a specific row. Disabled rows are skipped during execution without requiring a new version.

**Headers:** `X-User-Id: <userId>` (required)

**Response:** `200 OK` — updated version object reflecting the row state change.

---

#### `PUT /api/v1/spaces/{spaceId}/tables/{tableId}/rows/{rowId}/disable`

Disable a specific row. Useful for temporarily suppressing a rule without deactivating the entire table version.

**Headers:** `X-User-Id: <userId>` (required)

---

### 6.2 Table Versions

```
GET    /api/v1/spaces/{spaceId}/tables/{tableId}/versions
GET    /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}
PATCH  /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}
POST   /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}/activate
POST   /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}/deactivate
POST   /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}/restore
DELETE /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}
```

> To create a new version, use `POST /api/v1/spaces/{spaceId}/tables` with the existing document `name` — same semantics as rules.

---

#### `GET /api/v1/spaces/{spaceId}/tables/{tableId}/versions`

List all versions of a table, newest first.

**Query Parameters:** `status=ACTIVE` returns only currently active versions.

---

#### `GET /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}`

Get a specific version including its full source JSON (schema.json table body), `description`, `effectiveFrom`, `effectiveUntil`, `changeSummary`, row data, and status.

---

#### `PATCH /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}`

Update version-specific metadata. Only permitted on **DRAFT** versions.

**Headers:** `X-User-Id: <userId>` (required)

**Request Body:**
```json
{
  "description": "Rates by age band and product type — extended to age 65",
  "effectiveFrom": "2026-07-01T00:00:00",
  "effectiveUntil": null,
  "changeSummary": "Added age band 51-65"
}
```

**Response:** `200 OK` — updated version object.

---

#### `POST /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}/activate`

Activate a specific version of a table.

---

#### `POST /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}/deactivate`

Deactivate a specific version of a table.

---

#### `POST /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}/restore`

Restore a soft-deleted table version to **DRAFT** state. Must be explicitly re-activated before it can be executed.

**Headers:** `X-User-Id: <userId>` (required)

**Response:** `200 OK` — the restored version object with `status: DRAFT`.

---

#### `DELETE /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}`

Soft-delete a specific version. Active versions are deactivated first. The version record is retained for 7-year audit compliance. Use the restore endpoint to recover a soft-deleted version.

**Headers:** `X-User-Id: <userId>`

**Response:** `204 No Content`

---

### 6.3 Table Execution

```
POST /api/v1/spaces/{spaceId}/tables/{tableId}/execute
```

Execute a decision table against input facts.

**Request Body:** same shape as rule execution — `facts`, `versionId` (optional), `globalVariables` (optional).

**Response:** includes `matchedRows` (which rows fired), `outputs` (result values), and execution metrics.

---

### 6.4 Table Import

Upload a decision table from an Excel or CSV file.

```
POST /api/v1/spaces/{spaceId}/tables/import/preview
POST /api/v1/spaces/{spaceId}/tables/import/upload
```

Both endpoints accept `multipart/form-data`.

---

#### `POST /api/v1/spaces/{spaceId}/tables/import/preview`

Parse an `.xlsx` or `.csv` file and return a preview of how it would be imported. Nothing is persisted.

**Form Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `file` | file | `.xlsx` or `.csv` file |
| `tableId` | string | Target table ID |
| `hitPolicy` | string | Hit policy to apply |

**Response:** parsed columns, rows, and any warnings about unrecognized fields.

---

#### `POST /api/v1/spaces/{spaceId}/tables/import/upload`

Upload and persist the table. Creates a new version of the target rule.

**Form Fields:** same as preview
---

## 7. Flows

Flows chain rules and tables into a multi-stage sequential pipeline. Facts are passed between stages — each stage can read and modify the shared fact set.

### 7.1 Flow CRUD

```
GET  /api/v1/spaces/{spaceId}/flows
GET  /api/v1/spaces/{spaceId}/flows/{id}
POST /api/v1/spaces/{spaceId}/flows
PUT  /api/v1/spaces/{spaceId}/flows/{id}
```

> Flows do not have a document-level delete endpoint. To retire a flow, deactivate all its versions.  
> To permanently remove a specific version, use the version-level `DELETE` (see §7.2).

---

#### `GET /api/v1/spaces/{spaceId}/flows`

List all flows in a space.

**Query Parameters:** `page`, `size`

---

#### `GET /api/v1/spaces/{spaceId}/flows/{id}`

Get flow details by ID.

---

#### `POST /api/v1/spaces/{spaceId}/flows`

Create a new flow or add a new draft version to an existing one — determined by the `name` field:

- If no document with this `name` exists in the space → creates a new document and auto-assigns **version 1**.
- If a document with this `name` already exists → creates a new **draft version** (auto-assigned the next version number). The `name` in the request body must match the existing document name exactly.

The document `name` is immutable after first creation.

**Headers:** `X-User-Id: <userId>` (required)

**Request Body:**
```json
{
  "name": "Enrolment Pipeline",
  "description": "Full enrolment validation and premium calculation pipeline",
  "tags": ["enrolment", "axa"],
  "category": "Underwriting",
  "effectiveFrom": "2026-01-01T00:00:00",
  "effectiveUntil": null,
  "changeSummary": "Initial version",
  "kind": "flow",
  "stopOnError": false,
  "inputSchema": {
    "facts": [
      {
        "factType": "ApplicantInfo",
        "fields": [
          { "name": "dateOfBirth", "dataType": "date", "required": true },
          { "name": "productCode", "dataType": "string", "required": true },
          { "name": "sumAssured", "dataType": "number", "required": true }
        ]
      }
    ],
    "onDemand": [
      { "factType": "CreditScore", "required": false, "allowStale": true }
    ]
  },
  "outputSchema": {
    "facts": [
      {
        "factType": "ApplicantInfo",
        "fields": [
          { "name": "derivedAge", "dataType": "number" },
          { "name": "eligible", "dataType": "boolean" },
          { "name": "ratedPremium", "dataType": "number" },
          { "name": "decisionLane", "dataType": "string" }
        ]
      }
    ],
    "decisions": [
      { "name": "enrolmentDecision", "dataType": "string" }
    ],
    "reasons": []
  },
  "flow": {
    "mergeStrategy": "last_writer_wins",
    "nodes": [
      { "id": 1, "type": "start", "name": "Start" },
      {
        "id": 2,
        "type": "rule",
        "name": "Age Derivation",
        "config": { "ruleRef": "age-derivation" },
        "onError": "continue"
      },
      {
        "id": 3,
        "type": "rule",
        "name": "Eligibility Check",
        "config": { "ruleRef": "eligibility" },
        "onError": "stop"
      },
      { "id": 4, "type": "end", "name": "End" }
    ],
    "edges": [
      { "id": 1, "source": 1, "target": 2 },
      { "id": 2, "source": 2, "target": 3 },
      { "id": 3, "source": 3, "target": 4 }
    ]
  }
}
```

`inputSchema` and `outputSchema` are **required** for `kind: "flow"` per `schema.json`.

**`inputSchema`** declares all fact types the flow consumes:
- `facts[*].factType` — name of the fact type (must be registered)
- `facts[*].fields` — field definitions: `name`, `dataType`, optional `required` and `itemType`
- `onDemand[*]` — fact types fetched from the Fact Enrichment Service at runtime; `required` and `allowStale` control fetch behaviour

**`outputSchema`** declares what the flow produces:
- `facts[*]` — same structure as inputSchema; lists the fields written by the flow
- `decisions[*]` — top-level decision fields (name + dataType) outside any fact type
- `reasons` — engine-generated trace strings; declare as empty array `[]` if not used

**Node types:**

| Type | `config` required fields | Description |
|------|--------------------------|-------------|
| `start` | — | Entry point |
| `end` | — | Terminal node |
| `rule` | `ruleRef` | Execute a business rule by name |
| `table` | `tableRef` | Execute a decision table by name |
| `expression` | `expressions` (array) | Evaluate inline expressions |
| `transform` | `assignments` (array) | Map/transform fact fields |
| `enrich` | `factType`, `lookupKey` | Fetch external data |
| `loop` | `collection`, `itemAlias`, `aggregate` | Iterate over a list fact |
| `subflow` | `flowRef` | Invoke another flow inline |

**`onError`** per node: `"stop"` (halt the flow), `"continue"` (log and proceed), `"fallback"` (use `fallbackValue`).

**`flow.mergeStrategy`** — how fact mutations from parallel or sequential nodes are merged:

| Value | Description |
|-------|-------------|
| `last_writer_wins` | Later stage overwrites earlier values for the same field |
| `union_all` | All field values from all stages are kept |
| `fail_on_conflict` | Execution fails if two stages write different values to the same field (default) |

---

#### `PUT /api/v1/spaces/{spaceId}/flows/{id}`

Update document-level metadata: `tags`, `category`, `stopOnError`. The document `name` is immutable after creation.

To update version-specific metadata (`description`, `effectiveFrom`, `effectiveUntil`, `changeSummary`), use `PATCH /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}`.
To change the flow node/edge structure, create a new version via `POST /api/v1/spaces/{spaceId}/flows`.

**Headers:** `X-User-Id: <userId>` (required)

**Request Body:**
```json
{
  "tags": ["enrolment", "axa"],
  "category": "Underwriting",
  "stopOnError": false
}
```

---

### 7.2 Flow Versions

```
GET    /api/v1/spaces/{spaceId}/flows/{flowId}/versions
GET    /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}
PATCH  /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}
POST   /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}/activate
POST   /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}/deactivate
POST   /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}/restore
DELETE /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}
```

> To create a new version, use `POST /api/v1/spaces/{spaceId}/flows` with the existing document `name` — same semantics as rules and tables.

---

#### `GET /api/v1/spaces/{spaceId}/flows/{flowId}/versions`

List all versions of a flow.

**Query Parameters:** `status=ACTIVE` returns only the active version.

---

#### `GET /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}`

Get a specific flow version with its full source JSON (schema.json flow body), `description`, `effectiveFrom`, `effectiveUntil`, `changeSummary`, and status.

---

#### `PATCH /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}`

Update version-specific metadata. Only permitted on **DRAFT** versions.

**Headers:** `X-User-Id: <userId>` (required)

**Request Body:**
```json
{
  "description": "Full enrolment pipeline — updated eligibility stage",
  "effectiveFrom": "2026-07-01T00:00:00",
  "effectiveUntil": null,
  "changeSummary": "Updated discount-eligibility rule reference"
}
```

**Response:** `200 OK` — updated version object.

---

#### `POST /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}/activate`

Activate a specific flow version, making it executable.

---

#### `POST /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}/deactivate`

Deactivate a specific flow version.

---

#### `POST /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}/restore`

Restore a soft-deleted flow version to **DRAFT** state. Must be explicitly re-activated before it can be executed.

**Headers:** `X-User-Id: <userId>` (required)

**Response:** `200 OK` — the restored version object with `status: DRAFT`.

---

#### `DELETE /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}`

Soft-delete a specific flow version. Active versions are deactivated first. The version record is retained for 7-year audit compliance. Use the restore endpoint to recover a soft-deleted version. Requires `ADMIN` role.

**Headers:** `X-User-Id: <userId>`

**Response:** `204 No Content`

---

### 7.3 Flow Execution

```
POST /api/v1/spaces/{spaceId}/flows/{flowId}/execute
```

Execute a flow. Facts are propagated through all stages sequentially.

**Request Body:**
```json
{
  "facts": [
    {
      "factType": "ApplicantInfo",
      "factData": {
        "dateOfBirth": "1990-03-15",
        "productCode": "PA",
        "sumAssured": 500000
      }
    }
  ],
  "versionId": null,
  "globalVariables": {
    "effectiveDate": "2026-05-01"
  }
}
```

**Response:** `200 OK`
```json
{
  "flowId": 7,
  "versionId": 2,
  "executionId": "flow-exec-xyz",
  "status": "SUCCESS",
  "stageResults": [
    {
      "stageName": "Age Derivation",
      "stageOrder": 1,
      "status": "SUCCESS",
      "rulesFired": ["R-00: Derive Age from DOB"],
      "durationMs": 4
    },
    {
      "stageName": "Eligibility Check",
      "stageOrder": 2,
      "status": "SUCCESS",
      "rulesFired": ["R-03a: Age Eligibility"],
      "durationMs": 3
    }
  ],
  "facts": [
    {
      "factType": "ApplicantInfo",
      "factData": {
        "derivedAge": 36,
        "eligible": true,
        "ratedPremium": 4500
      }
    }
  ],
  "messages": [],
  "executionMetrics": {
    "totalDurationMs": 18,
    "stagesExecuted": 2,
    "stagesSkipped": 0,
    "stagesFailed": 0
  },
  "executedAt": "2026-05-11T08:30:00"
}
```

---

### 7.4 Flow Version Comparison

```
POST /api/v1/spaces/{spaceId}/flows/{flowId}/compare
```

Run two versions of a flow against identical input and compare stage-by-stage outputs.

**Request Body:**
```json
{
  "baselineVersionId": 1,
  "candidateVersionId": 2,
  "facts": [
    {
      "factType": "ApplicantInfo",
      "factData": { "dateOfBirth": "1990-03-15", "productCode": "PA" }
    }
  ]
}
```

---

## 8. Lookup Tables

Lookup tables are versioned reference data queried by rules at runtime. Examples: product code alias maps, premium rate grids, limit matrices.

```
GET    /api/v1/spaces/{spaceId}/lookup-tables
GET    /api/v1/spaces/{spaceId}/lookup-tables/{id}
POST   /api/v1/spaces/{spaceId}/lookup-tables
PUT    /api/v1/spaces/{spaceId}/lookup-tables/{id}
DELETE /api/v1/spaces/{spaceId}/lookup-tables/{id}
GET    /api/v1/spaces/{spaceId}/lookup-tables/{id}/versions
GET    /api/v1/spaces/{spaceId}/lookup-tables/{id}/versions/{versionNumber}
POST   /api/v1/spaces/{spaceId}/lookup-tables/{id}/versions/{versionNumber}/restore
```

---

#### `GET /api/v1/spaces/{spaceId}/lookup-tables`

List all lookup tables in a space.

**Query Parameters:** `page`, `size`

---

#### `GET /api/v1/spaces/{spaceId}/lookup-tables/{id}`

Get a lookup table including its active version's data.

---

#### `POST /api/v1/spaces/{spaceId}/lookup-tables`

Create a lookup table with its initial data. The first version is created and activated automatically.

**Request Body:**
```json
{
  "name": "axa_product_code_aliases",
  "kind": "lookup_table",
  "description": "Maps short product codes to canonical names",
  "tags": ["reference", "product"],
  "category": "Underwriting",
  "lookupTable": {
    "keyColumns": ["alias"],
    "valueColumns": ["canonical"],
    "keyDelimiter": "|",
    "data": {
      "PA": { "canonical": "PERSONAL_ACCIDENT" },
      "CI": { "canonical": "CRITICAL_ILLNESS" },
      "HC": { "canonical": "HEALTH_COVER" }
    }
  }
}
```

**`lookupTable` structure per `schema.json#/$defs/lookupTableContent`:**

| Field | Required | Description |
|-------|----------|-------------|
| `keyColumns` | Yes | Array of key column **names** (strings). For a multi-key table, all key column names are listed here. |
| `valueColumns` | Yes | Array of value column **names** (strings). |
| `keyDelimiter` | No | Separator used to join multi-key values when building the lookup key (default `"\|"`). |
| `data` | Yes (if no `dataSource`) | Object keyed by the lookup key string (pipe-delimited for multi-key). Each value is an object whose properties match the `valueColumns` names. |
| `dataSource` | Yes (if no `data`) | Reference to an uploaded `.xlsx` or `.csv` file: `{ "format": "csv"\|"xlsx", "ref": "<blobId>" }`. |

Rules reference lookup tables using the `LOOKUP` action type in `then` blocks, or the `operandRef` `$type: "lookup_ref"` in condition values.

**Response:** `201 Created`

---

#### `PUT /api/v1/spaces/{spaceId}/lookup-tables/{id}`

Update lookup data. Creates a new version automatically and marks it active.

**Request Body:**
```json
{
  "lookupTable": {
    "keyColumns": ["alias"],
    "valueColumns": ["canonical"],
    "data": {
      "PA": { "canonical": "PERSONAL_ACCIDENT" },
      "SC": { "canonical": "STUDENT_COVER" }
    }
  }
}
```

---

#### `DELETE /api/v1/spaces/{spaceId}/lookup-tables/{id}`

Delete a lookup table. Requires `ADMIN` role.

---

#### `GET /api/v1/spaces/{spaceId}/lookup-tables/{id}/versions`

List all versions of a lookup table, newest first.

---

#### `GET /api/v1/spaces/{spaceId}/lookup-tables/{id}/versions/{versionNumber}`

Get a specific version including its full data set.

---

#### `POST /api/v1/spaces/{spaceId}/lookup-tables/{id}/versions/{versionNumber}/restore`

Restore a soft-deleted lookup table version to its previous active state. Because lookup table versions carry only reference data (no executable logic), a restored version is immediately re-activated rather than returning to DRAFT.

**Headers:** `X-User-Id: <userId>` (required)

**Response:** `200 OK` — the restored version object with `status: ACTIVE`.

---

## 9. Unified Execution

The recommended integration point for products consuming rule decisions. Execute any rule, table, or flow using a single opaque document ID — callers do not need to know the document type.

```
POST /api/v1/spaces/{spaceId}/execute/{publicId}
```

`publicId` is the stable UUID assigned to a rule, table, or flow at creation time.

**Request Body:**
```json
{
  "facts": [
    {
      "factType": "ApplicantInfo",
      "factData": {
        "age": 32,
        "productCode": "PA",
        "sumAssured": 500000
      }
    }
  ],
  "versionId": null,
  "globalVariables": {}
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `facts` | Yes | Input facts |
| `versionId` | No | Pin to a specific version; omit to use the latest active |
| `globalVariables` | No | Session-level variables accessible to all rules |

**Response:** delegates to the appropriate handler — same response shape as rule, table, or flow execution.

---

## 10. Fact Type Definitions

Fact type definitions declare the logical input types your rules accept. The engine validates facts against registered types before execution.

```
GET    /api/v1/fact-type-definitions
GET    /api/v1/fact-type-definitions/{factType}
POST   /api/v1/fact-type-definitions
PUT    /api/v1/fact-type-definitions/{factType}
DELETE /api/v1/fact-type-definitions/{factType}
```

> Fact type definitions are global — not space-scoped.

---

#### `POST /api/v1/fact-type-definitions`

Register a new fact type.

**Request Body:**
```json
{
  "factType": "ApplicantInfo",
  "description": "Applicant data for underwriting",
  "isOnDemand": false,
  "cacheTtlMs": null
}
```

For on-demand fact types fetched from the Fact Enrichment Service at runtime:

```json
{
  "factType": "CreditScore",
  "description": "Credit bureau score, fetched at runtime",
  "isOnDemand": true,
  "cacheTtlMs": 3600000
}
```

---

## 11. Field Schemas

Field schemas define the allowed fields and data types for each fact type. Rules are validated against these schemas at authoring time. Field schemas are admin-managed global definitions.

```
GET    /api/v1/fields
GET    /api/v1/fields/{id}
GET    /api/v1/fields/by-type?fieldType=<type>
GET    /api/v1/fields/required
GET    /api/v1/fields/arrays
POST   /api/v1/fields
PUT    /api/v1/fields/{id}
DELETE /api/v1/fields/{id}
```

---

#### `GET /api/v1/fields`

List all field schema definitions.

**Query Parameters:** `page`, `size`

---

#### `POST /api/v1/fields`

Define a field on a fact type. Requires `ADMIN` role.

**Request Body:**
```json
{
  "factType": "ApplicantInfo",
  "fieldName": "age",
  "fieldType": "integer",
  "required": false,
  "description": "Applicant age in years",
  "enumValues": null,
  "minValue": 0,
  "maxValue": 120
}
```

**Data types:** `string`, `number`, `boolean`, `date`, `datetime`, `list`, `object`

---

#### `GET /api/v1/fields/by-type`

List fields filtered by `fieldType`.

**Query Parameters:** `fieldType` (required)

---

#### `GET /api/v1/fields/required`

List all fields marked as required in the space.

---

#### `GET /api/v1/fields/arrays`

List all list/array fields in the space.

---

## 12. Audit & Analytics

### Audit Events

```
GET /api/v1/spaces/{spaceId}/audit-events/recent
GET /api/v1/spaces/{spaceId}/audit-events/rule/{ruleId}
GET /api/v1/spaces/{spaceId}/audit-events/user/{userId}
GET /api/v1/spaces/{spaceId}/audit-events/type/{eventType}
GET /api/v1/spaces/{spaceId}/audit-events/critical
```

All audit endpoints support `page` and `limit` query parameters.

#### `GET /api/v1/spaces/{spaceId}/audit-events/recent`

Returns the most recent audit events across all document types in the space.

#### `GET /api/v1/spaces/{spaceId}/audit-events/rule/{ruleId}`

Returns full audit history for a specific rule across all versions and executions.

#### `GET /api/v1/spaces/{spaceId}/audit-events/critical`

Returns high-severity events: activations, deactivations, permission changes, failed executions.

## 13. Metadata Reference

Global reference data for authoring UIs. Not space-scoped.

```
GET /api/v1/metadata/operators
GET /api/v1/metadata/actions
GET /api/v1/metadata/data-types
GET /api/v1/metadata/security
```

---

#### `GET /api/v1/metadata/operators`

Returns all supported condition operators with descriptions, supported data types, and example usage.

**Supported operators** (per `schema.json#/$defs/operator`):

| Operator | Requires `value` | Requires `secondValue` | Notes |
|----------|-----------------|----------------------|-------|
| `EQUALS` | Yes | — | |
| `NOT_EQUALS` | Yes | — | |
| `GREATER_THAN` | Yes | — | |
| `GREATER_THAN_OR_EQUAL` | Yes | — | |
| `LESS_THAN` | Yes | — | |
| `LESS_THAN_OR_EQUAL` | Yes | — | |
| `CONTAINS` | Yes | — | |
| `NOT_CONTAINS` | Yes | — | |
| `IN` | Yes | — | `value` is an array |
| `NOT_IN` | Yes | — | `value` is an array |
| `BETWEEN` | Yes | Yes | Inclusive range |
| `DATE_BEFORE` | Yes | — | |
| `DATE_AFTER` | Yes | — | |
| `DATE_BETWEEN` | Yes | Yes | Inclusive date range |
| `IS_NULL` | — | — | |
| `IS_NOT_NULL` | — | — | |
| `MATCHES_PATTERN` | Yes | — | Regex pattern in `value` |
| `STARTS_WITH` | Yes | — | |
| `ENDS_WITH` | Yes | — | |
| `IS_EMPTY` | — | — | For lists/strings |
| `IS_NOT_EMPTY` | — | — | For lists/strings |
| `CONTAINS_ALL` | Yes | — | `value` is an array |
| `CONTAINS_ANY` | Yes | — | `value` is an array |

---

#### `GET /api/v1/metadata/actions`

Returns all supported action types.

**Supported actions** (per `schema.json#/$defs/actionType`):

| Action | Required fields | Key `config` fields | Description |
|--------|----------------|---------------------|-------------|
| `ASSIGN` | `field`, `value` | — | Set a fact field to a literal or operand ref |
| `COMPUTE` | `target` | `formula` (string) | Evaluate a formula expression and assign to `target` |
| `MULTIPLY` | `field` | `multiplier` (number) | Multiply a field in-place |
| `APPLY_PERCENTAGE` | `field` | `percentage` (number) | Apply a percentage to a field |
| `LOOKUP` | — | `table`, `key`; optional `version`, `chain[]` | Fetch a value from a lookup table |
| `BRANCH` | — | `branches[]` — each with optional `when` and required `then` | Conditional branching; last branch with no `when` is the else block |
| `ADD_MESSAGE` | — | `template` (string with `{field.path}` interpolation) | Append a message to the output messages list |
| `ADD_TO_LIST` | `field`, `value` | — | Append a value to a list field |
| `REMOVE_FROM_LIST` | `field`, `value` | — | Remove a value from a list field |
| `SUM_LIST` | `target` | `collection`, `itemField` | Sum a numeric field across a list and assign to `target` |
| `CREATE_TASK` | — | `taskType` (string) | Emit a task for downstream processing |
| `LOG` | — | `message` (string) | Write a debug-level log entry |

---

#### `GET /api/v1/metadata/data-types`

Returns all supported data types with descriptions.

---

#### `GET /api/v1/metadata/security`

Returns formula security constraints: blocked keywords, allowed math functions, and ReDoS prevention rules.

---

## Appendix: Quick Reference

| Resource | Base Path / Key Endpoints |
|----------|--------------------------|
| Spaces | `/api/v1/spaces` |
| Space Members | `/api/v1/spaces/{spaceId}/members` |
| Space Analytics | `/api/v1/spaces/{spaceId}/analytics` |
| Rules (create doc or new version) | `POST /api/v1/spaces/{spaceId}/rules` |
| Rules (doc-level metadata) | `PUT /api/v1/spaces/{spaceId}/rules/{id}` — `tags`, `category` only |
| Rule Versions | `/api/v1/spaces/{spaceId}/rules/{ruleId}/versions` |
| Rule Version Metadata | `PATCH /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}` — DRAFT only |
| Rule Version Restore | `POST /api/v1/spaces/{spaceId}/rules/{ruleId}/versions/{version}/restore` |
| Rule Execution | `POST /api/v1/spaces/{spaceId}/rules/{ruleId}/execute` |
| Rule Comparison | `POST /api/v1/spaces/{spaceId}/rules/{ruleId}/compare` |
| Decision Tables (create doc or new version) | `POST /api/v1/spaces/{spaceId}/tables` |
| Decision Tables (doc-level metadata) | `PUT /api/v1/spaces/{spaceId}/tables/{id}` — `tags`, `category` only |
| Table Versions | `/api/v1/spaces/{spaceId}/tables/{tableId}/versions` |
| Table Version Metadata | `PATCH /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}` — DRAFT only |
| Table Version Restore | `POST /api/v1/spaces/{spaceId}/tables/{tableId}/versions/{version}/restore` |
| Table Execution | `POST /api/v1/spaces/{spaceId}/tables/{tableId}/execute` |
| Table Import | `/api/v1/spaces/{spaceId}/tables/import` |
| Flows (create doc or new version) | `POST /api/v1/spaces/{spaceId}/flows` |
| Flows (doc-level metadata) | `PUT /api/v1/spaces/{spaceId}/flows/{id}` — `tags`, `category`, `stopOnError` only |
| Flow Versions | `/api/v1/spaces/{spaceId}/flows/{flowId}/versions` |
| Flow Version Metadata | `PATCH /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}` — DRAFT only |
| Flow Version Restore | `POST /api/v1/spaces/{spaceId}/flows/{flowId}/versions/{version}/restore` |
| Flow Execution | `POST /api/v1/spaces/{spaceId}/flows/{flowId}/execute` |
| Flow Comparison | `POST /api/v1/spaces/{spaceId}/flows/{flowId}/compare` |
| Lookup Tables | `/api/v1/spaces/{spaceId}/lookup-tables` |
| Lookup Table Version Restore | `POST /api/v1/spaces/{spaceId}/lookup-tables/{id}/versions/{versionNumber}/restore` |
| Unified Execution | `POST /api/v1/spaces/{spaceId}/execute/{publicId}` |
| Fact Types | `/api/v1/fact-type-definitions` |
| Field Schemas | `/api/v1/fields` |
| Audit Events | `/api/v1/spaces/{spaceId}/audit-events` |
| Metadata | `/api/v1/metadata` |

---
