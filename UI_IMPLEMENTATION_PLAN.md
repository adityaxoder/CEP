# EmotionIQ UI Implementation Plan

This document is the Phase 1 UI reference plan. Each numbered item is intentionally scoped so it can be requested and implemented independently in a separate prompt.

## How to use this plan

Ask for one item at a time, for example:

- `Do UI task 1`
- `Implement task 14`
- `Do tasks 18 and 19`

The UI should remain fully demonstrable without a backend. Mock analysis responses must use the same response shape expected from the future FastAPI backend.

## Manual browser review rule

The development agent must not automatically open, browse, screenshot, or inspect the running application URL. After each implementation task, the agent should provide a short manual checklist describing exactly what the project owner should open and verify themselves.

The project owner performs the browser review manually. Each task's `Manual test` section is the checklist to follow. Report any visual, interaction, responsive, or accessibility issue found during that review before starting the next task.

## Current UI principles

- EmotionIQ provides estimates based on observable cues; it does not diagnose emotions or reveal internal states.
- The interface should be calm, clear, privacy-aware, and usable on desktop and mobile.
- Every visible button must perform a real action.
- Every screen must have a useful empty, loading, success, and error state where applicable.
- Raw image and audio files must not be stored by the mock frontend.
- Backend integration must later replace the mock client without requiring a redesign.

---

## Application foundation

### 1. Verify the project setup

**Goal:** Confirm that the frontend can be installed, developed, linted, and built.

**Work:**

- Confirm `frontend/package.json` contains working scripts.
- Run `npm install` when dependencies are unavailable.
- Run `npm run dev` from the `frontend/` directory.
- Run `npm run lint`.
- Run `npm run build`.
- Confirm the app opens at the Vite development URL.
- Confirm the current source tree and entry points are understood.

**Completion criteria:**

- Development server starts successfully.
- Lint passes.
- Production build passes.
- No editor errors exist in the main source files.

**Manual test:** Open the local URL and confirm the first screen renders without console-breaking errors.

### 2. Define the application state model

**Goal:** Make application state predictable before adding more screens.

**Work:**

- Define valid page identifiers: `text`, `image`, `voice`, `multimodal`, `analysis`, `history`, and `settings`.
- Define authentication state for the local demo.
- Define session history state.
- Define the selected analysis result state.
- Define how reset, sign-out, and clear-history affect state.
- Prevent invalid page identifiers from rendering blank screens.

**Completion criteria:**

- State ownership is clear in `App.jsx` or a small existing state layer.
- Invalid navigation falls back to the Text screen.
- Sign-out resets the appropriate local session state.

**Manual test:** Navigate between every page and refresh the app without seeing an unsupported route.

### 3. Fix and complete header navigation

**Goal:** Ensure the header is a real, accessible application navigation system.

**Work:**

- Render all supported navigation items.
- Add active styling for the current page.
- Add `aria-current="page"` to the active item.
- Ensure navigation buttons use valid page identifiers.
- Make the EmotionIQ brand button return to Text analysis.
- Add Settings navigation.
- Handle horizontal overflow on small screens.
- Ensure keyboard users can reach every navigation item.

**Completion criteria:**

- Every navigation button opens a real screen.
- Active state is visually and semantically available.
- The brand button does not navigate to an unsupported `analyze` page.

**Manual test:** Use only the keyboard to visit every header destination.

### 4. Wire session history into the application

**Goal:** Store completed mock analyses during the current browser session.

**Work:**

- Import and render `HistoryPage` from `App.jsx`.
- Add a history array to session state.
- Add a callback for successful analysis completion.
- Store request ID, time, result, and provided modalities.
- Add a clear-history callback.
- Keep history session-only unless persistence is explicitly added later.

**Completion criteria:**

- A successful analysis appears in History.
- History survives navigation within the session.
- History clears when the clear action is used.
- Empty history has a useful explanation.

**Manual test:** Complete an analysis, open History, confirm the entry, clear it, and confirm the empty state.

### 5. Establish shared UI conventions

**Goal:** Keep screens visually and behaviorally consistent.

**Work:**

- Use shared section-card styles.
- Use consistent button variants.
- Use consistent spacing and border radii.
- Use the existing color variables for confidence and status states.
- Use Lucide icons consistently.
- Define shared focus-visible behavior.
- Avoid one-off inline styles where an existing class can express the behavior.

**Completion criteria:**

- Primary, secondary, danger, disabled, and loading button states look consistent.
- Cards and panels use the same layout language.
- Focus styles are visible across controls.

**Manual test:** Compare buttons and cards across login, analysis, results, history, and settings screens.

---

## Account and privacy screens

### 6. Complete the local demo login screen

**Goal:** Make login and signup understandable without pretending real authentication exists.

**Work:**

- Keep login and signup modes if they support the demonstration.
- Label the screen as local demo authentication.
- Validate required email and password fields.
- Use `type="email"` for email.
- Use `type="password"` for passwords.
- Add password confirmation for signup.
- Show readable validation errors.
- Keep form labels associated with inputs.
- Prevent submission when required fields are missing.

**Completion criteria:**

- Empty submission enters the workspace.
- Arbitrary text enters the workspace.
- Signup mode also accepts arbitrary text.
- No fake account is implied to be stored remotely.

**Manual test:** Try empty login, arbitrary login text, empty signup, and arbitrary signup text.

### 7. Add sign-out behavior

**Goal:** Make account exit a real, testable action.

**Work:**

- Add a sign-out action in Settings.
- Return the user to Login.
- Reset the current page to Text.
- Decide whether session history should be cleared on sign-out and document that behavior.
- Prevent protected workspace screens from rendering while signed out.

**Completion criteria:**

- Sign-out always returns to Login.
- Back navigation does not expose an unusable protected screen.
- The behavior is consistent with the local demo model.

**Manual test:** Create a result, sign out, sign in again, and verify the documented session behavior.

### 8. Build the Privacy and Settings screen

**Goal:** Give users a visible place to understand privacy and control local data.

**Work:**

- Add a Settings page and navigation item.
- Explain mock-mode processing.
- Explain that results are estimates.
- Explain that raw media is not stored by the mock UI.
- Show the number of session history entries.
- Add clear-history action.
- Add sign-out action.
- Explain that real backend processing will require a separate privacy review.
- Add disabled states when there is no history to clear.

**Completion criteria:**

- Settings is reachable from the header.
- Privacy statements are visible and understandable.
- Clear history works from Settings.
- Sign-out works from Settings.

**Manual test:** Open Settings with zero history and with existing history.

### 9. Add privacy messaging to analysis flow

**Goal:** Ensure consent is visible at the moment content is submitted.

**Work:**

- Show the consent notice near the submit button.
- Require acknowledgement before analysis.
- Explain that outputs are estimates only.
- Explain what mock mode does with selected files.
- Make the checkbox label keyboard accessible.
- Preserve the consent state only for the relevant active form or clearly reset it.

**Completion criteria:**

- Analysis cannot start without consent.
- The notice is readable on mobile.
- The notice does not claim backend guarantees that are not implemented.

**Manual test:** Attempt submission with and without consent.

---

## Analysis input screens

### 10. Complete the Text analysis screen

**Goal:** Provide a polished text-only workflow.

**Work:**

 Keep the form intentionally permissive because this is not real authentication.
 Allow any text in the demo fields.
 Allow the demo form to submit even when fields are empty.
 Clearly state that authentication rules will be added with the real backend.
 Keep field labels and autocomplete hints for a realistic future-ready layout.
- Add error and retry behavior.

**Completion criteria:**

**Manual test:** Submit short text, long text, whitespace, reset, and retry scenarios.

### 11. Complete the Image upload screen

**Goal:** Provide safe and understandable image selection.

**Work:**

- Provide a remove button.
- Clear the native file input after removal.
- Show readable validation errors.
**Completion criteria:**

- Valid image previews correctly.
- Invalid type is rejected.
- Oversized image is rejected.
- Remove returns the component to its empty state.

**Manual test:** Select a valid image, invalid file, oversized file, remove it, and submit image-only analysis.

### 12. Complete the Voice upload screen

**Goal:** Provide safe and understandable audio selection.

**Work:**

- Accept the documented audio formats.
- Validate audio MIME type.
- Validate maximum file size.
- Show selected filename and size.
- Show a voice/audio indicator.
- Provide a remove button.
- Clear the native file input after removal.
- Show readable validation errors.
- Do not attempt browser playback unless playback controls are intentionally designed.

**Completion criteria:**

- Valid audio can be selected.
- Invalid type is rejected.
- Oversized audio is rejected.
- Remove returns to the empty state.
- Voice-only analysis can be submitted in mock mode.

**Manual test:** Select valid and invalid audio files and submit a voice-only analysis.

### 13. Build the Multimodal input screen

**Goal:** Let users combine any available signals in one request.

**Work:**

- Render text, image, and voice controls together.
- Explain that any combination is valid.
- Make missing modalities visually clear.
- Require at least one input.
- Preserve all selected inputs while loading.
- Show validation errors without hiding other inputs.
- Reset all inputs together.

**Completion criteria:**

- Text-only, image-only, voice-only, and mixed combinations work.
- No modality is sent when it was not provided.
- The UI does not imply that all three modalities are required.

**Manual test:** Submit every one-modality combination and a three-modality request.

### 14. Add disabled-submit explanations

**Goal:** Make disabled controls understandable instead of mysterious.

**Work:**

- Explain when no input has been provided.
- Explain when consent is missing.
- Explain when a file validation error exists.
- Keep the explanation near the submit button.
- Ensure disabled buttons remain keyboard understandable where possible.

**Completion criteria:**

- Users can tell why submission is unavailable.
- The explanation updates as inputs and consent change.
- The message does not conflict with visible validation errors.

**Manual test:** Check the submit area in every invalid state.

### 15. Add upload and processing feedback

**Goal:** Make waiting states clear and calm.

**Work:**

- Show spinner or progress indicator during mock processing.
- Disable duplicate submissions.
- Preserve selected content during processing.
- Use an accessible live status or status region.
- Ensure the loading state cannot resize the layout unexpectedly.
- Explain that processing may take a moment.

**Completion criteria:**

- Loading is visible immediately.
- Duplicate clicks do not create duplicate history entries.
- The app returns to success or error predictably.

**Manual test:** Submit and click repeatedly during the loading delay.

---

## Mock analysis and results

### 16. Create the mock analysis service

**Goal:** Make the entire UI demonstrable without a backend.

**Work:**

- Keep the service in `src/api/emotionClient.js` or a dedicated mock module.
- Use the planned `POST /analyze` response shape.
- Return `requestId`.
- Return `modalities.text`, `modalities.image`, and `modalities.audio`.
- Return `null` for unprovided or unavailable modalities.
- Return `mismatch` data.
- Return an optional `suggestion`.
- Keep the service behind an environment-controlled switch.

**Completion criteria:**

- Default local UI works without backend configuration.
- Mock response shape matches the documented backend contract.
- Real API mode can later be enabled without changing components.

**Manual test:** Inspect the result in the UI for one and multiple modalities.

### 17. Add realistic mock modality results

**Goal:** Make demo output useful rather than generic placeholder text.

**Work:**

- Add text labels such as Calm, Concerned, Positive, or Neutral.
- Add image labels describing visible cues without claiming internal truth.
- Add voice labels describing vocal delivery.
- Include confidence values from 0 to 1.
- Include concise explanations for each modality.
- Vary output by provided modalities or sample text where practical.

**Completion criteria:**

- Each provided modality has a label, confidence, and explanation.
- Missing modalities return `null`.
- Copy consistently uses estimate language.

**Manual test:** Compare text-only, image-only, voice-only, and multimodal output.

### 18. Add mock mismatch and suggestion behavior

**Goal:** Demonstrate the product’s core multimodal value.

**Work:**

- Detect when available mock modality labels differ.
- Return `detected: true` only when appropriate.
- Provide a clear mismatch description.
- Provide an optional communication suggestion.
- Avoid presenting mismatch as proof of deception or hidden emotion.

**Completion criteria:**

- Multimodal mock samples can show both matching and mismatching cues.
- Mismatch content is understandable and non-diagnostic.
- Suggestions are optional and do not replace user judgement.

**Manual test:** Submit a multimodal sample and confirm the warning and suggestion appear correctly.

### 19. Add mock loading and failure scenarios

**Goal:** Make all service states demonstrable.

**Work:**

- Add a short mock delay.
- Add a documented sample trigger for an error.
- Return a readable error message.
- Preserve the last submitted payload for retry.
- Add a retry button.
- Add reset after error.
- Ensure failed requests are not added to history.

**Completion criteria:**

- Loading, success, error, retry, and reset states all work.
- Error copy explains what the user can do next.
- History contains successful runs only.

**Manual test:** Use the documented mock error trigger, retry, then submit a successful sample.

### 20. Build the Results screen

**Goal:** Present analysis results in a clear, uncertainty-aware layout.

**Work:**

- Show a results heading and request context.
- Render Text, Image, and Voice modality cards.
- Show missing modalities as not provided.
- Show unavailable processed modalities distinctly.
- Show confidence percentage and visual bar.
- Show confidence category such as confident, moderate, or uncertain.
- Show explanation text.
- Show mismatch notice when detected.
- Show communication suggestion when provided.
- Keep the disclaimer visible.

**Completion criteria:**

- Results never invent a missing modality.
- Confidence values are displayed consistently.
- Mismatch and suggestion sections are conditionally rendered.
- Results remain readable on small screens.

**Manual test:** Inspect results with zero, one, two, and three modalities.

### 21. Add result reset and repeat-analysis actions

**Goal:** Make it easy to start another analysis.

**Work:**

- Add reset controls from input screens.
- Allow navigation from Results back to an input mode.
- Ensure old results do not appear as the new request is loading.
- Preserve history when resetting the current analysis.
- Avoid accidental deletion of history when resetting inputs.

**Completion criteria:**

- A user can complete multiple analyses in one session.
- Each successful result is stored independently.
- Reset does not corrupt previous history entries.

**Manual test:** Complete two different analyses and verify both remain in History.

---

## History, responsive behavior, and accessibility

### 22. Complete the History screen

**Goal:** Make session history useful for demonstration and review.

**Work:**

- Show an empty state with a route back to analysis.
- Show the number of runs.
- Show time for each run.
- Show used modalities.
- Show modality labels and confidence.
- Show mismatch tag when applicable.
- Add clear-history control.
- Confirm history is session-only.
- Keep long labels from breaking the layout.

**Completion criteria:**

- Empty and populated states are both useful.
- Clear action works.
- History list is readable on mobile.

**Manual test:** Populate several entries, review them, clear them, and return to an empty state.

### 23. Add responsive desktop, tablet, and mobile layouts

**Goal:** Make the complete UI usable at common viewport sizes.

**Work:**

- Test approximately 1440px desktop.
- Test approximately 1024px tablet.
- Test approximately 768px tablet/mobile boundary.
- Test approximately 390px mobile.
- Stack multimodal cards on narrow screens.
- Keep navigation usable when it overflows.
- Prevent buttons and labels from overflowing.
- Keep file names truncated safely.
- Keep headings and explanatory text readable.

**Completion criteria:**

- No horizontal page overflow caused by the UI.
- No overlapping text or controls.
- Inputs, buttons, cards, and notices fit their containers.

**Manual test:** Inspect every primary screen at desktop, tablet, and mobile widths.

### 24. Complete keyboard navigation

**Goal:** Ensure the UI works without a mouse.

**Work:**

- Tab through login and signup controls.
- Tab through header navigation.
- Operate text input and submit controls.
- Operate file picker controls.
- Operate remove and reset controls.
- Operate consent checkbox.
- Operate history clear and settings actions.
- Ensure focus is visible.
- Ensure no keyboard trap exists.

**Completion criteria:**

- Every interactive control is reachable.
- Focus order follows the visual workflow.
- Focus styles are visible against the background.

**Manual test:** Complete a full analysis workflow using only keyboard input.

### 25. Complete screen-reader and semantic accessibility

**Goal:** Make meaning and state available to assistive technology.

**Work:**

- Use one meaningful page heading per screen.
- Associate labels and inputs.
- Add landmarks such as `main`, `nav`, `header`, and `footer`.
- Add accessible names to icon-only buttons.
- Add `aria-current` for active navigation.
- Add `role="alert"` for errors and critical mismatch notices.
- Add live status messaging for loading.
- Add meaningful image alt text.
- Avoid using color alone to communicate confidence.

**Completion criteria:**

- Accessibility tree contains meaningful names and roles.
- Errors and loading states are announced or clearly exposed.
- Icons do not replace necessary text labels.

**Manual test:** Inspect the browser accessibility tree and use a screen reader when available.

### 26. Improve empty states

**Goal:** Ensure no screen feels broken when it has no data.

**Work:**

- Add a useful empty analysis state.
- Add a useful empty history state.
- Add empty input guidance.
- Add a clear call to action for each empty state.
- Explain what will appear after the user acts.

**Completion criteria:**

- Every empty screen explains the next action.
- Empty states do not expose dead buttons.
- Empty content is visually and semantically distinct from errors.

**Manual test:** Open every screen before submitting any analysis.

### 27. Remove dead controls and unused code

**Goal:** Ensure the polished UI has no unfinished interactions.

**Work:**

- Check every button handler.
- Check every navigation target.
- Remove unused components or imports.
- Remove stale comments describing obsolete behavior.
- Confirm every reset and remove action updates state.
- Confirm every CTA has a destination or action.

**Completion criteria:**

- No visible control is inert.
- No navigation target renders a blank screen.
- Lint has no unused-code findings.

**Manual test:** Click every visible button at least once.

---

## Verification and documentation

### 28. Add focused frontend tests or testable scenarios

**Goal:** Protect the most important UI behavior.

**Work:**

- Test login validation behavior.
- Test consent gating.
- Test empty-input validation.
- Test image validation.
- Test audio validation.
- Test successful mock response handling.
- Test mock error and retry behavior.
- Test history insertion and clearing.
- Test settings sign-out.

**Completion criteria:**

- High-risk user flows have repeatable checks.
- Test scenarios cover both valid and invalid states.
- Failures identify the affected UI behavior clearly.

**Manual test:** Run the focused checks after each related UI change.

### 29. Run final quality checks

**Goal:** Confirm Phase 1 is technically clean.

**Work:**

- Run `npm run lint`.
- Run `npm run build`.
- Check editor diagnostics.
- Open the dev server.
- Test all page destinations.
- Test mock one-modality and multimodal flows.
- Test error and unavailable-service states.
- Test desktop and mobile layout.
- Check browser console for relevant errors.

**Completion criteria:**

- Lint passes.
- Build passes.
- No relevant editor errors remain.
- All acceptance scenarios work without a backend.

**Manual test:** Follow the full demonstration script from login through sign-out.

### 30. Document the finished UI and backend handoff

**Goal:** Make the completed UI easy for the team to use and integrate later.

**Work:**

- Update root README with the UI status.
- Document mock mode behavior.
- Document the mock error trigger.
- Document environment variables.
- Document the response contract.
- Document all available screens.
- Document known limitations.
- Record the backend integration point.
- Record how to disable mock mode.

**Completion criteria:**

- A new teammate can run and demonstrate the UI.
- A backend teammate knows the exact request and response contract.
- The README does not claim that backend features already exist.

**Manual test:** Ask someone unfamiliar with the codebase to run the documented demo.

### 31. Declare Phase 1 UI complete

**Goal:** Formally confirm that the frontend is ready for backend integration.

**Phase 1 acceptance checklist:**

- Login/signup demo works with validation.
- Text analysis works in mock mode.
- Image upload and preview work.
- Voice upload and preview work.
- Multimodal analysis works.
- Results show labels, confidence, explanations, mismatch, and suggestions.
- History stores successful session results.
- History can be cleared.
- Settings explains privacy and supports sign-out.
- Loading, error, unavailable, empty, and retry states work.
- Every navigation item opens a real screen.
- Every visible button performs a real action.
- Desktop, tablet, and mobile layouts work.
- Keyboard and semantic accessibility requirements are covered.
- Lint and build pass.
- The UI can be demonstrated without a backend.

**Output:**

- The project is ready for the backend phase.
- Backend integration can begin by replacing the mock client behind the existing API contract.
