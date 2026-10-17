# Sprint 9 — S9.1 Event Workspace Sidebar

**Frontend repo:** `SayHub-GIT/EO-Frontend`  
**Backend reference:** `syberke/EO-Backend` (unchanged)  
**Scope:** Sidebar event isolation, feature visibility and regression coverage. No deployment or hardware testing.

## Changes in this batch

- Sidebar event scope is resolved **only after** the authoritative `GET /admin/event-workspace` response. A missing/failed workspace request fails closed rather than temporarily showing a session-derived menu.
- Global Admin sees event-level sections for the event selected in the route; assigned Admin Kecil / subordinate sees **only the assigned event**, never a different route event.
- Unassigned, ambiguous and permission-required statuses do not expose event-specific actions.
- Scoped accounts use the effective `workspace.permissions` list; a stale or unrelated global-role flag does not elevate their menu.
- Event feature menus load `/admin/events/{id}/experience`, validate event response identity (when supplied), and show only enabled modules plus required permission:
  - participants + `registration.read` → Participant Management
  - quiz + `quiz.read` / `quiz.manage` → Quiz Configuration
  - doorprize + `doorprize.read` / `doorprize.manage` → Doorprize Configuration
  - race-pack + `event.update` → Merchandise
  - certificates + `certificates.read` / `certificates.manage` → E-Certificate
  - reports + `event.read` → Reports
- Pending/failed module loading produces no speculative module menu. Global pages and the existing Vuexy/MUI styling remain unchanged.
- Eight regression tests are included in Linux CI.

## Limits and remaining work

This is menu-level usability gating; the **backend remains the access-control authority** and must deny unauthorized direct URLs/API requests. No changes were made to `check-ins` routing, photo capture or registration permissions. Check-ins/List Attendance menu policy and ordering are S9.2. Browser/mobile navigation checks, camera compatibility, full staging RBAC E2E and deployment are separate acceptance gates.

## Owner manual QA

- [ ] Super Admin with event A selected sees only A's enabled event modules; selecting B changes the menu without A's leftover entries.
- [ ] Admin Kecil assigned A remains linked to A even when the address bar contains B. Verify Backend returns authorization failure for forged B URL/API access.
- [ ] Staff without module permission cannot see it even if the module is enabled; staff with permission cannot see it if the module is disabled.
- [ ] Unassigned, ambiguous, permission_required, expired session, permission revocation, 403/500 event-experience response: no stale/event-crossed items appear.
- [ ] Responsive sidebar collapsed/expanded at 320px, keyboard navigation, icon labels, focus indicator and sensible loading transition.
- [ ] Validate existing dashboard, create/edit, registrations, quiz, doorprize and reports links against the actual deployed Backend.

**Next:** S9.2 — Check-in & Out and List Attendance items follow their **distinct** effective permissions; Settings order and navigation consistency.
