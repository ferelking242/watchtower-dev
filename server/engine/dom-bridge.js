// ─────────────────────────────────────────────────────────────────────────────
// DOM bridge — Node.js implementation of Dart's JsDomSelector.
// Uses cheerio for CSS selectors.
//
// KEY DESIGN: Elements are stored as {el, $} pairs.
// The $ context (cheerio instance) is reused across all operations on elements
// from the same document — no re-parsing of large HTML strings.
// ─────────────────────────────────────────────────────────────────────────────
import * as cheerio from 'cheerio';

export class DomBridge {
  constructor() {
    this._elements = new Map(); // key → {el, $}
    this._key = 0;
  }

  _store(el, $) {
    this._key++;
    this._elements.set(this._key, { el: el || null, $: $ || cheerio.load('') });
    return this._key;
  }

  _get(key) { return this._elements.get(key) || null; }

  _parse(html) {
    return cheerio.load(html || '', { decodeEntities: false });
  }

  // Helpers
  _getSrc($, el)  {
    if (!el) return '';
    return $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src') || '';
  }
  _getImg($, el)  {
    if (!el) return '';
    const tag = (el.tagName || el.name || '').toLowerCase();
    const target = tag === 'img' ? el : $(el).find('img').get(0);
    if (!target) return '';
    return $(target).attr('src') || $(target).attr('data-src') || $(target).attr('data-lazy-src') || '';
  }
  _getHref($, el)    { return el ? $(el).attr('href') || '' : ''; }
  _getDataSrc($, el) { return el ? $(el).attr('data-src') || '' : ''; }

  _elementText($, el) {
    if (!el) return '';
    return $(el).text() || '';
  }

  handle(channel, argsJson) {
    const args = JSON.parse(argsJson);

    switch (channel) {

      // ── Document handlers ──────────────────────────────────────────────────

      case 'get_doc_element': {
        const [html, type] = args;
        const $ = this._parse(html);
        let el;
        switch (type) {
          case 'body':            el = $('body').get(0); break;
          case 'documentElement': el = $('html').get(0); break;
          case 'head':            el = $('head').get(0); break;
          default:                el = $.root().get(0);
        }
        return this._store(el, $);
      }

      case 'get_doc_string': {
        const [html, type] = args;
        const $ = this._parse(html);
        return type === 'text' ? $.root().text() : $.html() || '';
      }

      case 'doc_select_first': {
        const [html, selector] = args;
        const $ = this._parse(html);
        const el = this._trySelect($, selector, 'first');
        return this._store(el, $);
      }

      case 'doc_select': {
        const [html, selector] = args;
        const $ = this._parse(html);
        const keys = [];
        this._trySelectAll($, selector).forEach(el => keys.push(this._store(el, $)));
        return JSON.stringify(keys);
      }

      case 'doc_attr': {
        const [html, attr] = args;
        const $ = this._parse(html);
        return $('html').attr(attr) || '';
      }

      case 'doc_has_attr': {
        const [html, attr] = args;
        const $ = this._parse(html);
        return $('html').attr(attr) !== undefined;
      }

      case 'doc_xpath_first': {
        const [html, xpath] = args;
        return this._xpathFirst(html, xpath);
      }

      case 'doc_xpath': {
        const [html, xpath] = args;
        return JSON.stringify(this._xpathAll(html, xpath));
      }

      case 'doc_get_elements_by': {
        const [html, type, name] = args;
        const $ = this._parse(html);
        let items;
        switch (type) {
          case 'children':             items = $('body').children().toArray(); break;
          case 'getElementsByTagName': items = $(name).toArray(); break;
          default:                     items = $(`.${name}`).toArray();
        }
        return JSON.stringify(items.map(el => this._store(el, $)));
      }

      case 'doc_get_element_by_id': {
        const [html, id] = args;
        const $ = this._parse(html);
        const el = $(`#${id}`).get(0) || null;
        return this._store(el, $);
      }

      // ── Element handlers ───────────────────────────────────────────────────

      case 'get_element_string': {
        const [type, key] = args;
        const entry = this._get(key);
        if (!entry || !entry.el) return '';
        const { el, $ } = entry;
        switch (type) {
          case 'text':        return $(el).text() || '';
          case 'innerHtml':   return $(el).html() || '';
          case 'outerHtml':   return cheerio.load($(el).toString(), { decodeEntities: false }).html() || '';
          case 'className':   return $(el).attr('class') || '';
          case 'localName':   return (el.tagName || el.name || '').toLowerCase();
          case 'namespaceUri':return el.namespace || '';
          case 'getSrc':      return this._getSrc($, el);
          case 'getImg':      return this._getImg($, el);
          case 'getHref':     return this._getHref($, el);
          case 'getDataSrc':  return this._getDataSrc($, el);
          default:            return '';
        }
      }

      case 'ele_selectFirst': {
        const [selector, key] = args;
        const entry = this._get(key);
        if (!entry || !entry.el) return this._store(null, cheerio.load(''));
        const { el, $ } = entry;
        const found = this._trySelectIn($, el, selector, 'first');
        return this._store(found, $);
      }

      case 'ele_select': {
        const [selector, key] = args;
        const entry = this._get(key);
        if (!entry || !entry.el) return '[]';
        const { el, $ } = entry;
        const found = this._trySelectIn($, el, selector, 'all');
        return JSON.stringify(found.map(e => this._store(e, $)));
      }

      case 'ele_element_sibling': {
        const [type, key] = args;
        const entry = this._get(key);
        if (!entry || !entry.el) return this._store(null, cheerio.load(''));
        const { el, $ } = entry;
        const sibling = type === 'nextElementSibling'
          ? this._nextSibling(el) : this._prevSibling(el);
        return this._store(sibling, $);
      }

      case 'ele_attr': {
        const [attr, key] = args;
        const entry = this._get(key);
        if (!entry || !entry.el) return '';
        const { el, $ } = entry;
        return $(el).attr(attr) || '';
      }

      case 'ele_has_attr': {
        const [attr, key] = args;
        const entry = this._get(key);
        if (!entry || !entry.el) return false;
        const { el, $ } = entry;
        return $(el).attr(attr) !== undefined;
      }

      case 'ele_xpathFirst': {
        const [xpath, key] = args;
        const entry = this._get(key);
        if (!entry || !entry.el) return '';
        const { el, $ } = entry;
        return this._xpathFirst($(el).html() || '', xpath);
      }

      case 'ele_xpath': {
        const [xpath, key] = args;
        const entry = this._get(key);
        if (!entry || !entry.el) return '[]';
        const { el, $ } = entry;
        return JSON.stringify(this._xpathAll($(el).html() || '', xpath));
      }

      case 'ele_get_elements_by': {
        const [type, name, key] = args;
        const entry = this._get(key);
        if (!entry || !entry.el) return '[]';
        const { el, $ } = entry;
        let items;
        switch (type) {
          case 'children':             items = $(el).children().toArray(); break;
          case 'getElementsByTagName': items = $(el).find(name).toArray(); break;
          default:                     items = $(el).find(`.${name}`).toArray();
        }
        return JSON.stringify(items.map(e => this._store(e, $)));
      }

      default:
        return '';
    }
  }

  // ── Selector helpers ───────────────────────────────────────────────────────

  /** Safely try a CSS selector on the root $; returns el or null */
  _trySelect($, selector, mode) {
    try {
      const parsed = this._parseSelector(selector);
      const result = $(parsed);
      return mode === 'first' ? result.get(0) || null : result.toArray();
    } catch {
      return mode === 'first' ? null : [];
    }
  }

  /** Safely try a CSS selector within a parent el; returns el or el[] */
  _trySelectIn($, parent, selector, mode) {
    try {
      const parsed = this._parseSelector(selector);
      const result = $(parent).find(parsed);
      return mode === 'first' ? result.get(0) || null : result.toArray();
    } catch {
      return mode === 'first' ? null : [];
    }
  }

  /** Handle :contains() pseudo-class which cheerio supports as :contains() */
  _parseSelector(selector) {
    // cheerio supports :contains() natively — pass through as-is
    return selector;
  }

  _trySelectAll($, selector) {
    try {
      return $(this._parseSelector(selector)).toArray();
    } catch {
      return [];
    }
  }

  // ── Sibling traversal ──────────────────────────────────────────────────────

  _nextSibling(el) {
    let node = el.next;
    while (node && node.type !== 'tag') node = node.next;
    return node || null;
  }

  _prevSibling(el) {
    let node = el.prev;
    while (node && node.type !== 'tag') node = node.prev;
    return node || null;
  }

  // ── XPath (basic) ─────────────────────────────────────────────────────────

  _xpathFirst(html, xpath) {
    try {
      const $ = this._parse(html);
      const cssMatch = xpath.match(/\/\/([a-zA-Z*]+)(?:\[@([^\]]+)\])?(?:\/text\(\))?$/);
      if (cssMatch) {
        const tag = cssMatch[1] === '*' ? '*' : cssMatch[1];
        const el = cssMatch[2] ? $(`${tag}[${cssMatch[2]}]`).first() : $(tag).first();
        return el.text() || '';
      }
      return '';
    } catch { return ''; }
  }

  _xpathAll(html, xpath) {
    try {
      const $ = this._parse(html);
      const cssMatch = xpath.match(/\/\/([a-zA-Z*]+)(?:\[@([^\]]+)\])?(?:\/text\(\))?$/);
      if (cssMatch) {
        const tag = cssMatch[1] === '*' ? '*' : cssMatch[1];
        const results = [];
        const selector = cssMatch[2] ? `${tag}[${cssMatch[2]}]` : tag;
        $(selector).each((_, el) => { const t = $(el).text(); if (t) results.push(t); });
        return results;
      }
      return [];
    } catch { return []; }
  }

  reset() {
    this._elements.clear();
    this._key = 0;
  }
}
