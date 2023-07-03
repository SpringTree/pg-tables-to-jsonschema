import { IConfiguration } from '../src/config';
import { SchemaConverter } from '../src/index';

const exampleConfig: IConfiguration = {
  "pg": {
    "host": "localhost",
    "database": "mydb",
    "user": "postgres",
    "password": "secret"
  },
  "input": {
    "schemas": ["public"],
    "exclude": ["not_this_table"],
    "include": []
  },
  "output": {
    "additionalProperties": false,
    "baseUrl": "http://api.localhost.com/schema/",
    "defaultDescription": "Missing description",
    "indentSpaces": 2,
    "outDir": "",
    "unwrap": false
  }
};

describe('Converter', () => {

  test('Config can validate', async () => {
    const converter = new SchemaConverter(exampleConfig);
    try {
      await converter.convert();
    } catch (err) {
      expect(err.message).toContain('connect ECONNREFUSED');
    }
  });
});
