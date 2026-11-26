import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { version } from "../package.json";
import type { IConfiguration } from "./config/index.js";
import { mergeConfigurations } from "./config/merge.js";
import { SchemaConverter } from "./index.js";
import { PromptAbortedError, promptPassword } from "./prompt-password.js";

const helpText = `Usage: pgtables2jsonschema [options]

Options:
  -V, --version                 output the version number
  -c, --config <value>          Path to configuration file. Additional parameters override config values
  --pg-host <value>             The postgresql host to connect to
  --pg-port <n>                 The postgresql port to connect to. Defaults to 5432
  --pg-database <value>         The postgresql database to connect to
  --pg-user <value>             The postgresql user to login with
  --pg-password <value>         The postgresql password to login with
  --pg-schema <value>           Comma separated list of schemas to convert. Default: public
  -i, --indent <size>           The indent size in spaces. Default: 2
  -o, --out <folder>            Output folder. Default output is to STDOUT. A sub-folder will be created per schema
  -b, --base-url <url>          The optional base url for the schema id
  -p, --additional-properties   Allow additional properties on final schema. Default: false
  -t, --include-tables <value>  Comma separated list of tables to process. Default is all tables found
  -e, --exclude-tables <value>  Comma separated list of tables to exclude. Default is to not exclude any
  -u, --unwrap                  Unwraps the schema if only 1 is returned
  -d, --desc <value>            Default description when database lacks one. Defaults to current date/time
  -h, --help                    display help for command`;

// Parses the command-line arguments. parseArgs is built into Node.js and Bun and throws on unknown options
//
function parseCliOptions(cliArguments: string[]) {
  return parseArgs({
    args: cliArguments,
    options: {
      "additional-properties": { type: "boolean", short: "p" },
      "base-url": { type: "string", short: "b" },
      config: { type: "string", short: "c" },
      desc: { type: "string", short: "d" },
      "exclude-tables": { type: "string", short: "e" },
      help: { type: "boolean", short: "h" },
      "include-tables": { type: "string", short: "t" },
      indent: { type: "string", short: "i" },
      out: { type: "string", short: "o" },
      "pg-database": { type: "string" },
      "pg-host": { type: "string" },
      "pg-password": { type: "string" },
      "pg-port": { type: "string" },
      "pg-schema": { type: "string" },
      "pg-user": { type: "string" },
      unwrap: { type: "boolean", short: "u" },
      version: { type: "boolean", short: "V" },
    },
  }).values;
}

// Reads a JSON configuration file. Uses node:fs so the published CLI runs under both Node.js and Bun
//
async function readConfigFile(filePath: string): Promise<Partial<IConfiguration>> {
  const fileContents = await readFile(filePath, "utf8");
  return JSON.parse(fileContents) as Partial<IConfiguration>;
}

// Runs the command-line utility and returns the process exit code
//
export async function runCli(cliArguments: string[]): Promise<number> {
  let options: ReturnType<typeof parseCliOptions>;
  try {
    options = parseCliOptions(cliArguments);
  } catch (error) {
    console.error(`${(error as Error).message}\n\n${helpText}`);
    return 1;
  }

  if (options.version) {
    console.log(version);
    return 0;
  }
  if (options.help || Object.keys(options).length === 0) {
    console.log(helpText);
    return 0;
  }

  // Option values are strings, port and indent are converted to numbers.
  // Flags that are not given stay undefined, so they do not override the configuration file
  //
  const cliConfiguration: IConfiguration = {
    pg: {
      host: options["pg-host"] as string,
      database: options["pg-database"] as string,
      port: options["pg-port"] === undefined ? undefined : Number(options["pg-port"]),
      user: options["pg-user"] as string,
      password: options["pg-password"],
    },
    input: {
      schemas: options["pg-schema"]?.split(","),
      include: options["include-tables"]?.split(","),
      exclude: options["exclude-tables"]?.split(","),
    },
    output: {
      additionalProperties: options["additional-properties"],
      baseUrl: options["base-url"],
      defaultDescription: options.desc,
      indentSpaces: options.indent === undefined ? undefined : Number(options.indent),
      outDir: options.out,
      unwrap: options.unwrap,
    },
  };

  let configuration = cliConfiguration;
  if (options.config) {
    try {
      // Apply the configuration file values, overridden by CLI options
      //
      const configFromFile = await readConfigFile(options.config);
      configuration = mergeConfigurations(configFromFile, cliConfiguration);
    } catch (error) {
      // The path is an argument, not part of the format string, so a % in it is printed as is
      //
      console.error("Failed to read configuration file at %s:", options.config, error);
      return 1;
    }
  }

  // If password is not provided, prompt for it. Ctrl+c exits with 130 like a terminal interrupt.
  // The prompt is written to STDERR, so it does not end up in the schemas printed to STDOUT
  //
  if (!configuration.pg.password) {
    try {
      configuration.pg.password = await promptPassword("Password? ", process.stdin, process.stderr);
    } catch (error) {
      if (error instanceof PromptAbortedError) {
        return 130;
      }
      throw error;
    }
  }

  // Convert the schemas. With an output folder the converter writes the files,
  // otherwise the schemas are printed to STDOUT
  //
  try {
    const schemas = await new SchemaConverter(configuration).convert();
    const outputFolder = configuration.output?.outDir;

    if (!outputFolder) {
      const indentSpaces = configuration.output?.indentSpaces ?? 2;
      if (configuration.output?.unwrap && schemas.length === 1) {
        console.log(JSON.stringify(schemas[0], null, indentSpaces));
      } else if (schemas.length > 0) {
        console.log(JSON.stringify(schemas, null, indentSpaces));
      }
    }
  } catch (error) {
    console.error(error);
    console.error(
      "Suggestion: Run with --help for parameters or check supplied configuration file",
    );
    return -1;
  }

  return 0;
}

//
