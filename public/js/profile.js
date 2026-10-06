import { formatDate } from './search.js';
import { gameViewUrl } from './games.js';
import { profileUrl } from './links.js';
export { profileUrl } from './links.js';
const $ = (document, tag, className = '', text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

function link(document, label, href, className = '') {
  const element = $(document, 'a', className, label);
  element.href = href;
  return element;
}

function profileDetails(document, profile) {
  const list = $(document, 'dl', 'row');
  const fields = [
    ['Real name', profile.name_irl],
    ['Pronouns', profile.pronouns],
    ['Birthday', profile.dob_month && profile.dob_day ? `${profile.dob_month}/${profile.dob_day}` : ''],
    ['Email address', profile.email],
    ['Homepage', profile.homepage],
    ['Favorite button', profile.favorite_button],
    ['Favorite button set', profile.favorite_buttonset],
    ['Member since', formatDate(profile.creation_time)],
    ['Last visit', formatDate(profile.last_access_time)],
    ['Record', `${profile.n_games_won ?? 0} wins · ${profile.n_games_lost ?? 0} losses`],
    ['Comment', profile.comment],
    ['Vacation message', profile.vacation_message],
  ];

  for (const [label, value] of fields) {
    if (value === undefined || value === null || value === '') continue;
    const term = $(document, 'dt', 'col-sm-3', label);
    const detail = $(document, 'dd', 'col-sm-9');
    if (label === 'Homepage') {
      let url;
      try {
        url = new URL(value);
      } catch {
        url = null;
      }
      if (url && ['http:', 'https:'].includes(url.protocol)) {
        const homepage = link(document, value, url.href);
        homepage.target = '_blank';
        homepage.rel = 'noopener noreferrer';
        detail.append(homepage);
      } else {
        detail.textContent = value;
      }
    } else {
      detail.textContent = String(value);
    }
    list.append(term, detail);
  }
  return list;
}

function recentGames(document, games) {
  const list = $(document, 'div', 'list-group');
  for (const game of games || []) {
    const row = $(document, 'div', 'list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2');
    const title = link(document, `Game ${game.gameId}`, gameViewUrl(game.gameId), 'fw-semibold');
    const players = $(document, 'div', 'd-flex flex-wrap align-items-center gap-2');
    const names = [game.playerNameA, game.playerNameB].filter(Boolean);
    names.forEach((name, index) => {
      if (index) players.append($(document, 'span', 'text-body-secondary', 'vs'));
      players.append(link(document, name, profileUrl(name)));
    });
    const detail = $(document, 'div', 'small text-body-secondary');
    detail.textContent = [
      game.status,
      formatDate(game.lastMove),
      game.buttonNameA,
      game.buttonNameB,
    ].filter(Boolean).join(' · ');
    row.append(title, players);
    if (detail.textContent) row.append(detail);
    list.append(row);
  }
  return list;
}

function preferenceInput(document, prefs, name, label, type = 'text', options = {}) {
  const wrapper = $(document, 'div', type === 'checkbox' ? 'form-check mb-3' : 'mb-3');
  const input = $(document, 'input', type === 'checkbox' ? 'form-check-input' : 'form-control');
  input.type = type;
  input.name = name;
  input.id = `profile-${name}`;
  if (type === 'checkbox') {
    input.checked = Boolean(prefs[name]);
  } else {
    input.value = prefs[name] ?? '';
    if (options.min !== undefined) input.min = String(options.min);
    if (options.max !== undefined) input.max = String(options.max);
    if (options.maxlength !== undefined) input.maxLength = options.maxlength;
  }
  const labelElement = $(document, 'label', type === 'checkbox' ? 'form-check-label' : 'form-label', label);
  labelElement.htmlFor = input.id;
  wrapper.append(input, labelElement);
  return wrapper;
}

function preferenceTextarea(document, prefs, name, label, maxlength) {
  const wrapper = $(document, 'div', 'mb-3');
  const labelElement = $(document, 'label', 'form-label', label);
  const input = $(document, 'textarea', 'form-control');
  input.id = `profile-${name}`;
  input.name = name;
  input.value = prefs[name] ?? '';
  input.maxLength = maxlength;
  input.rows = 3;
  wrapper.append(labelElement, input);
  labelElement.htmlFor = input.id;
  return wrapper;
}

function preferenceSelect(document, prefs, name, label, values, valueLabel = (v) => v) {
  const wrapper = $(document, 'div', 'mb-3');
  const labelElement = $(document, 'label', 'form-label', label);
  const select = $(document, 'select', 'form-select');
  select.id = `profile-${name}`;
  select.name = name;
  for (const value of values) {
    const option = $(document, 'option', '', valueLabel(value));
    option.value = String(value);
    option.selected = String(prefs[name] ?? '') === String(value);
    select.append(option);
  }
  wrapper.append(labelElement, select);
  labelElement.htmlFor = select.id;
  return wrapper;
}

function dateSelect(document, prefs, name, label, count, display) {
  const wrapper = $(document, 'div', 'mb-3');
  const labelElement = $(document, 'label', 'form-label', label);
  const row = $(document, 'div', 'd-flex gap-2');
  const month = $(document, 'select', 'form-select');
  month.name = 'dob_month';
  month.id = 'profile-dob_month';
  const day = $(document, 'select', 'form-select');
  day.name = 'dob_day';
  day.id = 'profile-dob_day';
  for (let value = 0; value <= count; value++) {
    const option = $(document, 'option', '', display(value));
    option.value = String(value);
    option.selected = Number(prefs[name]) === value;
    month.append(option);
  }
  for (let value = 0; value <= 31; value++) {
    const option = $(document, 'option', '', value === 0 ? 'Day' : String(value));
    option.value = String(value);
    option.selected = Number(prefs.dob_day) === value;
    day.append(option);
  }
  row.append(month, day);
  wrapper.append(labelElement, row);
  labelElement.htmlFor = month.id;
  return wrapper;
}

function preferenceSection(document, title, children) {
  const section = $(document, 'fieldset', 'border rounded p-3 mb-3');
  section.append($(document, 'legend', 'float-none w-auto px-2 fs-6 fw-semibold', title), ...children);
  return section;
}

const MONTH_NAMES = [
  'Month', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function preferencesForm(document, prefs, onSave) {
  const form = $(document, 'form', 'mt-4');
  form.noValidate = true;
  const status = $(document, 'div', 'alert', '');
  status.hidden = true;
  status.setAttribute('role', 'status');
  const profileFields = [
    preferenceInput(document, prefs, 'name_irl', 'Real name', 'text', { maxlength: 40 }),
    preferenceInput(document, prefs, 'is_email_public', 'Make email address public', 'checkbox'),
    dateSelect(document, prefs, 'dob_month', 'Birthday', 12, (value) => MONTH_NAMES[value]),
    preferenceInput(document, prefs, 'pronouns', 'Pronouns', 'text', { maxlength: 100 }),
    preferenceInput(document, prefs, 'uses_gravatar', 'Use Gravatar for profile image', 'checkbox'),
    preferenceInput(document, prefs, 'image_size', 'Gravatar image size', 'number', { min: 80, max: 200 }),
    preferenceInput(document, prefs, 'favorite_button', 'Favorite button'),
    preferenceInput(document, prefs, 'favorite_buttonset', 'Favorite button set'),
    preferenceInput(document, prefs, 'homepage', 'Homepage', 'url', { maxlength: 100 }),
    preferenceTextarea(document, prefs, 'comment', 'Comment', 255),
    preferenceTextarea(document, prefs, 'vacation_message', 'Vacation message', 255),
  ];
  const automationFields = [
    ['autoaccept', 'Automatically accept challenges'],
    ['autopass', 'Automatically pass when no valid attack exists'],
    ['monitor_redirects_to_game', 'Redirect to waiting games in Monitor mode'],
    ['monitor_redirects_to_forum', 'Redirect to new forum posts in Monitor mode'],
    ['automatically_monitor', 'Automatically Monitor after Next game runs out'],
  ].map(([name, label]) => preferenceInput(document, prefs, name, label, 'checkbox'));
  const gameplayFields = [
    preferenceInput(document, prefs, 'fire_overshooting', 'Enable fire overshooting', 'checkbox'),
  ];
  const colorFields = [
    ['player_color', 'Your color'],
    ['opponent_color', "Opponent's color"],
    ['neutral_color_a', 'Neutral player color'],
    ['neutral_color_b', 'Neutral opponent color'],
  ].map(([name, label]) => preferenceInput(document, prefs, name, label, 'color'));
  const gameFields = [
    preferenceSelect(document, prefs, 'die_background', 'Die background', ['circle', 'symmetric', 'realistic']),
  ];
  const accountFields = [
    preferenceInput(document, prefs, 'email', 'Current email address', 'text'),
    preferenceInput(document, {}, 'current_password', 'Current password', 'password'),
    preferenceInput(document, {}, 'new_password', 'New password', 'password'),
    preferenceInput(document, {}, 'confirm_new_password', 'Confirm new password', 'password'),
    preferenceInput(document, {}, 'new_email', 'New email address', 'text'),
    preferenceInput(document, {}, 'confirm_new_email', 'Confirm new email address', 'text'),
  ];
  const emailInput = accountFields[0].querySelector?.('input');
  if (emailInput) emailInput.readOnly = true;
  form.append(
    preferenceSection(document, 'Profile settings', profileFields),
    preferenceSection(document, 'Automation preferences', automationFields),
    preferenceSection(document, 'Gameplay preferences', gameplayFields),
    preferenceSection(document, 'Color preferences', colorFields),
    preferenceSection(document, 'Game appearance', gameFields),
    preferenceSection(document, 'Account settings', accountFields),
  );
  const save = $(document, 'button', 'btn btn-primary', 'Save preferences');
  save.type = 'submit';
  form.append(save, status);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const current = (name) => form.elements.namedItem(name);
    const values = {};
    for (const name of [
      'name_irl', 'is_email_public', 'dob_month', 'dob_day', 'pronouns',
      'uses_gravatar', 'image_size', 'favorite_button', 'favorite_buttonset',
      'homepage', 'comment', 'vacation_message', 'autoaccept', 'autopass',
      'monitor_redirects_to_game', 'monitor_redirects_to_forum',
      'automatically_monitor', 'fire_overshooting', 'player_color',
      'opponent_color', 'neutral_color_a', 'neutral_color_b', 'die_background',
      'current_password', 'new_password', 'confirm_new_password', 'new_email',
      'confirm_new_email',
    ]) {
      const input = current(name);
      values[name] = input.type === 'checkbox' ? input.checked : input.value;
    }
    const error = values.new_password !== values.confirm_new_password
      ? 'New passwords do not match.'
      : values.new_email !== values.confirm_new_email
        ? 'New email addresses do not match.'
        : '';
    status.hidden = false;
    status.className = `alert ${error ? 'alert-danger' : 'alert-info'}`;
    if (error) {
      status.textContent = error;
      return;
    }
    save.disabled = true;
    let result;
    try {
      result = await onSave(buildPreferenceSaveArgs(prefs, values));
      status.className = `alert ${result.ok ? 'alert-success' : 'alert-danger'}`;
      status.textContent = result.message || (result.ok ? 'Preferences saved.' : 'Could not save preferences.');
    } catch (saveError) {
      status.className = 'alert alert-danger';
      status.textContent = saveError.message || 'Could not save preferences.';
    } finally {
      save.disabled = false;
    }
    if (result?.ok) {
      for (const name of ['current_password', 'new_password', 'confirm_new_password']) {
        const input = current(name);
        if (input) input.value = '';
      }
    }
  });
  return form;
}

export function buildPreferenceSaveArgs(prefs, values) {
  const value = (name) => values[name] ?? prefs[name] ?? '';
  const args = {
    name_irl: value('name_irl'),
    is_email_public: Boolean(value('is_email_public')),
    dob_month: Number(value('dob_month')),
    dob_day: Number(value('dob_day')),
    pronouns: value('pronouns'),
    comment: value('comment'),
    homepage: value('homepage'),
    autoaccept: Boolean(value('autoaccept')),
    autopass: Boolean(value('autopass')),
    fire_overshooting: Boolean(value('fire_overshooting')),
    monitor_redirects_to_game: Boolean(value('monitor_redirects_to_game')),
    monitor_redirects_to_forum: Boolean(value('monitor_redirects_to_forum')),
    automatically_monitor: Boolean(value('automatically_monitor')),
    die_background: value('die_background'),
    player_color: value('player_color'),
    opponent_color: value('opponent_color'),
    neutral_color_a: value('neutral_color_a'),
    neutral_color_b: value('neutral_color_b'),
    uses_gravatar: Boolean(value('uses_gravatar')),
    vacation_message: value('vacation_message'),
  };
  for (const name of ['favorite_button', 'favorite_buttonset']) {
    if (value(name)) args[name] = value(name);
  }
  if (value('image_size') !== '') args.image_size = Number(value('image_size'));
  if (values.current_password) args.current_password = values.current_password;
  if (values.new_password) args.new_password = values.new_password;
  if (values.new_email) args.new_email = values.new_email;
  return args;
}

export function renderProfile(container, profile, {
  isOwn = false,
  preferences,
  preferenceError = '',
  games = [],
  gamesError = '',
  onSave,
  onRetryGames,
  notice = '',
} = {}) {
  const document = container.ownerDocument;
  if (!profile) {
    container.replaceChildren($(document, 'p', 'alert alert-warning', 'Player not found.'));
    return;
  }
  const heading = $(document, 'h1', 'h3 mb-3', profile.name_ingame || 'Player profile');
  const content = $(document, 'div', 'row g-4');
  const details = $(document, 'section', 'col-12 col-lg-8');
  details.append($(document, 'h2', 'h5', 'Profile'), profileDetails(document, profile));
  const side = $(document, 'aside', 'col-12 col-lg-4');
  if (profile.uses_gravatar && /^[a-f\d]{32}$/i.test(profile.email_hash || '')) {
    const image = $(document, 'img', 'img-fluid rounded mb-3');
    const size = Math.min(200, Math.max(80, Number(profile.image_size) || 128));
    image.src = `https://www.gravatar.com/avatar/${profile.email_hash}?s=${size}`;
    image.alt = `${profile.name_ingame || 'Player'} profile image`;
    image.referrerPolicy = 'no-referrer';
    side.append(image);
  }
  side.append($(document, 'h2', 'h5', 'Recent games'));
  if (gamesError) {
    const failure = $(document, 'div', 'alert alert-warning', gamesError);
    if (onRetryGames) {
      const retry = $(document, 'button', 'btn btn-sm btn-outline-warning ms-2', 'Retry');
      retry.type = 'button';
      retry.addEventListener('click', onRetryGames);
      failure.append(retry);
    }
    side.append(failure);
  } else if (!games.length) {
    side.append($(document, 'p', 'text-body-secondary', 'No completed games.'));
  } else {
    side.append(recentGames(document, games));
  }
  content.append(details, side);
  const children = [heading];
  if (notice) children.push($(document, 'div', 'alert alert-success', notice));
  children.push(content);
  if (isOwn) {
    children.push($(document, 'h2', 'h4 mt-4', 'Preferences'));
    if (preferenceError) {
      children.push($(document, 'div', 'alert alert-warning', preferenceError));
    } else if (preferences) {
      children.push(preferencesForm(document, preferences, onSave));
    }
  }
  container.replaceChildren(...children);
}
