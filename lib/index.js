var _  = require( 'lodash' );

var emptySchema = {
  $schema:     'http://json-schema.org/draft-04/schema#',
  id:          '',
  description: '',
  properties:  {},
  required:    [],
  type:        'object'
};

var convertColumnType = function( column )
{
  var schemaProperty = {
    type: 'null'
  };

  switch( column.data_type )
  {
    case 'text':
    case '"char"':
    case 'uuid':
    {
      schemaProperty.type   = 'string';
    } break;

    case 'timestamp with time zone':
    case 'timestamp':
    {
      schemaProperty.type   = 'string';
      schemaProperty.format = 'date-time';
    } break;

    case 'boolean':
    {
      schemaProperty.type = 'boolean';
    } break;

    case 'real':
    case 'float8':
    case 'int':
    case 'smallint':
    case 'bigint':
    {
      schemaProperty.type = 'number';
    } break;

    case 'json':
    case 'jsonb':
    {
      schemaProperty.type       = 'object';
      schemaProperty.properties = {};
    } break;
  }

  return schemaProperty;
}

module.exports = function( options )
{
  return new Promise( function( resolve, reject )
  {
    var PostgresSchema = require( 'pg-json-schema-export' );

    var connection = {
      user:     options.pgUser,
      password: options.pgPassword,
      host:     options.pgHost,
      port:     options.pgPort || 5432,
      database: options.pgDatabase,
    };

    console.log( 'Fetching and parsing tables...' );
    PostgresSchema.toJSON( connection, options.pgSchema )
    .then( function( dump )
    {
      // Format the tables and views into JSON schema's
      //
      console.log( 'Creating schemas...' );
      var schemas = [];

      _.each( dump.tables, function( table, tableName )
      {
        var schema = {
          $schema:     'http://json-schema.org/draft-04/schema#',
          id:          options.baseUrl + tableName + '.json',
          description: 'Generated: ' + new Date(),
          properties:  {},
          required:    [],
          type:        'object'
        }

        _.each( table.columns, function( column )
        {
          schema.properties[ column.column_name ] = convertColumnType( column );
          schema.properties[ column.column_name ].description = column.col_description || '';

          // Add non nullable columns without a default to the required list
          //
          if ( column.is_nullable === false && column.column_default === null ) {
            schema.required.push( column.column_name );
          }
        } );

        schemas.push( schema );
      } );

      resolve( schemas );
    } )
    .catch( reject );
  } )
}
