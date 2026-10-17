# Sprint 9 — S9.3-A Camera visibility, keyboard and mobile UI

**Frontend:** `SayHub-GIT/EO-Frontend`  
**Scope:** Small code-verifiable portion of S9.3. Backend, Notion, deployment and real-device QA are unchanged.

## Code changes

- [x] QR scanner stops its owned camera stream and invalidates an in-flight scanner start when the browser tab becomes hidden. Any validated QR context remains intact; the operator can explicitly restart scanning.
- [x] Face Capture aborts pending detection/encoding, stops camera tracks and announces why when its tab becomes hidden. The operator must explicitly choose **Coba foto lagi**. Once a photo is captured, tab hiding does not falsely mark it as a new failure.
- [x] Both visibility listeners are unregistered on unmount; the helper is independently tested with a simulated document.
- [x] A QR validation result moves keyboard focus to the participant heading, showing a visible focus indicator, so keyboard and screen reader users know where to review the ticket before confirming.
- [x] QR and Face Capture expose camera messages via status/alert semantics; face actions have 44px minimum touch targets.
- [x] Check-In method tabs scroll horizontally with readable 14px labels instead of compressing labels below 11px on narrow screens. The QR viewport is 4:3 on phones and 16:9 on larger screens; long booking codes wrap instead of overflowing.
- [x] Six regression tests cover tab visibility, callback cleanup, QR focus, touch targets and responsive assertions in CI.

## Compatibility and safety caveats

The QR scanner has a jsQR fallback when the native `BarcodeDetector` is missing. **Face Capture still requires a native `FaceDetector`**; unsupported browsers fail closed, never skip the required JPEG, and must not be counted as cross-browser compatible. This slice does not introduce an unreviewed third-party cloud face detector.

The 2s retry windows and 30s face capture session are **best-effort**. Camera permission prompts, hardware start and JPEG work are not guaranteed to meet that timing on every device. Face detection does not establish participant identity.

## Owner device and browser QA

- [ ] Desktop Chrome/Edge, Android Chrome and iOS Safari: permission prompt, QR preview, and Face Capture. Record unsupported FaceDetector outcomes; do not turn failures into manual fake success.
- [ ] Hide tab during QR stream startup or while scanning: camera LED turns off and restart works without a stuck spinner.
- [ ] Hide tab during Face Capture or retry: camera stops and UI announces the pause; **Coba foto lagi** restarts without another QR scan.
- [ ] Hide tab after JPEG captured: no duplicate capture, no duplicate Check-In request.
- [ ] Keyboard: move between Scan QR / Manual Check-In / Manual Check-Out using arrow keys, validate QR, then focus moves to participant information; Enter/Space controls work. Screen readers announce waiting, blocked, error, capture success.
- [ ] Test 320px / 375px / 768px / desktop: scroll tabs, 44px touch controls, no horizontal viewport overflow; booking codes and long names wrap.
- [ ] Slow/no camera, denied/busy device, background/foreground, full 30s flow, revoked permissions and 409/5xx backend response.

## Remaining S9.3 work

- [ ] Browser/device testing and cross-browser local FaceDetector strategy before broad rollout.
- [ ] Wider responsive and accessibility audit beyond QR + Face Capture, including keyboard menu focus and attendance filters.
- [ ] S9.4 owner staging E2E and S9.5 release verification remain open.

CI validates source and simulation, **not** the physical camera, a real browser, a deployed backend or WCAG conformance.
