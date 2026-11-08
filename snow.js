/* snow.js — 雪仗：回合制（我方防守 / 我方进攻），5 颗心，最多 8 回合
 * 画面素材 / 样式 / 音效在 snow-art.js（要和本文件一起上传，缺了雪仗打不开）
 * 台词：进入前一次性预生成并缓存（每个角色只花一次钱），游戏中按事件类型挑，所以台词和画面一定对得上
 * 形象：对手用角色头像，我方用你的人设头像；不用生图
 * v1.5.2：重新准备台词加确认 / 战绩分享（右上角奖杯：战绩卡图片 + 可复制文字 + 可选角色评价）/ 拆出 snow-art.js / 清理旧代码
 * v1.5.1：球跟红圈变道 / 风格可视化 + 被打中反应 / 按角色战绩 + 清理页 / 删栅栏 / 画布自适应缩放 / 哔哔声去重
 * v1.5.0：台词系统 + 哔哔声 + 四种角色风格 + 握手言和 + 开局提示 + 方向键 A/D + 切后台即暂停 */
(function () {
  "use strict";
  var R = window.RCC;
  var A = R.snowArt;
  if (!A) {   // snow-art.js 没上传或没加载到：给出提示，不让整个小屋报错
    R.add({ id: "snow", style: "", home: { order: 6, en: "Snowball Fight", zh: "雪 仗", desc: "缺少 snow-art.js", icon: "snow", svg: "" },
      create: function (ctx) { return { view: function () { return ctx.page("Snowball Fight", "雪 仗", '<p class="hint">缺少 snow-art.js。请把它和 snow.js 一起放到仓库最外层，并确认 christmas-cabin.js 是最新版。</p>'); } }; } });
    return;
  }
  var heart = A.heart, brokenHeart = A.brokenHeart, splatHtml = A.splatHtml, DEFS = A.DEFS, ART = A.ART, lightsHtml = A.lightsHtml, drops = A.drops, AURA = A.AURA, SFX = A.SFX;
  var LANE = [27, 73];                 // 左右两条路的横向位置（%）
  var MAX_ROUND = 8;
  var Y = { oppBall: 116, oppHit: 108, meBall: 384, meHit: 412, mark: 430 };   // 雪球起点/落点的纵向位置（px）
  var EV = { start: "雪仗刚开始，你说开场白", dodge: "你扔的雪球被对方躲开了，没打中", hit: "你扔的雪球打中了对方", gotHit: "对方扔的雪球打中了你", miss: "对方扔偏了，没打中你", oppWin: "整场雪仗你赢了（对方输了）", oppLose: "整场雪仗你输了（对方赢了）",
    startWon: "对方上一局赢了你，这局开场你不服气地说一句", panic: "你只剩 1 颗心了，慌张、拼命、不想输地说一句", taunt: "对方的心已经不多了，你调侃或嘲讽一句（符合性格，别伤人）",
    truce: "整场打平了，你和对方握手言和，说一句", wild: "（只有 tsun 写）你被对方连着躲开两次急眼了，一球扔到旁边的背景上，完全没打到人，嘴硬地辩解",
    annoy: "（只有 tsun 写）对方又一次躲开了你的球，你开始着急", slip: "（只有 gentle 写）你手滑了，雪球飞到旁边去了，不好意思地说一句",
    callL: "（只有 tricky 写）扔球前你故意宣布要扔左边，其实可能是骗人的", callR: "（只有 tricky 写）扔球前你故意宣布要扔右边，其实可能是骗人的", shrug: "（只有 tricky 写）你被对方打中了，但装作没事、云淡风轻" };
  var DEF = {
    start: ["准备好了吗？", "来打雪仗吧！", "别想跑！"],
    dodge: ["哎，躲开了！", "溜得真快！", "下次一定！"], hit: ["打中啦！", "漂亮！", "嘿嘿，中了！"],
    gotHit: ["哇，被打中了！", "好球！", "这下扯平了！"], miss: ["差一点！", "嘿，没中吧！", "我躲开啦！"],
    oppWin: ["我赢啦！", "承让承让！", "再来一局？"], oppLose: ["我认输！", "你好厉害！", "下次不会输！"],
    startWon: ["这次我可不会输！", "上次让着你的！"], panic: ["还不能输！", "拼了！", "别、别过来！"], taunt: ["就这点本事？", "快撑不住了吧？"],
    truce: ["打平啦，握个手吧！", "下次再分胜负！"], wild: ["哼，才不是故意的！", "手、手滑了啦！"], annoy: ["你怎么老躲！", "别躲啦！"], slip: ["呀！手滑了！", "哎呀，扔歪了！"],
    callL: ["我要扔左边咯~"], callR: ["我要扔右边咯~"], shrug: ["哦？没感觉~", "就这？再来~"]
  };
  var STY_NAME = { tricky: "腹黑", tsun: "傲娇", gentle: "温柔", cool: "高冷", normal: "普通" };
  var STY_ORDER = [null, "tricky", "tsun", "gentle", "cool", "normal"];
  var TIP = { tricky: "你匹配到了一个很腹黑的对手呢", tsun: "哇，你这次的对手很傲娇", gentle: "这位对手有点笨手笨脚，说不定会手滑", cool: "对手话不多，但出手很准，小心" };
  var VOICE = [1, 1.122, 1.26, 1.5, 1.68, 2], VOICE_HI = [1.5, 1.68, 2, 2.24], TONEW = /[啊呀吧呢哦嘛啦哇哼嗯哎诶咦喂嘿呐]/;
  var STY_FX = { tricky: "140,70,190", tsun: "235,115,40", gentle: "238,130,165", cool: "80,150,205" };
  var STY_GLYPH = { tricky: "诈", tsun: "哼", gentle: "柔", cool: "冷" };
  var PAUSE_HTML = '<div class="res pz"><h3 class="en">暂停</h3><div class="bubble">切走了，先帮你停住了</div><div><button class="btn" data-act="snow.resume">继续</button></div></div>';
  var SHARE_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#4a2a07" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 01-8 0zM8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M9 20h6M10 17h4"/></svg>';
  var SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="#8a5a1c" stroke-width="2.2"><circle cx="24" cy="30" r="12" fill="rgba(255,255,255,.7)"/><circle cx="24" cy="14" r="8" fill="rgba(255,255,255,.7)"/><path d="M22 14h5" stroke="#c9742a"/></svg>';
  // 会被砸歪的物件各级歪的程度（0 = 没歪）
  var ANG = { sg: [0, 12, 22, 32], sh: [0, -14, -28, -46] };
  var HEAD = [[0, 0, 0], [0, 0, 16], [7, 4, 36], [13, 20, 66]];       // 雪人头：x, y, 旋转
  var ZONES = { backL: ["tl", "gl", "lt"], backR: ["tr", "gr", "lt"], frontL: ["pl", "sh"], frontR: ["sg", "sm"] };
  var KIND = { tl: "tree", tr: "tree", lt: "lights", gl: "soft", gr: "soft", pl: "soft", sg: "wood", sh: "wood", sm: "snowman" };
  R.add({
    id: "snow", style: A.css, jobs: "snow:",
    home: { order: 6, en: "Snowball Fight", zh: "雪 仗", desc: "和角色打一场回合制雪仗", icon: "snow", svg: SVG },
    create: function (ctx) {
      var st = ctx.st, roche = ctx.roche, e = ctx.esc;
      var game = null, timers = [], lineMsg = "", rules = null, trailT = null, duckT = null, typeT = null, typing = null, cleanOpen = false, share = null;

      // 可暂停的计时器：切后台时记下剩余时间，回来点「继续」再接着走
      function drop(t) { var i = timers.indexOf(t); if (i > -1) timers.splice(i, 1); }
      function later(fn, ms) {
        var t = { fn: fn, ms: ms, at: Date.now() };
        t.id = setTimeout(function () { drop(t); fn(); }, ms);
        timers.push(t); return t;
      }
      function clearAll() { timers.forEach(function (t) { clearTimeout(t.id); }); timers = []; if (typeT) { clearTimeout(typeT); typeT = null; } typing = null; if (trailT) { cancelAnimationFrame(trailT); trailT = null; } unduck(); }
      function rnd() { return Math.random(); }
      function lines(c) { return (st.d.snowLines && st.d.snowLines[c.id]) || null; }
      function rec(c) {
        if (!c) return { win: 0, lose: 0, draw: 0, last: null, truce: false };
        var RC = st.d.snowRec = st.d.snowRec || {};
        return RC[c.id] = RC[c.id] || { win: 0, lose: 0, draw: 0, last: null, truce: false };
      }
      function avatar(img, name) { return img ? '<img src="' + e(img) + '" alt="">' : e(String(name || "?").slice(0, 1)); }
      function el(sel) { return ctx.view.querySelector(sel); }
      function say(ev) {
        var g = game, L = (g.c && lines(g.c)) || {}, pick = ev, oppEv = ev === "dodge" || ev === "hit" || ev === "gotHit" || ev === "miss";
        if (oppEv && g.hp.opp === 1 && rnd() < 0.7) pick = "panic";                                      // 只剩 1 颗心：慌张拼命
        else if ((ev === "hit" || ev === "dodge") && g.hp.me <= 2 && rnd() < 0.6) pick = "taunt";        // 你的心不多了：调侃
        else if (ev === "gotHit" && g.style === "tricky" && rnd() < 0.7) pick = "shrug";                // 腹黑：被打中装作没事
        else if (ev === "start" && rec(g.c).last === "win") pick = "startWon";                          // 你上局赢了：不服气
        var arr = (L[pick] && L[pick].length) ? L[pick] : (DEF[pick] || DEF[ev]);
        g.bubble = String(arr[Math.floor(rnd() * arr.length)]).slice(0, 24);
      }
      // 打字机 + 一个字一声哔哔（每个角色的嗓音基准音不同）
      function voiceBase() {
        var id = String(game && game.c ? game.c.id : "x"), h = 0, i;
        for (i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
        return 260 + (h % 220);
      }
      function finishTyping() {
        if (typeT) { clearTimeout(typeT); typeT = null; }
        if (typing) { try { typing.el.textContent = typing.text; } catch (err) { /* 忽略 */ } typing = null; }
      }
      function typeBubble() {
        finishTyping();
        var b = el(".bubble");
        if (!b || !game || game.paused) return;
        var text = b.textContent, i = 0, lastF = 0, base = voiceBase(), a = document.createElement("span"), z = document.createElement("span");
        if (!text) return;
        z.style.visibility = "hidden"; z.textContent = text;
        b.textContent = ""; b.appendChild(a); b.appendChild(z);      // 隐形的后半句先占住位置，气泡不会边打边变宽
        typing = { el: b, text: text };
        (function tick() {
          if (!typing || typing.el !== b) return;
          i++; a.textContent = text.slice(0, i); z.textContent = text.slice(i);
          var ch = text.charAt(i - 1), stop = /[，。！？!?,.…~、；：]/.test(ch), isT = TONEW.test(ch);
          if (soundOn() && ch.trim() && !stop) {                       // 标点只停顿；语气词用更高更短的音；不连续两次同一个音高
            var pool = isT ? VOICE_HI : VOICE, ix;
            do { ix = Math.floor(rnd() * pool.length); } while (base * pool[ix] === lastF);
            lastF = base * pool[ix]; SFX.blip(lastF, isT ? 0.045 : 0.06);
          }
          if (i >= text.length) { typing = null; typeT = null; return; }
          typeT = setTimeout(tick, stop ? 140 : 45);
        })();
      }
      function show() { ctx.render(); typeBubble(); }

      // ---------- 暂停：切后台自动暂停，回来点「继续」----------
      function pauseGame() {
        if (!game || game.paused || game.over) return;
        game.paused = true;
        timers.forEach(function (t) { clearTimeout(t.id); t.left = Math.max(0, t.ms - (Date.now() - t.at)); });
        finishTyping();
        var ar = el(".arena");
        try { (ar && ar.getAnimations ? ar.getAnimations({ subtree: true }) : []).forEach(function (an) { an.pause(); }); } catch (err) { /* 忽略 */ }
        SFX.suspend();
        if (ar && !ar.querySelector(".pz")) ar.insertAdjacentHTML("beforeend", PAUSE_HTML);
      }
      function resumeGame() {
        if (!game || !game.paused) return;
        game.paused = false;
        timers.slice().forEach(function (t) { t.ms = t.left; t.at = Date.now(); t.id = setTimeout(function () { drop(t); t.fn(); }, t.left); });
        var ar = el(".arena");
        try { (ar && ar.getAnimations ? ar.getAnimations({ subtree: true }) : []).forEach(function (an) { an.play(); }); } catch (err) { /* 忽略 */ }
        var pz = ar && ar.querySelector(".pz"); if (pz) pz.remove();
        if (soundOn()) SFX.init();
      }
      function onVis() { if (document.hidden) pauseGame(); }
      function doLane(l) {
        if (!game || game.paused) return;
        if (game.turn === "defend" && (game.phase === "windup" || game.phase === "defend") && !game.locked) {
          game.lane.me = l;
          var m = el(".char.m"), md = ctx.view.querySelectorAll(".mound");
          if (m) m.style.left = LANE[l] + "%"; if (md[1]) md[1].style.left = LANE[l] + "%";
          return;
        }
        if (game.phase === "attack") return aim(l);
      }
      // 电脑：← → 或 A / D；暂停时空格/回车继续
      function onKey(ev) {
        if (!game || st.view !== "snow") return;
        var k = ev.key;
        if (game.paused) { if (k === " " || k === "Enter") { ev.preventDefault(); resumeGame(); } return; }
        var l = (k === "ArrowLeft" || k === "a" || k === "A") ? 0 : ((k === "ArrowRight" || k === "d" || k === "D") ? 1 : -1);
        if (l < 0 || ev.repeat) return;
        ev.preventDefault();
        if (soundOn()) { SFX.init(); SFX.tick(); }
        doLane(l);
      }
      // 画布固定按 360×520 来画，按屏幕宽高整体缩放：窄屏/矮屏/宽屏都能完整放下
      function fitScale() {
        var w = ctx.view.clientWidth - 64, h = ctx.view.clientHeight - 250;
        return Math.max(0.55, Math.min(w / 360, h / 520, 1.3)).toFixed(3);
      }
      function onResize() { var aw = el(".aw"); if (aw) aw.style.setProperty("--s", fitScale()); }
      window.addEventListener("resize", onResize);
      document.addEventListener("keydown", onKey);
      document.addEventListener("visibilitychange", onVis);

      // ---------- 音量 / 音效开关 / 压低唱片机音乐 ----------
      function soundOn() { return sfxVol() > 0; }
      function sfxVol() { return st.d.snowSfx == null ? 100 : st.d.snowSfx; }
      function musicVol() { return st.d.snowMusic == null ? 100 : st.d.snowMusic; }
      function snd(name, a, b) { if (soundOn()) SFX[name](a, b); }
      function applyMusic(level) { if (R.duck) { try { R.duck(musicVol() / 100 * level); } catch (err) { /* 忽略 */ } } }
      function unduck() { if (duckT) { clearTimeout(duckT); duckT = null; } applyMusic(1); }
      function duck() {
        if (!soundOn() || !R.duck) return;
        applyMusic(0.3);
        if (duckT) clearTimeout(duckT);
        duckT = setTimeout(function () { duckT = null; applyMusic(1); }, 1100);
      }
      function onRange(ev) {
        var k = ev.target && ev.target.dataset && ev.target.dataset.vol;
        if (!k) return;
        var v = +ev.target.value, lab = ev.target.parentNode.querySelector("em");
        if (lab) lab.textContent = v + "%";
        if (k === "sfx") { st.d.snowSfx = v; SFX.setVol(v / 100); } else { st.d.snowMusic = v; applyMusic(1); }
      }
      function onRangeDone(ev) {
        var k = ev.target && ev.target.dataset && ev.target.dataset.vol;
        if (!k) return;
        ctx.save();
        if (k === "sfx" && soundOn()) { SFX.init(); SFX.tick(); }
      }
      ctx.root.addEventListener("input", onRange);
      ctx.root.addEventListener("change", onRangeDone);

      // ---------- 小工具：头像姿势 / 雪球 ----------
      function setPose(side, mode, ct) {
        var c = el(".char." + side);
        if (c) {
          c.classList.remove("charge", "held", "throw");
          if (mode) c.classList.add(mode);
          if (ct) c.style.setProperty("--ct", ct + "ms");
        }
        game.pose = mode ? { side: side, mode: mode, ct: ct || 0 } : null;
      }
      function ballHtml() {
        var b = game.ball, down = b.by === "opp", y0 = down ? Y.oppBall : Y.meBall;
        return '<div class="bsh" style="left:' + LANE[b.lane] + '%;top:' + (y0 + 12) + 'px;transition:left .18s"></div>' +
          '<div class="ball ' + (down ? "o" : "m") + '" style="left:' + LANE[b.lane] + '%;top:' + y0 + 'px;transition:left .18s"></div>' +
          (down && !b.wild ? '<div class="mark" style="left:' + LANE[b.lane] + '%;top:' + Y.mark + 'px"></div>' : "");
      }
      function spawnBall() { var ar = el(".arena"); if (ar && game.ball) ar.insertAdjacentHTML("beforeend", ballHtml()); }

      // 拖尾雪团：随机位置/大小/不规则边缘，边缩小边往下掉（越掉越快）
      function spawnPuff(ar, x, y) {
        var d = document.createElement("i"), sz = 4 + rnd() * 7, vx = (rnd() - 0.5) * 26, g = 70 + rnd() * 60, T = 550 + rnd() * 350;
        function rr() { return Math.round(35 + rnd() * 30) + "%"; }
        d.className = "trail";
        d.style.cssText = "left:" + (x + (rnd() - 0.5) * 10).toFixed(1) + "px;top:" + (y + (rnd() - 0.5) * 10).toFixed(1) + "px;width:" + sz.toFixed(1) + "px;height:" + sz.toFixed(1) +
          "px;margin:-" + (sz / 2).toFixed(1) + "px 0 0 -" + (sz / 2).toFixed(1) + "px;border-radius:" + rr() + " " + rr() + " " + rr() + " " + rr() + " / " + rr() + " " + rr() + " " + rr() + " " + rr();
        ar.appendChild(d);
        if (!d.animate) { setTimeout(function () { d.remove(); }, T); return; }
        var kf = [], N = 6, i;
        for (i = 0; i <= N; i++) { var t = i / N; kf.push({ offset: t, transform: "translate(" + (vx * t).toFixed(1) + "px," + (g * t * t).toFixed(1) + "px) scale(" + (1 - 0.85 * t).toFixed(2) + ")", opacity: 1 - 0.7 * t * t }); }
        var an = d.animate(kf, { duration: T, easing: "linear", fill: "forwards" });
        an.onfinish = function () { d.remove(); };
      }

      // ---------- 雪球飞行：弧线 + 变大变小（模拟抛高）+ 影子 + 彩色拖尾 ----------
      function fly(by, dur) {
        var b = el(".ball"), sh = el(".bsh");
        if (!b || !b.animate) return;
        var down = by === "opp", y0 = down ? Y.oppBall : Y.meBall, y1 = down ? Y.meHit : Y.oppHit;
        var bl = game.ball, wd = down && bl ? bl.wild : null, x0 = bl ? LANE[bl.lane] : 50, x1 = bl && bl.lane ? 96 : 4;
        var sty = down ? game.style : "normal", hmp = 70, spin = 360, sc = 0.65, sway = 0, warp = 0, ease = down ? "cubic-bezier(.35,0,.85,.7)" : "cubic-bezier(.1,.4,.5,1)";
        if (wd === "wild") { hmp = 40; spin = 1080; ease = "cubic-bezier(.2,.2,.9,.8)"; }              // 傲娇急眼：又快又歪、疯狂旋转
        else if (wd === "slip") { hmp = 125; spin = 180; ease = "ease-in-out"; }                        // 手滑：高高飘出去
        else if (sty === "tricky") { sway = 11; warp = 0.1; }                                           // 腹黑：左右摇摆、半空犹豫
        else if (sty === "cool") { hmp = 8; sc = 0.25; spin = 90; ease = "linear"; }                   // 高冷：笔直
        else if (sty === "gentle") { hmp = 105; sway = 6; spin = 180; ease = "ease-in-out"; }           // 温柔：慢慢飘
        var kb = [], ks = [], N = 16, i;
        // 注意：只有「飞偏球」才在动画里写横向位置；正常球不写，这样中途变道时球、影子、红圈能一起换
        for (i = 0; i <= N; i++) {
          var t0 = i / N, u = Math.min(1, Math.max(0, t0 + warp * Math.sin(2 * Math.PI * t0))), hump = 4 * u * (1 - u), gy = y0 + (y1 - y0) * u, sx = sway * Math.sin(t0 * Math.PI * 3);
          var f1 = { offset: t0, top: (gy - hump * hmp) + "px", transform: "translate(" + sx.toFixed(1) + "px,0) translate(-50%,-50%) scale(" + (0.75 + hump * sc).toFixed(3) + ") rotate(" + Math.round(u * spin) + "deg)" };
          var f2 = { offset: t0, top: (gy + 12) + "px", opacity: 0.45 - hump * 0.2, transform: "translate(" + sx.toFixed(1) + "px,0) translate(-50%,-50%) scale(" + (1.1 - hump * 0.5 * hmp / 70).toFixed(3) + ")" };
          if (wd) { f1.left = f2.left = (x0 + (x1 - x0) * u) + "%"; }
          kb.push(f1); ks.push(f2);
        }
        var opt = { duration: dur, easing: ease, fill: "forwards" };
        b.animate(kb, opt);
        if (sh) sh.animate(ks, opt);
        if (trailT) cancelAnimationFrame(trailT);
        var last = performance.now(), acc = 0, ar = el(".arena");
        function puffLoop(ts) {
          if (!game || !ar || !ar.isConnected || !b.isConnected || acc > dur) { trailT = null; return; }
          var dt = Math.min(50, Math.max(0, ts - last)); last = ts;
          if (!game.paused) acc += dt;
          if (!game.paused && rnd() < 0.5) {
            var r1 = b.getBoundingClientRect(), r2 = ar.getBoundingClientRect(), kk = r2.width / (ar.offsetWidth || 360), n = rnd() < 0.25 ? 2 : 1, k;
            for (k = 0; k < n; k++) spawnPuff(ar, (r1.left + r1.width / 2 - r2.left) / kk, (r1.top + r1.height / 2 - r2.top) / kk);
          }
          trailT = requestAnimationFrame(puffLoop);
        }
        trailT = requestAnimationFrame(puffLoop);
      }

      // 砸偏时随机砸中这一侧、这一区的一个背景物件
      function hitDeco(zone, lane) {
        var list = ZONES[zone + (lane ? "R" : "L")], id = list[Math.floor(rnd() * list.length)], prev = 0;
        if (game.deco[id] !== undefined) { prev = game.deco[id]; game.deco[id] = Math.min(3, prev + 1); }
        game.fxo = { id: id, prev: prev };
        snd("deco", KIND[id]);
      }

      // ---------- 回合流程：蓄力 → 投球 → 结果（停一下）----------
      function chargeMs() { return Math.max(500, 900 - (game.round - 1) * 57); }     // 蓄力：约 0.9 秒越到后面越短
      function start(c) {
        clearAll();
        var S = (st.d.snowStyle && st.d.snowStyle[c.id]) || {}, sty = S.manual || S.auto || "normal";
        game = { c: c, style: sty, streak: 0, call: null, react: false, angry: false, paused: false, turn: null, round: 1, hp: { me: 5, opp: 5 }, phase: "intro", lane: { me: rnd() < 0.5 ? 0 : 1, opp: rnd() < 0.5 ? 0 : 1 }, bubble: "", fx: null, ball: null, tell: null, over: null, splat: null, lost: null,
          deco: { sh: 0, sg: 0, sm: 0 }, fxo: null, pose: null, locked: false };
        say("start"); show(); later(beginDefend, 2200);
      }
      function dur() { return Math.max(850, 1500 - (game.round - 1) * 110); }
      function beginDefend() {
        var ct = chargeMs();
        game.phase = "windup"; game.turn = "defend"; game.fx = null; game.splat = null; game.fxo = null; game.ball = null; game.locked = false; game.bubble = ""; game.call = null;
        game.angry = game.style === "tsun" && (game.streak >= 2 || game.react);      // 傲娇：快急眼了，头像先发抖
        game.pose = { side: "o", mode: "charge", ct: ct };
        if (game.style === "tricky" && rnd() < 0.6) {                    // 腹黑：先喊一个方向，可能是骗人的
          game.call = rnd() < 0.5 ? 0 : 1;
          var Lc = lines(game.c) || {}, ck = game.call ? "callR" : "callL", ca = (Lc[ck] && Lc[ck].length) ? Lc[ck] : DEF[ck];
          game.bubble = String(ca[Math.floor(rnd() * ca.length)]).slice(0, 24);
        }
        show(); snd("charge", "o", ct);
        later(throwOpp, ct);
      }
      function throwOpp() {
        var sty = game.style, r = game.round, D = dur(), wild = null, lane = rnd() < 0.5 ? 0 : 1, pr, pf, real, fake, rx = game.react;
        game.react = false; game.angry = false;
        pr = r >= 3 ? 0.45 : (r === 2 ? 0.2 : 0); pf = r >= 3 ? Math.min(0.45, 0.15 * (r - 2)) : 0;
        if (sty === "tricky") { pr = r >= 3 ? 0.6 : (r === 2 ? 0.5 : 0.3); pf = 0.5; if (rx) { pr = Math.min(0.85, pr + 0.25); pf = 0.7; } }     // 腹黑：被打中后假装没事，下一球变招更勤
        else if (sty === "cool") { pr = rx ? 0.95 : (r >= 3 ? 0.75 : (r === 2 ? 0.7 : 0.6)); pf = 0; D = Math.round(D * (rx ? 0.8 : 0.88)); }       // 高冷：几乎没反应，但下一球几乎必变招且更快
        else if (sty === "tsun") { pr *= 0.5; pf = 0; }
        else if (sty === "gentle") D = Math.round(D * 1.1);
        if (sty === "tsun" && (game.streak >= 2 || rx)) { wild = "wild"; D = Math.round(dur() * 0.45); game.streak = 0; }                 // 傲娇：连躲两次或被打中，下一球必是又快又歪的急眼球
        else if (sty === "gentle" && rnd() < (rx ? 0.3 : (r === 1 ? 0.1 : 0.06))) { wild = "slip"; D = Math.round(dur() * 1.2); }              // 温柔：手滑，被打中后更慌所以更容易手滑
        if (game.call != null && !wild) lane = rnd() < 0.5 ? game.call : 1 - game.call;
        real = !wild && rnd() < pr; fake = !wild && !real && rnd() < pf;
        var oc = el(".char.o"); if (oc) oc.classList.remove("fume");
        game.phase = "defend"; game.bubble = ""; finishTyping();
        var bb0 = el(".bubble"); if (bb0) bb0.remove();                  // 球飞的时候对手不说话
        game.ball = { by: "opp", lane: lane, dur: D, wild: wild };
        setPose("o", "throw", 0); spawnBall();
        later(function () { fly("opp", D); snd("throwBall", "opp", D); }, 30);
        var tg = 1 - game.ball.lane;
        if (real || fake) {
          later(function () { var o = el(".char.o"); if (o) o.classList.add(tg ? "lean-r" : "lean-l"); }, D * 0.18);
          later(function () { var o = el(".char.o"); if (o) o.classList.remove("lean-l", "lean-r"); }, D * 0.62);
        }
        if (real) later(function () { game.ball.lane = tg; var b = el(".ball"), m = el(".mark"), s = el(".bsh"); if (b) b.style.left = LANE[tg] + "%"; if (s) s.style.left = LANE[tg] + "%"; if (m) m.style.left = LANE[tg] + "%"; }, D * 0.5);
        later(lockMe, D * 0.72);                       // 落地前最后一小段：位置锁定，来不及再换路
        later(function () { if (game && game.pose && game.pose.side === "o") setPose("o", null); }, 600);
        later(resolveDefend, D + 80);
      }
      function lockMe() {
        if (!game || game.phase !== "defend") return;
        game.locked = true;
        var m = el(".mark"); if (m) m.classList.add("locked");
        ctx.view.querySelectorAll(".two .btn").forEach(function (b) { b.disabled = true; });
        snd("lock");
      }
      function resolveDefend() {
        var b = game.ball, bl = b.lane, hit = !b.wild && game.lane.me === bl;
        game.phase = "after"; game.ball = null; game.splat = null; game.lost = null; game.fxo = null; game.pose = null; game.locked = false;
        if (hit) { game.hp.me--; game.fx = "me"; game.lost = "me"; game.streak = 0; say("hit"); snd("hit"); duck(); later(function () { snd("heart"); }, 170); }
        else {
          game.splat = { x: b.wild ? (bl ? 94 : 6) : LANE[bl], y: Y.meHit + 34 };
          if (b.wild) say(b.wild); else { game.streak++; say(game.streak >= 2 && game.style === "tsun" ? "annoy" : "dodge"); }
          snd("land"); hitDeco("front", bl);
        }
        show();
        later(function () { game.fx = null; game.splat = null; game.lost = null; game.fxo = null; if (game.hp.me <= 0) return finish("lose"); beginAttack(); }, 1600);
      }
      function beginAttack() {
        var ct = chargeMs();
        game.phase = "windup"; game.turn = "attack"; game.aim = null; game.bubble = ""; game.tell = null; game.F = rnd() < 0.5 ? 0 : 1; game.locked = false;
        game.pose = { side: "m", mode: "charge", ct: ct };
        ctx.render(); snd("charge", "m", ct);
        later(function () {                            // 蓄满：保持蓄力姿势，这时才能点左右
          game.phase = "attack"; game.pose = { side: "m", mode: "held", ct: ct };
          game.tell = rnd() < 0.7 ? game.F : 1 - game.F;       // 70% 的概率提示是真的
          ctx.render(); snd("ready");
          later(function () { game.tell = null; if (game.phase === "attack") ctx.render(); }, 1300);
          later(function () { if (game.phase === "attack" && game.aim == null) aim(rnd() < 0.5 ? 0 : 1); }, 3000);
        }, ct);
      }
      function aim(l) {
        game.aim = l; game.phase = "flight"; game.tell = null;
        // 你瞄准后，对手有概率反应过来躲到你瞄的反方向，越到后面概率越高
        var p = Math.min(0.6, 0.08 + 0.07 * (game.round - 1)), reacted = rnd() < p;
        if (reacted) game.F = 1 - l;
        game.pose = { side: "m", mode: "throw", ct: 0 };
        game.ball = { by: "me", lane: l, dur: 700 }; ctx.render();
        later(function () { fly("me", 700); snd("throwBall", "me", 700); }, 30);
        if (reacted) {
          later(function () { var o = el(".char.o"); if (o) o.classList.add(game.F ? "lean-r" : "lean-l"); }, 100);
          later(function () { var o = el(".char.o"); if (o) o.classList.remove("lean-l", "lean-r"); }, 340);
        }
        later(function () { game.lane.opp = game.F; var o = el(".char.o"), md = ctx.view.querySelectorAll(".mound"); if (o) o.style.left = LANE[game.F] + "%"; if (md[0]) md[0].style.left = LANE[game.F] + "%"; }, 260);
        later(function () { if (game && game.pose && game.pose.side === "m") setPose("m", null); }, 600);
        later(resolveAttack, 780);
      }
      function resolveAttack() {
        var hit = game.aim === game.F;
        game.phase = "after"; game.ball = null; game.splat = null; game.lost = null; game.fxo = null; game.pose = null;
        if (hit) { game.hp.opp--; game.fx = game.style === "cool" ? null : "opp"; game.lost = "opp"; game.react = true; say("gotHit"); snd("hit"); duck(); later(function () { snd("heart"); }, 170); }
        else { game.splat = { x: LANE[game.aim], y: Y.oppHit + 4 }; say("miss"); snd("land"); hitDeco("back", game.aim); }
        show();
        later(function () {
          game.fx = null; game.splat = null; game.lost = null; game.fxo = null;
          if (game.hp.opp <= 0) return finish("win");
          if (game.round >= MAX_ROUND) return finish(game.hp.me > game.hp.opp ? "win" : (game.hp.me < game.hp.opp ? "lose" : "draw"));
          game.round++; beginDefend();
        }, 2000);                                      // 一整轮打完，停久一点让你看清结果
      }
      function finish(r) {
        game.phase = "over"; game.over = r; game.ball = null; game.pose = null;
        say(r === "win" ? "oppLose" : (r === "lose" ? "oppWin" : "truce"));
        var s = rec(game.c); if (r === "win") s.win++; if (r === "lose") s.lose++; if (r === "draw") s.draw++;
        s.last = r;
        if (r === "draw" && !s.truce) { s.truce = true; roche.ui.toast("解锁隐藏结局：握手言和"); }
        ctx.save(); show();
        if (r === "win") { snd("win"); duck(); } else if (r === "lose") { snd("lose"); duck(); } else { snd("ready"); }
      }
      function leave() { clearAll(); game = null; }

      // ---------- 视图 ----------
      function decoHtml() {
        var g = game, f = g.fxo;
        function A(id) { return f && f.id === id; }
        function sw(id) { return A(id) ? " anim-sway" : ""; }
        function hp(id) { return A(id) ? " anim-hop" : ""; }
        function tilt(id, st2, svg) {
          var lv = g.deco[id], p = A(id) ? f.prev : lv, ang = ANG[id];
          return '<div class="deco tilt d-' + id + (A(id) ? " knock" : "") + '" style="' + st2 + ';--a0:' + ang[p] + 'deg;--a1:' + ang[lv] + 'deg">' + svg + '</div>';
        }
        var lv = g.deco.sm, p = A("sm") ? f.prev : lv, h0 = HEAD[p], h1 = HEAD[lv];
        return '<div class="deco d-lt' + (A("lt") ? " hit" : "") + '" style="left:0;right:0;top:40px;height:56px">' + lightsHtml() + '</div>' +
          '<div class="deco d-tl' + sw("tl") + '" style="left:-4px;top:80px;width:66px;height:104px">' + ART.tree + drops() + '</div>' +
          '<div class="deco d-tr' + sw("tr") + '" style="right:-6px;top:86px;width:60px;height:94px">' + ART.tree + drops() + '</div>' +
          '<div class="deco d-gl' + hp("gl") + '" style="left:42px;top:148px;width:52px;height:36px">' + ART.gifts + '</div>' +
          '<div class="deco d-gr' + hp("gr") + '" style="right:40px;top:150px;width:48px;height:33px">' + ART.gifts + '</div>' +
          '<div class="deco d-pl' + hp("pl") + '" style="left:6px;top:292px;width:52px;height:36px">' + ART.piles + '</div>' +
          tilt("sh", "left:8px;top:386px;width:26px;height:64px", ART.shovel) +
          tilt("sg", "right:6px;top:322px;width:54px;height:81px", ART.sign) +
          '<div class="deco d-sm' + (A("sm") ? " knock" : "") + '" style="right:4px;top:416px;width:58px;height:88px;--x0:' + h0[0] + 'px;--y0:' + h0[1] + 'px;--r0:' + h0[2] + 'deg;--x1:' + h1[0] + 'px;--y1:' + h1[1] + 'px;--r1:' + h1[2] + 'deg">' + ART.snowman + '</div>';
      }
      function charHtml(side, img, name) {
        var g = game, lane = side === "o" ? g.lane.opp : g.lane.me, pose = g.pose && g.pose.side === side ? g.pose : null;
        var shake = (side === "o" && g.fx === "opp") || (side === "m" && g.fx === "me");
        var fxs = side === "o" && STY_FX[g.style] ? ";--fx:" + STY_FX[g.style] : "";
        var badge = side === "o" && STY_GLYPH[g.style] ? '<i class="sty-badge s-' + g.style + '">' + STY_GLYPH[g.style] + '</i>' : "";
        return '<div class="char ' + side + (pose ? " " + pose.mode : "") + (side === "o" && g.angry ? " fume" : "") + '" style="left:' + LANE[lane] + '%' + (pose && pose.ct ? ';--ct:' + pose.ct + 'ms' : "") + fxs + '"><div class="aura">' + AURA + '</div>' + badge +
          '<div class="body"><div class="av2' + (shake ? " shake" : "") + '">' + avatar(img, name) + (shake ? '<i class="splat"></i>' : "") + '</div></div></div>';
      }
      function arenaHtml() {
        var g = game, c = g.c, ph = g.phase, u = st.user || {};
        var turn = g.turn === "defend" ? "我方防守" : (g.turn === "attack" ? "我方进攻" : "准备");
        var hearts = function (n, side) { var s = ""; for (var i = 0; i < 5; i++) s += (g.lost === side && i === n) ? brokenHeart() : heart(i < n); return s; };
        var h = '<div class="aw" style="--s:' + fitScale() + '"><div class="ab"><div class="arena">' + DEFS + '<div class="hill"></div>' + decoHtml() + '<div class="rb">第 ' + g.round + '/' + MAX_ROUND + ' 回合 · ' + turn + '</div>' +
          '<div class="hp o">' + e(ctx.nm(c)) + ' ' + hearts(g.hp.opp, "opp") + '</div>' +
          '<div class="mound o" style="left:' + LANE[g.lane.opp] + '%;top:128px"></div>' + charHtml("o", c.avatar, ctx.nm(c)) +
          '<div class="mound" style="left:' + LANE[g.lane.me] + '%;top:442px"></div>' + charHtml("m", u.avatar, ctx.userName()) +
          '<div class="hp m">' + e(ctx.userName()) + ' ' + hearts(g.hp.me, "me") + '</div>';
        if (g.ball) h += ballHtml();
        if (g.splat) h += splatHtml(g.splat.x, g.splat.y);
        if (g.tell != null) h += '<div class="tell" style="left:' + LANE[g.tell] + '%">↓ 打这边</div>';
        if (g.bubble && !g.over) h += '<div class="bubble">' + e(g.bubble) + '</div>';
        if (ph === "intro" && TIP[g.style]) h += '<div class="intro-tip">' + e(TIP[g.style]) + '</div>';
        if (g.over === "draw") {
          h += '<div class="res hs"><div class="hs-hill"></div><div class="hs-t"><h3 class="en">Truce</h3><div class="zh">握 手 言 和</div></div>' +
            (g.bubble ? '<div class="hs-bub"><div class="bubble">' + e(g.bubble) + '</div></div>' : "") +
            '<div class="hs-row"><div class="hs-av l">' + avatar(u.avatar, ctx.userName()) + '</div><div class="hs-mid">' + heart(true) + '</div><div class="hs-av r">' + avatar(c.avatar, ctx.nm(c)) + '</div></div>' +
            '<div class="hs-btn"><button class="btn" data-act="snow.again">再来一局</button></div></div>';
        } else if (g.over) {
          var t = g.over === "win" ? "你赢啦" : "你输了";
          h += '<div class="res"><h3 class="en">' + t + '</h3>' + (g.bubble ? '<div class="bubble">' + e(g.bubble) + '</div>' : "") +
            '<div><button class="btn" data-act="snow.again">再来一局</button></div></div>';
        }
        if (g.paused) h += PAUSE_HTML;
        h += '</div></div></div>';
        var def = g.turn === "defend" && (ph === "windup" || ph === "defend") && !g.locked, att = ph === "attack", isAtt = g.turn === "attack";
        var hint = def ? "躲到另一边！" : (isAtt && ph === "windup" ? "蓄力中…" : (att ? "点一边扔过去" : ""));
        h += '<div class="two"><button class="btn" data-act="snow.lane" data-l="0"' + (def || att ? "" : " disabled") + '>' + (isAtt ? "← 打左边" : "← 往左躲") + '</button>' +
          '<button class="btn" data-act="snow.lane" data-l="1"' + (def || att ? "" : " disabled") + '>' + (isAtt ? "打右边 →" : "往右躲 →") + '</button></div>' +
          '<p class="gh">' + hint + '</p>';
        return h;
      }
      function rulesHtml() {
        var go = rules.c;
        return '<ul class="rl">' +
          '<li><i>1</i><span><b>胜负</b><small>每人 5 颗心，最多 ' + MAX_ROUND + ' 回合。先打光对方的心就赢；打满回合则心多的赢。</small></span></li>' +
          '<li><i>2</i><span><b>谁在扔，看颜色</b><small>对手头像发出红光蓄力，就是它要扔了，你防守；你的头像发出蓝白光蓄力，轮到你进攻。红色的球是它的，蓝白的球是你的。</small></span></li>' +
          '<li><i>3</i><span><b>我方防守</b><small>地上的红圈是落点，点按钮躲到另一边。球落地前的最后一刻，位置会锁定，要早点躲。越到后面它越爱变招：球在半空会突然换边，换之前头像会先偏一下，但后面它也会假装偏！</small></span></li>' +
          '<li><i>4</i><span><b>我方进攻</b><small>等你蓄满，才能点左或右扔出去。对手会指一边说「↓ 打这边」，但不一定说真话。你扔出去之后，它有机会反应过来躲开，越到后面越会躲。</small></span></li>' +
          '<li><i>5</i><span><b>被打中 / 打偏</b><small>被打中会碎掉一颗心。雪球扔偏了，会砸到后面的东西：树会抖，灯泡会晃，木牌、雪人会被砸歪。</small></span></li></ul>' +
          '<div class="center"><button class="btn" data-act="snow.ok">' + (go ? "明白了，开战" : "知道了") + '</button></div>';
      }
      // ---------- 战绩分享：战绩卡图片 + 文字 + 可选角色评价（只在插件里生成，不写进 Roche 主记忆）----------
      function styleOf(c) { var S = (c && st.d.snowStyle && st.d.snowStyle[c.id]) || {}; return S.manual || S.auto || "normal"; }
      function rateOf(r) { var n = r.win + r.lose + r.draw; return n ? Math.round(r.win / n * 100) : 0; }
      function evalOf(c) { var x = c && st.d.snowEval && st.d.snowEval[c.id]; return (x && x.text) || ""; }
      function lastWord(r, c) { return r.last === "win" ? ctx.userName() + " 赢了" : (r.last === "lose" ? ctx.nm(c) + " 赢了" : (r.last === "draw" ? "平局" : "还没打过")); }
      function recLine(r) { return r.win + " 胜 " + r.lose + " 负" + (r.draw ? " " + r.draw + " 平" : ""); }
      function shareText(c) {
        var r = rec(c), ev = evalOf(c), d = new Date();
        var t = "【雪仗战绩】" + ctx.userName() + " VS " + ctx.nm(c) + "\n战绩：" + recLine(r) + "（胜率 " + rateOf(r) + "%）\n对手风格：" + STY_NAME[styleOf(c)] + "\n最近一局：" + lastWord(r, c) +
          (r.truce ? "\n隐藏结局：握手言和（已解锁）" : "") + "\n" + d.getFullYear() + " 年 " + (d.getMonth() + 1) + " 月 " + d.getDate() + " 日";
        return ev ? t + "\n\n" + ctx.nm(c) + " 的评价：" + ev : t;
      }
      function urlToBlob(du) {
        var p = du.split(","), m = /data:([^;]+)/.exec(p[0]), b = atob(p[1]), u = new Uint8Array(b.length), i;
        for (i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
        return new Blob([u], { type: m ? m[1] : "image/png" });
      }
      // 外链头像如果不允许跨域，会加载失败或画布被污染：这里都退回成首字母，保证图一定能生成
      function loadImg(src) {
        return new Promise(function (ok) {
          if (!src) return ok(null);
          var im = new Image(), done = false;
          function fin(v) { if (!done) { done = true; ok(v); } }
          if (!/^(data:|blob:)/.test(src)) im.crossOrigin = "anonymous";
          im.onload = function () { fin(im); }; im.onerror = function () { fin(null); };
          setTimeout(function () { fin(null); }, 4000);
          im.src = src;
        });
      }
      function wrapLines(g, text, maxW) {
        var out = [];
        String(text).split("\n").forEach(function (para) {
          var line = "", i;
          for (i = 0; i < para.length; i++) {
            var ch = para.charAt(i);
            if (line && g.measureText(line + ch).width > maxW) { out.push(line); line = ch; } else line += ch;
          }
          out.push(line);
        });
        return out;
      }
      function drawAvatar(g, im, name, cx, cy, r, ring) {
        g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.closePath(); g.clip();
        if (im) { var k = Math.max(2 * r / im.width, 2 * r / im.height), w = im.width * k, h = im.height * k; g.drawImage(im, cx - w / 2, cy - h / 2, w, h); }
        else {
          g.fillStyle = "#6a4a2a"; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
          g.fillStyle = "#f3e6c8"; g.font = "bold " + Math.round(r * 0.9) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(name || "?").slice(0, 1), cx, cy + 2);
        }
        g.restore();
        g.lineWidth = 6; g.strokeStyle = ring; g.beginPath(); g.arc(cx, cy, r + 3, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 3; g.strokeStyle = "#5a3a20"; g.beginPath(); g.arc(cx, cy, r + 8, 0, Math.PI * 2); g.stroke();
      }
      async function drawCard(c, useImg) {
        var W = 720, r = rec(c), un = ctx.userName(), cn = ctx.nm(c), ev = evalOf(c), sty = styleOf(c), u = st.user || {}, d = new Date();
        var imU = useImg ? await loadImg(u.avatar) : null, imC = useImg ? await loadImg(c.avatar) : null;
        var FONT = '"Iowan Old Style","Palatino","Songti SC","STSong","Noto Serif SC",Georgia,serif', KAI = '"KaiTi","STKaiti","Kaiti SC",serif';
        var cv = document.createElement("canvas"), g = cv.getContext("2d"), evLines = [];
        function cut(n) { n = String(n); return n.length > 8 ? n.slice(0, 8) + "…" : n; }
        if (ev) { g.font = "26px " + KAI; evLines = wrapLines(g, ev, W - 120); }
        var yEnd = 548 + (r.truce ? 34 : 0), H = yEnd + (ev ? 70 + evLines.length * 42 + 10 : 0) + 84;
        cv.width = W; cv.height = H;
        var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#f7ecd2"); bg.addColorStop(1, "#e8d4a6"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
        vg.addColorStop(0, "rgba(150,100,40,0)"); vg.addColorStop(1, "rgba(150,100,40,.35)"); g.fillStyle = vg; g.fillRect(0, 0, W, H);
        g.strokeStyle = "#8a5a1c"; g.lineWidth = 4; g.strokeRect(20, 20, W - 40, H - 40); g.lineWidth = 1.5; g.strokeRect(32, 32, W - 64, H - 64);
        g.textAlign = "center"; g.textBaseline = "alphabetic";
        g.fillStyle = "#a3293a"; g.font = "italic 46px " + FONT; g.fillText("Snowball Fight", W / 2, 112);
        g.fillStyle = "#7a5a3a"; g.font = "22px sans-serif"; g.fillText("雪 仗 战 绩", W / 2, 150);
        drawAvatar(g, imU, un, 200, 250, 62, "#9cc4f2"); drawAvatar(g, imC, cn, 520, 250, 62, "#c9535f");
        g.textAlign = "center"; g.textBaseline = "alphabetic";
        g.fillStyle = "#a3293a"; g.font = "italic bold 54px " + FONT; g.fillText("VS", W / 2, 268);
        g.fillStyle = "#4a2c14"; g.font = "bold 26px sans-serif"; g.fillText(cut(un), 200, 362); g.fillText(cut(cn), 520, 362);
        g.font = "bold 50px " + FONT; g.fillText(r.win + " 胜   " + r.lose + " 负" + (r.draw ? "   " + r.draw + " 平" : ""), W / 2, 436);
        g.fillStyle = "#7a5a3a"; g.font = "24px sans-serif"; g.fillText("胜率 " + rateOf(r) + "%", W / 2, 474);
        g.font = "22px sans-serif"; g.fillText("对手风格：" + STY_NAME[sty] + "　·　最近一局：" + lastWord(r, c), W / 2, 518);
        if (r.truce) { g.fillStyle = "#a3293a"; g.fillText("隐藏结局：握手言和（已解锁）", W / 2, 552); }
        if (ev) {
          var y = yEnd + 24;
          g.strokeStyle = "rgba(90,58,24,.45)"; g.lineWidth = 1; g.beginPath(); g.moveTo(60, y); g.lineTo(W - 60, y); g.stroke();
          g.fillStyle = "#7a5a3a"; g.font = "20px sans-serif"; g.textAlign = "center"; g.fillText("— " + cut(cn) + " 的评价 —", W / 2, y + 36);
          g.fillStyle = "#3a2410"; g.font = "26px " + KAI; g.textAlign = "left";
          evLines.forEach(function (ln, i) { g.fillText(ln, 60, y + 86 + i * 42); });
        }
        g.textAlign = "center"; g.fillStyle = "#9a7a55"; g.font = "18px sans-serif";
        g.fillText(d.getFullYear() + "." + (d.getMonth() + 1) + "." + d.getDate() + "　圣诞小屋", W / 2, H - 52);
        return cv.toDataURL("image/png");
      }
      async function buildCard(c, sig) {
        share.building = true;
        try {
          var url;
          try { url = await drawCard(c, true); } catch (err) { url = await drawCard(c, false); }
          if (share) { share.img = url; share.err = ""; }
        } catch (err) { if (share) share.err = String(err && err.message || err); }
        if (share) { share.sig = sig; share.building = false; ctx.render(); }
      }
      function shareHtml() {
        var c = ctx.curChar(), h = ctx.picker(false);
        if (!c) return h + '<p class="hint">还没有角色。</p>';
        var r = rec(c), n = r.win + r.lose + r.draw, ev = evalOf(c), pe = st.jobs["snow:eval:" + c.id];
        var sig = [c.id, r.win, r.lose, r.draw, r.last, r.truce, styleOf(c), ev, (st.user && st.user.avatar || "").length, (c.avatar || "").length].join("|");
        if (share.sig !== sig && !share.building) buildCard(c, sig);
        h += '<p class="hint">' + (n ? "战绩卡会按当前战绩自动绘制，可以保存成图片，或复制文字发到聊天里。" : "还没有战绩，先去打一局吧。") + '</p>' +
          '<div class="center">' + (share.img ? '<img class="cardimg" src="' + share.img + '" alt="战绩卡">' : ctx.wait("正在绘制战绩卡…")) + '</div>' +
          '<div class="two"><button class="btn" data-act="snow.saveImg"' + (share.img ? "" : " disabled") + '>保存 / 分享图片</button><button class="btn" data-act="snow.copyTxt">复制文字</button></div>' +
          '<p class="hint" style="text-align:center">手机上也可以长按图片直接保存。</p>' +
          '<div class="evbox"><b>角色评价（可选）</b><small>调用一次模型，让 ' + e(ctx.nm(c)) + ' 用自己的口吻点评这份战绩，会写进战绩卡和文字里。</small>';
        if (pe) h += ctx.wait("TA 正在写评价，你可以先去别处逛逛");
        else if (!ev) h += '<div class="center" style="margin:6px 0"><button class="btn sm" data-act="snow.eval">生成评价</button></div>';
        else h += '<div class="row"><input class="in" data-in="snowOpinion" maxlength="60" placeholder="对评价有意见？比如：再傲娇一点" value="' + e(st.snowOpinion || "") + '"><button class="btn sm" data-act="snow.eval">重写</button></div>' +
          '<div class="center" style="margin:0"><button class="link" data-act="snow.evalDel">删除评价</button></div>';
        return h + '</div>';
      }
      function cleanHtml() {
        var c = ctx.curChar(), h = ctx.picker(false);
        function row(w, t, d) { return '<div class="set"><div><b>' + t + '</b><small>' + d + '</small></div><button class="btn ghost sm" data-act="snow.cl" data-w="' + w + '">清除</button></div>'; }
        if (!c) return h + '<p class="hint">还没有角色。</p>';
        var r = rec(c);
        return h + '<p class="hint">当前角色：' + e(ctx.nm(c)) + '　战绩 ' + r.win + ' 胜 ' + r.lose + ' 负' + (r.draw ? ' ' + r.draw + ' 平' : '') + (r.truce ? '　已解锁握手言和' : '') + '</p><div class="cl">' +
          row("rec", "清除战绩", "这个角色的胜负平记录清零，战绩评价也一起清") + row("lines", "清除台词和风格", "已备好的台词、自动和手动风格都删掉，之后可重新准备") +
          row("truce", "清除隐藏结局记录", "「握手言和」重新算未解锁") + row("char", "清除这个角色的全部雪仗数据", "上面三项一起清") +
          row("all", "清空所有角色的战绩", "每个角色的战绩和隐藏结局记录；台词和风格保留") + '</div>';
      }
      function setup() {
        var c = ctx.curChar(), L = c && lines(c), pend = c && st.jobs["snow:" + c.id], u = st.user || {}, s = rec(c);
        var S = (c && st.d.snowStyle && st.d.snowStyle[c.id]) || {}, sty = S.manual || S.auto || "normal", note;
        if (pend) note = '<i class="nd"></i>' + e(lineMsg || "正在准备台词…") + '<br>可以先去别处逛逛，好了会提醒你';
        else if (L) note = '台词已备好，不会再花钱。<br><button class="link" data-act="snow.style">对手风格：' + STY_NAME[sty] + (S.manual ? "（手动）" : "（自动判断）") + ' · 点此更改</button>';
        else note = '不准备台词也能开战，会用通用台词；<br>准备一次要调用一次模型，之后永久缓存。';
        function side(img, name, tag, cls, badge) { return '<div class="vs-side ' + cls + '"><div class="vs-pt">' + avatar(img, name) + '</div>' + (badge || "") + '<b>' + e(name) + '</b><small>' + tag + '</small></div>'; }
        var h = '<div class="sel-zone">' + ctx.picker(false) + '</div><div class="vs-zone"><div class="vs-wrap">' +
          '<div class="vs">' + side(u.avatar, ctx.userName(), "我 方", "L") + '<div class="vs-mk en">VS</div>' + side(c && c.avatar, ctx.nm(c), "对 手", "R", STY_GLYPH[sty] ? '<i class="sty-badge s-' + sty + '" style="right:calc(50% - 58px);top:-8px">' + STY_GLYPH[sty] + '</i>' : "") + '</div>' +
          '<div class="vs-st"><div class="vs-rec"><i>' + s.win + '</i> 胜　<i>' + s.lose + '</i> 负' + (s.draw ? '　<i>' + s.draw + '</i> 平' : "") + '</div></div>' +
          '<div class="vs-btns"><button class="btn big" data-act="snow.go"' + (c ? "" : " disabled") + '>开 战</button>' +
          '<div class="vs-sub"><button class="btn ghost sm" data-act="snow.rules">玩法说明</button>' +
          '<button class="btn ghost sm" data-act="snow.lines"' + (pend ? " disabled" : "") + '>' + (pend ? "准备中" : (L ? "重新准备台词" : "准备台词")) + '</button>' +
          '<button class="btn ghost sm" data-act="snow.clean">清理数据</button></div>' +
          '<p class="vs-note">' + note + '</p></div>' +
          '<div class="vol"><label><span>音乐</span><input type="range" min="0" max="100" step="5" value="' + musicVol() + '" data-vol="music"' + (R.duck ? "" : " disabled") + '><em>' + musicVol() + '%</em></label>' +
          '<label><span>音效</span><input type="range" min="0" max="100" step="5" value="' + sfxVol() + '" data-vol="sfx"><em>' + sfxVol() + '%</em></label>' +
          (R.duck ? "" : '<small>音乐音量还没接上唱片机（需要在 record.js 加一行，见更新说明）</small>') + '</div></div></div>';
        return h;
      }

      return {
        init: function () { SFX.setVol(sfxVol() / 100); applyMusic(1); },
        destroy: function () { clearAll(); document.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); document.removeEventListener("visibilitychange", onVis); ctx.root.removeEventListener("input", onRange); ctx.root.removeEventListener("change", onRangeDone); },
        back: function () { if (share) { share = null; return true; } if (rules) { rules = null; return true; } if (cleanOpen) { cleanOpen = false; return true; } if (game) leave(); return false; },
        view: function () {
          if (!game && share) return ctx.page("Record Card", "战 绩 分 享", shareHtml());
          var html = ctx.page("Snowball Fight", "雪 仗", game ? arenaHtml() : (rules ? rulesHtml() : (cleanOpen ? cleanHtml() : setup())));
          if (!game && !rules && !cleanOpen) html = html.replace('</div></div></div><div class="sheet">', '</div></div><button class="gbtn" style="margin-left:auto" data-act="snow.share" aria-label="战绩分享">' + SHARE_ICON + '</button></div><div class="sheet">');
          return html;
        },
        act: async function (name, el0) {
          var c = ctx.curChar();
          if (soundOn()) { SFX.init(); if (name !== "lines") SFX.tick(); }   // 音频要在点击里解锁；按钮轻响
          if (name === "go") {
            if (!c) return roche.ui.toast("请先选一个对手");
            if (!st.d.snowSeen) { rules = { c: c }; return ctx.render(); }   // 第一次开战先讲规则
            return start(c);
          }
          if (name === "rules") { rules = { c: null }; return ctx.render(); }
          if (name === "ok") {
            var cc = rules && rules.c; rules = null;
            if (!st.d.snowSeen) { st.d.snowSeen = true; ctx.save(); }
            return cc ? start(cc) : ctx.render();
          }
          if (name === "again") { var c2 = game && game.c; leave(); return c2 ? start(c2) : ctx.render(); }
          if (name === "lane") return doLane(+el0.dataset.l);
          if (name === "resume") return resumeGame();
          if (name === "share") { if (!c) return roche.ui.toast("请先选一个角色"); share = { img: "", sig: "", building: false, err: "" }; return ctx.render(); }
          if (name === "saveImg") {
            if (!share || !share.img) return;
            try {
              var file = new File([urlToBlob(share.img)], "snow-record.png", { type: "image/png" });
              if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
            } catch (err) { if (err && err.name === "AbortError") return; }
            var lk = document.createElement("a"); lk.href = share.img; lk.download = "snow-record.png"; document.body.appendChild(lk); lk.click(); lk.remove();
            return roche.ui.toast("如果没有保存下来，请长按图片保存");
          }
          if (name === "copyTxt") {
            if (!c) return;
            var tx = shareText(c), okc = false;
            try { await navigator.clipboard.writeText(tx); okc = true; } catch (err) {
              var ta = document.createElement("textarea"); ta.value = tx; ta.style.cssText = "position:fixed;left:-999px;top:0"; document.body.appendChild(ta); ta.select();
              try { okc = document.execCommand("copy"); } catch (e2) { okc = false; } ta.remove();
            }
            return roche.ui.toast(okc ? "已复制，可以粘贴到聊天里" : "复制失败，请长按图片保存，或手动抄写");
          }
          if (name === "evalDel") {
            if (!c || !evalOf(c)) return;
            if (!(await roche.ui.confirm({ title: "删除评价", message: "确定删除 " + ctx.nm(c) + " 的战绩评价吗？" }))) return;
            if (st.d.snowEval) delete st.d.snowEval[c.id];
            ctx.save(); return ctx.render();
          }
          if (name === "eval") {
            if (!c) return roche.ui.toast("请先选一个角色");
            var r1 = rec(c), old = evalOf(c);
            if (r1.win + r1.lose + r1.draw === 0) return roche.ui.toast("还没有战绩，先打一局吧");
            if (old && !(await roche.ui.confirm({ title: "重写评价", message: "会再调用一次模型，现在的评价会被替换。确定吗？" }))) return;
            var op = String(st.snowOpinion || "").trim();
            ctx.job("snow:eval:" + c.id, "snow", "战绩评价", async function () {
              var l = await ctx.context(c), un = ctx.userName(), r2 = rec(c);
              var pro = "你刚和" + un + "打完几场友好的雪仗。战绩：对方（" + un + "）赢了 " + r2.win + " 场，你赢了 " + r2.lose + " 场，平局 " + r2.draw + " 场；最近一局" + (r2.last === "win" ? "对方赢了" : (r2.last === "lose" ? "你赢了" : (r2.last === "draw" ? "是平局" : "还没打过"))) +
                "。你自己在雪仗里的风格是" + STY_NAME[styleOf(c)] + "。请以你自己的口吻，对这份战绩发表一段评价。要主观、带情绪、有偏心，可以得意、不服气、吐槽、夸对方或心疼对方，千万不要客观中立地总结数据，不要分点，80-150 个字，直接输出正文。";
              if (old && op) pro += "\n你上一版评价是：" + old + "\n对方的意见是：" + op + "\n请按意见重写，仍然保持主观、有情绪。";
              var t = String(await ctx.ask(ctx.sysFor(c, l), pro, false)).trim().slice(0, 400);
              if (!t) throw new Error("没有收到评价，再试一次");
              st.d.snowEval = st.d.snowEval || {}; st.d.snowEval[c.id] = { text: t, at: Date.now() }; st.snowOpinion = "";
            });
            return;
          }
          if (name === "clean") { cleanOpen = true; return ctx.render(); }
          if (name === "cl") {
            var w = el0.dataset.w, T = { rec: "清除战绩", lines: "清除台词和风格", truce: "清除隐藏结局记录", char: "清除全部雪仗数据", all: "清空所有角色的战绩" };
            if (w !== "all" && !c) return roche.ui.toast("请先选一个角色");
            if (!(await roche.ui.confirm({ title: T[w], message: "确定要" + T[w] + "吗？范围：" + (w === "all" ? "所有角色" : "「" + ctx.nm(c) + "」") + "。清掉就找不回来了。" }))) return;
            if (w === "all") { st.d.snowRec = {}; st.d.snowEval = {}; }
            else {
              var r0 = rec(c);
              if (w === "rec" || w === "char") { r0.win = 0; r0.lose = 0; r0.draw = 0; r0.last = null; if (st.d.snowEval) delete st.d.snowEval[c.id]; }
              if (w === "truce" || w === "char") r0.truce = false;
              if (w === "lines" || w === "char") { if (st.d.snowLines) delete st.d.snowLines[c.id]; if (st.d.snowStyle) delete st.d.snowStyle[c.id]; }
            }
            ctx.save(); roche.ui.toast("已清除"); return ctx.render();
          }
          if (name === "style") {
            if (!c) return;
            var ST = st.d.snowStyle = st.d.snowStyle || {}, S2 = ST[c.id] = ST[c.id] || {};
            S2.manual = STY_ORDER[(STY_ORDER.indexOf(S2.manual || null) + 1) % STY_ORDER.length];
            ctx.save(); return ctx.render();
          }
          if (name === "lines") {
            if (!c) return roche.ui.toast("请先选一个角色");
            if (lines(c) && !(await roche.ui.confirm({ title: "重新准备台词", message: "会再调用一次模型，现有台词和自动判断的风格会被替换（手动选的风格会保留）。确定吗？" }))) return;
            ctx.job("snow:" + c.id, "snow", "雪仗台词", async function () {
              lineMsg = "正在读取记忆（1/3）…"; ctx.render();
              var l = await ctx.context(c);
              lineMsg = "正在组织请求（2/3）…"; ctx.render();
              var keys = '"style":"normal",' + Object.keys(EV).map(function (k) { return '"' + k + '":["台词","台词","台词"]'; }).join(","), un = ctx.userName();
              lineMsg = "等 TA 想台词（3/3）…"; ctx.render();
              var j = await ctx.ask(ctx.sysFor(c, l), "你正在和" + un + "打一场友好的雪仗。以下台词全部是你（角色本人）说给对方听的，注意视角：「你」指你自己，「对方」指" + un + "。" +
                "请先根据你的人设判断自己在雪仗里的风格，写进 style，只能是这五个之一：tricky（腹黑狡诈）、tsun（傲娇）、gentle（温柔笨拙）、cool（高冷寡言）、normal（普通）。" +
                "再写你在雪仗里的短台词，只输出 JSON：{" + keys + "}。各键含义：" + Object.keys(EV).map(function (k) { return k + "=" + EV[k]; }).join("；") +
                "。每个键 3 条，每条不超过 15 个字，符合你的性格和风格，要有感情、有趣、像真人；被打中（gotHit）要体现风格：tsun 反应夸张炸毛，cool 几乎没反应（一两个字），gentle 慌乱又关心对方；cool 风格话少，但每个键都必须有台词；" +
                "wild、annoy 只有 tsun 风格才写，slip 只有 gentle 风格才写，callL、callR、shrug 只有 tricky 风格才写，其他风格这几个键给空数组 []；" +
                "句末不要用句号，可以用问号、感叹号、省略号或不加标点；不要出现疼、痛、伤等字眼。", true);
              var out = {};
              Object.keys(EV).forEach(function (k) { out[k] = (Array.isArray(j[k]) ? j[k] : []).map(function (x) { return String(x).replace(/[。.]+$/, "").slice(0, 24); }).filter(Boolean).slice(0, 3); });
              var sy = String(j.style || "").toLowerCase(); if (!STY_NAME[sy]) sy = "normal";
              st.d.snowStyle = st.d.snowStyle || {}; st.d.snowStyle[c.id] = st.d.snowStyle[c.id] || {}; st.d.snowStyle[c.id].auto = sy;
              st.d.snowLines = st.d.snowLines || {}; st.d.snowLines[c.id] = out; lineMsg = "";
            });
          }
        }
      };
    }
  });
})();