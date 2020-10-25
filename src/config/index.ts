import { IInputConfiguration } from './input';
import { IOutputConfiguration } from './output';
import { IDatabaseConfiguration } from './pg';

/**
 * The configuration for the schema conversion process which details
 * how to connect to the database, what to convert and how to output it
 *
 * @export
 * @interface IConfiguration
 */
export interface IConfiguration {
  /**
   * The postgresql database connection details
   *
   * @type {IDatabaseConfiguration}
   */
  pg: IDatabaseConfiguration;

  /**
   * Details on what to convert from the database
   * Default configuration will be to convert everything in the public schema
   *
   * @type {IInputConfiguration}
   */
  input?: IInputConfiguration;

  /**
   * Details on how to output the schemas
   *
   * @type {IOutputConfiguration}
   */
  output?: IOutputConfiguration;

  /**
   * Disables the progress indication which is output to STDERR
   *
   * @type {boolean}
   */
  silent?: boolean;
}
