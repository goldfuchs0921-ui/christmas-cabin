/* settings.js — 设置页 v1.9.2
 * 一级页面只有几行分类，每行下面一句话写着当前状态；点进去才是具体开关，最多两层，不用翻找
 * 「数据管理」= 原来的「存储与图片」+「数据管理」：顶部分区内存条（只统计圣诞小屋自己的存储）+ 分区清除 + 压缩图片
 * 以后新增设置：在 main() 里加一行，再给它做一个小页面即可 */
(function () {
  "use strict";
  var R = window.RCC;

  var CSS = `
.rcc .grp{margin:0 0 22px}
.rcc .grp h4{margin:0 0 6px;font-size:12px;letter-spacing:.38em;color:var(--soft);font-weight:400}
.rcc .set{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid rgba(90,58,24,.25)}
.rcc .set b{display:block;font-weight:600}
.rcc .set small{display:block;color:var(--soft);font-size:12px;line-height:1.5}
.rcc .sw{flex:0 0 auto;position:relative;width:54px;height:30px;border-radius:999px;border:0;padding:0;background:#6b4a2a;box-shadow:inset 0 3px 6px rgba(0,0,0,.55),0 1px 0 rgba(255,255,255,.5)}
.rcc .sw i{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#fff1b8,#e3b341 40%,#a8741c 75%,#6e4710);box-shadow:inset 0 1px 1px rgba(255,255,255,.7),0 2px 3px rgba(0,0,0,.6);transition:transform .2s}
.rcc .sw.on{background:#4f7a4a}
.rcc .sw.on i{transform:translateX(24px)}
.rcc .step{display:flex;align-items:center;gap:10px}
.rcc .step .gbtn{width:30px;height:30px;font-size:18px}
.rcc .step span{min-width:26px;text-align:center;font-weight:600}
.rcc .btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
.rcc .diag{font-size:12px;color:var(--soft);line-height:1.9}
.rcc .diag u{text-decoration:none;color:var(--berry)}
.rcc .srow{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:15px 2px;border:0;border-bottom:1px solid rgba(90,58,24,.25);background:none;text-align:left;color:var(--ink)}
.rcc .srow b{display:block;font-weight:600}
.rcc .srow small{display:block;color:var(--soft);font-size:12px;line-height:1.5}
.rcc .srow i{flex:0 0 auto;font-style:normal;font-size:24px;line-height:1;color:var(--soft)}
/* 只作用在设置页里：说明字加深、统一字号，读起来不费劲 */
.rcc .stg .hint{color:#5c3d1f;font-size:14px;line-height:1.7;margin:4px 0 14px}
.rcc .stg .set small,.rcc .stg .srow small,.rcc .stg .prow small{color:#5c3d1f;font-size:13px;line-height:1.6;margin-top:2px}
.rcc .stg .srow i{color:#5c3d1f}
.rcc .stg .grp h4{color:#5c3d1f}
.rcc .stg .diag{color:#5c3d1f;font-size:13px;line-height:1.8}
.rcc .stg .mods div{padding:3px 0;white-space:nowrap}
/* 内存条 */
.rcc .mbar{display:flex;height:16px;border-radius:8px;overflow:hidden;background:rgba(90,58,24,.25);box-shadow:inset 0 2px 4px rgba(0,0,0,.35);margin:6px 0 4px}
.rcc .mbar i{display:block;height:100%;min-width:4px}
.rcc .mbar i+i{box-shadow:-1px 0 0 rgba(255,248,230,.65)}
.rcc .mtot{text-align:right;font-size:13px;color:#5c3d1f;margin:0 0 8px}
.rcc .prow{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid rgba(90,58,24,.25)}
.rcc .prow .dot{flex:0 0 12px;width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 1px rgba(60,36,16,.4)}
.rcc .prow .pt{flex:1;min-width:0}
.rcc .prow .pt b{display:block;font-weight:600}
.rcc .prow .pt small{display:block}
.rcc .prow .sz{flex:0 0 auto;font-size:13px;color:#5c3d1f;white-space:nowrap}
`;

  var COLORS = { gift: "#c0485a", card: "#d9a63a", rec: "#4f7a4a", text: "#4a82cc", lib: "#8a5a9c" };

  R.add({
    id: "settings", style: CSS,
    create: function (ctx) {
      var cfg = ctx.cfg, roche = ctx.roche, st = ctx.st, sub = null, info = null, sbusy = false, smsg = "";
      function mb(n) { return R.img ? R.img.fmt(n) : Math.max(1, Math.round(n / 1024)) + " KB"; }
      function safeDel(k) { return Promise.resolve().then(function () { return roche.storage.delete(k); }).catch(function () { /* 没有就算了 */ }); }
      function delGiftImgs() { return Promise.all(st.chars.map(function (c) { return safeDel("giftimg:" + c.id); })); }
      function delCardImgs() { return Promise.all((st.letters || []).map(function (l) { return safeDel("pcimg:" + l.id); })); }
      // 图片：礼物图（旧版直接存在主数据里的也算）和明信片图
      function imgTasks() {
        var out = [], gm = st.d.gift || {}, k;
        for (k in gm) { var g = gm[k] && gm[k].cur; if (g && (g.img || g.hasImg)) out.push({ kind: "gift", id: k, g: g }); }
        (st.letters || []).forEach(function (l) { if (l.pc && l.pc.img) out.push({ kind: "card", id: l.id, l: l }); });
        return out;
      }
      function lenOf(v) { try { return v == null ? 0 : JSON.stringify(v).length; } catch (e) { return 0; } }
      // 只统计圣诞小屋自己的存储（不含 Roche 主记忆）
      async function scan() {
        var o = { gi: 0, gb: 0, pi: 0, pb: 0, an: 0, ab: 0, tb: 0, lb: 0 }, tasks = imgTasks(), i, ks = ["wb", "pre", "rgx"];
        for (i = 0; i < tasks.length; i++) {
          var t = tasks[i], s = t.kind === "gift" ? (t.g.img || await roche.storage.get("giftimg:" + t.id)) : await roche.storage.get("pcimg:" + t.id);
          if (!s) continue;
          if (t.kind === "gift") { o.gi++; o.gb += s.length; } else { o.pi++; o.pb += s.length; }
        }
        var idx = (await roche.storage.get("recIndex")) || [];
        idx.forEach(function (x) { o.an++; o.ab += Math.round((x.size || 0) * 1.34); });
        var txt = JSON.stringify(st.d, function (k, v) { return k === "img" && typeof v === "string" && v.length > 1000 ? undefined : v; }).length;
        o.tb = txt + lenOf(st.letters) + lenOf(st.wishes) + lenOf(st.wishReply) + lenOf(await roche.storage.get("memLog")) + lenOf(await roche.storage.get("memCfg"));
        for (i = 0; i < ks.length; i++) o.lb += lenOf(await roche.storage.get(ks[i]));
        info = o;
      }
      async function runScan() {
        if (sbusy) return;
        sbusy = true; smsg = "正在计算…"; ctx.render();
        try { await scan(); } catch (err) { roche.ui.toast("计算失败：" + (err && err.message || err)); }
        sbusy = false; smsg = ""; ctx.render();
      }
      async function compressAll() {
        if (!R.img) return roche.ui.toast("缺少图片压缩模块，请更新 theme.js");
        var tasks = imgTasks(), saved = 0, i, needSave = false, needLetters = false;
        sbusy = true;
        for (i = 0; i < tasks.length; i++) {
          var t = tasks[i], key = (t.kind === "gift" ? "giftimg:" : "pcimg:") + t.id;
          smsg = "正在压缩（" + (i + 1) + "/" + tasks.length + "）…"; ctx.render();
          try {
            var inline = t.kind === "gift" && !!t.g.img, cur = inline ? t.g.img : await roche.storage.get(key);
            if (!cur) continue;
            var pr = await R.img.prepare(cur, 1024);
            if (pr.src.length < cur.length || inline) { await roche.storage.set(key, pr.src); if (pr.src.length < cur.length) saved += cur.length - pr.src.length; }
            if (inline) { t.g.hasImg = true; delete t.g.img; needSave = true; }
            if (t.kind === "card" && pr.ar) { t.l.pc.ar = pr.ar; needLetters = true; }
          } catch (err) { /* 这一张处理不了就跳过 */ }
        }
        if (needSave) await ctx.save();
        if (needLetters) await roche.storage.set("letters", st.letters);
        try { await scan(); } catch (err2) { /* 忽略 */ }
        sbusy = false; smsg = "";
        roche.ui.toast(saved > 0 ? "压缩完成，省了 " + mb(saved) : "没有需要压缩的大图"); ctx.render();
      }

      var PAGES = { display: ["Display", "显 示 与 声 音"], gen: ["Generate", "生 成 设 置"], batch: ["Make All", "一 键 生 成"], data: ["Data", "数 据 管 理"], about: ["About", "高 级 与 关 于"] };
      function on(v) { return v ? "开" : "关"; }
      function sw(k, title, desc) {
        return '<div class="set"><div><b>' + title + '</b><small>' + desc + '</small></div><button class="sw' + (cfg[k] ? " on" : "") +
          '" data-act="settings.tgl" data-k="' + k + '" aria-label="' + title + '"><i></i></button></div>';
      }
      function row(title, summary, attrs) {
        return '<button class="srow" ' + attrs + '><span><b>' + title + '</b><small>' + summary + '</small></span><i>›</i></button>';
      }
      async function clearKeys(title, msg, fn, note) {
        if (!(await roche.ui.confirm({ title: title, message: msg }))) return;
        await fn();
        try { await scan(); } catch (err) { /* 忽略 */ }
        roche.ui.toast(note || "已清空"); ctx.render();
      }
      function parts() {
        if (!info) return [];
        return [
          { k: "gift", name: "礼物图", b: info.gb, d: info.gi + " 张", clr: "gift" },
          { k: "card", name: "明信片图", b: info.pb, d: info.pi + " 张", clr: "card" },
          { k: "rec", name: "我的唱片", b: info.ab, d: info.an + " 首（占得最多）", clr: "rec" },
          { k: "text", name: "文字数据", b: info.tb, d: "愿望、信件、生成结果、雪仗、写入记录，分项清除在下面", clr: "" },
          { k: "lib", name: "世界书 · 预设 · 正则", b: info.lb, d: "导入的预设和正则，以及勾选", clr: "lib" }
        ];
      }
      function totalBytes() { return parts().reduce(function (n, p) { return n + p.b; }, 0); }

      // ---------- 一级：分类列表（以后新增的设置，在这里加一行）----------
      function main() {
        return row("显示与声音", "飘雪 " + on(cfg.snow) + " · 切后台暂停音乐 " + on(cfg.bgPause), 'data-act="settings.open" data-p="display"') +
          row("生成设置", "流式 " + on(cfg.stream) + " · 读取记忆 " + on(cfg.memory) + " · 最近聊天 " + cfg.chatLines + " 条", 'data-act="settings.open" data-p="gen"') +
          row("一键生成", "模式：" + (cfg.batchMode === "once" ? "一次调用" : "逐项依次调用"), 'data-act="settings.open" data-p="batch"') +
          row("世界书 · 预设 · 正则", (R.worldbook && R.worldbook.brief) ? R.worldbook.brief() : "世界书、预设、正则的勾选与导入", 'data-act="core.go" data-v="worldbook"') +
          row("数据管理", info ? "小屋占用约 " + mb(totalBytes()) + " · 清理数据、压缩图片" : "查看占用、清理数据、压缩图片", 'data-act="settings.open" data-p="data"') +
          row("高级与关于", "测试模式 " + on(cfg.test) + " · 版本 v" + R.ver, 'data-act="settings.open" data-p="about"');
      }
      // ---------- 二级：具体页面 ----------
      function pageDisplay() {
        return '<div class="grp">' + sw("snow", "飘雪", "关掉后页面更省电，旧手机更流畅") +
          sw("bgPause", "切后台自动暂停音乐", "切到别的 App 时暂停，回来自动继续；手机锁屏也会暂停") + '</div>';
      }
      function pageGen() {
        return '<div class="grp">' +
          sw("stream", "文字边生成边显示", "只对回信、愿望回应、交换礼物现场有效；用中转站容易被截断的话请保持关闭") +
          sw("memory", "读取记忆", "让 TA 参考长期记忆里愉快的部分；关掉更省钱、更快") +
          '<div class="set"><div><b>读取最近聊天</b><small>条数越多越慢越费钱，0 表示不读</small></div><div class="step">' +
          '<button class="gbtn" data-act="settings.step" data-d="-5">−</button><span>' + cfg.chatLines + '</span><button class="gbtn" data-act="settings.step" data-d="5">+</button></div></div></div>';
      }
      function pageBatch() {
        var m = cfg.batchMode === "once" ? "once" : "each";
        function opt(v, title, desc) {
          return '<div class="set"><div><b>' + title + '</b><small>' + desc + '</small></div><button class="sw' + (m === v ? " on" : "") + '" data-act="settings.bmode" data-m="' + v + '" aria-label="' + title + '"><i></i></button></div>';
        }
        return '<div class="grp">' + opt("each", "逐项依次调用（默认）", "每一项各调用一次模型，进度清楚，失败只重试那一项，结果和单独生成完全一样。") +
          opt("once", "一次调用", "同一个角色的几项合并成一次请求，省一点钱；输出太长可能被截断，没成功的会自动改成逐项重试。") + '</div>' +
          '<p class="hint">一键生成的入口在主页最上面的第一张卡片。战绩评价、礼物图、圣诞信箱不在其中。</p>';
      }
      function pageData() {
        var ps = parts(), tot = totalBytes(), h = '<p class="hint">只统计圣诞小屋自己的存储，不含 Roche 主记忆。条的长短是各部分占小屋总占用的比例。</p>';
        if (!info) return h + (sbusy ? ctx.wait(ctx.esc(smsg || "正在计算…")) : '<div class="btns"><button class="btn ghost sm" data-act="settings.scan">计算占用</button></div>');
        h += '<div class="mbar">' + ps.map(function (p) {
          if (!p.b) return "";
          return '<i style="width:' + Math.max(1.5, p.b / (tot || 1) * 100).toFixed(1) + '%;background:' + COLORS[p.k] + '"></i>';
        }).join("") + '</div><div class="mtot">合计约 ' + mb(tot) + '</div>';
        h += '<div class="grp">' + ps.map(function (p) {
          return '<div class="prow"><span class="dot" style="background:' + COLORS[p.k] + '"></span><span class="pt"><b>' + p.name + '</b><small>' + p.d + '</small></span><span class="sz">' + mb(p.b) + '</span>' +
            (p.clr ? '<button class="btn ghost sm" data-act="settings.clr" data-w="' + p.clr + '">清除</button>' : "") + '</div>';
        }).join("") + '</div>';
        h += '<div class="grp"><h4>文 字 数 据 分 项 清 除</h4><p class="hint">这些只存在插件自己的存储里，不会动 Roche 主记忆。</p><div class="btns">' +
          '<button class="btn ghost sm" data-act="settings.clr" data-w="wishes">清空愿望</button>' +
          '<button class="btn ghost sm" data-act="settings.clr" data-w="letters">清空信件</button>' +
          '<button class="btn ghost sm" data-act="settings.clr" data-w="cache">清空生成结果</button>' +
          '<button class="btn ghost sm" data-act="settings.clr" data-w="snow">清空雪仗数据</button>' +
          '<button class="btn ghost sm" data-act="settings.clr" data-w="memlog">清空写入记录</button>' +
          '<button class="btn ghost sm" data-act="settings.clr" data-w="all">全部清空</button></div></div>';
        h += '<div class="grp"><h4>图 片</h4><p class="hint">新生成的图会自动缩小（长边约 1024 像素）。以前存的大图可以在这里压缩，只会缩小，不会放大。</p><div class="btns">' +
          '<button class="btn ghost sm" data-act="settings.comp"' + (sbusy ? " disabled" : "") + '>压缩已有图片</button>' +
          '<button class="btn ghost sm" data-act="settings.scan"' + (sbusy ? " disabled" : "") + '>重新计算</button></div></div>';
        if (sbusy) h += ctx.wait(ctx.esc(smsg || "处理中…"));
        return h;
      }
      function pageAbout() {
        var mods = Object.keys(R.status).map(function (k) { return '<div>' + (R.status[k] ? "✓ " + k : "<u>✗ " + k + "（没加载到）</u>") + '</div>'; }).join("");
        return '<div class="grp">' + sw("test", "测试模式", "打开后，信箱里会出现「提前揭晓愿望」「提前送达回信」按钮") + '</div>' +
          '<div class="grp"><h4>关 于</h4><div class="diag">圣诞小屋 v' + R.ver + '</div></div>' +
          '<div class="grp"><h4>模 块</h4><div class="diag mods">' + mods + '</div>' +
          (st.errs.length ? '<div class="diag" style="margin-top:8px"><u>运行错误：' + ctx.esc(st.errs.slice(-3).join("；")) + '</u></div>' : "") + '</div>';
      }

      return {
        back: function () { if (sub) { sub = null; return true; } return false; },
        view: function () {
          if (!sub) return ctx.page("Settings", "设 置", '<div class="stg">' + main() + '</div>');
          var body = { display: pageDisplay, gen: pageGen, batch: pageBatch, data: pageData, about: pageAbout }[sub]();
          return ctx.page(PAGES[sub][0], PAGES[sub][1], '<div class="stg">' + body + '</div>');
        },
        act: async function (name, el) {
          if (name === "open") {
            sub = el.dataset.p; ctx.render(); ctx.view.scrollTop = 0;
            if (sub === "data") runScan();   // 进数据管理页自动重新计算占用
            return;
          }
          if (name === "tgl") {
            var k = el.dataset.k; cfg[k] = !cfg[k]; await ctx.saveCfg(); ctx.applyCfg();
            if (k === "stream" && cfg.stream) roche.ui.toast("已开启流式，如果没反应或报错请关掉");
            return ctx.render();
          }
          if (name === "bmode") { cfg.batchMode = el.dataset.m === "once" ? "once" : "each"; await ctx.saveCfg(); return ctx.render(); }
          if (name === "scan") return runScan();
          if (name === "comp") {
            if (sbusy) return;
            if (!(await roche.ui.confirm({ title: "压缩已有图片", message: "会把已存的礼物图和明信片图缩小（长边约 1024 像素）。只会缩小，不会放大，缩小后无法还原，确定吗？" }))) return;
            return compressAll();
          }
          if (name === "step") { cfg.chatLines = Math.max(0, Math.min(50, cfg.chatLines + (+el.dataset.d))); await ctx.saveCfg(); return ctx.render(); }
          if (name === "clr") {
            var w = el.dataset.w, RESTART = "已清空，建议退出再进入小屋";
            if (w === "gift") return clearKeys("清除礼物图", "所有礼物图会删除，礼物本身（名字和理由）保留。确定吗？", async function () {
              await delGiftImgs();
              var gm = st.d.gift || {}, k2;
              for (k2 in gm) { if (gm[k2] && gm[k2].cur) { delete gm[k2].cur.hasImg; delete gm[k2].cur.img; } }
              await ctx.save();
            }, RESTART);
            if (w === "card") return clearKeys("清除明信片图", "所有明信片的画面会删除，信和明信片背面的话保留。确定吗？", async function () {
              await delCardImgs();
              (st.letters || []).forEach(function (l) { if (l.pc) { l.pc.img = false; delete l.pc.ar; } });
              await roche.storage.set("letters", st.letters);
            }, RESTART);
            if (w === "rec") return clearKeys("清除我的唱片", "你上传的所有唱片都会删除，圣诞经典不受影响。确定吗？", async function () {
              var idx = (await roche.storage.get("recIndex")) || [];
              await Promise.all(idx.map(function (x) { return safeDel("rec:" + x.id); }));
              await safeDel("recIndex");
            }, RESTART);
            if (w === "lib") return clearKeys("清除世界书 · 预设 · 正则", "导入的预设和正则、以及三个标签里的所有勾选都会清空。Roche 里的世界书本身不受影响。确定吗？", async function () {
              await Promise.all([safeDel("wb"), safeDel("pre"), safeDel("rgx")]);
            }, RESTART);
            if (w === "wishes") return clearKeys("清空愿望", "树上所有愿望和愿望回应都会删除，确定吗？", async function () { st.wishes = []; st.wishReply = null; await roche.storage.delete("wishes"); await roche.storage.delete("wishReply"); });
            if (w === "letters") return clearKeys("清空信件", "所有写过的信和回信都会删除，确定吗？", async function () { await delCardImgs(); st.letters = []; await roche.storage.delete("letters"); }, RESTART);
            if (w === "cache") return clearKeys("清空生成结果", "好孩子名单、礼物和交换礼物的记录会删除（可以重新生成），确定吗？", async function () { await delGiftImgs(); st.d.cert = {}; st.d.gift = {}; st.d.scene = null; st.d.draw = null; await ctx.save(); });
            if (w === "snow") return clearKeys("清空雪仗数据", "所有角色的雪仗战绩、台词、风格和评价都会清空，确定吗？", async function () {
              st.d.snowRec = {}; st.d.snowEval = {}; st.d.snowLines = {}; st.d.snowStyle = {}; await ctx.save();
            });
            if (w === "memlog") return clearKeys("清空写入记录", "只清掉插件里的「已写入」列表，已经写进 Roche 主记忆的内容不会被删除，之后在这里也撤回不了。确定吗？", async function () {
              await safeDel("memLog");
            }, RESTART);
            return clearKeys("全部清空", "愿望、信件、生成结果、雪仗数据和所有图片都会清空（唱片、世界书、预设、正则保留），确定吗？", async function () {
              await delCardImgs(); await delGiftImgs();
              st.wishes = []; st.letters = []; st.wishReply = null;
              st.d = { cert: {}, gift: {}, ready: {} };
              await Promise.all([roche.storage.delete("wishes"), roche.storage.delete("letters"), roche.storage.delete("wishReply"), roche.storage.delete("data")]);
            }, RESTART);
          }
        }
      };
    }
  });
})();
