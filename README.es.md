# AgentModelKit

[Português (Brasil)](README.md) · [English](README.en.md) · [Documentación](docs/README.es.md) · [Ejemplos](examples/README.es.md)

AgentModelKit configura proveedores y modelos de IA en **OpenCode**, **VS Code** y **GitHub Copilot CLI**. La CLI se ejecuta en Windows, macOS y Linux, acepta parámetros para automatización e incluye un selector interactivo en la terminal. PathBit lo mantiene junto con [AgentDevKit](https://github.com/pathbit/AgentDevKit/blob/main/README.es.md).

La ayuda y los mensajes de la CLI están en inglés.

## Requisito obligatorio

**Instale únicamente [Node.js](https://nodejs.org/es/download)** para ejecutar AgentModelKit. La versión mínima es la 18. Use una versión LTS vigente siempre que pueda. Node.js incluye `npm` y `npx`. Compruébelos con `node -v` y `npx --version`.

Para **usar** un modelo configurado, también necesita el cliente que elija. Si utiliza FreeLLMAPI, este ya debe estar en ejecución. Su proveedor puede exigir una cuenta o una clave. AgentModelKit puede generar la configuración antes de que el cliente esté disponible.

## Inicio rápido

1. Con Node.js instalado, abre una terminal en la copia local de AgentModelKit.
2. Ejecute `opencode` o `freellmapi` para elegir el proveedor. Use **↑↓**, **Espacio** y **Enter** para elegir dónde configurarlo.
3. Elija un plan de OpenCode, o elija **Local** para FreeLLMAPI e indique la URL del servidor. Pegue el token cuando el asistente lo solicite.

```bash
node bin/agentmodelkit.mjs opencode
node bin/agentmodelkit.mjs freellmapi
```

Para abrir un cliente directamente, añada `vscode`, `copilot` u `opencode`. Por ejemplo, `opencode vscode` configura los endpoints de OpenCode en VS Code. Sin subcomando, el asistente empieza con la lista de proveedores.

Usa `--project-dir` para configurar OpenCode en otro proyecto. Los comandos con el nombre del paquete en npm estarán disponibles tras la publicación.

| Para… | Opción rápida |
| --- | --- |
| Elegir los agentes del proyecto | Use el asistente o indique `--targets opencode,vscode,copilot-cli`. |
| Añadir un modelo o proveedor | Use `add --providers <id> --models <ids>` o `add --provider-file ./mi-proveedor.json`. |
| Cargar los modelos recomendados | Añada `--powerful`. |
| Actualizar el catálogo | Use `catalog update`. |
| Revisar y eliminar los modelos ausentes | Ejecute `prune --providers <id>` y añada `--apply` para aplicar los cambios. |
| Ver los archivos y clientes detectados | Ejecute `doctor`. |

## Uso directo y automatización

`npx` descarga el paquete en la caché de npm y ejecuta la CLI. El comando configura los archivos de los clientes y deja a su cargo la instalación de editores, extensiones, proveedores, entornos de ejecución y modelos. Una operación `--dry-run` conserva intactas la configuración, las credenciales y las copias de seguridad.

**Mientras el paquete esté en desarrollo local**, ejecute los ejemplos desde este repositorio sustituyendo `npx --yes @pathbit/agentmodelkit` por `node bin/agentmodelkit.mjs`. El nombre del paquete estará disponible en npm después de la primera publicación.

```bash
# Configure los endpoints de OpenCode en VS Code o Copilot CLI.
npx --yes @pathbit/agentmodelkit opencode vscode
npx --yes @pathbit/agentmodelkit opencode copilot

# Configure FreeLLMAPI local en VS Code (el asistente solicita la clave unificada).
npx --yes @pathbit/agentmodelkit freellmapi vscode --connection local --url http://127.0.0.1:3001/v1

# Simule la configuración de FreeLLMAPI local en OpenCode para el proyecto.
npx --yes @pathbit/agentmodelkit freellmapi opencode --url http://127.0.0.1:3001/v1 --dry-run

# Simule la incorporación de los modelos seleccionados de Go y Console.
npx --yes @pathbit/agentmodelkit add --providers opencode --tiers all --powerful --dry-run
```

`--yes` **después del nombre del paquete** desactiva las preguntas de AgentModelKit. `--yes` antes del nombre confirma la pregunta de npm sobre la caché.

Para configurar OpenCode en otra carpeta, use `--project-dir <carpeta>`. Sin `--targets`, OpenCode también es el destino predeterminado en modo no interactivo. Use `--targets all` para incluir los tres clientes.

## Añadir, sustituir y eliminar modelos

- `add` e `init` añaden modelos y actualizan las entradas seleccionadas. Los demás modelos y proveedores quedan disponibles.
- `--replace` sustituye la selección administrada de los proveedores indicados después de crear copias de seguridad. Simule los cambios con `--dry-run`.
- `--models` acepta IDs separados por comas. Use `<grupo>/<modelo>` para distinguir el mismo ID en Go y PAYG.
- `--default-model` establece explícitamente el modelo predeterminado de Copilot CLI. Indique el ID del modelo o la selección completa que muestra el comando.
- `prune` consulta la lista completa del origen y muestra los modelos administrados que han desaparecido. Añada `--apply` para eliminarlos. Un modelo que FreeLLMAPI siga anunciando permanece configurado aunque le falte una clave o haya agotado su cuota.

```bash
npx --yes @pathbit/agentmodelkit prune --providers opencode
npx --yes @pathbit/agentmodelkit prune --providers opencode --apply
npx --yes @pathbit/agentmodelkit prune --url 'https://llm.example.com/v1/t/EXAMPLE_TOKEN'
```

Cada cambio de un archivo existente guarda sus bytes anteriores en un archivo `.bak` exclusivo. La CLI muestra las rutas de las copias. Si la configuración contiene JSON no válido, la operación se interrumpe antes de escribir en cualquiera de los clientes.

## Proveedores y catálogos

| Proveedor | Opciones |
| --- | --- |
| OpenCode | `--tiers go` para la suscripción y `--tiers payg` para Console. `all` incluye ambos. OpenCode Free está reservado para el cliente OpenCode. Las entradas gratuitas aparecen en `catalog list` como referencia. |
| FreeLLMAPI | Para la conexión local, indique la URL y la clave unificada. Una URL de agente incluye la credencial. El enrutador predeterminado es `auto`. Consulte [la conexión remota y los modos avanzados](docs/PROVIDERS.es.md#freellmapi). |
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

- **OpenCode 2** lee los modelos de `.opencode/opencode.json`. La clave permanece como referencia a una variable de entorno del proveedor o al archivo indicado con `--key-file`. Use `--no-save-key` para conservar solo el archivo que indicó.
- **Copilot CLI** usa `apiKey` en el esquema de proveedores con nombre de `providers.json`. Use `--key-file`, `OPENCODE_API_KEY`, `FREELLMAPI_API_KEY` o la entrada oculta de la terminal. `--no-save-key` omite la copia separada en `.key`. Los archivos administrados y las copias usan permisos restrictivos en sistemas POSIX.
- En **VS Code**, los comandos guiados configuran la autenticación mediante cabeceras en el perfil de usuario. Mantenga privados el perfil y sus copias. Para usar el almacén de secretos del editor, consulte [Clientes](docs/CLIENTS.es.md#vs-code).
- `doctor` indica las versiones, rutas y presencia de archivos de claves. Consulte [Clientes](docs/CLIENTS.es.md) para conocer las rutas personalizadas, las copias y la restauración.

## Desarrollo y publicación

```bash
npm run check
npm test
npm run test:package
npm run catalog:update -- --dry-run
```

Los cambios revisados se incorporan a `main`. El mantenedor aprueba la etiqueta de lanzamiento después de las pruebas. El [proceso de publicación](docs/RELEASE.es.md) valida la etiqueta, prueba el paquete y usa el mismo archivo en npmjs, GitHub Packages y GitHub Releases.

---

## AgentDevKit

El repositorio incluye el [kit compartido](.pbai4devs/README.md), las
[referencias de Codex](.codex/) y [AGENTS.md](AGENTS.md).

Para ejecutar la CLI del kit, instala [Node.js 24+ con npm y npx](https://nodejs.org/es/download).
Ejecuta este comando desde la raíz para generar la selección y los índices locales.

```console
npx @pathbit/agentdevkit@0.0.39 init
```

En la primera ejecución, la CLI añade un bloque de referencia gestionado a `AGENTS.md`.
Usa las flechas y **Espacio** para seleccionar agentes. Pulsa **Enter** para confirmar.
La guía también cubre actualizaciones y diagnóstico. [Inicio rápido de AgentDevKit](https://github.com/pathbit/AgentDevKit/blob/main/README.es.md#inicio-rápido)

---

## Contributing and Branch Protection

- Abre un pull request desde tu fork hacia `main` y verifica que la CI pase antes de solicitar una revisión.
- Consulta la [guía de contribución](CONTRIBUTING.es.md). Para errores o solicitudes de nuevos proveedores, abre una [incidencia](https://github.com/pathbit/AgentModelKit/issues).

---

## 📄 License

El proyecto utiliza la licencia MIT. Lee el texto completo en [LICENSE](LICENSE).

Puedes usar, modificar y distribuir el software, incluso con fines comerciales, siempre que las copias incluyan los avisos de derechos de autor y de licencia. El software se proporciona sin garantía.

---

Developed with ❤️ by [Pathbit](https://www.pathbit.com.br/)
