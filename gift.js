/* gift.js — 礼物盲盒：角色挑礼物（结果按角色缓存），可选生成礼物图
 * 挑礼物的逻辑放在 R.gens.gift 里，单独点按钮和「一键生成」共用同一份（礼物图不在一键生成里） */
(function () {
  "use strict";
  var R = window.RCC;
  var SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="#8a5a1c" stroke-width="2.2"><rect x="8" y="20" width="32" height="20" fill="rgba(163,41,58,.35)"/><rect x="6" y="14" width="36" height="8" fill="rgba(163,41,58,.5)"/><path d="M24 14v26M24 14c-6-8-12-2-6 0M24 14c6-8 12-2 6 0"/></svg>';
  var CSS = `
.rcc .stage{position:relative;width:190px;height:180px;margin:0 auto}
.rcc .stage .ico{position:relative;width:150px;height:150px;margin:18px auto 0}
.rcc .stage .glow{position:absolute;left:50%;top:0;width:200px;height:200px;margin-left:-100px;background:radial-gradient(circle,rgba(244,184,96,.7),transparent 65%);opacity:0}
.rcc .stage.on .glow{opacity:.75}
.rcc .stage.go .glow{animation:rcc-gl .9s ease-out}
.rcc .stage.go .ico{animation:rcc-hop .8s ease-out}
@keyframes rcc-hop{30%{transform:translateY(-24px) rotate(-5deg)}60%{transform:translateY(0) rotate(4deg)}}
@keyframes rcc-gl{from{opacity:0}}
.rcc .gifted{border-top:1px dashed rgba(90,58,24,.45);padding-top:16px;margin-top:6px}
.rcc .gifted h3{margin:0 0 6px;font-size:26px;font-weight:400;color:var(--berry)}
.rcc .gifted p{margin:0;white-space:pre-wrap}
.rcc .gifted img{display:block;max-width:100%;margin-top:14px;border-radius:6px;box-shadow:0 4px 10px rgba(60,30,0,.45)}
`;
  R.gens = R.gens || {};
  var G = R.gens.gift = {
    id: "gift", scope: "char", label: "礼物盲盒", desc: "每个角色挑一份礼物（不含礼物图）",
    jobKey: function (c) { return "gift:" + c.id; },
    has: function (ctx, c) { var e0 = ctx.st.d.gift[c.id]; return !!(e0 && e0.cur); },
    prompt: function (ctx, c) {
      var e0 = ctx.st.d.gift[c.id] || { hist: [] };
      return "你扮演圣诞老人，根据你对对方的了解挑一份圣诞礼物。不要与这些重复：" + (e0.hist.join("、") || "无") +
        '。只输出 JSON：{"name":"礼物名","reason":"用你的口吻说挑选理由，50-90字","image":"礼物的英文生图提示词，一句话"}';
    },
    apply: function (ctx, c, g) {
      if (!g || !g.name) throw new Error("礼物内容不完整，再试一次");
      var e0 = ctx.st.d.gift[c.id] || { hist: [] };
      e0.hist.push(g.name); e0.cur = g; ctx.st.d.gift[c.id] = e0;
      try { Promise.resolve(ctx.roche.storage.delete("giftimg:" + c.id)).catch(function () { /* 没有旧图 */ }); } catch (err) { /* 忽略 */ }
      if (ctx.st.view === "gift") ctx.st.anim = c.id;
    },
    run: async function (ctx, c) {
      var l = await ctx.context(c);
      G.apply(ctx, c, await ctx.ask(ctx.sysFor(c, l), G.prompt(ctx, c), true));
    }
  };
  R.add({
    id: "gift", style: CSS,
    home: { order: 2, en: "Gift Box", zh: "礼 物 盲 盒", desc: "TA 根据对你的了解，挑一份礼物", icon: "gift", svg: SVG },
    create: function (ctx) {
      var imgs = {}, loading = {};
      // 礼物图单独存在 giftimg:<角色id>，不再跟着主数据一起反复读写
      function ensureImg(c, g) {
        if (!g || !g.hasImg || imgs[c.id] !== undefined || loading[c.id]) return;
        loading[c.id] = true;
        Promise.resolve(ctx.roche.storage.get("giftimg:" + c.id)).then(function (s) { imgs[c.id] = s || ""; loading[c.id] = false; if (ctx.st.view === "gift") ctx.render(); })
          .catch(function () { imgs[c.id] = ""; loading[c.id] = false; });
      }
      async function migrate() {   // 旧版本把图直接存在主数据里：搬出来并缩小
        var map = ctx.st.d.gift || {}, moved = false, k;
        for (k in map) {
          var g = map[k] && map[k].cur;
          if (!g || !g.img) continue;
          try {
            var pr = R.img ? await R.img.prepare(g.img, 1024) : { src: g.img };
            await ctx.roche.storage.set("giftimg:" + k, pr.src);
            imgs[k] = pr.src; g.hasImg = true; delete g.img; moved = true;
          } catch (err) { /* 这一张搬不动就留着，下次再试 */ }
        }
        if (moved) await ctx.save();
      }
      return {
        init: function () { migrate(); },
        view: function () {
          var c = ctx.curChar(), e0 = c && ctx.st.d.gift[c.id], g = e0 && e0.cur, e = ctx.esc;
          var pend = c && ctx.st.jobs["gift:" + c.id], pimg = c && ctx.st.jobs["img:" + c.id];
          var h = ctx.picker(false) + '<p class="hint">' + e(ctx.nm(c)) + ' 会根据对你的了解挑礼物。</p>' +
            '<div class="stage' + (g ? " on" : "") + (g && ctx.st.anim === (c && c.id) ? " go" : "") + '"><div class="glow"></div>' + ctx.icon("gift", SVG) + '</div>' +
            '<div class="center"><button class="btn" data-act="gift.open"' + (pend ? " disabled" : "") + '>' + (pend ? "生成中" : (g ? "换一个" : "拆开盲盒")) + '</button></div>';
          if (pend) h += ctx.wait("TA 正在挑礼物，你可以先去别处逛逛");
          if (g) {
            ensureImg(c, g);
            var gsrc = g.img || (g.hasImg && imgs[c.id]) || "";
            h += '<div class="gifted"><h3 class="en">' + e(g.name) + '</h3><p>' + e(g.reason) + '</p>' + (gsrc ? '<img src="' + e(gsrc) + '" alt="">' : "") + '</div>' +
              '<div class="center"><button class="btn ghost sm" data-act="gift.img"' + (pimg ? " disabled" : "") + '>' + (pimg ? "绘制中" : "生成礼物图（消耗额度，可选）") + '</button></div>';
            if (pimg) h += ctx.wait("正在画礼物图");
          }
          return ctx.page("Gift Box", "礼 物 盲 盒", h);
        },
        act: async function (name) {
          var c = ctx.curChar();
          if (!c) return ctx.roche.ui.toast("请先选一个角色");
          if (name === "open") {
            if (G.has(ctx, c) && !(await ctx.roche.ui.confirm({ title: "换一个礼物", message: "会再调用一次模型，现在的礼物会被换掉（礼物图也会没有）。确定吗？" }))) return;
            ctx.job("gift:" + c.id, "gift", "礼物", function () { return G.run(ctx, c); });
          }
          if (name === "img") {
            var e1 = ctx.st.d.gift[c.id], g1 = e1 && e1.cur;
            if (!g1) return;
            if (!(await ctx.roche.ui.confirm({ title: "生成礼物图", message: "生图会消耗你的生图额度，确定要生成吗？" }))) return;
            ctx.job("img:" + c.id, "gift", "礼物图", async function () {
              var r = await ctx.roche.ai.generateImage({ prompt: "christmas gift illustration, " + (g1.image || g1.name) + ", warm light, vintage storybook style, no text" });
              var src = ctx.imgSrc(r);
              if (!src) throw new Error("没有拿到图片，请检查生图设置");
              var pr = R.img ? await R.img.prepare(src, 1024) : { src: src };
              await ctx.roche.storage.set("giftimg:" + c.id, pr.src);
              imgs[c.id] = pr.src; g1.hasImg = true; delete g1.img;
            });
          }
        }
      };
    }
  });
})();
