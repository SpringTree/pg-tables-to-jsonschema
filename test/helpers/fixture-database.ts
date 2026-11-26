import { mock } from "bun:test";
import { join } from "node:path";
import * as pgStructureModule from "pg-structure";

// Replaces the database connection, and only that, with the fixture database.
// pg-structure's default export connects and reads the database structure. The mock returns
// the structure serialized in fixtures/database.json instead, all other exports stay real.
// Preloaded for all tests from bunfig.toml, so the mock is in place before the code under test loads
//
const serializedDatabase = await Bun.file(
  join(import.meta.dir, "../fixtures/database.json"),
).text();
export const fixtureDatabase = pgStructureModule.deserialize(serializedDatabase);

export const connectToDatabase = mock(async () => fixtureDatabase);

await mock.module("pg-structure", () => ({ ...pgStructureModule, default: connectToDatabase }));

//
