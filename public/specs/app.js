import {
  featureAnchor,
  renderSearchResults,
  renderSpecifications,
} from './viewer.js';
import { initThemeControl } from '../js/theme.js';

initThemeControl(document.getElementById('theme'));

const search = document.getElementById('spec-search');
const featureList = document.getElementById('feature-list');
const specifications = document.getElementById('specifications');
const results = document.getElementById('search-results');
const status = document.getElementById('search-status');
const error = document.getElementById('load-error');

function scrollToFragment() {
  document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
}

try {
  const response = await fetch('specifications.json');
  if (!response.ok) throw new Error('Could not load the current specifications.');
  const { features } = await response.json();
  renderSpecifications(specifications, features);

  for (const feature of features) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${featureAnchor(feature.name)}`;
    link.textContent = feature.name.replace(/[-_]/g, ' ');
    item.append(link);
    featureList.append(item);
  }
  if (!features.length) {
    status.textContent = 'No current specifications are available.';
  }

  search.addEventListener('input', () => {
    renderSearchResults(results, status, features, search.value);
  });
  window.addEventListener('hashchange', scrollToFragment);
  scrollToFragment();
} catch {
  error.textContent = 'The current specifications could not be loaded. Please try again later.';
  error.hidden = false;
}
