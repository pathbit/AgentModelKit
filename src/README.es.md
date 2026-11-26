# Código fuente

[Português (Brasil)](README.md) · [English](README.en.md)

El código utiliza módulos ES nativos de Node.js. Consulte la [arquitectura](../docs/ARCHITECTURE.es.md) y la [referencia de proveedores](../docs/PROVIDERS.es.md).

El [punto de entrada](agentmodelkit.mjs) publica los comandos `agentmodelkit` y `amk` del paquete. [cli.mjs](cli.mjs) gestiona las opciones y la ejecución. Durante el desarrollo, use `npm run cli -- --help` para consultar las opciones y `npm run cli -- --version` para ver la versión declarada en el paquete. Consulte los [ejemplos de uso del paquete](../README.es.md).
