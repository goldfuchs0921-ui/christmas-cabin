/* snow-art.js — 雪仗的画面素材、全部样式和代码合成音效（snow.js 的一部分，单独放出来是为了好改）
 * 内容：爱心 / 飞溅 / 背景 SVG 摆件 / 灯串 / 蓄力光圈 / WebAudio 音效 / 全部 CSS
 * 想换摆件画法、调音效、改样式，只改这个文件；玩法逻辑在 snow.js */
(function () {
  "use strict";
  var R = window.RCC;
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
      suspend: function () { if (ac && ac.state === "running") { try { ac.suspend(); } catch (e) { /* 忽略 */ } } },
      // 说话哔哔声：一个字一声，音高在一组音阶里随机（像动物森友会）
      blip: guard(function (f, d) { tone(now(), f, f * 0.96, d || 0.06, 0.1, "triangle", 0.004); }),
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
.rcc .arena{position:absolute;left:0;top:0;width:360px;height:520px;transform:scale(var(--s,1));transform-origin:0 0;border-radius:12px;overflow:hidden;background:linear-gradient(#8fa8cf 0%,#d6e2f2 21.5%,#f6f9fc 22%,#dfe8f2 100%);box-shadow:inset 0 0 22px rgba(50,70,110,.4),0 0 0 2px #5a3a20}
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
.rcc .ball.o,.rcc .ball.m{background:radial-gradient(circle at 35% 30%,#fff,#eef3fa 55%,#b9c9e2);box-shadow:inset -2px -3px 4px rgba(90,120,170,.35),0 2px 3px rgba(50,70,110,.3)}
.rcc .bsh{position:absolute;z-index:1;width:22px;height:8px;border-radius:50%;transform:translate(-50%,-50%);background:rgba(50,70,110,.35)}
.rcc .trail{position:absolute;z-index:3;background:radial-gradient(circle at 35% 30%,#fff,#e4ecf7);box-shadow:0 1px 2px rgba(60,90,140,.35);pointer-events:none}
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
.rcc .vs-btns{text-align:center}
.rcc .btn.big{width:100%;max-width:280px;padding:16px 0;font-size:20px;letter-spacing:.35em}
.rcc .vs-sub{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:14px}
.rcc .vs-note{margin:10px 0 0;text-align:center;color:var(--soft);font-size:12px;min-height:3.4em;height:3.4em;overflow:hidden}
.rcc .vol{display:grid;gap:8px;padding:10px 14px;border-radius:10px;background:rgba(255,248,230,.35);box-shadow:inset 0 2px 4px rgba(90,58,24,.25)}
.rcc .vol label{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--soft)}
.rcc .vol label span{flex:0 0 34px}
.rcc .vol input{flex:1;min-width:0;height:24px;margin:0;background:transparent;-webkit-appearance:none;appearance:none}
.rcc .vol input::-webkit-slider-runnable-track{height:2px;background:#8a6a45;border-radius:1px}
.rcc .vol input::-moz-range-track{height:2px;background:#8a6a45;border-radius:1px}
.rcc .vol input::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:22px;margin-top:-10px;border-radius:2px;border:1px solid #3c2410;background:repeating-linear-gradient(90deg,rgba(60,36,16,.18) 0 1px,transparent 1px 3px),linear-gradient(90deg,#b78652,#9a6c3b 55%,#6e4724);box-shadow:inset 0 1px 0 rgba(255,235,190,.5),0 2px 3px rgba(0,0,0,.45)}
.rcc .vol input::-moz-range-thumb{width:10px;height:20px;border-radius:2px;border:1px solid #3c2410;background:linear-gradient(90deg,#b78652,#9a6c3b 55%,#6e4724);box-shadow:inset 0 1px 0 rgba(255,235,190,.5),0 2px 3px rgba(0,0,0,.45)}
.rcc .vol input:disabled{opacity:.4}
.rcc .sel-zone{padding:0 0 8px;margin:0 0 14px;border-bottom:1px solid rgba(90,58,24,.45);box-shadow:0 1px 0 rgba(255,248,230,.5)}
.rcc .vs-zone{max-width:520px;margin-left:auto;margin-right:auto;padding:14px 10px 12px;border-radius:12px;background:rgba(120,80,30,.14);box-shadow:inset 0 3px 8px rgba(90,58,24,.32),inset 0 0 0 1px rgba(90,58,24,.25)}
.rcc .vol em{flex:0 0 38px;font-style:normal;text-align:right}
.rcc .vol small{color:var(--soft);font-size:12px}
.rcc .rl{list-style:none;margin:0;padding:0}
.rcc .rl li{display:flex;gap:12px;padding:12px 0;border-bottom:1px dashed rgba(90,58,24,.4)}
.rcc .rl i{flex:0 0 28px;height:28px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:600;color:#4a2a07;background:radial-gradient(circle at 32% 28%,#fff1b8,#e3b341 40%,#a8741c)}
.rcc .rl b{display:block}
.rcc .rl small{display:block;color:var(--soft);font-size:13px;line-height:1.6}
.rcc .vs-note .link{padding:0 4px;font-size:12px;line-height:inherit}
.rcc .vs-note .nd{display:inline-block;width:7px;height:7px;margin-right:6px;border-radius:50%;background:#c58a1d;box-shadow:0 0 5px #e3b341;animation:rcc-pulse 1.2s ease-in-out infinite}
.rcc .intro-tip{position:absolute;z-index:6;left:50%;top:228px;transform:translateX(-50%);max-width:82%;padding:7px 16px;border-radius:16px;background:#fff8e6;color:#5a2a14;font-size:14px;font-weight:600;text-align:center;box-shadow:0 0 0 2px #5a3a20,0 3px 8px rgba(40,60,100,.4);animation:rcc-tip .5s ease-out}
@keyframes rcc-tip{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%)}}
.rcc .res.hs{display:block;overflow:hidden;background:linear-gradient(rgba(140,165,205,.8),rgba(238,245,252,.93));color:#3a2410}
.rcc .res.hs h3{color:#3a2410;text-shadow:0 2px 0 rgba(255,255,255,.7)}
.rcc .hs-hill{position:absolute;z-index:0;left:-15%;right:-15%;top:292px;bottom:-70px;border-radius:50%;background:#fff;box-shadow:0 -4px 10px rgba(120,150,190,.35)}
.rcc .hs-t{position:absolute;left:0;right:0;top:56px;text-align:center}
.rcc .hs-t .zh{color:#7a5a3a}
.rcc .hs-bub{position:absolute;left:0;right:0;top:158px;text-align:center}
.rcc .hs-row{position:absolute;z-index:1;left:0;right:0;top:226px;display:flex;justify-content:center;align-items:center;gap:8px}
.rcc .hs-av{width:66px;height:66px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#6a4a2a;color:#f3e6c8;font-size:26px;border:3px solid #fff;box-shadow:0 4px 8px rgba(40,60,100,.5)}
.rcc .hs-av img{width:100%;height:100%;object-fit:cover}
.rcc .hs-av.l{animation:rcc-hsl .9s ease-out both}.rcc .hs-av.r{animation:rcc-hsr .9s ease-out both}
@keyframes rcc-hsl{from{transform:translateX(-90px)}to{transform:none}}
@keyframes rcc-hsr{from{transform:translateX(90px)}to{transform:none}}
.rcc .hs-mid{display:grid;place-items:center;animation:rcc-pulse 1.4s ease-in-out infinite}
.rcc .hs-btn{position:absolute;z-index:1;left:0;right:0;bottom:26px;text-align:center}
.rcc .aw{display:flex;justify-content:center}
.rcc .ab{position:relative;flex:0 0 auto;width:calc(360px * var(--s,1));height:calc(520px * var(--s,1))}
.rcc .sty-badge{position:absolute;z-index:2;right:-9px;top:-7px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-style:normal;font-weight:700;line-height:1;color:#fff;box-shadow:0 0 0 2px #fff,0 2px 4px rgba(0,0,0,.4)}
.rcc .s-tricky{background:#7a4aa8}.rcc .s-tsun{background:#e0702a}.rcc .s-gentle{background:#e07a98}.rcc .s-cool{background:#4a86b0}
.rcc .char.fume .av2{animation:rcc-fume .09s linear infinite}
@keyframes rcc-fume{0%,100%{transform:translateX(-2.5px)}50%{transform:translateX(2.5px)}}
.rcc .vs-side.R{position:relative}
.rcc .vs-sub .btn{padding:6px 10px;letter-spacing:0;white-space:nowrap}
.rcc .cl .set{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid rgba(90,58,24,.25)}
.rcc .cl .set b{display:block;font-weight:600}
.rcc .cl .set small{display:block;color:var(--soft);font-size:12px;line-height:1.5}
.rcc .cardimg{display:block;max-width:100%;margin:0 auto;border-radius:6px;box-shadow:0 4px 10px rgba(60,30,0,.45)}
.rcc .evbox{margin-top:14px;padding-top:12px;border-top:1px dashed rgba(90,58,24,.45)}
.rcc .evbox b{display:block;font-weight:600}
.rcc .evbox small{display:block;color:var(--soft);font-size:12px;line-height:1.5;margin:2px 0 8px}
.rcc .ball.o.heavy{background:radial-gradient(circle at 35% 30%,#fff,#ffd6d6 50%,#e05a5a);box-shadow:0 0 12px 4px rgba(255,70,70,.75),inset -2px -3px 4px rgba(150,40,40,.4)}
.rcc .mark.heavy{background:rgba(200,30,30,.45);border-color:#d41f2f;animation:rcc-hv .35s ease-in-out infinite alternate}
@keyframes rcc-hv{to{transform:translateX(-50%) scale(1.18)}}
@media (prefers-reduced-motion:reduce){.rcc .bulb,.rcc .bulb u{animation:none}.rcc .char.fume .av2{animation:none}}
`;

  R.snowArt = { heart: heart, brokenHeart: brokenHeart, splatHtml: splatHtml, DEFS: DEFS, ART: ART, lightsHtml: lightsHtml, drops: drops, AURA: AURA, SFX: SFX, css: CSS };
})();
