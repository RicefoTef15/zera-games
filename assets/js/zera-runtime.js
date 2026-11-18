/*
 * Zera Games — motor das páginas
 *
 * Cada página tem duas partes:
 *   1. <template id="dc-template">  -> o HTML da página, com marcações {{nome}}
 *   2. <script type="text/x-dc">     -> a lógica (class Component), que calcula
 *                                       os valores usados nas marcações
 *
 * Marcações aceitas no HTML:
 *   {{nome}} ou {{item.campo}}         texto ou atributo vindo da lógica
 *   onClick="{{funcao}}"               evento (onClick, onSubmit, onChange, onPointerMove...)
 *   <sc-if value="{{condicao}}">       mostra o conteúdo só se a condição for verdadeira
 *   <sc-for list="{{lista}}" as="x">   repete o conteúdo para cada item da lista
 *
 * Não precisa mexer neste arquivo para trocar textos, preços ou produtos:
 * isso fica no HTML e na lógica de cada página.
 */
(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;
  var BOOL_ATTRS = { disabled: 1, required: 1, checked: 1, selected: 1, readonly: 1, multiple: 1, hidden: 1, open: 1, autofocus: 1, novalidate: 1 };

  // ---------- leitura dos valores ----------
  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var cur = scope;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(p, scope);
      return v == null ? '' : String(v);
    });
  }
  function evalAttr(raw, scope) {
    var m = WHOLE.exec(raw);
    if (m) return lookup(m[1], scope);
    if (raw.indexOf('{{') === -1) return raw;
    return interp(raw, scope);
  }

  // ---------- template -> árvore virtual ----------
  var uid = 0;
  function tagTemplate(node) {
    node.__dcId = ++uid;
    for (var c = node.firstChild; c; c = c.nextSibling) tagTemplate(c);
  }

  function build(node, scope, kp, out) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      out.push({ text: t.indexOf('{{') === -1 ? t : interp(t, scope), key: kp + node.__dcId });
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName;
    if (tag === 'sc-if') {
      if (lookup(stripHole(node.getAttribute('value')), scope)) buildChildren(node, scope, kp, out);
      return;
    }
    if (tag === 'sc-for') {
      var list = lookup(stripHole(node.getAttribute('list')), scope) || [];
      var as = node.getAttribute('as') || 'item';
      for (var i = 0; i < list.length; i++) {
        var s = Object.create(scope);
        s[as] = list[i];
        s.$index = i;
        buildChildren(node, s, kp + node.__dcId + '.' + i + ':', out);
      }
      return;
    }
    var v = { tag: tag, ns: node.namespaceURI, attrs: {}, events: {}, key: kp + node.__dcId, children: [], defaultValue: undefined };
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a];
      var name = at.name;
      if (name.indexOf('hint-') === 0) continue;
      var val = evalAttr(at.value, scope);
      if (name.length > 2 && name.slice(0, 2) === 'on') {
        if (typeof val === 'function') {
          var ev = name.slice(2).toLowerCase();
          if (ev === 'change' && (tag === 'input' || tag === 'textarea')) ev = 'input';
          v.events[ev] = val;
        }
        continue;
      }
      if (name === 'defaultvalue') { v.defaultValue = val; continue; }
      if (BOOL_ATTRS[name] && val === '') val = true;
      v.attrs[name] = val;
    }
    buildChildren(node, scope, kp, v.children);
    out.push(v);
  }
  function buildChildren(node, scope, kp, out) {
    var src = node.content || node;
    for (var c = src.firstChild; c; c = c.nextSibling) build(c, scope, kp, out);
  }
  function stripHole(s) {
    var m = WHOLE.exec(s || '');
    return m ? m[1] : (s || '');
  }

  // ---------- árvore virtual -> página ----------
  function setAttr(el, name, val) {
    if (val === false || val == null) { el.removeAttribute(name); return; }
    if (val === true) { el.setAttribute(name, ''); return; }
    el.setAttribute(name, String(val));
  }
  function dispatch(e) {
    var h = this.__dcEvents && this.__dcEvents[e.type];
    if (h) return h(e);
  }
  function create(v) {
    if (v.text !== undefined) {
      var t = document.createTextNode(v.text);
      t.__dcKey = v.key;
      return t;
    }
    var el = v.ns === SVG_NS ? document.createElementNS(SVG_NS, v.tag) : document.createElement(v.tag);
    el.__dcKey = v.key;
    el.__dcAttrs = {};
    el.__dcEvents = {};
    patchEl(el, v);
    if (v.defaultValue !== undefined) el.value = v.defaultValue == null ? '' : String(v.defaultValue);
    return el;
  }
  function patchEl(el, v) {
    var old = el.__dcAttrs;
    var k;
    for (k in old) if (!(k in v.attrs)) el.removeAttribute(k);
    for (k in v.attrs) if (old[k] !== v.attrs[k]) setAttr(el, k, v.attrs[k]);
    el.__dcAttrs = v.attrs;
    var oe = el.__dcEvents;
    for (k in oe) if (!(k in v.events)) el.removeEventListener(k, dispatch);
    for (k in v.events) if (!(k in oe)) el.addEventListener(k, dispatch);
    el.__dcEvents = v.events;
    patchChildren(el, v.children);
  }
  function patchChildren(parent, list) {
    var byKey = {};
    for (var c = parent.firstChild; c; c = c.nextSibling) if (c.__dcKey) byKey[c.__dcKey] = c;
    var next = parent.firstChild;
    for (var i = 0; i < list.length; i++) {
      var v = list[i];
      var node = byKey[v.key];
      var ok = node && (v.text !== undefined ? node.nodeType === 3 : (node.nodeType === 1 && node.localName === v.tag));
      if (ok) {
        delete byKey[v.key];
        if (v.text !== undefined) { if (node.nodeValue !== v.text) node.nodeValue = v.text; }
        else patchEl(node, v);
      } else {
        node = create(v);
      }
      if (node !== next) parent.insertBefore(node, next);
      else next = next.nextSibling;
    }
    for (var key in byKey) if (byKey[key].parentNode === parent) parent.removeChild(byKey[key]);
  }

  // ---------- componente ----------
  function DCLogic(props) {
    this.props = props || {};
    this.state = null;
    this.__queued = false;
  }
  DCLogic.prototype.setState = function (partial) {
    if (typeof partial === 'function') partial = partial(this.state || {}, this.props);
    this.state = Object.assign({}, this.state || {}, partial || {});
    this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () { this.__schedule(); };
  DCLogic.prototype.__schedule = function () {
    var self = this;
    if (self.__queued) return;
    self.__queued = true;
    Promise.resolve().then(function () { self.__queued = false; self.__render(); });
  };
  DCLogic.prototype.renderVals = function () { return {}; };
  DCLogic.prototype.__render = function () {
    var vals = this.renderVals() || {};
    var out = [];
    var src = this.__template.content;
    for (var c = src.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 1 && c.localName === 'helmet') continue;
      build(c, vals, '', out);
    }
    patchChildren(this.__root, out);
  };

  function mount() {
    var tpl = document.getElementById('dc-template');
    var script = document.querySelector('script[type="text/x-dc"]');
    if (!tpl || !script) return;
    tagTemplate(tpl.content);

    // <helmet>: estilos e fontes vão para o <head>
    var helmet = tpl.content.querySelector('helmet');
    if (helmet) {
      Array.prototype.slice.call(helmet.childNodes).forEach(function (n) {
        if (n.nodeType === 1) document.head.appendChild(n.cloneNode(true));
      });
    }

    // valores iniciais (data-props)
    var props = {};
    try {
      var decl = JSON.parse(script.getAttribute('data-props') || '{}');
      Object.keys(decl).forEach(function (k) {
        if (k.charAt(0) !== '$' && decl[k] && 'default' in decl[k]) props[k] = decl[k].default;
      });
    } catch (e) { console.error('data-props inválido', e); }

    var Component = new Function('DCLogic', script.textContent + '\n;return Component;')(DCLogic);
    var root = document.createElement('div');
    root.id = 'dc-root';
    tpl.parentNode.insertBefore(root, tpl);
    var inst = new Component(props);
    inst.__template = tpl;
    inst.__root = root;
    inst.__render();
    if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
    window.addEventListener('pagehide', function () {
      if (typeof inst.componentWillUnmount === 'function') inst.componentWillUnmount();
    });
    window.__dc = inst;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
