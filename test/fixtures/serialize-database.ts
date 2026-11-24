// Regenerates database.json, the serialized structure of database.sql that the converter tests load
// instead of connecting to a database. pg-structure does not guarantee its serialized format between
// versions, so run this after changing database.sql or upgrading pg-structure:
//
//   docker run -d --name pgtjs-fixture -e POSTGRES_PASSWORD=fixture123 -p 55432:5432 postgres:16
//   psql postgresql://postgres:fixture123@127.0.0.1:55432/postgres -f test/fixtures/database.sql
//   bun test/fixtures/serialize-database.ts postgresql://postgres:fixture123@127.0.0.1:55432/postgres
//   docker rm -f pgtjs-fixture
//
import { join } from "node:path";
import pgStructure from "pg-structure";

const connectionString = process.argv[2];
if (!connectionString) {
  console.error("Usage: bun test/fixtures/serialize-database.ts <postgresql connection string>");
  process.exit(1);
}

// System schemas are left out to keep the file small, the built-in column types resolve without them
//
const fixtureDatabase = await pgStructure(
  { connectionString },
  { includeSchemas: ["public", "shop"], includeSystemSchemas: false },
);

const outputPath = join(import.meta.dir, "database.json");
await Bun.write(outputPath, fixtureDatabase.serialize());
console.log(`Wrote ${outputPath}`);

//
