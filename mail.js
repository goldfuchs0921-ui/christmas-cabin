/* mail.js — 圣诞信箱：许愿树（12/25 揭晓，由角色回应）+ 写信给圣诞老人（第二天 9 点回信） */
(function () {
  "use strict";
  var R = window.RCC;
  var SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="#8a5a1c" stroke-width="2.2"><rect x="6" y="12" width="36" height="25" rx="2" fill="rgba(255,255,255,.35)"/><path d="M6 14l18 13 18-13"/><circle cx="24" cy="27" r="4" fill="#a3293a" stroke="none"/></svg>';
  var SPOTS = [[100, 62], [78, 100], [124, 106], [60, 142], [100, 134], [140, 144], [50, 160], [90, 162], [130, 164], [112, 78], [88, 78], [150, 160]];
  var CSS = `
.rcc .tabs{display:flex;gap:24px;margin:0 0 14px;border-bottom:1px solid rgba(90,58,24,.35)}
.rcc .tabs button{padding:8px 0;border:0;border-bottom:2px solid transparent;background:none;color:var(--soft)}
.rcc .tabs button.on{color:var(--ink);font-weight:600;border-color:#b07a1e}
.rcc .tree{display:block;width:180px;margin:0 auto}
.rcc ul.wl{list-style:none;padding:0;margin:8px 0}
.rcc ul.wl li{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px dashed rgba(90,58,24,.4)}
.rcc ul.wl small{color:var(--soft);white-space:nowrap}
.rcc .pw{position:relative}
.rcc textarea.paper{display:block;width:100%;height:210px;border:0;outline:none;resize:none;padding-top:46px}
.rcc .stamp{position:absolute;top:12px;right:14px;width:34px;height:42px;border:1px dashed #3a2410;opacity:.45;display:grid;place-items:center;font-size:14px;pointer-events:none}
.rcc .pm{position:absolute;top:16px;right:46px;width:58px;height:58px;border:1px solid rgba(58,36,16,.45);border-radius:50%;display:grid;place-items:center;text-align:center;font:10px/1.25 sans-serif;color:rgba(58,36,16,.6);transform:rotate(-14deg);pointer-events:none}
.rcc .lt{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 0;border-bottom:1px dashed rgba(90,58,24,.4)}
.rcc .lt small{display:block;color:var(--soft)}
`;
  function tree(n) {
    var o = "";
    for (var i = 0; i < Math.min(n, 12); i++) o += '<circle cx="' + SPOTS[i][0] + '" cy="' + SPOTS[i][1] + '" r="5" fill="' + (i % 2 ? "#a3293a" : "#e3b341") + '" stroke="#5a3a20" stroke-width=".8"/>';
    return '<svg class="tree" viewBox="0 0 200 190" aria-hidden="true"><rect x="92" y="168" width="16" height="20" fill="#5a3a20"/>' +
      '<g fill="#3a6b47" stroke="#25472f" stroke-width="1.4" stroke-linejoin="round"><polygon points="100,22 150,82 50,82"/><polygon points="100,50 164,124 36,124"/><polygon points="100,86 176,172 24,172"/></g>' +
      '<text x="100" y="22" text-anchor="middle" font-size="22" fill="#d9a63a">★</text>' + o + '</svg>';
  }

  R.add({
    id: "mail", style: CSS, jobs: "mail:",
    home: { order: 3, en: "Mailbox", zh: "圣 诞 信 箱", desc: "许愿树，和写给圣诞老人的信", icon: "mail", svg: SVG },
    create: function (ctx) {
      var st = ctx.st, roche = ctx.roche, e = ctx.esc, tab = "wish", open = null, testReveal = false;
      st.wishText = st.wishText || ""; st.letterText = st.letterText || "";
      function revealed(w) { return testReveal || Date.now() >= new Date(w.year, 11, 25).getTime(); }
      function wishChar(n) { return st.chars.filter(function (x) { return ctx.nm(x) === n; })[0] || null; }

      function vWish() {
        var any = st.wishes.length && st.wishes.every(revealed), pw = st.jobs["mail:wish"], lv = st.live["mail:wish"];
        var h = tree(st.wishes.length) +
          '<div class="row"><input class="in" data-in="wishText" maxlength="60" placeholder="写下一个圣诞愿望" value="' + e(st.wishText) + '"><button class="btn sm" data-act="mail.addWish">挂上树</button></div>' +
          '<p class="hint">愿望会一直保密，12 月 25 日才揭晓，由 TA 回应。</p><ul class="wl">' +
          (st.wishes.length ? st.wishes.map(function (w) { return '<li><span>' + e(w.text) + '</span><small>' + (revealed(w) ? "已揭晓" : "封存中") + '</small></li>'; }).join("")
            : '<li><small>树上还空着，挂上第一个愿望吧。</small></li>') + '</ul>';
        if (ctx.cfg.test) h += '<div class="center"><button class="link" data-act="mail.testReveal">测试：' + (testReveal ? "取消" : "提前") + '揭晓</button></div>';
        if (any) {
          h += ctx.picker(false) + '<div class="center"><button class="btn" data-act="mail.replyWish"' + (pw ? " disabled" : "") + '>' + (pw ? "生成中" : "请 " + e(ctx.nm(ctx.curChar())) + " 回应愿望") + '</button></div>';
          if (pw && !lv) h += ctx.wait("TA 在读你的愿望，你可以先去别处逛逛");
        }
        if (lv) h += '<div class="paper" data-live="mail:wish">' + e(lv) + '</div>';
        else if (st.wishReply) h += '<div class="paper" style="min-height:0">' + ctx.rich(st.wishReply.text, wishChar(st.wishReply.who)) + '\n—— ' + e(st.wishReply.who) + '</div>';
        return h;
      }
      function vLetters() {
        return ctx.picker(false) + '<div class="pw"><div class="stamp">★</div><textarea class="paper" data-in="letterText" placeholder="亲爱的圣诞老人……">' + e(st.letterText) + '</textarea></div>' +
          '<div class="center"><button class="btn" data-act="mail.send">投进信箱</button></div><p class="hint">回信会在第二天早上 9 点送到。</p>' +
          st.letters.slice().reverse().map(function (l) {
            var ready = Date.now() >= l.replyAt, pl = st.jobs["mail:letter:" + l.id];
            var status = pl ? "正在写回信" : (l.reply ? "已读" : (ready ? "回信到了" : ctx.fmt(l.replyAt) + " 送达"));
            var btn = (l.reply || ready || pl) ? '<button class="btn sm" data-act="mail.openLetter" data-id="' + e(l.id) + '">' + (l.reply ? "再看看" : (pl ? "查看" : "拆信")) + '</button>'
              : (ctx.cfg.test ? '<button class="link" data-act="mail.skip" data-id="' + e(l.id) + '">测试：提前送达</button>' : "");
            return '<div class="lt"><span>给 ' + e(l.charName) + '<small>' + ctx.fmt(l.sentAt) + ' 寄出 · ' + status + '</small></span>' + btn + '</div>';
          }).join("");
      }
      function vDetail() {
        var l = st.letters.filter(function (x) { return x.id === open; })[0];
        if (!l) { open = null; return null; }
        var key = "mail:letter:" + l.id, lv = st.live[key];
        return ctx.page("Letter", "回 信", '<div class="paper"><div class="stamp">★</div><div class="pm">北极邮局<br>' + ctx.fmt(l.replyAt) + '</div><div style="padding-top:40px">' +
          (lv ? '<span data-live="' + key + '">' + e(lv) + '</span>' : ctx.rich(l.reply || "", ctx.charById(l.charId))) + '</div></div>' + (st.jobs[key] && !lv ? ctx.wait("圣诞老人在写回信，你可以先去别处逛逛") : ""));
      }

      return {
        init: function () { st.wishText = st.wishText || ""; },
        back: function () { if (open) { open = null; return true; } return false; },
        view: function () {
          if (open) { var d = vDetail(); if (d) return d; }
          return ctx.page("Mailbox", "圣 诞 信 箱", '<div class="tabs"><button class="' + (tab === "wish" ? "on" : "") + '" data-act="mail.tab" data-t="wish">许愿树</button><button class="' +
            (tab === "letter" ? "on" : "") + '" data-act="mail.tab" data-t="letter">写信</button></div>' + (tab === "wish" ? vWish() : vLetters()));
        },
        act: async function (name, el) {
          var c = ctx.curChar(), id = el.dataset.id;
          if (name === "tab") { tab = el.dataset.t; return ctx.render(); }
          if (name === "testReveal") { testReveal = !testReveal; return ctx.render(); }
          if (name === "addWish") {
            var t = st.wishText.trim();
            if (!t) return roche.ui.toast("先写下愿望");
            st.wishes.push({ id: ctx.uid(), text: t, year: new Date().getFullYear(), at: Date.now() }); st.wishText = "";
            await roche.storage.set("wishes", st.wishes); roche.ui.toast("愿望已挂上树"); return ctx.render();
          }
          if (name === "replyWish") {
            if (!c) return;
            ctx.job("mail:wish", "mail", "愿望回应", async function () {
              var l = await ctx.context(c);
              var txt = await ctx.ask(ctx.sysFor(c, l), "你扮演圣诞老人，12 月 25 日到了，对方挂在许愿树上的愿望如下：\n" + st.wishes.map(function (w, i) { return (i + 1) + ". " + w.text; }).join("\n") +
                "\n请逐条温暖地回应，可以说会努力帮忙实现，总共 150-250 字，直接输出正文。", false, "mail:wish");
              st.wishReply = { text: txt, who: ctx.nm(c), at: Date.now() };
              await roche.storage.set("wishReply", st.wishReply);
            });
            return;
          }
          if (name === "send") {
            var lt = st.letterText.trim();
            if (!c) return roche.ui.toast("请先选一个收信角色");
            if (!lt) return roche.ui.toast("信还是空的");
            var dd = new Date(); dd.setDate(dd.getDate() + 1); dd.setHours(9, 0, 0, 0);
            st.letters.push({ id: ctx.uid(), charId: c.id, charName: ctx.nm(c), text: lt, sentAt: Date.now(), replyAt: dd.getTime(), reply: null }); st.letterText = "";
            await roche.storage.set("letters", st.letters); roche.ui.toast("信已投进信箱"); return ctx.render();
          }
          if (name === "skip") { st.letters.forEach(function (x) { if (x.id === id) x.replyAt = Date.now(); }); await roche.storage.set("letters", st.letters); return ctx.render(); }
          if (name === "openLetter") {
            var L = st.letters.filter(function (x) { return x.id === id; })[0];
            if (!L) return;
            open = id;
            if (L.reply || st.jobs["mail:letter:" + id]) return ctx.render();
            var ch = ctx.charById(L.charId) || c;
            if (!ch) { open = null; return roche.ui.toast("找不到这个角色了"); }
            ctx.job("mail:letter:" + id, "mail", "回信", async function () {
              var l = await ctx.context(ch);
              L.reply = await ctx.ask(ctx.sysFor(ch, l), "你扮演圣诞老人，给对方写一封手写风格的回信。对方的来信：\n" + L.text +
                "\n回信 120-220 字，亲切温暖、有画面感，落款写圣诞老人，直接输出正文。", false, "mail:letter:" + id);
              await roche.storage.set("letters", st.letters);
            });
          }
        }
      };
    }
  });
})();
