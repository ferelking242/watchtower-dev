export const BASE_API_JS = (sourceJson: string): string => `

class MProvider {
    get source() { return ${sourceJson}; }
    get supportsLatest() { throw new Error("supportsLatest not implemented"); }
    getHeaders(url) { return {}; }
    async getPopular(page) { throw new Error("getPopular not implemented"); }
    async getLatestUpdates(page) { throw new Error("getLatestUpdates not implemented"); }
    async search(query, page, filters) { throw new Error("search not implemented"); }
    async getDetail(url) { throw new Error("getDetail not implemented"); }
    async getPageList(url) { throw new Error("getPageList not implemented"); }
    async getVideoList(url) { throw new Error("getVideoList not implemented"); }
    async getHtmlContent(name, url) { throw new Error("getHtmlContent not implemented"); }
    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
    getCustomLists() { return []; }
    async getCustomList(id, page) { throw new Error("getCustomList not implemented for id: " + id); }
    async getPreference(key, defaultValue) {
        const prefs = new SharedPreferences();
        return prefs.get(key, defaultValue);
    }
}

class Client {
    constructor(reqcopyWith) { this.reqcopyWith = reqcopyWith || null; }
    async _send(method, url, headers, body) {
        const args = [null, this.reqcopyWith, url, headers];
        if (body !== undefined) args.push(body);
        const result = await sendMessage("http_" + method.toLowerCase(), JSON.stringify(args));
        return JSON.parse(result);
    }
    async head(url, headers)         { return this._send("head",   url, headers); }
    async get(url, headers)          { return this._send("get",    url, headers); }
    async post(url, headers, body)   { return this._send("post",   url, headers, body); }
    async put(url, headers, body)    { return this._send("put",    url, headers, body); }
    async delete(url, headers, body) { return this._send("delete", url, headers, body); }
    async patch(url, headers, body)  { return this._send("patch",  url, headers, body); }
}

class Document {
    constructor(html) { this._html = typeof html === 'string' ? html : ''; }
    _getElement(type) {
        const key = domMessage("get_doc_element", JSON.stringify([this._html, type]));
        return new Element(key);
    }
    get body()            { return this._getElement('body'); }
    get documentElement() { return this._getElement('documentElement'); }
    get head()            { return this._getElement('head'); }
    get parent()          { return this._getElement('parent'); }
    get text()     { return domMessage("get_doc_string", JSON.stringify([this._html, 'text'])); }
    get outerHtml(){ return domMessage("get_doc_string", JSON.stringify([this._html, 'outerHtml'])); }
    selectFirst(selector) {
        const key = domMessage("doc_select_first", JSON.stringify([this._html, selector]));
        return new Element(key);
    }
    select(selector) {
        const raw = domMessage("doc_select", JSON.stringify([this._html, selector]));
        const keys = JSON.parse(raw);
        return keys.map(k => new Element(k));
    }
    xpathFirst(xpath) { return domMessage("doc_xpath_first", JSON.stringify([this._html, xpath])); }
    xpath(xpath) { return JSON.parse(domMessage("doc_xpath", JSON.stringify([this._html, xpath]))); }
    _getElementsBy(type, name) {
        const raw = domMessage("doc_get_elements_by", JSON.stringify([this._html, type, name || '']));
        return JSON.parse(raw).map(k => new Element(k));
    }
    get children() { return this._getElementsBy('children'); }
    getElementsByTagName(name) { return this._getElementsBy('getElementsByTagName', name); }
    getElementsByClassName(name) { return this._getElementsBy('getElementsByClassName', name); }
    getElementById(id) {
        const key = domMessage("doc_get_element_by_id", JSON.stringify([this._html, id]));
        return new Element(key);
    }
    attr(attr)    { return domMessage("doc_attr",     JSON.stringify([this._html, attr])); }
    hasAttr(attr) { return domMessage("doc_has_attr", JSON.stringify([this._html, attr])); }
}

class Element {
    constructor(key) { this._key = key; }
    _str(type) { return domMessage("get_element_string", JSON.stringify([type, this._key])); }
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
    _sibling(type) {
        const key = domMessage("ele_element_sibling", JSON.stringify([type, this._key]));
        return new Element(key);
    }
    get previousElementSibling() { return this._sibling('previousElementSibling'); }
    get nextElementSibling()     { return this._sibling('nextElementSibling'); }
    selectFirst(selector) {
        const key = domMessage("ele_selectFirst", JSON.stringify([selector, this._key]));
        return new Element(key);
    }
    select(selector) {
        const raw = domMessage("ele_select", JSON.stringify([selector, this._key]));
        return JSON.parse(raw).map(k => new Element(k));
    }
    _getElementsBy(type, name) {
        const raw = domMessage("ele_get_elements_by", JSON.stringify([type, name || '', this._key]));
        return JSON.parse(raw).map(k => new Element(k));
    }
    get children() { return this._getElementsBy('children'); }
    getElementsByTagName(name) { return this._getElementsBy('getElementsByTagName', name); }
    getElementsByClassName(name) { return this._getElementsBy('getElementsByClassName', name); }
    attr(name)    { return domMessage("ele_attr",     JSON.stringify([name, this._key])); }
    hasAttr(name) { return domMessage("ele_has_attr", JSON.stringify([name, this._key])); }
    xpathFirst(xpath) { return domMessage("ele_xpathFirst", JSON.stringify([xpath, this._key])); }
    xpath(xpath) { return JSON.parse(domMessage("ele_xpath", JSON.stringify([xpath, this._key]))); }
}

function jsonStringify(obj) { try { return JSON.stringify(obj); } catch(e) { return '{}'; } }
function extLog(msg) { sendMessage("ext_log", JSON.stringify([String(msg)])); }
function print(msg)  { extLog(String(msg)); }

class SelectFilter       { constructor(name, values) { this.name = name; this.values = values || []; this.state = 0; } }
class CheckBoxFilter     { constructor(name) { this.name = name; this.state = false; } }
class TriStateFilter     { constructor(name) { this.name = name; this.state = 0; } }
class TextFilter         { constructor(name) { this.name = name; this.value = ''; } }
class NumberFilter       { constructor(name, min, max, def) { this.name = name; this.min = min; this.max = max; this.state = def || min; } }
class SortFilter         { constructor(name, values) { this.name = name; this.values = values || []; this.state = { index: 0, ascending: false }; } }
class GroupFilter        { constructor(name, filters) { this.name = name; this.filters = filters || []; } }
class SeparatorFilter    { constructor() {} }
class HeaderFilter       { constructor(name) { this.name = name; } }
class ListPreference     { constructor(opts) { Object.assign(this, opts); } }
class EditTextPreference { constructor(opts) { Object.assign(this, opts); } }
class CheckBoxPreference { constructor(opts) { Object.assign(this, opts); } }
class MultiSelectListPreference { constructor(opts) { Object.assign(this, opts); } }

class SharedPreferences {
    constructor() {}
    _store() { return typeof __sharedPrefsStore !== 'undefined' ? __sharedPrefsStore : {}; }
    get(key, def)           { const v = this._store()[key]; return v !== undefined ? v : (def !== undefined ? def : null); }
    getString(key, def)     { const v = this._store()[key]; return v !== undefined ? v : (def !== undefined ? def : ''); }
    getStringList(key, def) { const v = this._store()[key]; return v !== undefined ? v : (def !== undefined ? def : []); }
    getBool(key, def)       { const v = this._store()[key]; return v !== undefined ? v : (def !== undefined ? def : false); }
    getInt(key, def)        { const v = this._store()[key]; return v !== undefined ? v : (def !== undefined ? def : 0); }
    getDouble(key, def)     { const v = this._store()[key]; return v !== undefined ? v : (def !== undefined ? def : 0.0); }
    set(key, val)           { this._store()[key] = val; return true; }
    setString(key, val)     { this._store()[key] = val; return true; }
    setStringList(key, val) { this._store()[key] = val; return true; }
    setBool(key, val)       { this._store()[key] = val; return true; }
    setInt(key, val)        { this._store()[key] = val; return true; }
    setDouble(key, val)     { this._store()[key] = val; return true; }
    remove(key)             { delete this._store()[key]; return true; }
    containsKey(key)        { return key in this._store(); }
    getKeys()               { return Object.keys(this._store()); }
}
`;
