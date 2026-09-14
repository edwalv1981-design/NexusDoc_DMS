# 🛡️ Informe de Auditoría y Sistema de Consultas Administrativas — NexusDoc DMS
**Sistema:** NexusDoc DMS  
**Entorno:** Producción Railway (`https://nexusdocdms-production.up.railway.app`)  
**Módulo:** Buscador Universal de Personas y Participantes en Formularios (`/api/admin/search-person`)  
**Última Restauración:** 14 de Septiembre, 2026

---

## 1. 📌 Resumen de la Funcionalidad de Consulta Consolidada

El módulo de consultas de NexusDoc DMS permite al usuario **Administrador Master** realizar búsquedas universales por **Cédula / RUC o Nombre / Apellido**. El sistema escanea todos los formularios registrados en la base de datos PostgreSQL e identifica de forma exacta:
1. En qué formularios específicos aparece la persona.
2. En qué sección del formulario participa (ej: Directores, Dignatarios, Accionistas, Fundadores, Beneficiarios, Firmantes Autorizados, Apoderados).
3. El rol específico dentro de la sección (ej: *Director #1*, *Dignatario (PRESIDENTE)*, *Dignatario (SECRETARIO)*, *Firmante Autorizado*).

---

## 2. 🔒 Auditoría de Seguridad (Security Audit)

| Pilar de Seguridad | Estado | Descripción de Protección |
| :--- | :---: | :--- |
| **Prevención SQL Injection** | ✅ 100% Protegido | Todas las consultas dinámicas utilizan **parámetros vinculados (`replacements`)** u operadores parametrizados del ORM de Sequelize (`Op.iLike`, `Op.or`). Ningún valor de entrada del usuario se concatena directamente en las sentencias SQL. |
| **Control de Acceso (RBAC)** | ✅ 100% Protegido | Las rutas críticas `/api/admin/*` están blindadas con el middleware doble `[auth, isAdmin]`. El rol `admin` valida tanto el Token JWT firmado como el `roleOverride` en `UserProfiles`. |
| **Protección contra Fuerza Bruta** | ✅ 100% Protegido | Control de intentos de inicio de sesión (`loginAttempts`) con bloqueo temporal tras 3 fallos consecutivos. Reset seguro con claves temporales criptográficamente generadas (`crypto.randomBytes`). |
| **Cifrado de Contraseñas** | ✅ 100% Protegido | Cifrado unidireccional con **bcryptjs (Salt factor 10)**. Las contraseñas no se almacenan ni transmiten en texto plano. |
| **Sanitización de Datos Entrantes** | ✅ 100% Protegido | Filtrado de caracteres especiales y sanitización en campos de cédulas/RUC (`replace(/[^a-zA-Z0-9]/g, '')`). |

---

## 3. ⚡ Auditoría de Rendimiento (Performance Audit)

| Componente | Estado | Optimización Aplicada |
| :--- | :---: | :--- |
| **Indexación en PostgreSQL** | ✅ Optimizado | Claves primarias e índices en campos de búsqueda frecuente: `FormData.userId`, `FormData.formType`, `User.email`, `User.uniqueCode`, `User.idNumber`. |
| **Paginación y Límites de Memoria** | ✅ Optimizado | Cláusula `LIMIT 150` y `LIMIT 50` en consultas administrativas para evitar consumo excesivo de memoria RAM en peticiones simultáneas. |
| **Indexación Asíncrona en Segundo Plano** | ✅ Optimizado | El servicio `personCatalogService.backfillHistoricalData()` se ejecuta en segundo plano sin bloquear el hilo principal de respuesta del HTTP request (`non-blocking I/O`). |
| **Carga de Plantillas PDF** | ✅ Optimizado | Lectura directa optimizada en buffer de memoria con límites estrictos de subida (10 MB máx via Multer). |

---

## 4. 🗄️ Auditoría de Base de Datos e Integridad (Database & Integrity Audit)

| Aspecto | Estado | Mecanismo de Control |
| :--- | :---: | :--- |
| **Resolución Dual de Tablas (Naming Convention)** | ✅ Resuelto | Compatibilidad transparente tanto para tablas `form_data` (convención PostgreSQL `underscored: true`) como `"FormData"` (convención CamelCase de Sequelize). |
| **Relaciones Seguras con `LEFT JOIN`** | ✅ Protegido | Se migraron las consultas de `INNER JOIN` a `LEFT JOIN` para garantizar que formularios guardados sin vinculación de usuario directo no se pierdan ni queden ocultos. |
| **Purga en Cascada de Usuarios** | ✅ Protegido | El endpoint de eliminación física borra en cascada los registros asociados en `UserDocument`, `SignedDocument`, `FormData`, `UserProfiles` y `UserLanguages`, evitando registros huérfanos. |

---

## 5. 💻 Verificación y Pruebas en Vivo (Railway Producción)

1. **Prueba por Cédula `1713470050`:**
   - **Resultado:** 2 Formularios identificados.
   - **Desglose de Coincidencias:** Director #4, Dignatario (PRESIDENTE), Dignatario (SECRETARIO), Dignatario (TESORERO).
2. **Prueba por Cédula `1713470051`:**
   - **Resultado:** 1 Formulario de Corporación (`c9c0f6db-a150-4417-b4d8-00913514a3a9`).
   - **Ubicación en el Formulario:** Sección `Directores`, Rol `Director #1`.
3. **Endpoints de Salud:** `/health` y `/ready` responden `200 OK`.
