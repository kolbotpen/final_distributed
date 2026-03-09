/** @type {import('next').NextConfig} */
const nextConfig = {
  // couchbase is a native-addon package — tell Next.js not to bundle it
  // (moved out of `experimental` in Next.js 15+)
  serverExternalPackages: ["couchbase"],
};

module.exports = nextConfig;
