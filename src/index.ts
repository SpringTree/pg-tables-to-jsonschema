import { promises, constants } from 'fs';
import { join } from 'path';
import { JSONSchema7, JSONSchema7Definition } from 'json-schema';
import jsonfile from 'jsonfile';
import pgStructure, { Entity, Schema } from 'pg-structure';
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
      },
    )

    // Prepare the inclusion and exclusion lists
    //
    const includedEntities = this.config.input?.include || [];
    const excludedEntities = this.config.input?.exclude || [];
    const filterEntities = includedEntities.length > 0 || excludedEntities.length > 0;

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
      const schema = db.get(dbSchema) as Schema;

      // Process all the tables in the schema
      //
      for (const tableName in schema.tables) {
        const entity = db.get(tableName) as Entity;

        // Check if the table is filtered
        // First check if any filter is set for performance reasons
        // A table needs to be processed if it is included or not excluded
        // We check exclusion first as a priority
        //
        if (
          filterEntities &&
          ( excludedEntities.indexOf(tableName) === -1 || includedEntities.indexOf(tableName) !== -1  )
        ) {
          const jsonSchema = await this.convertEntity( {
            additionalProperties,
            baseUrl,
            defaultDescription,
            indentSpaces,
            outputFolder,
            entity,
          });
          if (!outputFolder) {
            outputSchemas.push(jsonSchema);
          }
        }
      }

      // Process all the views in the schema
      //
      for ( const viewName in schema.views ) {
        const entity = db.get(viewName) as Entity;

        // Check if the table is filtered
        // First check if any filter is set for performance reasons
        // A table needs to be processed if it is included or not excluded
        // We check exclusion first as a priority
        //
        if (
          filterEntities &&
          ( excludedEntities.indexOf(viewName) === -1 || includedEntities.indexOf(viewName) !== -1  )
        ) {
          const jsonSchema = await this.convertEntity( {
            additionalProperties,
            baseUrl,
            defaultDescription,
            indentSpaces,
            outputFolder,
            entity,
          });
          if (!outputFolder) {
            outputSchemas.push(jsonSchema);
          }
        }
      }

      // Process all the materialized views in the schema
      //
      for ( const viewName in schema.materializedViews ) {
        const entity = db.get(viewName) as Entity;

        // Check if the table is filtered
        // First check if any filter is set for performance reasons
        // A table needs to be processed if it is included or not excluded
        // We check exclusion first as a priority
        //
        if (
          filterEntities &&
          ( excludedEntities.indexOf(viewName) === -1 || includedEntities.indexOf(viewName) !== -1  )
        ) {
          const jsonSchema = await this.convertEntity( {
            additionalProperties,
            baseUrl,
            defaultDescription,
            indentSpaces,
            outputFolder,
            entity,
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

      // TODO: Determine the column type and format
      //
      (jsonSchema.properties as {[key: string]: JSONSchema7Definition})[columnName] = {
        type: 'string',
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
}
