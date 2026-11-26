# Publicación

[Português (Brasil)](RELEASE.md) · [English](RELEASE.en.md)

El paquete de este proyecto es `@pathbit/agentmodelkit`. Tiene su propio ciclo de versiones, con código en `main` y lanzamientos por etiqueta. El flujo valida el código, prueba el archivo del paquete con npm exec y publica el mismo archivo en npmjs, GitHub Packages y GitHub Releases.

## Ejecutar el paquete publicado

Use el [paquete público en npmjs](https://www.npmjs.com/package/@pathbit/agentmodelkit) como opción principal. Use `@latest` para recibir la versión estable más reciente o indique el número para ejecutar siempre la misma versión.

```bash
npx --yes @pathbit/agentmodelkit@latest opencode
npx --yes @pathbit/agentmodelkit@0.0.2 opencode vscode copilot
npx --yes --allow-remote=root https://github.com/pathbit/AgentModelKit/releases/download/v0.0.2/agentmodelkit-0.0.2.tgz freellmapi
```

En npm 11 o anterior, omita `--allow-remote=root` del comando del archivo.

El comando con la URL de GitHub usa el tarball público adjunto al lanzamiento. Para usar `@latest` o una versión exacta desde GitHub Packages, defina `@pathbit:registry=https://npm.pkg.github.com` en el entorno npm donde ejecutará el comando y configure la autenticación. [Autenticación en GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).

Para ejecutar el código de `main` con Git, consulte [Otras formas de ejecutar](../README.es.md#otras-formas-de-ejecutar).

## Antes de publicar

1. Mantenga los cambios de código en `main` y confirme la matriz de CI para el commit candidato.
2. Ejecute `npm run check`, `npm test` y `npm run test:package`. Pruebe la versión local con las versiones de clientes que quiera admitir.
3. Solicite la aprobación explícita del mantenedor antes de integrar un aumento de versión en `package.json`. CI debe aprobar el commit exacto de `main` para que la automatización cree la etiqueta.
4. Configure el secreto `NPMJS_TOKEN` en GitHub Actions de AgentModelKit con un token de npm que permita publicar `@pathbit/agentmodelkit`. El trabajo de npmjs usa el entorno protegido `npmjs`.

## Validación de la etiqueta y destinos

Publique las versiones estables en orden ascendente. npm actualiza `latest` de forma predeterminada en cada publicación estable. Después de publicar una versión estable nueva, compruebe que `npm view @pathbit/agentmodelkit@latest version` devuelve el número publicado. Use `npm view @pathbit/agentmodelkit@0.0.2 dist.integrity`, con el número del lanzamiento, para comparar esa versión con la integridad del tarball validado. [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/).

Tras una ejecución exitosa de CI para un push a `main` que aumenta la versión, el flujo [Automatic release tag](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/auto-release.yml) crea la etiqueta y activa [Release](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/release.yml). El flujo comprueba el commit de la etiqueta y usa el tarball que CI probó y almacenó. GitHub Packages y GitHub Release reciben el mismo tarball mediante `GITHUB_TOKEN`.

Para recuperar una etiqueta existente, ejecute `Release` en `main` con `tag`, `expected_commit` y `source_run_id`. Indique la etiqueta, el SHA original y la ejecución que contiene el artefacto. El flujo comprueba el origen y reutiliza el archivo validado.

Si la versión ya existe, el flujo compara su integridad con la del archivo del paquete. Resuelva cualquier discrepancia antes de seguir. Las versiones publicadas son inmutables. Si un trabajo falla después de publicar en un destino, vuelva a ejecutarlo para la misma etiqueta después de corregir la causa.
Antes de publicar en GitHub, el flujo consulta npmjs sin credenciales y espera el tarball público. Comprueba el selector estable y compara tanto la integridad del registro como los bytes descargados con el artefacto de CI. Si existe una versión estable más reciente, volver a ejecutar un lanzamiento anterior valida su archivo y conserva el `latest` actual.

[Índice de documentación](README.es.md)
