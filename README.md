# pg-tables-to-jsonschema

[![NPM version](https://badge.fury.io/js/pg-tables-to-jsonschema.png)](http://badge.fury.io/js/pg-tables-to-jsonschema)

[![Npm Downloads](https://nodei.co/npm/pg-tables-to-jsonschema.png?downloads=true&stars=true)](https://nodei.co/npm/pg-tables-to-jsonschema.png?downloads=true&stars=true)

A command-line utility and module to turn postgresql tables into JSON Schemas. Uses [pg-structure](https://www.pg-structure.com) for the table to json conversion.

I wrote this module because I have a set of REST-like APIs using JSON Schema for their input and output validation. The tables provide the low level data interchange formats I use throughout my code. So pairing this with my other [jsonschema-to-typings](https://www.npmjs.com/package/jsonschema-to-typings) utility gives me both code completion and hinting alongside jsonschema based validation.

DISCLAIMER: I wrote this module to fit my specific project needs. I may have missed a few column types. Also complex types like geo-spatial data have not been added. Feel free to fork or add pull requests for anything you are missing

## Requirements

- Node.js 22 or later, or Bun
- The module is published as an ES module. Node.js 22.12 and later can also `require()` it

## Command-line usage

```bash
pgtables2jsonschema --pg-host localhost --pg-user admin --pg-password secret --pg-database my-db --pg-schema my_schema -b 'http://yourhost/schema/' -o test/
```

Calling with -h will provide you with all the possible options:

```bash
Usage: pgtables2jsonschema [options]

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
  -h, --help                    display help for command
```

You can find an [example configuration](example-config.json) in this repository.
If neither the configuration file nor the options contain a password you will be prompted to enter it.
Progress is reported on STDERR, so STDOUT only contains the schemas.

## Code usage

You can use the schema converter module as follows:

```typescript
import { SchemaConverter } from "pg-tables-to-jsonschema";

// Schemas is an array of json-schema objects
//
const schemas = await new SchemaConverter({
  pg: {
    host: "localhost",
    port: 5432,
    user: "admin",
    password: "secret",
    database: "db_name",
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
    outDir: "dist/schema",
  },
  // Disables the progress messages on STDERR
  silent: true,
}).convert();
```

## Development

```bash
# Install dependencies
bun install

# Convert using your own configuration file
bun run src/cli.ts -c my-config.json
```

### Testing

```bash
bun run test
```

Every test run reports coverage and fails when a source file drops below 90% of its lines or functions, see `bunfig.toml`.
The tests do not need a database. They load the fixture database from `test/fixtures/database.json`, the serialized structure of `test/fixtures/database.sql`.
The converted schemas are compared to the snapshots in `test/__snapshots__`. Review a snapshot change like a code change, then update the snapshots with `bun test --update-snapshots`.
After changing `database.sql` or upgrading pg-structure, regenerate `database.json` as described in `test/fixtures/serialize-database.ts`.

### Technology stack

- bun
- typescript
- pg-structure

### Branch strategy and protection

The `master` branch has protection enabled against direct pushes.
All changes need to be done through a reviewed pull request.

The protection comes from the organization rulesets, enabled by this repository's custom properties:

- `conventional-pr-title`: requires the `pull-request-title / conventional` check from `pull-request-title.yml`
- `reviewer-approval-required`: requires an approving review and squash merges
- `supply-chain-gates`: requires the `supply-chain / secrets`, `licences`, `code` and `quarantine` checks from `compliance.yml`

### Supply chain

- `.npmrc` and `bunfig.toml` refuse package versions published less than 7 days ago (package quarantine)
- Pull requests run the shared [supply-chain gates](https://github.com/SpringTree/springtree-ci-workflows) (secrets, licences, code and package quarantine) from `compliance.yml`
- Pull request titles are checked as conventional commits by the shared title check in `pull-request-title.yml`
- GitHub Actions are pinned by commit SHA

## Deploying

Releases are fully handled by GitHub Actions; never publish from a laptop.

1. Squash merge pull requests into `master`. The pull request title becomes the commit and must be a [conventional commit](https://www.conventionalcommits.org), checked by `pull-request-title.yml`
2. [release-please](https://github.com/googleapis/release-please-action) opens or updates a release pull request with the version bump and changelog
3. Merging the release pull request creates the tag and GitHub release, and the release workflow publishes to npm using [trusted publishing](https://docs.npmjs.com/trusted-publishers)

One-time setup:

- GitHub: an `npm-publish` environment that only the `master` branch may deploy to (Settings → Environments → Deployment branches). Create it before the first release: GitHub creates a missing environment without that restriction
- npm: trusted publisher for this repository, `release.yml` and the `npm-publish` environment
- GitHub: the organization's release GitHub App with contents, pull requests and issues write access on this repository; its client id as the `RELEASE_APP_CLIENT_ID` variable and its private key as the `RELEASE_APP_PRIVATE_KEY` secret (both shared from the organization)

## License

ISC
