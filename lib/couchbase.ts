// lib/couchbase.ts
// Cluster connection factory.
//
// The SDK connection string lists all 5 node IPs separated by commas.
// On first connect the SDK performs topology discovery and learns the full
// cluster map (which vBuckets live on which node).  After that every KV
// operation is routed directly to the correct node without a coordinator —
// this is the shared-nothing behaviour.
//
// The module-level `clusterConnection` caches one Cluster object per process
// so that repeated API calls reuse the same established connections.

import * as couchbase from "couchbase";
import { CLUSTER_CONFIG, CollectionName } from "@/config/cluster";

let clusterConnection: couchbase.Cluster | null = null;

export async function getCluster(): Promise<couchbase.Cluster> {
  if (clusterConnection) return clusterConnection;

  // Multi-node connection string — SDK auto-discovers the rest of the topology
  const connectionString = `couchbase://${CLUSTER_CONFIG.bootstrapNodes.join(",")}`;

  clusterConnection = await couchbase.connect(connectionString, {
    username: CLUSTER_CONFIG.auth.username,
    password: CLUSTER_CONFIG.auth.password,
    timeouts: {
      kvTimeout: 5000,      // Key-Value operations (direct node routing)
      queryTimeout: 10000,  // N1QL queries (may fan-out across nodes)
      connectTimeout: 15000,
    },
  });

  return clusterConnection;
}

export async function getCollection(
  collectionName: CollectionName
): Promise<couchbase.Collection> {
  const cluster = await getCluster();
  const bucket = cluster.bucket(CLUSTER_CONFIG.bucket);
  const scope = bucket.scope(CLUSTER_CONFIG.scope);
  return scope.collection(CLUSTER_CONFIG.collections[collectionName]);
}

/** Convenience: returns the cluster's bucket scope for raw N1QL queries */
export async function getScope(): Promise<couchbase.Scope> {
  const cluster = await getCluster();
  const bucket = cluster.bucket(CLUSTER_CONFIG.bucket);
  return bucket.scope(CLUSTER_CONFIG.scope);
}
