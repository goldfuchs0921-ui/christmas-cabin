/* 圣诞小屋 v1.1.0 — Roche 全信任 JS 插件
 * 好孩子名单 / 礼物盲盒 / 圣诞信箱 / 神秘圣诞老人
 * v1.1：统一深蓝+暖黄+雪白三色；后台生成（可退出去逛）；生成结果缓存；可选流式显示
 * 数据只存在 roche.storage（key: data / wishes / letters / wishReply / stream），不写入 Roche 主记忆
 */
(function () {
  "use strict";

  var cleanup = null;
  var STYLE_ID = "rcc-style";
  var NEG = /疼|痛|牙|蛀|病|死|哭|伤|难过|焦虑|抑郁|失眠|吵架|分手|医院|药|害怕|崩溃|生气|讨厌|孤独|压力|委屈|噩梦|自杀|累/;

  var CSS = `
.rcc{--bg0:#0a1522;--bg1:#10253a;--lamp:#f4b860;--snow:#eef2f1;--mute:rgba(238,242,241,.62);--line:rgba(238,242,241,.14);position:relative;height:100%;overflow:hidden;background:linear-gradient(#0a1522,#10253a);color:var(--snow);font:15px/1.7 -apple-system,"PingFang SC","Noto Sans SC",sans-serif}
.rcc *{box-sizing:border-box}
.rcc button,.rcc input,.rcc textarea{font:inherit;color:inherit}
.rcc .snowfield{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.rcc .flake{position:absolute;top:-12px;background:#fff;border-radius:50%;opacity:.7;animation:rcc-fall linear infinite}
@keyframes rcc-fall{to{transform:translate(24px,115vh)}}
.rcc .scroll{position:relative;z-index:1;height:100%;overflow-y:auto;padding:max(env(safe-area-inset-top),14px) 20px 56px}
.rcc .en{font-family:"Iowan Old Style","Palatino","Songti SC","STSong","Noto Serif SC",Georgia,serif;font-style:italic;font-weight:400;letter-spacing:.02em}
.rcc .zh{font-size:12px;letter-spacing:.42em;color:var(--mute)}
.rcc .top{height:34px}
.rcc .back{background:none;border:0;color:var(--lamp);font-size:30px;line-height:1;padding:0 8px 0 0}
.rcc .hd{margin:2px 0 18px}
.rcc .hd .en{font-size:30px;line-height:1.2}
.rcc .hint{color:var(--mute);font-size:13px;margin:8px 0 14px}
.rcc .center{text-align:center;margin:18px 0}
.rcc .cabin{display:block;width:100%;max-width:360px;margin:0 auto}
.rcc .win{animation:rcc-glow 3.2s ease-in-out infinite alternate}
@keyframes rcc-glow{from{opacity:.78}to{opacity:1;filter:drop-shadow(0 0 8px #f4b860)}}
.rcc .home-t{text-align:center;font-size:30px;margin-top:6px}
.rcc .home-s{text-align:center;color:var(--mute);font-size:12px;letter-spacing:.2em;margin:4px 0 22px}
.rcc .item{display:flex;justify-content:space-between;align-items:center;width:100%;padding:16px 2px;background:none;border:0;border-top:1px solid var(--line);text-align:left}
.rcc .item:last-of-type{border-bottom:1px solid var(--line)}
.rcc .item .en{display:block;font-size:22px;line-height:1.3}
.rcc .item small{display:block;color:var(--mute);font-size:12px;line-height:1.6}
.rcc .item .zh{margin-top:1px}
.rcc .item .go{color:var(--lamp);font-size:22px;display:flex;align-items:center;gap:8px;font-style:normal}
.rcc .dot{width:8px;height:8px;border-radius:50%;background:var(--lamp);box-shadow:0 0 8px var(--lamp)}
.rcc .busy{color:var(--lamp);font-size:11px;letter-spacing:.1em}
.rcc .link{background:none;border:0;color:var(--mute);font-size:12px;padding:6px 10px;text-decoration:underline;text-underline-offset:3px}
.rcc .chips{display:flex;gap:12px;overflow-x:auto;padding:4px 2px 10px}
.rcc .chip{flex:0 0 auto;width:68px;text-align:center;background:none;border:0;padding:0}
.rcc .chip .av{width:56px;height:56px;margin:0 auto 4px;border-radius:50%;background:var(--bg1);display:grid;place-items:center;overflow:hidden;opacity:.5;filter:grayscale(.5);transition:.2s}
.rcc .chip.on .av{opacity:1;filter:none;box-shadow:0 0 0 2px var(--lamp)}
.rcc .chip img{width:100%;height:100%;object-fit:cover}
.rcc .chip span{display:block;font-size:12px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rcc .chip.on span{color:var(--snow)}
.rcc .btn{background:transparent;color:var(--lamp);border:1px solid var(--lamp);border-radius:999px;padding:10px 28px;letter-spacing:.16em}
.rcc .btn.fill{background:var(--lamp);color:#1a1205;font-weight:600}
.rcc .btn.sm{padding:6px 16px;font-size:13px;letter-spacing:.08em}
.rcc .btn[disabled]{opacity:.45}
.rcc .wait{display:flex;gap:10px;align-items:center;margin:16px 0;color:var(--mute);font-size:13px}
.rcc .wait i{flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:var(--lamp);animation:rcc-pulse 1.2s ease-in-out infinite}
@keyframes rcc-pulse{50%{opacity:.25;transform:scale(.6)}}
.rcc .cert{position:relative;margin-top:18px;padding:28px 22px 32px;background:linear-gradient(#0f1f33,#0b1828);border:1px solid rgba(244,184,96,.5)}
.rcc .cert::after{content:"";position:absolute;inset:6px;border:1px solid rgba(244,184,96,.2);pointer-events:none}
.rcc .cert h2{margin:0;text-align:center;font-size:20px;color:var(--lamp);font-weight:400}
.rcc .cert .to{text-align:center;color:var(--mute);font-size:12px;letter-spacing:.3em;margin:8px 0 14px}
.rcc .cert .it{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)}
.rcc .cert .st{color:var(--lamp);letter-spacing:3px;white-space:nowrap}
.rcc .cert .vd{margin:16px 0 4px;white-space:pre-wrap}
.rcc .cert .sg{text-align:right;color:var(--mute);font-size:13px;margin:12px 70px 0 0}
.rcc .seal{position:absolute;right:20px;bottom:18px;width:56px;height:56px;border-radius:50%;border:1px solid var(--lamp);color:var(--lamp);display:grid;place-items:center;text-align:center;font-size:11px;line-height:1.3;letter-spacing:.1em;transform:rotate(-10deg)}
.rcc .stage{position:relative;width:180px;height:170px;margin:6px auto 0}
.rcc .stage svg{position:relative;width:100%;height:100%}
.rcc .stage .glow{position:absolute;left:50%;top:10px;width:170px;height:170px;margin-left:-85px;background:radial-gradient(circle,rgba(244,184,96,.5),transparent 65%);opacity:0}
.rcc .stage.on .glow{opacity:1}
.rcc .stage.go .glow{animation:rcc-gl .9s .25s ease-out forwards}
@keyframes rcc-gl{from{opacity:0}to{opacity:1}}
.rcc .lid{transform-box:fill-box;transform-origin:left bottom}
.rcc .lid.open{transform:translate(-8px,-30px) rotate(-14deg)}
.rcc .lid.opening{animation:rcc-lid .8s ease-out forwards}
@keyframes rcc-lid{to{transform:translate(-8px,-30px) rotate(-14deg)}}
.rcc .gift{border-top:1px solid var(--line);padding-top:16px;margin-top:6px}
.rcc .gift h3{margin:0 0 6px;font-size:24px;font-weight:400;color:var(--lamp)}
.rcc .gift p{margin:0;white-space:pre-wrap}
.rcc .gift img{display:block;max-width:100%;margin-top:14px}
.rcc .tabs{display:flex;gap:22px;margin:0 0 14px;border-bottom:1px solid var(--line)}
.rcc .tabs button{padding:8px 0;border:0;border-bottom:2px solid transparent;background:none;color:var(--mute)}
.rcc .tabs button.on{color:var(--snow);border-color:var(--lamp)}
.rcc .tree{display:block;width:180px;margin:0 auto}
.rcc .row{display:flex;gap:10px;margin:12px 0}
.rcc .in{flex:1;min-width:0;background:transparent;border:0;border-bottom:1px solid var(--line);padding:8px 2px;outline:none}
.rcc .in:focus{border-color:var(--lamp)}
.rcc ul.wl{list-style:none;padding:0;margin:8px 0}
.rcc ul.wl li{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--line)}
.rcc ul.wl small{color:var(--mute);white-space:nowrap}
.rcc .paper{position:relative;background:#ece7da;color:#1b2430;padding:16px 20px;line-height:1.95;font-family:"KaiTi","STKaiti","Kaiti SC",serif;font-size:16px;white-space:pre-wrap;min-height:150px}
.rcc textarea.paper{display:block;width:100%;height:210px;border:0;outline:none;resize:none;padding-top:44px}
.rcc .stamp{position:absolute;top:12px;right:14px;width:34px;height:42px;border:1px dashed #1b2430;opacity:.45;display:grid;place-items:center;font-size:14px;pointer-events:none}
.rcc .pm{position:absolute;top:16px;right:46px;width:58px;height:58px;border:1px solid rgba(27,36,48,.4);border-radius:50%;display:grid;place-items:center;text-align:center;font:10px/1.25 sans-serif;color:rgba(27,36,48,.55);transform:rotate(-14deg);pointer-events:none}
.rcc .lt{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 0;border-bottom:1px solid var(--line)}
.rcc .lt small{display:block;color:var(--mute)}
.rcc .pair{display:flex;align-items:baseline;justify-content:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);font-size:19px}
.rcc .pair b{font-weight:400}
.rcc .pair em{color:var(--lamp);font-style:normal}
.rcc .scene{border-left:2px solid var(--lamp);padding:4px 0 4px 14px;margin-top:18px;white-space:pre-wrap}
@media (prefers-reduced-motion:reduce){.rcc .flake{display:none}.rcc .win,.rcc .wait i{animation:none}}
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
  function treeSvg(n) {
    var o = "";
    for (var i = 0; i < Math.min(n, 12); i++) {
      o += '<circle cx="' + SPOTS[i][0] + '" cy="' + SPOTS[i][1] + '" r="4.5" fill="' + (i % 2 ? "#eef2f1" : "#f4b860") + '"/>';
    }
    return '<svg class="tree" viewBox="0 0 200 190" aria-hidden="true"><g fill="none" stroke="#eef2f1" stroke-width="1.2" stroke-linejoin="round">' +
      '<polygon points="100,22 150,82 50,82"/><polygon points="100,50 164,124 36,124"/><polygon points="100,86 176,172 24,172"/>' +
      '<path d="M100 172v16"/></g><text x="100" y="21" text-anchor="middle" font-size="20" fill="#f4b860">★</text>' + o + '</svg>';
  }
  function giftSvg() {
    return '<svg viewBox="0 0 160 140" aria-hidden="true"><g fill="#10253a" stroke="#eef2f1" stroke-width="1.2">' +
      '<rect x="22" y="62" width="116" height="66"/><rect x="74" y="62" width="12" height="66" fill="#f4b860" stroke="none"/></g>' +
      '<g class="lid" id="rcc-lid"><rect x="14" y="40" width="132" height="22" fill="#10253a" stroke="#eef2f1" stroke-width="1.2"/>' +
      '<rect x="74" y="40" width="12" height="22" fill="#f4b860"/>' +
      '<g fill="none" stroke="#f4b860" stroke-width="2"><ellipse cx="64" cy="32" rx="14" ry="8" transform="rotate(-20 64 32)"/><ellipse cx="96" cy="32" rx="14" ry="8" transform="rotate(20 96 32)"/></g></g></svg>';
  }

  window.RochePlugin.register({
    id: "christmas-cabin",
    name: "圣诞小屋",
    version: "1.1.0",
    apps: [
      {
        id: "christmas-cabin-home",
        name: "圣诞小屋",
        icon: "redeem",
        iconImage: "",

        async mount(container, roche) {
          var st = {
            view: "home", chars: [], user: null, sel: null, multi: [],
            jobs: {}, live: {}, anim: null, stream: false, d: null,
            tab: "wish", wishText: "", letterText: "", testReveal: false,
            wishes: [], letters: [], wishReply: null, openId: null
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
          var view = container.querySelector(".scroll");

          // ---------- 读数据 ----------
          try { st.chars = (await roche.character.list()) || []; } catch (e) { st.chars = []; }
          try { st.user = await roche.persona.getActiveUserPersona(); } catch (e) { st.user = null; }
          st.sel = st.chars[0] ? st.chars[0].id : null;
          st.d = (await roche.storage.get("data")) || {};
          st.d.cert = st.d.cert || {}; st.d.gift = st.d.gift || {}; st.d.ready = st.d.ready || {};
          st.stream = !!(await roche.storage.get("stream"));
          st.wishes = (await roche.storage.get("wishes")) || [];
          st.letters = (await roche.storage.get("letters")) || [];
          st.wishReply = (await roche.storage.get("wishReply")) || null;

          function save() { return roche.storage.set("data", st.d); }
          function curChar() { return st.chars.filter(function (c) { return c.id === st.sel; })[0] || null; }
          function charById(id) { return st.chars.filter(function (c) { return c.id === id; })[0] || null; }
          function userName() { return (st.user && (st.user.handle || st.user.name)) || "你"; }
          function hasJob(p) { return Object.keys(st.jobs).some(function (k) { return k.indexOf(p) === 0; }); }
          function viewKey() { return st.view === "letter" ? "mail" : st.view; }

          async function likes(c) {
            if (!c || !c.conversationId) return "";
            try {
              var m = await roche.memory.getLongTerm({ conversationId: c.conversationId, limit: 60 });
              var lines = [];
              if (m.core && m.core.summary) lines = lines.concat(String(m.core.summary).split(/\n|。/));
              (m.facts || []).forEach(function (f) { lines.push(f.summaryText || f.action || f.text || ""); });
              return lines.map(function (x) { return String(x).trim(); })
                .filter(function (x) { return x && x.length < 100 && !NEG.test(x); })
                .slice(0, 20).join("\n");
            } catch (e) { return ""; }
          }

          function sysFor(c, likeText) {
            var u = st.user || {};
            return "你是" + (c.name || nm(c)) + "（昵称" + nm(c) + "），请完全以这个角色的口吻和性格说话。\n" +
              "【角色人设】\n" + String(c.persona || c.bio || "").slice(0, 800) + "\n" +
              "【对方】" + userName() + (u.persona ? "：" + String(u.persona).slice(0, 300) : "") + "\n" +
              "【你对对方已有的了解（只含喜好）】\n" + (likeText || "（暂无，请根据人设合理推测）") + "\n" +
              "【硬性规则】只使用对方的喜好和愉快的话题；绝不提及疼痛、疾病、不适、负面经历或让人难过的事；" +
              "不要出现“记忆”“系统”“AI”等字样；不要使用 emoji；不要写多余的说明。";
          }

          // ---------- AI 调用（流式可选）----------
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
                var parts = buf.split("\n");
                buf = parts.pop();
                parts.forEach(function (line) {
                  line = line.trim();
                  if (line.indexOf("data:") !== 0) return;
                  var p = line.slice(5).trim();
                  if (!p || p === "[DONE]") return;
                  try { push(fromJson(JSON.parse(p))); } catch (e) { /* 忽略半截数据 */ }
                });
              }
              return full;
            }
            if (r && r[Symbol.asyncIterator]) {
              for await (var ck of r) push(typeof ck === "string" ? ck : fromJson(ck || {}));
              return full;
            }
            return "";
          }

          // key 只在纯文本输出时传入；传了且用户开了流式，就边生成边显示
          async function ask(system, user, json, key) {
            var o = { messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.9 };
            var t;
            if (key && st.stream) {
              o.stream = true;
              try {
                t = String(await readStream(await roche.ai.chat(o), key)).trim();
              } finally { delete st.live[key]; }
              if (!t) throw new Error("流式没有收到内容，可以在主页把流式关掉再试");
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
              if (viewKey() !== readyKey) { st.d.ready[readyKey] = true; roche.ui.toast(label + "好了"); }
              return save();
            }).catch(function (e) {
              roche.ui.toast("出错了：" + (e && e.message || e));
            }).then(function () { delete st.jobs[key]; render(); });
          }

          // ---------- 视图 ----------
          function head(en, zh) {
            return '<div class="top"><button class="back" data-act="back" aria-label="返回">‹</button></div>' +
              '<div class="hd"><div class="en">' + en + '</div><div class="zh">' + zh + '</div></div>';
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
          function wait(text) { return '<div class="wait"><i></i><span>' + text + '</span></div>'; }

          function daysLine() {
            var n = new Date(), y = n.getFullYear();
            var d = Math.ceil((new Date(y, 11, 24) - new Date(y, n.getMonth(), n.getDate())) / 86400000);
            if (d > 0) return "距 离 平 安 夜 还 有 " + d + " 天";
            if (d === 0) return "今 天 是 平 安 夜";
            return n.getMonth() === 11 && n.getDate() <= 25 ? "圣 诞 快 乐" : "明 年 圣 诞 见";
          }

          function vHome() {
            function it(v, en, zh, desc, p) {
              var right = hasJob(p) ? '<span class="busy">生成中</span>' : (st.d.ready[v] ? '<span class="dot"></span>' : "");
              return '<button class="item" data-act="go" data-v="' + v + '"><span><span class="en">' + en + '</span>' +
                '<small class="zh">' + zh + '</small><small>' + desc + '</small></span><span class="go">' + right + '›</span></button>';
            }
            return CABIN + '<div class="home-t en">Christmas Cabin</div><div class="home-s">' + daysLine() + '</div>' +
              it("cert", "Good Kids", "好 孩 子 名 单", "让 TA 扮圣诞老人，给你出一份鉴定报告", "cert:") +
              it("gift", "Gift Box", "礼 物 盲 盒", "TA 根据对你的了解，挑一份礼物", "gift:") +
              it("mail", "Mailbox", "圣 诞 信 箱", "许愿树，和写给圣诞老人的信", "mail:") +
              it("santa", "Secret Santa", "神 秘 圣 诞 老 人", "几个角色抽签交换礼物", "scene") +
              '<div class="center"><button class="link" data-act="toggleStream">文字边生成边显示：' + (st.stream ? "开" : "关") +
              '</button><button class="link" data-act="exit">离开小屋</button></div>';
          }

          function vCert() {
            var c = curChar(), k = c && st.d.cert[c.id], pend = c && st.jobs["cert:" + c.id];
            var h = head("Good Kids", "好 孩 子 名 单") + picker(false) +
              '<p class="hint">让 ' + esc(nm(c)) + ' 扮成圣诞老人，给你出一份鉴定报告。</p>' +
              '<div class="center"><button class="btn fill" data-act="makeCert"' + (pend ? " disabled" : "") + '>' +
              (pend ? "生成中" : (k ? "重新鉴定" : "开始鉴定")) + '</button></div>';
            if (pend) h += wait("圣诞老人在翻小本本，你可以先去别处逛逛");
            if (k) {
              h += '<div class="cert"><h2 class="en">' + esc(k.title) + '</h2><div class="to">授予　' + esc(userName()) + '</div>' +
                k.items.map(function (it) {
                  var n = Math.max(1, Math.min(5, +it.stars || 5));
                  return '<div class="it"><span>' + esc(it.label) + '</span><span class="st">' + "★".repeat(n) + "☆".repeat(5 - n) + '</span></div>';
                }).join("") +
                '<div class="vd">' + esc(k.verdict) + '</div>' +
                (k.note ? '<div class="vd" style="color:var(--lamp)">' + esc(k.note) + '</div>' : "") +
                '<div class="sg">圣诞老人（' + esc(k.who) + '）</div>' +
                '<div class="seal">已核验<br>' + esc(k.year || new Date().getFullYear()) + '</div></div>';
            }
            return h;
          }

          function vGift() {
            var c = curChar(), e = c && st.d.gift[c.id], g = e && e.cur;
            var pend = c && st.jobs["gift:" + c.id], pimg = c && st.jobs["img:" + c.id];
            var h = head("Gift Box", "礼 物 盲 盒") + picker(false) +
              '<p class="hint">' + esc(nm(c)) + ' 会根据对你的了解挑礼物。</p>';
            h += '<div class="stage' + (g ? " on" : "") + (g && st.anim === (c && c.id) ? " go" : "") + '"><div class="glow"></div>' + giftSvg() + '</div>';
            h += '<div class="center"><button class="btn fill" data-act="openGift"' + (pend ? " disabled" : "") + '>' +
              (pend ? "生成中" : (g ? "换一个" : "拆开盲盒")) + '</button></div>';
            if (pend) h += wait("TA 正在挑礼物，你可以先去别处逛逛");
            if (g) {
              h += '<div class="gift"><h3 class="en">' + esc(g.name) + '</h3><p>' + esc(g.reason) + '</p>' +
                (g.img ? '<img src="' + esc(g.img) + '" alt="">' : "") + '</div>' +
                '<div class="center"><button class="btn sm" data-act="giftImg"' + (pimg ? " disabled" : "") + '>' +
                (pimg ? "绘制中" : "生成礼物图（消耗额度，可选）") + '</button></div>';
              if (pimg) h += wait("正在画礼物图");
            }
            return h;
          }

          function revealed(w) { return st.testReveal || Date.now() >= new Date(w.year, 11, 25).getTime(); }

          function vMail() {
            var h = head("Mailbox", "圣 诞 信 箱") + '<div class="tabs"><button class="' + (st.tab === "wish" ? "on" : "") +
              '" data-act="tab" data-t="wish">许愿树</button><button class="' + (st.tab === "letter" ? "on" : "") +
              '" data-act="tab" data-t="letter">写信</button></div>';
            if (st.tab === "wish") {
              var any = st.wishes.length && st.wishes.every(revealed);
              h += treeSvg(st.wishes.length) +
                '<div class="row"><input class="in" data-in="wishText" maxlength="60" placeholder="写下一个圣诞愿望" value="' + esc(st.wishText) + '">' +
                '<button class="btn sm" data-act="addWish">挂上树</button></div>' +
                '<p class="hint">愿望会一直保密，12 月 25 日才揭晓，由 TA 回应。</p>' +
                '<ul class="wl">' + (st.wishes.length ? st.wishes.map(function (w) {
                  return '<li><span>' + esc(w.text) + '</span><small>' + (revealed(w) ? "已揭晓" : "封存中") + '</small></li>';
                }).join("") : '<li><small>树上还空着，挂上第一个愿望吧。</small></li>') + '</ul>' +
                '<div class="center"><button class="link" data-act="testReveal">测试：' + (st.testReveal ? "关闭" : "提前") + '揭晓</button></div>';
              if (any) {
                var pw = st.jobs.wish;
                h += picker(false) + '<div class="center"><button class="btn fill" data-act="replyWish"' + (pw ? " disabled" : "") + '>' +
                  (pw ? "生成中" : "请 " + esc(nm(curChar())) + " 回应愿望") + '</button></div>';
                if (pw && !st.live.wish) h += wait("TA 在读你的愿望，你可以先去别处逛逛");
              }
              if (st.live.wish) h += '<div class="paper" data-live="wish">' + esc(st.live.wish) + '</div>';
              else if (st.wishReply) h += '<div class="paper" style="min-height:0">' + esc(st.wishReply.text) + '\n—— ' + esc(st.wishReply.who) + '</div>';
            } else {
              h += picker(false) +
                '<div class="paper" style="padding:0"><div class="stamp">★</div>' +
                '<textarea class="paper" data-in="letterText" placeholder="亲爱的圣诞老人……">' + esc(st.letterText) + '</textarea></div>' +
                '<div class="center"><button class="btn fill" data-act="sendLetter">投进信箱</button></div>' +
                '<p class="hint">回信会在第二天早上 9 点送到。</p>' +
                st.letters.slice().reverse().map(function (l) {
                  var ready = Date.now() >= l.replyAt, pl = st.jobs["letter:" + l.id];
                  var status = pl ? "正在写回信" : (l.reply ? "已读" : (ready ? "回信到了" : fmt(l.replyAt) + " 送达"));
                  var btn = (l.reply || ready || pl)
                    ? '<button class="btn sm" data-act="openLetter" data-id="' + esc(l.id) + '">' + (l.reply ? "再看看" : (pl ? "查看" : "拆信")) + '</button>'
                    : '<button class="link" data-act="skipWait" data-id="' + esc(l.id) + '">测试：提前送达</button>';
                  return '<div class="lt"><span>给 ' + esc(l.charName) + '<small>' + fmt(l.sentAt) + ' 寄出 · ' + status + '</small></span>' + btn + '</div>';
                }).join("");
            }
            return h;
          }

          function vLetter() {
            var l = st.letters.filter(function (x) { return x.id === st.openId; })[0];
            if (!l) return head("Letter", "回 信") + '<p class="hint">找不到这封信。</p>';
            var key = "letter:" + l.id, lv = st.live[key];
            var body = lv ? '<span data-live="' + key + '">' + esc(lv) + '</span>' : esc(l.reply || "");
            return head("Letter", "回 信") + '<div class="paper"><div class="stamp">★</div><div class="pm">北极邮局<br>' + fmt(l.replyAt) +
              '</div><div style="padding-top:40px">' + body + '</div></div>' +
              (st.jobs[key] && !lv ? wait("圣诞老人在写回信，你可以先去别处逛逛") : "");
          }

          function vSanta() {
            var d = st.d.draw, ps = st.jobs.scene, lv = st.live.scene;
            var h = head("Secret Santa", "神 秘 圣 诞 老 人") + '<p class="hint">选 2 个以上角色，抽签决定谁送谁。</p>' + picker(true) +
              '<div class="center"><button class="btn fill" data-act="drawLots">' + (d ? "重新抽签" : "开始抽签") + '</button></div>';
            if (d) {
              h += d.map(function (p) {
                var a = charById(p.from), b = charById(p.to);
                return '<div class="pair en"><b>' + esc(nm(a)) + '</b><em>→</em><b>' + esc(nm(b)) + '</b></div>';
              }).join("") +
                '<div class="center"><button class="btn" data-act="makeScene"' + (ps ? " disabled" : "") + '>' +
                (ps ? "生成中" : (st.d.scene ? "换一场" : "生成交换礼物现场")) + '</button></div>';
            }
            if (ps && !lv) h += wait("大家正在拆礼物，你可以先去别处逛逛");
            if (lv) h += '<div class="scene" data-live="scene">' + esc(lv) + '</div>';
            else if (st.d.scene) h += '<div class="scene">' + esc(st.d.scene) + '</div>';
            return h;
          }

          function render() {
            var body = { home: vHome, cert: vCert, gift: vGift, mail: vMail, letter: vLetter, santa: vSanta }[st.view]();
            view.innerHTML = body;
            st.anim = null;
          }
          function go(v) {
            st.view = v; st.d.ready[v] = false; save();
            render(); view.scrollTop = 0;
          }

          // ---------- 事件 ----------
          async function onClick(e) {
            var el = e.target.closest("[data-act]");
            if (!el) return;
            var act = el.dataset.act, id = el.dataset.id, c = curChar();

            if (act === "exit") return roche.ui.closeApp();
            if (act === "back") {
              if (st.view === "home") return roche.ui.closeApp();
              if (st.view === "letter") { st.view = "mail"; return render(); }
              return go("home");
            }
            if (act === "go") return go(el.dataset.v);
            if (act === "toggleStream") {
              st.stream = !st.stream;
              await roche.storage.set("stream", st.stream);
              roche.ui.toast(st.stream ? "已开启流式：回信、愿望回应、交换礼物会边写边显示" : "已关闭流式");
              return render();
            }
            if (act === "pick") { st.sel = id; return render(); }
            if (act === "toggle") {
              var i = st.multi.indexOf(id);
              if (i > -1) st.multi.splice(i, 1); else st.multi.push(id);
              return render();
            }
            if (act === "tab") { st.tab = el.dataset.t; return render(); }
            if (act === "testReveal") { st.testReveal = !st.testReveal; return render(); }

            if (act === "makeCert") {
              if (!c) return roche.ui.toast("请先选一个角色");
              return job("cert:" + c.id, "cert", "好孩子名单", async function () {
                var l = await likes(c);
                var k = await ask(sysFor(c, l),
                  "现在是圣诞节前夕，你扮演圣诞老人，为对方出具一份「年度好孩子鉴定报告」。只输出 JSON：" +
                  '{"title":"英文或中英混合的报告标题，简短","items":[{"label":"评分项，共4项，有趣且贴合对方的喜好，不要负面","stars":5}],"verdict":"总评，60-100字，用你的口吻","note":"一句悄悄话，20字内"}', true);
                if (!k.items || !k.items.length) throw new Error("报告内容不完整，再试一次");
                k.title = k.title || "Good Kid Report";
                k.who = nm(c); k.year = new Date().getFullYear();
                st.d.cert[c.id] = k;
              });
            }

            if (act === "openGift") {
              if (!c) return roche.ui.toast("请先选一个角色");
              return job("gift:" + c.id, "gift", "礼物", async function () {
                var l = await likes(c), e0 = st.d.gift[c.id] || { hist: [] };
                var g = await ask(sysFor(c, l),
                  "你扮演圣诞老人，根据你对对方的了解挑一份圣诞礼物。不要与这些重复：" + (e0.hist.join("、") || "无") +
                  '。只输出 JSON：{"name":"礼物名","reason":"用你的口吻说挑选理由，50-90字","image":"礼物的英文生图提示词，一句话"}', true);
                e0.hist.push(g.name); e0.cur = g;
                st.d.gift[c.id] = e0;
                if (viewKey() === "gift") st.anim = c.id;
              });
            }
            if (act === "giftImg") {
              var e1 = c && st.d.gift[c.id], g1 = e1 && e1.cur;
              if (!g1) return;
              var ok = await roche.ui.confirm({ title: "生成礼物图", message: "生图会消耗你的生图额度，确定要生成吗？" });
              if (!ok) return;
              return job("img:" + c.id, "gift", "礼物图", async function () {
                var r = await roche.ai.generateImage({ prompt: "christmas gift illustration, " + (g1.image || g1.name) + ", soft warm light, dark blue background, no text" });
                var src = imgSrc(r);
                if (!src) throw new Error("没有拿到图片，请检查生图设置");
                g1.img = src;
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
              return job("wish", "mail", "愿望回应", async function () {
                var l = await likes(c);
                var txt = await ask(sysFor(c, l),
                  "你扮演圣诞老人，12 月 25 日到了，对方挂在许愿树上的愿望如下：\n" +
                  st.wishes.map(function (w, i) { return (i + 1) + ". " + w.text; }).join("\n") +
                  "\n请逐条温暖地回应，可以说会努力帮忙实现，总共 150-250 字，直接输出正文。", false, "wish");
                st.wishReply = { text: txt, who: nm(c), at: Date.now() };
                await roche.storage.set("wishReply", st.wishReply);
              });
            }

            if (act === "sendLetter") {
              var lt = st.letterText.trim();
              if (!c) return roche.ui.toast("请先选一个收信角色");
              if (!lt) return roche.ui.toast("信还是空的");
              var dd = new Date(); dd.setDate(dd.getDate() + 1); dd.setHours(9, 0, 0, 0);
              st.letters.push({ id: uid(), charId: c.id, charName: nm(c), text: lt, sentAt: Date.now(), replyAt: dd.getTime(), reply: null });
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
              st.openId = id; st.view = "letter";
              if (L.reply || st.jobs["letter:" + id]) return render();
              var ch = charById(L.charId) || c;
              if (!ch) { st.view = "mail"; return roche.ui.toast("找不到这个角色了"); }
              return job("letter:" + id, "mail", "回信", async function () {
                var l = await likes(ch);
                L.reply = await ask(sysFor(ch, l),
                  "你扮演圣诞老人，给对方写一封手写风格的回信。对方的来信：\n" + L.text +
                  "\n回信 120-220 字，亲切温暖、有画面感，落款写圣诞老人，直接输出正文。", false, "letter:" + id);
                await roche.storage.set("letters", st.letters);
              });
            }

            if (act === "drawLots") {
              if (st.multi.length < 2) return roche.ui.toast("至少选 2 个角色");
              var to = derange(st.multi);
              st.d.draw = st.multi.map(function (f, i) { return { from: f, to: to[i] }; });
              st.d.scene = null; save();
              return render();
            }
            if (act === "makeScene") {
              var pairs0 = st.d.draw, ids = st.multi.slice();
              return job("scene", "santa", "交换礼物现场", async function () {
                var infos = await Promise.all(ids.map(async function (cid) {
                  var ch = charById(cid), l = await likes(ch);
                  return "【" + nm(ch) + "】人设：" + String(ch.persona || ch.bio || "").slice(0, 250) +
                    "\n喜好：" + l.split("\n").slice(0, 6).join("；");
                }));
                var pairs = pairs0.map(function (p) { return nm(charById(p.from)) + " 送给 " + nm(charById(p.to)); }).join("；");
                st.d.scene = await ask("你是擅长写温馨群像小剧场的作者。参与者资料：\n" + infos.join("\n\n") +
                  "\n规则：只写愉快温馨的内容，不涉及痛苦或负面经历；不要出现“记忆”“系统”“AI”字样；不要使用 emoji。",
                  "这是一场圣诞“神秘圣诞老人”交换礼物聚会。抽签结果：" + pairs +
                  "。写一段 300-500 字的小剧场：每个人拆礼物、猜送礼人，礼物要贴合收礼人的喜好，每个人的说话方式符合各自人设，气氛温馨好笑。直接输出正文。", false, "scene");
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
