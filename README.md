# Trama CoWork - Backend

Backend de la plataforma Trama CoWork: un sistema de gestion de perfiles profesionales para espacios de coworking. Permite registro de profesionales con formulario de 9 secciones, validacion manual (preparado para IA), carga de documentos, taxonomia jerarquica de profesiones, busqueda avanzada y notificaciones por email.

## Tech Stack

- **NestJS 11** - Framework backend
- **Prisma** - ORM + migraciones
- **PostgreSQL 16** - Base de datos
- **Docker / Docker Compose** - Contenedores
- **nodemailer** - Envio de emails
- **Swagger** - Documentacion de API en `/docs`
- **JWT** - Autenticacion

## Estructura del proyecto

```
src/
├── admin/                  # Validacion de perfiles, gestion de jobs y pagos
├── auth/                   # Registro, login, JWT
├── categories/             # Categorias generales
├── community/              # Funcionalidades de comunidad
├── contacts/               # Contactos entre profesionales
├── dashboard/              # Dashboard del usuario
├── jobs/                   # Ofertas laborales
├── mail/                   # Modulo de email (factory pattern)
│   ├── templates/          # Templates HTML (aprobacion, rechazo)
│   └── transports/         # Console, SMTP, Gmail
├── onboarding/             # Checklist de onboarding (9 secciones)
├── payments/               # Pagos
├── prisma/                 # PrismaService (singleton)
├── profession-categories/  # Taxonomia jerarquica de profesiones (3 niveles)
├── professionals/          # Perfiles profesionales (CRUD por seccion)
├── search/                 # Busqueda avanzada con 6 filtros
└── uploads/                # Carga de documentos (StorageService interface)

prisma/
├── schema.prisma           # Schema de la base de datos
├── migrations/             # Migraciones
├── seed.ts                 # Script de seed
└── profession-taxonomy.ts  # Datos de taxonomia (7 categorias, ~150 profesiones)

sdd/                        # Documentacion de diseño y planes
```

## Requisitos previos

- [Docker](https://www.docker.com/) y Docker Compose

## Instalacion y setup

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd trama-cowork/backend
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` segun sea necesario. Para desarrollo, los valores por defecto funcionan sin cambios.

### 3. Levantar el proyecto

```bash
docker compose up -d
```

Esto levanta:
- **db** (`trama_db`) - PostgreSQL 16 en puerto `5432`
- **app** (`trama_app_dev`) - NestJS con hot reload en puerto `3000`

### 4. Ejecutar migraciones

```bash
docker compose exec app npx prisma migrate deploy
```

### 5. Ejecutar seeds

```bash
docker compose exec app npx prisma db seed
```

### 6. Verificar

- App: http://localhost:3000
- Swagger docs: http://localhost:3000/docs

## Comandos utiles

### Docker

| Comando | Descripcion |
|---------|-------------|
| `docker compose up -d` | Levantar todos los servicios |
| `docker compose down` | Detener todos los servicios |
| `docker compose logs app -f` | Ver logs de la app en tiempo real |
| `docker compose restart app` | Reiniciar la app (necesario si el watcher no detecta cambios) |
| `docker compose exec app sh` | Abrir shell dentro del contenedor |

### Prisma

Todos los comandos de Prisma se ejecutan dentro del contenedor:

| Comando | Descripcion |
|---------|-------------|
| `docker compose exec app npx prisma migrate dev --name <nombre>` | Crear nueva migracion |
| `docker compose exec app npx prisma migrate deploy` | Aplicar migraciones pendientes |
| `docker compose exec app npx prisma migrate status` | Ver estado de migraciones |
| `docker compose exec app npx prisma migrate reset` | Reset completo (drop + migrate + seed) |
| `docker compose exec app npx prisma db seed` | Ejecutar seeds |
| `docker compose exec app npx prisma generate` | Regenerar Prisma Client |
| `docker compose exec app npx prisma studio` | Abrir Prisma Studio (GUI de la DB) |

### NestJS

| Comando | Descripcion |
|---------|-------------|
| `docker compose exec app npm run build` | Compilar el proyecto |
| `docker compose exec app npm run lint` | Ejecutar linter |
| `docker compose exec app npm run test` | Ejecutar tests |

### Base de datos directa

```bash
# Conectarse a psql
docker compose exec db psql -U trama -d trama_cowork

# Ver migraciones aplicadas
docker compose exec db psql -U trama -d trama_cowork -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;"
```

## Variables de entorno

| Variable | Requerida | Default | Descripcion |
|----------|-----------|---------|-------------|
| `POSTGRES_USER` | No | `trama` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | No | `trama_secret` | Password de PostgreSQL |
| `POSTGRES_DB` | No | `trama_cowork` | Nombre de la base de datos |
| `DATABASE_URL` | Si | - | Connection string de PostgreSQL |
| `JWT_SECRET` | Si | - | Secreto para firmar tokens JWT |
| `JWT_EXPIRES_IN` | No | `7d` | Duracion de los tokens |
| `PORT` | No | `3000` | Puerto de la app |
| `NODE_ENV` | No | `development` | Entorno de ejecucion |
| `MAIL_PROVIDER` | No | - | Transporte de email: `smtp`, `gmail` o vacio (console) |
| `MAIL_FROM` | No | `noreply@trama.com` | Direccion del remitente |
| `SMTP_HOST` | Solo si smtp | - | Host del servidor SMTP |
| `SMTP_PORT` | Solo si smtp | `587` | Puerto SMTP |
| `SMTP_SECURE` | Solo si smtp | `false` | Usar TLS |
| `SMTP_USER` | Solo si smtp | - | Usuario SMTP |
| `SMTP_PASS` | Solo si smtp | - | Password SMTP |
| `GMAIL_USER` | Solo si gmail | - | Cuenta de Gmail |
| `GMAIL_APP_PASSWORD` | Solo si gmail | - | App Password de Gmail |

## Sistema de email

El modulo de email usa un patron **Abstract Factory** con inyeccion de dependencias:

- **Sin `MAIL_PROVIDER`** (desarrollo): usa `ConsoleTransport`, que loguea los emails al stdout
- **`MAIL_PROVIDER=smtp`**: usa nodemailer con configuracion SMTP generica
- **`MAIL_PROVIDER=gmail`**: usa nodemailer con servicio Gmail + App Password

Los templates disponibles son:
- **Perfil aprobado**: email de bienvenida a la comunidad
- **Perfil rechazado**: email con observaciones del revisor

## Produccion

Para levantar en modo produccion:

```bash
docker compose --profile prod up -d app-prod db
```

Esto usa el target `production` del Dockerfile (build optimizado, sin hot reload).

## Notas importantes

- El **file watcher** de NestJS dentro de Docker a veces no detecta cambios desde Windows. Si los cambios no se reflejan, ejecutar `docker compose restart app`.
- Las dependencias se instalan con `--legacy-peer-deps` debido a conflictos de versiones entre `class-validator` y `@nestjs/mapped-types`.
- Los uploads se almacenan en un volumen Docker (`uploads_data`). El sistema usa una interfaz `StorageService` preparada para migrar a S3.
