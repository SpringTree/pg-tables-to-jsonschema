# pg-tables-jsonschema

[![NPM version](https://badge.fury.io/js/pg-tables-jsonschema.png)](http://badge.fury.io/js/pg-tables-jsonschema)

[![Npm Downloads](https://nodei.co/npm/pg-tables-jsonschema.png?downloads=true&stars=true)](https://nodei.co/npm/pg-tables-jsonschema.png?downloads=true&stars=true)

A command-line utility and module to turn postgresql tables into JSON Schemas. Uses [pg-json-schema-export](https://www.npmjs.com/package/pg-json-schema-export) for the table to json conversion.

I wrote this module because I have a set of REST based backends using JSON Schema for their input and output validation. The tables provide the low level data interchange formats I use throughtout my code. So pairing this my other [jsonschema-to-typings](https://www.npmjs.com/package/jsonschema-to-typings) utility gives me both code completion and hinting alongside jsonschema based validation.

DISCLAIMER: I wrote this module to fit my specific project needs. I may have missed a few column types. Also complex types like arrays and geospatial data have not been added. Feel free to fork or add pull requests for anything you are missing

## Command-line usage

```javascript
pgtables2jsonschema --pg-host localhost --pg-user admin --pg-password secret --pg-database my-db --pg-schema my_schema -b 'http://yourhost/schema/' -o test/
```

Calling with -h will provide you with all the possible options:

```javascript
Usage: cli [options]

  Options:

    -V, --version          output the version number
    --pg-host <value>      The postgresql host to connect to
    --pg-port <n>          The postgresql host to connect to. Defaults to 5432
    --pg-database <value>  The postgresql database to connect to
    --pg-user <value>      The postgresql user to login with
    --pg-password <value>  The postgresql password to login with
    --pg-schema <value>    The postgresql schema to convert
    -i, --indent [size]    The indent size in spaces. Default: 2
    -o, --out [file]       Output folder. Default output is to STDOUT
    -b, --base-url [url]   The optional base url for the schema id
    -h, --help             output usage information
```

## Code usage

You can use the schema converter module as follows:

```javascript
var converter = require( "pg-tables-to-jsonschema" );

converter( {
    "pgHost":     "localhost"
,   "pgPort":     5432
,   "pgUser":     "admin"
,   "pgPassword": "secret"
,   "pgDatabase": "my_database"
,   "pgSchema":   "my_schema"
,   "baseUrl":    "http://yourhost/schema/"
,   "indent":     2
} )
.then( function( schemas )
{
  // Schema's is an array of json-schema objects
  //
  console.log( JSON.stringify( schemas, null, '  ' ) )
} )
.catch( function( error )
{
  console.error( 'Conversion failed', error );
} );

```
