#!/usr/bin/env node
import { program } from "commander";
import jsonfile from "jsonfile";
// lodash is CommonJS, Node.js only offers its default export to ES modules
//
import lodash from "lodash";
import prompts from "prompts";
import { version } from "../package.json";
import type { IConfiguration } from "./config/index.js";
import { SchemaConverter } from "./index.js";

// Global self executing function for async/await
//
void (async () => {
  // Collect command-line options and arguments
  //
  program
    .version(version)
    .usage("[options]")
    .option(
      "-c, --config <value>",
      "Path to configuration file. Additional parameters override config values",
    )
    .option("--pg-host <value>", "The postgresql host to connect to")
    .option("--pg-port <n>", "The postgresql host to connect to. Defaults to 5432")
    .option("--pg-database <value>", "The postgresql database to connect to")
    .option("--pg-user <value>", "The postgresql user to login with")
    .option("--pg-password <value>", "The postgresql password to login with")
    .option("--pg-schema <value>", "The postgresql schema to convert")
    .option("-i, --indent [size]", "The indent size in spaces. Default: 2")
    .option(
      "-o, --out [file]",
      "Output folder. Default output is to STDOUT. A sub-folder will be created per schema",
    )
    .option("-b, --base-url [url]", "The optional base url for the schema id")
    .option(
      "-p, --additional-properties",
      "Allow additional properties on final schema. Set option to allow properties. Default: false",
    )
    .option(
      "-t, --include-tables <value>",
      "Comma separated list of tables to process. Default is all tables found",
    )
    .option(
      "-e, --exclude-tables <value>",
      "Comma separated list of tables to exclude. Default is to not exclude any",
    )
    .option("-u, --unwrap", "Unwraps the schema if only 1 is returned")
    .option(
      "-d, --desc <value>",
      "Default description when database lacks one. Defaults to current date/time",
    )

    .parse(process.argv);

  const options = program.opts();

  // Build the configuration either from provided file or command line arguments
  //
  let config = {} as IConfiguration;
  if (options.config) {
    try {
      config = await jsonfile.readFile(options.config);
    } catch (err) {
      console.error(`Failed to read config file ${options.config}`, err);
      options.help();
    }
  }
  if (options.pgHost) {
    lodash.set(config, "pg.host", options.pgHost);
  }
  if (options.pgDatabase) {
    lodash.set(config, "pg.database", options.pgData);
  }
  if (options.pgPort) {
    lodash.set(config, "pg.port", options.pgPort);
  }
  if (options.pgUser) {
    lodash.set(config, "pg.user", options.pgUser);
  }

  if (options.pgSchema) {
    lodash.set(config, "input.schemas", options.pgSchema.split(","));
  }
  if (options.pgSchema) {
    lodash.set(config, "input.include", options.includeTables.split(","));
  }
  if (options.pgSchema) {
    lodash.set(config, "input.exclude", options.excludeTables.split(","));
  }

  if (options.out) {
    lodash.set(config, "output.outDir", options.out);
  }
  if (options.out) {
    lodash.set(config, "output.baseUrl", options.baseUrl);
  }
  if (options.indent) {
    lodash.set(config, "output.indent", options.indent);
  }
  if (options.desc) {
    lodash.set(config, "output.defaultDescription", options.defaultDescription);
  }
  if (options.additionalProperties) {
    lodash.set(config, "output.additionalProperties", true);
  }
  if (options.unwrap) {
    lodash.set(config, "output.unwrap", true);
  }

  if (lodash.isEmpty(config)) {
    program.help();
  }

  // If no password was supplied prompt for it
  //
  if (!config.pg?.password) {
    const response = await prompts({
      type: "password",
      name: "password",
      message: "Password?",
    });
    if (response.password) {
      lodash.set(config, "pg.password", response.password);
    }
  }

  const converter = new SchemaConverter(config);
  try {
    const schemas = await converter.convert();
    const outputFolder = config.output?.outDir;

    if (!outputFolder) {
      if (config.output?.unwrap && schemas.length === 1) {
        console.log(schemas[0]);
      } else if (schemas.length > 0) {
        const indentSpaces = options.indent === undefined ? 2 : options.indent;
        console.log(JSON.stringify(schemas, null, lodash.padStart("", indentSpaces, " ")));
      }
    }
  } catch (err) {
    console.error(err);
    console.error(
      "Suggestion: Run with --help for parameters or check supplied configuration file",
    );
    process.exit(-1);
  }
})();
