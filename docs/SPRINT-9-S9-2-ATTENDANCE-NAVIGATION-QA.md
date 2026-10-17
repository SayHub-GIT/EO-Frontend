# Sprint 9 — S9.2 Attendance Navigation and Settings Order

**Frontend:** `SayHub-GIT/EO-Frontend`  
**Backend contract:** `syberke/EO-Backend` (read-only; permissions `attendance.checkin`, `attendance.checkout`, `attendance.read`)

## Changes

- Check-in & Out is visible when the **effective** permission set grants either `attendance.checkin` or `attendance.checkout`. Possessing `attendance.read` alone does not imply permission to execute an operation.
- List Attendance is visible only when the **effective** permission grants `attendance.read` and a selected or assigned event ID is available; it links to `/admin/events/{eventId}/attendance`.
- Global Admin may access `/admin/check-ins` without an event in the route, and choose an event in the operator screen. The read-only List Attendance link does not guess an event.
- Both Vuexy vertical sidebar and optional horizontal menu use the same pure visibility predicate. Horizontal navigation also resolves the authoritative `/admin/event-workspace` response before showing admin-only links and uses the assigned event for scoped operators.
- Navigation **About** is placed before **Settings**, with Settings last in both admin layouts; horizontal Settings groups Terms & Privacy and SMTP as the existing vertical layout does.
- Ten focused tests cover check-in-only, checkout-only, read-only, combined, event-less, unassigned, scoped event isolation, UI permission contracts, both navigation layouts, and Settings order. These run in the Linux CI gate.

## Owner acceptance tests

- [ ] Read-only staff with `attendance.read`: **List Attendance** visible, **Check-in & Out** hidden; direct attempts to mutate attendance are rejected by the Backend.
- [ ] Check-in-only staff: **Check-in & Out** visible, **List Attendance** hidden, and Check-Out controls remain disabled unless separately authorized.
- [ ] Check-out-only staff: **Check-in & Out** visible, **List Attendance** hidden, and Check-In controls remain disabled unless separately authorized.
- [ ] Staff with both operation and read permissions: both entries visible for the assigned event.
- [ ] Admin Kecil/event staff assigned to event A must never get a sidebar link to event B. Confirm API denies forged event B access (menu visibility is not an authorization boundary).
- [ ] Global Admin with no selected event: Check-in & Out may open event selector, while the List Attendance link stays hidden until an event workspace is selected.
- [ ] Unassigned, expired or revoked workspace, backend 403/500: protected entries fail closed. Verify re-login/navigation revalidates effective permissions.
- [ ] Vertical and horizontal layouts, expanded/collapsed/mobile drawer, focus, keyboard and 320px viewport; **Settings** remains last, after About.
- [ ] Deploy/production smoke tests and cross-browser camera QA are not performed by CI and remain owner-owned.

## Next

S9.3 responsiveness, focus/accessibility, and browser-specific camera regressions; S9.4 staging E2E and S9.5 release verification remain open.
