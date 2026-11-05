/* 圣诞小屋 v1.0.0 — Roche 全信任 JS 插件
 * 功能：好孩子名单 / 礼物盲盒 / 圣诞信箱 / 神秘圣诞老人
 * 数据：只用 roche.storage 保存愿望和信件；不写入 Roche 主记忆
 */
(function () {
  "use strict";

  var cleanup = null;
  var STYLE_ID = "rcc-style";

  // 读记忆时过滤掉带负面/不适内容的句子，只留喜好
  var NEG = /疼|痛|牙|蛀|病|死|哭|伤|难过|焦虑|抑郁|失眠|吵架|分手|医院|药|害怕|崩溃|生气|讨厌|孤独|压力|委屈|噩梦|自杀|累/;

  var CSS = `
.rcc{--lamp:#f4b860;--berry:#b8394f;--snow:#f1f5f4;--ink:#3b2a1a;position:relative;height:100%;overflow:hidden;background:linear-gradient(#0b1a28,#12313a 62%,#1d4a3c);color:var(--snow);font:15px/1.65 -apple-system,"PingFang SC","Noto Sans SC",sans-serif}
.rcc *{box-sizing:border-box}
.rcc button,.rcc input,.rcc textarea{font:inherit;color:inherit}
.rcc .snowfield{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.rcc .flake{position:absolute;top:-12px;background:#fff;border-radius:50%;opacity:.75;animation:rcc-fall linear infinite}
@keyframes rcc-fall{to{transform:translate(24px,115vh)}}
.rcc .scroll{position:relative;z-index:1;height:100%;overflow-y:auto;padding:max(env(safe-area-inset-top),14px) 16px 48px}
.rcc h1,.rcc h2,.rcc .serif{font-family:"Songti SC","STSong","Noto Serif SC","SimSun",serif;font-weight:700;margin:0}
.rcc h2{font-size:20px}
.rcc .bar{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.rcc .back{background:none;border:0;color:var(--lamp);padding:6px 4px;font-size:15px}
.rcc .hint{opacity:.8;font-size:13px;margin:6px 0 12px}
.rcc .center{text-align:center;margin:14px 0}
.rcc .cabin{display:block;width:100%;max-width:360px;margin:0 auto}
.rcc .win{animation:rcc-glow 3.2s ease-in-out infinite alternate}
@keyframes rcc-glow{from{opacity:.78}to{opacity:1;filter:drop-shadow(0 0 8px #f4b860)}}
.rcc .home-t{text-align:center;font-size:26px;margin-top:4px;letter-spacing:2px}
.rcc .home-s{text-align:center;opacity:.8;font-size:13px;margin:2px 0 18px}
.rcc .tag{position:relative;display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;margin:0 0 10px;padding:13px 16px 13px 34px;background:#8a6240;color:#fbeed6;border-radius:3px 14px 14px 3px;clip-path:polygon(16px 0,100% 0,100% 100%,16px 100%,0 50%)}
.rcc .tag::before{content:"";position:absolute;left:12px;top:50%;width:7px;height:7px;margin-top:-3px;border-radius:50%;background:#12313a}
.rcc .tag:nth-child(2){background:#a8404f}
.rcc .tag:nth-child(3){background:#35684f}
.rcc .tag:nth-child(4){background:#3d5670}
.rcc .tag .em{font-size:26px}
.rcc .tag b{display:block;font-family:"Songti SC","STSong",serif;font-size:17px}
.rcc .tag small{opacity:.85}
.rcc .chips{display:flex;gap:10px;overflow-x:auto;padding:4px 2px 8px}
.rcc .chip{flex:0 0 auto;width:62px;text-align:center;background:none;border:0;padding:0;opacity:.6}
.rcc .chip.on{opacity:1}
.rcc .chip .av{width:46px;height:46px;margin:0 auto 2px;border-radius:50%;background:#2b5a4a;display:grid;place-items:center;overflow:hidden;border:2px solid transparent}
.rcc .chip.on .av{border-color:var(--lamp)}
.rcc .chip img{width:100%;height:100%;object-fit:cover}
.rcc .chip span{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rcc .btn{background:var(--lamp);color:#3a2408;border:0;border-radius:999px;padding:10px 24px;font-weight:700}
.rcc .btn.ghost{background:transparent;color:var(--snow);border:1px solid rgba(255,255,255,.4);font-weight:400}
.rcc .btn.sm{padding:6px 14px;font-size:13px}
.rcc .cert{position:relative;margin-top:14px;padding:24px 20px 30px;background:#f7efd8;color:var(--ink);border:3px double #a07a3a;outline:2px solid var(--berry);outline-offset:-11px}
.rcc .cert h2{text-align:center;font-size:19px;color:#7d2230}
.rcc .cert .to{text-align:center;margin:8px 0 12px;font-size:13px}
.rcc .cert .it{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px dashed #c9b27a}
.rcc .cert .st{color:#c8872a;letter-spacing:2px;white-space:nowrap}
.rcc .cert .vd{margin:14px 0 6px;white-space:pre-wrap}
.rcc .cert .sg{text-align:right;font-size:13px;margin-right:64px;margin-top:10px}
.rcc .seal{position:absolute;right:16px;bottom:14px;width:62px;height:62px;border-radius:50%;background:var(--berry);color:#fff;display:grid;place-items:center;text-align:center;font-size:12px;line-height:1.2;transform:rotate(-12deg);box-shadow:0 0 0 3px #f7efd8,0 0 0 5px var(--berry)}
.rcc .stage{height:210px;position:relative;margin:10px auto 0;width:170px}
.rcc .box{position:absolute;left:15px;bottom:6px;width:140px;height:96px;background:linear-gradient(90deg,transparent 45%,#f4b860 45% 55%,transparent 55%),#b8394f;border-radius:4px}
.rcc .lid{position:absolute;left:5px;bottom:92px;width:150px;height:30px;background:linear-gradient(90deg,transparent 45%,#f4b860 45% 55%,transparent 55%),#9c2f43;border-radius:4px;transform-origin:left bottom}
.rcc .lid.open{animation:rcc-lid .7s ease-out forwards}
@keyframes rcc-lid{to{transform:translate(-14px,-44px) rotate(-24deg)}}
.rcc .gem{position:absolute;left:0;right:0;bottom:70px;text-align:center;font-size:58px;opacity:0;animation:rcc-pop .8s .35s ease-out forwards}
@keyframes rcc-pop{from{transform:translateY(40px) scale(.4);opacity:0}to{transform:translateY(-30px) scale(1);opacity:1}}
.rcc .gift-card{background:rgba(255,255,255,.1);border-left:4px solid var(--lamp);padding:12px 14px;margin-top:8px}
.rcc .gift-card b{font-family:"Songti SC","STSong",serif;font-size:18px}
.rcc .gift-card img{display:block;max-width:100%;margin-top:10px;border-radius:6px}
.rcc .tabs{display:flex;gap:6px;margin-bottom:12px}
.rcc .tabs button{flex:1;padding:8px;border:0;border-bottom:3px solid transparent;background:none;opacity:.6}
.rcc .tabs button.on{opacity:1;border-color:var(--lamp)}
.rcc .tree{display:block;width:190px;margin:0 auto}
.rcc .row{display:flex;gap:8px;margin:10px 0}
.rcc .in{flex:1;min-width:0;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:9px 12px}
.rcc ul.wl{list-style:none;padding:0;margin:8px 0}
.rcc ul.wl li{padding:6px 0;border-bottom:1px solid rgba(255,255,255,.12)}
.rcc .paper{position:relative;background:repeating-linear-gradient(#ead8b0 0 29px,#d6bf8c 29px 30px);color:var(--ink);padding:10px 18px 14px;line-height:30px;font-family:"KaiTi","STKaiti","Kaiti SC",serif;font-size:17px;white-space:pre-wrap;min-height:150px;box-shadow:0 4px 14px rgba(0,0,0,.35)}
.rcc textarea.paper{width:100%;border:0;resize:none;outline:none;display:block;height:200px}
.rcc .stamp{position:absolute;top:10px;right:12px;width:42px;height:50px;border:2px dashed var(--berry);background:#f7efd8;display:grid;place-items:center;font-size:22px;line-height:1}
.rcc .pm{position:absolute;top:18px;right:42px;width:62px;height:62px;border:2px solid rgba(60,40,20,.45);border-radius:50%;display:grid;place-items:center;text-align:center;font:10px/1.2 sans-serif;color:rgba(60,40,20,.6);transform:rotate(-14deg)}
.rcc .lt{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.14)}
.rcc .lt small{opacity:.75}
.rcc .pair{display:flex;align-items:center;justify-content:center;gap:10px;padding:8px 0;font-size:16px}
.rcc .scene{background:rgba(255,255,255,.1);border-left:4px solid var(--berry);padding:12px 14px;margin-top:12px;white-space:pre-wrap}
.rcc .loading{position:absolute;inset:0;z-index:5;background:rgba(8,20,30,.72);display:grid;place-items:center;text-align:center}
.rcc .loading i{display:block;font-style:normal;font-size:34px;color:var(--lamp);animation:rcc-spin 2.4s linear infinite}
@keyframes rcc-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.rcc .flake,.rcc .win,.rcc .loading i{animation:none}.rcc .flake{display:none}}
`;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function nm(c) { return (c && (c.handle || c.name)) || "TA"; }
  function uid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random(); }
  function fmt(ts) { return new Date(ts).toLocaleDateString("zh-CN", { month: "long", day: "numeric" }); }
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
    do { b = a.slice().sort(function () { return Math.random() - 0.5; }); }
    while (b.some(function (x, i) { return x === a[i]; }));
    return b;
  }

  var CABIN = '<svg class="cabin" viewBox="0 0 320 170" aria-hidden="true">' +
    '<ellipse cx="160" cy="158" rx="170" ry="26" fill="#e8f0ef"/>' +
    '<g fill="#164032"><polygon points="36,152 56,92 76,152"/><polygon points="246,154 270,80 294,154"/></g>' +
    '<rect x="104" y="94" width="112" height="60" fill="#7a5233"/>' +
    '<rect x="192" y="52" width="14" height="28" fill="#4a2f1b"/>' +
    '<polygon points="92,98 160,52 228,98" fill="#5b3a22"/>' +
    '<polygon points="92,98 160,52 228,98 216,98 160,64 104,98" fill="#f1f5f4"/>' +
    '<rect class="win" x="124" y="110" width="30" height="26" rx="2" fill="#f4b860"/>' +
    '<path d="M139 110v26M124 123h30" stroke="#5b3a22" stroke-width="2"/>' +
    '<rect x="170" y="114" width="26" height="40" rx="2" fill="#3f2816"/>' +
    '<circle cx="190" cy="136" r="2" fill="#f4b860"/></svg>';

  var SPOTS = [[100, 62], [78, 100], [124, 106], [60, 142], [100, 134], [140, 144], [50, 160], [90, 162], [130, 164], [112, 78], [88, 78], [150, 160]];
  var COLORS = ["#b8394f", "#f4b860", "#7fb7d8", "#e8f0ef"];
  function treeSvg(n) {
    var o = "";
    for (var i = 0; i < Math.min(n, 12); i++) {
      o += '<circle cx="' + SPOTS[i][0] + '" cy="' + SPOTS[i][1] + '" r="5" fill="' + COLORS[i % 4] + '"/>';
    }
    return '<svg class="tree" viewBox="0 0 200 190" aria-hidden="true">' +
      '<rect x="92" y="168" width="16" height="20" fill="#5b3a22"/>' +
      '<polygon points="100,22 150,82 50,82" fill="#2d6a4f"/><polygon points="100,50 164,124 36,124" fill="#27795a"/>' +
      '<polygon points="100,86 176,172 24,172" fill="#2d6a4f"/>' +
      '<text x="100" y="24" text-anchor="middle" font-size="22" fill="#f4b860">★</text>' + o + '</svg>';
  }

  window.RochePlugin.register({
    id: "christmas-cabin",
    name: "圣诞小屋",
    version: "1.0.0",
    apps: [
      {
        id: "christmas-cabin-home",
        name: "圣诞小屋",
        icon: "redeem",
        iconImage: "",

        async mount(container, roche) {
          var st = {
            view: "home", chars: [], user: null, sel: null, multi: [],
            busy: false, busyMsg: "", gift: null, giftHist: [], cert: null,
            tab: "wish", wishText: "", letterText: "", testReveal: false,
            wishes: [], letters: [], wishReply: null, openId: null,
            draw: null, scene: ""
          };

          var styleEl = document.createElement("style");
          styleEl.id = STYLE_ID;
          styleEl.textContent = CSS;
          document.head.appendChild(styleEl);

          var flakes = "";
          for (var i = 0; i < 26; i++) {
            var s = 2 + Math.random() * 3;
            flakes += '<i class="flake" style="left:' + (Math.random() * 100).toFixed(1) + '%;width:' + s.toFixed(1) +
              'px;height:' + s.toFixed(1) + 'px;animation-duration:' + (7 + Math.random() * 9).toFixed(1) +
              's;animation-delay:-' + (Math.random() * 12).toFixed(1) + 's"></i>';
          }
          container.innerHTML = '<div class="rcc"><div class="snowfield">' + flakes + '</div><div class="scroll"></div></div>';
          var root = container.querySelector(".rcc");
          var view = container.querySelector(".scroll");

          // ---------- 数据读取 ----------
          try { st.chars = (await roche.character.list()) || []; } catch (e) { st.chars = []; }
          try { st.user = await roche.persona.getActiveUserPersona(); } catch (e) { st.user = null; }
          st.sel = st.chars[0] ? st.chars[0].id : null;
          st.wishes = (await roche.storage.get("wishes")) || [];
          st.letters = (await roche.storage.get("letters")) || [];
          st.wishReply = (await roche.storage.get("wishReply")) || null;

          function curChar() { return st.chars.filter(function (c) { return c.id === st.sel; })[0] || null; }
          function charById(id) { return st.chars.filter(function (c) { return c.id === id; })[0] || null; }
          function userName() { return (st.user && (st.user.handle || st.user.name)) || "你"; }

          async function likes(c) {
            if (!c || !c.conversationId) return "";
            try {
              var m = await roche.memory.getLongTerm({ conversationId: c.conversationId, limit: 60 });
              var lines = [];
              if (m.core && m.core.summary) lines = lines.concat(String(m.core.summary).split(/\n|。/));
              (m.facts || []).forEach(function (f) { lines.push(f.summaryText || f.action || f.text || ""); });
              return lines.map(function (x) { return String(x).trim(); })
                .filter(function (x) { return x && x.length < 120 && !NEG.test(x); })
                .slice(0, 30).join("\n");
            } catch (e) { return ""; }
          }

          function sysFor(c, likeText) {
            var u = st.user || {};
            return "你是" + (c.name || nm(c)) + "（昵称" + nm(c) + "），请完全以这个角色的口吻和性格说话。\n" +
              "【角色人设】\n" + String(c.persona || c.bio || "").slice(0, 1200) + "\n" +
              "【对方】" + userName() + (u.persona ? "：" + String(u.persona).slice(0, 400) : "") + "\n" +
              "【你对对方已有的了解（只含喜好）】\n" + (likeText || "（暂无，请根据人设合理推测）") + "\n" +
              "【硬性规则】只使用对方的喜好和愉快的话题；绝不提及疼痛、疾病、不适、负面经历或让人难过的事；" +
              "不要出现“记忆”“系统”“AI”等字样；不要写多余的说明。";
          }

          async function ask(system, user, json) {
            var r = await roche.ai.chat({
              messages: [{ role: "system", content: system }, { role: "user", content: user }],
              temperature: 0.9
            });
            var t = String((r && (r.text || r.content)) || "").trim();
            if (!json) return t;
            var m = t.match(/\{[\s\S]*\}/);
            if (!m) throw new Error("返回的格式不对，再试一次");
            return JSON.parse(m[0]);
          }

          async function busy(msg, fn) {
            if (st.busy) return;
            st.busy = true; st.busyMsg = msg; render();
            try { await fn(); } catch (e) { roche.ui.toast("出错了：" + (e && e.message || e)); }
            st.busy = false; render();
          }

          // ---------- 视图 ----------
          function bar(t) {
            return '<div class="bar"><button class="back" data-act="back">‹ 返回</button><h2>' + esc(t) + '</h2></div>';
          }

          function chipHtml(c, on, act) {
            var av = c.avatar ? '<img src="' + esc(c.avatar) + '" alt="">' : esc(nm(c).slice(0, 1));
            return '<button class="chip' + (on ? " on" : "") + '" data-act="' + act + '" data-id="' + esc(c.id) +
              '"><div class="av">' + av + '</div><span>' + esc(nm(c)) + '</span></button>';
          }
          function picker(multi) {
            if (!st.chars.length) return '<p class="hint">还没有角色，请先在 Roche 里创建一个角色。</p>';
            return '<div class="chips">' + st.chars.map(function (c) {
              return multi ? chipHtml(c, st.multi.indexOf(c.id) > -1, "toggle") : chipHtml(c, c.id === st.sel, "pick");
            }).join("") + '</div>';
          }

          function daysLine() {
            var n = new Date(), y = n.getFullYear();
            var d = Math.ceil((new Date(y, 11, 24) - new Date(y, n.getMonth(), n.getDate())) / 86400000);
            if (d > 0) return "距离平安夜还有 " + d + " 天";
            if (d === 0) return "今天是平安夜";
            return n.getMonth() === 11 && n.getDate() <= 25 ? "圣诞快乐" : "明年圣诞见";
          }

          function vHome() {
            function t(v, em, b, s) {
              return '<button class="tag" data-act="go" data-v="' + v + '"><span class="em">' + em + '</span><span><b>' + b + '</b><small>' + s + '</small></span></button>';
            }
            return CABIN + '<h1 class="home-t">圣诞小屋</h1><div class="home-s">' + daysLine() + '</div>' +
              t("cert", "📜", "好孩子名单", "让 TA 扮圣诞老人，给你一份鉴定报告") +
              t("gift", "🎁", "礼物盲盒", "TA 根据对你的了解，挑一份礼物") +
              t("mail", "💌", "圣诞信箱", "许愿树和写给圣诞老人的信") +
              t("santa", "🎅", "神秘圣诞老人", "几个角色抽签交换礼物") +
              '<div class="center"><button class="btn ghost sm" data-act="exit">离开小屋</button></div>';
          }

          function vCert() {
            var c = curChar();
            var h = bar("好孩子名单") + picker(false) +
              '<p class="hint">让 ' + esc(nm(c)) + ' 扮成圣诞老人，给你出一份鉴定报告。</p>' +
              '<div class="center"><button class="btn" data-act="makeCert">' + (st.cert ? "重新鉴定" : "开始鉴定") + '</button></div>';
            if (st.cert) {
              var k = st.cert;
              h += '<div class="cert"><h2>' + esc(k.title) + '</h2><div class="to">授予：' + esc(userName()) + '</div>' +
                k.items.map(function (it) {
                  var n = Math.max(1, Math.min(5, +it.stars || 5));
                  return '<div class="it"><span>' + esc(it.label) + '</span><span class="st">' + "★".repeat(n) + "☆".repeat(5 - n) + '</span></div>';
                }).join("") +
                '<div class="vd">' + esc(k.verdict) + '</div>' +
                (k.note ? '<div class="vd" style="font-style:italic">“' + esc(k.note) + '”</div>' : "") +
                '<div class="sg">圣诞老人（' + esc(k.who) + '）</div>' +
                '<div class="seal">已核验<br>' + new Date().getFullYear() + '</div></div>';
            }
            return h;
          }

          function vGift() {
            var c = curChar(), g = st.gift;
            var h = bar("礼物盲盒") + picker(false) +
              '<p class="hint">' + esc(nm(c)) + ' 会根据对你的了解挑礼物。</p>';
            h += '<div class="stage"><div class="box"></div><div class="lid' + (g ? " open" : "") + '"></div>' +
              (g ? '<div class="gem">' + esc(g.emoji) + '</div>' : "") + '</div>';
            h += '<div class="center"><button class="btn" data-act="openGift">' + (g ? "换一个" : "拆开盲盒") + '</button></div>';
            if (g) {
              h += '<div class="gift-card"><b>' + esc(g.name) + '</b><p style="margin:6px 0 0;white-space:pre-wrap">' + esc(g.reason) + '</p>' +
                (g.img ? '<img src="' + esc(g.img) + '" alt="">' : "") + '</div>' +
                '<div class="center"><button class="btn ghost sm" data-act="giftImg">生成礼物图（消耗额度，可选）</button></div>';
            }
            return h;
          }

          function revealed(w) { return st.testReveal || Date.now() >= new Date(w.year, 11, 25).getTime(); }

          function vMail() {
            var h = bar("圣诞信箱") + '<div class="tabs"><button class="' + (st.tab === "wish" ? "on" : "") +
              '" data-act="tab" data-t="wish">许愿树</button><button class="' + (st.tab === "letter" ? "on" : "") +
              '" data-act="tab" data-t="letter">写信</button></div>';
            if (st.tab === "wish") {
              var any = st.wishes.length && st.wishes.every(revealed);
              h += treeSvg(st.wishes.length) +
                '<div class="row"><input class="in" data-in="wishText" maxlength="60" placeholder="写下一个圣诞愿望" value="' + esc(st.wishText) + '">' +
                '<button class="btn sm" data-act="addWish">挂上树</button></div>' +
                '<p class="hint">愿望会一直保密，12 月 25 日才揭晓，由 TA 回应。</p>' +
                '<ul class="wl">' + (st.wishes.length ? st.wishes.map(function (w) {
                  return '<li>' + (revealed(w) ? "✨ " : "🔒 ") + esc(w.text) + '</li>';
                }).join("") : '<li style="opacity:.7">树上还空着，挂上第一个愿望吧。</li>') + '</ul>' +
                '<div class="center"><button class="btn ghost sm" data-act="testReveal">测试：' + (st.testReveal ? "关闭" : "提前") + '揭晓</button></div>';
              if (any) {
                h += picker(false) + '<div class="center"><button class="btn" data-act="replyWish">请 ' + esc(nm(curChar())) + ' 回应愿望</button></div>';
              }
              if (st.wishReply) {
                h += '<div class="paper" style="min-height:0">' + esc(st.wishReply.text) + '<div style="text-align:right">—— ' + esc(st.wishReply.who) + '</div></div>';
              }
            } else {
              h += picker(false) +
                '<div class="paper" style="padding-bottom:0"><div class="stamp">🎄</div>' +
                '<textarea class="paper" data-in="letterText" placeholder="亲爱的圣诞老人……" style="box-shadow:none;background:transparent;padding:0;margin-top:34px">' + esc(st.letterText) + '</textarea></div>' +
                '<div class="center"><button class="btn" data-act="sendLetter">投进信箱</button></div>' +
                '<p class="hint">回信会在第二天早上 9 点送到。</p>' +
                (st.letters.length ? st.letters.slice().reverse().map(function (l) {
                  var ready = Date.now() >= l.replyAt;
                  var status = l.reply ? "已读" : (ready ? "回信到了" : fmt(l.replyAt) + " 送达");
                  return '<div class="lt"><span>给 ' + esc(l.charName) + '<br><small>' + fmt(l.sentAt) + ' 寄出 · ' + status + '</small></span>' +
                    (l.reply || ready ? '<button class="btn sm" data-act="openLetter" data-id="' + esc(l.id) + '">' + (l.reply ? "再看看" : "拆信") + '</button>'
                      : '<button class="btn ghost sm" data-act="skipWait" data-id="' + esc(l.id) + '">测试：提前送达</button>') + '</div>';
                }).join("") : "");
            }
            return h;
          }

          function vLetter() {
            var l = st.letters.filter(function (x) { return x.id === st.openId; })[0];
            if (!l) return bar("回信") + '<p class="hint">找不到这封信。</p>';
            return bar("回信") + '<div class="paper"><div class="stamp">🎅</div><div class="pm">北极邮局<br>' + fmt(l.replyAt) + '</div><div style="margin-top:34px">' +
              esc(l.reply) + '</div></div>';
          }

          function vSanta() {
            var h = bar("神秘圣诞老人") + '<p class="hint">选 2 个以上角色，抽签决定谁送谁。</p>' + picker(true) +
              '<div class="center"><button class="btn" data-act="drawLots">' + (st.draw ? "重新抽签" : "开始抽签") + '</button></div>';
            if (st.draw) {
              h += st.draw.map(function (p) {
                return '<div class="pair"><b>' + esc(nm(charById(p.from))) + '</b> 🎁 → <b>' + esc(nm(charById(p.to))) + '</b></div>';
              }).join("") +
                '<div class="center"><button class="btn" data-act="makeScene">' + (st.scene ? "换一场" : "生成交换礼物现场") + '</button></div>';
            }
            if (st.scene) h += '<div class="scene">' + esc(st.scene) + '</div>';
            return h;
          }

          function render() {
            var body = { home: vHome, cert: vCert, gift: vGift, mail: vMail, letter: vLetter, santa: vSanta }[st.view]();
            view.innerHTML = body;
            var old = root.querySelector(".loading");
            if (old) old.remove();
            if (st.busy) {
              root.insertAdjacentHTML("beforeend", '<div class="loading"><div><i>✦</i><p>' + esc(st.busyMsg) + '</p></div></div>');
            }
          }
          function go(v) { st.view = v; st.cert = null; st.gift = null; st.scene = ""; render(); view.scrollTop = 0; }

          // ---------- 事件 ----------
          async function onClick(e) {
            var el = e.target.closest("[data-act]");
            if (!el || st.busy) return;
            var act = el.dataset.act, id = el.dataset.id;
            var c = curChar();

            if (act === "exit") return roche.ui.closeApp();
            if (act === "back") return st.view === "home" ? roche.ui.closeApp() : (st.view === "letter" ? (st.view = "mail", render()) : go("home"));
            if (act === "go") return go(el.dataset.v);
            if (act === "pick") { st.sel = id; st.cert = null; st.gift = null; return render(); }
            if (act === "toggle") {
              var i = st.multi.indexOf(id);
              if (i > -1) st.multi.splice(i, 1); else st.multi.push(id);
              st.draw = null; st.scene = ""; return render();
            }
            if (act === "tab") { st.tab = el.dataset.t; return render(); }
            if (act === "testReveal") { st.testReveal = !st.testReveal; return render(); }

            if (act === "makeCert") {
              if (!c) return roche.ui.toast("请先选一个角色");
              return busy("圣诞老人在翻小本本……", async function () {
                var l = await likes(c);
                var k = await ask(sysFor(c, l),
                  "现在是圣诞节前夕，你扮演圣诞老人，为对方出具一份「年度好孩子鉴定报告」。只输出 JSON：" +
                  '{"title":"报告标题","items":[{"label":"评分项，共4项，有趣且贴合对方的喜好，不要负面","stars":5}],"verdict":"总评，60-100字，用你的口吻","note":"一句悄悄话，20字内"}', true);
                if (!k.items || !k.items.length) throw new Error("报告内容不完整，再试一次");
                k.title = k.title || (new Date().getFullYear() + " 年度好孩子鉴定报告");
                k.who = nm(c);
                st.cert = k;
              });
            }

            if (act === "openGift") {
              if (!c) return roche.ui.toast("请先选一个角色");
              return busy("TA 正在挑礼物……", async function () {
                var l = await likes(c);
                var g = await ask(sysFor(c, l),
                  "你扮演圣诞老人，根据你对对方的了解挑一份圣诞礼物。不要与这些重复：" + (st.giftHist.join("、") || "无") +
                  '。只输出 JSON：{"emoji":"一个 emoji","name":"礼物名","reason":"用你的口吻说挑选理由，50-90字","image":"礼物的英文生图提示词，一句话"}', true);
                st.giftHist.push(g.name);
                st.gift = g;
              });
            }
            if (act === "giftImg") {
              if (!st.gift) return;
              var ok = await roche.ui.confirm({ title: "生成礼物图", message: "生图会消耗你的生图额度，确定要生成吗？" });
              if (!ok) return;
              return busy("正在画礼物……", async function () {
                var r = await roche.ai.generateImage({ prompt: "cute christmas gift illustration, " + (st.gift.image || st.gift.name) + ", soft warm light, no text" });
                var src = imgSrc(r);
                if (!src) throw new Error("没有拿到图片，请检查生图设置");
                st.gift.img = src;
              });
            }

            if (act === "addWish") {
              var t = st.wishText.trim();
              if (!t) return roche.ui.toast("先写下愿望");
              st.wishes.push({ id: uid(), text: t, year: new Date().getFullYear(), at: Date.now() });
              st.wishText = "";
              await roche.storage.set("wishes", st.wishes);
              roche.ui.toast("愿望已挂上树");
              return render();
            }
            if (act === "replyWish") {
              if (!c) return;
              return busy("TA 在读愿望……", async function () {
                var l = await likes(c);
                var txt = await ask(sysFor(c, l),
                  "你扮演圣诞老人，12 月 25 日到了，对方挂在许愿树上的愿望如下：\n" +
                  st.wishes.map(function (w, i) { return (i + 1) + ". " + w.text; }).join("\n") +
                  "\n请逐条温暖地回应，可以说会努力帮忙实现，总共 150-250 字，直接输出正文。", false);
                st.wishReply = { text: txt, who: nm(c), at: Date.now() };
                await roche.storage.set("wishReply", st.wishReply);
              });
            }

            if (act === "sendLetter") {
              var lt = st.letterText.trim();
              if (!c) return roche.ui.toast("请先选一个收信角色");
              if (!lt) return roche.ui.toast("信还是空的");
              var d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
              st.letters.push({ id: uid(), charId: c.id, charName: nm(c), text: lt, sentAt: Date.now(), replyAt: d.getTime(), reply: null });
              st.letterText = "";
              await roche.storage.set("letters", st.letters);
              roche.ui.toast("信已投进信箱");
              return render();
            }
            if (act === "skipWait") {
              st.letters.forEach(function (x) { if (x.id === id) x.replyAt = Date.now(); });
              await roche.storage.set("letters", st.letters);
              return render();
            }
            if (act === "openLetter") {
              var L = st.letters.filter(function (x) { return x.id === id; })[0];
              if (!L) return;
              st.openId = id;
              if (L.reply) { st.view = "letter"; return render(); }
              var ch = charById(L.charId) || c;
              if (!ch) return roche.ui.toast("找不到这个角色了");
              return busy("圣诞老人在写回信……", async function () {
                var l = await likes(ch);
                L.reply = await ask(sysFor(ch, l),
                  "你扮演圣诞老人，给对方写一封手写风格的回信。对方的来信：\n" + L.text +
                  "\n回信 120-220 字，亲切温暖、有画面感，落款写圣诞老人，直接输出正文。", false);
                await roche.storage.set("letters", st.letters);
                st.view = "letter";
              });
            }

            if (act === "drawLots") {
              if (st.multi.length < 2) return roche.ui.toast("至少选 2 个角色");
              var to = derange(st.multi);
              st.draw = st.multi.map(function (f, i) { return { from: f, to: to[i] }; });
              st.scene = "";
              return render();
            }
            if (act === "makeScene") {
              return busy("大家正在拆礼物……", async function () {
                var infos = await Promise.all(st.multi.map(async function (cid) {
                  var ch = charById(cid);
                  var l = await likes(ch);
                  return "【" + nm(ch) + "】人设：" + String(ch.persona || ch.bio || "").slice(0, 300) +
                    "\n喜好：" + l.split("\n").slice(0, 8).join("；");
                }));
                var pairs = st.draw.map(function (p) { return nm(charById(p.from)) + " 送给 " + nm(charById(p.to)); }).join("；");
                st.scene = await ask("你是擅长写温馨群像小剧场的作者。参与者资料：\n" + infos.join("\n\n") +
                  "\n规则：只写愉快温馨的内容，不涉及痛苦或负面经历；不要出现“记忆”“系统”“AI”字样。",
                  "这是一场圣诞“神秘圣诞老人”交换礼物聚会。抽签结果：" + pairs +
                  "。写一段 300-500 字的小剧场：每个人拆礼物、猜送礼人，礼物要贴合收礼人的喜好，每个人的说话方式符合各自人设，气氛温馨好笑。直接输出正文。", false);
              });
            }
          }

          function onInput(e) {
            var k = e.target && e.target.dataset && e.target.dataset.in;
            if (k) st[k] = e.target.value;
          }

          container.addEventListener("click", onClick);
          container.addEventListener("input", onInput);
          cleanup = function () {
            container.removeEventListener("click", onClick);
            container.removeEventListener("input", onInput);
            var s = document.getElementById(STYLE_ID);
            if (s) s.remove();
          };

          render();
        },

        async unmount(container) {
          if (cleanup) { cleanup(); cleanup = null; }
          container.replaceChildren();
        }
      }
    ]
  });
})();
