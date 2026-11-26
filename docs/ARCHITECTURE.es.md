---
description: Diseño técnico de la CLI AgentModelKit.
status: aprovado
---

# Arquitectura

[Português (Brasil)](ARCHITECTURE.md) · [English](ARCHITECTURE.en.md)

La CLI usa módulos ESM y API nativas de Node.js, sin dependencias de ejecución del paquete. Los adaptadores escriben la configuración de cada cliente. La aplicación funciona sin daemon ni base de datos.

- [src/agentmodelkit.mjs](../src/agentmodelkit.mjs) expone la CLI y presenta errores en la terminal.
- [src/cli.mjs](../src/cli.mjs) interpreta las opciones, obtiene las credenciales necesarias, resuelve los modelos y prepara los archivos antes de escribir.
- [src/providers](../src/providers) resuelve los metadatos de conexión, los planes y los modelos por proveedor. Los manifiestos manuales utilizan el mismo formato interno.
- [src/catalogs](../src/catalogs) lee las instantáneas, normaliza las API de OpenCode y verifica el catálogo público firmado de FreeLLMAPI.
- [src/targets](../src/targets) convierte los grupos a la configuración de cada cliente, conserva las entradas manuales y modifica solo los modelos seleccionados o administrados.
- [src/utils/json.mjs](../src/utils/json.mjs) prepara archivos temporales, detecta cambios concurrentes mediante bloqueos, crea copias y renombra los archivos. Si falla la escritura, intenta restaurar los archivos ya modificados.

OpenCode usa `.opencode/opencode.json` y un registro adyacente de modelos administrados. Copilot CLI agrupa las conexiones por protocolo. VS Code registra el endpoint en cada modelo y guarda el registro de propiedad en un archivo adyacente. AgentModelKit reconoce las marcas de las versiones preliminares y permite una migración gradual.

Para eliminar modelos se usa una lista completa y validada del origen, independiente de la selección configurable. Una lista parcial, vacía o no válida interrumpe la operación.

El flujo de publicación usa un tarball producido y probado por CI. Cada destino recibe ese archivo. Después de publicar, la comprobación de npmjs consulta el paquete público, verifica el selector y compara los bytes descargados con la integridad del tarball.

El mantenedor aprobó esta base el 25 de noviembre de 2026 para la entrega de la versión `0.0.2`.

[Índice de documentación](README.es.md)
