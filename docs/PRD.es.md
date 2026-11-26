---
description: Requisitos de AgentModelKit.
status: aprovado
---

# Requisitos del producto

[Português (Brasil)](PRD.md) · [English](PRD.en.md) · [Documentación](README.es.md)

AgentModelKit configura el acceso a modelos de IA en proyectos nuevos o existentes. Está destinado a quienes usan varios agentes de código y necesitan mantener los proveedores y los modelos sin configurar cada cliente a mano.

## Requisitos

1. Ejecutarse mediante `npx` con Node.js 18 o posterior. npmjs ofrece `@latest` y versiones fijas. Cada lanzamiento de GitHub ofrece también un tarball público.
2. Configurar OpenCode por proyecto, VS Code por perfil y Copilot CLI mediante su archivo de usuario. El menú permite seleccionar varios clientes. Los argumentos permiten automatizar la configuración.
3. Configurar OpenCode Go/PAYG, FreeLLMAPI local o remoto y proveedores definidos por manifiesto. El flujo predeterminado usa los catálogos incluidos.
4. Mostrar los cambios con `--dry-run`, guardar copias antes de sustituir archivos existentes y conservar entradas manuales.
5. Mantener la documentación en portugués de Brasil, inglés y español. La CLI, el código y los scripts usan inglés.

## Verificación

El [inicio rápido](../README.es.md) documenta el flujo de usuario. La [experiencia en terminal](UX.es.md) describe el menú y los errores. La [arquitectura](ARCHITECTURE.es.md) registra los límites entre el proyecto y los perfiles. La [hoja de ruta](ROADMAP.es.md) vincula las entregas y las comprobaciones de la próxima versión.

## Límites y decisiones

Los clientes y los servidores de inferencia tienen instalaciones y credenciales propias. La CLI genera sus archivos con los datos proporcionados. Los clientes adicionales, las integraciones y los cambios de credenciales se incorporan a la hoja de ruta cuando existan requisitos verificables.

Base obtenida del código, la documentación y la versión publicada `0.0.1`. El mantenedor aprobó esta base el 25 de noviembre de 2026 para la entrega de la versión `0.0.2`.
