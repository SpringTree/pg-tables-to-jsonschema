import { promises, constants } from 'fs';
import { join } from 'path';
import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import jsonfile from 'jsonfile';
import pgStructure, { Column, Entity, Schema } from 'pg-structure';
import { IConfiguration } from './config';

export class SchemaConverter {

  /**
   * Creates an instance of SchemaConverter
   *
   * @param {IConfiguration} config The configuration for the database, input and output
   */
  constructor( private config: IConfiguration ) {
  }

  /**
   * This helper method will check if the provided configuration is usable
   *
   * @returns {Promise<undefined>}
   */
  public async checkConfiguration(): Promise<undefined> {
    if ( !this.config ) {
      throw new Error('No configuration supplied');
    }

    if ( !this.config.pg?.host || !this.config.pg?.database || !this.config.pg?.user ) {
      throw new Error( 'Missing PGSQL config' );
    }

    if ( this.config.output?.outDir ) {
      // Check the output folder is writeable
      //
      try {
        await promises.access(this.config.output.outDir, constants.W_OK );
      } catch (err) {
        console.error(err);
        throw new Error(`Cannot write to ${this.config.output.outDir}`)
      }
    }

    return;
  }

  /**
   * Perform the actual conversion process and output generated schemas
   * If an `outDir` is configured we will write to file instead.
   * This would be preferred for memory intensive conversion with many or very
   * large schemas
   *
   * @returns {(Promise<JSONSchema7[]>)}
   */
  public async convert(): Promise<JSONSchema7[]> {
    // Ensure configuration is sane first
    //
    await this.checkConfiguration();

    // Connect to the database using pgStructure
    // Will throw on error
    //
    console.warn('Connecting to database...');
    const dbSchemas = this.config.input?.schemas || ['public'];
    const db = await pgStructure(
      {
        database: this.config.pg.database,
        host: this.config.pg.host,
        port: this.config.pg.port,
        user: this.config.pg.user,
        password: this.config.pg.password,
      },
      {
        includeSchemas: dbSchemas,
        includeSystemSchemas: true,
      },
    )

    // Prepare the inclusion and exclusion lists
    //
    const includedEntities = this.config.input?.include || [];
    const excludedEntities = this.config.input?.exclude || [];

    // Prepare some output settings
    //
    const outputFolder = this.config.output?.outDir;
    const indentSpaces = this.config.output?.indentSpaces === undefined ? 2 : this.config.output.indentSpaces;
    const defaultDescription = this.config.output?.defaultDescription || `${new Date()}`;
    const additionalProperties = this.config.output?.additionalProperties === true;
    const baseUrl = (this.config.output?.baseUrl || '').replace(/\/$/, '');

    const outputSchemas: JSONSchema7[] = [];

    // Iterate all the schemas
    //
    for (const dbSchema of dbSchemas) {
      console.warn(`Processing schema ${dbSchema}`);
      const schema = db.get(dbSchema) as Schema;

      // Process all the tables in the schema
      //
      for (const table of schema.tables) {
        const tableName = table.name;

        // Check if the entity is included and/or excluded
        //
        if (
          excludedEntities.indexOf(tableName) === -1 &&
          (includedEntities.length === 0 || includedEntities.indexOf(tableName) !== -1)
        ) {
          console.warn(`Processing table ${tableName}`);
          const jsonSchema = await this.convertEntity( {
            additionalProperties,
            baseUrl,
            defaultDescription,
            indentSpaces,
            outputFolder,
            entity: table,
          });
          if (!outputFolder) {
            outputSchemas.push(jsonSchema);
          }
        } else {
          console.warn(`Skipping excluded table ${tableName}`);
        }
      }

      // Process all the views in the schema
      //
      for (const view of schema.views) {
        const viewName = view.name

        // Check if the entity is included and/or excluded
        //
        if (
          excludedEntities.indexOf(viewName) === -1 &&
          (includedEntities.length === 0 || includedEntities.indexOf(viewName) !== -1)
        ) {
          console.warn(`Processing view ${viewName}`);
          const jsonSchema = await this.convertEntity( {
            additionalProperties,
            baseUrl,
            defaultDescription,
            indentSpaces,
            outputFolder,
            entity: view,
          });
          if (!outputFolder) {
            outputSchemas.push(jsonSchema);
          }
        }
      }

      // Process all the materialized views in the schema
      //
      for (const view of schema.materializedViews) {
        const viewName = view.name

        // Check if the entity is included and/or excluded
        //
        if (
          excludedEntities.indexOf(viewName) === -1 &&
          (includedEntities.length === 0 || includedEntities.indexOf(viewName) !== -1)
        ) {
          console.warn(`Processing materialized view ${viewName}`);
          const jsonSchema = await this.convertEntity( {
            additionalProperties,
            baseUrl,
            defaultDescription,
            indentSpaces,
            outputFolder,
            entity: view,
          });
          if (!outputFolder) {
            outputSchemas.push(jsonSchema);
          }
        }
      }
    }

    return outputSchemas;
  }

  /**
   * Helper method that converts an Entity to a JSON Schema
   *
   * @private
   * @param {{
   *       additionalProperties: boolean,
   *       baseUrl: string,
   *       defaultDescription: string,
   *       indentSpaces: number,
   *       outputFolder?: string,
   *       entity: Entity,
   *     }} {
   *       additionalProperties,
   *       baseUrl,
   *       defaultDescription,
   *       indentSpaces,
   *       outputFolder,
   *       entity,
   *     }
   * @returns
   */
  private async convertEntity(
    {
      additionalProperties,
      baseUrl,
      defaultDescription,
      indentSpaces,
      outputFolder,
      entity,
    }: {
      additionalProperties: boolean,
      baseUrl: string,
      defaultDescription: string,
      indentSpaces: number,
      outputFolder?: string,
      entity: Entity,
    }
  ) {
    const entityName = entity.name;
    const jsonSchema: JSONSchema7 = {
      additionalProperties,
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: `${baseUrl}/${entityName}.json`,
      title: entityName,
      description: entity.comment || defaultDescription,
      properties: {},
      required: [],
      type: 'object',
    };

    const columns = entity.columns;
    for (const column of columns) {
      const columnName = column.name;
      const columnType = column.type.name;

      (jsonSchema.properties as {[key: string]: JSONSchema7Definition})[columnName] = {
        ...this.convertColumnType({ column }) as Record<string, unknown>,
        description: `${column.comment || defaultDescription}. Database type: ${columnType}. Default value: ${column.default}`,
        maxLength: column.length,
      };

      // Check if the column is required
      //
      if (column.notNull && !column.default) {
        (jsonSchema.required as string[]).push(columnName);
      }
    }

    // Write to file if requested
    //
    if (outputFolder) {
      const fileName = join(outputFolder, `${entityName}.json`);
      await jsonfile.writeFile(fileName, jsonSchema, { spaces: indentSpaces });
    }

    return jsonSchema;
  }

  /**
   * Helper method to convert a postgresql column type to a json-schema type
   * and format
   *
   * @private
   * @param {{
   *       column: Column,
   *     }} {
   *       column,
   *     }
   * @returns {Partial<JSONSchema7Definition>}
   */
  private convertColumnType(
    {
      column,
    } : {
      column: Column,
    }
  ) : JSONSchema7Definition {
    const columnType = column.type.name;

    switch(columnType) {
      case 'bit':
      case 'bit varying':
      case 'varbit':
      case 'character':
      case 'character varying':
      case 'text':
      {
        return { type: 'string', maxLength: column.length };
      }

      case 'uuid':
      {
        return { type: 'string', format: 'uuid' };
      }

      case 'date':
      {
        return { type: 'string', format: 'date' };
      }

      case 'time with time zone':
      case 'time without time zone':
      {
        return { type: 'string', format: 'time' };
      }

      case 'timestamp with time zone':
      case 'timestamp without time zone':
      case 'timestamp':
      {
        return { type: 'string', format: 'date-time' };
      }

      case 'boolean':
      {
        return { type: 'boolean' };
      }

      case 'bigint':
      case 'decimal':
      case 'double precision':
      case 'float8':
      case 'int':
      case 'integer':
      case 'numeric':
      case 'real':
      case 'smallint':
      {
        return { type: 'number' };
      }

      case 'json':
      case 'jsonb':
      {
        return { type: 'object', properties: {} };
      }

      case 'interval':
      {
        return {
          oneOf: [
            {
              type:         'number',
              description:  'Duration in seconds'
            },
            {
              type:         'string',
              description:  'Descriptive duration i.e. 8 hours'
            },
            {
              type:         'object',
              description:  'Duration object',
              properties: {
                years:        { type: 'number' },
                months:       { type: 'number' },
                days:         { type: 'number' },
                hours:        { type: 'number' },
                minutes:      { type: 'number' },
                seconds:      { type: 'number' },
                milliseconds: { type: 'number' }
              }
            },
          ]
        }
      }

      default:
      {
        console.warn(`Unsupported column type: ${columnType}. Defaulting to null` );
        return { type: 'null' };
      }
    }
  }
}
