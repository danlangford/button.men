export function filterSpecs(specs, query) {
  const term = query.trim().toLowerCase();
  if (!term) return specs;
  return specs.filter(({ name, content }) =>
    `${name} ${content}`.toLowerCase().includes(term),
  );
}

function featureTitle(name) {
  return name.replaceAll('-', ' ');
}

export function renderSpecs(specs, index, list, status, document) {
  index.replaceChildren();
  list.replaceChildren();
  status.textContent = `${specs.length} ${specs.length === 1 ? 'feature' : 'features'}`;

  if (!specs.length) {
    status.textContent = 'No matching specifications.';
    return;
  }

  for (const spec of specs) {
    const id = `spec-${spec.name}`;
    const link = document.createElement('a');
    link.className = 'btn btn-sm btn-outline-secondary';
    link.href = `#${id}`;
    link.textContent = featureTitle(spec.name);
    index.append(link);

    const details = document.createElement('details');
    details.id = id;
    details.className = 'border rounded p-3 mb-3';
    const summary = document.createElement('summary');
    summary.className = 'fw-semibold';
    summary.textContent = featureTitle(spec.name);
    const content = document.createElement('pre');
    content.className = 'mb-0 mt-3';
    content.textContent = spec.content;
    details.append(summary, content);
    list.append(details);
  }
}

async function start() {
  const index = document.getElementById('spec-index');
  const list = document.getElementById('spec-list');
  const status = document.getElementById('spec-status');
  const search = document.getElementById('spec-search');
  try {
    const response = await fetch('/specs.json');
    if (!response.ok) throw new Error('Could not load specifications.');
    const specs = await response.json();
    const update = () => renderSpecs(specs ? filterSpecs(specs, search.value) : [], index, list, status, document);
    search.addEventListener('input', update);
    window.addEventListener('hashchange', () => {
      const feature = document.getElementById(location.hash.slice(1));
      if (feature?.tagName === 'DETAILS') feature.open = true;
    });
    update();
    const selected = document.getElementById(location.hash.slice(1));
    if (selected?.tagName === 'DETAILS') {
      selected.open = true;
      selected.scrollIntoView();
    }
  } catch {
    status.textContent = 'Specifications could not be loaded. Please try again later.';
  }
}

if (typeof document !== 'undefined') start();
