// lib/couchbase-sn.ts
// Shared-nothing cluster connection factory.
//
// Unlike lib/couchbase.ts (which opens 5 independent connections to 5
// independent single-node instances), this module maintains a SINGLE
// connection to the shared-nothing Couchbase cluster.
//
// The SDK negotiates cluster topology on connect: it fetches the vBucket map
// from the bootstrap node(s), then routes every subsequent KV op directly to
// whichever node currently owns that key's vBucket — no coordinator hop.
// All 5 collections in university.sharednothing.* are accessed through this
// one logical connection.

import * as couchbase from "couchbase";
import { SN_CONFIG, SN_AUTH, SnCollectionName } from "@/config/sharednothing";

let snClusterCache: couchbase.Cluster | null = null;

export async function getSnCluster(): Promise<couchbase.Cluster> {
  if (snClusterCache) return snClusterCache;

  snClusterCache = await couchbase.connect(SN_CONFIG.connectionString, {
    username: SN_AUTH.username,
    password: SN_AUTH.password,
    timeouts: {
      kvTimeout:      5_000,
      queryTimeout:   10_000,
      connectTimeout: 15_000,
    },
  });

  return snClusterCache;
}

export async function getSnCollection(
  name: SnCollectionName
): Promise<couchbase.Collection> {
  const cluster = await getSnCluster();
  return cluster
    .bucket(SN_CONFIG.bucket)
    .scope(SN_CONFIG.scope)
    .collection(SN_CONFIG.collections[name]);
}
