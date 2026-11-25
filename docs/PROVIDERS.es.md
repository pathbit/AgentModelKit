# Proveedores

[Português (Brasil)](PROVIDERS.md) · [English](PROVIDERS.en.md)

## OpenCode Console y Go

Use `--providers opencode` y seleccione `--tiers payg`, `go` o `all`. PAYG utiliza los créditos y la política de su espacio de trabajo. Go requiere una suscripción válida. El catálogo también muestra los modelos Free, reservados para el cliente OpenCode. Los modelos de chat utilizan Chat Completions, Responses o Messages según el catálogo. Console puede traducir solicitudes para modelos con API nativa Gemini. [OpenCode Console y clientes externos](https://opencode.ai/docs/console/harnesses/).

OpenCode Go solicita un identificador de sesión por conversación. Ambos clientes admiten encabezados estáticos, por lo que AgentModelKit configura un identificador estable por perfil. Las conversaciones de un mismo perfil comparten ese identificador. La compatibilidad con Go también depende de los requisitos de sesión y las políticas de su cuenta. [Requisitos de Go y clientes validados](https://opencode.ai/docs/console/go/#where-can-i-use-it).

Puede proporcionar la clave en `OPENCODE_API_KEY` o con `--key-file`. La lista de disponibilidad para eliminar modelos procede de los endpoints públicos de Go y Console.

## FreeLLMAPI

El proveedor se conecta a un servidor FreeLLMAPI en ejecución. Configure la clave unificada en `FREELLMAPI_API_KEY` o con `--key-file`. Defina el servidor con `--url`, `--port`, `FREELLMAPI_URL` o `FREELLMAPI_PORT`. La CLI también puede detectar el puerto de la aplicación Desktop y comprobar los puertos habituales de Desktop y Docker.

- `auto` registra el enrutador predeterminado.
- `strategies` registra las estrategias virtuales incluidas en `data/`.
- `ready` consulta `/v1/models?execution_status=ready` y también incluye las estrategias. Un error en la consulta interrumpe la configuración.
- `prune` consulta `/v1/models` del servidor elegido. Los modelos que sigan apareciendo permanecen configurados, incluidos los que estén sin clave o temporalmente indisponibles.

El catálogo mensual publicado sirve como referencia. La disponibilidad depende de las claves, los límites y el estado del servidor configurado. [API de FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md#model-listing).

## Proveedores manuales

Cree un JSON a partir del [ejemplo](../examples/provider.local.example.json). Indique un ID único con formato `custom-*`, una URL HTTP(S), el protocolo y los límites de tokens de cada modelo. Mantenga las claves fuera del manifiesto. Si `requiresKey` es verdadero (valor predeterminado), use una variable derivada del ID, como `CUSTOM_MI_PROVEEDOR_API_KEY`, o indique `--key-file`.

`modelsUrl` es opcional y debe tener el mismo origen que el endpoint. Inclúyalo para usar `--live` y `prune`. La respuesta debe ser una lista completa compatible con OpenAI y sin paginación. Para `--powerful`, declare los IDs en `powerfulIds`. Con el protocolo Messages, incluya `/v1` en la base si forma parte de la ruta `/v1/messages`.

[Índice de documentación](README.es.md)
