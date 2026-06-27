// ─────────────────────────────────────────────────────────────────────────────
// Base API injected into QuickJS — exact replica of what the Watchtower app
// injects via JsExtensionService, JsHttpClient, JsDomSelector, JsUtils.
// All sendMessage() calls are async to match the asyncify QuickJS build.
// ─────────────────────────────────────────────────────────────────────────────

export const BASE_API_JS = (sourceJson) => `

// ── MProvider base class (from JsExtensionService) ───────────────────────────
class MProvider {
    get source() { return ${sourceJson}; }
    get supportsLatest() { throw new Error("supportsLatest not implemented"); }
    getHeaders(url) { throw new Error("getHeaders not implemented"); }
    async getPopular(page) { throw new Error("getPopular not implemented"); }
    async getLatestUpdates(page) { throw new Error("getLatestUpdates not implemented"); }
    async search(query, page, filters) { throw new Error("search not implemented"); }
    async getDetail(url) { throw new Error("getDetail not implemented"); }
    async getPageList(url) { throw new Error("getPageList not implemented"); }
    async getVideoList(url) { throw new Error("getVideoList not implemented"); }
    async getHtmlContent(name, url) { throw new Error("getHtmlContent not implemented"); }
    async cleanHtmlContent(html) { throw new Error("cleanHtmlContent not implemented"); }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
    getCustomLists() { return []; }
    async getCustomList(id, page) { throw new Error("getCustomList not implemented for id: " + id); }
}

// ── HTTP Client (from JsHttpClient) ──────────────────────────────────────────
class Client {
    constructor(reqcopyWith) { this.reqcopyWith = reqcopyWith || null; }
    async _send(method, url, headers, body) {
        const args = [null, this.reqcopyWith, url, headers];
        if (body !== undefined) args.push(body);
        const result = await sendMessage("http_" + method.toLowerCase(), JSON.stringify(args));
        return JSON.parse(result);
    }
    async head(url, headers)             { return this._send("head",   url, headers); }
    async get(url, headers)              { return this._send("get",    url, headers); }
    async post(url, headers, body)       { return this._send("post",   url, headers, body); }
    async put(url, headers, body)        { return this._send("put",    url, headers, body); }
    async delete(url, headers, body)     { return this._send("delete", url, headers, body); }
    async patch(url, headers, body)      { return this._send("patch",  url, headers, body); }
}

// ── DOM Document (from JsDomSelector — native bridge variant with async) ─────
class Document {
    constructor(html) { this._html = typeof html === 'string' ? html : ''; }

    async _getElement(type) {
        const key = await sendMessage("get_doc_element", JSON.stringify([this._html, type]));
        return new Element(key);
    }
    get body()              { return this._getElement('body'); }
    get documentElement()   { return this._getElement('documentElement'); }
    get head()              { return this._getElement('head'); }
    get parent()            { return this._getElement('parent'); }

    async _getString(type) {
        return sendMessage("get_doc_string", JSON.stringify([this._html, type]));
    }
    get text()     { return this._getString('text'); }
    get outerHtml(){ return this._getString('outerHtml'); }

    async selectFirst(selector) {
        const key = await sendMessage("doc_select_first", JSON.stringify([this._html, selector]));
        return new Element(key);
    }
    async select(selector) {
        const keys = JSON.parse(await sendMessage("doc_select", JSON.stringify([this._html, selector])));
        return keys.map(k => new Element(k));
    }
    async xpathFirst(xpath) {
        return sendMessage("doc_xpath_first", JSON.stringify([this._html, xpath]));
    }
    async xpath(xpath) {
        return JSON.parse(await sendMessage("doc_xpath", JSON.stringify([this._html, xpath])));
    }
    async _getElementsBy(type, name) {
        const keys = JSON.parse(await sendMessage("doc_get_elements_by", JSON.stringify([this._html, type, name || ''])));
        return keys.map(k => new Element(k));
    }
    get children()                      { return this._getElementsBy('children'); }
    getElementsByTagName(name)          { return this._getElementsBy('getElementsByTagName', name); }
    getElementsByClassName(name)        { return this._getElementsBy('getElementsByClassName', name); }
    async getElementById(id) {
        const key = await sendMessage("doc_get_element_by_id", JSON.stringify([this._html, id]));
        return new Element(key);
    }
    async attr(attr) {
        return sendMessage("doc_attr", JSON.stringify([this._html, attr]));
    }
    async hasAttr(attr) {
        return sendMessage("doc_has_attr", JSON.stringify([this._html, attr]));
    }
}

// ── DOM Element (from JsDomSelector — native bridge variant with async) ───────
class Element {
    constructor(key) { this._key = key; }

    async _str(type) {
        return sendMessage("get_element_string", JSON.stringify([type, this._key]));
    }
    get text()         { return this._str('text'); }
    get outerHtml()    { return this._str('outerHtml'); }
    get innerHtml()    { return this._str('innerHtml'); }
    get className()    { return this._str('className'); }
    get localName()    { return this._str('localName'); }
    get namespaceUri() { return this._str('namespaceUri'); }
    get getSrc()       { return this._str('getSrc'); }
    get getImg()       { return this._str('getImg'); }
    get getHref()      { return this._str('getHref'); }
    get getDataSrc()   { return this._str('getDataSrc'); }

    async _sibling(type) {
        const key = await sendMessage("ele_element_sibling", JSON.stringify([type, this._key]));
        return new Element(key);
    }
    get previousElementSibling() { return this._sibling('previousElementSibling'); }
    get nextElementSibling()     { return this._sibling('nextElementSibling'); }

    async selectFirst(selector) {
        const key = await sendMessage("ele_selectFirst", JSON.stringify([selector, this._key]));
        return new Element(key);
    }
    async select(selector) {
        const keys = JSON.parse(await sendMessage("ele_select", JSON.stringify([selector, this._key])));
        return keys.map(k => new Element(k));
    }
    async _getElementsBy(type, name) {
        const keys = JSON.parse(await sendMessage("ele_get_elements_by", JSON.stringify([type, name || '', this._key])));
        return keys.map(k => new Element(k));
    }
    get children()                { return this._getElementsBy('children'); }
    getElementsByTagName(name)    { return this._getElementsBy('getElementsByTagName', name); }
    getElementsByClassName(name)  { return this._getElementsBy('getElementsByClassName', name); }

    async attr(name) {
        return sendMessage("ele_attr", JSON.stringify([name, this._key]));
    }
    async hasAttr(name) {
        return sendMessage("ele_has_attr", JSON.stringify([name, this._key]));
    }
    async xpathFirst(xpath) {
        return sendMessage("ele_xpathFirst", JSON.stringify([xpath, this._key]));
    }
    async xpath(xpath) {
        return JSON.parse(await sendMessage("ele_xpath", JSON.stringify([xpath, this._key])));
    }
}

// ── Utilities / helpers (from JsUtils) ───────────────────────────────────────
function jsonStringify(obj) { try { return JSON.stringify(obj); } catch(e) { return '{}'; } }
function extLog(msg) { sendMessage("ext_log", JSON.stringify([msg])); }

// SelectFilter, CheckBoxFilter, etc. (filter model stubs)
class SelectFilter {
    constructor(name, values) { this.name = name; this.values = values || []; this.state = 0; }
}
class CheckBoxFilter {
    constructor(name) { this.name = name; this.state = false; }
}
class TriStateFilter {
    constructor(name) { this.name = name; this.state = 0; }
}
class TextFilter {
    constructor(name) { this.name = name; this.value = ''; }
}
class NumberFilter {
    constructor(name, min, max, def) { this.name = name; this.min = min; this.max = max; this.state = def || min; }
}
class SortFilter {
    constructor(name, values) { this.name = name; this.values = values || []; this.state = { index: 0, ascending: false }; }
}
class GroupFilter {
    constructor(name, filters) { this.name = name; this.filters = filters || []; }
}
class SeparatorFilter { constructor() {} }
class HeaderFilter { constructor(name) { this.name = name; } }

// SourcePreference stubs
class ListPreference {
    constructor(opts) { Object.assign(this, opts); }
}
class EditTextPreference {
    constructor(opts) { Object.assign(this, opts); }
}
class CheckBoxPreference {
    constructor(opts) { Object.assign(this, opts); }
}
class MultiSelectListPreference {
    constructor(opts) { Object.assign(this, opts); }
}
`;
