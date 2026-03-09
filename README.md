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

### Install Couchbase on each Droplet

SSH into each Droplet and run:

```bash
curl -o couchbase-release.deb \
  https://packages.couchbase.com/releases/couchbase-release/couchbase-release-1.0-amd64.deb
dpkg -i couchbase-release.deb
apt-get update && apt-get install -y couchbase-server
systemctl enable couchbase-server && systemctl start couchbase-server
```

Repeat on all 5 Droplets.

---

## 2 — Form the Cluster

### Initialize the first node (Node 1)

Open `http://DROPLET_1_IP:8091` in your browser.

1. Click **Setup New Cluster**.
2. Set:
   - **Cluster name**: `university-cluster`
   - **Username**: `Administrator`
   - **Password**: choose a secure password
3. Accept the terms and click **Finish with Defaults** (or configure RAM quotas manually — set ≥512 MB for Data service).

### Add the remaining nodes (Nodes 2–5)

Still logged in on **Node 1's UI**:

1. Go to **Servers → Add Server**.
2. Enter `DROPLET_2_IP` (no port needed).
3. Enter the `Administrator` credentials.
4. Enable the services you want on this node: **Data**, **Query**, **Index** (enable all three on every node for full redundancy).
5. Click **Add Server**.
6. Repeat for nodes 3, 4, and 5.

After all 5 nodes appear in the list:

1. Click **Rebalance**.
2. Wait for rebalancing to complete — vBuckets are distributed across all nodes automatically.

---

## 3 — Create Bucket, Scope, and Collections

### Via the Web UI (easiest)

1. Go to **Buckets → Add Bucket**.
   - Name: `university`
   - Type: `Couchbase`
   - RAM Quota: at least 1 024 MB
   - Replicas: **2** (data survives 2 simultaneous node failures)
2. Click **Add Bucket**.

3. Go to **Scopes & Collections** inside the `university` bucket.
4. Click **Add Scope** → name it `academic`.
5. Inside `academic`, click **Add Collection** five times:
   - `students`
   - `teachers`
   - `courses`
   - `enrollments`
   - `classes`

### Via CLI (alternative)

```bash
# Run from any node or any machine with couchbase-cli installed
CB="couchbase-cli -c DROPLET_1_IP -u Administrator -p YOUR_PASSWORD"

$CB bucket-create --bucket university --bucket-type couchbase \
    --bucket-ramsize 1024 --bucket-replica 2

$CB collection-manage --bucket university --create-scope academic

for c in students teachers courses enrollments classes; do
  $CB collection-manage --bucket university \
      --create-collection "academic.$c"
done
```

---

## 4 — Environment Config

Copy the example file and fill in your Droplet IPs:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NODE_1_IP=YOUR_DROPLET_1_IP
NODE_2_IP=YOUR_DROPLET_2_IP
NODE_3_IP=YOUR_DROPLET_3_IP
NODE_4_IP=YOUR_DROPLET_4_IP
NODE_5_IP=YOUR_DROPLET_5_IP
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

### Node failure and vBucket rebalancing

When a Couchbase node goes down:

1. The surviving nodes detect the failure via the gossip protocol within a few seconds.
2. Couchbase promotes **replica vBuckets** (stored on other nodes) to become active vBuckets.
3. The client SDK receives an updated vBucket map and starts routing requests to the new owners.
4. **No application restart required** — the SDK handles failover transparently.
5. Once the failed node is repaired and rejoined, a rebalance redistributes vBuckets evenly again.

With **2 replicas** configured, the cluster can survive **2 simultaneous node failures** out of 5.

### Collection-level error isolation (`safeCollectionFetch`)

Cross-collection API endpoints (e.g. `GET /api/classes/:id`) assemble a response from multiple collections in parallel.  
`lib/safeFetch.ts` wraps each individual collection fetch:

- If a document **doesn't exist** → returns `{ status: "not_found", id, collection }`.
- If a collection is **temporarily unreachable** (rebalancing, node failure) → returns `{ status: "unavailable", id, collection }`.

The caller (`api/classes/[id]/route.ts`) converts each result via `resolveOrSentinel()`:

- `ok` → returns the full document.
- `unavailable` / `not_found` → returns `{ id, _collectionStatus: "unavailable" | "not_found" }`.

The UI renders a `CollectionStatusBadge` warning for any sentinel object, so **one unavailable collection never crashes the whole page**.

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

## Connection String Internals

The SDK connection string:

```
couchbase://NODE_1_IP,NODE_2_IP,NODE_3_IP,NODE_4_IP,NODE_5_IP
```

- On first connect, the SDK contacts **any listed node** and requests the **cluster map** (JSON document describing which node owns which vBucket).
- For every subsequent KV operation the SDK hashes the document key to a vBucket number, looks up the owning node in the cluster map, and **opens a direct TCP connection to that node** — no hop through Node 1.
- If a node goes offline, the SDK receives a `NOT_MY_VBUCKET` error and re-fetches the cluster map to route to the new owner.

This is the core of shared-nothing: the coordinator has been replaced by the client-side routing table.
