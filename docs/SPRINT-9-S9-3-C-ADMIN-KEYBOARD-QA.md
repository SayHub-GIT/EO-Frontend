# Sprint 9 — S9.3-C Admin Keyboard & Responsive Audit

**Repository:** `SayHub-GIT/EO-Frontend` (frontend only)  
**Scope:** Mobile menu toggles, Users table and actions, Roles selectors and actions. No backend, Notion, or deployment changes.

## Code fixes

- [x] Both vertical and horizontal admin mobile navigation toggles use genuine MUI `IconButton` controls rather than click-only decorative icons. Each button announces **Buka/Tutup menu navigasi**, exposes `aria-expanded`, respects the existing breakpoint and provides a 44px target.
- [x] The Users table keeps its existing horizontal scroll on phones, but the overflow region is now keyboard-focusable, visibly focused and named. The table and column/row headers have semantics, so keyboard and screen reader users can identify account rows.
- [x] Mobile Users search and role filter occupy the available width instead of enforcing desktop-sized minimum widths.
- [x] Users Edit/Delete actions announce the target account and have touch-friendly targets. Existing read/create/update/delete permission checks and self-deletion protection remain intact.
- [x] Roles Admin Kecil/event selectors, cards and long names wrap at small viewports. Edit/View and Delete actions announce the specific role while preserving role permission gates and system-role protection.
- [x] User/Role edit dialogs have explicit accessible names through their title association.
- [x] Eight focused regression tests cover both nav layouts, keyboard scroll, row/header semantics, RBAC and responsive controls, added to Linux CI.

## Owner acceptance — browser/physical device

- [ ] At 320px, 375px and tablet sizes, verify both vertical and horizontal layout menu toggles work with keyboard Tab, Enter, Space and pointer/touch; the button announces expanded/collapsed correctly and remains visible.
- [ ] Navigate the open mobile drawer using keyboard and screen reader, ensure backdrop/Escape closes it and focus does not become trapped or lost.
- [ ] Open Users at 320px: Tab to the labeled table region, horizontal scroll via keyboard, row and column headers announced, filter fields do not force whole-page horizontal overflow.
- [ ] Verify Edit/Delete action names include the correct account; RBAC disabled states and self-deletion restrictions stay enforced.
- [ ] Open Roles on a phone: event selector and Admin Kecil selector occupy one column, long role names/permission chips do not overflow; action buttons wrap and remain 44px tall.
- [ ] In both dialogs test focus entry/return, Escape, keyboard interactions, loading and errors. Compare permission-revoked and scoped user sessions with staging backend authorization.
- [ ] Test Chrome/Edge/Firefox/Safari where available, reduced motion, zoom 200%, and touch/mobile screen reader. Real devices and E2E remain owner-owned.

## Remaining release gates

This completes a **source-level S9.3-C slice**, not full browser or WCAG acceptance. S9.3-A/B/C automated fixes are implemented, but native `FaceDetector` is still unavailable on some browsers and must never be bypassed to force Check-In success. Broad rollout requires an approved local/browser-compatible detector or documented supported-device policy, plus physical camera and staging tests.

**S9.4:** staging end-to-end permissions, attendance and private photo flows.  
**S9.5:** deployment smoke checks, release verification and rollback.
