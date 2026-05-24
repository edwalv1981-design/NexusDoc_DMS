# Un solo paso (login / base de datos)

Perdón por la confusión anterior. **Solo haga esto:**

## 1. Ejecute

En la carpeta del proyecto, doble clic en:

**`ARREGLAR-LOGIN.bat`**

## 2. En el navegador (se abre solo)

1. **Connect**
2. **Session pooler** — puerto **5432**
3. Copie la **URI**
4. Sustituya **`[YOUR-PASSWORD]`** por la contraseña real de la base de datos

## 3. En la ventana negra

Pegue **una sola línea** (la URI completa) cuando pida `DATABASE_URL:` y pulse Enter.

Espere. El script migra, crea el admin y despliega en Fly.

## 4. Entrar

- https://nexusdoc-dms.fly.dev/dashboard  
- Email: `edwinalvarezvivero@yahoo.com`  
- Contraseña: la que dejó en el script (`U3m3O2CJz1wnZegcsTYt`)

---

**Si falla con “Tenant or user not found”** y usted pegó bien la URI de Connect (Session pooler 5432, contraseña correcta):

- El proyecto Supabase puede estar **pausado** → Restaure en el panel.
- O está en la **cuenta de Supabase equivocada**.

No use otros scripts ni pasos manuales; solo `ARREGLAR-LOGIN.bat`.
