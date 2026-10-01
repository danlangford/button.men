# Tasks

## 1. Responsive navigation

- [x] 1.1 Make the signed-in navigation wrap at phone widths while preserving all current links and account controls.
- [x] 1.2 Ensure long player names and dynamic page content do not create page-level horizontal overflow.

## 2. Verification

- [x] 2.1 Add focused regression tests for the responsive navigation and existing viewport metadata.
- [x] 2.2 Verify page-level overflow and reachable navigation controls in Chromium at 320, 375, 393, and 430 CSS pixels, including with a long player name.
- [x] 2.3 Run `npm test`, `npm run build`, and `openspec validate --all --strict`.
