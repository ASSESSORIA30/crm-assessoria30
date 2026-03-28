# CRM Assessoria 3.0

CRM vertical per a assessories energètiques. Next.js 14 + NestJS + Prisma + PostgreSQL.

---

## ⚡ Posar en marxa en 15 minuts

### Prerequisits

```bash
node --version   # >= 20
pnpm --version   # >= 9  (npm i -g pnpm)
# PostgreSQL running localment (o Supabase)
```

---

### 1. Clonar i instal·lar

```bash
git clone <repo-url> crm-assessoria30
cd crm-assessoria30
pnpm install
```

---

### 2. Variables d'entorn

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm_assessoria30"
JWT_SECRET="canvia-aquest-valor-xxxxxxxxxxxxxxxxxx"
JWT_REFRESH_SECRET="un-altre-valor-diferent-yyyyyyyyyyyyyy"
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

> Si uses Supabase, copia la connection string del dashboard.

---

### 3. Base de dades

```bash
# Crear la BD i taules
pnpm db:push

# Poblar amb dades de mostra
pnpm db:seed
```

Output esperat:
```
✅ Seed completat!
  admin@assessoria30.cat  / admin1234
  juan@assessoria30.cat   / juan1234
  maria@assessoria30.cat  / maria1234
```

---

### 4. Arrencar

```bash
# Terminal 1 — Backend
cd apps/api
pnpm dev
# → http://localhost:3001

# Terminal 2 — Frontend
cd apps/web
pnpm dev
# → http://localhost:3000
```

O des de l'arrel:
```bash
pnpm dev   # arrenca tot en paral·lel
```

---

### 5. Obrir el CRM

```
http://localhost:3000
```

Fes clic en qualsevol compte de demo o introdueix:
- **Admin:** admin@assessoria30.cat / admin1234
- **Col·laborador:** juan@assessoria30.cat / juan1234
- **Comercial:** maria@assessoria30.cat / maria1234

---

## Estructura del projecte

```
crm-assessoria30/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Models de BD
│   │   │   └── seed.ts         # Dades de demo
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── prisma/         # PrismaService
│   │       ├── common/         # Guards, decoradors
│   │       └── modules/
│   │           ├── auth/       # Login, JWT, refresh
│   │           ├── users/      # Equip, jerarquia
│   │           ├── clients/    # CRUD clients
│   │           ├── supplies/   # CRUD CUPS
│   │           └── opportunities/ # Pipeline + dashboard
│   │
│   └── web/                    # Next.js 14 frontend
│       └── src/
│           ├── app/
│           │   ├── (auth)/login/      # Pàgina de login
│           │   └── (dashboard)/
│           │       ├── dashboard/     # Dashboard comercial
│           │       ├── clients/       # Llistat + ficha + new
│           │       ├── supplies/      # Llistat
│           │       └── opportunities/ # Pipeline
│           ├── components/
│           │   ├── layout/    # Sidebar, Topbar, AuthGuard
│           │   └── dashboard/ # ActionModal
│           ├── lib/           # api.ts, utils.ts
│           └── stores/        # auth.store.ts (Zustand)
│
├── .env.example
├── package.json               # Monorepo root
├── pnpm-workspace.yaml
└── turbo.json
```

---

## API

Base URL: `http://localhost:3001/api/v1`

| Mètode | Ruta | Descripció |
|--------|------|-----------|
| POST | /auth/login | Login |
| POST | /auth/refresh | Renovar token |
| GET  | /auth/me | Usuari actual |
| GET  | /clients | Llistat clients |
| POST | /clients | Crear client |
| GET  | /clients/:id | Fitxa client |
| PATCH| /clients/:id | Actualitzar |
| GET  | /supplies | Llistat suministraments |
| POST | /supplies | Crear suministrament |
| GET  | /opportunities/dashboard | Dashboard comercial |
| GET  | /opportunities | Pipeline |
| POST | /opportunities | Crear oportunitat |
| PATCH| /opportunities/:id/stage | Canviar stage |
| POST | /opportunities/:id/activities | Registrar activitat |

---

## Credencials de demo

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@assessoria30.cat | admin1234 |
| Col·laborador | juan@assessoria30.cat | juan1234 |
| Comercial | maria@assessoria30.cat | maria1234 |

---

## Pròxims passos

1. **Sprint 2** — Comparatives, contractes, activitat
2. **Sprint 3** — Scoring automàtic, importació Excel
3. **Fase 3** — OCR factures, copilot IA

---

## Problemes freqüents

**Error de connexió a BD:**
```bash
# Verificar que PostgreSQL funciona
psql -U postgres -c "\l"
# Crear la BD manualment si cal
psql -U postgres -c "CREATE DATABASE crm_assessoria30;"
```

**Error de migració Prisma:**
```bash
pnpm db:push --force-reset   # Reseteja i refà les taules
pnpm db:seed                  # Torna a poblar
```

**Port ocupat:**
```bash
# Canviar el port de l'API a .env.local
API_PORT=3002
# I actualitzar el frontend
NEXT_PUBLIC_API_URL="http://localhost:3002"
```
 
 
