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
    "schemas": ["public", "stuff"],
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

describe('Config', () => {

  test('Config can validate', async () => {
    const converter = new SchemaConverter(exampleConfig);
    try {
      await converter.checkConfiguration();
    } catch (err) {
      expect(err).toBeUndefined();
    }
  });

  test('Missing config', async () => {
    const converter = new SchemaConverter(undefined as unknown as IConfiguration);
    try {
      await converter.checkConfiguration();
      throw new Error('Should have thrown error');
    } catch (err) {
      expect(err).toBeDefined();
      expect(err.message).toEqual('No configuration supplied');
    }
  });

  test('Missing database details', async () => {
    const config: IConfiguration = JSON.parse(JSON.stringify(exampleConfig));
    delete config.pg;

    const converter = new SchemaConverter(config);
    try {
      await converter.checkConfiguration();
      throw new Error('Should have thrown error');
    } catch (err) {
      expect(err).toBeDefined();
      expect(err.message).toEqual('Missing PGSQL config');
    }
  });

  test('Not writeable output folder', async () => {
    const config: IConfiguration = JSON.parse(JSON.stringify(exampleConfig));
    if (!config.output) {
      config.output = {};
    }
    config.output.outDir = './totally-not-a-folder';

    const converter = new SchemaConverter(config);
    try {
      await converter.checkConfiguration();
      throw new Error('Should have thrown error');
    } catch (err) {
      expect(err).toBeDefined();
      expect(err.message).toEqual(`Cannot write to ${config.output.outDir}`);
    }
  });
});

