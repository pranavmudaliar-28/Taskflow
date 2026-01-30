# TaskFlow Pro

## Overview

TaskFlow Pro is a full-stack project management and task tracking application built with React, Express, and PostgreSQL. It provides Kanban-style task boards, time tracking, team collaboration features, and analytics dashboards. The application uses Replit Auth for authentication and supports multi-tenant organizations with role-based access control.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Build Tool**: Vite with path aliases (`@/` for client src, `@shared/` for shared code)

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API with `/api` prefix
- **Authentication**: Replit Auth integration using OpenID Connect (OIDC) with Passport.js
- **Session Management**: Express sessions stored in PostgreSQL via connect-pg-simple
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Storage
- **Database**: PostgreSQL (required via DATABASE_URL environment variable)
- **Schema Location**: `shared/schema.ts` - contains all table definitions using Drizzle
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization

### Key Data Models
- **Users**: Managed by Replit Auth (stored in `users` table)
- **Organizations**: Multi-tenant workspaces with member roles (admin, team_lead, member)
- **Projects**: Belong to organizations, can be public or private
- **Tasks**: Kanban-style with statuses (todo, in_progress, in_review, testing, done) and priorities
- **Time Logs**: Track time spent on tasks
- **Comments**: Task discussions
- **Notifications**: User alerts for assignments, mentions, and status changes

### Authentication Flow
- Uses Replit Auth OIDC provider at `https://replit.com/oidc`
- Session-based authentication with cookies
- Protected routes use `isAuthenticated` middleware
- User data synced to local database on login via `upsertUser`

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/   # UI components including shadcn/ui
│       ├── pages/        # Route pages
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Utilities and constants
├── server/           # Express backend
│   ├── replit_integrations/auth/  # Replit Auth setup
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database access layer
│   └── db.ts         # Database connection
├── shared/           # Shared code between client/server
│   ├── schema.ts     # Drizzle schema definitions
│   └── models/       # Type definitions
└── migrations/       # Drizzle migration files
```

## External Dependencies

### Database
- PostgreSQL database via `DATABASE_URL` environment variable
- Uses `pg` driver with Drizzle ORM

### Authentication
- Replit Auth (OIDC provider)
- Requires `SESSION_SECRET` environment variable
- Requires `REPL_ID` environment variable (auto-provided by Replit)

### UI Libraries
- Radix UI primitives for accessible components
- Lucide React for icons
- date-fns for date formatting
- Embla Carousel for carousel components

### Development Tools
- Vite for frontend bundling with HMR
- ESBuild for production server bundling
- TypeScript for type safety across the stack