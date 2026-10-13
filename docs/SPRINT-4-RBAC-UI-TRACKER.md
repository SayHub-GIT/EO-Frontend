# Sprint 4 — UI RBAC & User Management

Status: **In progress**. Branch: `feat/s4-1-admin-kecil-role-selector`.

The backend Sprint 3 was merged to `main` in PR #150. This is the separate frontend roadmap. UI changes should follow [anti-slop](https://github.com/miqdadbadjuber/anti-slop), use existing Vuexy/MUI design patterns, avoid ornamental filler, and enforce rights server-side.

- [ ] **S4.1** Super Admin selects event and eligible `Admin_kecil` account from Roles & Permissions, then can inspect/manage genuine event-scoped assignments. **Partial:** selectors rendered; existing staff-access page is linked by event only, so chosen account is informative context, not yet scoped end-to-end.
- [ ] **S4.2** Move Assigned Staff panel to the right and use context-specific labels.
- [ ] **S4.3** Admin Kecil UI creates subordinate users and manages event custom roles/granular permissions.
- [ ] **S4.4** Users table Event column after Email, `Not Set` fallback and long-name wrapping.
- [ ] **S4.5** Effective permission state controls menu/buttons, with backend authorization still mandatory.

## Batch 1

- Added event + active Admin Kecil selection to existing Roles & Permissions page with explicit communication that the staff-access route currently scopes by event only.
- Does not add or modify API endpoints, permission enforcement, accounts, or ownership records.
- **QA gate:** TypeScript/build/CI must pass; do not merge before verification.
