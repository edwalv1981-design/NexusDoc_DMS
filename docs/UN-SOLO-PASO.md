# Un solo paso (login / base de datos)

**Solo haga esto:**

## 1. Ejecute

En la carpeta del proyecto, doble clic en:

**`ARREGLAR-LOGIN.bat`**

Se abre Supabase en **Connect** (Session pooler, puerto 5432). Copie la URI que muestra el panel.

## 2. Pegue y escriba la contraseña

En la ventana negra:

1. Pulse **Enter** cuando le indique que copió en Connect.
2. **Pegue** la URI de Connect (puede traer `[YOUR-PASSWORD]`; no hace falta cambiarla).
3. **Escriba** solo la contraseña de **base de datos** del proyecto (la que puso al crear o al resetear).

Espere. El script prueba la conexión, migra, crea el admin y despliega en Fly.

## Entrar

- https://nexusdoc-dms.fly.dev/dashboard  
- Email: `edwinalvarezvivero@yahoo.com`  
- Contraseña de la app: la que dejó en el script (`U3m3O2CJz1wnZegcsTYt`)

---

**Si falla** y usted pegó la URI de Connect y escribió la contraseña correcta de base de datos:

- El proyecto Supabase puede estar **pausado** → Restaure en el panel.
- O está en la **cuenta de Supabase equivocada**.

No use otros scripts; solo `ARREGLAR-LOGIN.bat`.
