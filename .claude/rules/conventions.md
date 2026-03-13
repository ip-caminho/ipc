# Conventions

## Brazilian Standards
- **Documents**: CPF (11 digits), CNPJ (14 digits), RG
- **Phone**: Brazilian format + WhatsApp (E.164: +5511999991111)
- **Dates**: Format dd/MM/yyyy for display, YYYY-MM-DD for storage

## State Management
1. URL state → **nuqs** (filters, tabs, pagination)
2. Form input → **React Hook Form**
3. Local UI → **useState**

## Key Rules
- Zod 4: `import { z } from "zod/v4"`
- shadcn/ui mandatory for all UI components
- Feature-based organization
- Convex mutations for writes, queries for reads
- Audit trail on all entity changes
- CPF/RG masked in audit logs
