---
status: publicado
---

# AgentModelKit 0.0.2

[Português (Brasil)](RELEASE.md) · [English](RELEASE.en.md) · [Hoja de ruta](../../ROADMAP.es.md)

## Alcance de la entrega

- Aplicar de nuevo la configuración de VS Code y conservar las cabeceras personalizadas y las referencias a secretos del mismo endpoint.
- Consultar la versión del paquete con `agentmodelkit --version` o `amk -v`.
- Comprobar la disponibilidad pública en npmjs y comparar la descarga con el tarball de CI.

## Comprobaciones

| Criterio | Evidencia esperada |
| --- | --- |
| AC-001 | La rotación conserva cabeceras y referencias a secretos de la misma URL. Las cabeceras antiguas permanecen en su endpoint original. |
| AC-002 | npm ejecuta el tarball en una carpeta vacía y ambos alias indican `0.0.2`. |
| AC-003 | La CI simula la demora de propagación de npmjs y rechaza discrepancias de integridad, orígenes externos y descargas alteradas. |
| AC-004 | `@0.0.2` y `@latest` ejecutaron la versión `0.0.2`. Los tres destinos sirvieron el tarball aprobado por CI. |

El mantenedor aprobó la base de producto, experiencia y diseño y autorizó la publicación el 25 de noviembre de 2026.

La etiqueta `v0.0.2` superó las nueve comprobaciones de la matriz de sistemas y versiones de Node.js. CI generó el tarball y el mantenedor aprobó el despliegue protegido. npmjs devolvió `ENEEDAUTH`. Después del intento, la etiqueta `latest` de npmjs seguía apuntando a `0.0.1` y el registro aún no mostraba la `0.0.2`. El mantenedor autorizó reanudar mediante GitHub Actions con `NPMJS_TOKEN`. [Primer intento](https://github.com/pathbit/AgentModelKit/actions/runs/45742845489).

[Especificación aprobada](../../specs/release-0-0-2/SPEC.es.md) · [Procedimiento de publicación](../../RELEASE.es.md)

El flujo en `main` recuperó la etiqueta original `v0.0.2` con `NPMJS_TOKEN` en el entorno aprobado. npmjs resolvió `@0.0.2` y `@latest` como `0.0.2`. Los tres destinos sirvieron los mismos bytes del tarball aprobado por CI. SHA-256 `bb559bb943bc9f6949d2d3bae49be5befa2d72d5dae351218e1434a9f10f6c42`. [Ejecución de publicación](https://github.com/pathbit/AgentModelKit/actions/runs/45823791970) · [CI de la etiqueta](https://github.com/pathbit/AgentModelKit/actions/runs/45742845489) · [npmjs](https://www.npmjs.com/package/@pathbit/agentmodelkit/v/0.0.2) · [GitHub Packages](https://github.com/pathbit/AgentModelKit/pkgs/npm/agentmodelkit) · [GitHub Release](https://github.com/pathbit/AgentModelKit/releases/tag/v0.0.2)
