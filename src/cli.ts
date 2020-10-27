#!/usr/bin/env node
import commander from 'commander';
import jsonfile from 'jsonfile';
import { isEmpty, padStart, set } from 'lodash';
import { resolve } from 'path';
import prompts from 'prompts';
import { SchemaConverter } from './index';
import { IConfiguration } from './config';

// Global self executing function for async/await
//
(async () => {
  const pkg = await jsonfile.readFile(resolve(__dirname, '../package.json'));

  // Collect command-line options and arguments
  //
  commander
    .version( pkg.version )
    .usage( '[options]' )
    .option( '-c, --config <value>',          'Path to configuration file. Additional parameters override config values' )
    .option( '--pg-host <value>',             'The postgresql host to connect to' )
    .option( '--pg-port <n>',                 'The postgresql host to connect to. Defaults to 5432' )
    .option( '--pg-database <value>',         'The postgresql database to connect to' )
    .option( '--pg-user <value>',             'The postgresql user to login with' )
    .option( '--pg-password <value>',         'The postgresql password to login with' )
    .option( '--pg-schema <value>',           'The postgresql schema to convert' )
    .option( '-i, --indent [size]',           'The indent size in spaces. Default: 2' )
    .option( '-o, --out [file]',              'Output folder. Default output is to STDOUT. A sub-folder will be created per schema' )
    .option( '-b, --base-url [url]',          'The optional base url for the schema id' )
    .option( '-p, --additional-properties',   'Allow additional properties on final schema. Set option to allow properties. Default: false' )
    .option( '-t, --include-tables <value>',  'Comma separated list of tables to process. Default is all tables found' )
    .option( '-e, --exclude-tables <value>',  'Comma separated list of tables to exclude. Default is to not exclude any' )
    .option( '-u, --unwrap',                  'Unwraps the schema if only 1 is returned' )
    .option( '-d, --desc <value>',            'Default description when database lacks one. Defaults to current date/time' )

    .parse( process.argv );

    // Build the configuration either from provided file or command line arguments
    //
    let config = {} as IConfiguration;
    if (commander.config) {
      try {
        config = await jsonfile.readFile(commander.config);
      } catch (err) {
        console.error(`Failed to read config file ${commander.config}`, err);
        commander.help();
      }
    }
    if(commander.pgHost) { set(config, 'pg.host', commander.pgHost); }
    if(commander.pgDatabase) { set(config, 'pg.database', commander.pgData); }
    if(commander.pgPort) { set(config, 'pg.port', commander.pgPort); }
    if(commander.pgUser) { set(config, 'pg.user', commander.pgUser); }

    if(commander.pgSchema) { set(config, 'input.schemas', commander.pgSchema.split(',')); }
    if(commander.pgSchema) { set(config, 'input.include', commander.includeTables.split(',')); }
    if(commander.pgSchema) { set(config, 'input.exclude', commander.excludeTables.split(',')); }

    if(commander.out) { set( config, 'output.outDir', commander.out); }
    if(commander.out) { set( config, 'output.baseUrl', commander.baseUrl); }
    if(commander.indent) { set( config, 'output.indent', commander.indent); }
    if(commander.desc) { set( config, 'output.defaultDescription', commander.defaultDescription); }
    if(commander.additionalProperties) { set( config, 'output.additionalProperties', true); }
    if(commander.unwrap) { set( config, 'output.unwrap', true); }

    if (isEmpty(config)) {
      commander.help();
    }

    // If no password was supplied prompt for it
    //
    if(!config.pg?.password){
      const response = await prompts({
        type: 'password',
        name: 'password',
        message: 'Password?'
      });
      if(response.password) { set(config, 'pg.password', response.password); }
    }

    const converter = new SchemaConverter(config);
    try {
      const schemas = await converter.convert();

      if (config.output?.unwrap && schemas.length === 1) {
        console.log(schemas[0]);
      } else if (schemas.length > 0) {
        const indentSpaces = commander.indent === undefined ? 2 : commander.indent;
        console.log(JSON.stringify( schemas, null, padStart( '', indentSpaces, ' ' ) ));
      }
    } catch(err) {
      console.error(err);
      console.error('Suggestion: Run with --help for parameters or check supplied configuration file')
      process.exit(-1);
    }
})();
