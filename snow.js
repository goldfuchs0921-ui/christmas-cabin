/* snow.js — 雪仗：回合制（我方防守 / 我方进攻），5 颗心，最多 8 回合
 * 台词：进入前一次性预生成并缓存（每个角色只花一次钱），游戏中按事件类型挑，所以台词和画面一定对得上
 * 形象：对手用角色头像，我方用你的人设头像；不用生图
 * v1.4.2 第二批：新场景（天空缩到约 1/5，对手站在雪地边缘，代码画的树/礼物/栅栏/木牌/雪人/灯串）
 *   雪球落点上移 / 变招前摇（对手头像先偏一下，后期会假装）/ 砸偏会砸歪背景物件 / 全部代码合成的音效 */
(function () {
  "use strict";
  var R = window.RCC;
  var LANE = [27, 73];                 // 左右两条路的横向位置（%）
  var MAX_ROUND = 8;
  var Y = { oppBall: 116, oppHit: 108, meBall: 384, meHit: 412, mark: 430 };   // 雪球起点/落点的纵向位置（px）
  var EV = { start: "开局", throw: "出手扔雪球", dodge: "我方躲开了", hit: "打中了我方", gotHit: "被我方打中", miss: "我方扔偏了", oppWin: "你赢了整场", oppLose: "你输了整场" };
  var DEF = {
    start: ["准备好了吗？", "来打雪仗吧！", "别想跑！"], throw: ["接招！", "看球！", "小心啦！"],
    dodge: ["哎，躲开了！", "溜得真快！", "下次一定！"], hit: ["打中啦！", "漂亮！", "嘿嘿，中了！"],
    gotHit: ["哇，被打中了！", "好球！", "这下扯平了！"], miss: ["差一点！", "嘿，没中吧！", "我躲开啦！"],
    oppWin: ["我赢啦！", "承让承让！", "再来一局？"], oppLose: ["我认输！", "你好厉害！", "下次不会输！"]
  };
  var SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="#8a5a1c" stroke-width="2.2"><circle cx="24" cy="30" r="12" fill="rgba(255,255,255,.7)"/><circle cx="24" cy="14" r="8" fill="rgba(255,255,255,.7)"/><path d="M22 14h5" stroke="#c9742a"/></svg>';
  function heart(on) { return '<svg viewBox="0 0 24 24" width="17" height="17"><path d="M12 21s-8-5.6-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.4-8 11-8 11z" fill="' + (on ? "#c23a4c" : "rgba(60,40,20,.25)") + '" stroke="' + (on ? "#6e1522" : "rgba(60,40,20,.4)") + '" stroke-width="1"/></svg>'; }
  // 刚掉的那颗心：底下是灰心，红心裂成两半掉下去
  function brokenHeart() { return '<span class="hbk">' + heart(false) + '<span class="hl">' + heart(true) + '</span><span class="hr">' + heart(true) + '</span></span>'; }
  // 飞溅：一圈雪粒 + 一滩雪渍
  function splatHtml(x, y) {
    var s = '<div class="spl" style="left:' + x + '%;top:' + y + 'px"><b></b>';
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2 + Math.random() * 0.5, d = 22 + Math.random() * 22;
      s += '<i style="--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d * 0.8 - 6) + 'px"></i>';
    }
    return s + '</div>';
  }

  // ---------- 背景物件（代码画的 SVG；以后想换图，在这里把对应的 SVG 换成图片即可）----------
  var ART = {
    tree: '<svg viewBox="0 0 70 110"><rect x="30" y="88" width="10" height="20" fill="#6b4524" stroke="#3c2410" stroke-width="1.6"/><path d="M35 4L52 34H44L60 60H50L68 90H2L20 60H10L26 34H18Z" fill="#3f7a4d" stroke="#1f4a2c" stroke-width="2" stroke-linejoin="round"/><path d="M35 8L42 20Q35 17 28 20ZM20 38Q35 33 50 38L47 42Q35 38 23 42ZM14 66Q35 60 56 66L54 71Q35 66 16 71Z" fill="#fff" opacity=".92"/></svg>',
    gifts: '<svg viewBox="0 0 56 36"><rect x="2" y="12" width="24" height="23" rx="2" fill="#b3283a" stroke="#6e1522" stroke-width="1.5"/><rect x="12" y="12" width="4" height="23" fill="#f3d27a"/><rect x="2" y="21" width="24" height="4" fill="#f3d27a"/><path d="M14 12Q6 2 5 9Q6 13 14 12Q22 13 23 9Q22 2 14 12Z" fill="#f3d27a" stroke="#a8741c" stroke-width="1"/><rect x="30" y="19" width="22" height="16" rx="2" fill="#2f6b43" stroke="#173a24" stroke-width="1.5"/><rect x="39" y="19" width="4" height="16" fill="#e9c35f"/><path d="M41 19Q35 11 34 16Q35 20 41 19Q47 20 48 16Q47 11 41 19Z" fill="#e9c35f" stroke="#a8741c" stroke-width="1"/></svg>',
    piles: '<svg viewBox="0 0 56 38"><g fill="#fff" stroke="#b9c9e0" stroke-width="1.5"><circle cx="22" cy="20" r="15"/><circle cx="43" cy="28" r="8"/><circle cx="10" cy="31" r="6"/></g></svg>',
    shovel: '<svg viewBox="0 0 26 64"><rect x="11" y="6" width="3" height="40" fill="#8a5a2c" stroke="#4a2c14" stroke-width="1"/><path d="M6 6Q6 1 12.5 1Q19 1 19 6" fill="none" stroke="#4a2c14" stroke-width="2"/><path d="M5 44H21L19 60Q12.5 64 7 60Z" fill="#9aa8b8" stroke="#4d5a68" stroke-width="1.5"/><ellipse cx="13" cy="61" rx="12" ry="3" fill="#fff" opacity=".9"/></svg>',
    sign: '<svg viewBox="0 0 64 96"><rect x="29" y="30" width="7" height="64" fill="#7b5230" stroke="#3c2410" stroke-width="1.5"/><rect x="3" y="3" width="58" height="34" rx="3" fill="#a77a4a" stroke="#4a2c14" stroke-width="2"/><path d="M6 14H58M6 25H58" stroke="#7b5230" stroke-width="1.2"/><path d="M5 3Q32 -1 59 3" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/><ellipse cx="32" cy="94" rx="18" ry="3" fill="#fff" opacity=".9"/></svg>',
    fence: '<svg viewBox="0 0 70 86"><g fill="#8a5a2c" stroke="#3c2410" stroke-width="1.5"><rect x="4" y="6" width="9" height="76" rx="1"/><rect x="30" y="2" width="9" height="80" rx="1"/><rect x="56" y="6" width="9" height="76" rx="1"/><rect x="2" y="26" width="66" height="8" rx="1"/><rect x="2" y="52" width="66" height="8" rx="1"/></g><path d="M3 6H14M29 2H40M55 6H66" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
    snowman: '<svg viewBox="0 0 64 90"><circle cx="32" cy="62" r="24" fill="#fff" stroke="#8a9bb5" stroke-width="1.8"/><circle cx="32" cy="58" r="2.4" fill="#2a2a2a"/><circle cx="32" cy="68" r="2.4" fill="#2a2a2a"/><circle cx="32" cy="78" r="2.4" fill="#2a2a2a"/><g class="sm-head"><circle cx="32" cy="28" r="16" fill="#fff" stroke="#8a9bb5" stroke-width="1.8"/><circle cx="27" cy="24" r="1.8" fill="#2a2a2a"/><circle cx="37" cy="24" r="1.8" fill="#2a2a2a"/><path d="M33 29L49 32L33 34Z" fill="#e0782a" stroke="#a04e12" stroke-width="1"/><path d="M26 34Q32 38 38 34" stroke="#2a2a2a" stroke-width="1.4" fill="none"/></g><ellipse cx="32" cy="87" rx="26" ry="3" fill="#fff" opacity=".9"/></svg>'
  };
  function lightsSvg() {
    var cols = ["#e0443f", "#f0c93c", "#3fae5a"], s = '<svg viewBox="0 0 360 50" preserveAspectRatio="xMidYMin meet"><path d="M-4 6Q180 46 364 6" fill="none" stroke="#6b4a2a" stroke-width="1.6"/>';
    for (var i = 0; i < 11; i++) {
      var t = (i + 0.5) / 11, x = Math.round(-4 + 368 * t), y = Math.round(6 + 80 * t * (1 - t)), c = cols[i % 3];
      s += '<g class="bl" style="animation-delay:-' + (i * 0.37).toFixed(2) + 's"><path d="M' + x + ' ' + y + 'L' + x + ' ' + (y + 4) + '" stroke="#6b4a2a" stroke-width="1.5"/>' +
        '<circle cx="' + x + '" cy="' + (y + 9) + '" r="9" fill="' + c + '" opacity=".25"/><circle cx="' + x + '" cy="' + (y + 9) + '" r="5" fill="' + c + '" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>' +
        '<circle cx="' + (x - 1.5) + '" cy="' + (y + 7) + '" r="1.4" fill="#fff" opacity=".8"/></g>';
    }
    return s + '</svg>';
  }
  // 会被砸歪的物件各级歪的程度（0 = 没歪）
  var ANG = { sg: [0, 12, 22, 32], fc: [0, 5, 10, 15], sh: [0, -14, -28, -46] };
  var HEAD = [[0, 0, 0], [0, 0, 16], [7, 4, 36], [13, 20, 66]];       // 雪人头：x, y, 旋转
  var ZONES = { backL: ["tl", "gl", "lt"], backR: ["tr", "gr", "lt"], frontL: ["pl", "sh"], frontR: ["sg", "fc", "sm"] };
  var KIND = { tl: "tree", tr: "tree", lt: "lights", gl: "soft", gr: "soft", pl: "soft", sg: "wood", fc: "wood", sh: "wood", sm: "snowman" };
  function drops() {
    var s = "";
    for (var i = 0; i < 5; i++) s += '<i class="drop" style="left:' + (12 + i * 9) + 'px;top:' + (24 + (i % 3) * 14) + 'px;--dx:' + ((i % 2 ? 1 : -1) * (6 + i * 3)) + 'px;animation-delay:' + (i * 70) + 'ms"></i>';
    return s;
  }

  // ---------- 音效：全部用 WebAudio 现场合成，不需要任何音频文件 ----------
  var SFX = (function () {
    var ac = null, out = null, nb = null;
    function init() {
      if (ac) { if (ac.state === "suspended") { try { ac.resume(); } catch (e) { /* 忽略 */ } } return true; }
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return false;
      try { ac = new C(); } catch (e) { ac = null; return false; }
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      out = ac.createGain(); out.gain.value = 0.9; out.connect(comp); comp.connect(ac.destination);
      nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      var d = nb.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    }
    function now() { return ac.currentTime + 0.01; }
    // 带滤波扫频的噪声：type 滤波类型，f0→f1 频率扫过，att 到达最响的时间
    function noise(t, dur, type, f0, f1, q, vol, att) {
      var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = nb; s.loop = true;
      f.type = type; f.Q.value = q || 1;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(att || 0.01, dur * 0.9)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    }
    function tone(t, f0, f1, dur, vol, type, att) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (att || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
    }
    // 铃/玻璃音：基音 + 非整数倍泛音，各自衰减速度不同
    function bell(t, f, dur, vol) {
      [[1, 1, 1], [2.76, 0.35, 0.55], [5.4, 0.12, 0.3]].forEach(function (p) { tone(t, f * p[0], f * p[0] * 0.998, dur * p[2], vol * p[1], "sine", 0.003); });
    }
    function guard(fn) { return function (a, b) { if (!ac) return; try { fn(a, b); } catch (e) { /* 音效出错不影响游戏 */ } }; }
    return {
      init: init,
      // 雪球飞行：对手扔来的越来越近（越来越响），我扔出去的越飞越远
      throwBall: guard(function (by, dur) {
        var t = now(), s = Math.max(0.5, Math.min(1.6, dur / 1000));
        if (by === "opp") { noise(t, s, "bandpass", 350, 2400, 1.3, 0.5, s * 0.86); noise(t, s, "lowpass", 300, 700, 0.7, 0.22, s * 0.86); }
        else { noise(t, 0.55, "bandpass", 2800, 450, 1.3, 0.6, 0.05); noise(t, 0.45, "lowpass", 900, 300, 0.7, 0.2, 0.05); tone(t, 220, 120, 0.12, 0.2, "triangle", 0.01); }
      }),
      // 打中：啪（脆响 + 闷响 + 低频咚 + 几声雪碎）
      hit: guard(function () {
        var t = now(), i;
        noise(t, 0.09, "bandpass", 2600, 1400, 1.2, 0.7, 0.004);
        noise(t, 0.28, "lowpass", 1400, 300, 0.8, 0.9, 0.006);
        tone(t, 150, 55, 0.22, 0.7, "sine", 0.004);
        for (i = 0; i < 4; i++) noise(t + 0.03 + i * 0.04, 0.03, "highpass", 3500, 3500, 0.7, 0.25, 0.003);
      }),
      // 躲开了/砸偏：噗（松软的雪）
      land: guard(function () {
        var t = now();
        noise(t, 0.22, "lowpass", 900, 250, 0.7, 0.55, 0.01);
        tone(t, 110, 60, 0.18, 0.35, "sine", 0.005);
        noise(t + 0.02, 0.06, "bandpass", 3000, 2000, 1, 0.12, 0.004);
      }),
      // 心碎：碎裂声 + 两个玻璃般的叮 + 往下掉的尾音
      heart: guard(function () {
        var t = now();
        noise(t, 0.05, "highpass", 4000, 4000, 0.7, 0.35, 0.002);
        bell(t + 0.03, 1760, 0.6, 0.3); bell(t + 0.13, 1319, 0.7, 0.28);
        tone(t + 0.18, 880, 300, 0.35, 0.12, "triangle", 0.01);
      }),
      // 砸到背景物件
      deco: guard(function (kind) {
        var t = now(), i;
        if (kind === "wood") { tone(t, 190, 80, 0.28, 0.55, "sine", 0.004); noise(t, 0.09, "bandpass", 1100, 700, 3, 0.5, 0.003); noise(t + 0.07, 0.1, "bandpass", 800, 600, 3, 0.25, 0.003); }
        else if (kind === "snowman") { noise(t, 0.2, "lowpass", 600, 200, 0.8, 0.5, 0.01); tone(t, 90, 55, 0.25, 0.35, "sine", 0.005); }
        else if (kind === "tree") { noise(t, 0.7, "bandpass", 3500, 2500, 0.6, 0.25, 0.15); tone(t, 120, 70, 0.2, 0.3, "sine", 0.005); }
        else if (kind === "lights") { var fs = [2093, 2637, 3136, 2349, 3520]; for (i = 0; i < 5; i++) bell(t + i * 0.05 + Math.random() * 0.02, fs[i], 0.35, 0.12); }
        else { tone(t, 130, 70, 0.15, 0.4, "sine", 0.004); noise(t, 0.12, "lowpass", 800, 300, 0.7, 0.3, 0.008); }
      }),
      tick: guard(function () { tone(now(), 820, 540, 0.05, 0.18, "triangle", 0.002); }),
      win: guard(function () {
        var t = now(), n = [523, 659, 784, 1047, 1319], i;
        for (i = 0; i < n.length; i++) bell(t + i * 0.11, n[i], 0.9, 0.3);
        bell(t + 0.6, 784, 1, 0.18); bell(t + 0.6, 1047, 1, 0.18);
      }),
      lose: guard(function () {
        var t = now(), n = [392, 349, 330, 262], i;
        for (i = 0; i < n.length; i++) tone(t + i * 0.22, n[i], n[i] * 0.97, 0.34, 0.25, "triangle", 0.02);
      })
    };
  })();

  var CSS = `
.rcc .arena{position:relative;height:520px;border-radius:12px;overflow:hidden;background:linear-gradient(#8fa8cf 0%,#d6e2f2 21.5%,#f6f9fc 22%,#dfe8f2 100%);box-shadow:inset 0 0 22px rgba(50,70,110,.4),0 0 0 2px #5a3a20}
.rcc .arena .hill{position:absolute;z-index:0;left:-10%;right:-10%;top:17%;height:56px;border-radius:50%;background:#fff;box-shadow:0 -4px 10px rgba(120,150,190,.25)}
.rcc .deco{position:absolute;z-index:1;pointer-events:none}
.rcc .deco svg{display:block;width:100%;height:100%;overflow:visible}
.rcc .bl{animation:rcc-tw 2.6s ease-in-out infinite}
@keyframes rcc-tw{0%,100%{opacity:1}50%{opacity:.55}}
.rcc .anim-sway{animation:rcc-sway 1s ease-out;transform-origin:50% 100%}
.rcc .d-lt.anim-sway{transform-origin:50% 0;--s:2.5deg}
@keyframes rcc-sway{0%{transform:rotate(0)}20%{transform:rotate(var(--s,4deg))}45%{transform:rotate(calc(var(--s,4deg) * -.8))}70%{transform:rotate(calc(var(--s,4deg) * .35))}100%{transform:rotate(0)}}
.rcc .anim-hop{animation:rcc-hop .7s ease-out}
@keyframes rcc-hop{0%{transform:none}25%{transform:translateY(-7px) rotate(-3deg)}50%{transform:none}70%{transform:translateY(-3px) rotate(2deg)}100%{transform:none}}
.rcc .deco .drop{position:absolute;width:6px;height:6px;border-radius:50%;background:#fff;opacity:0}
.rcc .anim-sway .drop{animation:rcc-drop .9s ease-in forwards}
@keyframes rcc-drop{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(var(--dx,6px),60px)}}
.rcc .tilt{transform-origin:50% 100%;transform:rotate(var(--a1,0deg))}
.rcc .tilt.knock{animation:rcc-knock .75s cubic-bezier(.3,1.6,.5,1)}
@keyframes rcc-knock{from{transform:rotate(var(--a0,0deg))}to{transform:rotate(var(--a1,0deg))}}
.rcc .d-sm .sm-head{transform-box:fill-box;transform-origin:50% 100%;transform:translate(var(--x1,0px),var(--y1,0px)) rotate(var(--r1,0deg))}
.rcc .d-sm.knock .sm-head{animation:rcc-head .8s cubic-bezier(.3,1.5,.5,1)}
@keyframes rcc-head{from{transform:translate(var(--x0,0px),var(--y0,0px)) rotate(var(--r0,0deg))}to{transform:translate(var(--x1,0px),var(--y1,0px)) rotate(var(--r1,0deg))}}
.rcc .rb{position:absolute;left:8px;top:8px;z-index:5;padding:3px 12px;border-radius:8px;font-size:12px;color:#3a2410;background:#f3e7c6;box-shadow:0 0 0 2px #5a3a20,0 2px 4px rgba(0,0,0,.4)}
.rcc .hp{position:absolute;z-index:5;display:flex;padding:3px 7px;border-radius:12px;background:rgba(255,255,255,.75);font-size:11px;align-items:center;gap:3px;color:#3a2410}
.rcc .hp.o{right:8px;top:8px}.rcc .hp.m{left:8px;bottom:8px}
.rcc .hbk{position:relative;display:inline-block;width:17px;height:17px}
.rcc .hbk svg{display:block}
.rcc .hbk .hl,.rcc .hbk .hr{position:absolute;inset:0}
.rcc .hbk .hl{clip-path:inset(0 50% 0 0);animation:rcc-hl .9s ease-in forwards}
.rcc .hbk .hr{clip-path:inset(0 0 0 50%);animation:rcc-hr .9s ease-in forwards}
@keyframes rcc-hl{0%{transform:scale(1)}25%{transform:scale(1.6)}100%{transform:translate(-7px,12px) rotate(-30deg);opacity:0}}
@keyframes rcc-hr{0%{transform:scale(1)}25%{transform:scale(1.6)}100%{transform:translate(7px,12px) rotate(30deg);opacity:0}}
.rcc .av2{position:absolute;z-index:3;transform:translateX(-50%);border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#6a4a2a;color:#f3e6c8;font-size:26px;border:3px solid #fff;box-shadow:0 4px 8px rgba(40,60,100,.5);transition:left .25s ease,transform .18s ease}
.rcc .av2.o{top:80px;width:62px;height:62px}.rcc .av2.m{top:375px;width:78px;height:78px}
.rcc .av2.o.lean-l{transform:translateX(-50%) translateX(-10px) rotate(-8deg)}
.rcc .av2.o.lean-r{transform:translateX(-50%) translateX(10px) rotate(8deg)}
.rcc .av2 img{width:100%;height:100%;object-fit:cover}
.rcc .av2.shake{animation:rcc-shake .5s}
@keyframes rcc-shake{20%{margin-left:-8px}40%{margin-left:8px}60%{margin-left:-5px}80%{margin-left:4px}}
.rcc .splat{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 40% 40%,#fff 0 45%,rgba(255,255,255,.7) 60%,transparent 72%);animation:rcc-splat .7s ease-out forwards}
@keyframes rcc-splat{from{transform:scale(.3);opacity:1}to{transform:scale(1.15);opacity:.9}}
.rcc .mound{position:absolute;z-index:2;width:92px;height:34px;border-radius:50%;background:radial-gradient(#fff,#e3ebf5);transform:translateX(-50%);box-shadow:0 3px 6px rgba(60,90,140,.35)}
.rcc .mound.o{width:80px;height:30px}
.rcc .ball{position:absolute;z-index:4;width:26px;height:26px;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle at 35% 30%,#fff,#e1e9f3 65%,#b4c4da);box-shadow:inset -3px -3px 5px rgba(120,150,190,.5),0 3px 5px rgba(50,80,120,.4)}
.rcc .bsh{position:absolute;z-index:1;width:22px;height:8px;border-radius:50%;transform:translate(-50%,-50%);background:rgba(50,70,110,.35)}
.rcc .trail{position:absolute;z-index:3;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:rgba(255,255,255,.9);animation:rcc-trail .5s ease-out forwards;pointer-events:none}
@keyframes rcc-trail{to{transform:scale(.2);opacity:0}}
.rcc .spl{position:absolute;z-index:4;width:0;height:0;pointer-events:none}
.rcc .spl b{position:absolute;left:-22px;top:-8px;width:44px;height:16px;border-radius:50%;background:radial-gradient(#fff 40%,rgba(255,255,255,.6) 70%,transparent 72%);animation:rcc-stain 1.2s ease-out forwards}
@keyframes rcc-stain{from{transform:scale(.3);opacity:1}30%{transform:scale(1.1)}to{transform:scale(1.25);opacity:.15}}
.rcc .spl i{position:absolute;left:-4px;top:-4px;width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(60,90,140,.4);animation:rcc-pt .65s ease-out forwards}
@keyframes rcc-pt{from{transform:translate(0,0) scale(1)}to{transform:translate(var(--dx),var(--dy)) scale(.3);opacity:0}}
.rcc .mark{position:absolute;z-index:2;width:58px;height:18px;border-radius:50%;transform:translateX(-50%);background:rgba(163,41,58,.28);border:2px solid rgba(163,41,58,.75);transition:left .18s}
.rcc .tell{position:absolute;z-index:4;top:48px;transform:translateX(-50%);padding:3px 11px;border-radius:12px;font-size:13px;font-weight:600;white-space:nowrap;background:#fff;color:#a3293a;box-shadow:0 2px 5px rgba(40,60,100,.35);animation:rcc-bob .55s ease-in-out infinite}
@keyframes rcc-bob{50%{transform:translateX(-50%) translateY(6px)}}
.rcc .bubble{position:absolute;z-index:6;left:50%;top:42px;transform:translateX(-50%);max-width:70%;padding:6px 12px;border-radius:14px;background:#fff;color:#3a2410;font-size:13px;box-shadow:0 3px 8px rgba(40,60,100,.4);text-align:center}
.rcc .res{position:absolute;inset:0;z-index:7;display:grid;place-content:center;gap:10px;text-align:center;background:rgba(20,30,50,.55);color:#fff}
.rcc .res h3{margin:0;font-size:34px;font-weight:400;text-shadow:0 2px 6px rgba(0,0,0,.6)}
.rcc .res .bubble{position:static;transform:none;margin:0 auto}
.rcc .two{display:flex;gap:14px;margin-top:14px}
.rcc .two .btn{flex:1;padding:14px 0;font-size:16px}
.rcc .gh{text-align:center;margin:10px 0 0;font-size:14px;font-weight:600;color:var(--ink);min-height:22px}
.rcc .meta{display:flex;align-items:center;gap:12px;margin:8px 0 4px}
.rcc .meta .a{width:44px;height:44px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#6a4a2a;color:#f3e6c8;box-shadow:0 0 0 2px #d9a63a,0 2px 4px rgba(0,0,0,.4)}
.rcc .meta .a img{width:100%;height:100%;object-fit:cover}
.rcc .rl{list-style:none;margin:0;padding:0}
.rcc .rl li{display:flex;gap:12px;padding:12px 0;border-bottom:1px dashed rgba(90,58,24,.4)}
.rcc .rl i{flex:0 0 28px;height:28px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:600;color:#4a2a07;background:radial-gradient(circle at 32% 28%,#fff1b8,#e3b341 40%,#a8741c)}
.rcc .rl b{display:block}
.rcc .rl small{display:block;color:var(--soft);font-size:13px;line-height:1.6}
@media (prefers-reduced-motion:reduce){.rcc .bl{animation:none}}
`;

  R.add({
    id: "snow", style: CSS, jobs: "snow:",
    home: { order: 6, en: "Snowball Fight", zh: "雪 仗", desc: "和角色打一场回合制雪仗", icon: "snow", svg: SVG },
    create: function (ctx) {
      var st = ctx.st, roche = ctx.roche, e = ctx.esc;
      var game = null, timers = [], lineMsg = "", rules = null, trailT = null, duckT = null;

      function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
      function clearAll() { timers.forEach(clearTimeout); timers = []; if (trailT) { clearInterval(trailT); trailT = null; } unduck(); }
      function rnd() { return Math.random(); }
      function lines(c) { return (st.d.snowLines && st.d.snowLines[c.id]) || null; }
      function stats() { return st.d.snowStats || { win: 0, lose: 0 }; }
      function avatar(img, name) { return img ? '<img src="' + e(img) + '" alt="">' : e(String(name || "?").slice(0, 1)); }
      function el(sel) { return ctx.view.querySelector(sel); }
      function say(ev) {
        var L = (game.c && lines(game.c)) || {}, arr = (L[ev] && L[ev].length ? L[ev] : DEF[ev]);
        game.bubble = String(arr[Math.floor(rnd() * arr.length)]).slice(0, 24);
      }

      // ---------- 音效开关 / 压低唱片机音乐 ----------
      function soundOn() { return st.d.snowSound !== false; }
      function snd(name, a, b) { if (soundOn()) SFX[name](a, b); }
      function unduck() { if (duckT) { clearTimeout(duckT); duckT = null; } if (R.duck) { try { R.duck(1); } catch (err) { /* 忽略 */ } } }
      function duck() {
        if (!soundOn() || !R.duck) return;
        try { R.duck(0.3); } catch (err) { return; }
        if (duckT) clearTimeout(duckT);
        duckT = setTimeout(function () { duckT = null; try { R.duck(1); } catch (err) { /* 忽略 */ } }, 1100);
      }

      // ---------- 雪球飞行：弧线 + 变大变小（模拟抛高）+ 影子 + 拖尾 ----------
      function fly(by, dur) {
        var b = el(".ball"), sh = el(".bsh");
        if (!b || !b.animate) return;
        var down = by === "opp", y0 = down ? Y.oppBall : Y.meBall, y1 = down ? Y.meHit : Y.oppHit;
        var kb = [], ks = [], N = 10, i;
        for (i = 0; i <= N; i++) {
          var t = i / N, hump = 4 * t * (1 - t), gy = y0 + (y1 - y0) * t;
          kb.push({ offset: t, top: (gy - hump * 70) + "px", transform: "translate(-50%,-50%) scale(" + (0.75 + hump * 0.65) + ") rotate(" + (t * 360) + "deg)" });
          ks.push({ offset: t, top: (gy + 12) + "px", opacity: 0.45 - hump * 0.2, transform: "translate(-50%,-50%) scale(" + (1.1 - hump * 0.5) + ")" });
        }
        var opt = { duration: dur, easing: down ? "cubic-bezier(.35,0,.85,.7)" : "cubic-bezier(.1,.4,.5,1)", fill: "forwards" };
        b.animate(kb, opt);
        if (sh) sh.animate(ks, opt);
        if (trailT) clearInterval(trailT);
        var n = 0;
        trailT = setInterval(function () {
          n++;
          var bb = el(".ball"), ar = el(".arena");
          if (!bb || !ar || n * 45 > dur) { clearInterval(trailT); trailT = null; return; }
          var r1 = bb.getBoundingClientRect(), r2 = ar.getBoundingClientRect(), d = document.createElement("i");
          d.className = "trail";
          d.style.left = (r1.left + r1.width / 2 - r2.left) + "px"; d.style.top = (r1.top + r1.height / 2 - r2.top) + "px";
          d.addEventListener("animationend", function () { d.remove(); });
          ar.appendChild(d);
        }, 45);
      }

      // 砸偏时随机砸中这一侧、这一区的一个背景物件
      function hitDeco(zone, lane) {
        var list = ZONES[zone + (lane ? "R" : "L")], id = list[Math.floor(rnd() * list.length)], prev = 0;
        if (game.deco[id] !== undefined) { prev = game.deco[id]; game.deco[id] = Math.min(3, prev + 1); }
        game.fxo = { id: id, prev: prev };
        snd("deco", KIND[id]);
      }

      // ---------- 回合流程 ----------
      function start(c) {
        clearAll();
        game = { c: c, turn: null, round: 1, hp: { me: 5, opp: 5 }, phase: "intro", lane: { me: rnd() < 0.5 ? 0 : 1, opp: rnd() < 0.5 ? 0 : 1 }, bubble: "", fx: null, ball: null, tell: null, over: null, splat: null, lost: null,
          deco: { sh: 0, sg: 0, fc: 0, sm: 0 }, fxo: null };
        say("start"); ctx.render(); later(beginDefend, 1500);
      }
      function dur() { return Math.max(850, 1500 - (game.round - 1) * 110); }
      function beginDefend() {
        game.phase = "defend"; game.turn = "defend"; game.fx = null; game.splat = null; game.fxo = null;
        game.ball = { by: "opp", lane: rnd() < 0.5 ? 0 : 1, dur: dur() };
        say("throw"); ctx.render();
        later(function () { fly("opp", game.ball.dur); snd("throwBall", "opp", game.ball.dur); }, 30);
        // 变招：对手头像先往要换去的那边偏一下。第 1 回合不变招；第 3 回合起它也会假装偏、其实不换
        var r = game.round, real = rnd() < (r >= 3 ? 0.45 : (r === 2 ? 0.2 : 0));
        var fake = !real && r >= 3 && rnd() < Math.min(0.45, 0.15 * (r - 2));
        var D = game.ball.dur, tg = 1 - game.ball.lane;
        if (real || fake) {
          later(function () { var o = el(".av2.o"); if (o) o.classList.add(tg ? "lean-r" : "lean-l"); }, D * 0.18);
          later(function () { var o = el(".av2.o"); if (o) o.classList.remove("lean-l", "lean-r"); }, D * 0.62);
        }
        if (real) later(function () { game.ball.lane = tg; var b = el(".ball"), m = el(".mark"), s = el(".bsh"); if (b) b.style.left = LANE[tg] + "%"; if (s) s.style.left = LANE[tg] + "%"; if (m) m.style.left = LANE[tg] + "%"; }, D * 0.5);
        later(resolveDefend, D + 80);
      }
      function resolveDefend() {
        var bl = game.ball.lane, hit = game.lane.me === bl;
        game.phase = "after"; game.ball = null; game.splat = null; game.lost = null; game.fxo = null;
        if (hit) { game.hp.me--; game.fx = "me"; game.lost = "me"; say("hit"); snd("hit"); duck(); later(function () { snd("heart"); }, 170); }
        else { game.splat = { x: LANE[bl], y: Y.meHit + 34 }; say("dodge"); snd("land"); hitDeco("front", bl); }
        ctx.render();
        later(function () { game.fx = null; game.splat = null; game.lost = null; game.fxo = null; if (game.hp.me <= 0) return finish("lose"); beginAttack(); }, 1400);
      }
      function beginAttack() {
        game.phase = "attack"; game.turn = "attack"; game.aim = null; game.bubble = ""; game.F = rnd() < 0.5 ? 0 : 1;
        game.tell = rnd() < 0.7 ? game.F : 1 - game.F;       // 70% 的概率提示是真的
        ctx.render();
        later(function () { game.tell = null; if (game.phase === "attack") ctx.render(); }, 1300);
        later(function () { if (game.phase === "attack" && game.aim == null) aim(rnd() < 0.5 ? 0 : 1); }, 2800);
      }
      function aim(l) {
        game.aim = l; game.phase = "flight"; game.tell = null;
        game.ball = { by: "me", lane: l, dur: 700 }; ctx.render();
        later(function () { fly("me", 700); snd("throwBall", "me", 700); }, 30);
        later(function () { game.lane.opp = game.F; var o = el(".av2.o"), md = ctx.view.querySelectorAll(".mound"); if (o) o.style.left = LANE[game.F] + "%"; if (md[0]) md[0].style.left = LANE[game.F] + "%"; }, 260);
        later(resolveAttack, 780);
      }
      function resolveAttack() {
        var hit = game.aim === game.F;
        game.phase = "after"; game.ball = null; game.splat = null; game.lost = null; game.fxo = null;
        if (hit) { game.hp.opp--; game.fx = "opp"; game.lost = "opp"; say("gotHit"); snd("hit"); duck(); later(function () { snd("heart"); }, 170); }
        else { game.splat = { x: LANE[game.aim], y: Y.oppHit + 4 }; say("miss"); snd("land"); hitDeco("back", game.aim); }
        ctx.render();
        later(function () {
          game.fx = null; game.splat = null; game.lost = null; game.fxo = null;
          if (game.hp.opp <= 0) return finish("win");
          if (game.round >= MAX_ROUND) return finish(game.hp.me > game.hp.opp ? "win" : (game.hp.me < game.hp.opp ? "lose" : "draw"));
          game.round++; beginDefend();
        }, 1400);
      }
      function finish(r) {
        game.phase = "over"; game.over = r; game.ball = null;
        say(r === "win" ? "oppLose" : (r === "lose" ? "oppWin" : "start"));
        var s = stats(); if (r === "win") s.win++; if (r === "lose") s.lose++;
        st.d.snowStats = s; ctx.save(); ctx.render();
        if (r === "win") { snd("win"); duck(); } else if (r === "lose") { snd("lose"); duck(); }
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
        return '<div class="deco d-lt' + sw("lt") + '" style="left:0;right:0;top:44px;height:46px">' + lightsSvg() + '</div>' +
          '<div class="deco d-tl' + sw("tl") + '" style="left:-4px;top:80px;width:66px;height:104px">' + ART.tree + drops() + '</div>' +
          '<div class="deco d-tr' + sw("tr") + '" style="right:-6px;top:86px;width:60px;height:94px">' + ART.tree + drops() + '</div>' +
          '<div class="deco d-gl' + hp("gl") + '" style="left:42px;top:150px;width:50px;height:32px">' + ART.gifts + '</div>' +
          '<div class="deco d-gr' + hp("gr") + '" style="right:40px;top:152px;width:46px;height:30px">' + ART.gifts + '</div>' +
          '<div class="deco d-pl' + hp("pl") + '" style="left:6px;top:292px;width:52px;height:36px">' + ART.piles + '</div>' +
          tilt("sh", "left:8px;top:386px;width:26px;height:64px", ART.shovel) +
          tilt("fc", "right:0;top:246px;width:66px;height:80px", ART.fence) +
          tilt("sg", "right:6px;top:332px;width:54px;height:81px", ART.sign) +
          '<div class="deco d-sm' + (A("sm") ? " knock" : "") + '" style="right:8px;top:418px;width:58px;height:82px;--x0:' + h0[0] + 'px;--y0:' + h0[1] + 'px;--r0:' + h0[2] + 'deg;--x1:' + h1[0] + 'px;--y1:' + h1[1] + 'px;--r1:' + h1[2] + 'deg">' + ART.snowman + '</div>';
      }
      function arenaHtml() {
        var g = game, c = g.c, ph = g.phase, u = st.user || {};
        var turn = g.turn === "defend" ? "我方防守" : (g.turn === "attack" ? "我方进攻" : "准备");
        var hearts = function (n, side) { var s = ""; for (var i = 0; i < 5; i++) s += (g.lost === side && i === n) ? brokenHeart() : heart(i < n); return s; };
        var h = '<div class="arena"><div class="hill"></div>' + decoHtml() + '<div class="rb">第 ' + g.round + '/' + MAX_ROUND + ' 回合 · ' + turn + '</div>' +
          '<div class="hp o">' + e(ctx.nm(c)) + ' ' + hearts(g.hp.opp, "opp") + '</div>' +
          '<div class="mound o" style="left:' + LANE[g.lane.opp] + '%;top:128px"></div>' +
          '<div class="av2 o' + (g.fx === "opp" ? " shake" : "") + '" style="left:' + LANE[g.lane.opp] + '%">' + avatar(c.avatar, ctx.nm(c)) + (g.fx === "opp" ? '<i class="splat"></i>' : "") + '</div>' +
          '<div class="mound" style="left:' + LANE[g.lane.me] + '%;top:442px"></div>' +
          '<div class="av2 m' + (g.fx === "me" ? " shake" : "") + '" style="left:' + LANE[g.lane.me] + '%">' + avatar(u.avatar, ctx.userName()) + (g.fx === "me" ? '<i class="splat"></i>' : "") + '</div>' +
          '<div class="hp m">' + e(ctx.userName()) + ' ' + hearts(g.hp.me, "me") + '</div>';
        if (g.ball) {
          var b = g.ball, down = b.by === "opp", y0 = down ? Y.oppBall : Y.meBall;
          h += '<div class="bsh" style="left:' + LANE[b.lane] + '%;top:' + (y0 + 12) + 'px;transition:left .18s"></div>' +
            '<div class="ball" style="left:' + LANE[b.lane] + '%;top:' + y0 + 'px;transition:left .18s"></div>';
          if (down) h += '<div class="mark" style="left:' + LANE[b.lane] + '%;top:' + Y.mark + 'px"></div>';
        }
        if (g.splat) h += splatHtml(g.splat.x, g.splat.y);
        if (g.tell != null) h += '<div class="tell" style="left:' + LANE[g.tell] + '%">↓ 打这边</div>';
        if (g.bubble && !g.over) h += '<div class="bubble">' + e(g.bubble) + '</div>';
        if (g.over) {
          var t = g.over === "win" ? "你赢啦" : (g.over === "lose" ? "你输了" : "平局");
          h += '<div class="res"><h3 class="en">' + t + '</h3>' + (g.bubble ? '<div class="bubble">' + e(g.bubble) + '</div>' : "") +
            '<div><button class="btn" data-act="snow.again">再来一局</button></div></div>';
        }
        h += '</div>';
        var def = ph === "defend", att = ph === "attack";
        h += '<div class="two"><button class="btn" data-act="snow.lane" data-l="0"' + (def || att ? "" : " disabled") + '>' + (att ? "← 打左边" : "← 往左躲") + '</button>' +
          '<button class="btn" data-act="snow.lane" data-l="1"' + (def || att ? "" : " disabled") + '>' + (att ? "打右边 →" : "往右躲 →") + '</button></div>' +
          '<p class="gh">' + (def ? "红圈是落点，躲到另一边！" : (att ? "选一边打过去" : "")) + '</p>';
        return h;
      }
      function rulesHtml() {
        var go = rules.c;
        return '<ul class="rl">' +
          '<li><i>1</i><span><b>胜负</b><small>每人 5 颗心，最多 ' + MAX_ROUND + ' 回合。先打光对方的心就赢；打满回合则心多的赢。</small></span></li>' +
          '<li><i>2</i><span><b>我方防守</b><small>对手扔雪球，地上的红圈是落点。点下面的按钮躲到另一边。越到后面它越爱变招：球在半空会突然换边！</small></span></li>' +
          '<li><i>3</i><span><b>看头像</b><small>对手要变招前，头像会先往那一边偏一下。前几回合是真的，后面它也会假装偏，其实不换，别全信！</small></span></li>' +
          '<li><i>4</i><span><b>我方进攻</b><small>对手会指一边说「↓ 打这边」，但它不一定说真话，大概七成是真的。点左或右，猜中它躲的那边就打中。</small></span></li>' +
          '<li><i>5</i><span><b>被打中 / 打偏</b><small>被打中会碎掉一颗心。雪球扔偏了，会砸到后面的东西：树会抖，木牌、雪人、栅栏会被砸歪。</small></span></li></ul>' +
          '<div class="center"><button class="btn" data-act="snow.ok">' + (go ? "明白了，开战" : "知道了") + '</button></div>';
      }
      function setup() {
        var c = ctx.curChar(), L = c && lines(c), pend = c && st.jobs["snow:" + c.id], u = st.user || {}, s = stats();
        var h = ctx.picker(false) + '<div class="meta"><div class="a">' + avatar(c && c.avatar, ctx.nm(c)) + '</div><div><b>' + e(ctx.nm(c)) + '</b><small style="display:block;color:var(--soft)">对手</small></div></div>' +
          '<div class="meta"><div class="a">' + avatar(u.avatar, ctx.userName()) + '</div><div><b>' + e(ctx.userName()) + '</b><small style="display:block;color:var(--soft)">我方</small></div></div>' +
          '<p class="hint">每人 5 颗心，最多 ' + MAX_ROUND + ' 回合。战绩：' + s.win + ' 胜 ' + s.lose + ' 负</p>' +
          '<div class="center"><button class="btn" data-act="snow.go"' + (c ? "" : " disabled") + '>开战</button> <button class="btn ghost" data-act="snow.rules">玩法说明</button></div>';
        h += '<div class="center" style="margin-top:0"><button class="btn ghost sm" data-act="snow.lines"' + (pend ? " disabled" : "") + '>' + (pend ? "准备中" : (L ? "重新准备台词" : "让 TA 准备台词")) + '</button> ' +
          '<button class="btn ghost sm" data-act="snow.snd">音效：' + (soundOn() ? "开" : "关") + '</button></div>' +
          '<p class="hint" style="text-align:center">' + (L ? "台词已备好，不会再花钱。" : "不准备台词也能开战，会用通用台词；准备一次要调用一次模型，之后永久缓存。") + '</p>';
        if (pend) h += ctx.wait(e(lineMsg || "正在准备台词，你可以先去别处逛逛"));
        return h;
      }

      return {
        destroy: clearAll,
        back: function () { if (rules) { rules = null; return true; } if (game) leave(); return false; },
        view: function () { return ctx.page("Snowball Fight", "雪 仗", game ? arenaHtml() : (rules ? rulesHtml() : setup())); },
        act: function (name, el0) {
          var c = ctx.curChar();
          if (soundOn()) { SFX.init(); if (name !== "lines") SFX.tick(); }   // 音频要在点击里解锁；按钮轻响
          if (name === "go") {
            if (!c) return roche.ui.toast("请先选一个对手");
            if (!st.d.snowSeen) { rules = { c: c }; return ctx.render(); }   // 第一次开战先讲规则
            return start(c);
          }
          if (name === "rules") { rules = { c: null }; return ctx.render(); }
          if (name === "snd") {
            st.d.snowSound = !soundOn(); ctx.save();
            if (soundOn()) { SFX.init(); SFX.tick(); }
            return ctx.render();
          }
          if (name === "ok") {
            var cc = rules && rules.c; rules = null;
            if (!st.d.snowSeen) { st.d.snowSeen = true; ctx.save(); }
            return cc ? start(cc) : ctx.render();
          }
          if (name === "again") { var c2 = game && game.c; leave(); return c2 ? start(c2) : ctx.render(); }
          if (name === "lane") {
            if (!game) return;
            var l = +el0.dataset.l;
            if (game.phase === "defend") {
              game.lane.me = l;
              var m = el(".av2.m"), md = ctx.view.querySelectorAll(".mound");
              if (m) m.style.left = LANE[l] + "%"; if (md[1]) md[1].style.left = LANE[l] + "%";
              return;
            }
            if (game.phase === "attack") return aim(l);
            return;
          }
          if (name === "lines") {
            if (!c) return roche.ui.toast("请先选一个角色");
            ctx.job("snow:" + c.id, "snow", "雪仗台词", async function () {
              lineMsg = "正在读取记忆（1/3）…"; ctx.render();
              var l = await ctx.context(c);
              lineMsg = "正在组织请求（2/3）…"; ctx.render();
              var keys = Object.keys(EV).map(function (k) { return '"' + k + '":["台词","台词","台词"]'; }).join(",");
              lineMsg = "等 TA 想台词（3/3）…"; ctx.render();
              var j = await ctx.ask(ctx.sysFor(c, l), "你要和对方打一场友好的雪仗，你是对手。请写你在雪仗里的短台词，只输出 JSON：{" + keys + "}。各键含义：" +
                Object.keys(EV).map(function (k) { return k + "=" + EV[k]; }).join("；") + "。每个键 3 条，每条不超过 15 个字，符合你的性格，有趣；不要出现疼、痛、伤等字眼。", true);
              var out = {};
              Object.keys(EV).forEach(function (k) { out[k] = (Array.isArray(j[k]) ? j[k] : []).map(function (x) { return String(x).slice(0, 24); }).filter(Boolean).slice(0, 3); });
              st.d.snowLines = st.d.snowLines || {}; st.d.snowLines[c.id] = out; lineMsg = "";
            });
          }
        }
      };
    }
  });
})();
