# Gestión de Notas

Monorepo con **Turborepo** para gestión de notas de la Escuela de formación bíblica.
Incluye app **desktop (Electron)** y versión **web** desplegable en **Render + MongoDB Atlas**.

## Estructura

```
gestion-notas/
├── apps/
│   ├── desktop/     # App de escritorio (Electron + React)
│   ├── web/         # UI web (misma interfaz, consume la API)
│   └── api/         # API REST (Render / local)
└── packages/
    ├── domain/
    ├── events/
    ├── database/
    └── application/
```

## Requisitos

- Node.js 20+
- pnpm 9+
- MongoDB local **o** MongoDB Atlas

## Instalación

```bash
cd gestion-notas
pnpm install
cp .env.example .env
pnpm build
```

## Desarrollo

```bash
# App desktop (Mongo local o Atlas vía MONGODB_URI)
pnpm dev:desktop

# API + web (navegador)
pnpm --filter @gestion-notas/api dev
pnpm --filter @gestion-notas/web dev
```

Usuario demo: `admin@VPN` / `admin123`

## Despliegue gratis (Render + Atlas)

Guía paso a paso: [`apps/api/DEPLOY.md`](apps/api/DEPLOY.md)

Resumen:

1. Crea un cluster free en MongoDB Atlas
2. Conecta el repo en Render con el `render.yaml`
3. Define `MONGODB_URI` (y `MONGODB_DB`)
4. Abre la URL de Render — la UI y la API van juntas

La app de escritorio **no se pierde**; puede seguir usándose en las PCs de la iglesia.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev:desktop` | App de escritorio |
| `pnpm --filter @gestion-notas/api dev` | API REST |
| `pnpm --filter @gestion-notas/web dev` | UI web |
| `pnpm build` | Compila todos los paquetes |
| `pnpm typecheck` | Verifica tipos TypeScript |
