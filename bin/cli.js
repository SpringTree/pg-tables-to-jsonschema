#!/usr/bin/env node
// Setup global application root
//
var path = require( 'path' );
global.appRoot = path.resolve( __dirname );

// Collect command-line options and arguments
//
var program = require( 'commander' );

program
  .version( '0.0.1' )
  .usage( '[options]' )
  .option( '--pg-host <value>',     'The postgresql host to connect to' )
  .option( '--pg-port <n>',         'The postgresql host to connect to. Defaults to 5432' )
  .option( '--pg-database <value>', 'The postgresql database to connect to' )
  .option( '--pg-user <value>',     'The postgresql user to login with' )
  .option( '--pg-password <value>', 'The postgresql password to login with' )
  .option( '--pg-schema <value>',   'The postgresql schema to convert' )
  .option( '-i, --indent [size]',   'The indent size in spaces. Default: 2' )
  .option( '-o, --out [file]',      'Output folder. Default output is to STDOUT' )
  .option( '-b, --base-url [url]',  'The optional base url for the schema id' )

  .parse( process.argv );

// Check required PGSQL configuration
//
if ( !program.pgHost || !program.pgDatabase || !program.pgUser ) {
  console.error( 'Missing PGSQL config' );
  program.help();
}

if ( !program.pgSchema ) {
  console.error( 'Missing PGSQL schema to convert' );
  program.help();
}

program.indent  = program.indent || 2;
program.baseUrl = program.baseUrl || '';
if ( program.baseUrl.substr( -1 ) !== '/' ) {
  program.baseUrl += '/';
}

var fs        = require( 'fs'              );
var converter = require( '../lib/index'    );
var _         = require( 'lodash'          );
var path      = require( 'path'            );

converter( program )
.then( function( schemas )
{
  // Output the resulting schemas either to console or file
  //
  if ( program.out )
  {
    console.log( 'Writing schema files...' );
    _.each( schemas, function( schema, index )
    {
      let filename = path.join( program.out, _.last( schema.id.split( '/' ) ) );
      fs.writeFileSync( filename, JSON.stringify( schema, null, _.padStart( '', program.indent, ' ' ) ) )
      console.log( 'File created: ' + filename );
    } )
    console.log( 'All done' );
    process.exit();
  }
  else
  {
    console.log( JSON.stringify( schemas, null, _.padStart( '', program.indent, ' ' ) ) );
    process.exit();
  }
} )
.catch( function( error )
{
  console.error( 'ERROR: Conversion failed', error );
  process.exit( -1 );
} );
