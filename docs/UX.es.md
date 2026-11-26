---
description: Experiencia de configuración de la CLI.
status: rascunho
---

# Experiencia en terminal

[Português (Brasil)](UX.md) · [English](UX.en.md) · [Requisitos](PRD.es.md)

1. Elija el proveedor y pulse **Espacio** para marcar los clientes. Pulse **A** para marcar o desmarcar todos y **Enter** para confirmar. Seleccione al menos un cliente.
2. Indique el plan, la URL y los modelos cuando corresponda. Introduzca la clave en el prompt oculto o use una variable de entorno o `--key-file`.
3. La salida muestra los clientes afectados, los archivos y las rutas de las copias. Use `--dry-run` para ver los cambios. En automatizaciones, indique las opciones y use `--yes` como opción de la CLI.
4. Un error de validación indica qué archivo u opción debe corregirse. Consulte [clientes y copias](CLIENTS.es.md) para localizar los perfiles.

Compruebe el menú con los [ejemplos](../README.es.md#inicio-rápido) y las [pruebas](https://github.com/pathbit/AgentModelKit/blob/main/tests/README.es.md). CI comprueba la selección y la escritura. Las comprobaciones en una terminal real se registran por cliente y versión.

Aprobación formal del mantenedor pendiente.
