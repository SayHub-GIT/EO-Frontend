# Sprint 9 — S9.3-B Attendance Mobile and Accessibility

**Frontend repo:** `SayHub-GIT/EO-Frontend`  
**Scope:** List Attendance mobile layout, explicit keyboard/screen reader actions, private photo dialog semantics. No Backend/Notion/deployment changes.

## Implemented

- [x] Four statistics cards display one column on narrow phones, two columns on tablet-sized screens, four on desktop. Existing server totals, status mapping and layout components remain unchanged.
- [x] The mobile attendance list is a named section containing individually named articles; long names/booking codes wrap instead of forcing viewport overflow.
- [x] Both desktop and mobile photo actions name their participant for assistive technologies, with 44px minimum target height. Registered participants without a Check-In timestamp see **Foto belum tersedia** instead of an inaccessible disabled button.
- [x] Attendance pagination labels first/previous/next/last page actions in Indonesian, wraps controls on narrow screens and preserves existing server-driven page size and URL filters.
- [x] The attendance count announces list changes using a polite status region; the empty-results state is also exposed.
- [x] The private photo dialog has a descriptive participant association, loading text, warning announcement, touch-friendly buttons, and retains abort/object-URL cleanup.
- [x] Seven automated regressions added to the Linux CI gate; all existing server-authoritative list and permissions code retained.

## Accessibility and release limitations

Automated source checks and unit tests validate the implementation; they do **not** establish WCAG conformance or prove the responsive behavior on physical devices. The Backend still enforces read permission and private photo access, and a Check-In timestamp does not guarantee a photo is present (the dialog gracefully handles 403/404).

## Owner manual QA

- [ ] 320px, 375px, 768px and desktop widths: four statistic cards, long names/booking codes, filter grid, mobile articles, pagination, no horizontal page scrolling.
- [ ] Keyboard Tab/Shift+Tab: reach filters, reset, **Lihat foto**, pagination, and dialog close/retry. Ensure focus returns to the trigger on dialog close.
- [ ] Screen reader: announce article name, row count updates, pagination direction, photo action + participant name, loading state, 403/404 warning and successful private image description.
- [ ] Check-In missing: no actionable photo button. Check-In present but photo not stored: clear warning in authorized dialog.
- [ ] Event switching, revoked `attendance.read`, stale results, rapid filter changes, 403/500: data is not leaked or displayed for another event.
- [ ] Test both vertical/horizontal admin menus and Check-In camera UX on real browsers. In particular, native `FaceDetector` remains unsupported on some devices, so full S9.3 cross-browser acceptance is still open.

## Next checkpoints

- **S9.3-C / remaining S9.3:** audit remaining admin surfaces and actual cross-browser/mobile behavior before claiming S9.3 accepted.
- **S9.4:** staging E2E across account scopes and photo/attendance workflows (owner).
- **S9.5:** deployment preview, release verification and rollback (owner).
