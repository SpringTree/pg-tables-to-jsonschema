/**
 * The configuration for what is to be converted from the database
 *
 * @export
 * @interface IInputConfiguration
 */
export interface IInputConfiguration {
  /**
   * The schemas to convert. Defaults to [ 'public' ]
   *
   * @type {string[]}
   */
  schemas?: string[];

  /**
   * List of structure objects to include in the conversion.
   * Defaults to all found.
   *
   * @type {string[]}
   */
  include?: string[]

  /**
   * List of structure objects to exclude in the conversion.
   * Defaults to none.
   *
   * @type {string[]}
   */
  exclude?: string[]
}
