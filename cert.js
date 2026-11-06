/* cert.js — 好孩子名单：角色扮圣诞老人出一份鉴定报告（结果按角色缓存） */
(function () {
  "use strict";
  var R = window.RCC;
  var SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="#8a5a1c" stroke-width="2.2"><rect x="10" y="7" width="28" height="34" rx="3" fill="rgba(255,255,255,.3)"/><path d="M16 17h16M16 24h16M16 31h9"/><circle cx="34" cy="35" r="5" fill="#a3293a" stroke="none"/></svg>';
  var CSS = `
.rcc .cert{position:relative;margin-top:16px;padding:26px 20px 36px;border:3px double #8a5a1c;background:rgba(255,248,226,.4);box-shadow:inset 0 0 18px rgba(150,100,40,.3)}
.rcc .cert h2{margin:0;text-align:center;font-size:23px;color:var(--berry);font-weight:400}
.rcc .cert .to{text-align:center;color:var(--soft);font-size:12px;letter-spacing:.3em;margin:8px 0 14px}
.rcc .cert .it{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed rgba(90,58,24,.4)}
.rcc .cert .stars{color:#b7791f;letter-spacing:3px;white-space:nowrap}
.rcc .cert .vd{margin:16px 0 4px;white-space:pre-wrap}
.rcc .cert .note{color:var(--berry);font-style:italic}
.rcc .cert .sg{text-align:right;color:var(--soft);font-size:13px;margin:12px 80px 0 0}
.rcc .cert .seal{position:absolute;right:20px;bottom:16px;width:62px;height:62px;border-radius:50%;display:grid;place-items:center;text-align:center;font-size:11px;line-height:1.3;color:#f8dede;transform:rotate(-10deg);background:radial-gradient(circle at 35% 30%,#d6505f,#a3293a 55%,#6e1522);box-shadow:inset 0 2px 3px rgba(255,255,255,.35),inset 0 -3px 5px rgba(0,0,0,.4),0 3px 5px rgba(0,0,0,.45)}
`;
  R.add({
    id: "cert", style: CSS,
    home: { order: 1, en: "Good Kids", zh: "好 孩 子 名 单", desc: "让 TA 扮圣诞老人，给你出一份鉴定报告", icon: "cert", svg: SVG },
    create: function (ctx) {
      return {
        view: function () {
          var c = ctx.curChar(), k = c && ctx.st.d.cert[c.id], pend = c && ctx.st.jobs["cert:" + c.id], e = ctx.esc;
          var h = ctx.picker(false) + '<p class="hint">让 ' + e(ctx.nm(c)) + ' 扮成圣诞老人，给你出一份鉴定报告。</p>' +
            '<div class="center"><button class="btn" data-act="cert.make"' + (pend ? " disabled" : "") + '>' + (pend ? "生成中" : (k ? "重新鉴定" : "开始鉴定")) + '</button></div>';
          if (pend) h += ctx.wait("圣诞老人在翻小本本，你可以先去别处逛逛");
          if (k) {
            h += '<div class="cert"><h2 class="en">' + e(k.title) + '</h2><div class="to">授予　' + e(ctx.userName()) + '</div>' +
              k.items.map(function (it) {
                var n = Math.max(1, Math.min(5, +it.stars || 5));
                return '<div class="it"><span>' + e(it.label) + '</span><span class="stars">' + "★".repeat(n) + "☆".repeat(5 - n) + '</span></div>';
              }).join("") + '<div class="vd">' + e(k.verdict) + '</div>' + (k.note ? '<div class="vd note">' + e(k.note) + '</div>' : "") +
              '<div class="sg">圣诞老人（' + e(k.who) + '）</div><div class="seal">已核验<br>' + e(k.year) + '</div></div>';
          }
          return ctx.page("Good Kids", "好 孩 子 名 单", h);
        },
        act: function (name) {
          if (name !== "make") return;
          var c = ctx.curChar();
          if (!c) return ctx.roche.ui.toast("请先选一个角色");
          ctx.job("cert:" + c.id, "cert", "好孩子名单", async function () {
            var l = await ctx.context(c);
            var k = await ctx.ask(ctx.sysFor(c, l), "现在是圣诞节前夕，你扮演圣诞老人，为对方出具一份「年度好孩子鉴定报告」。只输出 JSON：" +
              '{"title":"英文或中英混合的报告标题，简短","items":[{"label":"评分项，共4项，有趣且贴合对方的喜好，不要负面","stars":5}],"verdict":"总评，60-100字，用你的口吻","note":"一句悄悄话，20字内"}', true);
            if (!k.items || !k.items.length) throw new Error("报告内容不完整，再试一次");
            k.title = k.title || "Good Kid Report"; k.who = ctx.nm(c); k.year = new Date().getFullYear();
            ctx.st.d.cert[c.id] = k;
          });
        }
      };
    }
  });
})();
