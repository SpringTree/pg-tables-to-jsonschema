#!/usr/bin/env node
import { runCli } from "./run-cli.js";

// Command-line entry point, see run-cli.ts for the implementation
// - A failure exits right away: a failed conversion can leave the database connection open,
//   which would keep the process running
// - Success only sets the exit code, so output piped to another program is written completely
//
const exitCode = await runCli(process.argv.slice(2));
if (exitCode === 0) {
  process.exitCode = exitCode;
} else {
  process.exit(exitCode);
}

//
