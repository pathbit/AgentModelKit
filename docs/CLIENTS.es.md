# Clientes

[Português (Brasil)](CLIENTS.md) · [English](CLIENTS.en.md)

## OpenCode en un proyecto

Use `--targets opencode` o marque **OpenCode (current project)** con **Espacio** en el asistente. Ejecute el comando en la carpeta del proyecto o indique `--project-dir`. AgentModelKit escribe `.opencode/opencode.json` para **OpenCode 2** y registra los modelos administrados en `.opencode/agentmodelkit-models.json`. El archivo directo `opencode.json(c)` sigue disponible para sus ajustes.

Defina una variable del proveedor, como `FREELLMAPI_API_KEY`, o use `--key-file <archivo> --no-save-key` para referenciar un archivo existente. Abra el proyecto en el cliente y seleccione los modelos en `/models`. [Configuración por proyecto de OpenCode](https://opencode.ai/docs/config/#locations).
Con una [URL de agente de FreeLLMAPI](PROVIDERS.es.md#freellmapi), OpenCode lee la URL de un archivo privado fuera del proyecto. VS Code y Copilot CLI usan la URL en sus archivos de perfil sin una clave aparte.

## GitHub Copilot CLI

El registro BYOK utiliza `providers.json` en `COPILOT_HOME` o la ruta indicada en `COPILOT_PROVIDERS_CONFIG`. De forma predeterminada usa `~/.copilot/providers.json`. Reinicie el cliente después de configurarlo y seleccione un modelo con `/model`.

El formato de proveedores con nombre lee `apiKey` del JSON. Las claves guardadas por la versión preliminar en `<COPILOT_HOME>/<proveedor>.key` siguen disponibles para migración. Al actualizar un proveedor, AgentModelKit escribe su `apiKey` estática. `--no-save-key` controla la copia en `.key`. Trate tanto el archivo de configuración como sus copias como credenciales. [Referencia oficial del registro BYOK](https://docs.github.com/es/copilot/reference/copilot-cli-reference/cli-config-dir-reference#providersjson).

Use `--default-model` para establecer un modelo predeterminado en `settings.json` de Copilot. La CLI valida que esté entre las opciones seleccionadas en la operación. Si se elimina un modelo predeterminado con proveedor indicado, AgentModelKit borra la selección para que Copilot utilice sus valores predeterminados.

## VS Code

`chatLanguageModels.json` pertenece al perfil de VS Code. Configure `VSCODE_USER_DIR` para un perfil específico, VS Code Insiders o un directorio de datos separado. Las rutas que siguen corresponden a VS Code estable.

| Sistema | Directorio |
| --- | --- |
| Windows | `%APPDATA%\Code\User` |
| macOS | `~/Library/Application Support/Code/User` |
| Linux | `$XDG_CONFIG_HOME/Code/User` o `~/.config/Code/User` |

Los grupos usan el proveedor **Custom Endpoint**. Abra **Chat: Manage Language Models** para seleccionar el modelo y configurar la clave. Vuelva a cargar la ventana si el selector no se actualiza. Use la acción **Update API Key** del grupo para guardar la clave en el almacén de secretos de VS Code. AgentModelKit conserva la referencia existente al añadir modelos. VS Code 1.148 no usa un valor literal de `apiKey` en el archivo para autenticar el endpoint. [Referencia oficial de Custom Endpoint](https://code.visualstudio.com/docs/agent-customization/language-models#_add-a-custom-endpoint-model).

El archivo adyacente `chatLanguageModels.json.agentmodelkit.json` registra los modelos y endpoints generados por AgentModelKit. Consérvelo junto a la configuración. Al restaurar manualmente una copia de VS Code, restaure también el registro correspondiente cuando esté disponible.

En el flujo guiado, el token autentica los modelos seleccionados mediante cabeceras en el perfil privado. También puede usar las variables del proveedor o `--key-file`. Trate el perfil y sus copias como credenciales. Con `add --providers ... --targets vscode` también puede guardar la clave directamente en el almacén de secretos del editor.

Al volver a aplicar la configuración del mismo endpoint, AgentModelKit conserva las cabeceras personalizadas. Si cambia el endpoint, configure esas cabeceras para la nueva dirección.

## Copias de seguridad y simulación

Use `--dry-run` para simular los cambios. Cada modificación de un archivo existente conserva su contenido anterior. La primera copia usa `<archivo>.bak`. Las siguientes incluyen un identificador único. Cierre el cliente antes de restaurar desde las rutas que mostró la operación que desea deshacer. Los archivos de configuración existentes deben contener JSON válido. Un archivo no válido impide la modificación de los clientes afectados.

[Índice de documentación](README.es.md)
