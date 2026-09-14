/*
 * Safe Artificial Intelligence Lab — site script (vanilla JS, no dependencies).
 *
 * 1. Mobile navigation toggle.
 * 2. Renders data-driven sections from data/*.json into elements marked with
 *    data-render="projects | publications | people | director".
 *    Optional attributes on those elements:
 *      data-direction="development|safety|society"  filter by research direction
 *      data-limit="3"                               show only the first N items
 *      data-group="year"                            (publications) group under year headings
 *      data-heading="h3"                            heading tag for card titles / year headings
 *    If an item list is empty and the element sits inside [data-hide-if-empty],
 *    that wrapper is hidden instead of showing an empty section.
 */
(function () {
  'use strict';

  const DIRECTIONS = {
    development: { label: 'AI Development', href: 'research.html#development' },
    safety: { label: 'AI Safety & Trust', href: 'research.html#safety' },
    society: { label: 'AI for Society', href: 'research.html#society' }
  };

  const LINK_LABELS = { paper: 'Paper', code: 'Code', project: 'Project', dataset: 'Dataset' };

  const PROFILE_LINKS = [
    ['profile', 'Purdue Profile'],
    ['scholar', 'Google Scholar'],
    ['github', 'GitHub'],
    ['website', 'Website']
  ];

  // ---------- Helpers ----------

  // el('p', { class: 'x' }, 'text', childNode, [nested, [arrays]]) — strings are inserted as text, never HTML.
  // Only non-empty strings and DOM nodes are appended; null/false/0 from `cond && el(...)` are skipped.
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      node.setAttribute(key === 'className' ? 'class' : key, value === true ? '' : value);
    }
    for (const child of children.flat(Infinity)) {
      if (child instanceof Node || (typeof child === 'string' && child !== '')) node.append(child);
    }
    return node;
  }

  const cache = new Map();
  function loadJSON(path) {
    if (!cache.has(path)) {
      cache.set(path, fetch(path).then((res) => {
        if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
        return res.json();
      }));
    }
    return cache.get(path);
  }

  function selectItems(items, container) {
    const { direction, limit } = container.dataset;
    const list = direction
      ? items.filter((item) => (item.directions || []).includes(direction))
      : items.slice();
    return limit ? list.slice(0, Number(limit)) : list;
  }

  function sampleBadge(item) {
    return item.sample
      ? el('span', { class: 'badge-sample' }, 'Sample', el('span', { class: 'visually-hidden' }, ' (placeholder content)'))
      : null;
  }

  // null/empty links are skipped; "#" marks a placeholder link in sample entries.
  function linkRow(links, kinds) {
    const pills = kinds
      .filter((kind) => links && links[kind])
      .map((kind) => links[kind] === '#'
        ? el('span', { class: 'link-pill is-placeholder' }, LINK_LABELS[kind],
            el('span', { class: 'visually-hidden' }, ' (link not yet available)'))
        : el('a', { class: 'link-pill', href: links[kind] }, LINK_LABELS[kind]));
    return pills.length ? el('div', { class: 'link-row' }, pills) : null;
  }

  function directionTags(ids) {
    const known = (ids || []).filter((id) => DIRECTIONS[id]);
    if (!known.length) return null;
    return el('ul', { class: 'tag-list', role: 'list', 'aria-label': 'Research directions' },
      known.map((id) => el('li', null, el('a', { class: 'tag', href: DIRECTIONS[id].href }, DIRECTIONS[id].label))));
  }

  // ---------- Item templates ----------

  function projectCard(project, headingTag) {
    return el('article', { class: 'card' },
      project.image && el('div', { class: 'card-media' },
        el('img', { src: project.image, alt: project.imageAlt || '', width: 1200, height: 675, loading: 'lazy' })),
      el('div', { class: 'card-body' },
        project.sample && el('p', null, sampleBadge(project)),
        el(headingTag, { class: 'card-title' }, project.title),
        project.description && el('p', { class: 'card-text' }, project.description),
        directionTags(project.directions),
        linkRow(project.links, ['paper', 'code'])));
  }

  function publicationEntry(pub) {
    return el('li', { class: 'pub' },
      el('p', { class: 'pub-title' }, pub.title, pub.sample && ' ', sampleBadge(pub)),
      pub.authors && pub.authors.length && el('p', { class: 'pub-authors' }, pub.authors.join(', ')),
      el('p', { class: 'pub-venue' }, [pub.venue, pub.year].filter(Boolean).join(', ')),
      linkRow(pub.links, ['paper', 'code', 'project', 'dataset']));
  }

  function profileLinks(person) {
    const links = PROFILE_LINKS
      .filter(([key]) => person.links && person.links[key])
      .map(([key, label]) => el('a', { class: 'link-pill', href: person.links[key] }, label));
    if (person.email) links.push(el('a', { class: 'link-pill', href: `mailto:${person.email}` }, 'Email'));
    return links.length ? el('div', { class: 'link-row' }, links) : null;
  }

  function metaBlock(title, content) {
    return el('div', { class: 'meta-block' }, el('h4', null, title), content);
  }

  // Full profile (People page) or compact summary (homepage).
  function personProfile(person, compact) {
    const bio = person.bio || [];
    const interests = person.interests || [];
    const education = person.education || [];
    const interestTags = interests.length
      ? el('ul', { class: 'tag-list', role: 'list', 'aria-label': compact ? 'Research interests' : null },
          interests.map((item) => el('li', null, el('span', { class: 'tag' }, item))))
      : null;

    return el('article', { class: compact ? 'person person--compact' : 'person' },
      person.photo && el('img', {
        class: 'person-photo', src: person.photo, alt: person.photoAlt || `Portrait of ${person.name}`,
        width: 640, height: 640, loading: compact ? 'lazy' : null
      }),
      el('div', { class: 'person-body' },
        el('h3', { class: 'person-name' }, person.name),
        person.role && el('p', { class: 'person-role' }, person.role),
        el('p', { class: 'person-title' }, [person.title, person.affiliation].filter(Boolean).join(' · ')),
        compact
          ? [
              bio[0] && el('p', { class: 'person-bio' }, bio[0]),
              interestTags,
              el('div', { class: 'btn-row' },
                el('a', { class: 'btn btn-outline', href: 'people.html' }, 'Full profile'),
                person.links && person.links.profile &&
                  el('a', { class: 'btn btn-outline', href: person.links.profile }, 'Purdue Profile'))
            ]
          : [
              bio.map((para) => el('p', { class: 'person-bio' }, para)),
              (interestTags || education.length) && el('div', { class: 'meta-grid' },
                interestTags && metaBlock('Research Interests', interestTags),
                education.length && metaBlock('Education', el('ul', null, education.map((item) => el('li', null, item))))),
              profileLinks(person)
            ]));
  }

  function memberCard(person) {
    const links = person.links || {};
    const url = links.website || links.profile || links.scholar || links.github;
    return el('li', { class: 'member' },
      person.photo && el('img', {
        class: 'member-photo', src: person.photo, alt: person.photoAlt || `Portrait of ${person.name}`,
        width: 320, height: 320, loading: 'lazy'
      }),
      el('h3', { class: 'member-name' }, url ? el('a', { href: url }, person.name) : person.name),
      person.title && el('p', { class: 'member-title' }, person.title),
      person.note && el('p', { class: 'member-note' }, person.note));
  }

  // ---------- Renderers (return number of items rendered) ----------

  const renderers = {
    async projects(container) {
      const { projects = [] } = await loadJSON('data/projects.json');
      const items = selectItems(projects, container);
      const heading = container.dataset.heading || 'h3';
      container.replaceChildren(...items.map((project) => projectCard(project, heading)));
      return items.length;
    },

    async publications(container) {
      const { publications = [] } = await loadJSON('data/publications.json');
      const items = selectItems(publications, container).sort((a, b) => (b.year || 0) - (a.year || 0));
      if (container.dataset.group === 'year') {
        const heading = container.dataset.heading || 'h2';
        const years = [...new Set(items.map((pub) => pub.year))];
        container.replaceChildren(...years.flatMap((year) => [
          el(heading, { class: 'pub-year', id: `year-${year}` }, String(year)),
          el('ol', { class: 'pub-list', role: 'list' }, items.filter((pub) => pub.year === year).map(publicationEntry))
        ]));
      } else {
        container.replaceChildren(el('ol', { class: 'pub-list', role: 'list' }, items.map(publicationEntry)));
      }
      return items.length;
    },

    async people(container) {
      const { groups = [] } = await loadJSON('data/people.json');
      const filled = groups.filter((group) => group.members && group.members.length);
      container.replaceChildren(...filled.map((group) =>
        el('section', { class: 'people-group', 'aria-labelledby': `group-${group.id}` },
          el('h2', { class: 'people-group-title', id: `group-${group.id}` }, group.title),
          group.id === 'director'
            ? group.members.map((person) => personProfile(person, false))
            : el('ul', { class: 'member-grid', role: 'list' }, group.members.map(memberCard)))));
      return filled.length;
    },

    async director(container) {
      const { groups = [] } = await loadJSON('data/people.json');
      const group = groups.find((g) => g.id === 'director');
      const person = group && group.members && group.members[0];
      container.replaceChildren(...(person ? [personProfile(person, true)] : []));
      return person ? 1 : 0;
    }
  };

  // Notices marked data-sample-notice="projects publications" start hidden and are shown
  // only while a matching section still contains sample entries.
  function revealSampleNotices(type) {
    document.querySelectorAll('[data-sample-notice]').forEach((notice) => {
      if (notice.dataset.sampleNotice.split(/\s+/).includes(type)) notice.hidden = false;
    });
  }

  function renderAll() {
    document.querySelectorAll('[data-render]').forEach(async (container) => {
      const type = container.dataset.render;
      const render = renderers[type];
      if (!render) return;
      container.setAttribute('aria-busy', 'true');
      try {
        const count = await render(container);
        if (container.querySelector('.badge-sample')) revealSampleNotices(type);
        if (!count) {
          // Empty list: hide the [data-hide-if-empty] wrapper, or show the <template> named by data-empty.
          const wrapper = container.closest('[data-hide-if-empty]');
          const template = container.dataset.empty && document.getElementById(container.dataset.empty);
          if (wrapper) wrapper.hidden = true;
          else if (template) container.replaceChildren(template.content.cloneNode(true));
          else container.replaceChildren(el('p', { class: 'data-status' }, 'Content will be added soon.'));
        }
      } catch (error) {
        console.error(error);
        container.replaceChildren(el('p', { class: 'data-status' },
          location.protocol === 'file:'
            ? 'This section is loaded from the data/ folder, which browsers block for local files. Preview the site with a local web server (for example: python3 -m http.server).'
            : 'This content could not be loaded. Please try refreshing the page.'));
      } finally {
        container.removeAttribute('aria-busy');
      }
    });
  }

  // ---------- Navigation ----------

  function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
    });

    window.matchMedia('(min-width: 881px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  function initYear() {
    document.querySelectorAll('[data-current-year]').forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  }

  initNav();
  initYear();
  renderAll();
})();
