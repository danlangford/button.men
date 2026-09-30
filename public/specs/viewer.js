function slug(value) {
  return value.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
}

export function featureAnchor(feature) {
  return `feature-${slug(feature)}`;
}

export function requirementAnchor(feature, requirement, occurrence = 1) {
  const suffix = occurrence > 1 ? `-${occurrence}` : '';
  return `requirement-${slug(feature)}-${slug(requirement)}${suffix}`;
}

export function specificationSections(features) {
  return features.flatMap(({ name, markdown }) => {
    const sections = [];
    const counts = new Map();
    let requirement = 'Overview';
    let lines = [];

    function saveSection() {
      const text = lines.join('\n').trim();
      if (!text) return;
      const occurrence = requirement === 'Overview' ? 1 : (counts.get(requirement) || 0) + 1;
      counts.set(requirement, occurrence);
      sections.push({
        feature: name,
        requirement,
        anchor: requirement === 'Overview'
          ? featureAnchor(name)
          : requirementAnchor(name, requirement, occurrence),
        text,
      });
    }

    for (const line of markdown.split(/\r?\n/)) {
      const match = line.match(/^###\s+Requirement:\s*(.+)$/i);
      if (match) {
        saveSection();
        requirement = match[1].trim();
        lines = [line];
      } else {
        lines.push(line);
      }
    }
    saveSection();
    return sections;
  });
}

export function searchSpecifications(features, query) {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return [];
  return specificationSections(features)
    .filter((section) => section.text.toLocaleLowerCase().includes(term))
    .map((section) => {
      const text = section.text.replace(/\s+/g, ' ').trim();
      const index = text.toLocaleLowerCase().indexOf(term);
      const start = Math.max(0, index - 70);
      const end = Math.min(text.length, index + term.length + 110);
      return { ...section, context: `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}` };
    });
}

function appendText(parent, tagName, text, className) {
  const element = parent.ownerDocument.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

export function renderSpecifications(container, features) {
  const document = container.ownerDocument;
  container.replaceChildren();

  for (const feature of features) {
    const article = document.createElement('article');
    article.className = 'mb-5';
    container.append(article);
    const counts = new Map();
    const heading = appendText(article, 'h2', feature.name.replace(/[-_]/g, ' '), 'h3 mb-3');
    heading.id = featureAnchor(feature.name);

    let list;
    let paragraph = [];
    const flushParagraph = () => {
      if (paragraph.length) appendText(article, 'p', paragraph.join(' '));
      paragraph = [];
    };

    for (const line of feature.markdown.split(/\r?\n/)) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        list = null;
        const level = Math.min(headingMatch[1].length + 1, 6);
        const requirementMatch = headingMatch[2].match(/^Requirement:\s*(.+)$/i);
        const title = requirementMatch ? requirementMatch[1].trim() : headingMatch[2];
        const element = appendText(article, `h${level}`, title, 'mt-3');

        if (requirementMatch) {
          const occurrence = (counts.get(title) || 0) + 1;
          counts.set(title, occurrence);
          element.id = requirementAnchor(feature.name, title, occurrence);
          const link = appendText(element, 'a', '§', 'ms-2 text-decoration-none small');
          link.href = `#${element.id}`;
          link.setAttribute('aria-label', `Link to ${title}`);
        }
      } else if (!line.trim()) {
        flushParagraph();
        list = null;
      } else if (listMatch) {
        flushParagraph();
        if (!list) {
          list = document.createElement('ul');
          article.append(list);
        }
        appendText(list, 'li', listMatch[1]);
      } else {
        list = null;
        paragraph.push(line.trim());
      }
    }
    flushParagraph();
  }
}

export function renderSearchResults(container, status, features, query) {
  const results = searchSpecifications(features, query);
  container.replaceChildren();

  if (!query.trim()) {
    status.textContent = 'Search specifications by keyword.';
    return results;
  }
  if (!results.length) {
    status.textContent = 'No matching results.';
    return results;
  }

  status.textContent = `${results.length} matching ${results.length === 1 ? 'result' : 'results'}.`;
  for (const result of results) {
    const item = container.ownerDocument.createElement('li');
    item.className = 'mb-3';
    const link = appendText(item, 'a', `${result.feature} — ${result.requirement}`);
    link.href = `#${result.anchor}`;
    appendText(item, 'p', result.context, 'small text-body-secondary mb-0');
    container.append(item);
  }
  return results;
}
