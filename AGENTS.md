# Reglas de Oro del Proyecto — NexusDoc DMS

## 1. Despliegue Obligatorio en Railway
- Todo cambio o modificación realizada en el código (backend, frontend, base de datos, configuraciones, plantillas o scripts) debe ser desplegado inmediatamente en **Railway**.
- Tras realizar los cambios en el repositorio, hacer `git commit` y `git push` a la rama principal (`main`) para disparar el build automático en Railway (`https://nexusdocdms-production.up.railway.app`).
- Verificar la salud de la aplicación post-despliegue mediante el checklist automático de smoke (`npm run check:deploy:prod` / `node scripts/deploy-smoke-check.mjs`).

## 2. No Romper la Funcionalidad Existente (Retrocompatibilidad Estricta)
- Toda mejora o nueva funcionalidad agregada debe ser **aditiva y 100% no destructiva**.
- Está strictly prohibido alterar contratos de API existentes, estructuras de datos en BDD (`JSONB`), nombres de plantillas, flujos de autenticación o la lógica de generación de PDFs en `puppeteer`.
- El sistema debe seguir operando con total normalidad para trámites existentes y usuarios activos mientras se incorporan las nuevas mejoras.

## 3. Explicación Detallada Post-Despliegue
- Una vez completado el despliegue de cualquier cambio o funcionalidad, se debe presentar siempre un **informe ejecutivo claro, transparente y estructurado**.
- Dicho informe debe explicar exactamente:
  1. Qué archivos y módulos fueron modificados o creados.
  2. Qué problema o funcionalidad resuelve el despliegue.
  3. El resultado de las verificaciones en vivo tras el despliegue.
