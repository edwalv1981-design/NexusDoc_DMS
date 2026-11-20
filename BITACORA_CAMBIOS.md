# Bitácora de cambios de desarrollo — NexusDoc DMS

Registro de cada cambio publicado en www.nexusdoc.online (rama `main` → Railway).
Sirve para saber qué cambio pudo causar un problema y cómo deshacerlo.

**Regla vigente (desde 2026-11-19):** ningún cambio se publica sin que el dueño (Ed) haya leído
qué se cambia, qué afecta y cómo se deshace, y lo haya autorizado.

Cómo deshacer un cambio: `git revert <commit>` y publicar (push a `main`). Ningún cambio de esta
lista borra datos de clientes.

| Fecha y hora (Ecuador) | Commit | Qué se cambió | Qué afecta | Riesgo | Autorizado | Cómo deshacer |
|---|---|---|---|---|---|---|
| 2026-11-19 21:10 | (este cambio) | **Se elimina la opción de cambiar formularios subiendo plantillas.** Desaparece el panel «Formularios en uso». «Cargar plantilla» vuelve a solo guardar el PDF como archivo. Los 5 formularios (KYC Individual, KYC Entities, Fondos, Corporación, Fundaciones) vuelven al formulario estándar. | Trámites NUEVOS usan el formulario estándar. Los trámites ya llenados con una plantilla se siguen abriendo igual, con sus datos. Las plantillas subidas quedan guardadas sin efecto. | Bajo | Sí — Ed, 19-nov 21:05 («autorizo») | Revertir este commit |
| 2026-11-19 20:19 | 291867e | Plantillas: no entran en uso sin «Confirmar y usar»; botón «Descartar». | Panel de plantillas del admin. | Bajo | No (publicado antes de la regla) | Superado por el cambio de 21:10 |
| 2026-11-19 20:10 | 2f39326 | Vista preliminar automática al subir una plantilla. | Panel de plantillas del admin. | Bajo | No (antes de la regla) | Superado por el cambio de 21:10 |
| 2026-11-19 20:07 | ab1535b | «Subir y listo»: la plantilla subida quedaba en uso de inmediato; panel con solo el formulario actual. | Formularios que ven los clientes (trámites nuevos). **Posible causa de formularios con errores.** | Alto | Pedido por Ed, sin revisión previa | Superado por el cambio de 21:10 |
| 2026-11-19 16:57 | fc6aaf6 | Mostrar la clave temporal al admin si el correo de restablecimiento no llega. | Admin → restablecer clave. | Bajo | Pedido por Ed | Revertir commit |
| 2026-11-18 21:40 | 308d406 | KYC: el aviso de campos obligatorios dice qué falta y lleva al campo. | KYC Individual y Entities (validación al terminar). | Bajo | Pedido por Ed | Revertir commit |
| 2026-11-18 21:27 | 2008327 | Plantillas: revisar y corregir antes de activar; textos de ayuda por fila. | Panel de plantillas del admin. | Medio | Pedido por Ed | Superado por el cambio de 21:10 |
| 2026-11-18 21:15 | 722b902 | Lectura de plantillas escaneadas (OCR): casillas con etiquetas en dos líneas. | Análisis de plantillas subidas. | Medio | Pedido por Ed | Superado por el cambio de 21:10 |
| 2026-11-18 21:12 | d1e32df | Lectura de plantillas escaneadas (OCR): letras O/D no son casillas. | Análisis de plantillas subidas. | Medio | Pedido por Ed | Superado por el cambio de 21:10 |

## Plantilla para cada cambio nuevo

- **Fecha y hora:**
- **Commit:**
- **Qué se cambió:**
- **Qué afecta:** (pantallas, formularios, datos)
- **Riesgo:** Bajo / Medio / Alto
- **Autorizado por Ed:** fecha y hora del «autorizo»
- **Verificación en vivo:** resultado
- **Cómo deshacer:**
