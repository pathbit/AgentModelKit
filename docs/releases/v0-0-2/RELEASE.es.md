---
status: planejado
---

# AgentModelKit 0.0.2 en preparación

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

La especificación formal requiere la aprobación de la base de producto, experiencia y diseño. Crear la etiqueta y publicar requieren una autorización propia. [Procedimiento de publicación](../../RELEASE.es.md)
