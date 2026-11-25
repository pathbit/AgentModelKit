# Catálogos

[Português (Brasil)](README.md) · [English](README.en.md)

Los archivos de esta carpeta se incluyen en el paquete npm.

| Archivo | Origen y uso |
| --- | --- |
| `opencode-catalog.json` | API oficiales de Go y Console. Incluye los modelos de chat con los metadatos de protocolo y el conjunto completo de IDs por origen para revisión. |
| `freellmapi-catalog.json` | Catálogo público mensual de FreeLLMAPI, verificado con la clave Ed25519 publicada por el proyecto. Incluye modelos de referencia y las estrategias virtuales que usa la CLI. |
| `curation.json` | Selección editorial. Revise los IDs, los criterios y la fecha cuando cambie el catálogo. |
| `awesome-free-providers.json` | Instantánea comunitaria de referencia. Úsela para investigar endpoints y cree un manifiesto manual con los datos que verifique. |

Puede actualizar la caché con `catalog update [--source opencode|freellmapi|all]`. Defina `AGENTMODELKIT_CATALOG_DIR` para cambiar su ubicación. La ruta predeterminada es `$XDG_CACHE_HOME/agentmodelkit/catalogs` o `~/.cache/agentmodelkit/catalogs`. Cuando todavía no hay una caché para un origen, la CLI utiliza la instantánea del paquete.

Los mantenedores ejecutan `npm run catalog:update -- --write` para regenerar las instantáneas de `data/`. `--check` devuelve un error si hay diferencias. El flujo mensual descarga los orígenes oficiales y genera un parche para revisión. Revise los cambios de la selección `--powerful` en `curation.json`.

Las fuentes provienen de las [API de modelos de OpenCode](https://opencode.ai/docs/console/api/models/) y el [catálogo mensual de FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/architecture/05-catalog-sync.md). La instantánea comunitaria procede de [Awesome Free LLM APIs](https://github.com/mnfst/awesome-free-llm-apis).
