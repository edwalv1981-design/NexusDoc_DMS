# Bitácora de cambios de desarrollo — NexusDoc DMS

Registro de cada cambio publicado en www.nexusdoc.online (rama `main` → Railway).
Sirve para saber qué cambio pudo causar un problema y cómo deshacerlo.

**Regla vigente (desde 2026-11-19):** ningún cambio se publica sin que el dueño (Ed) haya leído
qué se cambia, qué afecta y cómo se deshace, y lo haya autorizado.

Cómo deshacer un cambio: `git revert <commit>` y publicar (push a `main`). Ningún cambio de esta
lista borra datos de clientes.

| Fecha y hora (Ecuador) | Commit | Qué se cambió | Qué afecta | Riesgo | Autorizado | Cómo deshacer |
|---|---|---|---|---|---|---|
| 2026-11-19 22:36 | (ver commit «recuadros completos») | **PDF KYC Entities: ninguna fila se parte entre páginas**; si no cabe, pasa entera a la página siguiente, así cada recuadro sale cerrado (antes quedaba abierto al final de la hoja, p. ej. FATCA/CRS). | Solo el diseño del PDF de KYC Entities. | Bajo | Sí — Ed, 19-nov 22:33 («corrígelo») | Revertir commit |
| 2026-11-19 22:20 | c8e4fff | **PDF KYC Entities fiel al PDF original de Ed**: tamaño Carta, márgenes medidos, Verdana/DejaVu 9 pt, logo solo en página 1, bordes morado oscuro, viñetas en flecha (➢), columnas de documentos con divisoria, mismas alturas de fila y mismos cortes de página (3 páginas). Se agrega la fuente DejaVu Sans al servidor (Dockerfile). | Solo el diseño del PDF de KYC Entities. Formulario y datos sin cambios. | Bajo | Sí — Ed, 19-nov 22:18 («autorizo a publicar en producción») | Revertir commit |
| 2026-11-19 22:08 | 79609a7 | **PDF KYC Individual: la lista de introducción usa el visto (✓) igual que la plantilla original**, dibujado como imagen (no depende de las fuentes del servidor). | Solo el dibujo del PDF de KYC Individual. | Bajo | Sí — Ed, 19-nov 22:01 («corrígelo», con la imagen del original) | Revertir commit |
| 2026-11-19 22:02 | 73ab706 | **PDF KYC: viñetas como cuadritos negros dibujados** (antes salían cajas vacías porque el servidor no tiene el símbolo ✓ ni ➤), recuadro de la introducción cerrado arriba (Individual), casillas de roles alineadas y «Fundador/Fideicomitente» dentro de su recuadro. | Solo el dibujo del PDF de KYC Individual y Entities. Formulario y datos sin cambios. | Bajo | Sí — Ed, 19-nov 22:00 («pon esas … como cuadros») | Revertir commit |
| 2026-11-19 21:40 | 4bc3488 | **KYC Individual y KYC Entities según las plantillas nuevas enviadas por Ed** (PTL_KYC 2026-11). Individual: ID number, cédula a color, documentos escaneados, autorización de datos, nombre del solicitante; sin W9 ni notas de certificación. Entities: 10 roles, dirección registrada, cuenta bancaria o carta de abogado, beneficiarios en un campo, sin Partnerships, autorización de datos, nombre del representante y 2 firmas. Texto más grande en PDF y formulario. | Formulario y PDF de ambos KYC. Trámites ya enviados conservan todos sus datos (W9, Partnerships, estados financieros, 4 beneficiarios) y su PDF los muestra. Borradores en curso se abren con sus datos y deben completar los campos nuevos obligatorios. | Medio | Sí — Ed, 19-nov 21:24 («autorizo») y 21:37 («publícalo», tras revisar los PDF de prueba) | Revertir commit |
| 2026-11-19 21:20 | bc60b83 | **Se elimina del menú del Master la opción «PLANTILLAS PDF».** La carga de plantillas desde el panel queda retirada (responde 410). De aquí en adelante Ed envía las plantillas y el formulario se arma en el código. | Solo el menú del administrador. Las plantillas ya creadas, los formularios, los PDF y los datos de los clientes siguen igual. | Bajo | Sí — Ed, 19-nov 21:18 («autorizo») | Revertir commit |
| 2026-11-19 21:10 | 02747d6 | **Se elimina la opción de cambiar formularios subiendo plantillas.** Desaparece el panel «Formularios en uso». «Cargar plantilla» vuelve a solo guardar el PDF como archivo. Los 5 formularios (KYC Individual, KYC Entities, Fondos, Corporación, Fundaciones) vuelven al formulario estándar. | Trámites NUEVOS usan el formulario estándar. Los trámites ya llenados con una plantilla se siguen abriendo igual, con sus datos. Las plantillas subidas quedan guardadas sin efecto. | Bajo | Sí — Ed, 19-nov 21:05 («autorizo») | Revertir este commit |
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
