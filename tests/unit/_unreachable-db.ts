// Imported first by tests that load modules using the Prisma client, which
// wants a URL at import time. Nothing listens on port 1, so every query
// fails, which is also the database outage some tests need.
process.env.DATABASE_URL ??= "postgresql://x:x@127.0.0.1:1/x";
