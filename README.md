# pg-tables-to-jsonschema

[![NPM version](https://badge.fury.io/js/pg-tables-to-jsonschema.png)](http://badge.fury.io/js/pg-tables-to-jsonschema)

[![Npm Downloads](https://nodei.co/npm/pg-tables-to-jsonschema.png?downloads=true&stars=true)](https://nodei.co/npm/pg-tables-to-jsonschema.png?downloads=true&stars=true)

A command-line utility and module to turn postgresql tables into JSON Schemas. Uses [pg-structure](https://www.pg-structure.com) for the table to json conversion.

I wrote this module because I have a set of REST-like APIs using JSON Schema for their input and output validation. The tables provide the low level data interchange formats I use throughout my code. So pairing this with my other [jsonschema-to-typings](https://www.npmjs.com/package/jsonschema-to-typings) utility gives me both code completion and hinting alongside jsonschema based validation.

DISCLAIMER: I wrote this module to fit my specific project needs. I may have missed a few column types. Also complex types like arrays and geo-spatial data have not been added. Feel free to fork or add pull requests for anything you are missing

## Command-line usage

```javascript
pgtables2jsonschema --pg-host localhost --pg-user admin --pg-password secret --pg-database my-db --pg-schema my_schema -b 'http://yourhost/schema/' -o test/
```

Calling with -h will provide you with all the possible options:

```bash
Usage: cli [options]

  Options:

    -V, --version                 output the version number
    -c, --config                  Path to configuration file. Additional parameters override config values
    --pg-host <value>             The postgresql host to connect to
    --pg-port <n>                 The postgresql host to connect to. Defaults to 5432
    --pg-database <value>         The postgresql database to connect to
    --pg-user <value>             The postgresql user to login with
    --pg-password <value>         The postgresql password to login with
    --pg-schema <value>           The postgresql schema to convert
    -i, --indent [size]           The indent size in spaces. Default: 2
    -o, --out [file]              Output folder. Default output is to STDOUT
    -b, --base-url [url]          The optional base url for the schema id
    -p, --additional-properties   Allow additional properties on final schema. Set option to allow properties. Default: false
    -t, --include-tables <value>  Comma separated list of tables to process. Default is all tables found
    -e, --exclude-tables <value>  Comma separated list of tables to exclude. Default is to not exclude any
    -u, --unwrap                  Unwraps the schema if only 1 is returned
    -h, --help                    output usage information
```

You can find an [example configuration](example-config.json) in this repository.

## Code usage

You can use the schema converter module as follows:

```javascript
var converter = require( "pg-tables-to-jsonschema" );

// Schemas is an array of json-schema objects
//
const schemas = await converter( {
  pg: {
    host: 'localhost',
    port: 5432,
    user: 'admin',
    password: 'secret'
    database: 'db_name',
  },
  input: {
    schemas: ['public', 'stuff'],
    exclude: ['not_this_table'],
    include: []
  },
  output: {
    additionalProperties: false,
    baseUrl: 'http://api.localhost.com/schema/',
    defaultDescription: 'Missing description',
    indentSpaces: 2,
    outDir: 'dist/schema',
    unwrap: false
  }
} );
```
