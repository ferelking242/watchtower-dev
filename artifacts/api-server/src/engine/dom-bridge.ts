/* eslint-disable @typescript-eslint/no-explicit-any */
import * as cheerio from "cheerio";

export class DomBridge {
  private _elements: Map<number, { el: any; $: any }>;
  private _key: number;

  constructor() {
    this._elements = new Map();
    this._key = 0;
  }

  private _store(el: any, $: any): number {
    this._key++;
    this._elements.set(this._key, { el: el ?? null, $: $ ?? cheerio.load("") });
    return this._key;
  }

  private _get(key: number): { el: any; $: any } | null {
    return this._elements.get(key) ?? null;
  }

  private _parse(html: string): any {
    return cheerio.load(html ?? "");
  }

  private _getSrc($: any, el: any): string {
    if (!el) return "";
    return $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || "";
  }

  private _getImg($: any, el: any): string {
    if (!el) return "";
    const tag = (el.tagName || el.name || "").toLowerCase();
    const target = tag === "img" ? el : $(el).find("img").get(0) ?? null;
    if (!target) return "";
    return $(target).attr("src") || $(target).attr("data-src") || $(target).attr("data-lazy-src") || "";
  }

  private _getHref($: any, el: any): string {
    return el ? $(el).attr("href") || "" : "";
  }

  private _getDataSrc($: any, el: any): string {
    return el ? $(el).attr("data-src") || "" : "";
  }

  private _trySelect($: any, selector: string, mode: "first" | "all"): any {
    try {
      const result = $(selector);
      return mode === "first" ? result.get(0) ?? null : result.toArray();
    } catch {
      return mode === "first" ? null : [];
    }
  }

  private _trySelectIn($: any, parent: any, selector: string, mode: "first" | "all"): any {
    try {
      const result = $(parent).find(selector);
      return mode === "first" ? result.get(0) ?? null : result.toArray();
    } catch {
      return mode === "first" ? null : [];
    }
  }

  private _trySelectAll($: any, selector: string): any[] {
    try {
      return $(selector).toArray();
    } catch {
      return [];
    }
  }

  private _nextSibling(el: any): any {
    let node = el.next;
    while (node && node.type !== "tag") node = node.next;
    return node ?? null;
  }

  private _prevSibling(el: any): any {
    let node = el.prev;
    while (node && node.type !== "tag") node = node.prev;
    return node ?? null;
  }

  private _xpathFirst(html: string, xpath: string): string {
    try {
      const $ = this._parse(html);
      const cssMatch = xpath.match(/\/\/([a-zA-Z*]+)(?:\[@([^\]]+)\])?(?:\/text\(\))?$/);
      if (cssMatch) {
        const tag = cssMatch[1] === "*" ? "*" : cssMatch[1];
        const el = cssMatch[2] ? $(`${tag}[${cssMatch[2]}]`).first() : $(tag).first();
        return el.text() || "";
      }
      return "";
    } catch {
      return "";
    }
  }

  private _xpathAll(html: string, xpath: string): string[] {
    try {
      const $ = this._parse(html);
      const cssMatch = xpath.match(/\/\/([a-zA-Z*]+)(?:\[@([^\]]+)\])?(?:\/text\(\))?$/);
      if (cssMatch) {
        const tag = cssMatch[1] === "*" ? "*" : cssMatch[1];
        const results: string[] = [];
        const selector = cssMatch[2] ? `${tag}[${cssMatch[2]}]` : tag;
        $(selector).each((_: number, el: any) => {
          const t = $(el).text();
          if (t) results.push(t);
        });
        return results;
      }
      return [];
    } catch {
      return [];
    }
  }

  handle(channel: string, argsJson: string): any {
    const args: any[] = JSON.parse(argsJson);

    switch (channel) {
      case "get_doc_element": {
        const [html, type] = args as [string, string];
        const $ = this._parse(html);
        let el: any;
        switch (type) {
          case "body": el = $("body").get(0); break;
          case "documentElement": el = $("html").get(0); break;
          case "head": el = $("head").get(0); break;
          default: el = $.root().get(0);
        }
        return this._store(el ?? null, $);
      }

      case "get_doc_string": {
        const [html, type] = args as [string, string];
        const $ = this._parse(html);
        return type === "text" ? $.root().text() : $.html() || "";
      }

      case "doc_select_first": {
        const [html, selector] = args as [string, string];
        const $ = this._parse(html);
        const el = this._trySelect($, selector, "first");
        return this._store(el, $);
      }

      case "doc_select": {
        const [html, selector] = args as [string, string];
        const $ = this._parse(html);
        const keys: number[] = [];
        (this._trySelectAll($, selector)).forEach((el: any) => keys.push(this._store(el, $)));
        return JSON.stringify(keys);
      }

      case "doc_attr": {
        const [html, attr] = args as [string, string];
        const $ = this._parse(html);
        return $("html").attr(attr) || "";
      }

      case "doc_has_attr": {
        const [html, attr] = args as [string, string];
        const $ = this._parse(html);
        return $("html").attr(attr) !== undefined;
      }

      case "doc_xpath_first": {
        const [html, xpath] = args as [string, string];
        return this._xpathFirst(html, xpath);
      }

      case "doc_xpath": {
        const [html, xpath] = args as [string, string];
        return JSON.stringify(this._xpathAll(html, xpath));
      }

      case "doc_get_elements_by": {
        const [html, type, name] = args as [string, string, string];
        const $ = this._parse(html);
        let items: any[];
        switch (type) {
          case "children": items = $("body").children().toArray(); break;
          case "getElementsByTagName": items = $(name).toArray(); break;
          default: items = $(`.${name}`).toArray();
        }
        return JSON.stringify(items.map((el: any) => this._store(el, $)));
      }

      case "doc_get_element_by_id": {
        const [html, id] = args as [string, string];
        const $ = this._parse(html);
        const el = $(`#${id}`).get(0) ?? null;
        return this._store(el, $);
      }

      case "get_element_string": {
        const [type, key] = args as [string, number];
        const entry = this._get(key);
        if (!entry || !entry.el) return "";
        const { el, $ } = entry;
        switch (type) {
          case "text": return $(el).text() || "";
          case "innerHtml": return $(el).html() || "";
          case "outerHtml": return cheerio.load($(el).toString()).html() || "";
          case "className": return $(el).attr("class") || "";
          case "localName": return (el.tagName || el.name || "").toLowerCase();
          case "namespaceUri": return el.namespace || "";
          case "getSrc": return this._getSrc($, el);
          case "getImg": return this._getImg($, el);
          case "getHref": return this._getHref($, el);
          case "getDataSrc": return this._getDataSrc($, el);
          default: return "";
        }
      }

      case "ele_selectFirst": {
        const [selector, key] = args as [string, number];
        const entry = this._get(key);
        if (!entry || !entry.el) return this._store(null, cheerio.load(""));
        const { el, $ } = entry;
        const found = this._trySelectIn($, el, selector, "first");
        return this._store(found, $);
      }

      case "ele_select": {
        const [selector, key] = args as [string, number];
        const entry = this._get(key);
        if (!entry || !entry.el) return "[]";
        const { el, $ } = entry;
        const found = this._trySelectIn($, el, selector, "all") as any[];
        return JSON.stringify(found.map((e: any) => this._store(e, $)));
      }

      case "ele_element_sibling": {
        const [type, key] = args as [string, number];
        const entry = this._get(key);
        if (!entry || !entry.el) return this._store(null, cheerio.load(""));
        const { el, $ } = entry;
        const sibling = type === "nextElementSibling" ? this._nextSibling(el) : this._prevSibling(el);
        return this._store(sibling, $);
      }

      case "ele_attr": {
        const [attr, key] = args as [string, number];
        const entry = this._get(key);
        if (!entry || !entry.el) return "";
        return entry.$(entry.el).attr(attr) || "";
      }

      case "ele_has_attr": {
        const [attr, key] = args as [string, number];
        const entry = this._get(key);
        if (!entry || !entry.el) return false;
        return entry.$(entry.el).attr(attr) !== undefined;
      }

      case "ele_xpathFirst": {
        const [xpath, key] = args as [string, number];
        const entry = this._get(key);
        if (!entry || !entry.el) return "";
        return this._xpathFirst(entry.$(entry.el).html() || "", xpath);
      }

      case "ele_xpath": {
        const [xpath, key] = args as [string, number];
        const entry = this._get(key);
        if (!entry || !entry.el) return "[]";
        return JSON.stringify(this._xpathAll(entry.$(entry.el).html() || "", xpath));
      }

      case "ele_get_elements_by": {
        const [type, name, key] = args as [string, string, number];
        const entry = this._get(key);
        if (!entry || !entry.el) return "[]";
        const { el, $ } = entry;
        let items: any[];
        switch (type) {
          case "children": items = $(el).children().toArray(); break;
          case "getElementsByTagName": items = $(el).find(name).toArray(); break;
          default: items = $(el).find(`.${name}`).toArray();
        }
        return JSON.stringify(items.map((e: any) => this._store(e, $)));
      }

      default:
        return "";
    }
  }

  reset(): void {
    this._elements.clear();
    this._key = 0;
  }
}
