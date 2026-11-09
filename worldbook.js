/* worldbook.js — 世界书 · 预设 · 正则（三个标签共用一套「勾选才用 / 共用或按角色安排」的界面，各自的勾选分开存）
 * 世界书：从 Roche 读取；勾选才读，没勾的一律不读（常驻条目也一样）；没有字数上限
 * 预设：导入 Roche 导出的预设文件。提示词拼进所有生成功能；输入正则 = 只把匹配到的记忆/聊天发给 AI；输出正则 = 从生成的文字里删掉匹配内容
 * 正则：导入正则卡包。生成的文字在「显示时」按卡包替换（模板里的 HTML 会渲染，已去掉 script 和事件属性），存的仍是 AI 原文
 * 导入的内容只存在插件自己的存储里，默认都不勾选；勾分类 = 整个分类（以后新增的也算），也可以只勾单个条目 */
(function () {
  "use strict";
  var R = window.RCC;

  var CSS = `
.rcc .wbtabs{display:flex;gap:10px;margin:10px 0 14px}
.rcc .wbtabs button{flex:1;padding:9px 0;border-radius:999px;border:1px solid #8a6a45;background:transparent;color:var(--ink)}
.rcc .wbtabs button.on{background:linear-gradient(#f9e3a0,#dba93c 52%,#b07a1e);border-color:#6e4710;font-weight:600;color:#3a2208}
.rcc .wb{margin:8px 0}
.rcc .wbr{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed rgba(90,58,24,.35)}
.rcc .wbr.sub{padding-left:14px}
.rcc .wbk{flex:0 0 auto;position:relative;width:22px;height:22px;padding:0;border-radius:5px;border:2px solid #8a6a45;background:rgba(255,248,230,.5)}
.rcc .wbk.on{background:#4f7a4a;border-color:#2f4f2c}
.rcc .wbk.on::after{content:"";position:absolute;left:5px;top:1px;width:6px;height:11px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}
.rcc .wbk.part{background:#b07a1e;border-color:#6e4710}
.rcc .wbk.part::after{content:"";position:absolute;left:3px;top:8px;width:10px;height:0;border-top:2.5px solid #fff}
.rcc .wbn{flex:1;min-width:0;padding:0;border:0;background:none;text-align:left;color:var(--ink)}
.rcc .wbn b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rcc .wbn small,.rcc .wbe small{display:block;color:var(--soft);font-size:12px}
.rcc .wbe{flex:1;min-width:0;line-height:1.4}
.rcc .wbc{flex:0 0 auto;color:var(--soft);width:20px;text-align:center}
.rcc .wbstat{margin:10px 0 0;padding:8px 12px;border-radius:8px;background:rgba(255,248,230,.4);box-shadow:inset 0 2px 4px rgba(90,58,24,.2);font-size:13px;color:var(--soft)}
.rcc .wbov{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:18px}
.rcc .wbbk{position:absolute;inset:0;background:rgba(20,10,0,.55)}
.rcc .wbcard{position:relative;width:100%;max-width:520px;max-height:76vh;overflow:auto;padding:20px 18px 18px;border-radius:10px;color:var(--ink);background-color:var(--paper);background-image:var(--tex-paper,none);background-size:256px 256px;box-shadow:inset 0 0 24px rgba(120,76,24,.5),0 0 0 3px #5a3a20,0 10px 24px rgba(0,0,0,.6)}
.rcc .wbcard h4{margin:0 34px 8px 0;font-size:17px}
.rcc .wbcard .wbtxt{white-space:pre-wrap;word-break:break-all;line-height:1.7;font-size:14px}
.rcc .wbcard .wbx{position:absolute;right:10px;top:10px;width:30px;height:30px;font-size:18px}
.rcc .wbdiag{margin-top:14px;font-size:11px;color:var(--soft);line-height:1.7;word-break:break-all}
.rcc .wbpaste{margin:8px 0 12px}
.rcc .wbpaste textarea{display:block;width:100%;min-height:130px;resize:vertical;font-size:13px;line-height:1.5}
.rcc .wbpaste .center{margin:8px 0 0}
`;

  function arr(x) { return Array.isArray(x) ? x : []; }
  function sstr(x) { return x == null ? "" : String(x); }
  function blank(x) { return !sstr(x).trim(); }
  function pick(o, ks) { var i; for (i = 0; i < ks.length; i++) if (o && o[ks[i]] != null && o[ks[i]] !== "") return o[ks[i]]; return ""; }
  function normEntry(x, cid) {
    var title = pick(x, ["title", "name", "comment", "keyword", "label"]) || arr(x && (x.keys || x.keywords))[0] || "条目";
    var id = pick(x, ["id", "entryId", "uid"]);
    return { id: String(id || (cid + ":" + title)), title: String(title), content: String(pick(x, ["content", "text", "body", "description", "value"]) || "") };
  }
  function normCat(x) {
    var id = String(pick(x, ["id", "categoryId", "uid"]) || pick(x, ["name", "title"]));
    return { id: id, name: String(pick(x, ["name", "title", "label"]) || "未命名分类"),
      entries: arr(x && (x.entries || x.items || x.words)).map(function (en) { return normEntry(en, id); }),
      kids: arr(x && (x.children || x.subcategories || x.categories)).map(normCat) };
  }
  function flatten(cats, depth, out) {
    cats.forEach(function (c) { out.push({ id: c.id, name: c.name, entries: c.entries, depth: depth }); flatten(c.kids, depth + 1, out); });
    return out;
  }
  function entryList(r) { return arr(Array.isArray(r) ? r : (r && (r.entries || r.items || r.list || r.data))); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sizeOf(en) { return en.n == null ? en.content.length : en.n; }

  // 预设 / 正则条目在查看窗口里显示的说明文字（纯文字，不渲染）
  function presetDetail(it) {
    return "提示词：\n" + (blank(it.content) ? "（空）" : it.content) +
      "\n\n输出正则（" + (it.outOn ? "开" : "关") + "）：\n" + (blank(it.outRx) ? "（空）" : it.outRx) +
      "\n\n输入正则（" + (it.inOn ? "开" : "关") + "）：\n" + (blank(it.inRx) ? "（空）" : it.inRx);
  }
  function rxDetail(it) {
    return "正则：\n" + (blank(it.regex) ? "（空）" : it.regex) + "\n\n替换成：\n" + (blank(it.html) ? "（空）" : it.html);
  }

  // 去掉 script / 事件属性 / javascript: 链接，样式保留
  function clean(h) {
    var t = document.createElement("template");
    t.innerHTML = h;
    t.content.querySelectorAll("script,iframe,object,embed,link,meta,base,form").forEach(function (n) { n.remove(); });
    t.content.querySelectorAll("*").forEach(function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        var nm = a.name.toLowerCase();
        if (nm.indexOf("on") === 0 || nm === "srcdoc" || ((nm === "href" || nm === "src" || nm === "xlink:href" || nm === "action" || nm === "formaction") && /^\s*javascript:/i.test(a.value))) n.removeAttribute(a.name);
      });
    });
    return t.innerHTML;
  }

  R.add({
    id: "worldbook", style: CSS,
    create: function (ctx) {
      var roche = ctx.roche, st = ctx.st, e = ctx.esc;
      function mk(key) { return { key: key, mode: "shared", def: { cats: [], entries: [] }, chars: {}, lib: [] }; }
      var T = { wb: mk("wb"), pre: mk("pre"), rx: mk("rgx") };
      var NAME = { wb: "世界书", pre: "预设", rx: "正则" };
      var tab = "wb", tree = null, treeErr = "", treeSrc = "", sample = "", loading = false, exp = {}, target = "def", viewing = null, pasteOpen = false, BAD = {};

      function save(t) {
        var o = { mode: t.mode, def: t.def, chars: t.chars };
        if (t.key !== "wb") o.lib = t.lib;
        return roche.storage.set(t.key, o);
      }
      function load(t, s) {
        if (!s || typeof s !== "object") return;
        t.mode = s.mode === "perChar" ? "perChar" : "shared";
        if (s.def && Array.isArray(s.def.cats)) t.def = { cats: arr(s.def.cats), entries: arr(s.def.entries) };
        t.chars = s.chars || {};
        if (t.key !== "wb") t.lib = arr(s.lib);
      }
      function selFor(t, c) {
        if (t.mode === "perChar" && c && t.chars[c.id] && t.chars[c.id].custom) return t.chars[c.id].sel;
        return t.def;
      }
      function curSel(t) { return (t.mode === "perChar" && target !== "def" && t.chars[target]) ? t.chars[target].sel : t.def; }

      // 界面上用的「分类 → 条目」列表（世界书来自 Roche，预设/正则来自插件自己的库）
      function groups(t) {
        if (t.key === "wb") return tree || [];
        return t.lib.map(function (cat) {
          return { id: cat.id, name: cat.name, depth: 0, entries: arr(cat.items).map(function (it) {
            return t.key === "pre" ? { id: it.id, title: it.title || "（未命名）", content: presetDetail(it), n: sstr(it.content).length }
              : { id: it.id, title: it.name || "（未命名）", content: rxDetail(it), n: sstr(it.html).length };
          }) };
        });
      }
      function findCat(t, id) { return groups(t).filter(function (c) { return c.id === id; })[0] || null; }
      function stat(t, sel) {
        var n = 0, chars = 0;
        groups(t).forEach(function (cat) {
          cat.entries.forEach(function (en) {
            if (sel.cats.indexOf(cat.id) > -1 || sel.entries.indexOf(en.id) > -1) { n++; chars += en.title.length + sizeOf(en); }
          });
        });
        return { n: n, chars: chars };
      }
      // 这个角色该用的预设条目 / 正则条目（原始数据）
      function selectedItems(t, c) {
        var sel = selFor(t, c), out = [], seen = {};
        t.lib.forEach(function (cat) {
          var all = sel.cats.indexOf(cat.id) > -1;
          arr(cat.items).forEach(function (it) {
            if ((all || sel.entries.indexOf(it.id) > -1) && !seen[it.id]) { seen[it.id] = 1; out.push(it); }
          });
        });
        return out;
      }
      function prune(t) {
        var ids = {}, cats = {};
        t.lib.forEach(function (c) { cats[c.id] = 1; arr(c.items).forEach(function (i) { ids[i.id] = 1; }); });
        function fix(s) { s.cats = s.cats.filter(function (x) { return cats[x]; }); s.entries = s.entries.filter(function (x) { return ids[x]; }); }
        fix(t.def);
        Object.keys(t.chars).forEach(function (k) { if (t.chars[k] && t.chars[k].sel) fix(t.chars[k].sel); });
      }

      // ---------- 正则：编译 / 输入筛选 / 输出处理 ----------
      function mkRe(src) {
        var s = sstr(src).trim();
        if (!s) return null;
        var m = /^\/([\s\S]+)\/([a-z]*)$/.exec(s), p = s, f = "g";
        if (m) { p = m[1]; f = m[2]; if (f.indexOf("g") < 0) f += "g"; }
        try { return new RegExp(p, f); } catch (err) {
          if (!BAD[s]) { BAD[s] = 1; roche.ui.toast("有一条正则写错了，已跳过：" + s.slice(0, 18)); }
          return null;
        }
      }
      // 输入：预设里开着的输入正则，只留下匹配到的部分；一条都没匹配到就保持原样，免得把内容全丢了
      function inFilter(text, c) {
        var t = sstr(text);
        if (!t) return t;
        var ps = selectedItems(T.pre, c).filter(function (p) { return p.inOn && !blank(p.inRx); }), parts = [];
        if (!ps.length) return t;
        ps.forEach(function (p) { var re = mkRe(p.inRx); if (re) { var m = t.match(re); if (m) parts = parts.concat(m); } });
        return parts.length ? parts.join("\n") : t;
      }
      // 输出：先按预设的输出正则删掉匹配内容，再按正则卡包替换（模板有 HTML 就渲染），返回可以直接放进页面的 HTML
      function outHtml(text, c) {
        var raw = sstr(text), pres = selectedItems(T.pre, c).filter(function (p) { return p.outOn && !blank(p.outRx); }), cards = selectedItems(T.rx, c), htmls = [];
        if (!pres.length && !cards.length) return e(raw);
        pres.forEach(function (p) { var re = mkRe(p.outRx); if (re) raw = raw.replace(re, "").trim(); });
        cards.forEach(function (en) {
          var re = mkRe(en.regex), tpl = sstr(en.html);
          if (!re) return;
          var isHtml = /<[a-z!\/]/i.test(tpl);
          raw = raw.replace(re, function () {
            var m = arguments, g = m[0];
            var r = tpl.replace(/\$(\d+|&)/g, function (x, k) { return k === "&" ? g : ((+k <= m.length - 3 && typeof m[+k] === "string") ? m[+k] : ""); });
            htmls.push(isHtml ? clean(r) : e(r));
            return "\uE000" + (htmls.length - 1) + "\uE001";
          });
        });
        return e(raw).replace(/\uE000(\d+)\uE001/g, function (x, i) { return htmls[+i] || ""; });
      }

      // ---------- 世界书：从 Roche 读取 ----------
      async function loadTree(force) {
        if (loading || (tree && !force)) return;
        loading = true; treeErr = "";
        try {
          var wb = roche.worldbook, roots = [], src = "";
          if (!wb) throw new Error("没有拿到世界书接口（更新插件时请允许「读取世界书」权限）");
          if (wb.getCategoryTree) {
            try {
              var t = await wb.getCategoryTree();
              roots = arr(Array.isArray(t) ? t : (t && (t.tree || t.categories || t.items || t.roots))).map(normCat);
              src = "getCategoryTree";
            } catch (e1) { roots = []; }
          }
          if (!roots.length && wb.list) {
            var cs = arr(await wb.list()), k;
            for (k = 0; k < cs.length; k++) {
              var c0 = normCat(cs[k]);
              if (!c0.entries.length && wb.getEntries) {
                try { c0.entries = entryList(await wb.getEntries({ categoryId: c0.id })).map(function (en) { return normEntry(en, c0.id); }); } catch (e2) { /* 这一类读不到就空着 */ }
              }
              roots.push(c0);
            }
            src = "list+getEntries";
          }
          if (!roots.some(function (c) { return c.entries.length; }) && wb.getEntries) {
            var all = entryList(await wb.getEntries({}));
            if (all.length) { roots = [{ id: "__all", name: "全部词条", entries: all.map(function (en) { return normEntry(en, "__all"); }), kids: [] }]; src = "getEntries"; }
          }
          tree = flatten(roots, 0, []);
          treeSrc = src || "（没有读到）";
          var first = tree.filter(function (c) { return c.entries.length; })[0];
          sample = first ? Object.keys(first.entries[0]).join("、") : "";
        } catch (err) { treeErr = "读取世界书失败：" + (err && err.message || err); tree = null; }
        loading = false;
        ctx.render();
      }

      // 给其他功能用：这个角色该读的世界书文本（没勾就是空字符串）
      async function text(c) {
        var sel = selFor(T.wb, c);
        if (!sel || (!sel.cats.length && !sel.entries.length)) return "";
        await loadTree(false);
        if (!tree) return "";
        var out = [], seen = {};
        function add(en) { if (seen[en.id]) return; seen[en.id] = 1; out.push("· " + en.title + (en.content ? "：" + en.content.replace(/\s+/g, " ").trim() : "")); }
        tree.forEach(function (cat) {
          if (sel.cats.indexOf(cat.id) > -1) cat.entries.forEach(add);
          else cat.entries.forEach(function (en) { if (sel.entries.indexOf(en.id) > -1) add(en); });
        });
        return out.join("\n");
      }
      R.worldbook = {
        text: text, inFilter: inFilter, out: outHtml,
        presetText: function (c) {
          return selectedItems(T.pre, c).filter(function (p) { return !blank(p.content); })
            .map(function (p) { return "【" + (blank(p.title) ? "预设" : p.title.trim()) + "】\n" + sstr(p.content).trim(); }).join("\n\n");
        },
        brief: function () {
          function n(t) { return t.def.cats.length + t.def.entries.length; }
          return "世界书默认选 " + n(T.wb) + " 项 · 预设 " + n(T.pre) + " 项 · 正则 " + n(T.rx) + " 项";
        }
      };

      // ---------- 导入 ----------
      function normPre(c) {
        var raw = arr(c && c.presets), items = raw.map(function (p) {
          p = p || {};
          return { id: ctx.uid(), title: sstr(p.title).trim(), content: sstr(p.content), outRx: sstr(p.outputRegex), outOn: !!p.isOutputRegexEnabled, inRx: sstr(p.inputRegex), inOn: !!p.isInputRegexEnabled };
        }).filter(function (p) { return !(blank(p.title) && blank(p.content) && blank(p.outRx) && blank(p.inRx)); });
        return { name: sstr(c && c.name).trim() || "未命名分类", total: raw.length, items: items };
      }
      function normRx(c) {
        var raw = arr(c && c.entries), items = raw.map(function (p) {
          p = p || {};
          return { id: ctx.uid(), name: sstr(p.name).trim(), regex: sstr(p.regex), html: sstr(p.html) };
        }).filter(function (p) { return !(blank(p.name) && blank(p.regex) && blank(p.html)); });
        return { name: sstr(c && c.name).trim() || "未命名卡包", scope: sstr(c && c.scope), total: raw.length, items: items };
      }
      function parseImport(txt) {
        var j;
        try { j = JSON.parse(sstr(txt).replace(/^\uFEFF/, "")); } catch (err) { throw new Error("不是有效的 JSON 文本，请检查有没有复制完整"); }
        var cs = j && Array.isArray(j.categories) ? j.categories : null;
        if (!cs) throw new Error("格式不认识，只支持 Roche 导出的预设文件和正则卡包");
        var isPre = j.type === "roche_presets" || cs.some(function (c) { return c && Array.isArray(c.presets); });
        var isRx = cs.some(function (c) { return c && Array.isArray(c.entries); });
        if (isPre && !isRx) return { k: "pre", cats: cs.map(normPre) };
        if (isRx && !isPre) return { k: "rx", cats: cs.map(normRx) };
        throw new Error(cs.length ? "看不出这是预设还是正则卡包" : "里面没有内容");
      }
      function uniq(t, name) {
        var n = name, i = 2;
        while (t.lib.some(function (x) { return x.name === n; })) n = name + "（" + (i++) + "）";
        return n;
      }
      async function doImport(txt) {
        var r = parseImport(txt), t = T[r.k], nc = 0, ni = 0, skip = 0, i;
        for (i = 0; i < r.cats.length; i++) {
          var cat = r.cats[i];
          skip += cat.total - cat.items.length;
          if (!cat.items.length) continue;
          var ex = t.lib.filter(function (x) { return x.name === cat.name; })[0];
          if (ex && await roche.ui.confirm({ title: "同名分类", message: "已经有一个叫「" + cat.name + "」的分类。确定 = 覆盖它；取消 = 另存成新的分类。" })) {
            ex.items = cat.items; if (cat.scope) ex.scope = cat.scope;
          } else t.lib.push({ id: ctx.uid(), name: ex ? uniq(t, cat.name) : cat.name, scope: cat.scope, items: cat.items });
          nc++; ni += cat.items.length;
        }
        if (!ni) throw new Error("里面没有内容（全是空白），没有导入");
        prune(t); await save(t);
        tab = r.k; pasteOpen = false; st.wbPaste = "";
        roche.ui.toast("已导入 " + nc + " 个分类、" + ni + " 条" + (skip ? "，跳过 " + skip + " 条空白" : "") + "，默认都没勾选");
        ctx.render();
      }

      // ---------- 界面 ----------
      function tabsHtml() {
        return '<div class="tabs">' + ["wb", "pre", "rx"].map(function (k) {
          return '<button class="' + (tab === k ? "on" : "") + '" data-act="worldbook.tab" data-t="' + k + '">' + NAME[k] + '</button>';
        }).join("") + '</div>';
      }
      function hintHtml() {
        if (tab === "pre") return '<p class="hint">勾选了才会用：预设的提示词会拼进所有生成功能；输入正则只把匹配到的记忆和聊天发给 AI；输出正则会把生成文字里匹配到的内容删掉。</p>';
        if (tab === "rx") return '<p class="hint">勾选了才会生效：生成出来的文字里，匹配到的内容会换成卡包里的模板（可以是 HTML）。只在显示时替换，AI 原文不变；好孩子名单和礼物这类 JSON 结果不替换。</p>';
        return '<p class="hint">勾选了才会读，没勾的一律不读（常驻条目也一样）。读到的内容会拼进所有生成功能的提示词。</p>';
      }
      function modeHtml(t) {
        return '<div class="wbtabs"><button class="' + (t.mode === "shared" ? "on" : "") + '" data-act="worldbook.mode" data-m="shared">所有角色共用</button><button class="' +
          (t.mode === "perChar" ? "on" : "") + '" data-act="worldbook.mode" data-m="perChar">按角色安排</button></div>';
      }
      function importHtml() {
        var h = '<div class="center" style="margin:4px 0 8px"><button class="btn sm" data-act="worldbook.file">导入文件</button> <button class="btn ghost sm" data-act="worldbook.pasteToggle">' + (pasteOpen ? "收起粘贴" : "粘贴导入") + '</button></div>';
        if (pasteOpen) h += '<div class="wbpaste"><textarea class="in" data-in="wbPaste" placeholder="把导出的预设或正则卡包的 JSON 文本粘贴到这里">' + e(st.wbPaste || "") + '</textarea><div class="center"><button class="btn sm" data-act="worldbook.pasteGo">导入</button></div></div>';
        return h;
      }
      function catHtml(t, cat, sel) {
        var xk = t.key + ":" + cat.id, open = exp[xk];
        var inCat = sel.cats.indexOf(cat.id) > -1, nSel = cat.entries.filter(function (en) { return inCat || sel.entries.indexOf(en.id) > -1; }).length;
        var state = inCat ? "on" : (nSel ? "part" : ""), pad = 'style="padding-left:' + (cat.depth * 16) + 'px"';
        var h = '<div class="wbr" ' + pad + '><button class="wbk ' + state + '" data-act="worldbook.tcat" data-id="' + e(cat.id) + '" aria-label="勾选整个分类"></button>' +
          '<button class="wbn" data-act="worldbook.exp" data-id="' + e(cat.id) + '"><b>' + e(cat.name) + '</b><small>' + cat.entries.length + ' 条' + (nSel ? "，已选 " + nSel : "") + '</small></button>' +
          '<span class="wbc">' + (open ? "▾" : "▸") + '</span></div>';
        if (open) {
          h += cat.entries.map(function (en) {
            var on = inCat || sel.entries.indexOf(en.id) > -1;
            return '<div class="wbr sub" ' + pad + '><button class="wbk ' + (on ? "on" : "") + '" data-act="worldbook.tent" data-id="' + e(en.id) + '" data-c="' + e(cat.id) + '" aria-label="勾选条目"></button>' +
              '<button class="wbn" data-act="worldbook.view" data-id="' + e(en.id) + '" data-c="' + e(cat.id) + '"><b style="font-weight:400">' + e(en.title) + '</b><small>' + sizeOf(en) + ' 字 · 点开查看</small></button></div>';
          }).join("") || '<div class="wbr sub" ' + pad + '><small style="color:var(--soft)">这个分类下没有内容</small></div>';
          if (t.key !== "wb") h += '<div class="wbr sub" ' + pad + '><button class="link" data-act="worldbook.delcat" data-id="' + e(cat.id) + '">删除这个分类</button></div>';
        }
        return h;
      }
      function treeHtml(t, sel) {
        var s, gs;
        if (t.key !== "wb") {
          gs = groups(t);
          if (!gs.length) return '<p class="hint">还没有导入内容。点上面的「导入文件」或「粘贴导入」，导入从 Roche 导出的' + (t.key === "pre" ? "预设" : "正则卡包") + '。</p>';
          s = stat(t, sel);
          return '<div class="wb">' + gs.map(function (c) { return catHtml(t, c, sel); }).join("") + '</div>' +
            '<div class="wbstat">已选 ' + s.n + ' 条（导入的内容默认都不勾选）</div>' +
            '<div class="center" style="margin:10px 0 0"><button class="link" data-act="worldbook.clear">清空全部' + NAME[t.key] + '</button></div>';
        }
        if (loading && !tree) return ctx.wait("正在读取世界书…");
        if (treeErr) return '<p class="hint">' + e(treeErr) + '</p><div class="center"><button class="btn sm" data-act="worldbook.reload">重新读取</button></div>';
        if (!tree || !tree.length) return '<p class="hint">没有读到世界书内容。请确认 Roche 里有世界书，并且更新插件时允许了「读取世界书」权限。</p><div class="center"><button class="btn sm" data-act="worldbook.reload">重新读取</button></div>';
        s = stat(t, sel);
        return '<div class="wb">' + tree.map(function (c) { return catHtml(t, c, sel); }).join("") + '</div>' +
          '<div class="wbstat">已选 ' + s.n + ' 条，约 ' + s.chars + ' 字（没有字数上限，选多了生成会变慢、更费钱）</div>' +
          '<div class="center" style="margin:10px 0 0"><button class="link" data-act="worldbook.reload">重新读取世界书</button></div>' +
          '<div class="wbdiag">读到 ' + tree.length + ' 个分类、' + tree.reduce(function (n, c) { return n + c.entries.length; }, 0) + ' 条词条（来源：' + e(treeSrc) + '）' + (sample ? '；词条字段：' + e(sample) : "") + '</div>';
      }
      function chipsHtml(t) {
        var def = '<button class="chip' + (target === "def" ? " on" : "") + '" data-act="worldbook.target" data-id="def"><div class="av">默认</div><span>默认选择</span></button>';
        return '<div class="chips">' + def + st.chars.map(function (c) {
          var av = c.avatar ? '<img src="' + e(c.avatar) + '" alt="">' : e(ctx.nm(c).slice(0, 1)), custom = t.chars[c.id] && t.chars[c.id].custom;
          return '<button class="chip' + (target === c.id ? " on" : "") + '" data-act="worldbook.target" data-id="' + e(c.id) + '"><div class="av">' + av + '</div><span>' + e(ctx.nm(c)) + (custom ? "★" : "") + '</span></button>';
        }).join("") + '</div><p class="hint" style="margin-top:0">★ = 已单独自定义，其余角色跟随默认选择。</p>';
      }
      function overlay() {
        if (!viewing) return "";
        var t = T[viewing.t], cat = findCat(t, viewing.c), en = cat && cat.entries.filter(function (x) { return x.id === viewing.id; })[0];
        if (!en) { viewing = null; return ""; }
        return '<div class="wbov"><div class="wbbk" data-act="worldbook.closeview"></div><div class="wbcard"><button class="gbtn wbx" data-act="worldbook.closeview" aria-label="关闭">×</button>' +
          '<h4 class="en">' + e(en.title) + '</h4><div class="wbtxt">' + (e(en.content) || "（这个条目没有内容）") + '</div>' +
          (t.key !== "wb" ? '<div class="center" style="margin:12px 0 0"><button class="btn ghost sm" data-act="worldbook.delent">删除这条</button></div>' : "") + '</div></div>';
      }

      return {
        init: async function () {
          var rs = await Promise.all([roche.storage.get("wb"), roche.storage.get("pre"), roche.storage.get("rgx")]);
          load(T.wb, rs[0]); load(T.pre, rs[1]); load(T.rx, rs[2]);
        },
        back: function () {
          if (viewing) { viewing = null; return true; }
          if (pasteOpen) { pasteOpen = false; return true; }
          ctx.go("settings"); return true;
        },
        view: function () {
          var t = T[tab];
          if (tab === "wb" && tree === null && !loading && !treeErr) loadTree(true);
          if (t.mode === "perChar" && target !== "def" && !st.chars.some(function (c) { return c.id === target; })) target = "def";
          var h = tabsHtml() + hintHtml() + modeHtml(t);
          if (tab !== "wb") h += importHtml();
          if (t.mode === "perChar") {
            h += chipsHtml(t);
            if (target !== "def") {
              var c = st.chars.filter(function (x) { return x.id === target; })[0], me = t.chars[target];
              if (!me || !me.custom) {
                var ds = stat(t, t.def);
                return ctx.page("Library", "世界书 · 预设 · 正则", h + '<p class="hint">' + e(ctx.nm(c)) + ' 现在跟随默认选择' + ((tab !== "wb" || tree) ? "（默认选了 " + ds.n + " 条）" : "") + '。</p>' +
                  '<div class="center"><button class="btn" data-act="worldbook.custom">改为单独自定义</button></div><p class="hint" style="text-align:center">会先把默认选择复制过来，再由你改。</p>') + overlay();
              }
              h += '<div class="center" style="margin:0 0 8px"><button class="link" data-act="worldbook.follow">改回跟随默认</button></div>';
            }
          }
          return ctx.page("Library", "世界书 · 预设 · 正则", h + treeHtml(t, curSel(t))) + overlay();
        },
        act: async function (name, el) {
          var id = el.dataset.id, t = T[tab], s, i, cat;
          if (name === "tab") { tab = el.dataset.t; pasteOpen = false; viewing = null; return ctx.render(); }
          if (name === "view") { viewing = { id: id, c: el.dataset.c, t: tab }; return ctx.render(); }
          if (name === "closeview") { viewing = null; return ctx.render(); }
          if (name === "reload") { await loadTree(true); return; }
          if (name === "mode") { t.mode = el.dataset.m; if (t.mode === "shared") target = "def"; await save(t); return ctx.render(); }
          if (name === "target") { target = id; return ctx.render(); }
          if (name === "exp") { exp[tab + ":" + id] = !exp[tab + ":" + id]; return ctx.render(); }
          if (name === "custom") {
            if (target === "def") return;
            t.chars[target] = { custom: true, sel: clone(t.def) }; await save(t); return ctx.render();
          }
          if (name === "follow") {
            if (target === "def" || !(await roche.ui.confirm({ title: "改回跟随默认", message: "这个角色单独选的内容会丢掉，改成和默认选择一样。确定吗？" }))) return;
            t.chars[target] = { custom: false, sel: { cats: [], entries: [] } }; await save(t); return ctx.render();
          }
          if (name === "tcat") {
            s = curSel(t); cat = findCat(t, id); if (!cat) return;
            i = s.cats.indexOf(id);
            if (i > -1) s.cats.splice(i, 1);
            else { s.cats.push(id); var ids = cat.entries.map(function (en) { return en.id; }); s.entries = s.entries.filter(function (x) { return ids.indexOf(x) === -1; }); }
            await save(t); return ctx.render();
          }
          if (name === "tent") {
            s = curSel(t); cat = findCat(t, el.dataset.c); if (!cat) return;
            if (s.cats.indexOf(cat.id) > -1) {          // 整个分类被勾着：取消其中一条 = 拆成「除这条以外的单个条目」
              s.cats.splice(s.cats.indexOf(cat.id), 1);
              cat.entries.forEach(function (en) { if (en.id !== id && s.entries.indexOf(en.id) < 0) s.entries.push(en.id); });
            } else {
              i = s.entries.indexOf(id);
              if (i > -1) s.entries.splice(i, 1); else s.entries.push(id);
            }
            await save(t); return ctx.render();
          }
          // ----- 导入 / 删除（只有预设、正则标签有）-----
          if (name === "pasteToggle") { pasteOpen = !pasteOpen; return ctx.render(); }
          if (name === "pasteGo") {
            if (blank(st.wbPaste)) return roche.ui.toast("先把内容粘贴到框里");
            try { await doImport(st.wbPaste); } catch (err) { roche.ui.toast("导入失败：" + (err && err.message || err)); }
            return;
          }
          if (name === "file") {
            var inp = document.createElement("input");
            inp.type = "file";   // 不写 accept：iOS 的文件选择器会把 json 灰掉
            inp.onchange = async function () {
              var f = inp.files && inp.files[0];
              if (!f) return;
              if (f.size > 5 * 1048576) return roche.ui.toast("这个文件超过 5MB，不像是预设或正则卡包");
              try { await doImport(await f.text()); } catch (err) { roche.ui.toast("导入失败：" + (err && err.message || err)); }
            };
            return inp.click();
          }
          if (name === "delent") {
            var vt = viewing && T[viewing.t];
            if (!vt || vt.key === "wb") return;
            if (!(await roche.ui.confirm({ title: "删除", message: "确定删除这一条吗？删掉就找不回来了。" }))) return;
            vt.lib.forEach(function (c2) { if (c2.id === viewing.c) c2.items = arr(c2.items).filter(function (x) { return x.id !== viewing.id; }); });
            prune(vt); await save(vt); viewing = null; return ctx.render();
          }
          if (name === "delcat") {
            if (t.key === "wb") return;
            var tc = t.lib.filter(function (x) { return x.id === id; })[0];
            if (!tc || !(await roche.ui.confirm({ title: "删除分类", message: "确定删除「" + tc.name + "」和里面的全部内容吗？" }))) return;
            t.lib = t.lib.filter(function (x) { return x.id !== id; });
            prune(t); await save(t); return ctx.render();
          }
          if (name === "clear") {
            if (t.key === "wb" || !t.lib.length) return;
            if (!(await roche.ui.confirm({ title: "清空全部" + NAME[t.key], message: "导入的" + NAME[t.key] + "和它们的勾选都会清空，确定吗？" }))) return;
            t.lib = []; t.def = { cats: [], entries: [] }; t.chars = {};
            await save(t); return ctx.render();
          }
        }
      };
    }
  });
})();
