# Publicación

[Português (Brasil)](RELEASE.md) · [English](RELEASE.en.md)

El paquete de este proyecto es `@pathbit/agentmodelkit`. Tiene su propio ciclo de versiones, con código en `main` y lanzamientos por etiqueta. El flujo valida el código, prueba el archivo del paquete con npm exec y publica el mismo archivo en npmjs, GitHub Packages y GitHub Releases.

## Ejecutar el paquete publicado

Cuando la versión esté disponible, ejecútela directamente con npm/npx:

```bash
npx --yes @pathbit/agentmodelkit@0.0.1 opencode vscode copilot
npx --yes https://github.com/pathbit/AgentModelKit/releases/download/v0.0.1/pathbit-agentmodelkit-0.0.1.tgz freellmapi
```

El segundo comando usa el tarball público adjunto a la versión de GitHub. Para usar el registro GitHub Packages, configure la autenticación de npm para el ámbito `@pathbit`. [Autenticación en GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).

## Antes de la primera publicación

1. Mantenga los cambios de código en `main` y confirme la matriz de CI para el commit candidato.
2. Ejecute `npm run check`, `npm test` y `npm run test:package`. Pruebe la versión local con las versiones de clientes que quiera admitir.
3. Solicite la aprobación explícita del mantenedor para crear y enviar la etiqueta. La etiqueta comienza por `v`, seguida de la versión en `package.json`. La primera será `v0.0.1`.
4. Configure el entorno `npmjs` de GitHub Actions para que requiera aprobación del mantenedor. Para crear el paquete en npm por primera vez, use un token granular y temporal con acceso de publicación para el ámbito `@pathbit`. Guárdelo como `NPMJS_BOOTSTRAP_TOKEN` en ese entorno. Después de la primera versión, configure Trusted Publishing en npm con el repositorio `pathbit/AgentModelKit`, el flujo `release.yml` y el entorno `npmjs`. Elimine el secreto inicial después de verificar OIDC. [Configuración oficial de Trusted Publishing](https://docs.npmjs.com/trusted-publishers/).

## Validación de la etiqueta y destinos

El [flujo Release](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/release.yml) vuelve a ejecutar la matriz de pruebas para la etiqueta, comprueba que pertenece al historial de la rama predeterminada y carga un único archivo de paquete validado. La publicación en npmjs usa el entorno protegido. La publicación en GitHub usa `GITHUB_TOKEN` con `packages: write` y `contents: write`. El lanzamiento adjunta el archivo publicado.

Si la versión ya existe, el flujo compara su integridad con la del archivo del paquete. Resuelva cualquier discrepancia antes de seguir. Las versiones publicadas son inmutables. Si un trabajo falla después de publicar en un destino, vuelva a ejecutarlo para la misma etiqueta después de corregir la causa.

[Índice de documentación](README.es.md)
