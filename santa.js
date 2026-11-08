/* santa.js — 神秘圣诞老人：本地抽签（不花钱）+ 一次 AI 生成交换礼物小剧场（会带上勾选的世界书） */
(function () {
  "use strict";
  var R = window.RCC;
  var SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="#8a5a1c" stroke-width="2.2"><path d="M8 18l16-8 16 8v20H8z" fill="rgba(255,255,255,.3)"/><path d="M24 20l2.4 4.8 5.3.8-3.8 3.7.9 5.3-4.8-2.5-4.8 2.5.9-5.3-3.8-3.7 5.3-.8z" fill="#d9a63a"/></svg>';
  var CSS = `
.rcc .pair{display:flex;align-items:baseline;justify-content:center;gap:12px;padding:9px 0;border-bottom:1px dashed rgba(90,58,24,.4);font-size:20px}
.rcc .pair b{font-weight:400}.rcc .pair em{color:#b07a1e;font-style:normal}
.rcc .scene{border-left:3px solid #b07a1e;padding:4px 0 4px 14px;margin-top:18px;white-space:pre-wrap}
`;
  R.add({
    id: "santa", style: CSS,
    home: { order: 4, en: "Secret Santa", zh: "神 秘 圣 诞 老 人", desc: "几个角色抽签交换礼物", icon: "santa", svg: SVG },
    create: function (ctx) {
      var KEY = "santa:scene";
      return {
        view: function () {
          var st = ctx.st, d = st.d.draw, ps = st.jobs[KEY], lv = st.live[KEY], e = ctx.esc;
          var h = '<p class="hint">选 2 个以上角色，抽签决定谁送谁。</p>' + ctx.picker(true) +
            '<div class="center"><button class="btn" data-act="santa.draw">' + (d ? "重新抽签" : "开始抽签") + '</button></div>';
          if (d) {
            h += d.map(function (p) { return '<div class="pair en"><b>' + e(ctx.nm(ctx.charById(p.from))) + '</b><em>→</em><b>' + e(ctx.nm(ctx.charById(p.to))) + '</b></div>'; }).join("") +
              '<div class="center"><button class="btn" data-act="santa.scene"' + (ps ? " disabled" : "") + '>' + (ps ? "生成中" : (st.d.scene ? "换一场" : "生成交换礼物现场")) + '</button></div>';
          }
          if (ps && !lv) h += ctx.wait("大家正在拆礼物，你可以先去别处逛逛");
          if (lv) h += '<div class="scene" data-live="' + KEY + '">' + e(lv) + '</div>';
          else if (st.d.scene) h += '<div class="scene">' + e(st.d.scene) + '</div>';
          return ctx.page("Secret Santa", "神 秘 圣 诞 老 人", h);
        },
        act: function (name) {
          var st = ctx.st;
          if (name === "draw") {
            if (st.multi.length < 2) return ctx.roche.ui.toast("至少选 2 个角色");
            var to = ctx.derange(st.multi);
            st.d.draw = st.multi.map(function (f, i) { return { from: f, to: to[i] }; });
            st.d.scene = null; ctx.save(); return ctx.render();
          }
          if (name === "scene") {
            var pairs0 = st.d.draw, ids = st.multi.slice();
            ctx.job(KEY, "santa", "交换礼物现场", async function () {
              var infos = await Promise.all(ids.map(async function (cid) {
                var ch = ctx.charById(cid), l = await ctx.context(ch), w = ctx.worldOf(ch);
                return "【" + ctx.nm(ch) + "】人设：" + String(ch.persona || ch.bio || "").slice(0, 250) + "\n喜好：" + l.split("\n").slice(0, 6).join("；") +
                  (w ? "\n世界设定：" + w : "");
              }));
              var pairs = pairs0.map(function (p) { return ctx.nm(ctx.charById(p.from)) + " 送给 " + ctx.nm(ctx.charById(p.to)); }).join("；");
              st.d.scene = await ctx.ask("你是擅长写温馨群像小剧场的作者。参与者资料：\n" + infos.join("\n\n") +
                "\n规则：只写愉快温馨的内容，不涉及痛苦或负面经历；不要出现“记忆”“系统”“AI”字样；不要使用 emoji。",
                "这是一场圣诞“神秘圣诞老人”交换礼物聚会。抽签结果：" + pairs +
                "。写一段 300-500 字的小剧场：每个人拆礼物、猜送礼人，礼物要贴合收礼人的喜好，每个人的说话方式符合各自人设，气氛温馨好笑。直接输出正文。", false, KEY);
            });
          }
        }
      };
    }
  });
})();
