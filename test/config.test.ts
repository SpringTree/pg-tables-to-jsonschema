import { afterAll, beforeEach, expect, spyOn, test } from "bun:test";
import { chmod, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IConfiguration } from "../src/config/index.js";
import { SchemaConverter } from "../src/index.js";

const exampleConfiguration: IConfiguration = {
  pg: {
    host: "localhost",
    database: "mydb",
    user: "postgres",
    password: "secret",
  },
  input: {
    schemas: ["public", "stuff"],
    exclude: ["not_this_table"],
    include: [],
  },
  output: {
    additionalProperties: false,
    baseUrl: "http://api.localhost.com/schema/",
    defaultDescription: "Missing description",
    indentSpaces: 2,
    outDir: "",
    unwrap: false,
  },
};

// A failed write check is logged with console.error, silenced here and asserted where relevant
//
const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

const temporaryFolders: string[] = [];

beforeEach(() => {
  consoleErrorSpy.mockClear();
});

afterAll(async () => {
  for (const folder of temporaryFolders) {
    await chmod(folder, 0o700);
    await rm(folder, { recursive: true, force: true });
  }
});

async function createTemporaryFolder() {
  const folder = await mkdtemp(join(tmpdir(), "pg-tables-to-jsonschema-"));
  temporaryFolders.push(folder);
  return folder;
}

test("successfully check the configuration", async () => {
  const converter = new SchemaConverter(exampleConfiguration);

  expect(await converter.checkConfiguration()).toBeUndefined();
});

test("successfully create the output folder when it does not exist", async () => {
  const outputFolder = join(await createTemporaryFolder(), "nested", "schemas");
  const converter = new SchemaConverter({
    ...exampleConfiguration,
    output: { outDir: outputFolder },
  });

  await converter.checkConfiguration();

  expect((await stat(outputFolder)).isDirectory()).toBe(true);
});

test("fail checking the configuration when none is supplied", async () => {
  const converter = new SchemaConverter(undefined as unknown as IConfiguration);

  expect(converter.checkConfiguration()).rejects.toThrow("No configuration supplied");
});

test.each(["host", "database", "user"] as const)(
  "fail checking the configuration when the database %s is missing",
  async (missingSetting) => {
    const converter = new SchemaConverter({
      ...exampleConfiguration,
      pg: { ...exampleConfiguration.pg, [missingSetting]: undefined },
    });

    expect(converter.checkConfiguration()).rejects.toThrow("Missing PGSQL config");
  },
);

test("fail checking the configuration when the database settings are missing", async () => {
  const converter = new SchemaConverter({ output: {} } as IConfiguration);

  expect(converter.checkConfiguration()).rejects.toThrow("Missing PGSQL config");
});

test("fail checking the configuration when the output folder is not writable", async () => {
  const outputFolder = await createTemporaryFolder();
  await chmod(outputFolder, 0o500);
  const converter = new SchemaConverter({
    ...exampleConfiguration,
    output: { outDir: outputFolder },
  });

  // Awaited before asserting the log, a rejects assertion does not wait for the check to finish
  //
  const checkError = await converter.checkConfiguration().catch((error: unknown) => error);

  expect(checkError).toEqual(new Error(`Cannot write to ${outputFolder}`));
  expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
});

//
