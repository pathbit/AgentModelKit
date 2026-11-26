# Publicación

[Português (Brasil)](RELEASE.md) · [English](RELEASE.en.md)

El paquete de este proyecto es `@pathbit/agentmodelkit`. Tiene su propio ciclo de versiones, con código en `main` y lanzamientos por etiqueta. El flujo valida el código, prueba el archivo del paquete con npm exec y publica el mismo archivo en npmjs, GitHub Packages y GitHub Releases.

## Ejecutar el paquete publicado

Use el [paquete público en npmjs](https://www.npmjs.com/package/@pathbit/agentmodelkit) como opción principal. Use `@latest` para recibir la versión estable más reciente o indique el número para ejecutar siempre la misma versión.

```bash
npx --yes @pathbit/agentmodelkit@latest opencode
npx --yes @pathbit/agentmodelkit@0.0.1 opencode vscode copilot
npx --yes https://github.com/pathbit/AgentModelKit/releases/download/v0.0.1/pathbit-agentmodelkit-0.0.1.tgz freellmapi
```

El comando con la URL de GitHub usa el tarball público adjunto al lanzamiento. Para usar `@latest` o una versión exacta desde GitHub Packages, defina `@pathbit:registry=https://npm.pkg.github.com` en el entorno npm donde ejecutará el comando y configure la autenticación. [Autenticación en GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).

Para ejecutar el código de `main` con Git, consulte [Otras formas de ejecutar](../README.es.md#otras-formas-de-ejecutar).

## Antes de publicar

1. Mantenga los cambios de código en `main` y confirme la matriz de CI para el commit candidato.
2. Ejecute `npm run check`, `npm test` y `npm run test:package`. Pruebe la versión local con las versiones de clientes que quiera admitir.
3. Solicite la aprobación explícita del mantenedor para crear y enviar la etiqueta. La etiqueta comienza por `v`, seguida de la versión en `package.json`. Publique la versión que corresponda al commit aprobado.
4. Configure el entorno `npmjs` de GitHub Actions para que requiera aprobación del mantenedor. Para crear el paquete en npm en el primer lanzamiento, `v0.0.1`, use un token granular y temporal con acceso de publicación para el ámbito `@pathbit`. Guárdelo como `NPMJS_BOOTSTRAP_TOKEN` en ese entorno. En `v0.0.1`, el flujo también acepta `NPMJS_TOKEN` del repositorio si tiene permiso para crear el paquete. Para las próximas versiones, confirme o configure Trusted Publishing en npm con el repositorio `pathbit/AgentModelKit`, el flujo `release.yml` y el entorno `npmjs`. Elimine el secreto inicial después de verificar OIDC. [Configuración oficial de Trusted Publishing](https://docs.npmjs.com/trusted-publishers/).

## Validación de la etiqueta y destinos

Publique las versiones estables en orden ascendente. npm actualiza `latest` de forma predeterminada en cada publicación estable. Después de publicar una versión estable nueva, compruebe que `npm view @pathbit/agentmodelkit@latest version` devuelve el número publicado. Use `npm view @pathbit/agentmodelkit@0.0.1 dist.integrity`, con el número del lanzamiento, para comparar esa versión con la integridad del tarball validado. [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/).

El [flujo Release](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/release.yml) vuelve a ejecutar la matriz de pruebas para la etiqueta, comprueba que pertenece al historial de la rama predeterminada y carga un único archivo de paquete validado. La publicación en npmjs usa el entorno protegido. La publicación en GitHub usa `GITHUB_TOKEN` con `packages: write` y `contents: write`. El lanzamiento adjunta el archivo publicado.

Si la versión ya existe, el flujo compara su integridad con la del archivo del paquete. Resuelva cualquier discrepancia antes de seguir. Las versiones publicadas son inmutables. Si un trabajo falla después de publicar en un destino, vuelva a ejecutarlo para la misma etiqueta después de corregir la causa.
El último trabajo consulta npmjs sin credenciales y espera el tarball público. El flujo comprueba el selector estable y compara tanto la integridad del registro como los bytes descargados con el artefacto de CI. Si existe una versión estable más reciente, volver a ejecutar un lanzamiento anterior valida su archivo y conserva el `latest` actual.

[Índice de documentación](README.es.md)
