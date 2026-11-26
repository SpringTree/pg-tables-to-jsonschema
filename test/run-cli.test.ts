import { afterAll, afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { JSONSchema7 } from "json-schema";
import { version } from "../package.json";
import * as promptPasswordModule from "../src/prompt-password.js";
import { runCli } from "../src/run-cli.js";
import { connectToDatabase } from "./helpers/fixture-database";

const connectionArguments = [
  "--pg-host",
  "localhost",
  "--pg-database",
  "fixture",
  "--pg-user",
  "postgres",
  "--pg-password",
  "fixture-secret",
];

const consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
const consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});

let temporaryFolder: string;

beforeEach(async () => {
  temporaryFolder ??= await mkdtemp(join(tmpdir(), "pg-tables-to-jsonschema-"));
  connectToDatabase.mockClear();
  consoleLogSpy.mockClear();
  consoleErrorSpy.mockClear();
  consoleWarnSpy.mockClear();
});

afterEach(() => {
  promptPasswordSpy?.mockRestore();
});

afterAll(async () => {
  await rm(temporaryFolder, { recursive: true, force: true });
});

let promptPasswordSpy: ReturnType<typeof spyOn<typeof promptPasswordModule, "promptPassword">>;

async function writeConfigFile(configuration: object) {
  const configPath = join(temporaryFolder, "config.json");
  await writeFile(configPath, JSON.stringify(configuration));
  return configPath;
}

function printedOutput() {
  return consoleLogSpy.mock.calls[0]?.[0] as string;
}

test("successfully print the version", async () => {
  expect(await runCli(["--version"])).toBe(0);
  expect(consoleLogSpy).toHaveBeenCalledWith(version);
});

test("successfully print the help", async () => {
  expect(await runCli(["--help"])).toBe(0);
  expect(printedOutput()).toStartWith("Usage: pgtables2jsonschema [options]");
});

test("successfully print the help when no options are given", async () => {
  expect(await runCli([])).toBe(0);
  expect(printedOutput()).toStartWith("Usage: pgtables2jsonschema [options]");
});

test("successfully print the schemas as JSON when no output folder is given", async () => {
  expect(await runCli([...connectionArguments, "--pg-schema", "shop"])).toBe(0);

  const printedSchemas = JSON.parse(printedOutput()) as JSONSchema7[];
  expect(printedSchemas.map((schema) => schema.title)).toEqual([
    "sales_order",
    "paid_orders",
    "order_totals",
  ]);
  expect(printedOutput()).toStartWith('[\n  {\n    "additionalProperties"');
});

test("successfully pass the converted command-line options to the converter", async () => {
  const exitCode = await runCli([
    ...connectionArguments,
    "--pg-port",
    "6543",
    "--pg-schema",
    "public,shop",
    "--include-tables",
    "audit_entry,sales_order",
    "--exclude-tables",
    "sales_order",
    "--base-url",
    "http://example.com/schema",
    "--additional-properties",
    "--indent",
    "4",
    "--desc",
    "Fixture",
  ]);

  expect(exitCode).toBe(0);
  expect(connectToDatabase).toHaveBeenCalledWith(
    {
      host: "localhost",
      database: "fixture",
      port: 6543,
      user: "postgres",
      password: "fixture-secret",
    },
    { includeSchemas: ["public", "shop"], includeSystemSchemas: true },
  );
  const printedSchemas = JSON.parse(printedOutput()) as JSONSchema7[];
  expect(printedSchemas).toHaveLength(1);
  expect(printedSchemas[0]).toMatchObject({
    $id: "http://example.com/schema/public/audit_entry.json",
    additionalProperties: true,
    description: "Fixture",
  });
  expect(printedOutput()).toStartWith('[\n    {\n        "additionalProperties"');
});

test("successfully print a single schema unwrapped when unwrap is given", async () => {
  expect(
    await runCli([...connectionArguments, "--include-tables", "audit_entry", "--unwrap"]),
  ).toBe(0);

  expect((JSON.parse(printedOutput()) as JSONSchema7).title).toBe("audit_entry");
});

test("successfully print an array when unwrap is given and more schemas are converted", async () => {
  expect(await runCli([...connectionArguments, "--pg-schema", "shop", "--unwrap"])).toBe(0);

  expect(JSON.parse(printedOutput())).toBeArrayOfSize(3);
});

test("successfully print nothing when no schemas are converted", async () => {
  expect(await runCli([...connectionArguments, "--include-tables", "not_a_table"])).toBe(0);

  expect(consoleLogSpy).not.toHaveBeenCalled();
});

test("successfully write the schemas to the output folder", async () => {
  const outputFolder = join(temporaryFolder, "output");

  expect(await runCli([...connectionArguments, "--out", outputFolder])).toBe(0);
  expect(consoleLogSpy).not.toHaveBeenCalled();
  const fileContents = await readFile(join(outputFolder, "public", "audit_entry.json"), "utf8");
  expect((JSON.parse(fileContents) as JSONSchema7).title).toBe("audit_entry");
});

test("successfully override the configuration file values with command-line options", async () => {
  const configPath = await writeConfigFile({
    pg: {
      host: "file-host",
      database: "file-db",
      port: 5433,
      user: "file-user",
      password: "file-secret",
    },
    input: { schemas: ["shop"] },
    output: {},
  });

  expect(await runCli(["--config", configPath, "--pg-host", "cli-host"])).toBe(0);
  expect(connectToDatabase).toHaveBeenCalledWith(
    {
      host: "cli-host",
      database: "file-db",
      port: 5433,
      user: "file-user",
      password: "file-secret",
    },
    { includeSchemas: ["shop"], includeSystemSchemas: true },
  );
});

test("successfully prompt for the password when none is given", async () => {
  promptPasswordSpy = spyOn(promptPasswordModule, "promptPassword").mockResolvedValue(
    "prompted-secret",
  );

  expect(
    await runCli(["--pg-host", "localhost", "--pg-database", "fixture", "--pg-user", "postgres"]),
  ).toBe(0);
  expect(promptPasswordSpy).toHaveBeenCalledWith("Password? ", process.stdin, process.stderr);
  expect(connectToDatabase).toHaveBeenCalledWith(
    {
      host: "localhost",
      database: "fixture",
      port: undefined,
      user: "postgres",
      password: "prompted-secret",
    },
    { includeSchemas: ["public"], includeSystemSchemas: true },
  );
});

test("fail running when the password prompt is aborted", async () => {
  promptPasswordSpy = spyOn(promptPasswordModule, "promptPassword").mockRejectedValue(
    new promptPasswordModule.PromptAbortedError(),
  );

  expect(await runCli(["--pg-host", "localhost"])).toBe(130);
  expect(connectToDatabase).not.toHaveBeenCalled();
});

test("fail running when the password prompt fails", async () => {
  promptPasswordSpy = spyOn(promptPasswordModule, "promptPassword").mockRejectedValue(
    new Error("stdin closed"),
  );

  expect(runCli(["--pg-host", "localhost"])).rejects.toThrow("stdin closed");
});

test("fail running when an option is unknown", async () => {
  expect(await runCli(["--unknown"])).toBe(1);
  expect(consoleErrorSpy.mock.calls[0]?.[0]).toStartWith("Unknown option '--unknown'");
});

test("fail running when the configuration file cannot be read", async () => {
  const missingPath = join(temporaryFolder, "missing-%s.json");

  expect(await runCli(["--config", missingPath])).toBe(1);
  expect(consoleErrorSpy.mock.calls[0]?.slice(0, 2)).toEqual([
    "Failed to read configuration file at %s:",
    missingPath,
  ]);
});

test("fail running when the configuration is incomplete", async () => {
  expect(await runCli(["--pg-host", "localhost", "--pg-password", "secret"])).toBe(-1);
  expect(consoleErrorSpy.mock.calls[0]?.[0]).toEqual(new Error("Missing PGSQL config"));
  expect(connectToDatabase).not.toHaveBeenCalled();
});

test("fail running when the conversion fails", async () => {
  connectToDatabase.mockRejectedValueOnce(new Error("connection refused"));

  expect(await runCli(connectionArguments)).toBe(-1);
  expect(consoleErrorSpy.mock.calls[0]?.[0]).toEqual(new Error("connection refused"));
});

//
