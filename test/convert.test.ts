import { afterAll, beforeEach, expect, setSystemTime, spyOn, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { JSONSchema7 } from "json-schema";
import { connectToDatabase } from "./helpers/fixture-database";
import type { IConfiguration } from "../src/config/index.js";
import { SchemaConverter } from "../src/index.js";

const pgConfiguration: IConfiguration["pg"] = {
  host: "localhost",
  database: "fixture",
  port: 5432,
  user: "postgres",
  password: "fixture-secret",
};

const fixtureConfiguration: IConfiguration = {
  pg: pgConfiguration,
  input: { schemas: ["public", "shop"] },
  output: { baseUrl: "http://example.com/schema/", defaultDescription: "Fixture" },
};

// The converter reports progress with console.warn, silenced here and asserted where relevant
//
const consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});

const temporaryFolders: string[] = [];

beforeEach(() => {
  connectToDatabase.mockClear();
  consoleWarnSpy.mockClear();
});

afterAll(async () => {
  for (const folder of temporaryFolders) {
    await rm(folder, { recursive: true, force: true });
  }
});

// Converts and returns the schemas as they are written as JSON, so properties set to undefined
// are left out like in the output files and on STDOUT
//
async function convertToJson(configuration: IConfiguration): Promise<JSONSchema7[]> {
  const schemas = await new SchemaConverter(configuration).convert();
  return JSON.parse(JSON.stringify(schemas)) as JSONSchema7[];
}

test("successfully convert all tables, views and materialized views", async () => {
  const schemas = await convertToJson(fixtureConfiguration);

  expect(schemas.map((schema) => schema.$id)).toEqual([
    "http://example.com/schema/public/audit_entry.json",
    "http://example.com/schema/public/customer_account.json",
    "http://example.com/schema/public/escape_check.json",
    "http://example.com/schema/public/HTTPRequestLog.json",
    "http://example.com/schema/shop/sales_order.json",
    "http://example.com/schema/shop/paid_orders.json",
    "http://example.com/schema/shop/order_totals.json",
  ]);
  expect(schemas).toMatchSnapshot();
});

test("successfully pass the connection settings and schemas to the database", async () => {
  await new SchemaConverter(fixtureConfiguration).convert();

  expect(connectToDatabase).toHaveBeenCalledTimes(1);
  expect(connectToDatabase).toHaveBeenCalledWith(pgConfiguration, {
    includeSchemas: ["public", "shop"],
    includeSystemSchemas: true,
  });
});

test("successfully convert the public schema when no schemas are configured", async () => {
  const schemas = await convertToJson({ pg: pgConfiguration });

  expect(connectToDatabase).toHaveBeenCalledWith(pgConfiguration, {
    includeSchemas: ["public"],
    includeSystemSchemas: true,
  });
  expect(schemas.map((schema) => schema.$id)).toEqual([
    "/public/audit_entry.json",
    "/public/customer_account.json",
    "/public/escape_check.json",
    "/public/HTTPRequestLog.json",
  ]);
});

test("successfully convert only the included entities", async () => {
  const schemas = await convertToJson({
    ...fixtureConfiguration,
    input: { schemas: ["public", "shop"], include: ["audit_entry", "paid_orders", "order_totals"] },
  });

  expect(schemas.map((schema) => schema.title)).toEqual([
    "audit_entry",
    "paid_orders",
    "order_totals",
  ]);
});

test("successfully skip the excluded entities", async () => {
  const schemas = await convertToJson({
    ...fixtureConfiguration,
    input: {
      schemas: ["public", "shop"],
      exclude: ["customer_account", "paid_orders", "order_totals"],
    },
  });

  expect(schemas.map((schema) => schema.title)).toEqual([
    "audit_entry",
    "escape_check",
    "HTTPRequestLog",
    "sales_order",
  ]);
  expect(consoleWarnSpy).toHaveBeenCalledWith("Skipping excluded table customer_account");
});

test("successfully allow additional properties when configured", async () => {
  const schemas = await convertToJson({
    ...fixtureConfiguration,
    input: { include: ["audit_entry"] },
    output: { ...fixtureConfiguration.output, additionalProperties: true },
  });

  expect(schemas[0]?.additionalProperties).toBe(true);
});

test("successfully default to the null type when a column type is unsupported", async () => {
  const schemas = await convertToJson({
    ...fixtureConfiguration,
    input: { include: ["customer_account"] },
  });

  expect(consoleWarnSpy).toHaveBeenCalledWith("Unsupported column type: inet. Defaulting to null");
  expect(schemas[0]?.properties?.["ip_address"]).toMatchObject({ type: "null" });
});

test("successfully describe with the current date and time when no default description is configured", async () => {
  setSystemTime(new Date("2026-01-02T03:04:05Z"));
  try {
    const schemas = await convertToJson({
      pg: pgConfiguration,
      input: { include: ["audit_entry"] },
    });

    expect(schemas[0]?.description).toBe(new Date("2026-01-02T03:04:05Z").toString());
  } finally {
    setSystemTime();
  }
});

test("successfully write the schema files when an output folder is configured", async () => {
  const outputFolder = await mkdtemp(join(tmpdir(), "pg-tables-to-jsonschema-"));
  temporaryFolders.push(outputFolder);

  const schemas = await convertToJson({
    ...fixtureConfiguration,
    output: { ...fixtureConfiguration.output, indentSpaces: 4, outDir: outputFolder },
  });

  for (const schema of schemas) {
    // $id is <baseUrl>/<schema>/<entity>.json, the same as the path below the output folder
    //
    const filePath = join(outputFolder, schema.$id!.replace("http://example.com/schema/", ""));
    const fileContents = await readFile(filePath, "utf8");
    expect(fileContents).toBe(`${JSON.stringify(schema, null, 4)}\n`);
  }
});

//
