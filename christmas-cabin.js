/* 圣诞小屋 v1.3.0 — 核心文件（入口）
 * 负责：加载模块、共享状态、AI 调用（流式可选）、后台任务、路由、事件分发
 * 界面和功能都在 modules/ 里，哪里不对改哪个文件：
 *   （所有文件都直接放在仓库最外层，不用文件夹）
 *   theme 材质样式 · home 主页 · settings 设置页 · cert 好孩子名单 · gift 礼物盲盒 · mail 圣诞信箱 · santa 神秘圣诞老人 · record 唱片机
 */
(function () {
  "use strict";
  var VER = "1.3.0";
  var BASE = "https://raw.githubusercontent.com/goldfuchs0921-ui/christmas-cabin/main/";
  try {
    var cs = document.currentScript;
    if (cs && cs.src && /christmas-cabin\.js/.test(cs.src)) BASE = cs.src.replace(/[^\/]*$/, "");
  } catch (e) { /* 用默认地址 */ }
  var MODULES = ["theme", "home", "settings", "cert", "gift", "mail", "santa", "record"];

  var R = window.RCC = window.RCC || {};
  R.mods = R.mods || []; R.status = R.status || {}; R.base = BASE; R.ver = VER;
  R.add = function (m) { R.mods = R.mods.filter(function (x) { return x.id !== m.id; }); R.mods.push(m); };

  function loadScript(url) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = url; s.async = false;
      s.onload = function () { resolve(true); };
      s.onerror = function () {
        s.remove();
        fetch(url).then(function (r) { return r.ok ? r.text() : Promise.reject(new Error("HTTP " + r.status)); })
          .then(function (t) { (0, eval)(t + "\n//# sourceURL=" + url); resolve(true); })
          .catch(function () { resolve(false); });
      };
      document.head.appendChild(s);
    });
  }
  var loading = null;
  function loadAll() {
    if (!loading) loading = (async function () {
      for (var i = 0; i < MODULES.length; i++) R.status[MODULES[i]] = await loadScript(BASE + MODULES[i] + ".js?v=" + VER);
    })();
    return loading;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; });
  }
  var NEG = /疼|痛|牙|蛀|病|死|哭|伤|难过|焦虑|抑郁|失眠|吵架|分手|医院|药|害怕|崩溃|生气|讨厌|孤独|压力|委屈|噩梦|自杀|累/;

  window.RochePlugin.register({
    id: "christmas-cabin", name: "圣诞小屋", version: VER,
    apps: [{
      id: "christmas-cabin-home", name: "圣诞小屋", icon: "redeem", iconImage: "",

      async mount(container, roche) {
        await loadAll();
        var DEF = { stream: false, snow: true, memory: true, chatLines: 20, test: false };
        var st = { view: "home", chars: [], user: null, sel: null, multi: [], jobs: {}, live: {}, anim: null,
          d: null, wishes: [], letters: [], wishReply: null, errs: [] };
        var cfg = {}, handlers = {};

        container.innerHTML = '<div class="rcc"><div class="snowfield"></div><div class="scroll"></div></div>';
        var root = container.querySelector(".rcc"), view = container.querySelector(".scroll"), snow = container.querySelector(".snowfield");
        var fl = "";
        for (var i = 0; i < 26; i++) {
          var sz = 2 + Math.random() * 3;
          fl += '<i class="flake" style="left:' + (Math.random() * 100).toFixed(1) + '%;width:' + sz.toFixed(1) + 'px;height:' + sz.toFixed(1) +
            'px;animation-duration:' + (7 + Math.random() * 9).toFixed(1) + 's;animation-delay:-' + (Math.random() * 12).toFixed(1) + 's"></i>';
        }
        snow.innerHTML = fl;
        var styleEl = document.createElement("style");
        styleEl.id = "rcc-style";
        styleEl.textContent = ".rcc{height:100%;overflow:hidden}.rcc .scroll{height:100%;overflow-y:auto}" + R.mods.map(function (m) { return m.style || ""; }).join("\n");
        document.head.appendChild(styleEl);

        try { st.chars = (await roche.character.list()) || []; } catch (e) { st.chars = []; }
        try { st.user = await roche.persona.getActiveUserPersona(); } catch (e) { st.user = null; }
        st.sel = st.chars[0] ? st.chars[0].id : null;
        st.d = (await roche.storage.get("data")) || {};
        st.d.cert = st.d.cert || {}; st.d.gift = st.d.gift || {}; st.d.ready = st.d.ready || {};
        var saved = (await roche.storage.get("cfg")) || {};
        Object.keys(DEF).forEach(function (k) { cfg[k] = saved[k] === undefined ? DEF[k] : saved[k]; });
        st.wishes = (await roche.storage.get("wishes")) || [];
        st.letters = (await roche.storage.get("letters")) || [];
        st.wishReply = (await roche.storage.get("wishReply")) || null;

        function save() { return roche.storage.set("data", st.d); }
        function saveCfg() { return roche.storage.set("cfg", cfg); }
        function applyCfg() { snow.style.display = cfg.snow ? "" : "none"; }
        function curChar() { return st.chars.filter(function (c) { return c.id === st.sel; })[0] || null; }
        function charById(id) { return st.chars.filter(function (c) { return c.id === id; })[0] || null; }
        function nm(c) { return (c && (c.handle || c.name)) || "TA"; }
        function userName() { return (st.user && (st.user.handle || st.user.name)) || "你"; }
        function uid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random(); }
        function fmt(ts) { return new Date(ts).toLocaleDateString("zh-CN", { month: "long", day: "numeric" }); }
        function hasJob(p) { return Object.keys(st.jobs).some(function (k) { return k.indexOf(p) === 0; }); }
        function imgSrc(r) {
          if (!r) return "";
          if (typeof r === "string") return r;
          var a = r.url || r.imageUrl || r.image;
          if (a) return typeof a === "string" ? a : (a.url || "");
          var l = (r.images || r.data || [])[0];
          if (l) return typeof l === "string" ? l : (l.url || (l.b64_json ? "data:image/png;base64," + l.b64_json : ""));
          return r.base64 ? "data:image/png;base64," + r.base64 : "";
        }
        function derange(a) {
          var b;
          do { b = a.slice().sort(function () { return Math.random() - 0.5; }); } while (b.some(function (x, i) { return x === a[i]; }));
          return b;
        }

        // 记忆 + 最近聊天（都会过滤掉带疼痛/不适/负面的句子）
        async function context(c) {
          if (!c || !c.conversationId) return "";
          var parts = [];
          if (cfg.memory) {
            try {
              var m = await roche.memory.getLongTerm({ conversationId: c.conversationId, limit: 60 }), lines = [];
              if (m.core && m.core.summary) lines = lines.concat(String(m.core.summary).split(/\n|。/));
              (m.facts || []).forEach(function (f) { lines.push(f.summaryText || f.action || f.text || ""); });
              var t = lines.map(function (x) { return String(x).trim(); }).filter(function (x) { return x && x.length < 100 && !NEG.test(x); }).slice(0, 20).join("\n");
              if (t) parts.push(t);
            } catch (e) { /* 读不到就算了 */ }
          }
          if (cfg.chatLines > 0) {
            try {
              var ms = (await roche.memory.getShortTerm({ conversationId: c.conversationId, limit: cfg.chatLines })) || [];
              var ct = ms.filter(function (x) { return x && x.text && (!x.type || x.type === "text"); })
                .map(function (x) { return (x.senderHandle || x.senderName || "") + "：" + String(x.text).replace(/\s+/g, " ").slice(0, 80); })
                .filter(function (x) { return !NEG.test(x); }).slice(-cfg.chatLines).join("\n");
              if (ct) parts.push("【近期聊天片段】\n" + ct);
            } catch (e) { /* 读不到就算了 */ }
          }
          return parts.join("\n");
        }
        function sysFor(c, ctxText) {
          var u = st.user || {};
          return "你是" + (c.name || nm(c)) + "（昵称" + nm(c) + "），请完全以这个角色的口吻和性格说话。\n" +
            "【角色人设】\n" + String(c.persona || c.bio || "").slice(0, 800) + "\n" +
            "【对方】" + userName() + (u.persona ? "：" + String(u.persona).slice(0, 300) : "") + "\n" +
            "【你对对方已有的了解（只取其中愉快的、喜好相关的部分）】\n" + (ctxText || "（暂无，请根据人设合理推测）") + "\n" +
            "【硬性规则】只使用对方的喜好和愉快的话题；绝不提及疼痛、疾病、不适、负面经历或让人难过的事；" +
            "不要出现“记忆”“系统”“AI”等字样；不要使用 emoji；不要写多余的说明。";
        }

        function live(key, text) {
          st.live[key] = text;
          var el = view.querySelector('[data-live="' + key + '"]');
          if (el) el.textContent = text;
        }
        async function readStream(r, key) {
          var full = "";
          function push(t) { if (t) { full += t; live(key, full); } }
          function fromJson(j) {
            var ch = j.choices && j.choices[0];
            return (ch && ((ch.delta && ch.delta.content) || ch.text || (ch.message && ch.message.content))) ||
              (j.delta && j.delta.text) || (typeof j.text === "string" ? j.text : "") || "";
          }
          if (r && typeof r.text === "string") return r.text;
          if (r && r.body && r.body.getReader) {
            var rd = r.body.getReader(), dec = new TextDecoder(), buf = "";
            for (;;) {
              var x = await rd.read();
              if (x.done) break;
              buf += dec.decode(x.value, { stream: true });
              var ps = buf.split("\n"); buf = ps.pop();
              ps.forEach(function (line) {
                line = line.trim();
                if (line.indexOf("data:") !== 0) return;
                var p = line.slice(5).trim();
                if (!p || p === "[DONE]") return;
                try { push(fromJson(JSON.parse(p))); } catch (e) { /* 半截数据 */ }
              });
            }
            return full;
          }
          if (r && r[Symbol.asyncIterator]) { for await (var ck of r) push(typeof ck === "string" ? ck : fromJson(ck || {})); return full; }
          return "";
        }
        // key 只在纯文本输出时传入；开了流式就边生成边显示
        async function ask(system, user, json, key) {
          var o = { messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.9 }, t;
          if (key && cfg.stream) {
            o.stream = true;
            try { t = String(await readStream(await roche.ai.chat(o), key)).trim(); } finally { delete st.live[key]; }
            if (!t) throw new Error("流式没有收到内容，可以在设置里把流式关掉再试");
          } else {
            var r = await roche.ai.chat(o);
            t = String((r && (r.text || r.content)) || "").trim();
          }
          if (!json) return t;
          var m = t.match(/\{[\s\S]*\}/);
          if (!m) throw new Error("返回的格式不对，再试一次");
          return JSON.parse(m[0]);
        }
        // 后台任务：不挡住界面，做完在主页亮小点
        function job(key, readyKey, label, fn) {
          if (st.jobs[key]) return roche.ui.toast("已经在生成了，可以先去别处逛逛");
          st.jobs[key] = true; render();
          fn().then(function () {
            if (st.view !== readyKey) { st.d.ready[readyKey] = true; roche.ui.toast(label + "好了"); }
            return save();
          }).catch(function (e) { roche.ui.toast("出错了：" + (e && e.message || e)); })
            .then(function () { delete st.jobs[key]; render(); });
        }

        // ---------- 通用界面片段 ----------
        function page(en, zh, inner) {
          return '<div class="pg"><div class="bar"><button class="gbtn" data-act="core.back" aria-label="返回">‹</button>' +
            '<div class="ttl"><div class="en">' + en + '</div><div class="zh">' + zh + '</div></div></div><div class="sheet">' + inner + '</div></div>';
        }
        function icon(name, svg) {
          return '<span class="ico">' + (svg || "") + '<img src="' + R.base + 'icon-' + name + '.webp" alt="" onerror="this.remove()"></span>';
        }
        function picker(multi) {
          if (!st.chars.length) return '<p class="hint">还没有角色，请先在 Roche 里创建一个角色。</p>';
          return '<div class="chips">' + st.chars.map(function (c) {
            var on = multi ? st.multi.indexOf(c.id) > -1 : c.id === st.sel;
            var av = c.avatar ? '<img src="' + esc(c.avatar) + '" alt="">' : esc(nm(c).slice(0, 1));
            return '<button class="chip' + (on ? " on" : "") + '" data-act="core.' + (multi ? "toggle" : "pick") + '" data-id="' + esc(c.id) +
              '"><div class="av">' + av + '</div><span>' + esc(nm(c)) + '</span></button>';
          }).join("") + '</div>';
        }
        function wait(text) { return '<div class="wait"><i></i><span>' + text + '</span></div>'; }

        var ctx = { roche: roche, st: st, cfg: cfg, root: root, view: view, esc: esc, nm: nm, uid: uid, fmt: fmt, imgSrc: imgSrc, derange: derange,
          page: page, icon: icon, picker: picker, wait: wait, curChar: curChar, charById: charById, userName: userName, context: context,
          sysFor: sysFor, ask: ask, job: job, live: live, hasJob: hasJob, render: render, go: go, save: save, saveCfg: saveCfg, applyCfg: applyCfg, R: R };

        R.mods.forEach(function (m) {
          try { handlers[m.id] = m.create(ctx) || {}; } catch (e) { st.errs.push(m.id + "：" + (e && e.message || e)); }
        });
        await Promise.all(Object.keys(handlers).map(async function (k) {
          try { if (handlers[k].init) await handlers[k].init(); } catch (e) { st.errs.push(k + "：" + (e && e.message || e)); }
        }));
        applyCfg();

        function render() {
          var h = handlers[st.view], html;
          try { html = h && h.view ? h.view() : null; } catch (e) { html = null; st.errs.push(st.view + "：" + (e && e.message || e)); }
          if (html == null) html = '<div class="pg"><div class="sheet"><p>这个页面出错了（模块：' + esc(st.view) + '）。<br>' +
            '文件加载情况：' + Object.keys(R.status).map(function (k) { return (R.status[k] ? "✓" : "✗") + k; }).join(" ") + '<br>' +
            esc(st.errs.slice(-2).join("；")) + '</p><div class="center"><button class="btn" data-act="core.go" data-v="home">回主页</button></div></div></div>';
          view.innerHTML = html;
          st.anim = null;
        }
        function go(v) { st.view = v; st.d.ready[v] = false; save(); render(); view.scrollTop = 0; }

        async function onClick(e) {
          var el = e.target.closest("[data-act]");
          if (!el) return;
          var a = el.dataset.act, k = a.indexOf("."), mod = a.slice(0, k), name = a.slice(k + 1);
          try {
            if (mod === "core") {
              if (name === "go") return go(el.dataset.v);
              if (name === "exit") return roche.ui.closeApp();
              if (name === "back") {
                var h = handlers[st.view];
                if (h && h.back && h.back()) return render();
                return st.view === "home" ? roche.ui.closeApp() : go("home");
              }
              if (name === "pick") { st.sel = el.dataset.id; return render(); }
              if (name === "toggle") {
                var i = st.multi.indexOf(el.dataset.id);
                if (i > -1) st.multi.splice(i, 1); else st.multi.push(el.dataset.id);
                return render();
              }
              return;
            }
            if (handlers[mod] && handlers[mod].act) await handlers[mod].act(name, el);
          } catch (err) { roche.ui.toast("出错了（" + mod + "）：" + (err && err.message || err)); }
        }
        function onInput(e) { var k = e.target && e.target.dataset && e.target.dataset.in; if (k) st[k] = e.target.value; }

        container.addEventListener("click", onClick);
        container.addEventListener("input", onInput);
        R.cleanup = function () {
          Object.keys(handlers).forEach(function (k) { try { if (handlers[k].destroy) handlers[k].destroy(); } catch (e) { /* 忽略 */ } });
          container.removeEventListener("click", onClick);
          container.removeEventListener("input", onInput);
          var s = document.getElementById("rcc-style"); if (s) s.remove();
        };
        render();
      },

      async unmount(container) {
        if (R.cleanup) { R.cleanup(); R.cleanup = null; }
        container.replaceChildren();
      }
    }]
  });
})();
