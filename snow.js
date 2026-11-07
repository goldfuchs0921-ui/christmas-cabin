/* snow.js — 雪仗：回合制（我方防守 / 我方进攻），5 颗心，最多 8 回合
 * 台词：进入前一次性预生成并缓存（每个角色只花一次钱），游戏中按事件类型挑，所以台词和画面一定对得上
 * 形象：对手用角色头像，我方用你的人设头像；不用生图
 * v1.4.3（第三批 3a）：开战前对战页（左右对抗+VS）/ 灯串接边缘+灯泡各自晃 / 更精致的摆件 / 蓄力动画（我方蓝白、对手红）
 *   进攻要等蓄满才能点 / 防守落地前锁定位置 / 瞄准后对手会反应 / 球红蓝光晕+拖尾 / 台词放到打完之后 / 音量滑块 */
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

  // ---------- 背景物件（代码画的 SVG，带渐变/高光/阴影；以后想换图，在这里把对应的 SVG 换成图片即可）----------
  // 渐变只定义一次，所有物件共用（id 都带 sn- 前缀）
  var DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<linearGradient id="sn-leaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#68ab70"/><stop offset="1" stop-color="#2d6a45"/></linearGradient>' +
    '<linearGradient id="sn-trunk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f5f30"/><stop offset=".5" stop-color="#ab7840"/><stop offset="1" stop-color="#5e3c1d"/></linearGradient>' +
    '<linearGradient id="sn-snow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d4e1f3"/></linearGradient>' +
    '<linearGradient id="sn-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d94b60"/><stop offset="1" stop-color="#8f1f33"/></linearGradient>' +
    '<linearGradient id="sn-green" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46966a"/><stop offset="1" stop-color="#1f5a3a"/></linearGradient>' +
    '<linearGradient id="sn-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset="1" stop-color="#c8962f"/></linearGradient>' +
    '<linearGradient id="sn-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c0915a"/><stop offset="1" stop-color="#8b6034"/></linearGradient>' +
    '<linearGradient id="sn-woodv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b78652"/><stop offset=".55" stop-color="#9a6c3b"/><stop offset="1" stop-color="#6e4724"/></linearGradient>' +
    '<linearGradient id="sn-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6edf5"/><stop offset=".5" stop-color="#a9b6c6"/><stop offset="1" stop-color="#74849a"/></linearGradient>' +
    '<linearGradient id="sn-car" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f4a040"/><stop offset="1" stop-color="#c85e12"/></linearGradient>' +
    '<radialGradient id="sn-sph" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#eef3fa"/><stop offset="1" stop-color="#b9c9e2"/></radialGradient>' +
    '<radialGradient id="sn-shd" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#3c5078" stop-opacity=".4"/><stop offset="1" stop-color="#3c5078" stop-opacity="0"/></radialGradient>' +
    '</defs></svg>';
  var ART = {
    tree: '<svg viewBox="0 0 70 112"><ellipse cx="35" cy="106" rx="31" ry="6" fill="url(#sn-shd)"/>' +
      '<rect x="29" y="86" width="12" height="20" rx="2" fill="url(#sn-trunk)" stroke="#3c2410" stroke-width="1.2"/>' +
      '<path d="M35 46L67 92Q35 100 3 92Z" fill="url(#sn-leaf)" stroke="#1f4a2c" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M35 26L59 64Q35 71 11 64Z" fill="url(#sn-leaf)" stroke="#1f4a2c" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M35 4L51 38Q35 44 19 38Z" fill="url(#sn-leaf)" stroke="#1f4a2c" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M33 8L22 36M33 30L16 60M33 50L8 88" stroke="#fff" stroke-opacity=".16" stroke-width="2" stroke-linecap="round" fill="none"/>' +
      '<path d="M35 4L42 19Q35 16 28 19Z" fill="url(#sn-snow)"/><path d="M35 26L46 43Q41 40 35 42Q29 40 24 43Z" fill="url(#sn-snow)"/><path d="M35 46L53 71Q44 68 35 70Q26 68 17 71Z" fill="url(#sn-snow)"/>' +
      '<circle cx="30" cy="56" r="2.6" fill="#d94b60" stroke="#8f1f33" stroke-width=".6"/><circle cx="44" cy="78" r="2.6" fill="#f0c03a" stroke="#a8741c" stroke-width=".6"/><circle cx="24" cy="80" r="2.6" fill="#f0c03a" stroke="#a8741c" stroke-width=".6"/><circle cx="38" cy="34" r="2.2" fill="#d94b60" stroke="#8f1f33" stroke-width=".6"/>' +
      '<ellipse cx="35" cy="106" rx="22" ry="4" fill="url(#sn-snow)"/></svg>',
    gifts: '<svg viewBox="0 0 58 40"><ellipse cx="29" cy="37" rx="28" ry="4" fill="url(#sn-shd)"/>' +
      '<rect x="2" y="16" width="24" height="21" fill="url(#sn-red)" stroke="#6e1522" stroke-width="1.2"/>' +
      '<path d="M2 16L7 10H31L26 16Z" fill="#e8798a" stroke="#6e1522" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M26 16L31 10V31L26 37Z" fill="#8a1c30" stroke="#6e1522" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<rect x="12" y="16" width="4" height="21" fill="url(#sn-gold)"/><path d="M12 16L17 10H21L16 16Z" fill="url(#sn-gold)"/>' +
      '<path d="M14 12Q6 2 5 8Q6 13 14 12Q22 13 23 8Q22 2 14 12Z" fill="url(#sn-gold)" stroke="#a8741c" stroke-width="1"/>' +
      '<rect x="30" y="22" width="22" height="15" fill="url(#sn-green)" stroke="#173a24" stroke-width="1.2"/>' +
      '<path d="M30 22L34 17H56L52 22Z" fill="#6bb88a" stroke="#173a24" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<path d="M52 22L56 17V32L52 37Z" fill="#17482c" stroke="#173a24" stroke-width="1.2" stroke-linejoin="round"/>' +
      '<rect x="39" y="22" width="4" height="15" fill="url(#sn-gold)"/>' +
      '<path d="M32 19Q43 15 54 19L52 22H30Z" fill="url(#sn-snow)"/></svg>',
    piles: '<svg viewBox="0 0 56 40"><ellipse cx="28" cy="36" rx="27" ry="4" fill="url(#sn-shd)"/>' +
      '<circle cx="22" cy="21" r="15" fill="url(#sn-sph)" stroke="#aebfd8" stroke-width="1"/><circle cx="43" cy="29" r="8" fill="url(#sn-sph)" stroke="#aebfd8" stroke-width="1"/><circle cx="10" cy="31" r="6" fill="url(#sn-sph)" stroke="#aebfd8" stroke-width="1"/></svg>',
    shovel: '<svg viewBox="0 0 26 66"><rect x="11" y="8" width="4" height="40" rx="1.5" fill="url(#sn-woodv)" stroke="#4a2c14" stroke-width="1"/>' +
      '<path d="M6 8Q6 1 13 1Q20 1 20 8" fill="none" stroke="#5a381c" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M4 44H22L20 60Q13 65 6 60Z" fill="url(#sn-metal)" stroke="#4d5a68" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M8 47L9 57" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>' +
      '<ellipse cx="13" cy="61" rx="12" ry="4" fill="url(#sn-snow)"/></svg>',
    sign: '<svg viewBox="0 0 64 96"><ellipse cx="32" cy="92" rx="22" ry="4" fill="url(#sn-shd)"/>' +
      '<rect x="28" y="30" width="8" height="62" rx="1.5" fill="url(#sn-woodv)" stroke="#3c2410" stroke-width="1.3"/>' +
      '<rect x="3" y="3" width="58" height="34" rx="3" fill="url(#sn-wood)" stroke="#4a2c14" stroke-width="1.8"/>' +
      '<path d="M4 14H60M4 25H60" stroke="#6a4424" stroke-width="1" opacity=".7"/><path d="M10 9Q20 11 30 9M34 19Q46 21 56 19M8 30Q18 32 28 30" stroke="#6a4424" stroke-width=".8" fill="none" opacity=".45"/>' +
      '<circle cx="9" cy="9" r="1.5" fill="#4a2c14"/><circle cx="55" cy="9" r="1.5" fill="#4a2c14"/><circle cx="9" cy="31" r="1.5" fill="#4a2c14"/><circle cx="55" cy="31" r="1.5" fill="#4a2c14"/>' +
      '<path d="M32 12V28M24 20H40M26.5 14.5L37.5 25.5M37.5 14.5L26.5 25.5" stroke="#5a381c" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>' +
      '<path d="M2 7Q10 -3 22 3Q34 -3 44 3Q54 -2 62 7L62 10Q32 5 2 10Z" fill="url(#sn-snow)"/>' +
      '<ellipse cx="32" cy="92" rx="14" ry="3.5" fill="url(#sn-snow)"/></svg>',
    fence: '<svg viewBox="0 0 70 88"><ellipse cx="35" cy="84" rx="34" ry="4" fill="url(#sn-shd)"/>' +
      '<g fill="url(#sn-wood)" stroke="#3c2410" stroke-width="1.3"><rect x="1" y="28" width="68" height="8" rx="1"/><rect x="1" y="54" width="68" height="8" rx="1"/></g>' +
      '<g fill="url(#sn-woodv)" stroke="#3c2410" stroke-width="1.4" stroke-linejoin="round"><path d="M3 14L8.5 5L14 14V83H3Z"/><path d="M29 10L34.5 1L40 10V83H29Z"/><path d="M56 14L61.5 5L67 14V83H56Z"/></g>' +
      '<path d="M7 20V78M33 16V78M60 20V78" stroke="#4a2c14" stroke-width=".8" opacity=".35"/>' +
      '<path d="M3 14L8.5 4L14 14Q8.5 11 3 14ZM29 10L34.5 0L40 10Q34.5 7 29 10ZM56 14L61.5 4L67 14Q61.5 11 56 14Z" fill="url(#sn-snow)"/>' +
      '<path d="M2 28Q18 25 36 27Q54 25 68 28L68 30Q36 28 2 30Z" fill="url(#sn-snow)"/></svg>',
    snowman: '<svg viewBox="0 -8 64 98"><ellipse cx="32" cy="86" rx="28" ry="4" fill="url(#sn-shd)"/>' +
      '<path d="M10 58L2 48M54 58L63 49" stroke="#5a381c" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M5 52L1 52M59 53L62 56" stroke="#5a381c" stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle cx="32" cy="62" r="24" fill="url(#sn-sph)" stroke="#9db0cc" stroke-width="1.4"/>' +
      '<circle cx="32" cy="60" r="2.6" fill="#2a2a2a"/><circle cx="32" cy="70" r="2.6" fill="#2a2a2a"/><circle cx="32" cy="80" r="2.4" fill="#2a2a2a"/>' +
      '<circle cx="31.2" cy="59.2" r=".8" fill="#fff" opacity=".8"/><circle cx="31.2" cy="69.2" r=".8" fill="#fff" opacity=".8"/>' +
      '<path d="M18 44Q32 52 46 44L47 49Q32 57 17 49Z" fill="url(#sn-red)" stroke="#6e1522" stroke-width="1"/><path d="M24 48L22 62L29 60L29 50Z" fill="url(#sn-red)" stroke="#6e1522" stroke-width="1"/>' +
      '<path d="M22 49L24 55M26 50L27 56" stroke="#f0d98a" stroke-width="1.2" opacity=".8"/>' +
      '<g class="sm-head"><circle cx="32" cy="28" r="16" fill="url(#sn-sph)" stroke="#9db0cc" stroke-width="1.4"/>' +
      '<ellipse cx="32" cy="14" rx="15" ry="3.2" fill="#2f2f36" stroke="#15151a" stroke-width="1"/><rect x="21" y="-4" width="22" height="18" rx="2" fill="#3a3a44" stroke="#15151a" stroke-width="1"/><rect x="21" y="8" width="22" height="4" fill="#a3293a"/><path d="M24 -1L24 7" stroke="#fff" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="26.5" cy="26" r="2.1" fill="#222"/><circle cx="37.5" cy="26" r="2.1" fill="#222"/><circle cx="25.8" cy="25.3" r=".7" fill="#fff"/><circle cx="36.8" cy="25.3" r=".7" fill="#fff"/>' +
      '<path d="M32 29L49 33L32 35Z" fill="url(#sn-car)" stroke="#a04e12" stroke-width="1" stroke-linejoin="round"/>' +
      '<circle cx="24" cy="33" r="2.4" fill="#f2a0a8" opacity=".5"/><circle cx="40" cy="33" r="2.4" fill="#f2a0a8" opacity=".5"/>' +
      '<path d="M25 36Q32 41 39 36" stroke="#2a2a2a" stroke-width="1.3" fill="none" stroke-linecap="round"/></g></svg>'
  };
  // 灯串：线两头钉在左右边缘（SVG 拉伸到整宽），灯泡是单独的小元素，各自像挂着一样晃
  function lightsHtml() {
    var cols = ["#e0443f", "#f0c93c", "#3fae5a", "#4a8fe0"], s = '<svg class="lw" viewBox="0 0 100 56" preserveAspectRatio="none"><path d="M0 4Q50 44 100 4" fill="none" stroke="#6b4a2a" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>';
    for (var i = 0; i < 11; i++) {
      var t = (i + 0.5) / 11, x = (t * 100).toFixed(2), y = (4 + 80 * t * (1 - t)).toFixed(1);
      s += '<span class="bulb" style="left:' + x + '%;top:' + y + 'px;--c:' + cols[i % 4] + ';--i:' + i + ';--d:-' + (i * 0.43).toFixed(2) + 's"><b></b><u></u></span>';
    }
    return s;
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
  // 蓄力时聚向头像的一圈小雪粒
  var AURA = (function () {
    var s = "";
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      s += '<i style="--dx:' + Math.round(Math.cos(a) * 46) + 'px;--dy:' + Math.round(Math.sin(a) * 46) + 'px;animation-delay:' + (i * 0.09).toFixed(2) + 's"></i>';
    }
    return s;
  })();

  // ---------- 音效：全部用 WebAudio 现场合成，不需要任何音频文件 ----------
  var SFX = (function () {
    var ac = null, out = null, nb = null, vol = 1;
    function init() {
      if (ac) { if (ac.state === "suspended") { try { ac.resume(); } catch (e) { /* 忽略 */ } } return true; }
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return false;
      try { ac = new C(); } catch (e) { ac = null; return false; }
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      out = ac.createGain(); out.gain.value = 0.9 * vol; out.connect(comp); comp.connect(ac.destination);
      nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      var d = nb.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    }
    function setVol(v) { vol = Math.max(0, Math.min(1, v)); if (out) out.gain.value = 0.9 * vol; }
    function now() { return ac.currentTime + 0.01; }
    // 带滤波扫频的噪声：type 滤波类型，f0→f1 频率扫过，att 到达最响的时间
    function noise(t, dur, type, f0, f1, q, vol2, att) {
      var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = nb; s.loop = true;
      f.type = type; f.Q.value = q || 1;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol2, t + Math.min(att || 0.01, dur * 0.9)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
    }
    function tone(t, f0, f1, dur, vol2, type, att) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol2, t + (att || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
    }
    // 铃/玻璃音：基音 + 非整数倍泛音，各自衰减速度不同
    function bell(t, f, dur, vol2) {
      [[1, 1, 1], [2.76, 0.35, 0.55], [5.4, 0.12, 0.3]].forEach(function (p) { tone(t, f * p[0], f * p[0] * 0.998, dur * p[2], vol2 * p[1], "sine", 0.003); });
    }
    function guard(fn) { return function (a, b) { if (!ac) return; try { fn(a, b); } catch (e) { /* 音效出错不影响游戏 */ } }; }
    return {
      init: init, setVol: setVol,
      // 蓄力：越来越高的嗡声 + 细碎的闪烁；对手（m=我方高一点，o=对手低一点）
      charge: guard(function (by, ms) {
        var t = now(), d = ms / 1000, base = by === "m" ? 520 : 340, i;
        tone(t, base, base * 2.2, d, 0.1, "sine", d * 0.8);
        noise(t, d, "bandpass", 600, 3200, 2, 0.12, d * 0.85);
        for (i = 0; i < 4; i++) tone(t + d * (0.3 + 0.15 * i), base * 4 * (1 + i * 0.1), base * 4 * (1 + i * 0.1) * 0.98, 0.12, 0.05, "sine", 0.005);
      }),
      ready: guard(function () { bell(now(), 1568, 0.35, 0.12); }),
      lock: guard(function () { tone(now(), 620, 420, 0.06, 0.15, "triangle", 0.003); }),
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
.rcc .d-lt .lw{position:absolute;left:0;top:0;width:100%;height:56px}
.rcc .bulb{position:absolute;width:0;height:0;transform-origin:0 0;animation:rcc-bidle 3.2s ease-in-out infinite;animation-delay:var(--d,0s)}
@keyframes rcc-bidle{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
.rcc .bulb b{position:absolute;left:-1px;top:0;width:2px;height:7px;background:#6b4a2a}
.rcc .bulb u{position:absolute;left:-5px;top:6px;width:10px;height:14px;border-radius:50% 50% 55% 55%/42% 42% 62% 62%;background:radial-gradient(circle at 35% 30%,#fff 0 12%,var(--c) 42%);box-shadow:0 0 9px 2px var(--c);animation:rcc-tw 2.6s ease-in-out infinite;animation-delay:var(--d,0s)}
@keyframes rcc-tw{0%,100%{opacity:1}50%{opacity:.6}}
.rcc .d-lt.hit .bulb{animation:rcc-bhit 1.3s ease-out;animation-delay:calc(var(--i) * 55ms)}
@keyframes rcc-bhit{0%{transform:rotate(0)}15%{transform:rotate(28deg)}35%{transform:rotate(-24deg)}55%{transform:rotate(15deg)}75%{transform:rotate(-8deg)}100%{transform:rotate(0)}}
.rcc .anim-sway{animation:rcc-sway 1s ease-out;transform-origin:50% 100%}
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
.rcc .char{position:absolute;z-index:3;transform:translateX(-50%);transition:left .25s ease,transform .18s ease}
.rcc .char.o{top:80px;width:62px;height:62px;--dir:-1;--fx:200,62,80}
.rcc .char.m{top:375px;width:78px;height:78px;--dir:1;--fx:96,158,236}
.rcc .char.o.lean-l{transform:translateX(-50%) translateX(-10px) rotate(-8deg)}
.rcc .char.o.lean-r{transform:translateX(-50%) translateX(10px) rotate(8deg)}
.rcc .char .body{position:absolute;inset:0;animation:rcc-idle 2.6s ease-in-out infinite}
.rcc .char.m .body{animation-delay:-1.1s}
@keyframes rcc-idle{0%,100%{transform:rotate(-2.5deg) translateX(-1.5px)}50%{transform:rotate(2.5deg) translateX(1.5px)}}
.rcc .char.charge .body{animation:rcc-charge var(--ct,900ms) ease-in forwards}
@keyframes rcc-charge{0%{transform:rotate(0)}15%{transform:rotate(-2deg) translateY(calc(var(--dir) * 1px))}30%{transform:rotate(3deg) translateY(calc(var(--dir) * 2px)) scale(1.01,.99)}45%{transform:rotate(-4deg) translateY(calc(var(--dir) * 3px)) scale(1.02,.97)}60%{transform:rotate(5deg) translateY(calc(var(--dir) * 4px)) scale(1.03,.95)}75%{transform:rotate(-6deg) translateY(calc(var(--dir) * 5px)) scale(1.04,.93)}100%{transform:rotate(-8deg) translateY(calc(var(--dir) * 8px)) scale(1.06,.9)}}
.rcc .char.held .body{animation:rcc-held .22s ease-in-out infinite alternate}
@keyframes rcc-held{from{transform:rotate(-8deg) translateY(calc(var(--dir) * 8px)) scale(1.06,.9)}to{transform:rotate(-6deg) translateY(calc(var(--dir) * 7px)) scale(1.07,.9)}}
.rcc .char.throw .body{animation:rcc-throw .55s cubic-bezier(.2,.9,.3,1) forwards}
@keyframes rcc-throw{0%{transform:rotate(-8deg) translateY(calc(var(--dir) * 8px)) scale(1.06,.9)}25%{transform:rotate(12deg) translateY(calc(var(--dir) * -12px)) scale(.96,1.1)}100%{transform:rotate(0) translateY(0) scale(1)}}
.rcc .aura{position:absolute;inset:-18px;border-radius:50%;pointer-events:none;opacity:0}
.rcc .aura::before{content:"";position:absolute;inset:8px;border-radius:50%;background:radial-gradient(circle,rgba(var(--fx),.7) 0 38%,rgba(var(--fx),.25) 62%,transparent 74%)}
.rcc .aura i{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:rgba(var(--fx),.95);box-shadow:0 0 6px rgba(var(--fx),.9);opacity:0}
.rcc .char.charge .aura{animation:rcc-aura var(--ct,900ms) ease-in forwards}
@keyframes rcc-aura{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1.05)}}
.rcc .char.held .aura{opacity:1;animation:rcc-aurap .5s ease-in-out infinite alternate}
@keyframes rcc-aurap{from{transform:scale(1)}to{transform:scale(1.12)}}
.rcc .char.charge .aura i,.rcc .char.held .aura i{animation:rcc-gather .5s ease-in infinite}
@keyframes rcc-gather{0%{opacity:0;transform:translate(var(--dx),var(--dy))}30%{opacity:1}100%{opacity:0;transform:translate(0,0)}}
.rcc .av2{position:absolute;inset:0;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#6a4a2a;color:#f3e6c8;font-size:26px;border:3px solid #fff;box-shadow:0 4px 8px rgba(40,60,100,.5)}
.rcc .av2 img{width:100%;height:100%;object-fit:cover}
.rcc .char.o .av2{border-color:#f3d4d8}.rcc .char.m .av2{border-color:#e4f0ff}
.rcc .av2.shake{animation:rcc-shake .5s}
@keyframes rcc-shake{20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}
.rcc .splat{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 40% 40%,#fff 0 45%,rgba(255,255,255,.7) 60%,transparent 72%);animation:rcc-splat .7s ease-out forwards}
@keyframes rcc-splat{from{transform:scale(.3);opacity:1}to{transform:scale(1.15);opacity:.9}}
.rcc .mound{position:absolute;z-index:2;width:92px;height:34px;border-radius:50%;background:radial-gradient(#fff,#e3ebf5);transform:translateX(-50%);box-shadow:0 3px 6px rgba(60,90,140,.35)}
.rcc .mound.o{width:80px;height:30px}
.rcc .ball{position:absolute;z-index:4;width:26px;height:26px;border-radius:50%;transform:translate(-50%,-50%)}
.rcc .ball.o{background:radial-gradient(circle at 35% 30%,#fff3f3,#f0b9bf 60%,#c25a68);box-shadow:inset -3px -3px 5px rgba(150,40,60,.45),0 0 12px 5px rgba(200,62,80,.55),0 3px 5px rgba(80,30,40,.4)}
.rcc .ball.m{background:radial-gradient(circle at 35% 30%,#fff,#dcecff 60%,#9cc4f2);box-shadow:inset -3px -3px 5px rgba(80,130,200,.45),0 0 12px 5px rgba(110,175,245,.65),0 3px 5px rgba(50,80,120,.4)}
.rcc .bsh{position:absolute;z-index:1;width:22px;height:8px;border-radius:50%;transform:translate(-50%,-50%);background:rgba(50,70,110,.35)}
.rcc .trail{position:absolute;z-index:3;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;animation:rcc-trail .55s ease-out forwards;pointer-events:none}
.rcc .trail.o{background:rgba(214,88,104,.85);box-shadow:0 0 8px rgba(214,88,104,.7)}
.rcc .trail.m{background:rgba(150,205,252,.9);box-shadow:0 0 8px rgba(130,190,250,.7)}
@keyframes rcc-trail{to{transform:scale(.15);opacity:0}}
.rcc .spl{position:absolute;z-index:4;width:0;height:0;pointer-events:none}
.rcc .spl b{position:absolute;left:-22px;top:-8px;width:44px;height:16px;border-radius:50%;background:radial-gradient(#fff 40%,rgba(255,255,255,.6) 70%,transparent 72%);animation:rcc-stain 1.2s ease-out forwards}
@keyframes rcc-stain{from{transform:scale(.3);opacity:1}30%{transform:scale(1.1)}to{transform:scale(1.25);opacity:.15}}
.rcc .spl i{position:absolute;left:-4px;top:-4px;width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(60,90,140,.4);animation:rcc-pt .65s ease-out forwards}
@keyframes rcc-pt{from{transform:translate(0,0) scale(1)}to{transform:translate(var(--dx),var(--dy)) scale(.3);opacity:0}}
.rcc .mark{position:absolute;z-index:2;width:58px;height:18px;border-radius:50%;transform:translateX(-50%);background:rgba(163,41,58,.28);border:2px solid rgba(163,41,58,.75);transition:left .18s}
.rcc .mark.locked{background:rgba(163,41,58,.5);border:3px solid #a3293a}
.rcc .tell{position:absolute;z-index:4;top:48px;transform:translateX(-50%);padding:3px 11px;border-radius:12px;font-size:13px;font-weight:600;white-space:nowrap;background:#fff;color:#a3293a;box-shadow:0 2px 5px rgba(40,60,100,.35);animation:rcc-bob .55s ease-in-out infinite}
@keyframes rcc-bob{50%{transform:translateX(-50%) translateY(6px)}}
.rcc .bubble{position:absolute;z-index:6;left:50%;top:42px;transform:translateX(-50%);max-width:70%;padding:6px 12px;border-radius:14px;background:#fff;color:#3a2410;font-size:13px;box-shadow:0 3px 8px rgba(40,60,100,.4);text-align:center}
.rcc .res{position:absolute;inset:0;z-index:7;display:grid;place-content:center;gap:10px;text-align:center;background:rgba(20,30,50,.55);color:#fff}
.rcc .res h3{margin:0;font-size:34px;font-weight:400;text-shadow:0 2px 6px rgba(0,0,0,.6)}
.rcc .res .bubble{position:static;transform:none;margin:0 auto}
.rcc .two{display:flex;gap:14px;margin-top:14px}
.rcc .two .btn{flex:1;padding:14px 0;font-size:16px}
.rcc .gh{text-align:center;margin:10px 0 0;font-size:14px;font-weight:600;color:var(--ink);min-height:22px}
.rcc .vs-wrap{display:flex;flex-direction:column;justify-content:space-around;gap:22px;min-height:54vh;padding:6px 0 4px}
.rcc .vs{display:flex;align-items:center;justify-content:center;gap:8px}
.rcc .vs-side{flex:1;min-width:0;text-align:center}
.rcc .vs-pt{width:88px;height:88px;margin:0 auto 10px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#6a4a2a;color:#f3e6c8;font-size:32px}
.rcc .vs-pt img{width:100%;height:100%;object-fit:cover}
.rcc .vs-side.L .vs-pt{box-shadow:0 0 0 3px #9cc4f2,0 0 0 5px #5a3a20,0 5px 9px rgba(0,0,0,.5)}
.rcc .vs-side.R .vs-pt{box-shadow:0 0 0 3px #c9535f,0 0 0 5px #5a3a20,0 5px 9px rgba(0,0,0,.5)}
.rcc .vs-side b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rcc .vs-side small{display:block;color:var(--soft);font-size:12px;letter-spacing:.2em}
.rcc .vs-mk{flex:0 0 auto;font-size:42px;font-weight:700;color:var(--berry);text-shadow:0 2px 0 rgba(255,255,255,.55),0 3px 7px rgba(90,40,20,.35)}
.rcc .vs-st{text-align:center}
.rcc .vs-rec{display:inline-block;padding:8px 28px;border-radius:999px;background:rgba(255,248,230,.45);box-shadow:inset 0 2px 5px rgba(90,58,24,.3);font-size:17px}
.rcc .vs-rec i{font-style:normal;font-weight:700;font-size:26px;color:var(--berry)}
.rcc .vs-st small{display:block;margin-top:8px;color:var(--soft);font-size:12px}
.rcc .vs-btns{text-align:center}
.rcc .btn.big{width:100%;max-width:280px;padding:16px 0;font-size:20px;letter-spacing:.35em}
.rcc .vs-sub{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:14px}
.rcc .vs-note{margin:10px 0 0;text-align:center;color:var(--soft);font-size:12px}
.rcc .vol{display:grid;gap:8px;padding:10px 14px;border-radius:10px;background:rgba(255,248,230,.35);box-shadow:inset 0 2px 4px rgba(90,58,24,.25)}
.rcc .vol label{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--soft)}
.rcc .vol label span{flex:0 0 34px}
.rcc .vol input{flex:1;min-width:0;accent-color:#a8741c}
.rcc .vol em{flex:0 0 38px;font-style:normal;text-align:right}
.rcc .vol small{color:var(--soft);font-size:12px}
.rcc .rl{list-style:none;margin:0;padding:0}
.rcc .rl li{display:flex;gap:12px;padding:12px 0;border-bottom:1px dashed rgba(90,58,24,.4)}
.rcc .rl i{flex:0 0 28px;height:28px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:600;color:#4a2a07;background:radial-gradient(circle at 32% 28%,#fff1b8,#e3b341 40%,#a8741c)}
.rcc .rl b{display:block}
.rcc .rl small{display:block;color:var(--soft);font-size:13px;line-height:1.6}
@media (prefers-reduced-motion:reduce){.rcc .bulb,.rcc .bulb u{animation:none}}
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

      // ---------- 音量 / 音效开关 / 压低唱片机音乐 ----------
      function soundOn() { return st.d.snowSound !== false; }
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
          (down ? '<div class="mark" style="left:' + LANE[b.lane] + '%;top:' + Y.mark + 'px"></div>' : "");
      }
      function spawnBall() { var ar = el(".arena"); if (ar && game.ball) ar.insertAdjacentHTML("beforeend", ballHtml()); }

      // ---------- 雪球飞行：弧线 + 变大变小（模拟抛高）+ 影子 + 彩色拖尾 ----------
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
        var n = 0, cls = down ? "o" : "m";
        trailT = setInterval(function () {
          n++;
          var bb = el(".ball"), ar = el(".arena");
          if (!bb || !ar || n * 35 > dur) { clearInterval(trailT); trailT = null; return; }
          var r1 = bb.getBoundingClientRect(), r2 = ar.getBoundingClientRect(), d = document.createElement("i");
          d.className = "trail " + cls;
          d.style.left = (r1.left + r1.width / 2 - r2.left) + "px"; d.style.top = (r1.top + r1.height / 2 - r2.top) + "px";
          d.addEventListener("animationend", function () { d.remove(); });
          ar.appendChild(d);
        }, 35);
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
        game = { c: c, turn: null, round: 1, hp: { me: 5, opp: 5 }, phase: "intro", lane: { me: rnd() < 0.5 ? 0 : 1, opp: rnd() < 0.5 ? 0 : 1 }, bubble: "", fx: null, ball: null, tell: null, over: null, splat: null, lost: null,
          deco: { sh: 0, sg: 0, fc: 0, sm: 0 }, fxo: null, pose: null, locked: false };
        say("start"); ctx.render(); later(beginDefend, 1500);
      }
      function dur() { return Math.max(850, 1500 - (game.round - 1) * 110); }
      function beginDefend() {
        var ct = chargeMs();
        game.phase = "windup"; game.turn = "defend"; game.fx = null; game.splat = null; game.fxo = null; game.ball = null; game.locked = false; game.bubble = "";
        game.pose = { side: "o", mode: "charge", ct: ct };
        ctx.render(); snd("charge", "o", ct);
        later(throwOpp, ct);
      }
      function throwOpp() {
        var D = dur();
        game.phase = "defend";
        game.ball = { by: "opp", lane: rnd() < 0.5 ? 0 : 1, dur: D };
        setPose("o", "throw", 0); spawnBall();
        later(function () { fly("opp", D); snd("throwBall", "opp", D); }, 30);
        // 变招：对手头像先往要换去的那边偏一下。第 1 回合不变招；第 3 回合起它也会假装偏、其实不换
        var r = game.round, real = rnd() < (r >= 3 ? 0.45 : (r === 2 ? 0.2 : 0));
        var fake = !real && r >= 3 && rnd() < Math.min(0.45, 0.15 * (r - 2));
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
        var bl = game.ball.lane, hit = game.lane.me === bl;
        game.phase = "after"; game.ball = null; game.splat = null; game.lost = null; game.fxo = null; game.pose = null; game.locked = false;
        if (hit) { game.hp.me--; game.fx = "me"; game.lost = "me"; say("hit"); snd("hit"); duck(); later(function () { snd("heart"); }, 170); }
        else { game.splat = { x: LANE[bl], y: Y.meHit + 34 }; say("dodge"); snd("land"); hitDeco("front", bl); }
        ctx.render();
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
        if (hit) { game.hp.opp--; game.fx = "opp"; game.lost = "opp"; say("gotHit"); snd("hit"); duck(); later(function () { snd("heart"); }, 170); }
        else { game.splat = { x: LANE[game.aim], y: Y.oppHit + 4 }; say("miss"); snd("land"); hitDeco("back", game.aim); }
        ctx.render();
        later(function () {
          game.fx = null; game.splat = null; game.lost = null; game.fxo = null;
          if (game.hp.opp <= 0) return finish("win");
          if (game.round >= MAX_ROUND) return finish(game.hp.me > game.hp.opp ? "win" : (game.hp.me < game.hp.opp ? "lose" : "draw"));
          game.round++; beginDefend();
        }, 2000);                                      // 一整轮打完，停久一点让你看清结果
      }
      function finish(r) {
        game.phase = "over"; game.over = r; game.ball = null; game.pose = null;
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
        return '<div class="deco d-lt' + (A("lt") ? " hit" : "") + '" style="left:0;right:0;top:40px;height:56px">' + lightsHtml() + '</div>' +
          '<div class="deco d-tl' + sw("tl") + '" style="left:-4px;top:80px;width:66px;height:104px">' + ART.tree + drops() + '</div>' +
          '<div class="deco d-tr' + sw("tr") + '" style="right:-6px;top:86px;width:60px;height:94px">' + ART.tree + drops() + '</div>' +
          '<div class="deco d-gl' + hp("gl") + '" style="left:42px;top:148px;width:52px;height:36px">' + ART.gifts + '</div>' +
          '<div class="deco d-gr' + hp("gr") + '" style="right:40px;top:150px;width:48px;height:33px">' + ART.gifts + '</div>' +
          '<div class="deco d-pl' + hp("pl") + '" style="left:6px;top:292px;width:52px;height:36px">' + ART.piles + '</div>' +
          tilt("sh", "left:8px;top:386px;width:26px;height:64px", ART.shovel) +
          tilt("fc", "right:0;top:240px;width:66px;height:80px", ART.fence) +
          tilt("sg", "right:6px;top:322px;width:54px;height:81px", ART.sign) +
          '<div class="deco d-sm' + (A("sm") ? " knock" : "") + '" style="right:4px;top:416px;width:58px;height:88px;--x0:' + h0[0] + 'px;--y0:' + h0[1] + 'px;--r0:' + h0[2] + 'deg;--x1:' + h1[0] + 'px;--y1:' + h1[1] + 'px;--r1:' + h1[2] + 'deg">' + ART.snowman + '</div>';
      }
      function charHtml(side, img, name) {
        var g = game, lane = side === "o" ? g.lane.opp : g.lane.me, pose = g.pose && g.pose.side === side ? g.pose : null;
        var shake = (side === "o" && g.fx === "opp") || (side === "m" && g.fx === "me");
        return '<div class="char ' + side + (pose ? " " + pose.mode : "") + '" style="left:' + LANE[lane] + '%' + (pose && pose.ct ? ';--ct:' + pose.ct + 'ms' : "") + '"><div class="aura">' + AURA + '</div>' +
          '<div class="body"><div class="av2' + (shake ? " shake" : "") + '">' + avatar(img, name) + (shake ? '<i class="splat"></i>' : "") + '</div></div></div>';
      }
      function arenaHtml() {
        var g = game, c = g.c, ph = g.phase, u = st.user || {};
        var turn = g.turn === "defend" ? "我方防守" : (g.turn === "attack" ? "我方进攻" : "准备");
        var hearts = function (n, side) { var s = ""; for (var i = 0; i < 5; i++) s += (g.lost === side && i === n) ? brokenHeart() : heart(i < n); return s; };
        var h = '<div class="arena">' + DEFS + '<div class="hill"></div>' + decoHtml() + '<div class="rb">第 ' + g.round + '/' + MAX_ROUND + ' 回合 · ' + turn + '</div>' +
          '<div class="hp o">' + e(ctx.nm(c)) + ' ' + hearts(g.hp.opp, "opp") + '</div>' +
          '<div class="mound o" style="left:' + LANE[g.lane.opp] + '%;top:128px"></div>' + charHtml("o", c.avatar, ctx.nm(c)) +
          '<div class="mound" style="left:' + LANE[g.lane.me] + '%;top:442px"></div>' + charHtml("m", u.avatar, ctx.userName()) +
          '<div class="hp m">' + e(ctx.userName()) + ' ' + hearts(g.hp.me, "me") + '</div>';
        if (g.ball) h += ballHtml();
        if (g.splat) h += splatHtml(g.splat.x, g.splat.y);
        if (g.tell != null) h += '<div class="tell" style="left:' + LANE[g.tell] + '%">↓ 打这边</div>';
        if (g.bubble && !g.over) h += '<div class="bubble">' + e(g.bubble) + '</div>';
        if (g.over) {
          var t = g.over === "win" ? "你赢啦" : (g.over === "lose" ? "你输了" : "平局");
          h += '<div class="res"><h3 class="en">' + t + '</h3>' + (g.bubble ? '<div class="bubble">' + e(g.bubble) + '</div>' : "") +
            '<div><button class="btn" data-act="snow.again">再来一局</button></div></div>';
        }
        h += '</div>';
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
          '<li><i>5</i><span><b>被打中 / 打偏</b><small>被打中会碎掉一颗心。雪球扔偏了，会砸到后面的东西：树会抖，灯泡会晃，木牌、雪人、栅栏会被砸歪。</small></span></li></ul>' +
          '<div class="center"><button class="btn" data-act="snow.ok">' + (go ? "明白了，开战" : "知道了") + '</button></div>';
      }
      function setup() {
        var c = ctx.curChar(), L = c && lines(c), pend = c && st.jobs["snow:" + c.id], u = st.user || {}, s = stats();
        function side(img, name, tag, cls) { return '<div class="vs-side ' + cls + '"><div class="vs-pt">' + avatar(img, name) + '</div><b>' + e(name) + '</b><small>' + tag + '</small></div>'; }
        var h = ctx.picker(false) + '<div class="vs-wrap">' +
          '<div class="vs">' + side(u.avatar, ctx.userName(), "我 方", "L") + '<div class="vs-mk en">VS</div>' + side(c && c.avatar, ctx.nm(c), "对 手", "R") + '</div>' +
          '<div class="vs-st"><div class="vs-rec"><i>' + s.win + '</i> 胜　<i>' + s.lose + '</i> 负</div><small>每人 5 颗心 · 最多 ' + MAX_ROUND + ' 回合 · 台词' + (L ? "已备好" : "未准备") + '</small></div>' +
          '<div class="vs-btns"><button class="btn big" data-act="snow.go"' + (c ? "" : " disabled") + '>开 战</button>' +
          '<div class="vs-sub"><button class="btn ghost sm" data-act="snow.rules">玩法说明</button>' +
          '<button class="btn ghost sm" data-act="snow.lines"' + (pend ? " disabled" : "") + '>' + (pend ? "准备中" : (L ? "重新准备台词" : "准备台词")) + '</button>' +
          '<button class="btn ghost sm" data-act="snow.snd">音效：' + (soundOn() ? "开" : "关") + '</button></div>' +
          '<p class="vs-note">' + (L ? "台词已备好，不会再花钱。" : "不准备台词也能开战，会用通用台词；准备一次要调用一次模型，之后永久缓存。") + '</p></div>' +
          '<div class="vol"><label><span>音乐</span><input type="range" min="0" max="100" step="5" value="' + musicVol() + '" data-vol="music"' + (R.duck ? "" : " disabled") + '><em>' + musicVol() + '%</em></label>' +
          '<label><span>音效</span><input type="range" min="0" max="100" step="5" value="' + sfxVol() + '" data-vol="sfx"><em>' + sfxVol() + '%</em></label>' +
          (R.duck ? "" : '<small>音乐音量还没接上唱片机（需要在 record.js 加一行，见更新说明）</small>') + '</div></div>';
        if (pend) h += ctx.wait(e(lineMsg || "正在准备台词，你可以先去别处逛逛"));
        return h;
      }

      return {
        init: function () { SFX.setVol(sfxVol() / 100); applyMusic(1); },
        destroy: function () { clearAll(); ctx.root.removeEventListener("input", onRange); ctx.root.removeEventListener("change", onRangeDone); },
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
            if (game.turn === "defend" && (game.phase === "windup" || game.phase === "defend") && !game.locked) {
              game.lane.me = l;
              var m = el(".char.m"), md = ctx.view.querySelectorAll(".mound");
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
