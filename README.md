# University — Distributed System

A Next.js university management system backed by **5 independent single-node Couchbase instances** deployed on DigitalOcean — one dedicated Droplet per data domain.

---

## Architecture Overview

```
                  ┌─────────────────────┐
   Browser ──────▶│  Next.js (Gateway)  │
                  └──────┬──────────────┘
          ┌───────┬──────┼──────┬───────┐
          ▼       ▼      ▼      ▼       ▼
     [students] [teachers] [courses] [enrollments] [classes]
      Droplet   Droplet   Droplet    Droplet       Droplet
       (CB)      (CB)      (CB)       (CB)          (CB)

Each Droplet runs one Couchbase instance hosting exactly one collection.
Next.js API routes act as the gateway — connecting to whichever node owns
the requested domain. Cross-domain queries fan out in parallel.
```

### Why this is shared-nothing

| Property | How this architecture implements it |
|---|---|
| No shared memory | 5 completely separate OS processes on 5 separate Droplets |
| No shared disk | Each Droplet has its own filesystem; no NFS or shared block storage |
| Domain isolation | A failure on the `students` node has zero impact on `courses` or `teachers` |
| Independent scaling | Each domain node can be resized or replaced without touching the others |
| No coordinator | The Next.js API routes directly to the correct node by domain; there is no cluster map or gossip |
| Fault-tolerant reads | Cross-domain endpoints (`enrollments/[id]`, `classes/[id]`) use `safeFetch` so a single unavailable domain returns a partial result instead of an error |

---

## 1 — Provision 5 DigitalOcean Droplets

Create **5 separate Droplets** — one per domain:

| Droplet | Domain | Collection |
|---------|--------|-----------|
| Droplet A | Students | `university.academic.students` |
| Droplet B | Teachers | `university.academic.teachers` |
| Droplet C | Courses | `university.academic.courses` |
| Droplet D | Enrollments | `university.academic.enrollments` |
| Droplet E | Classes | `university.academic.classes` |

Recommended specs:
- **Image**: Ubuntu 22.04 LTS
- **Size**: 2 vCPU / 4 GB RAM (each node only serves one collection)
- **Firewall**: open ports **8091** (Management), **8093** (N1QL/Query), and **11210** (KV) from your Next.js server's IP only

### Install Couchbase Community Edition on each Droplet

SSH into each Droplet and run:

```bash
# 1. Download the meta package
curl -O https://packages.couchbase.com/releases/couchbase-release/couchbase-release-1.0-noarch.deb

# 2. Install the meta package (adds the Couchbase apt repository)
sudo apt install ./couchbase-release-1.0-noarch.deb

# 3. Reload the local package database
sudo apt-get update

# 4. Install Couchbase Server Community Edition (latest)
sudo apt-get install -y couchbase-server-community
```

Once installation completes, Couchbase Server starts automatically. Verify it is running:

```bash
sudo systemctl status couchbase-server
```

Then open `http://DROPLET_IP:8091` in your browser to confirm the Web Console is accessible.

Repeat on all 5 Droplets.

---

## 2 — Initialize Each Node (standalone, no clustering)

On **each** Droplet, open `http://DROPLET_IP:8091` in your browser:

1. Click **Setup New Cluster**.
2. Set:
   - **Cluster name**: `university-students` (or the relevant domain name — doesn't matter, each is standalone)
   - **Username**: `Administrator`
   - **Password**: use the same password on all 5 nodes (matches `COUCHBASE_PASSWORD` in `.env.local`)
3. Complete the wizard with defaults.

> **Do not join these nodes together.** Each is a completely independent single-node instance.

---

## 3 — Create Bucket, Scope, and Collection on Each Node

Repeat the following on **each** of the 5 Droplets, substituting `<COLLECTION>` with the domain name (`students`, `teachers`, `courses`, `enrollments`, or `classes`):

### Via the Web UI

1. **Buckets → Add Bucket**: name `university`, RAM Quota ≥ 512 MB, replicas 0 (single node).
2. **Scopes & Collections** inside `university` → **Add Scope**: `academic`.
3. Inside `academic` → **Add Collection**: `<COLLECTION>`.

### Via CLI (run from inside the Droplet)

```bash
CB="couchbase-cli -c 127.0.0.1 -u Administrator -p Administrator123!"
$CB bucket-create --bucket university --bucket-type couchbase \
    --bucket-ramsize 512 --bucket-replica 0
$CB collection-manage --bucket university --create-scope academic
$CB collection-manage --bucket university --create-collection "academic.<COLLECTION>"
```

---

## 4 — Environment Config

Copy the example file and fill in each Droplet's public IP:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NODE_STUDENTS_IP=YOUR_STUDENTS_DROPLET_IP
NODE_TEACHERS_IP=YOUR_TEACHERS_DROPLET_IP
NODE_COURSES_IP=YOUR_COURSES_DROPLET_IP
NODE_ENROLLMENTS_IP=YOUR_ENROLLMENTS_DROPLET_IP
NODE_CLASSES_IP=YOUR_CLASSES_DROPLET_IP
COUCHBASE_USERNAME=Administrator
COUCHBASE_PASSWORD=your_password_here
```

---

## 5 — Install Dependencies

```bash
npm install
```

---

## 6 — Create Indexes

```bash
npm run setup-indexes
```

This creates primary indexes and optimised secondary indexes on every collection. Safe to re-run.

---

## 7 — Seed Sample Data

```bash
npm run seed
```

Inserts 5 documents into each collection (students, teachers, courses, enrollments, classes) using realistic fake data.

---

## 8 — Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The **Dashboard** page shows a live cluster topology map (polling `/api/health` every 10 seconds) with per-node status and latency.

---

## Fault Tolerance

### Domain-level isolation

Because each domain runs on an independent Couchbase instance:

- A crash or restart on the `students` node **does not affect** `teachers`, `courses`, or any other domain.
- The health dashboard at `/api/health` shows per-domain status and latency independently.
- Cross-domain endpoints (`GET /api/enrollments/:id`, `GET /api/classes/:id`) fan out to multiple nodes in parallel. If one domain is unreachable the API still returns all the data it can.

### Collection-level error isolation (`safeCollectionFetch`)

Cross-collection API endpoints assemble a response from multiple collections in parallel.  
`lib/safeFetch.ts` wraps each individual collection fetch:

- If a document **doesn't exist** → returns `{ status: "not_found", id, collection }`.
- If a node is **temporarily unreachable** → returns `{ status: "unavailable", id, collection }`.

The caller converts each result via `resolveOrSentinel()`:

- `ok` → returns the full document.
- `unavailable` / `not_found` → returns `{ id, _collectionStatus: "unavailable" | "not_found" }`.

The UI renders a `CollectionStatusBadge` warning for any sentinel object, so **one unavailable domain never crashes the whole page**.

---

## File Structure

```
├── app/
│   ├── layout.tsx                    Root layout + nav
│   ├── page.tsx                      Dashboard — live cluster topology
│   ├── students/page.tsx             Paginated student list
│   ├── students/[id]/page.tsx        Student detail + edit + delete
│   ├── teachers/, courses/, enrollments/, classes/  (same pattern)
│   └── api/
│       ├── students/route.ts         GET (N1QL list) + POST
│       ├── students/[id]/route.ts    GET (KV) + PUT + DELETE
│       ├── teachers/, courses/       (same pattern)
│       ├── enrollments/[id]/route.ts Cross-collection: enrollment + student + course
│       ├── classes/[id]/route.ts     Cross-collection: class + course + teacher + students
│       └── health/route.ts           Per-node ping + collection probe
├── lib/
│   ├── couchbase.ts                  Cluster connection factory (cached per process)
│   ├── safeFetch.ts                  Fault-tolerant collection fetch wrapper
│   └── types.ts                      TypeScript interfaces for all documents
├── config/
│   └── cluster.ts                    Single source of truth for node IPs + cluster config
├── components/
│   ├── ClusterTopology.tsx           Live node map (polls /api/health every 10 s)
│   ├── CollectionStatusBadge.tsx     Warning UI for unavailable collections
│   ├── EntityCard.tsx                Generic document card
│   └── NavBar.tsx                    Navigation
└── scripts/
    ├── setup-indexes.ts              Creates all N1QL indexes
    └── seed.ts                       Inserts sample data
```

---

## Connection Pattern

Each API route calls `getClusterForDomain(domain)` from `lib/couchbase.ts`:

```typescript
// lib/couchbase.ts (simplified)
const connections = new Map<DomainName, couchbase.Cluster>();

export async function getClusterForDomain(domain: DomainName) {
  if (!connections.has(domain)) {
    const { ip } = DOMAIN_NODES[domain];
    const cluster = await couchbase.connect(`couchbase://${ip}`, AUTH);
    connections.set(domain, cluster);
  }
  return connections.get(domain)!;
}
```

- **First call** for a domain opens a TCP connection to that Droplet's Couchbase and caches it for the lifetime of the Node.js process.
- **Subsequent calls** reuse the cached connection — no per-request reconnect overhead.
- Each domain has a completely **independent connection** to its own server. A TCP error on one domain does not affect others.
