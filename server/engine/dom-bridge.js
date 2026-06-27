// ─────────────────────────────────────────────────────────────────────────────
// DOM bridge handlers — Node.js side implementation of Dart's JsDomSelector.
// Uses cheerio for CSS selectors (identical to Dart's html package).
// ─────────────────────────────────────────────────────────────────────────────
import * as cheerio from 'cheerio';

export class DomBridge {
  constructor() {
    this._elements = new Map();
    this._key = 0;
  }

  _store(el) {
    this._key++;
    this._elements.set(this._key, el);
    return this._key;
  }

  _get(key) { return this._elements.get(key) || null; }

  _parse(html) { return cheerio.load(html || ''); }

  // ── Helpers matching Dart extension methods ─────────────────────────────────
  _getSrc($, el)      { return $(el).attr('src') || $(el).attr('data-src') || ''; }
  _getImg($, el)      {
    if (!el) return '';
    const tag = (el.tagName || el.name || '').toLowerCase();
    const target = tag === 'img' ? el : $(el).find('img').get(0);
    if (!target) return '';
    return $(target).attr('src') || $(target).attr('data-src') || '';
  }
  _getHref($, el)     { return $(el).attr('href') || ''; }
  _getDataSrc($, el)  { return $(el).attr('data-src') || ''; }

  /** Dispatch a channel + JSON args string → returns a value (string/number/bool) */
  handle(channel, argsJson) {
    const args = JSON.parse(argsJson);

    switch (channel) {
      // ── Document handlers ─────────────────────────────────────────────────
      case 'get_doc_element': {
        const [html, type] = args;
        const $ = this._parse(html);
        let el;
        switch (type) {
          case 'body':            el = $('body').get(0); break;
          case 'documentElement': el = $.root().children('html').get(0) || $('html').get(0); break;
          case 'head':            el = $('head').get(0); break;
          default:                el = $.root().get(0);
        }
        return this._store(el);
      }

      case 'get_doc_string': {
        const [html, type] = args;
        const $ = this._parse(html);
        return type === 'text' ? $.root().text() : $.html() || '';
      }

      case 'doc_select_first': {
        const [html, selector] = args;
        const $ = this._parse(html);
        const el = $(selector).get(0) || null;
        return this._store(el);
      }

      case 'doc_select': {
        const [html, selector] = args;
        const $ = this._parse(html);
        const keys = [];
        $(selector).each((_, el) => keys.push(this._store(el)));
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
          case 'children':            items = $('body').children().toArray(); break;
          case 'getElementsByTagName': items = $(name).toArray(); break;
          default:                    items = $(`.${name}`).toArray();
        }
        return JSON.stringify(items.map(el => this._store(el)));
      }

      case 'doc_get_element_by_id': {
        const [html, id] = args;
        const $ = this._parse(html);
        const el = $(`#${id}`).get(0) || null;
        return this._store(el);
      }

      // ── Element handlers ──────────────────────────────────────────────────
      case 'get_element_string': {
        const [type, key] = args;
        const el = this._get(key);
        if (!el) return '';
        const $ = cheerio.load('');
        switch (type) {
          case 'text':        return $(el).text();
          case 'innerHtml':   return $(el).html() || '';
          case 'outerHtml':   return cheerio.load(el).html() || '';
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
        const el = this._get(key);
        if (!el) return this._store(null);
        const $ = cheerio.load(el);
        const found = $(selector).get(0) || null;
        return this._store(found);
      }

      case 'ele_select': {
        const [selector, key] = args;
        const el = this._get(key);
        if (!el) return '[]';
        const $ = cheerio.load(el);
        const keys = [];
        $(selector).each((_, e) => keys.push(this._store(e)));
        return JSON.stringify(keys);
      }

      case 'ele_element_sibling': {
        const [type, key] = args;
        const el = this._get(key);
        if (!el) return this._store(null);
        const sibling = type === 'nextElementSibling'
          ? this._nextSibling(el) : this._prevSibling(el);
        return this._store(sibling);
      }

      case 'ele_attr': {
        const [attr, key] = args;
        const el = this._get(key);
        if (!el) return '';
        const $ = cheerio.load('');
        return $(el).attr(attr) || '';
      }

      case 'ele_has_attr': {
        const [attr, key] = args;
        const el = this._get(key);
        if (!el) return false;
        const $ = cheerio.load('');
        return $(el).attr(attr) !== undefined;
      }

      case 'ele_xpathFirst': {
        const [xpath, key] = args;
        const el = this._get(key);
        if (!el) return '';
        return this._xpathFirst(cheerio.load(el).html() || '', xpath);
      }

      case 'ele_xpath': {
        const [xpath, key] = args;
        const el = this._get(key);
        if (!el) return '[]';
        return JSON.stringify(this._xpathAll(cheerio.load(el).html() || '', xpath));
      }

      case 'ele_get_elements_by': {
        const [type, name, key] = args;
        const el = this._get(key);
        if (!el) return '[]';
        const $ = cheerio.load(el);
        let items;
        switch (type) {
          case 'children':             items = $.root().children().toArray(); break;
          case 'getElementsByTagName': items = $(name).toArray(); break;
          default:                     items = $(`.${name}`).toArray();
        }
        return JSON.stringify(items.map(e => this._store(e)));
      }

      default:
        return '';
    }
  }

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

  _xpathFirst(html, xpath) {
    // Basic xpath text extraction via regex (cheerio doesn't support xpath)
    // For full xpath, the extension should use CSS selectors instead.
    try {
      const $ = this._parse(html);
      // Convert simple text() xpath to cheerio
      const cssMatch = xpath.match(/\/\/([a-zA-Z*]+)(?:\[@([^\]]+)\])?\/text\(\)/);
      if (cssMatch) {
        const tag = cssMatch[1] === '*' ? '*' : cssMatch[1];
        const el = cssMatch[2]
          ? $(`${tag}[${cssMatch[2]}]`).first()
          : $(tag).first();
        return el.text() || '';
      }
      return '';
    } catch { return ''; }
  }

  _xpathAll(html, xpath) {
    try {
      const $ = this._parse(html);
      const cssMatch = xpath.match(/\/\/([a-zA-Z*]+)(?:\[@([^\]]+)\])?\/text\(\)/);
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
