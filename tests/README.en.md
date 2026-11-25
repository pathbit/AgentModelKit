# Tests

[Português (Brasil)](README.md) · [Español](README.es.md)

`npm test` runs unit and local integration tests using Node.js's built-in test runner. Availability tests use local HTTP fixtures. Configuration tests use temporary profiles and dummy keys.

`npm run test:package` validates the tarball and invokes the CLI offline via npm exec. GitHub Actions runs both checks on Windows, macOS and Linux.
