/**
 * The postgresql connection configuration details
 *
 * @export
 * @interface IDatabaseConfiguration
 */
export interface IDatabaseConfiguration {
  /**
   * The postgresql database host
   *
   * @type {string}
   */
  host: string;

  /**
   * The port to use to connect to postgreSQL. Defaults to 5432
   *
   * @type {number}
   */
  port?: number;

  /**
   *
   *
   * @type {string}
   */
  database: string;

  /**
   * The user to login with
   *
   * @type {string}
   */
  user: string;

  /**
   * The password to login with
   *
   * @type {string}
   */
  password?: string;
}
