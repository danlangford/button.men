# Tasks

## 1. Forum API

- [x] 1.1 Add API wrappers for loading the forum overview, board, and thread; verify arguments and failed responses with API unit tests.

## 2. Forum navigation and boards

- [ ] 2.1 Add a signed-in forum link and render every board with its unread indicator; verify the link and unread-board behavior in web UI tests.
- [ ] 2.2 Render each board's threads in latest-activity order with a first-unread link; verify thread ordering and unread targets in web UI tests.

## 3. Thread reading and reply navigation

- [ ] 3.1 Render posts in order with author and time and scroll the page to the first unread post; verify the rendered page's scroll target in web UI tests.
- [ ] 3.2 Keep post bodies as text and link replies to the matching buttonweavers thread; verify markup-like text is not rendered as HTML and the reply URL in web UI tests.
- [ ] 3.3 Validate the integrated change with `npm test` and `openspec validate --all --strict`.
