# Pruebas

[Português (Brasil)](README.md) · [English](README.en.md)

`npm test` ejecuta las pruebas unitarias y de integración local con el ejecutor nativo de Node.js. Las pruebas de disponibilidad usan servidores HTTP locales de prueba. Las pruebas de configuración usan perfiles temporales y claves ficticias.

`npm run test:package` valida el archivo del paquete y ejecuta la CLI sin conexión mediante npm exec. GitHub Actions ejecuta ambas comprobaciones en Windows, macOS y Linux.
