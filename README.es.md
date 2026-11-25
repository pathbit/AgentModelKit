# AgentModelKit

[Português (Brasil)](README.md) · [English](README.en.md) · [Documentación](docs/README.es.md) · [Ejemplos](examples/README.es.md)

AgentModelKit configura proveedores y modelos de IA en **VS Code** y **GitHub Copilot CLI**. La CLI se ejecuta en Windows, macOS y Linux, acepta parámetros para automatización e incluye un selector interactivo en la terminal. PathBit lo mantiene junto con [AgentDevKit](https://github.com/pathbit/AgentDevKit/blob/main/README.es.md).

La ayuda y los mensajes de la CLI están en inglés.

## Requisito obligatorio

**Instale únicamente [Node.js](https://nodejs.org/es/download)** para ejecutar AgentModelKit. La versión mínima es la 18. Use una versión LTS vigente siempre que pueda. Node.js incluye `npm` y `npx`. Compruébelos con `node -v` y `npx --version`.

Para **usar** un modelo configurado, también necesita el cliente que elija. Si utiliza FreeLLMAPI, este ya debe estar en ejecución. Su proveedor puede exigir una cuenta o una clave. AgentModelKit puede generar la configuración antes de que el cliente esté disponible.

## Ejecución sin instalación permanente

`npx` descarga el paquete en la caché de npm y ejecuta la CLI. El comando configura los archivos de los clientes y deja a su cargo la instalación de editores, extensiones, proveedores, entornos de ejecución y modelos. Una operación `--dry-run` conserva intactas la configuración, las credenciales y las copias de seguridad.

**Mientras el paquete esté en desarrollo local**, ejecute los ejemplos desde este repositorio sustituyendo `npx --yes @pathbit/agentmodelkit` por `node bin/agentmodelkit.mjs`. El nombre del paquete estará disponible en npm después de la primera publicación.

```bash
# Seleccione clientes, proveedores y modelos de forma interactiva.
npx --yes @pathbit/agentmodelkit

# Simule la configuración de FreeLLMAPI con el enrutador auto.
npx --yes @pathbit/agentmodelkit init --providers freellmapi --targets all --dry-run

# Configure un servidor FreeLLMAPI que ya esté en ejecución.
npx --yes @pathbit/agentmodelkit add --providers freellmapi --port 31415 --key-file ./freellmapi.key --yes

# Añada un modelo de OpenCode Console a Copilot CLI.
npx --yes @pathbit/agentmodelkit add --providers opencode --tiers payg --models gpt-6.2-sol --targets copilot-cli --key-file ./opencode.key --yes

# Simule la incorporación de los modelos seleccionados de Go y Console.
npx --yes @pathbit/agentmodelkit add --providers opencode --tiers all --powerful --dry-run
```

`--yes` **después del nombre del paquete** desactiva las preguntas de AgentModelKit. `--yes` antes del nombre confirma la pregunta de npm sobre la caché.

## Añadir, sustituir y eliminar modelos

- `add` e `init` añaden modelos y actualizan las entradas seleccionadas. Los demás modelos y proveedores quedan disponibles.
- `--replace` sustituye la selección administrada de los proveedores indicados después de crear copias de seguridad. Simule los cambios con `--dry-run`.
- `--models` acepta IDs separados por comas. Use `<grupo>/<modelo>` para distinguir el mismo ID en Go y PAYG.
- `--default-model` establece explícitamente el modelo predeterminado de Copilot CLI. Indique el ID del modelo o la selección completa que muestra el comando.
- `prune` consulta la lista completa del origen y muestra los modelos administrados que han desaparecido. Añada `--apply` para eliminarlos. Un modelo que FreeLLMAPI siga anunciando permanece configurado aunque le falte una clave o haya agotado su cuota.

```bash
npx --yes @pathbit/agentmodelkit prune --providers opencode
npx --yes @pathbit/agentmodelkit prune --providers opencode --apply
npx --yes @pathbit/agentmodelkit prune --providers freellmapi --port 31415 --key-file ./freellmapi.key
```

Cada cambio de un archivo existente guarda sus bytes anteriores en un archivo `.bak` exclusivo. La CLI muestra las rutas de las copias. Si la configuración contiene JSON no válido, la operación se interrumpe antes de escribir en cualquiera de los clientes.

## Proveedores y catálogos

| Proveedor | Opciones |
| --- | --- |
| OpenCode | `--tiers go` para la suscripción y `--tiers payg` para Console. `all` incluye ambos. OpenCode Free está reservado para el cliente OpenCode. Las entradas gratuitas aparecen en `catalog list` como referencia. |
| FreeLLMAPI | `auto` por defecto o `--freellmapi-mode strategies\|ready`. Use `--url` o `--port` para un servidor concreto. `ready` consulta qué modelos pueden responder en ese servidor. |
| Proveedor manual | Indique un [manifiesto JSON](examples/provider.local.example.json) con `--provider-file`. Repita la opción para incluir varios proveedores. |

`--powerful` carga la selección editorial de [data/curation.json](data/curation.json). Para FreeLLMAPI incluye estrategias del enrutador. Para un proveedor manual, declare los modelos recomendados en `powerfulIds`. La selección está versionada y puede revisarse cada mes. AgentModelKit usa directamente los datos publicados al seleccionar los modelos.

```bash
# Liste los catálogos en uso.
npx --yes @pathbit/agentmodelkit catalog list

# Descargue el catálogo oficial de OpenCode y la distribución firmada de FreeLLMAPI.
npx --yes @pathbit/agentmodelkit catalog update

# Simule la actualización de un solo catálogo.
npx --yes @pathbit/agentmodelkit catalog update --source opencode --dry-run

# Cargue modelos de su endpoint mediante un manifiesto local.
npx --yes @pathbit/agentmodelkit add --provider-file ./mi-proveedor.json --dry-run
```

El paquete incluye archivos de catálogo en `data/`. `catalog update` utiliza una caché fuera del paquete. Use `--live` para consultar OpenCode durante la configuración. La configuración en vivo de FreeLLMAPI consulta su servidor. El catálogo público sirve como referencia del producto. [Orígenes, caché y actualización mensual](data/README.es.md).

## Credenciales y clientes

- **Copilot CLI** usa `apiKey` en el esquema de proveedores con nombre de `providers.json`. Use `--key-file`, `OPENCODE_API_KEY`, `FREELLMAPI_API_KEY` o la entrada oculta de la terminal. `--no-save-key` omite la copia separada en `.key`. Los archivos administrados y las copias usan permisos restrictivos en sistemas POSIX.
- **VS Code** utiliza una referencia de secreto. Introduzca la clave en el gestor de modelos. La clave permanece en el almacén de secretos de VS Code. El cliente usa `chatLanguageModels.json` del perfil elegido.
- `doctor` indica las versiones, rutas y presencia de archivos de claves. Consulte [Clientes](docs/CLIENTS.es.md) para conocer las rutas personalizadas, las copias y la restauración.

## Desarrollo y publicación

```bash
npm run check
npm test
npm run test:package
npm run catalog:update -- --dry-run
```

Los cambios revisados se incorporan a `main`. El mantenedor aprueba la etiqueta de lanzamiento después de las pruebas. El [proceso de publicación](docs/RELEASE.es.md) valida la etiqueta, prueba el paquete y usa el mismo archivo en npmjs, GitHub Packages y GitHub Releases.

[MIT](LICENSE) © PathBit
