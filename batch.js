/* batch.js — 一键生成：选角色 + 勾选要生成的条目，一口气做完
 * 条目来自各功能模块登记的 R.gens（好孩子名单 / 礼物盲盒 / 雪仗台词 / 神秘圣诞老人小剧场），生成逻辑和单独点按钮完全一样
 * 两种模式（设置里选，默认 A）：
 *   A 逐项依次调用：每项各调用一次模型，进度清楚，失败只重试那一项
 *   B 一次调用：同一个角色的几项合并成一次请求（省一点钱）；输出太长可能被截断，失败的会自动改成逐项重试
 * 战绩评价、礼物图不在一键生成里；圣诞信箱要到日子才生成，也不放这里 */
(function () {
  "use strict";
  var R = window.RCC;
  var ORDER = ["cert", "gift", "snow", "santa"];
  var SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="#8a5a1c" stroke-width="2.2"><path d="M10 38L30 18"/><path d="M30 18l-4-4 6-6 4 4z" fill="rgba(163,41,58,.4)"/><path d="M38 8v6M35 11h6M14 12v4M12 14h4M40 30v4M38 32h4"/></svg>';
  var CSS = `
.rcc .bk{flex:0 0 auto;position:relative;width:22px;height:22px;padding:0;border-radius:5px;border:2px solid #8a6a45;background:rgba(255,248,230,.5)}
.rcc .bk.on{background:#4f7a4a;border-color:#2f4f2c}
.rcc .bk.on::after{content:"";position:absolute;left:5px;top:1px;width:6px;height:11px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg)}
.rcc .bk[disabled]{opacity:.35}
.rcc .bi{display:flex;align-items:flex-start;gap:12px;padding:11px 0;border-bottom:1px dashed rgba(90,58,24,.4)}
.rcc .bi .bt{flex:1;min-width:0}
.rcc .bi .bt b{display:block;font-weight:600}
.rcc .bi .bt small{display:block;color:var(--soft);font-size:12px;line-height:1.5}
.rcc .bi.dis .bt{opacity:.55}
.rcc .btn-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:10px 0 0}
.rcc .rows{list-style:none;margin:10px 0;padding:0}
.rcc .rows li{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px dashed rgba(90,58,24,.35)}
.rcc .rows .st{flex:0 0 22px;text-align:center;font-weight:700}
.rcc .rows .ok{color:#4f7a4a}.rcc .rows .no{color:var(--berry)}.rcc .rows .rn{color:#b07a1e}.rcc .rows .wt{color:var(--soft)}
.rcc .rows .tx{flex:1;min-width:0}
.rcc .rows .tx small{display:block;color:var(--soft);font-size:12px;line-height:1.4}
.rcc .bmode{margin:6px 0 0;text-align:center;color:var(--soft);font-size:12px}
`;

  R.add({
    id: "batch", style: CSS, jobs: "batch:",
    home: { order: 0, en: "Make All", zh: "一 键 生 成", desc: "一口气生成好孩子名单、礼物、台词等", icon: "batch", svg: SVG },
    create: function (ctx) {
      var st = ctx.st, roche = ctx.roche, e = ctx.esc;
      var sel = null, pick = { cert: true, gift: true, snow: true, santa: false }, over = false, run = null;

      function gens() { return ORDER.map(function (id) { return R.gens && R.gens[id]; }).filter(Boolean); }
      function mode() { return ctx.cfg.batchMode === "once" ? "once" : "each"; }
      function chosen() {
        if (sel === null) sel = st.chars.length ? [st.sel || st.chars[0].id] : [];
        return sel.filter(function (id) { return !!ctx.charById(id); });
      }
      function reason(g) { return g.scope === "global" && g.avail ? g.avail(ctx) : ""; }
      // 要做的任务：每项每个角色一行；已有结果的默认跳过
      function plan() {
        var rows = [], ids = chosen();
        gens().forEach(function (g) {
          if (!pick[g.id] || reason(g)) return;
          if (g.scope === "global") { if (over || !g.has(ctx)) rows.push({ g: g, c: null, status: "wait", err: "" }); return; }
          ids.forEach(function (cid) { var c = ctx.charById(cid); if (over || !g.has(ctx, c)) rows.push({ g: g, c: c, status: "wait", err: "" }); });
        });
        return rows;
      }

      function setupHtml() {
        var ids = chosen(), h = '<p class="hint">选角色、勾要生成的内容，一次做完。生成方式和单独点按钮一样，做好后到各自页面看。</p>';
        if (!st.chars.length) return h + '<p class="hint">还没有角色，请先在 Roche 里创建一个角色。</p>';
        h += '<div class="chips">' + st.chars.map(function (c) {
          var on = ids.indexOf(c.id) > -1, av = c.avatar ? '<img src="' + e(c.avatar) + '" alt="">' : e(ctx.nm(c).slice(0, 1));
          return '<button class="chip' + (on ? " on" : "") + '" data-act="batch.char" data-id="' + e(c.id) + '"><div class="av">' + av + '</div><span>' + e(ctx.nm(c)) + '</span></button>';
        }).join("") + '</div><div class="center" style="margin:0 0 6px"><button class="link" data-act="batch.all">全选</button><button class="link" data-act="batch.none">清空</button></div>';
        h += gens().map(function (g) {
          var why = reason(g), n = 0;
          if (g.scope === "global") n = g.has(ctx) ? 1 : 0; else ids.forEach(function (cid) { if (g.has(ctx, ctx.charById(cid))) n++; });
          var state = why ? why : (g.scope === "global" ? (n ? "已有结果" : "还没生成") : (ids.length ? "已有结果 " + n + "/" + ids.length + " 个角色" : "先选角色"));
          return '<div class="bi' + (why ? " dis" : "") + '"><button class="bk' + (pick[g.id] && !why ? " on" : "") + '" data-act="batch.item" data-id="' + g.id + '"' + (why ? " disabled" : "") + ' aria-label="勾选"></button>' +
            '<span class="bt"><b>' + e(g.label) + '</b><small>' + e(g.desc) + ' · ' + e(state) + '</small></span></div>';
        }).join("");
        h += '<div class="bi"><button class="bk' + (over ? " on" : "") + '" data-act="batch.over" aria-label="覆盖已有"></button><span class="bt"><b>覆盖已有结果</b><small>不勾的话，已经生成过的会跳过，省钱</small></span></div>';
        var rows = plan(), busy = st.jobs["batch:run"];
        h += '<div class="center"><button class="btn" data-act="batch.start"' + (rows.length && !busy ? "" : " disabled") + '>' + (busy ? "生成中" : (rows.length ? "开始生成（" + rows.length + " 项）" : "没有要生成的")) + '</button></div>' +
          '<p class="bmode">当前模式：' + (mode() === "once" ? "一次调用（同一角色合并成一次请求）" : "逐项依次调用") + '　· 在「设置 › 一键生成」里切换</p>';
        if (!rows.length && !busy) h += '<p class="hint" style="text-align:center">所选内容都已有结果。想重做的话，勾上「覆盖已有结果」。</p>';
        return h;
      }
      function runHtml() {
        var ok = 0, no = 0, wt = 0, rn = 0;
        run.rows.forEach(function (r) { if (r.status === "ok") ok++; else if (r.status === "fail") no++; else if (r.status === "run") rn++; else wt++; });
        var done = !st.jobs["batch:run"];
        var h = '<p class="hint">' + (done ? (run.stopped ? "已停止。" : "做完了。") + "成功 " + ok + " 项" + (no ? "，失败 " + no + " 项" : "") + (wt ? "，没做 " + wt + " 项" : "") + "。" : "正在生成（" + ok + "/" + run.rows.length + "），可以先去别处逛逛，好了会提醒你。") + '</p><ul class="rows">' +
          run.rows.map(function (r) {
            var sym = { ok: "✓", fail: "✗", run: "…", wait: "·" }[r.status], cls = { ok: "ok", fail: "no", run: "rn", wait: "wt" }[r.status];
            return '<li><span class="st ' + cls + '">' + sym + '</span><span class="tx">' + e(r.g.label) + (r.c ? " · " + e(ctx.nm(r.c)) : "") + (r.err ? '<small>' + e(r.err) + '</small>' : "") + '</span></li>';
          }).join("") + '</ul><div class="btn-row">';
        if (!done) h += '<button class="btn ghost sm" data-act="batch.stop"' + (run.stop ? " disabled" : "") + '>' + (run.stop ? "停止中…" : "停止（做完当前这项）") + '</button>';
        else {
          if (no) h += '<button class="btn sm" data-act="batch.retry">重试失败项</button>';
          h += '<button class="btn ghost sm" data-act="batch.back2">返回</button>';
        }
        return h + '</div>';
      }

      // ---------- 执行 ----------
      async function doEach(r) {
        if (run.stop) return;
        r.status = "run"; r.err = ""; ctx.render();
        var res = await ctx.job(r.g.jobKey(r.c), "batch", r.g.label, function () { return r.g.run(ctx, r.c); }, { silent: true });
        r.status = res.ok ? "ok" : "fail"; r.err = res.ok ? "" : String(res.err && res.err.message || res.err || "失败");
        ctx.render();
      }
      async function doOnce(c, rows) {
        rows.forEach(function (r) { r.status = "run"; r.err = ""; }); ctx.render();
        var res = await ctx.job("batch:once:" + c.id, "batch", "一键生成", async function () {
          var l = await ctx.context(c), ids = rows.map(function (r) { return r.g.id; });
          var parts = rows.map(function (r) { return "【" + r.g.id + "】" + r.g.prompt(ctx, c); }).join("\n\n");
          var j = await ctx.ask(ctx.sysFor(c, l), "请一次完成下面几项任务，只输出一个 JSON 对象。对象的键就是任务名（" + ids.join("、") + "），每个键的值，就是该任务要求你输出的那个 JSON（任务里说的「只输出 JSON」指的是这个键的值）。\n\n" + parts, true);
          rows.forEach(function (r) {
            try { if (!j[r.g.id]) throw new Error("这一项没有内容"); r.g.apply(ctx, c, j[r.g.id]); r.status = "ok"; }
            catch (err) { r.status = "fail"; r.err = String(err && err.message || err); }
          });
        }, { silent: true });
        if (!res.ok) rows.forEach(function (r) { r.status = "fail"; r.err = String(res.err && res.err.message || res.err || "失败"); });
        ctx.render();
        for (var i = 0; i < rows.length; i++) if (rows[i].status === "fail" && !run.stop) await doEach(rows[i]);   // 合并请求里没成功的，逐项重试
      }
      async function exec() {
        var rows = run.rows, once = mode() === "once", i;
        if (once) {
          var byChar = {};
          rows.forEach(function (r) { if (r.c && r.status === "wait") (byChar[r.c.id] = byChar[r.c.id] || []).push(r); });
          for (var cid in byChar) {
            if (run.stop) break;
            if (byChar[cid].length > 1) await doOnce(byChar[cid][0].c, byChar[cid]); else await doEach(byChar[cid][0]);
          }
        }
        for (i = 0; i < rows.length; i++) if (rows[i].status === "wait") { if (run.stop) { run.stopped = true; break; } await doEach(rows[i]); }
        if (run.stop) run.stopped = true;
      }
      function start(rows) {
        run = { rows: rows, stop: false, stopped: false };
        ctx.job("batch:run", "batch", "一键生成", function () { return exec(); });
      }

      return {
        back: function () { if (run && !st.jobs["batch:run"]) { run = null; return true; } return false; },
        view: function () {
          return ctx.page("Make All", "一 键 生 成", run ? runHtml() : setupHtml());
        },
        act: async function (name, el) {
          var id = el.dataset.id;
          if (name === "char") { var ids = chosen(), i = ids.indexOf(id); if (i > -1) ids.splice(i, 1); else ids.push(id); sel = ids; return ctx.render(); }
          if (name === "all") { sel = st.chars.map(function (c) { return c.id; }); return ctx.render(); }
          if (name === "none") { sel = []; return ctx.render(); }
          if (name === "item") { pick[id] = !pick[id]; return ctx.render(); }
          if (name === "over") { over = !over; return ctx.render(); }
          if (name === "start") {
            var rows = plan();
            if (!rows.length || st.jobs["batch:run"]) return;
            if (rows.length > 6 && !(await roche.ui.confirm({ title: "开始生成", message: "一共 " + rows.length + " 项，会调用多次模型，比较费额度。确定开始吗？" }))) return;
            return start(rows);
          }
          if (name === "stop") { if (run) { run.stop = true; ctx.render(); } return; }
          if (name === "retry") {
            if (!run) return;
            var again = run.rows.filter(function (r) { return r.status === "fail"; }); again.forEach(function (r) { r.status = "wait"; r.err = ""; });
            return start(again);
          }
          if (name === "back2") { run = null; return ctx.render(); }
        }
      };
    }
  });
})();
