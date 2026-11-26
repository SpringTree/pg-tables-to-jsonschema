import { expect, test } from "bun:test";
import type { IConfiguration } from "../src/config/index.js";
import { mergeConfigurations } from "../src/config/merge.js";

const fileConfiguration: IConfiguration = {
  pg: {
    host: "file-host",
    database: "file-db",
    port: 5433,
    user: "file-user",
    password: "file-secret",
  },
  input: { schemas: ["public"], exclude: ["file_table"] },
  output: { outDir: "file-out", additionalProperties: false },
};

const emptyCliConfiguration: IConfiguration = {
  pg: {
    host: undefined as unknown as string,
    database: undefined as unknown as string,
    user: undefined as unknown as string,
  },
  input: {},
  output: {},
};

test("successfully keep the file values when no command-line options are given", () => {
  expect(mergeConfigurations(fileConfiguration, emptyCliConfiguration)).toEqual(fileConfiguration);
});

test("successfully override the file values when command-line options are given", () => {
  const cliConfiguration: IConfiguration = {
    ...emptyCliConfiguration,
    pg: { ...emptyCliConfiguration.pg, host: "cli-host", port: 6543 },
    input: { schemas: ["cli_schema"] },
    output: { additionalProperties: true },
  };

  expect(mergeConfigurations(fileConfiguration, cliConfiguration)).toEqual({
    pg: {
      host: "cli-host",
      database: "file-db",
      port: 6543,
      user: "file-user",
      password: "file-secret",
    },
    input: { schemas: ["cli_schema"], exclude: ["file_table"] },
    output: { outDir: "file-out", additionalProperties: true },
  });
});

test("successfully merge when the file lacks a section", () => {
  const cliConfiguration: IConfiguration = {
    ...emptyCliConfiguration,
    pg: { host: "cli-host", database: "cli-db", user: "cli-user" },
  };

  expect(mergeConfigurations({}, cliConfiguration)).toEqual({
    pg: { host: "cli-host", database: "cli-db", user: "cli-user" },
    input: {},
    output: {},
  });
});

//
