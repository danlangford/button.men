import { BUTTONWEAVERS } from './config.js';

function makeElement(document, tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeLink(document, text, href, className = '') {
  const link = makeElement(document, 'a', className, text);
  link.href = href;
  return link;
}

function formatTime(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : '';
}

function latestFirst(threads) {
  return [...threads].sort((a, b) =>
    Number(b.latestLastUpdateTime || 0) - Number(a.latestLastUpdateTime || 0));
}

export function forumThreadUrl(threadId, postId) {
  const post = postId === undefined || postId === null ? '' : `&postId=${encodeURIComponent(postId)}`;
  return `#!threadId=${encodeURIComponent(threadId)}${post}`;
}

export function buttonweaversThreadUrl(threadId) {
  return `${BUTTONWEAVERS}/ui/forum.html#!threadId=${encodeURIComponent(threadId)}`;
}

export function renderForumOverview(container, data) {
  const document = container.ownerDocument;
  const heading = makeElement(document, 'h1', 'h4 mb-3', 'Forum');
  const boards = makeElement(document, 'div', 'list-group');
  for (const board of data.boards) {
    const link = makeLink(
      document,
      '',
      `#!boardId=${encodeURIComponent(board.boardId)}`,
      'list-group-item list-group-item-action',
    );
    const name = makeElement(document, 'div', 'fw-semibold', board.boardName);
    const description = makeElement(document, 'div', 'small text-body-secondary', board.description);
    link.append(name, description);
    if (board.firstNewPostId !== null && board.firstNewPostId !== undefined) {
      link.append(makeElement(document, 'span', 'badge text-bg-primary mt-2', 'New posts'));
    }
    boards.append(link);
  }
  container.replaceChildren(heading, boards);
}

export function renderForumBoard(container, data) {
  const document = container.ownerDocument;
  const breadcrumb = makeLink(document, 'Forum', '#!', 'small');
  const heading = makeElement(document, 'h1', 'h4 mb-2', data.boardName);
  const description = makeElement(document, 'p', 'text-body-secondary', data.description);
  const threads = makeElement(document, 'div', 'list-group');
  for (const thread of latestFirst(data.threads)) {
    const link = makeLink(
      document,
      '',
      forumThreadUrl(thread.threadId, thread.firstNewPostId),
      'list-group-item list-group-item-action',
    );
    const title = makeElement(document, 'div', 'fw-semibold', thread.threadTitle);
    const activity = makeElement(
      document,
      'div',
      'small text-body-secondary',
      `Latest by ${thread.latestPosterName} · ${formatTime(thread.latestLastUpdateTime)}`,
    );
    link.append(title, activity);
    if (thread.firstNewPostId !== null && thread.firstNewPostId !== undefined) {
      link.append(makeElement(document, 'span', 'badge text-bg-primary mt-2', 'New posts'));
    }
    threads.append(link);
  }
  container.replaceChildren(breadcrumb, heading, description, threads);
}

export function renderForumThread(container, data) {
  const document = container.ownerDocument;
  const breadcrumb = makeLink(document, 'Forum', '#!', 'small');
  const boardLink = makeLink(
    document,
    data.boardName,
    `#!boardId=${encodeURIComponent(data.boardId)}`,
    'small ms-2',
  );
  const heading = makeElement(document, 'h1', 'h4 mb-3', data.threadTitle);
  const posts = makeElement(document, 'div', 'd-grid gap-3');
  const orderedPosts = [...data.posts].sort((a, b) =>
    Number(a.creationTime || 0) - Number(b.creationTime || 0));
  const postElements = new Map();

  for (const post of orderedPosts) {
    const article = makeElement(document, 'article', 'card');
    article.id = `forum-post-${post.postId}`;
    const header = makeElement(document, 'div', 'card-header d-flex justify-content-between gap-2');
    const author = makeElement(document, 'strong', '', post.posterName);
    const time = makeElement(document, 'time', 'small text-body-secondary', formatTime(post.creationTime));
    const date = new Date(Number(post.creationTime) * 1000);
    if (Number.isFinite(date.getTime())) time.dateTime = date.toISOString();
    header.append(author, time);
    if (post.isNew) header.append(makeElement(document, 'span', 'badge text-bg-primary', 'New'));

    const body = makeElement(document, 'div', 'card-body forum-post-body text-break');
    body.style.whiteSpace = 'pre-wrap';
    body.textContent = post.body;
    article.append(header, body);
    posts.append(article);
    postElements.set(String(post.postId), article);
  }

  const reply = makeLink(
    document,
    'Reply on buttonweavers.com',
    buttonweaversThreadUrl(data.threadId),
    'btn btn-outline-primary align-self-start',
  );
  container.replaceChildren(breadcrumb, boardLink, heading, posts, reply);

  const requestedPost = data.currentPostId == null
    ? null
    : postElements.get(String(data.currentPostId));
  const firstUnread = orderedPosts.find((post) => post.isNew);
  const target = requestedPost || (firstUnread && postElements.get(String(firstUnread.postId)));
  target?.scrollIntoView({ block: 'start' });
  return target || null;
}
