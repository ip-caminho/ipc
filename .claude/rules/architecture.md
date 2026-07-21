# Architecture

## Frontend
```
app/
├── (auth)/       # Public routes (signin, convite)
├── (ready)/      # Authenticated routes with sidebar
features/         # Domain modules
├── {feature}/
│   ├── components/
│   ├── hooks/
│   └── lib/      # constants.ts, validations.ts
shared/
├── components/ui/     # shadcn/ui primitives
├── components/auth/   # PermissionGate, AuthGuard
├── components/layout/ # Sidebar, Header
├── providers/         # Convex, Permissions
├── hooks/             # useIsMobile
└── lib/               # utils, validations
```

## Backend (convex/)
```
convex/
├── schema.ts         # All tables
├── auth/             # Auth system (Password provider, auth config)
├── entidades/        # Entity CRUD
├── membros/          # Member CRUD, self-service, invites
├── gravacoes/        # Recordings CRUD
├── preferencias/     # RBAC
├── audit/            # Audit logs
├── _shared/          # auditHelpers, phoneUtils
└── http.ts           # HTTP routes
```

## Path Aliases
```
@/*          # root
@features/*  # features/
@shared/*    # shared/
@convex/*    # convex/
```
