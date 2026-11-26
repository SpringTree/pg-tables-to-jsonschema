# Changelog

## [2.0.1](https://github.com/SpringTree/pg-tables-to-jsonschema/compare/v2.0.0...v2.0.1) (2026-11-26)


### Bug Fixes

* **package:** allow require() on node.js 22.12 and later ([#30](https://github.com/SpringTree/pg-tables-to-jsonschema/issues/30)) ([2f4f99a](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/2f4f99a697ee2c2f408d5d8c8bf1e6f96f057a81))

## [2.0.0](https://github.com/SpringTree/pg-tables-to-jsonschema/compare/v1.1.3...v2.0.0) (2026-11-26)


### ⚠ BREAKING CHANGES

* **deps:** node.js 22 or later is required and the package is an ES module. require() still works on node.js 22.12 and later; imports from pg-tables-to-jsonschema/lib/ no longer exist. The -i, -o and -b options now require a value

### Bug Fixes

* **cli:** accept --pg-schema without --include-tables and --exclude-tables ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **cli:** apply --base-url without --out ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **cli:** apply the --pg-database, --pg-password, --desc and --indent options ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **cli:** exit when a conversion fails instead of hanging on the database connection ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **cli:** print the unwrapped schema as json ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **cli:** report an unreadable configuration file instead of crashing ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **cli:** write the password prompt to stderr ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **converter:** convert enum array columns to arrays of the enum ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **converter:** disable the progress messages when silent is set ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **converter:** set maxLength on character types only ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **deps:** replace commander, jsonfile, lodash, mkdirp and prompts with built-in code ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **deps:** require node.js 22 or later and publish as an es module ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
* **deps:** ship the json-schema type declarations the published types import ([851f74c](https://github.com/SpringTree/pg-tables-to-jsonschema/commit/851f74c84568f53c4958a63a8a984f5d0ed6446d))
