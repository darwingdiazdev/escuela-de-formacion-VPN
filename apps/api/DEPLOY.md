# Despliegue en Render + MongoDB Atlas

La app de **escritorio (Electron) no se elimina**. Puedes usarla en local (o con Atlas)
y además publicar la versión **web** gratis en Render.

## 1. Crear cluster en MongoDB Atlas (gratis)

1. Entra a [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) y crea una cuenta.
2. Crea un cluster **M0 Free**.
3. En **Database Access**, crea un usuario/contraseña.
4. En **Network Access**, agrega `0.0.0.0/0` (permite Render; es el free tier usual).
5. En **Connect → Drivers**, copia la URI, por ejemplo:

```text
mongodb+srv://USUARIO:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

## 2. Desplegar en Render (gratis)

1. Sube este repo a GitHub.
2. En [https://render.com](https://render.com) → **New** → **Blueprint**.
3. Conecta el repo (usa `render.yaml`).
4. En variables de entorno, completa:
   - `MONGODB_URI` = tu connection string de Atlas
   - `MONGODB_DB` = `gestion_notas` (o el nombre que quieras)
   - `AUTH_SECRET` = se puede autogenerar
   - `CORS_ORIGIN` = la URL de Render, ej. `https://gestion-notas.onrender.com` (opcional)
5. Espera el deploy. Abre la URL pública.

Usuario demo (se crea solo si no existe):

```text
admin@VPN / admin123
```

Prueba rápida:

```text
GET https://TU-APP.onrender.com/health
```

Debe responder `{ "status": "ok", "mode": "api", ... }`.

> El plan free de Render **duerme** el servicio ~15 min sin tráfico. La primera visita puede tardar ~1 minuto.

## 3. App de escritorio con Atlas (opcional)

En tu `.env` local:

```env
MONGODB_URI=mongodb+srv://USUARIO:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=gestion_notas
```

Luego:

```bash
pnpm dev:desktop
```

Así Electron y la web comparten la misma base.

## 4. Desarrollo local de la web

```bash
# Terminal 1 — API
pnpm --filter @gestion-notas/api dev

# Terminal 2 — Web (proxy a :3001)
pnpm --filter @gestion-notas/web dev
```

Abre `http://localhost:5174`.

## Notas

- Un solo servicio Render sirve **API + UI web**.
- La app Electron sigue igual con `pnpm dev:desktop`.
- Cambia `admin123` en producción cuando puedas.
