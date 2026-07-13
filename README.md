# Gestión de Notas

Monorepo con **Turborepo** para una aplicación de gestión de notas escolares. Arquitectura **orientada a eventos** con MongoDB local y app **desktop** (Electron) — sin necesidad de servidor por ahora.

## Estructura

```
gestion-notas/
├── apps/
│   ├── desktop/     # App de escritorio (Electron + React)
│   └── api/         # API REST (para cuando tengas servidor)
└── packages/
    ├── domain/      # Entidades y eventos de dominio
    ├── events/      # Event bus y handlers
    ├── database/    # Repositorios MongoDB + event store
    └── application/ # Casos de uso (crear/editar entidades)
```

## Requisitos

- Node.js 20+
- pnpm 9+
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) corriendo en local (`mongodb://127.0.0.1:27017`)

## Instalación

```bash
cd gestion-notas
pnpm install
cp .env.example .env
pnpm build
```

## Desarrollo

```bash
# App desktop (requiere MongoDB local activo)
pnpm dev:desktop

# API REST (opcional, para futuro)
pnpm --filter @gestion-notas/api dev
```

## Entidades incluidas

| Entidad    | Operaciones      |
|-----------|------------------|
| Usuarios  | Crear, editar, listar |
| Estudiantes | Crear, editar, listar |
| Profesores  | Crear, editar, listar |
| Materias    | Crear, editar, listar |

## Arquitectura orientada a eventos

Cada operación de creación/edición:

1. Ejecuta la lógica de negocio en `@gestion-notas/application`
2. Persiste un **evento de dominio** en la colección `events` de MongoDB
3. Publica el evento en el **Event Bus** para handlers (auditoría, etc.)

Eventos disponibles: `user.created`, `user.updated`, `student.created`, `student.updated`, `teacher.created`, `teacher.updated`, `subject.created`, `subject.updated`.

## Flujo de uso recomendado

1. Crear **usuarios** con rol `student` o `teacher`
2. Crear el perfil de **estudiante** o **profesor** vinculado al usuario
3. Crear **materias** y asignar profesor opcionalmente

## Migración futura a servidor

La capa `@gestion-notas/application` es compartida entre `desktop` y `api`. Cuando tengas presupuesto:

1. Despliega `apps/api` en un VPS/cloud
2. Apunta `MONGODB_URI` a MongoDB Atlas o un servidor dedicado
3. Adapta el frontend para consumir la API en lugar de IPC de Electron

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev:desktop` | Inicia la app de escritorio |
| `pnpm build` | Compila todos los paquetes |
| `pnpm typecheck` | Verifica tipos TypeScript |
