---
status: planejado
---

# AgentModelKit 0.0.2 verificado para publicación

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
| AC-004 | La publicación aprobada verifica la versión exacta, `@latest` y el tarball público. Registre la ejecución y el hash después de publicar. |

El mantenedor aprobó la base de producto, experiencia y diseño y autorizó la publicación el 25 de noviembre de 2026.

La etiqueta `v0.0.2` superó las nueve comprobaciones de la matriz de sistemas y versiones de Node.js. CI generó el tarball y el mantenedor aprobó el despliegue protegido. npmjs devolvió `ENEEDAUTH`. Después del intento, la etiqueta `latest` de npmjs seguía apuntando a `0.0.1` y el registro aún no mostraba la `0.0.2`. El mantenedor autorizó reanudar mediante GitHub Actions con `NPMJS_TOKEN`. El criterio AC-004 queda pendiente de verificar el artefacto en los tres destinos. [Ejecución del lanzamiento](https://github.com/pathbit/AgentModelKit/actions/runs/45742845489).

[Especificación aprobada](../../specs/release-0-0-2/SPEC.es.md) · [Procedimiento de publicación](../../RELEASE.es.md)
