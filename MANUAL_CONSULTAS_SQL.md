# Manual de Consultas SQL — Panel de Administración NexusDoc DMS

## Introducción

El **Modo Avanzado de Consultas SQL** permite a los administradores ejecutar consultas SQL directamente contra la base de datos PostgreSQL del sistema. Esta herramienta está disponible en el panel de administración, dentro de la pestaña **Consultas**.

### Restricciones de Seguridad
- **Solo se permiten consultas SELECT** — cualquier intento de INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE o CREATE será bloqueado.
- **Límite automático**: si no especificas `LIMIT`, el sistema agrega `LIMIT 100` automáticamente.
- **Timeout**: las consultas que tarden más de 10 segundos serán canceladas.
- **Auditoría**: todas las consultas ejecutadas quedan registradas en el log del servidor.

### Cómo Usar
1. En el panel de administración, ir a la pestaña **Consultas**.
2. Hacer clic en **"Modo Avanzado — Consulta SQL"** para expandir la sección.
3. Escribir la consulta SQL en el área de texto.
4. Presionar **EJECUTAR** o usar **Ctrl+Enter**.
5. Los resultados se muestran en una tabla dinámica debajo.
6. Usar **LIMPIAR** para borrar los resultados y el query.

---

## Estructura de la Base de Datos

### Tabla: `"Users"`

Almacena todos los usuarios registrados en el sistema.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único (clave primaria) |
| `name` | VARCHAR | Nombre completo del usuario |
| `email` | VARCHAR | Correo electrónico (único) |
| `password` | VARCHAR | Contraseña encriptada (bcrypt) |
| `nationality` | VARCHAR | Nacionalidad |
| `role` | ENUM | Rol: `'admin'` o `'client'` |
| `status` | ENUM | Estado: `'pending'`, `'authorized'`, `'revoked'`, `'blocked'` |
| `loginAttempts` | INTEGER | Intentos de login fallidos |
| `activeToken` | TEXT | Token de sesión activo |
| `initialForm` | VARCHAR | Formulario inicial seleccionado en registro |
| `idNumber` | VARCHAR | Número de cédula/identificación (único) |
| `uniqueCode` | VARCHAR | Código único del usuario (ej: NXD-XXXX) |
| `securityCode` | VARCHAR | Código de seguridad temporal |
| `codeExpiresAt` | TIMESTAMP | Expiración del código de seguridad |
| `codeAttempts` | INTEGER | Intentos de verificación de código |
| `lockUntil` | TIMESTAMP | Bloqueo temporal hasta esta fecha |
| `mustChangePassword` | BOOLEAN | Si debe cambiar contraseña en próximo login |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Última actualización |

---

### Tabla: `"FormData"`

Almacena **todos los formularios** enviados por los usuarios. El campo `data` es JSONB y contiene toda la información del formulario.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único del formulario |
| `userId` | UUID | ID del usuario propietario (FK → Users) |
| `formType` | VARCHAR | Tipo de formulario (ver tipos abajo) |
| `userUniqueCode` | VARCHAR | Código único del usuario al momento de guardar |
| `data` | JSONB | **Datos completos del formulario** (ver estructura abajo) |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Última actualización |

**Tipos de formulario (`formType`):**
- `"Corporaciones"` — Incorporación de Sociedad Anónima
- `"Fundaciones"` — Fundación de Interés Privado
- `"Fondos Registros contables"` — Declaración de Origen de Fondos
- `"Cumplimiento Individual"` — Formulario KYC Individual
- `"Cumplimiento Entidades"` — Formulario KYC para Entidades

---

### Tabla: `"AuditLogs"`

Registro de auditoría de todas las acciones del sistema.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INTEGER | ID autoincremental |
| `action` | VARCHAR | Tipo de acción (ej: `USER_STATUS_CHANGE`, `TEMPLATE_UPLOAD`) |
| `description` | TEXT | Descripción detallada de la acción |
| `userId` | UUID | ID del usuario que realizó la acción (FK → Users) |
| `createdAt` | TIMESTAMP | Fecha del evento |

---

### Tabla: `"DocumentTemplates"`

Plantillas PDF subidas por el administrador.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `name` | VARCHAR | Nombre de la plantilla (único) |
| `fileData` | BYTEA | Archivo PDF en binario |
| `uploadedBy` | UUID | ID del admin que subió la plantilla |
| `createdAt` | TIMESTAMP | Fecha de subida |
| `updatedAt` | TIMESTAMP | Última actualización |

---

### Tabla: `"SignedDocuments"`

Documentos PDF firmados por los usuarios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `userId` | UUID | ID del usuario propietario (FK → Users) |
| `filename` | VARCHAR | Nombre del archivo |
| `fileData` | BYTEA | Archivo PDF firmado en binario |
| `signatureStatus` | VARCHAR | Estado: `'Firma Pendiente'` o `'Firma Detectada'` |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Última actualización |

---

### Tabla: `"UserDocuments"`

Documentos adicionales subidos por los usuarios.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `userId` | UUID | ID del usuario propietario (FK → Users) |
| `filename` | VARCHAR | Nombre del archivo |
| `fileData` | BYTEA | Archivo en binario |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Última actualización |

---

### Tabla: `"PendingRegistrations"`

Registros de usuario pendientes de verificación por código.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `name` | VARCHAR | Nombre del solicitante |
| `email` | VARCHAR | Correo electrónico (único) |
| `nationality` | VARCHAR | Nacionalidad |
| `initialForm` | VARCHAR | Formulario inicial seleccionado |
| `idNumber` | VARCHAR | Número de identificación |
| `code` | VARCHAR | Código de verificación |
| `codeExpiresAt` | TIMESTAMP | Expiración del código |
| `attempts` | INTEGER | Intentos de verificación |
| `lockUntil` | TIMESTAMP | Bloqueo temporal |
| `createdAt` | TIMESTAMP | Fecha de registro |
| `updatedAt` | TIMESTAMP | Última actualización |

---

### Tabla: `"TemplateFieldSchemas"`

Esquemas de campos AcroForm extraídos de las plantillas PDF.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `templateName` | VARCHAR | Nombre de la plantilla (único) |
| `formType` | VARCHAR | Tipo de formulario asociado |
| `acroFields` | JSONB | Lista de campos AcroForm detectados |
| `fieldMapping` | JSONB | Mapeo de campos del formulario a campos del PDF |
| `schemaSource` | VARCHAR | Origen: `'static'`, `'extracted'`, etc. |
| `extractedAt` | TIMESTAMP | Fecha de extracción |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Última actualización |

---

## Estructura del campo JSONB `data` en FormData

### Corporaciones (`formType = 'Corporaciones'`)

**Campos principales (texto):**
| Clave | Descripción |
|-------|-------------|
| `corpNameSA` | Nombre opción 1 (S.A.) |
| `corpNameCorp` | Nombre opción 2 (Corp.) |
| `corpNameInc` | Nombre opción 3 (Inc.) |
| `capitalSocial` | Capital social (default: "10000") |
| `companyActivities` | Actividades de la empresa |
| `declarationDate` | Fecha de declaración |

**Arreglos de personas:**

- **`directors`** — Array de directores (mínimo 3):
  ```
  { fullName, birthDate, maritalStatus, nationality, passport, phone, email, address, city, country }
  ```

- **`dignitaries`** — Array de dignatarios (Presidente, Secretario, Tesorero):
  ```
  { role, fullName, birthDate, passport, registrationNumber }
  ```
  Valores de `role`: `"PRESIDENTE"`, `"SECRETARIO"`, `"TESORERO"`

- **`shareholders`** — Array de accionistas:
  ```
  { certificate, value, shares, name, address }
  ```

- **`signers`** — Array de firmantes:
  ```
  { signature, name }
  ```

---

### Fundaciones (`formType = 'Fundaciones'`)

**Campos principales (texto):**
| Clave | Descripción |
|-------|-------------|
| `foundationNameOption1` | Nombre opción 1 |
| `foundationNameOption2` | Nombre opción 2 |
| `foundationNameOption3` | Nombre opción 3 |
| `initialPatrimony` | Patrimonio inicial (default: "10000") |
| `foundationObjects` | Objeto/fines de la fundación |
| `declarationName` | Nombre del declarante |
| `declarationDate` | Fecha de declaración |

**Campos de Poder (POA):**
| Clave | Descripción |
|-------|-------------|
| `poaIssue` | ¿Emitir poder? (`"YES"` / `"NO"`) |
| `poaType` | Tipo: `"GENERAL"` / `"SPECIAL"` |
| `poaValidityDate` | Fecha de vigencia |
| `poaLegalized` | ¿Legalizado? (`"YES"` / `"NO"`) |
| `poaFullName` | Nombre del apoderado |
| `poaBirthDate` | Fecha de nacimiento |
| `poaMaritalStatus` | Estado civil |
| `poaNationality` | Nacionalidad |
| `poaPassport` | Pasaporte |
| `poaIdCard` | Cédula |
| `poaPhone` | Teléfono |
| `poaEmail` | Correo electrónico |
| `poaAddress` | Dirección |
| `poaCity` | Ciudad |
| `poaCountry` | País |

**Arreglos de personas:**

- **`founders`** — Array de fundadores:
  ```
  { fullName, birthDate, maritalStatus, nationality, passport, idCard, phone, email, address, city, country }
  ```

- **`protectors`** — Array de protectores (misma estructura que founders)

- **`councilMembers`** — Array de miembros del consejo (mínimo 3, misma estructura)

- **`dignitaries`** — Array de dignatarios:
  ```
  { role, fullName, birthDate, address, registrationNumber }
  ```
  Valores de `role`: `"PRESIDENTE"`, `"SECRETARIO"`, `"TESORERO"`

- **`beneficiaries`** — Array de beneficiarios:
  ```
  { percentage, shareholder, birthDate, address }
  ```
  Nota: `shareholder` es el nombre del beneficiario.

- **`signers`** — Array de firmantes:
  ```
  { signature, name }
  ```

---

### Fondos Registros contables (`formType = 'Fondos Registros contables'`)

**Campos principales (texto):**
| Clave | Descripción |
|-------|-------------|
| `companyName` | Nombre de la empresa |
| `activities` | Actividades/propósito |
| `country` | País/jurisdicción |
| `beneficiaryName` | Nombre del beneficiario final |
| `birthDate` | Fecha de nacimiento |
| `birthPlace` | Lugar de nacimiento |
| `address` | Dirección completa |
| `fundsSource` | Array de fuentes de fondos (ej: `["bienes","inversiones"]`) |
| `fundsOther` | Otras fuentes (texto libre) |
| `custodyName` | Nombre del custodio |
| `custodyPhone` | Teléfono del custodio |
| `custodyEmail` | Email del custodio |
| `custodyAddress` | Dirección del custodio |
| `signerName` | Nombre del firmante |
| `date` | Fecha de registro |

**Valores posibles para `fundsSource`:** `"bienes"`, `"inversiones"`, `"negocios"`, `"prestamos"`, `"herencia"`, `"otras"`

---

### Cumplimiento Individual (`formType = 'Cumplimiento Individual'`)

**Campos principales (texto):**
| Clave | Descripción |
|-------|-------------|
| `fullName` | Nombre completo |
| `birthDate` | Fecha de nacimiento |
| `birthPlace` | Lugar de nacimiento |
| `maritalStatus` | Estado civil |
| `nationality` | Nacionalidad |
| `passport` | Número de pasaporte |
| `idCard` | Número de cédula |
| `phone` | Teléfono |
| `email` | Correo electrónico |
| `address` | Dirección |
| `city` | Ciudad |
| `country` | País |
| `occupation` | Ocupación |
| `employer` | Empleador |
| `pep` | ¿Es PEP? (`"Sí"` / `"No"`) |
| `pepDetails` | Detalles PEP (si aplica) |
| `fundsSource` | Array de fuentes de fondos |
| `fundsOther` | Otras fuentes |
| `declarationName` | Nombre del declarante |
| `declarationDate` | Fecha de declaración |

---

### Cumplimiento Entidades (`formType = 'Cumplimiento Entidades'`)

**Campos principales (texto):**
| Clave | Descripción |
|-------|-------------|
| `legalName` | Razón social |
| `tradeName` | Nombre comercial |
| `entityType` | Tipo de entidad |
| `incorporationDate` | Fecha de incorporación |
| `jurisdiction` | Jurisdicción |
| `taxId` | RUC/NIT/Tax ID |
| `registrationNumber` | Número de registro |
| `registeredAddress` | Dirección registrada |
| `phone` | Teléfono |
| `email` | Correo electrónico |
| `city` | Ciudad |
| `country` | País |
| `businessActivity` | Actividad comercial |
| `website` | Sitio web |
| `legalRepName` | Nombre del representante legal |
| `legalRepId` | Identificación del representante legal |
| `legalRepNationality` | Nacionalidad del representante legal |
| `beneficialOwners` | Beneficiarios finales |
| `pep` | ¿PEP? (`"Sí"` / `"No"`) |
| `pepDetails` | Detalles PEP |
| `fundsSource` | Array de fuentes de fondos |
| `fundsOther` | Otras fuentes |
| `declarationName` | Nombre del declarante |
| `declarationDate` | Fecha de declaración |

---

## Sintaxis de Consultas JSONB en PostgreSQL

### Operadores básicos

| Operador | Descripción | Ejemplo |
|----------|-------------|---------|
| `->` | Obtener valor JSONB (retorna JSONB) | `data->'directors'` |
| `->>` | Obtener valor como texto | `data->>'companyName'` |
| `@>` | Contiene (para búsqueda) | `data @> '{"poaIssue":"YES"}'` |
| `?` | ¿Existe la clave? | `data ? 'directors'` |

### Extraer texto de un campo
```sql
SELECT data->>'companyName' AS empresa FROM "FormData"
```

### Acceder a un elemento de un array por índice
```sql
-- Primer director (índice 0)
SELECT data->'directors'->0->>'fullName' AS primer_director FROM "FormData"
```

### Iterar sobre un array JSONB con `jsonb_array_elements`
```sql
SELECT elem->>'fullName' AS nombre
FROM "FormData",
     jsonb_array_elements(data->'directors') AS elem
```

### Búsqueda case-insensitive con ILIKE
```sql
SELECT * FROM "FormData"
WHERE data->>'companyName' ILIKE '%panama%'
```

### Cast (conversión de tipos)
```sql
-- Convertir texto a número para comparar
SELECT * FROM "FormData"
WHERE (data->>'capitalSocial')::numeric > 50000
```

### Contar elementos de un array JSONB
```sql
SELECT jsonb_array_length(data->'directors') AS total_directores
FROM "FormData"
```

---

## Consultas de Ejemplo Prácticas

### 1. Ver todos los usuarios registrados
```sql
SELECT id, name, email, "uniqueCode", "idNumber", nationality, role, status, "createdAt"
FROM "Users"
ORDER BY "createdAt" DESC
```

### 2. Buscar un usuario por email
```sql
SELECT id, name, email, "uniqueCode", status, "createdAt"
FROM "Users"
WHERE email ILIKE '%ejemplo@correo.com%'
```

### 3. Ver todos los formularios de un usuario específico
```sql
SELECT f.id, f."formType", f."createdAt", f."updatedAt",
       data->>'companyName' AS empresa,
       data->>'foundationNameOption1' AS fundacion
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
WHERE u.email = 'usuario@ejemplo.com'
ORDER BY f."updatedAt" DESC
```

### 4. Contar formularios por tipo
```sql
SELECT "formType", COUNT(*) AS total
FROM "FormData"
GROUP BY "formType"
ORDER BY total DESC
```

### 5. Buscar en qué empresas aparece una persona como director
```sql
SELECT f.id AS form_id,
       f."formType",
       data->>'corpNameSA' AS empresa,
       elem->>'fullName' AS director,
       elem->>'passport' AS pasaporte,
       u.name AS usuario,
       u.email
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN data ? 'directors' AND jsonb_typeof(data->'directors') = 'array'
         THEN data->'directors' ELSE '[]'::jsonb END
) AS elem
WHERE elem->>'fullName' ILIKE '%Juan%'
ORDER BY f."updatedAt" DESC
```

### 6. Ver todos los directores de una corporación específica
```sql
SELECT data->>'corpNameSA' AS empresa,
       elem->>'fullName' AS director,
       elem->>'passport' AS pasaporte,
       elem->>'nationality' AS nacionalidad,
       elem->>'email' AS email_director
FROM "FormData" f
CROSS JOIN LATERAL jsonb_array_elements(data->'directors') AS elem
WHERE f."formType" = 'Corporaciones'
  AND data->>'corpNameSA' ILIKE '%Mi Empresa%'
```

### 7. Buscar por pasaporte en toda la base de datos
```sql
SELECT f.id, f."formType",
       data->>'corpNameSA' AS empresa_corp,
       data->>'foundationNameOption1' AS fundacion,
       elem->>'fullName' AS persona,
       elem->>'passport' AS pasaporte,
       'Director' AS rol
FROM "FormData" f
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN data ? 'directors' AND jsonb_typeof(data->'directors') = 'array'
         THEN data->'directors' ELSE '[]'::jsonb END
) AS elem
WHERE elem->>'passport' ILIKE '%E12345678%'

UNION ALL

SELECT f.id, f."formType", NULL, NULL,
       elem->>'fullName' AS persona,
       elem->>'passport' AS pasaporte,
       'Dignatario' AS rol
FROM "FormData" f
CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN data ? 'dignitaries' AND jsonb_typeof(data->'dignitaries') = 'array'
         THEN data->'dignitaries' ELSE '[]'::jsonb END
) AS elem
WHERE elem->>'passport' ILIKE '%E12345678%'
LIMIT 50
```

### 8. Ver accionistas de todas las corporaciones
```sql
SELECT data->>'corpNameSA' AS empresa,
       elem->>'name' AS accionista,
       elem->>'shares' AS acciones,
       elem->>'value' AS valor,
       u.name AS usuario_propietario
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
CROSS JOIN LATERAL jsonb_array_elements(data->'shareholders') AS elem
WHERE f."formType" = 'Corporaciones'
ORDER BY empresa
```

### 9. Contar cuántas empresas tiene cada usuario
```sql
SELECT u.name, u.email, u."uniqueCode",
       COUNT(*) AS total_formularios,
       COUNT(CASE WHEN f."formType" = 'Corporaciones' THEN 1 END) AS corporaciones,
       COUNT(CASE WHEN f."formType" = 'Fundaciones' THEN 1 END) AS fundaciones,
       COUNT(CASE WHEN f."formType" = 'Fondos Registros contables' THEN 1 END) AS fondos
FROM "Users" u
JOIN "FormData" f ON f."userId" = u.id
GROUP BY u.id, u.name, u.email, u."uniqueCode"
ORDER BY total_formularios DESC
```

### 10. Buscar formularios creados en una fecha específica
```sql
SELECT f.id, f."formType",
       data->>'corpNameSA' AS empresa,
       data->>'foundationNameOption1' AS fundacion,
       data->>'companyName' AS empresa_fondos,
       u.name AS usuario,
       f."createdAt"
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
WHERE f."createdAt"::date = '2025-01-15'
ORDER BY f."createdAt" DESC
```

Para buscar en un **rango de fechas**:
```sql
SELECT f.id, f."formType", u.name, f."createdAt"
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
WHERE f."createdAt" BETWEEN '2025-01-01' AND '2025-03-31'
ORDER BY f."createdAt" DESC
```

### 11. Ver dignatarios (Presidente, Secretario, Tesorero) de todas las corporaciones
```sql
SELECT data->>'corpNameSA' AS empresa,
       elem->>'role' AS cargo,
       elem->>'fullName' AS nombre,
       elem->>'passport' AS pasaporte,
       u.name AS usuario
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
CROSS JOIN LATERAL jsonb_array_elements(data->'dignitaries') AS elem
WHERE f."formType" = 'Corporaciones'
ORDER BY empresa, elem->>'role'
```

### 12. Buscar beneficiarios en fundaciones
```sql
SELECT data->>'foundationNameOption1' AS fundacion,
       elem->>'shareholder' AS beneficiario,
       elem->>'percentage' AS porcentaje,
       elem->>'birthDate' AS fecha_nacimiento,
       elem->>'address' AS direccion,
       u.name AS usuario
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
CROSS JOIN LATERAL jsonb_array_elements(data->'beneficiaries') AS elem
WHERE f."formType" = 'Fundaciones'
ORDER BY fundacion
```

### 13. Ver todos los formularios con capital social mayor a X
```sql
SELECT f."formType",
       data->>'corpNameSA' AS empresa,
       data->>'capitalSocial' AS capital,
       u.name AS usuario
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
WHERE f."formType" = 'Corporaciones'
  AND (data->>'capitalSocial')::numeric > 50000
ORDER BY (data->>'capitalSocial')::numeric DESC
```

Para fundaciones (patrimonio inicial):
```sql
SELECT data->>'foundationNameOption1' AS fundacion,
       data->>'initialPatrimony' AS patrimonio,
       u.name AS usuario
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
WHERE f."formType" = 'Fundaciones'
  AND (data->>'initialPatrimony')::numeric > 50000
ORDER BY (data->>'initialPatrimony')::numeric DESC
```

### 14. Consultar datos del poder (POA) en fundaciones
```sql
SELECT data->>'foundationNameOption1' AS fundacion,
       data->>'poaIssue' AS emite_poder,
       data->>'poaType' AS tipo_poder,
       data->>'poaFullName' AS apoderado,
       data->>'poaPassport' AS pasaporte_apoderado,
       data->>'poaNationality' AS nacionalidad,
       data->>'poaValidityDate' AS vigencia,
       data->>'poaLegalized' AS legalizado,
       u.name AS usuario
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
WHERE f."formType" = 'Fundaciones'
  AND data->>'poaIssue' = 'YES'
ORDER BY f."updatedAt" DESC
```

### 15. Estadísticas generales del sistema
```sql
SELECT
  (SELECT COUNT(*) FROM "Users") AS total_usuarios,
  (SELECT COUNT(*) FROM "Users" WHERE status = 'authorized') AS usuarios_activos,
  (SELECT COUNT(*) FROM "Users" WHERE status = 'pending') AS usuarios_pendientes,
  (SELECT COUNT(*) FROM "Users" WHERE status = 'blocked') AS usuarios_bloqueados,
  (SELECT COUNT(*) FROM "FormData") AS total_formularios,
  (SELECT COUNT(*) FROM "AuditLogs") AS total_logs,
  (SELECT COUNT(*) FROM "DocumentTemplates") AS total_plantillas,
  (SELECT COUNT(*) FROM "SignedDocuments") AS total_docs_firmados
```

---

## Consultas Adicionales Útiles

### Fundadores de todas las fundaciones
```sql
SELECT data->>'foundationNameOption1' AS fundacion,
       elem->>'fullName' AS fundador,
       elem->>'passport' AS pasaporte,
       elem->>'nationality' AS nacionalidad,
       elem->>'email' AS email
FROM "FormData" f
CROSS JOIN LATERAL jsonb_array_elements(data->'founders') AS elem
WHERE f."formType" = 'Fundaciones'
```

### Miembros del consejo de fundación
```sql
SELECT data->>'foundationNameOption1' AS fundacion,
       elem->>'fullName' AS miembro,
       elem->>'passport' AS pasaporte,
       elem->>'phone' AS telefono
FROM "FormData" f
CROSS JOIN LATERAL jsonb_array_elements(data->'councilMembers') AS elem
WHERE f."formType" = 'Fundaciones'
```

### Personas políticamente expuestas (PEP) en formularios KYC
```sql
SELECT f."formType",
       data->>'fullName' AS nombre,
       data->>'legalName' AS entidad,
       data->>'pepDetails' AS detalles_pep,
       u.name AS usuario
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
WHERE data->>'pep' = 'Sí'
```

### Fuentes de fondos más comunes
```sql
SELECT elem::text AS fuente, COUNT(*) AS veces
FROM "FormData" f,
     jsonb_array_elements(data->'fundsSource') AS elem
GROUP BY elem::text
ORDER BY veces DESC
```

### Últimos 20 formularios guardados en el sistema
```sql
SELECT f.id, f."formType", u.name AS usuario, u.email,
       f."createdAt", f."updatedAt"
FROM "FormData" f
JOIN "Users" u ON u.id = f."userId"
ORDER BY f."updatedAt" DESC
LIMIT 20
```

### Usuarios que nunca han creado un formulario
```sql
SELECT u.name, u.email, u."uniqueCode", u.status, u."createdAt"
FROM "Users" u
LEFT JOIN "FormData" f ON f."userId" = u.id
WHERE f.id IS NULL AND u.role = 'client'
ORDER BY u."createdAt" DESC
```

### Actividad reciente del sistema (últimos 7 días)
```sql
SELECT action, COUNT(*) AS total,
       MAX("createdAt") AS ultimo_evento
FROM "AuditLogs"
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY total DESC
```

### Buscar usuarios con intentos de login fallidos
```sql
SELECT name, email, "uniqueCode", "loginAttempts", status, "lockUntil"
FROM "Users"
WHERE "loginAttempts" > 0
ORDER BY "loginAttempts" DESC
```

---

## Notas Importantes

1. **Nombres de tablas**: en PostgreSQL los nombres con mayúsculas deben ir entre comillas dobles: `"Users"`, `"FormData"`, `"AuditLogs"`, etc.

2. **Nombres de columnas**: columnas con camelCase también necesitan comillas dobles: `"formType"`, `"userId"`, `"createdAt"`, `"uniqueCode"`, etc.

3. **JSONB vs texto**: al comparar valores JSONB, usa `->>` para extraer como texto. El operador `->` retorna JSONB.

4. **Conversión numérica**: para comparar números almacenados como texto en JSONB, usa `::numeric`:
   ```sql
   WHERE (data->>'capitalSocial')::numeric > 10000
   ```

5. **Arrays vacíos**: siempre protege contra arrays inexistentes con el patrón CASE:
   ```sql
   CASE WHEN data ? 'directors' AND jsonb_typeof(data->'directors') = 'array'
        THEN data->'directors' ELSE '[]'::jsonb END
   ```

6. **Rendimiento**: las consultas con `jsonb_array_elements` sobre tablas grandes pueden ser lentas. Siempre usa `LIMIT` y filtros `WHERE` específicos.

7. **Seguridad**: el sistema bloquea automáticamente cualquier operación que no sea SELECT. No es posible modificar datos desde esta interfaz.
