/* memory.js — 写入记忆：把圣诞小屋里生成的内容整理成事实记忆，写进 Roche 主记忆
 * 来源：单项结果（好孩子名单 / 礼物 / 信箱 / 雪仗战绩 / 神秘圣诞老人小剧场）+ 每个角色一条总结，勾选后生成草稿
 * 草稿默认用模板直接拼（不花钱），每条可点「AI 润色」或「提意见重写」（调用一次模型）
 * 写入目标：可选单聊或群聊；写入后立刻读回核对；返回的记忆 id 存在插件里，可在「已写入」里编辑、撤回
 * 注意：写入的是 Roche 主事实记忆，卸载插件不会自动删除；需要 manifest 里有 memory:write 权限 */
(function () {
  "use strict";
  var R = window.RCC;
  var BUILTIN = [
    "你是 Roche 的记忆整理员。把下面的材料改写成一条事实记忆：",
    "1. 中文，第三人称，1 到 3 句，写清谁、在圣诞小屋里做了什么、收到或说了什么印象深的内容。",
    "2. 只写材料里有的事实，不编造，不写场景和动作描写，不写评价。",
    "3. 只输出记忆正文，不要标题和解释。"
  ].join("\n");
  var SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="#8a5a1c" stroke-width="2.2"><path d="M10 8h22a6 6 0 016 6v26H16a6 6 0 01-6-6z" fill="rgba(255,255,255,.3)"/><path d="M16 16h16M16 23h16M16 30h9"/><path d="M34 38l8-8" stroke="#a3293a"/></svg>';
  var CSS = `
.rcc .mm-g{margin:16px 0 4px;font-size:12px;letter-spacing:.3em;color:var(--soft)}
.rcc .mm-gh{display:flex;align-items:center;gap:10px;width:100%;margin-top:12px;padding:9px 10px;border:0;border-left:4px solid #8a5a1c;border-radius:6px;background:rgba(120,80,30,.16);text-align:left;color:var(--ink)}
.rcc .mm-gh b{flex:1;min-width:0}
.rcc .mm-gh small{color:var(--soft);font-size:12px}
.rcc .mm-gh span{color:var(--soft);width:18px;text-align:center}
.rcc .mm-r{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px dashed rgba(90,58,24,.4)}
.rcc .mk{flex:0 0 auto;position:relative;width:22px;height:22px;margin-top:2px;padding:0;border-radius:5px;border:2px solid #8a6a45;background:rgba(255,248,230,.5)}
.rcc .mk.on{background:#4f7a4a;border-color:#2f4f2c}
.rcc .mk.on::after{content:"";position:absolute;left:5px;top:1px;width:6px;height:11px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}
.rcc .mm-t{flex:1;min-width:0}
.rcc .mm-t b{display:block;font-weight:600}
.rcc .mm-t small,.rcc .mm-d small{display:block;color:var(--soft);font-size:12px;line-height:1.5}
.rcc .mm-d{margin:12px 0;padding:12px;border-radius:8px;background:rgba(120,80,30,.12);box-shadow:inset 0 0 0 1px rgba(90,58,24,.25)}
.rcc .mm-h{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.rcc .mm-h b{flex:1;min-width:0}
.rcc .mm-v{font-size:12px;color:var(--soft);white-space:nowrap}
.rcc .mm-d select.in,.rcc .mm-d textarea.in{display:block;width:100%;margin:6px 0;font-size:14px}
.rcc .mm-d textarea.in{min-height:110px;resize:vertical;line-height:1.6}
.rcc .mm-b{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
.rcc .mm-tx{white-space:pre-wrap;line-height:1.7;font-size:14px;margin:6px 0}
.rcc .mm-pre{white-space:pre-wrap;font:inherit;font-size:13px;line-height:1.7;color:var(--soft);padding:10px;border-radius:8px;background:rgba(255,248,230,.45);margin:8px 0}
`;

  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : s; }
  function exId(r) { return (r && (r.id || r.memoryId || r._id || (r.item && r.item.id) || (typeof r === "string" ? r : null))) || null; }

  R.add({
    id: "memory", style: CSS, jobs: "memory:",
    home: { order: 7, en: "Memory", zh: "写 入 记 忆", desc: "把这个圣诞的故事，记进 TA 的记忆里", icon: "memory", svg: SVG },
    create: function (ctx) {
      var roche = ctx.roche, st = ctx.st, e = ctx.esc;
      var tab = "new", step = "pick", sel = {}, drafts = [], log = [], cfg = { prompt: "" };
      var open = {}, convs = [], convLoaded = false, wmsg = "", editing = -1, editText = "", viewPrompt = false;

      function un() { return ctx.userName(); }
      function yr() { return new Date().getFullYear(); }

      // ---------- 会话列表（单聊 + 群聊）----------
      async function loadConvs() {
        var out = [], seen = {};
        function add(id, name, group, contact) {
          if (!id || seen[id]) return;
          seen[id] = 1; out.push({ id: String(id), name: name || "会话", group: !!group, contact: contact || "" });
        }
        try {
          var l = await roche.conversation.list();
          (Array.isArray(l) ? l : []).forEach(function (c) { add(c.id || c.conversationId, c.name || c.title || c.handle, c.isGroup || c.type === "group", c.contactId); });
        } catch (err) { /* 读不到会话列表，就只用角色自己的单聊 */ }
        st.chars.forEach(function (c) { add(c.conversationId, ctx.nm(c), false, c.id); });
        convs = out; convLoaded = true;
      }
      function convName(id) { var c = convs.filter(function (x) { return x.id === id; })[0]; return c ? (c.group ? "[群] " : "") + c.name : "会话"; }
      function defaultConv(charId) {
        var ch = ctx.charById(charId);
        if (ch && ch.conversationId) return String(ch.conversationId);
        var c = convs.filter(function (x) { return !x.group && x.contact === charId; })[0];
        return c ? c.id : "";
      }

      // ---------- 候选内容：按角色分组，另有「全局」组 ----------
      function groups() {
        var gs = [], U = un(), Y = yr(), LB = st.letters || [];
        st.chars.forEach(function (c) {
          var cn = ctx.nm(c), items = [], parts = [];
          var ce = st.d.cert && st.d.cert[c.id];
          if (ce && ce.items && ce.items.length) {
            var certT = function (n) {
              return U + "在" + (ce.year || Y) + "年圣诞收到" + cn + "扮成圣诞老人出具的「" + ce.title + "」鉴定报告（" +
                ce.items.map(function (it) { return it.label + " " + Math.max(1, Math.min(5, +it.stars || 5)) + "星"; }).join("、") + "），总评：" + clip(ce.verdict, n) + "。";
            };
            items.push({ key: "cert:" + c.id, title: "好孩子名单", text: certT(60), raw: certT(500), who: [U, cn], charId: c.id });
            parts.push("收到「" + ce.title + "」好孩子鉴定");
          }
          var g = st.d.gift && st.d.gift[c.id] && st.d.gift[c.id].cur;
          if (g && g.name) {
            var giftT = function (n) { return cn + "在圣诞为" + U + "挑选的礼物是「" + g.name + "」，理由：" + clip(g.reason, n) + "。"; };
            items.push({ key: "gift:" + c.id, title: "礼物盲盒", text: giftT(70), raw: giftT(500), who: [U, cn], charId: c.id });
            parts.push(cn + "送了「" + g.name + "」作礼物");
          }
          var rc = st.d.snowRec && st.d.snowRec[c.id];
          if (rc && rc.win + rc.lose + rc.draw > 0) {
            var ev = st.d.snowEval && st.d.snowEval[c.id];
            var snowT = function (n) {
              return U + "和" + cn + "打过雪仗，" + U + "赢了" + rc.win + "场，" + cn + "赢了" + rc.lose + "场" + (rc.draw ? "，平局" + rc.draw + "场" : "") +
                (rc.truce ? "，解锁了「握手言和」结局" : "") + (ev && ev.text ? "。" + cn + "的评价：" + clip(ev.text, n) : "") + "。";
            };
            items.push({ key: "snow:" + c.id, title: "雪仗战绩", text: snowT(60), raw: snowT(400), who: [U, cn], charId: c.id });
            parts.push("雪仗 " + rc.win + " 胜 " + rc.lose + " 负");
          }
          LB.filter(function (l) { return l.charId === c.id && l.reply; }).forEach(function (l) {
            var lt = function (n) { return U + "在" + ctx.fmt(l.sentAt) + "写信给圣诞老人（由" + cn + "扮演），信里说：" + clip(l.text, n) + "；回信大意：" + clip(l.reply, n) + "。"; };
            items.push({ key: "letter:" + l.id, title: "圣诞来信 · " + ctx.fmt(l.sentAt), text: lt(60), raw: lt(400), who: [U, cn], charId: c.id });
          });
          if (LB.some(function (l) { return l.charId === c.id && l.reply; })) parts.push("写信给圣诞老人并收到回信");
          if (!items.length) return;
          if (parts.length >= 2) {
            items.unshift({ key: "sum:" + c.id, title: "总结 · 这个圣诞", text: Y + "年圣诞，" + U + "和" + cn + "一起玩了圣诞小屋：" + parts.join("；") + "。",
              raw: items.map(function (x) { return x.raw; }).join("\n"), who: [U, cn], charId: c.id });
          }
          gs.push({ id: c.id, name: cn, items: items });
        });
        var gl = [], wr = st.wishReply;
        if (st.wishes && st.wishes.length) {
          var wT = function (n) { return U + "在圣诞许愿树上挂了愿望：" + st.wishes.map(function (w) { return w.text; }).join("、") + (wr ? "。" + wr.who + "回应：" + clip(wr.text, n) : "") + "。"; };
          var wc = wr && st.chars.filter(function (c) { return ctx.nm(c) === wr.who; })[0];
          gl.push({ key: "wish", title: "许愿树", text: wT(80), raw: wT(500), who: [U].concat(wr ? [wr.who] : []), charId: wc ? wc.id : "" });
        }
        if (st.d.scene && st.d.draw && st.d.draw.length) {
          var names = [], pairs = st.d.draw.map(function (p) {
            var a = ctx.nm(ctx.charById(p.from)), b = ctx.nm(ctx.charById(p.to));
            if (names.indexOf(a) < 0) names.push(a); if (names.indexOf(b) < 0) names.push(b);
            return a + "送" + b;
          }).join("、");
          var sT = function (n) { return "圣诞「神秘圣诞老人」交换礼物，抽签结果：" + pairs + "。小剧场大意：" + clip(st.d.scene, n) + "。"; };
          gl.push({ key: "santa", title: "神秘圣诞老人小剧场", text: sT(100), raw: sT(600), who: names, charId: st.d.draw[0].from });
        }
        if (gl.length) gs.push({ id: "global", name: "全局内容", items: gl });
        return gs;
      }
      function allItems() { var o = []; groups().forEach(function (g) { o = o.concat(g.items); }); return o; }
      function chosen() { return allItems().filter(function (x) { return sel[x.key]; }); }
      function wroteCount(key) { return log.filter(function (x) { return x.key === key; }).length; }

      // ---------- 视图 ----------
      function pickHtml() {
        var gs = groups(), n = chosen().length;
        if (!gs.length) return '<p class="hint">还没有可以写入的内容。先去好孩子名单、礼物盲盒、信箱、雪仗等地方生成一些吧。</p>';
        var h = '<p class="hint">勾选要写成记忆的内容。下一步先生成草稿，你可以改，确认后才会真正写入。</p>';
        gs.forEach(function (g) {
          var nSel = g.items.filter(function (it) { return sel[it.key]; }).length, isOpen = open[g.id] === undefined ? gs.length === 1 : open[g.id];
          h += '<button class="mm-gh" data-act="memory.gexp" data-id="' + e(g.id) + '"><b>' + e(g.name) + '</b><small>' + g.items.length + ' 项' + (nSel ? "，已选 " + nSel : "") + '</small><span>' + (isOpen ? "▾" : "▸") + '</span></button>';
          if (isOpen) g.items.forEach(function (it) {
            var w = wroteCount(it.key);
            h += '<div class="mm-r"><button class="mk' + (sel[it.key] ? " on" : "") + '" data-act="memory.tog" data-k="' + e(it.key) + '" aria-label="勾选"></button>' +
              '<span class="mm-t"><b>' + e(it.title) + '</b><small>' + e(clip(it.text, 44)) + (w ? " · 已写入 " + w + " 次" : "") + '</small></span></div>';
          });
        });
        return h + '<div class="center"><button class="btn" data-act="memory.go"' + (n ? "" : " disabled") + '>生成草稿（' + n + ' 条）</button></div>';
      }
      function draftsHtml() {
        var h = '<p class="hint">草稿是用模板直接拼的，不花钱。想更自然可以点「AI 润色」（会调用一次模型）。写入的是 Roche 主记忆，卸载插件不会自动删除。</p>', n = 0;
        drafts.forEach(function (d, i) {
          var busy = st.jobs["memory:p:" + i], opts = convs.map(function (c) {
            return '<option value="' + e(c.id) + '"' + (c.id === d.conv ? " selected" : "") + '>' + (c.group ? "[群] " : "") + e(c.name) + '</option>';
          }).join("");
          if (!d.conv) opts = '<option value="" selected>请选择写入的会话</option>' + opts;
          else if (!convs.some(function (c) { return c.id === d.conv; })) opts = '<option value="' + e(d.conv) + '" selected>（默认会话）</option>' + opts;
          if (d.on && !d.done) n++;
          h += '<div class="mm-d"><div class="mm-h"><button class="mk' + (d.on && !d.done ? " on" : "") + '" data-act="memory.dtog" data-i="' + i + '" aria-label="写入这一条"' + (d.done ? " disabled" : "") + '></button>' +
            '<b>' + e(d.title) + '</b><span class="mm-v"><button class="link" data-act="memory.vprev" data-i="' + i + '">‹</button> 版本 ' + (d.vi + 1) + '/' + d.vers.length +
            ' <button class="link" data-act="memory.vnext" data-i="' + i + '">›</button></span></div>' +
            '<small>写入到哪个会话</small><select class="in" data-dtgt="' + i + '">' + opts + '</select>' +
            '<textarea class="in" data-dt="' + i + '">' + e(d.vers[d.vi]) + '</textarea>' +
            (d.done ? '<small>已写入 ✓</small>' : "") + (d.err ? '<small style="color:var(--berry)">出错：' + e(d.err) + '</small>' : "") +
            '<div class="mm-b"><button class="btn ghost sm" data-act="memory.polish" data-i="' + i + '"' + (busy ? " disabled" : "") + '>' + (busy ? "整理中" : "AI 润色") + '</button>' +
            '<button class="btn ghost sm" data-act="memory.fbtog" data-i="' + i + '">提意见</button></div>' +
            (d.fbOpen ? '<div class="row" style="margin:6px 0 0"><input class="in" data-fb="' + i + '" placeholder="比如：再短一点，多写礼物" value="' + e(d.fb) + '"><button class="btn sm" data-act="memory.fbgo" data-i="' + i + '"' + (busy ? " disabled" : "") + '>重写</button></div>' : "") + '</div>';
        });
        if (st.jobs["memory:write"]) h += ctx.wait(e(wmsg || "正在写入…"));
        return h + '<div class="center"><button class="btn" data-act="memory.write"' + (n && !st.jobs["memory:write"] ? "" : " disabled") + '>写入所选（' + n + '）</button> <button class="btn ghost sm" data-act="memory.back2">返回重选</button></div>';
      }
      function logHtml() {
        if (!log.length) return '<p class="hint">还没有写入过记忆。</p>';
        var CHK = { ok: "已读回核对 ✓", miss: "写入没报错，但读回没找到（群聊可能不显示在这里，请到 Roche 里确认）", skip: "没能核对" };
        var h = '<p class="hint">这些都是已经写进 Roche 主记忆的内容。撤回会从 Roche 里删掉那一条。</p>', i;
        for (i = log.length - 1; i >= 0; i--) {
          var x = log[i], when = new Date(x.at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
          h += '<div class="mm-d"><div class="mm-h"><b>' + e(x.title) + '</b></div><small>' + e(x.convName) + ' · ' + e(when) + '</small>' +
            (editing === i ? '<textarea class="in" data-le="1">' + e(editText) + '</textarea><div class="mm-b"><button class="btn sm" data-act="memory.logsave" data-i="' + i + '">保存修改</button><button class="btn ghost sm" data-act="memory.logcancel">取消</button></div>'
              : '<div class="mm-tx">' + e(x.text) + '</div><small>' + e(CHK[x.check] || "") + (x.memId ? "" : " · 没有拿到记忆 id，无法在这里撤回，请到 Roche 里删除") + '</small>' +
                '<div class="mm-b">' + (x.memId ? '<button class="btn ghost sm" data-act="memory.logedit" data-i="' + i + '">编辑</button><button class="btn ghost sm" data-act="memory.logdel" data-i="' + i + '">撤回</button>'
                  : '<button class="btn ghost sm" data-act="memory.logrm" data-i="' + i + '">移出记录</button>') + '</div>') + '</div>';
        }
        return h;
      }
      function promptHtml() {
        return '<p class="hint">「AI 润色」和「提意见重写」会用这段提示词；留空就用内置的。材料和草稿会自动附在后面。</p>' +
          '<div class="mm-b"><button class="btn ghost sm" data-act="memory.pview">' + (viewPrompt ? "收起内置提示词" : "查看内置提示词") + '</button>' +
          '<button class="btn ghost sm" data-act="memory.ptpl">以它为模板</button><button class="btn ghost sm" data-act="memory.pclr">清空自定义</button></div>' +
          (viewPrompt ? '<div class="mm-pre">' + e(BUILTIN) + '</div>' : "") +
          '<div class="mm-d"><textarea class="in" data-mp="1" placeholder="留空就使用内置提示词">' + e(cfg.prompt || "") + '</textarea></div>';
      }

      // ---------- 输入同步（不重绘，打字不会丢）----------
      function onIn(ev) {
        var t = ev.target, ds = t && t.dataset;
        if (!ds) return;
        if (ds.dt != null) { var d = drafts[+ds.dt]; if (d) d.vers[d.vi] = t.value; }
        else if (ds.fb != null) { var d2 = drafts[+ds.fb]; if (d2) d2.fb = t.value; }
        else if (ds.le != null) editText = t.value;
        else if (ds.mp != null) cfg.prompt = t.value;
      }
      function onChange(ev) {
        var t = ev.target, ds = t && t.dataset;
        if (!ds) return;
        if (ds.dtgt != null) { var d = drafts[+ds.dtgt]; if (d) d.conv = t.value; }
        else if (ds.mp != null) roche.storage.set("memCfg", cfg);
      }
      ctx.root.addEventListener("input", onIn);
      ctx.root.addEventListener("change", onChange);

      // ---------- 动作 ----------
      function polish(i, fb) {
        var d = drafts[i];
        if (!d) return;
        ctx.job("memory:p:" + i, "memory", "润色", async function () {
          var sys = (cfg.prompt && cfg.prompt.trim()) || BUILTIN, cur = d.vers[d.vi];
          var u = "【对方】" + un() + "\n【材料】\n" + d.raw + "\n【当前草稿】\n" + cur +
            (fb ? "\n【修改意见】" + fb + "\n请按意见重写，仍然只输出记忆正文。" : "\n请润色成一条记忆，只输出记忆正文。");
          var t = String(await ctx.ask(sys, u, false)).replace(/^```[a-z]*\n?|```$/g, "").trim();
          if (!t) throw new Error("没有收到内容，再试一次");
          d.vers.push(t); d.vi = d.vers.length - 1; if (fb) d.fb = "";
        });
      }
      async function verify(convId, memId, text) {
        try {
          var m = await roche.memory.getLongTerm({ conversationId: convId, limit: 200 }), all = ((m && m.facts) || []).concat((m && m.vectors) || []);
          return all.some(function (x) {
            return (memId && String(x.id) === String(memId)) || String(x.summaryText || x.action || x.text || "").indexOf(text.slice(0, 20)) > -1;
          }) ? "ok" : "miss";
        } catch (err) { return "skip"; }
      }
      async function doWrite() {
        var todo = drafts.filter(function (d) { return d.on && !d.done; });
        if (!todo.length) return;
        var bad = todo.filter(function (d) { return !d.conv || !String(d.vers[d.vi] || "").trim(); });
        if (bad.length) return roche.ui.toast("有 " + bad.length + " 条没选会话，或者内容是空的");
        var ok0 = await roche.ui.confirm({ title: "写入记忆", message: "要写入 " + todo.length + " 条记忆。这是 Roche 主事实记忆，卸载插件不会自动删除；写入后可以在「已写入」里编辑或撤回。确定吗？" });
        if (!ok0) return;
        ctx.job("memory:write", "memory", "写入记忆", async function () {
          var ok = 0, i;
          for (i = 0; i < todo.length; i++) {
            var d = todo[i], text = String(d.vers[d.vi]).trim();
            wmsg = "正在写入（" + (i + 1) + "/" + todo.length + "）：" + d.title; ctx.render();
            try {
              var r = await roche.memory.write({ conversationId: d.conv, summaryText: text, who: d.who, action: text,
                when: new Date().toLocaleString("zh-CN", { hour12: false }), where: "圣诞小屋", source: "plugin" });
              var id = exId(r);
              wmsg = "正在读回核对（" + (i + 1) + "/" + todo.length + "）…"; ctx.render();
              var chk = await verify(d.conv, id, text);
              log.push({ key: d.key, memId: id, conv: d.conv, convName: convName(d.conv), who: d.who, title: d.title, text: text, at: Date.now(), check: chk });
              await roche.storage.set("memLog", log);
              d.done = true; d.err = ""; ok++;
            } catch (err) { d.err = String(err && err.message || err); }
          }
          wmsg = "";
          roche.ui.toast("已写入 " + ok + "/" + todo.length + " 条");
        });
      }

      return {
        init: async function () {
          var rs = await Promise.all([roche.storage.get("memLog"), roche.storage.get("memCfg")]);
          log = rs[0] || []; cfg = Object.assign({ prompt: "" }, rs[1] || {});
          loadConvs();
        },
        destroy: function () { ctx.root.removeEventListener("input", onIn); ctx.root.removeEventListener("change", onChange); },
        back: function () {
          if (editing > -1) { editing = -1; return true; }
          if (tab === "new" && step === "drafts" && !st.jobs["memory:write"]) { step = "pick"; return true; }
          return false;
        },
        view: function () {
          var h = '<div class="tabs">' + [["new", "写入"], ["log", "已写入"], ["prompt", "提示词"]].map(function (t) {
            return '<button class="' + (tab === t[0] ? "on" : "") + '" data-act="memory.tab" data-t="' + t[0] + '">' + t[1] + '</button>';
          }).join("") + '</div>';
          h += tab === "new" ? (step === "drafts" ? draftsHtml() : pickHtml()) : (tab === "log" ? logHtml() : promptHtml());
          return ctx.page("Memory", "写 入 记 忆", h);
        },
        act: async function (name, el) {
          var i = +el.dataset.i, d = drafts[i], x = log[i];
          if (name === "gexp") { var gid = el.dataset.id; open[gid] = !(open[gid] === undefined ? groups().length === 1 : open[gid]); return ctx.render(); }
          if (name === "tab") { tab = el.dataset.t; editing = -1; return ctx.render(); }
          if (name === "tog") { sel[el.dataset.k] = !sel[el.dataset.k]; return ctx.render(); }
          if (name === "go") {
            var cs = chosen();
            if (!cs.length) return;
            var dup = cs.filter(function (c) { return wroteCount(c.key); }).length;
            if (dup && !(await roche.ui.confirm({ title: "有写过的内容", message: "其中 " + dup + " 条之前已经写入过，再写会在记忆里重复一条。继续生成草稿吗？" }))) return;
            if (!convLoaded) await loadConvs();
            drafts = cs.map(function (c) {
              return { key: c.key, title: c.title, raw: c.raw, who: c.who, conv: defaultConv(c.charId), on: true, vers: [c.text], vi: 0, fb: "", fbOpen: false, done: false, err: "" };
            });
            step = "drafts"; return ctx.render();
          }
          if (name === "back2") { step = "pick"; return ctx.render(); }
          if (name === "dtog") { if (d && !d.done) d.on = !d.on; return ctx.render(); }
          if (name === "vprev") { if (d && d.vi > 0) d.vi--; return ctx.render(); }
          if (name === "vnext") { if (d && d.vi < d.vers.length - 1) d.vi++; return ctx.render(); }
          if (name === "fbtog") { if (d) d.fbOpen = !d.fbOpen; return ctx.render(); }
          if (name === "polish") return polish(i, "");
          if (name === "fbgo") {
            if (!d || !String(d.fb || "").trim()) return roche.ui.toast("先写下你的意见");
            return polish(i, d.fb.trim());
          }
          if (name === "write") return doWrite();
          if (name === "logedit") { if (x) { editing = i; editText = x.text; } return ctx.render(); }
          if (name === "logcancel") { editing = -1; return ctx.render(); }
          if (name === "logsave") {
            var t = String(editText || "").trim();
            if (!x || !x.memId) return;
            if (!t) return roche.ui.toast("记忆不能是空的");
            try { await roche.memory.update(x.memId, { summaryText: t, action: t }); }
            catch (err) {
              if (!/not.?found/i.test(String(err && err.message || err))) throw err;
              // update 找不到这条：改成「先写新的，再删旧的」
              var old = x.memId, r = await roche.memory.write({ conversationId: x.conv, summaryText: t, who: x.who || [un()], action: t,
                when: new Date().toLocaleString("zh-CN", { hour12: false }), where: "圣诞小屋", source: "plugin" });
              x.memId = exId(r); x.check = await verify(x.conv, x.memId, t);
              try { await roche.memory.delete(old); } catch (e2) { roche.ui.toast("新的已写入，但旧的没删掉，请到 Roche 里手动删除旧的那条"); }
            }
            x.text = t; editing = -1; await roche.storage.set("memLog", log);
            roche.ui.toast("已修改"); return ctx.render();
          }
          if (name === "logdel") {
            if (!x || !x.memId) return;
            if (!(await roche.ui.confirm({ title: "撤回这条记忆", message: "会从 Roche 主事实记忆里删掉「" + x.title + "」这一条。确定吗？" }))) return;
            await roche.memory.delete(x.memId);
            log.splice(i, 1); await roche.storage.set("memLog", log);
            drafts.forEach(function (dd) { if (dd.key === x.key) dd.done = false; });
            roche.ui.toast("已撤回"); return ctx.render();
          }
          if (name === "logrm") { log.splice(i, 1); await roche.storage.set("memLog", log); return ctx.render(); }
          if (name === "pview") { viewPrompt = !viewPrompt; return ctx.render(); }
          if (name === "ptpl") { cfg.prompt = BUILTIN; await roche.storage.set("memCfg", cfg); roche.ui.toast("已填入，可以直接修改"); return ctx.render(); }
          if (name === "pclr") { cfg.prompt = ""; await roche.storage.set("memCfg", cfg); return ctx.render(); }
        }
      };
    }
  });
})();
