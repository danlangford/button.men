# Design

## Context

See [proposal.md](proposal.md) for motivation and [spec.md](specs/forum/spec.md) for requirements. The existing client is a small vanilla-JavaScript application that relays authenticated JSON API calls through the worker. Buttonweavers returns forum boards, threads, posts, unread flags, and first-unread post IDs; it orders board threads by latest activity and thread posts by creation time.

The upstream API contract is documented in `/tmp/buttonmen/src/api/ApiSpec.php` (`loadForumOverview`, `loadForumBoard`, and `loadForumThread`); `BMInterfaceForum::load_forum_board` and `BMInterfaceForum::load_forum_thread` define ordering and unread data. Upstream `Forum.showPage` and `Forum.buildPostRow` use the requested post ID to target a post, while `Env.prepareRawTextForDisplay` escapes raw post text before interpreting markup.

## Goals / Non-Goals

**Goals:**
- Use the existing API and session proxy for all forum data.
- Provide a direct forum navigation link in the signed-in application and responsive board, thread, and post views.
- Open threads at their first unread post, including when opened from an unread marker.
- Keep post bodies inert as raw text.

**Non-Goals:**
- Creating or editing forum content, changing read state, or implementing forum BB-code formatting.
- Changing buttonweavers API behavior or storing forum data.

## Decisions

- Add small client API wrappers for overview, board, and thread reads, and render the views in the existing application. This keeps credentials and forum state on the existing buttonweavers session/API rather than introducing another service or dependency.
- Use upstream-provided board/thread unread IDs and `isNew` post flags to identify the first unread post. Pass an explicitly selected post ID to `loadForumThread`, then scroll the rendered post into view; if no post was selected, use the first unread post in the returned chronological list.
- Create elements and assign post bodies, titles, names, and descriptions through `textContent`; do not parse or assign post-body HTML. This deliberately leaves BB-code-looking text unformatted, avoiding an unsafe or partial markup parser.
- Link reply actions directly to the corresponding buttonweavers thread. This satisfies the read-only boundary without building posting flows.

## Risks / Trade-offs

- [BB-code is displayed literally] → This keeps arbitrary user-authored post content safe; formatting can be added later with a dedicated, tested parser if required.
- [Unread state can change between listing and opening a thread] → Prefer the post ID returned by the thread response's `isNew` flags when no explicit target was requested.

## Migration Plan

No data migration or new configuration is needed. Deploy the static client and worker together. Rollback by reverting the client changes; the existing API and stored data remain unchanged.
