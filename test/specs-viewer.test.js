import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  featureAnchor,
  renderSearchResults,
  renderSpecifications,
  requirementAnchor,
  searchSpecifications,
  specificationSections,
} from '../public/specs/viewer.js';
import { read } from './helpers.js';

function fakeDocument() {
  const document = {
    createElement(tagName) {
      return {
        tagName,
        ownerDocument: document,
        children: [],
        attributes: {},
        append(...children) { this.children.push(...children); },
        replaceChildren(...children) { this.children = children; },
        setAttribute(name, value) { this.attributes[name] = value; },
        get textContent() {
          return (this.text || '') + this.children.map((child) => child.textContent).join('');
        },
        set textContent(value) {
          this.text = String(value);
          this.children = [];
        },
      };
    },
  };
  return document;
}

function allElements(element) {
  return [element, ...element.children.flatMap(allElements)];
}

const features = [{
  name: 'account-access',
  markdown: [
    '# Account access',
    '',
    '## Purpose',
    'Visitors can sign in.',
    '',
    '### Requirement: Secure access',
    'The site SHALL protect accounts.',
    '',
    '#### Scenario: Correct password',
    '- **WHEN** a visitor enters a valid password',
    '- **THEN** the account opens.',
    '',
    '### Requirement: Unsafe source',
    '<script>not executable</script>',
  ].join('\n'),
}];

test('specs viewer: search - finds case-insensitive requirement and overview content', () => {
  const password = searchSpecifications(features, 'PASSWORD');
  assert.equal(password.length, 1);
  assert.equal(password[0].feature, 'account-access');
  assert.equal(password[0].requirement, 'Secure access');
  assert.match(password[0].context, /valid password/);
  assert.equal(searchSpecifications(features, 'visitors').at(0).requirement, 'Overview');
  assert.deepEqual(searchSpecifications(features, 'not present'), []);
  assert.deepEqual(searchSpecifications(features, '  '), []);
});

test('specs viewer: direct links - feature and requirements have stable matching anchors', () => {
  const sections = specificationSections(features);
  assert.equal(sections[0].anchor, featureAnchor('account-access'));
  assert.equal(sections[1].anchor, requirementAnchor('account-access', 'Secure access'));

  const document = fakeDocument();
  const container = document.createElement('main');
  renderSpecifications(container, features);
  const elements = allElements(container);
  assert.equal(elements.filter((element) => element.id === featureAnchor('account-access')).length, 1);
  const requirement = elements.find((element) => element.id === sections[1].anchor);
  assert.ok(requirement);
  assert.ok(elements.some((element) => element.href === `#${requirement.id}`));
});

test('specs viewer: source content - renders text without interpreting HTML', () => {
  const document = fakeDocument();
  const container = document.createElement('main');
  renderSpecifications(container, features);
  const elements = allElements(container);
  assert.ok(elements.some((element) => element.text === '<script>not executable</script>'));
  assert.equal(elements.some((element) => element.tagName === 'script'), false);
});

test('specs viewer: search results - link to matching requirement and report no matches', () => {
  const document = fakeDocument();
  const results = document.createElement('ul');
  const status = document.createElement('p');
  const found = renderSearchResults(results, status, features, 'password');
  assert.equal(found.length, 1);
  assert.equal(allElements(results).find((element) => element.tagName === 'a').href, `#${found[0].anchor}`);
  assert.match(status.textContent, /1 matching result/);

  renderSearchResults(results, status, features, 'unknown');
  assert.equal(results.children.length, 0);
  assert.equal(status.textContent, 'No matching results.');
});

test('specs viewer: responsive page - has viewport and accessible search controls', () => {
  const html = read('public/specs/index.html');
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /<label for="spec-search"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /col-12 col-lg-8/);
});

test('specs viewer: site integration - link is public and builds run before serving', () => {
  assert.match(read('public/index.html'), /<a class="btn btn-sm btn-outline-primary" href="\/specs\/">Specifications<\/a>/);
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.equal(scripts.predev, 'npm run build');
  assert.equal(scripts.predeploy, 'npm run build');

  const workflow = read('.github/workflows/deploy.yml');
  assert.ok(workflow.includes('run: npm run deploy'));
});
