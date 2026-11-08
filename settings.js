/* settings.js — 设置页
 * 一级页面只有几行分类，每行下面一句话写着当前状态；点进去才是具体开关，最多两层，不用翻找
 * 以后新增设置：在 MAIN 里加一行，再给它做一个小页面即可 */
(function () {
  "use strict";
  var R = window.RCC;

  var CSS = `
.rcc .grp{margin:0 0 18px}
.rcc .grp h4{margin:0 0 4px;font-size:12px;letter-spacing:.38em;color:var(--soft);font-weight:400}
.rcc .set{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid rgba(90,58,24,.25)}
.rcc .set b{display:block;font-weight:600}
.rcc .set small{display:block;color:var(--soft);font-size:12px;line-height:1.5}
.rcc .sw{flex:0 0 auto;position:relative;width:54px;height:30px;border-radius:999px;border:0;padding:0;background:#6b4a2a;box-shadow:inset 0 3px 6px rgba(0,0,0,.55),0 1px 0 rgba(255,255,255,.5)}
.rcc .sw i{position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#fff1b8,#e3b341 40%,#a8741c 75%,#6e4710);box-shadow:inset 0 1px 1px rgba(255,255,255,.7),0 2px 3px rgba(0,0,0,.6);transition:transform .2s}
.rcc .sw.on{background:#4f7a4a}
.rcc .sw.on i{transform:translateX(24px)}
.rcc .step{display:flex;align-items:center;gap:10px}
.rcc .step .gbtn{width:30px;height:30px;font-size:18px}
.rcc .step span{min-width:26px;text-align:center;font-weight:600}
.rcc .btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
.rcc .diag{font-size:12px;color:var(--soft);line-height:1.9}
.rcc .diag u{text-decoration:none;color:var(--berry)}
.rcc .srow{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:14px 2px;border:0;border-bottom:1px solid rgba(90,58,24,.25);background:none;text-align:left;color:var(--ink)}
.rcc .srow b{display:block;font-weight:600}
.rcc .srow small{display:block;color:var(--soft);font-size:12px;line-height:1.5}
.rcc .srow i{flex:0 0 auto;font-style:normal;font-size:24px;line-height:1;color:var(--soft)}
`;

  R.add({
    id: "settings", style: CSS,
    create: function (ctx) {
      var cfg = ctx.cfg, roche = ctx.roche, st = ctx.st, sub = null;
      var PAGES = { display: ["Display", "显 示 与 声 音"], gen: ["Generate", "生 成 设 置"], data: ["Data", "数 据 管 理"], about: ["About", "高 级 与 关 于"] };
      function on(v) { return v ? "开" : "关"; }
      function sw(k, title, desc) {
        return '<div class="set"><div><b>' + title + '</b><small>' + desc + '</small></div><button class="sw' + (cfg[k] ? " on" : "") +
          '" data-act="settings.tgl" data-k="' + k + '" aria-label="' + title + '"><i></i></button></div>';
      }
      function row(title, summary, attrs) {
        return '<button class="srow" ' + attrs + '><span><b>' + title + '</b><small>' + summary + '</small></span><i>›</i></button>';
      }
      async function clearKeys(title, msg, fn) {
        if (!(await roche.ui.confirm({ title: title, message: msg }))) return;
        await fn(); roche.ui.toast("已清空"); ctx.render();
      }

      // ---------- 一级：分类列表（以后新增的设置，在这里加一行）----------
      function main() {
        return row("显示与声音", "飘雪 " + on(cfg.snow) + " · 切后台暂停音乐 " + on(cfg.bgPause), 'data-act="settings.open" data-p="display"') +
          row("生成设置", "流式 " + on(cfg.stream) + " · 读取记忆 " + on(cfg.memory) + " · 最近聊天 " + cfg.chatLines + " 条", 'data-act="settings.open" data-p="gen"') +
          row("世界书", (R.worldbook && R.worldbook.brief) ? R.worldbook.brief() : "选择生成时参考哪些世界书", 'data-act="core.go" data-v="worldbook"') +
          row("数据管理", "清空愿望、信件和生成结果", 'data-act="settings.open" data-p="data"') +
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
      function pageData() {
        return '<div class="grp"><small class="hint" style="display:block;margin:0">愿望、信件和生成结果只存在插件自己的存储里，不会写入 Roche 主记忆。雪仗的战绩和台词在雪仗页的「清理数据」里单独清。</small>' +
          '<div class="btns"><button class="btn ghost sm" data-act="settings.clr" data-w="wishes">清空愿望</button>' +
          '<button class="btn ghost sm" data-act="settings.clr" data-w="letters">清空信件</button>' +
          '<button class="btn ghost sm" data-act="settings.clr" data-w="cache">清空生成结果</button>' +
          '<button class="btn ghost sm" data-act="settings.clr" data-w="all">全部清空</button></div></div>';
      }
      function pageAbout() {
        var status = Object.keys(R.status).map(function (k) { return R.status[k] ? "✓ " + k : "<u>✗ " + k + "（没加载到）</u>"; }).join("　");
        return '<div class="grp">' + sw("test", "测试模式", "打开后，信箱里会出现「提前揭晓愿望」「提前送达回信」按钮") + '</div>' +
          '<div class="grp"><h4>关 于</h4><div class="diag">圣诞小屋 v' + R.ver + '<br>模块：' + status +
          (st.errs.length ? '<br><u>运行错误：' + ctx.esc(st.errs.slice(-3).join("；")) + '</u>' : "") + '</div></div>';
      }

      return {
        back: function () { if (sub) { sub = null; return true; } return false; },
        view: function () {
          if (!sub) return ctx.page("Settings", "设 置", main());
          var body = { display: pageDisplay, gen: pageGen, data: pageData, about: pageAbout }[sub]();
          return ctx.page(PAGES[sub][0], PAGES[sub][1], body);
        },
        act: async function (name, el) {
          if (name === "open") { sub = el.dataset.p; return ctx.render(); }
          if (name === "tgl") {
            var k = el.dataset.k; cfg[k] = !cfg[k]; await ctx.saveCfg(); ctx.applyCfg();
            if (k === "stream" && cfg.stream) roche.ui.toast("已开启流式，如果没反应或报错请关掉");
            return ctx.render();
          }
          if (name === "step") { cfg.chatLines = Math.max(0, Math.min(50, cfg.chatLines + (+el.dataset.d))); await ctx.saveCfg(); return ctx.render(); }
          if (name === "clr") {
            var w = el.dataset.w;
            if (w === "wishes") return clearKeys("清空愿望", "树上所有愿望和愿望回应都会删除，确定吗？", async function () { st.wishes = []; st.wishReply = null; await roche.storage.delete("wishes"); await roche.storage.delete("wishReply"); });
            if (w === "letters") return clearKeys("清空信件", "所有写过的信和回信都会删除，确定吗？", async function () { st.letters = []; await roche.storage.delete("letters"); });
            if (w === "cache") return clearKeys("清空生成结果", "好孩子名单、礼物和交换礼物的记录会删除（可以重新生成），确定吗？", async function () { st.d.cert = {}; st.d.gift = {}; st.d.scene = null; st.d.draw = null; await ctx.save(); });
            return clearKeys("全部清空", "愿望、信件、生成结果，以及雪仗的战绩、台词和评价都会清空，确定吗？", async function () {
              st.wishes = []; st.letters = []; st.wishReply = null; st.d = { cert: {}, gift: {}, ready: {} };
              await Promise.all([roche.storage.delete("wishes"), roche.storage.delete("letters"), roche.storage.delete("wishReply"), roche.storage.delete("data")]);
            });
          }
        }
      };
    }
  });
})();
