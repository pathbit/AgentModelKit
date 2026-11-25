# Contribuciones

[Português (Brasil)](CONTRIBUTING.md) · [English](CONTRIBUTING.en.md)

AgentModelKit es un proyecto de PathBit. Los cambios se incorporan a `main` después de su verificación.

## Entorno

Use [Node.js](https://nodejs.org/es/download) 18 o posterior. La CLI utiliza módulos nativos de Node.js.

```bash
npm run check
npm test
npm run test:package
```

La prueba del paquete ejecuta los comandos publicados desde un archivo local con perfiles y caché temporales. Configure `COPILOT_HOME`, `VSCODE_USER_DIR` y `AGENTMODELKIT_CATALOG_DIR` para separar las pruebas de sus perfiles habituales.

Cuando cambie un proveedor o cliente, pruebe la configuración generada, su coexistencia con las entradas existentes y los errores de escritura o consulta al origen. Al actualizar los datos, regenérelos según [la guía de catálogos](data/README.es.md) y compruebe los IDs en [data/curation.json](data/curation.json).

Use inglés para el código fuente, los scripts, las pruebas y los mensajes de la terminal. Actualice en conjunto la documentación en portugués de Brasil, inglés y español. El Markdown sin sufijo corresponde al portugués brasileño predeterminado. Mantenga las traducciones en el mismo directorio con `.en.md` y `.es.md` y enlace al idioma correspondiente.

El mantenedor autoriza la creación de la etiqueta y la publicación según el [proceso de lanzamiento](docs/RELEASE.es.md).
