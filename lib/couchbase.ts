// lib/couchbase.ts
// Per-domain cluster connection factory.
//
// Each domain (students, teachers, courses, enrolments, classes) has its own
// dedicated single-node Couchbase instance on a separate Droplet.
// A separate connection is cached per domain so repeated API calls reuse the
// same established TCP connection to that node.
//
// Fault isolation: if the students Droplet goes down, calling getCollection()
// for teachers/courses/etc. is completely unaffected — they connect to
// entirely different servers.

import * as couchbase from "couchbase";
import { DOMAIN_NODES, AUTH, DomainName } from "@/config/cluster";

// One cached Cluster connection per domain
const connections = new Map<DomainName, couchbase.Cluster>();

export async function getClusterForDomain(
  domain: DomainName
): Promise<couchbase.Cluster> {
  const cached = connections.get(domain);
  if (cached) return cached;

  const node = DOMAIN_NODES[domain];
  const cluster = await couchbase.connect(`couchbase://${node.ip}`, {
    username: AUTH.username,
    password: AUTH.password,
    timeouts: {
      kvTimeout: 5000,
      queryTimeout: 10000,
      connectTimeout: 15000,
    },
  });

  connections.set(domain, cluster);
  return cluster;
}

export async function getCollection(
  domain: DomainName
): Promise<couchbase.Collection> {
  const cluster = await getClusterForDomain(domain);
  const node = DOMAIN_NODES[domain];
  const bucket = cluster.bucket(node.bucket);
  const scope  = bucket.scope(node.scope);
  return scope.collection(node.collection);
}
