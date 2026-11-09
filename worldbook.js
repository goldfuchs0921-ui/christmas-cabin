/* worldbook.js — 世界书选择页，并给所有生成功能提供世界书文本
 * 规则：勾选才读，没勾的一律不读（常驻条目也一样）；没有字数上限
 * 两种模式：所有角色共用一份「默认选择」/ 按角色安排（没安排的角色跟随默认）
 * 勾分类 = 读这个分类下的全部词条（以后往里加的新词条也会读到）；也可以只勾单个词条
 * 选择只存在插件自己的存储里；世界书内容每次现读，不会复制保存 */
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
.rcc .wbcard .wbtxt{white-space:pre-wrap;line-height:1.7;font-size:14px}
.rcc .wbcard .wbx{position:absolute;right:10px;top:10px;width:30px;height:30px;font-size:18px}
.rcc .wbdiag{margin-top:14px;font-size:11px;color:var(--soft);line-height:1.7;word-break:break-all}
`;

  function arr(x) { return Array.isArray(x) ? x : []; }
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

  R.add({
    id: "worldbook", style: CSS,
    create: function (ctx) {
      var roche = ctx.roche, st = ctx.st, e = ctx.esc;
      var cfg = { mode: "shared", def: { cats: [], entries: [] }, chars: {} };
      var tree = null, treeErr = "", treeSrc = "", sample = "", loading = false, exp = {}, target = "def", viewing = null;

      function save() { return roche.storage.set("wb", cfg); }
      function selFor(c) {
        if (cfg.mode === "perChar" && c && cfg.chars[c.id] && cfg.chars[c.id].custom) return cfg.chars[c.id].sel;
        return cfg.def;
      }
      function curSel() { return (cfg.mode === "perChar" && target !== "def" && cfg.chars[target]) ? cfg.chars[target].sel : cfg.def; }
      function allCats() { return tree || []; }
      function findCat(id) { return allCats().filter(function (c) { return c.id === id; })[0] || null; }

      async function loadTree(force) {
        if (loading || (tree && !force)) return;
        loading = true; treeErr = "";
        try {
          var wb = roche.worldbook, roots = [], src = "", total = 0;
          if (!wb) throw new Error("没有拿到世界书接口（更新插件时请允许「读取世界书」权限）");
          if (wb.getCategoryTree) {
            try {
              var t = await wb.getCategoryTree();
              roots = arr(Array.isArray(t) ? t : (t && (t.tree || t.categories || t.items || t.roots))).map(normCat);
              src = "getCategoryTree";
            } catch (e1) { roots = []; }
          }
          total = roots.reduce(function (n, c) { return n + c.entries.length; }, 0);
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
          total = tree.reduce(function (n, c) { return n + c.entries.length; }, 0);
        } catch (err) { treeErr = "读取世界书失败：" + (err && err.message || err); tree = null; }
        loading = false;
        ctx.render();
      }

      // 给其他功能用：返回这个角色该读的世界书文本（没勾就是空字符串）
      async function text(c) {
        var sel = selFor(c);
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
      function stat(sel) {
        var n = 0, chars = 0;
        allCats().forEach(function (cat) {
          cat.entries.forEach(function (en) {
            if (sel.cats.indexOf(cat.id) > -1 || sel.entries.indexOf(en.id) > -1) { n++; chars += en.title.length + en.content.length; }
          });
        });
        return { n: n, chars: chars };
      }
      R.worldbook = {
        text: text,
        brief: function () {
          var m = cfg.mode === "perChar" ? "按角色安排" : "所有角色共用", d = cfg.def;
          return m + " · " + ((d.cats.length || d.entries.length) ? "默认已选 " + d.cats.length + " 个分类、" + d.entries.length + " 条词条" : "默认未选（不读世界书）");
        }
      };

      function catHtml(cat, sel) {
        var inCat = sel.cats.indexOf(cat.id) > -1, nSel = cat.entries.filter(function (en) { return inCat || sel.entries.indexOf(en.id) > -1; }).length;
        var state = inCat ? "on" : (nSel ? "part" : ""), pad = 'style="padding-left:' + (cat.depth * 16) + 'px"';
        var h = '<div class="wbr" ' + pad + '><button class="wbk ' + state + '" data-act="worldbook.tcat" data-id="' + e(cat.id) + '" aria-label="勾选整个分类"></button>' +
          '<button class="wbn" data-act="worldbook.exp" data-id="' + e(cat.id) + '"><b>' + e(cat.name) + '</b><small>' + cat.entries.length + ' 条' + (nSel ? "，已选 " + nSel : "") + '</small></button>' +
          '<span class="wbc">' + (exp[cat.id] ? "▾" : "▸") + '</span></div>';
        if (exp[cat.id]) {
          h += cat.entries.map(function (en) {
            var on = inCat || sel.entries.indexOf(en.id) > -1;
            return '<div class="wbr sub" ' + pad + '><button class="wbk ' + (on ? "on" : "") + '" data-act="worldbook.tent" data-id="' + e(en.id) + '" data-c="' + e(cat.id) + '" aria-label="勾选词条"></button>' +
              '<button class="wbn" data-act="worldbook.view" data-id="' + e(en.id) + '" data-c="' + e(cat.id) + '"><b style="font-weight:400">' + e(en.title) + '</b><small>' + en.content.length + ' 字 · 点开查看</small></button></div>';
          }).join("") || '<div class="wbr sub" ' + pad + '><small style="color:var(--soft)">这个分类下没有词条</small></div>';
        }
        return h;
      }
      function treeHtml(sel) {
        if (loading && !tree) return ctx.wait("正在读取世界书…");
        if (treeErr) return '<p class="hint">' + e(treeErr) + '</p><div class="center"><button class="btn sm" data-act="worldbook.reload">重新读取</button></div>';
        if (!tree || !tree.length) return '<p class="hint">没有读到世界书内容。请确认 Roche 里有世界书，并且更新插件时允许了「读取世界书」权限。</p><div class="center"><button class="btn sm" data-act="worldbook.reload">重新读取</button></div>';
        var s = stat(sel);
        return '<div class="wb">' + tree.map(function (c) { return catHtml(c, sel); }).join("") + '</div>' +
          '<div class="wbstat">已选 ' + s.n + ' 条，约 ' + s.chars + ' 字（没有字数上限，选多了生成会变慢、更费钱）</div>' +
          '<div class="center" style="margin:10px 0 0"><button class="link" data-act="worldbook.reload">重新读取世界书</button></div>' +
          '<div class="wbdiag">读到 ' + tree.length + ' 个分类、' + tree.reduce(function (n, c) { return n + c.entries.length; }, 0) + ' 条词条（来源：' + e(treeSrc) + '）' + (sample ? '；词条字段：' + e(sample) : "") + '</div>';
      }
      function chipsHtml() {
        var def = '<button class="chip' + (target === "def" ? " on" : "") + '" data-act="worldbook.target" data-id="def"><div class="av">默认</div><span>默认选择</span></button>';
        return '<div class="chips">' + def + st.chars.map(function (c) {
          var av = c.avatar ? '<img src="' + e(c.avatar) + '" alt="">' : e(ctx.nm(c).slice(0, 1)), custom = cfg.chars[c.id] && cfg.chars[c.id].custom;
          return '<button class="chip' + (target === c.id ? " on" : "") + '" data-act="worldbook.target" data-id="' + e(c.id) + '"><div class="av">' + av + '</div><span>' + e(ctx.nm(c)) + (custom ? "★" : "") + '</span></button>';
        }).join("") + '</div><p class="hint" style="margin-top:0">★ = 已单独自定义，其余角色跟随默认选择。</p>';
      }

      function overlay() {
        if (!viewing) return "";
        var cat = findCat(viewing.c), en = cat && cat.entries.filter(function (x) { return x.id === viewing.id; })[0];
        if (!en) { viewing = null; return ""; }
        return '<div class="wbov"><div class="wbbk" data-act="worldbook.closeview"></div><div class="wbcard"><button class="gbtn wbx" data-act="worldbook.closeview" aria-label="关闭">×</button>' +
          '<h4 class="en">' + e(en.title) + '</h4><div class="wbtxt">' + (e(en.content) || "（这个词条没有内容）") + '</div></div></div>';
      }

      return {
        init: async function () {
          var s = await roche.storage.get("wb");
          if (s && typeof s === "object") { cfg.mode = s.mode === "perChar" ? "perChar" : "shared"; cfg.def = s.def && s.def.cats ? s.def : cfg.def; cfg.chars = s.chars || {}; }
        },
        back: function () { if (viewing) { viewing = null; return true; } ctx.go("settings"); return true; },
        view: function () {
          if (tree === null && !loading && !treeErr) loadTree(true);
          if (cfg.mode === "perChar" && target !== "def" && !st.chars.some(function (c) { return c.id === target; })) target = "def";
          var h = '<p class="hint">勾选了才会读，没勾的一律不读（常驻条目也一样）。读到的内容会拼进所有生成功能的提示词。</p>' +
            '<div class="wbtabs"><button class="' + (cfg.mode === "shared" ? "on" : "") + '" data-act="worldbook.mode" data-m="shared">所有角色共用</button><button class="' +
            (cfg.mode === "perChar" ? "on" : "") + '" data-act="worldbook.mode" data-m="perChar">按角色安排</button></div>';
          if (cfg.mode === "perChar") {
            h += chipsHtml();
            if (target !== "def") {
              var c = st.chars.filter(function (x) { return x.id === target; })[0], me = cfg.chars[target];
              if (!me || !me.custom) {
                var ds = stat(cfg.def);
                return ctx.page("World Book", "世 界 书", h + '<p class="hint">' + e(ctx.nm(c)) + ' 现在跟随默认选择' + (tree ? "（默认读 " + ds.n + " 条）" : "") + '。</p>' +
                  '<div class="center"><button class="btn" data-act="worldbook.custom">改为单独自定义</button></div><p class="hint" style="text-align:center">会先把默认选择复制过来，再由你改。</p>');
              }
              h += '<div class="center" style="margin:0 0 8px"><button class="link" data-act="worldbook.follow">改回跟随默认</button></div>';
            }
          }
          return ctx.page("World Book", "世 界 书", h + treeHtml(curSel())) + overlay();
        },
        act: async function (name, el) {
          var id = el.dataset.id, s, i, cat;
          if (name === "view") { viewing = { id: id, c: el.dataset.c }; return ctx.render(); }
          if (name === "closeview") { viewing = null; return ctx.render(); }
          if (name === "reload") { await loadTree(true); return; }
          if (name === "mode") { cfg.mode = el.dataset.m; if (cfg.mode === "shared") target = "def"; await save(); return ctx.render(); }
          if (name === "target") { target = id; return ctx.render(); }
          if (name === "exp") { exp[id] = !exp[id]; return ctx.render(); }
          if (name === "custom") {
            if (target === "def") return;
            cfg.chars[target] = { custom: true, sel: clone(cfg.def) }; await save(); return ctx.render();
          }
          if (name === "follow") {
            if (target === "def" || !(await roche.ui.confirm({ title: "改回跟随默认", message: "这个角色单独选的内容会丢掉，改成和默认选择一样。确定吗？" }))) return;
            cfg.chars[target] = { custom: false, sel: { cats: [], entries: [] } }; await save(); return ctx.render();
          }
          if (name === "tcat") {
            s = curSel(); cat = findCat(id); if (!cat) return;
            i = s.cats.indexOf(id);
            if (i > -1) s.cats.splice(i, 1);
            else { s.cats.push(id); var ids = cat.entries.map(function (en) { return en.id; }); s.entries = s.entries.filter(function (x) { return ids.indexOf(x) === -1; }); }
            await save(); return ctx.render();
          }
          if (name === "tent") {
            s = curSel(); cat = findCat(el.dataset.c); if (!cat) return;
            if (s.cats.indexOf(cat.id) > -1) {          // 整个分类被勾着：取消其中一条 = 拆成「除这条以外的单个词条」
              s.cats.splice(s.cats.indexOf(cat.id), 1);
              cat.entries.forEach(function (en) { if (en.id !== id && s.entries.indexOf(en.id) < 0) s.entries.push(en.id); });
            } else {
              i = s.entries.indexOf(id);
              if (i > -1) s.entries.splice(i, 1); else s.entries.push(id);
            }
            await save(); return ctx.render();
          }
        }
      };
    }
  });
})();
