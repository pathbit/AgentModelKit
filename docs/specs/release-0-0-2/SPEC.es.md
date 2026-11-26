---
description: AgentModelKit 0.0.2
status: aprovado
---

# Entrega de AgentModelKit 0.0.2

[Português (Brasil)](SPEC.md) · [English](SPEC.en.md) · [Hoja de ruta](../../ROADMAP.es.md)

## Objetivo

Entregar las correcciones de configuración de VS Code y de consulta de la versión. Comprobar que el tarball público de npmjs coincide con el artefacto de CI antes de reproducir la publicación en GitHub.

## Requisitos y alcance

- Conservar cabeceras personalizadas y referencias a secretos al volver a aplicar la configuración del mismo endpoint de VS Code. Las cabeceras anteriores permanecen en su endpoint original.
- Mostrar la versión del paquete desde `agentmodelkit` y `amk`. Mantener la ejecución por `npx` sin instalar dependencias en el proyecto.
- Validar Linux, Windows y macOS con Node.js 18, 22 y 24. Comprobar las guías en portugués de Brasil, inglés y español.
- Use el entorno protegido `npmjs` y el secreto `NPMJS_TOKEN` de GitHub Actions. Compruebe la descarga sin credenciales antes de publicar el mismo paquete en GitHub.
- El alcance incluye los clientes y proveedores existentes. Las nuevas integraciones permanecen en la [hoja de ruta](../../ROADMAP.es.md#trabajo-futuro).

## Criterios de aceptación y plan de verificación

Las pruebas locales quedan en `.agent-tests/release-0-0-2/`. Las pruebas públicas se enlazarán en el [registro de la versión](../../releases/v0-0-2/RELEASE.es.md).

| Criterio | Comando y requisito previo | Resultado observable |
| --- | --- | --- |
| AC-001 | `npm test` con perfiles de prueba | La rotación conserva cabeceras y referencias a secretos para la misma URL. Las cabeceras anteriores permanecen en su endpoint original. |
| AC-002 | `npm run check` y `npm run test:package` en la matriz de CI | npm ejecuta el tarball en una carpeta vacía, ambos alias indican `0.0.2` y los enlaces relativos funcionan en el paquete. |
| AC-003 | `node --test tests/release.test.mjs` con un registro simulado | El flujo tolera demoras y rechaza discrepancias de integridad, otros registros y descargas alteradas. |
| AC-004 | Flujo `Release` con `NPMJS_TOKEN`, aprobación y artefacto del commit verificado. Luego descargar los artefactos de los tres destinos y compararlos con el tarball de CI | `@0.0.2` y `@latest` seleccionan la nueva versión. npmjs, GitHub Packages y GitHub Release sirven los mismos bytes de CI. |

## Referencias y aprobación

El mantenedor aprobó la base y autorizó formalizar y publicar la versión `0.0.2` el 25 de noviembre de 2026. Es la primera especificación registrada en el proyecto. [Requisitos](../../PRD.es.md) · [Experiencia en terminal](../../UX.es.md) · [Diseño técnico](../../ARCHITECTURE.es.md) · [Publicación](../../RELEASE.es.md)
