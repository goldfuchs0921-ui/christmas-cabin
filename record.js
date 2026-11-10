/* record.js — 圣诞唱片机
 * 两个唱片架（不混着播，切换架子就停）：圣诞经典（代码合成的音乐盒版，平安夜 12/24 起解锁《平安夜》）/ 我的唱片（本地音频，保存在插件里）
 * 内置歌先用 OfflineAudioContext 合成成 WAV，再和你的音频一起用同一个 <audio> 播放：静音键不影响、可锁屏控制
 * 悬浮小卡片：可拖动，点唱片收成小圆球，只有点 ✕ 才消失；在圣诞小屋任何页面都能继续播，离开小屋就停
 * 切后台（设置里可关）：自动暂停，回到圣诞小屋自动接着播；如果系统不让自动播，点一下 ▶ 即可 */
(function () {
  "use strict";
  var R = window.RCC;
  var MAX_SONGS = 10, MAX_MB = 15;
  var REST = -8, FULL = 90;   // 臂针休息角度；唱片满速 90°/秒（4 秒一圈）

  function parse(s) { return s.trim().split(/\s+/).map(function (t) { var p = t.split(":"); return [p[0] === "R" ? null : p[0], parseFloat(p[1])]; }); }
  var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(n) { var m = /^([A-G])(#?)(\d)$/.exec(n); return 440 * Math.pow(2, (12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] ? 1 : 0) - 69) / 12); }

  var JB1 = "E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1.5 D4:.5 E4:4 F4:1 F4:1 F4:1.5 F4:.5 F4:1 E4:1 E4:1 E4:.5 E4:.5 ";
  var DH_A = "G4:1.5 F4:.5 E4:1 D4:1 C4:1 D4:1 E4:1 C4:1 D4:1.5 E4:.5 F4:1 D4:1 E4:1.5 D4:.5 C4:1 B3:1 C4:2 R:1 ";
  var WY = "G4:1 C5:1 C5:.5 D5:.5 C5:.5 B4:.5 A4:1 A4:1 A4:1 D5:1 D5:.5 E5:.5 D5:.5 C5:.5 B4:1 G4:1 G4:1 " +
    "E5:1 E5:.5 F5:.5 E5:.5 D5:.5 C5:1 A4:1 G4:.5 G4:.5 A4:1 D5:1 B4:1 C5:3 R:1 ";
  var SN_5 = "A4:2 A4:1 C5:1.5 B4:.5 A4:1 G4:1.5 A4:.5 G4:1 E4:3 ";
  var SONGS = [
    { id: "jb", t: "铃儿响叮当", e: "Jingle Bells", bpm: 150,
      seq: parse(JB1 + "E4:1 D4:1 D4:1 E4:1 D4:2 G4:2 " + JB1 + "G4:1 G4:1 F4:1 D4:1 C4:4 R:2") },
    { id: "dh", t: "装饰大厅", e: "Deck the Halls", bpm: 138,
      seq: parse(DH_A + DH_A + "D4:1.5 E4:.5 F4:1 D4:1 E4:1.5 F4:.5 G4:1 D4:1 E4:.5 F4:.5 G4:.5 A4:.5 B4:.5 C5:.5 B4:.5 A4:.5 G4:2 R:1 " +
        "G4:1.5 F4:.5 E4:1 D4:1 C4:1 D4:1 E4:1 C4:1 A4:.5 A4:.5 A4:.5 A4:.5 G4:.5 F4:.5 E4:.5 D4:.5 C4:3 R:2") },
    { id: "wy", t: "我们祝你圣诞快乐", e: "We Wish You a Merry Christmas", bpm: 132, seq: parse(WY + WY) },
    { id: "sn", t: "平安夜", e: "Silent Night", bpm: 76, lock: true,
      seq: parse("G4:1.5 A4:.5 G4:1 E4:3 G4:1.5 A4:.5 G4:1 E4:3 D5:2 D5:1 B4:3 C5:2 C5:1 G4:3 " + SN_5 + SN_5 +
        "D5:2 D5:1 F5:1.5 D5:.5 B4:1 C5:3 E5:3 C5:1 G4:1 E4:1 G4:1.5 F4:.5 D4:1 C4:3 R:3") }
  ];
  R.record = { songs: SONGS };   // 方便测试

  function wavBlob(buf) {
    var d = buf.getChannelData(0), n = d.length, v = new DataView(new ArrayBuffer(44 + n * 2)), i;
    function w(o, s) { for (var k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); }
    w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, buf.sampleRate, true); v.setUint32(28, buf.sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
    var pk = 0.0001, k2;
    for (k2 = 0; k2 < n; k2++) { var a = Math.abs(d[k2]); if (a > pk) pk = a; }
    var gain = 0.8 / pk;   // 统一归一化音量，避免叠音时爆音
    for (i = 0; i < n; i++) { var x = Math.max(-1, Math.min(1, d[i] * gain)); v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
    return new Blob([v.buffer], { type: "audio/wav" });
  }
  // 音乐盒音色：基音 + 2 倍泛音 + 4 倍高音，快起音、慢衰减，再叠一层回声
  async function synth(song) {
    var sr = 22050, spb = 60 / song.bpm, total = 0;
    song.seq.forEach(function (n) { total += n[1] * spb; });
    var OC = window.OfflineAudioContext || window.webkitOfflineAudioContext, c = new OC(1, Math.ceil((total + 3) * sr), sr);
    var out = c.createGain(); out.gain.value = 0.55;
    var dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain();
    dl.delayTime.value = 0.3; fb.gain.value = 0.28; wet.gain.value = 0.3;
    out.connect(c.destination); out.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(c.destination);
    var t = 0.1;
    song.seq.forEach(function (n) {
      var dur = n[1] * spb;
      if (n[0]) {
        var len = Math.max(0.9, dur * 1.4), g = c.createGain();
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + len); g.connect(out);
        [[1, 1, "sine"], [2.01, 0.35, "sine"], [4.2, 0.12, "triangle"]].forEach(function (p) {
          var o = c.createOscillator(), og = c.createGain();
          o.type = p[2]; o.frequency.value = freq(n[0]) * p[0]; og.gain.value = p[1]; o.connect(og); og.connect(g); o.start(t); o.stop(t + len + 0.05);
        });
      }
      t += dur;
    });
    return wavBlob(await c.startRendering());
  }
  var MIME = { mp3: "audio/mpeg", m4a: "audio/mp4", m4b: "audio/mp4", aac: "audio/aac", wav: "audio/wav", flac: "audio/flac", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", mp4: "video/mp4", caf: "audio/x-caf", aif: "audio/aiff", aiff: "audio/aiff" };
  function dataToBlob(du, mime) {
    var m = /^data:([^;,]*)(;base64)?,(.*)$/.exec(du), bin = atob(m[3]), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type: mime || (m[1] && m[1] !== "application/octet-stream" ? m[1] : "audio/mpeg") });
  }
  function readAsDataURL(file) {
    return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = function () { no(new Error("读取文件失败")); }; r.readAsDataURL(file); });
  }

  var IC = {
    play: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M8 5v14l11-7z" fill="#4a2a07"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="#4a2a07"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M6 5l9 7-9 7zM17 5h2v14h-2z" fill="#4a2a07"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M18 5l-9 7 9 7zM5 5h2v14H5z" fill="#4a2a07"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 6l12 12M18 6L6 18" stroke="#4a2a07" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
    repeat: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#4a2a07" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l3 3-3 3M4 11V9a3 3 0 013-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 01-3 3H4"/></svg>',
    repeat1: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#4a2a07" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l3 3-3 3M4 11V9a3 3 0 013-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 01-3 3H4"/><path d="M11 10.5l1.5-1v6" stroke-width="1.8"/></svg>',
    vinyl: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="#222" stroke="#8a5a1c" stroke-width="2"/><circle cx="24" cy="24" r="9" fill="none" stroke="#555" stroke-width=".8"/><circle cx="24" cy="24" r="6" fill="#a3293a"/><circle cx="24" cy="24" r="1.6" fill="#f3e6c8"/></svg>'
  };

  var CSS = `
.rcc .disc{display:block;width:100%;height:100%;border-radius:50%;will-change:transform;box-shadow:0 3px 8px rgba(0,0,0,.6),inset 0 0 0 2px #000;
background:conic-gradient(from 20deg,transparent 0 18%,rgba(255,255,255,.16) 24%,transparent 30% 68%,rgba(255,255,255,.16) 74%,transparent 80%),radial-gradient(circle,#f3e6c8 0 3%,#c98d26 3% 13%,#a3293a 13% 30%,#111 30% 33%,transparent 33%),repeating-radial-gradient(circle,#151515 0 2px,#262626 2px 3px)}
.rcc .ttw{position:relative;width:min(100%,300px);margin:0 auto 12px}
.rcc .tt{position:absolute;left:0;top:0;width:300px;height:230px;transform-origin:0 0;border-radius:12px;box-shadow:inset 0 0 18px rgba(0,0,0,.65),0 0 0 3px #2c180c,0 8px 14px rgba(0,0,0,.5)}
.rcc .tt .plate{position:absolute;left:24px;top:22px;width:186px;height:186px}
.rcc .tt .arm{position:absolute;right:30px;top:18px;width:8px;height:122px;border-radius:4px;background:linear-gradient(90deg,#f6dc8f,#c9962f 50%,#8a5a1c);box-shadow:0 2px 4px rgba(0,0,0,.6);transform-origin:50% 7px;transform:rotate(-8deg);will-change:transform}
.rcc .tt .arm::after{content:"";position:absolute;left:-4px;bottom:-12px;width:16px;height:20px;border-radius:3px 3px 7px 7px;background:linear-gradient(#e3b341,#8a5a1c);box-shadow:0 2px 3px rgba(0,0,0,.6)}
.rcc .tt .arm::before{content:"";position:absolute;top:-7px;left:-5px;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff1b8,#a8741c)}
.rcc .np{text-align:center;font-size:18px;min-height:46px}
.rcc .np small{display:block;color:var(--soft);font-size:12px;font-style:italic}
.rcc .ctl{display:flex;justify-content:center;align-items:center;gap:16px;margin:8px 0 14px}
.rcc .ctl .gbtn.big{width:50px;height:50px}
.rcc .ctl .gbtn[disabled]{opacity:.4}
.rcc .ctl .gbtn.act{box-shadow:0 0 0 3px #a3293a,inset 0 1px 1px rgba(255,255,255,.75),0 2px 4px rgba(0,0,0,.6)}
.rcc .songs{list-style:none;margin:6px 0 0;padding:0}
.rcc .songs li{display:flex;align-items:center;border-bottom:1px dashed rgba(90,58,24,.4)}
.rcc .songs .sg{flex:1;min-width:0;display:flex;align-items:center;gap:12px;padding:11px 0;background:none;border:0;text-align:left;color:var(--ink)}
.rcc .songs .sg i{flex:0 0 22px;font-style:normal;color:var(--soft);text-align:center}
.rcc .songs .sg>span{flex:1;min-width:0;overflow:hidden}
.rcc .songs .sg b{display:block;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rcc .songs .sg small{display:block;color:var(--soft);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rcc b.mq{text-overflow:clip}
.rcc .mq .tr{display:inline-block;white-space:nowrap}
.rcc .mq .tr em{display:inline-block;font-style:normal}
.rcc .mq .tr em+em{margin-left:32px}
.rcc .mq .tr.run{animation:rcc-mq var(--mt,8s) linear 1s infinite}
@keyframes rcc-mq{from{transform:translateX(0)}to{transform:translateX(var(--mq,0px))}}
@media (prefers-reduced-motion:reduce){.rcc b.mq{text-overflow:ellipsis}.rcc .mq .tr,.rcc .mq .tr em{display:inline}}
.rcc .songs li.cur .sg b{color:var(--berry)}
.rcc .songs li.lock .sg{opacity:.55}
.rcc .songs .del{background:none;border:0;color:var(--soft);font-size:20px;padding:10px 11px}
.rcc .songs li.ren{gap:8px;padding:8px 0}
.rcc .songs li.ren .in{flex:1}
.rcc .rfl{position:absolute;z-index:6;display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:32px;color:var(--ink);touch-action:none;max-width:calc(100% - 12px);background-color:var(--paper);background-image:var(--tex-paper,none);background-size:256px 256px;box-shadow:inset 0 0 14px rgba(120,76,24,.5),0 0 0 2px #5a3a20,0 0 0 3px rgba(255,214,150,.3),0 6px 12px rgba(0,0,0,.55)}
.rcc .rfl-v{flex:0 0 auto;width:40px;height:40px;border:0;padding:0;background:none}
.rcc .rfl-t{min-width:0;max-width:92px;line-height:1.25}
.rcc .rfl-t b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rcc .rfl-t small{font-size:10px;color:var(--soft)}
.rcc .rfl .gbtn{width:30px;height:30px}
.rcc .rfl.mini{padding:6px;border-radius:50%}
.rcc .rfl.mini .rfl-t,.rcc .rfl.mini .gbtn{display:none}
`;

  R.add({
    id: "record", style: CSS, jobs: "record:",
    home: { order: 5, en: "Record Player", zh: "唱 片 机", desc: "圣诞音乐盒，也能放你自己的唱片", icon: "record", svg: IC.vinyl },
    create: function (ctx) {
      var roche = ctx.roche, st = ctx.st, e = ctx.esc;
      var shelf = "xmas", cur = null, playing = false, mini = false, audio = new Audio();
      var loopOne = false, xurls = {}, preparing = false, mine = [], murls = {}, loadingMine = false, msg = "", drag = null, renaming = -1, renText = "";
      R.duck = function (v) { try { audio.volume = v; } catch (err) {} };
      // ---------- 唱片 / 臂针：角度由代码记着，页面重绘也不会回到起点 ----------
      var ang = 0, spd = 0, armA = REST, armV = 0, raf = 0, lastT = 0, wob = 0;
      function discHtml() { return '<i class="disc" style="transform:rotate(' + ang.toFixed(1) + 'deg)"></i>'; }
      function tsOf() { return Math.min(1, Math.max(0.6, ((ctx.view.clientWidth || 360) - 60) / 300)); }   // 唱机台缩放比例（按 300 宽画，窄屏整体缩小）
      // 臂针的目标角度：没在播放就回到休息位；播放时按歌曲进度，从唱片外圈慢慢走向内圈
      function armTarget() {
        if (!playing || !cur) return REST;
        var d = audio.duration, p = d > 0 && isFinite(d) ? Math.min(1, audio.currentTime / d) : 0;
        var px = 300 - 34, dx = px - 117, dy = 115 - 25, dist = Math.hypot(dx, dy), base = Math.atan2(dx, dy) * 180 / Math.PI, L = 120;
        function at(rho) { var c = (dist * dist + L * L - rho * rho) / (2 * dist * L); return base - Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI; }
        return at(88) + (at(60) - at(88)) * p;
      }
      function applyAnim() {
        var ds = ctx.root.querySelectorAll(".disc"), i;
        for (i = 0; i < ds.length; i++) ds[i].style.transform = "rotate(" + ang.toFixed(1) + "deg)";
        var ar = ctx.view.querySelector(".arm");
        if (ar) ar.style.transform = "rotate(" + (armA + wob).toFixed(2) + "deg)";
      }
      function tick(t) {
        raf = 0;
        if (lastT && t - lastT < 30) { raf = requestAnimationFrame(tick); return; }   // 约 30 帧，省电
        if (!lastT) lastT = t;
        var dt = Math.min(0.05, Math.max(0.001, (t - lastT) / 1000)); lastT = t;
        spd += ((playing ? FULL : 0) - spd) * Math.min(1, dt * (playing ? 1.4 : 0.9));    // 慢慢加速 / 慢慢减速
        if (!playing && spd < 0.4) spd = 0;
        ang = (ang + spd * dt) % 360;
        var tg = armTarget(), acc = 14 * (tg - armA) - 5.2 * armV;                        // 弹簧：落下时带一点点回弹
        armV += acc * dt; armA += armV * dt;
        wob = playing && Math.abs(tg - armA) < 1.2 ? Math.sin(t / 95) * 0.16 + Math.sin(t / 37) * 0.07 : 0;   // 针落在唱片上的轻微抖动
        applyAnim();
        if (playing || spd > 0 || Math.abs(tg - armA) > 0.03 || Math.abs(armV) > 0.05) raf = requestAnimationFrame(tick);
        else { lastT = 0; wob = 0; applyAnim(); }
      }
      // 渲染后量一下：放不下才跑；把歌名复制一份接在后面，从右往左单向循环（约 45px/秒）
      function fitMq() {
        if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        requestAnimationFrame(function () {
          var bs = ctx.root.querySelectorAll(".songs li.pl .mq, .rfl:not(.mini) .rfl-t .mq"), i;
          for (i = 0; i < bs.length; i++) {
            var b = bs[i], tr = b.firstChild, em = tr && tr.firstChild;
            if (!em || tr.classList.contains("run")) continue;
            var w = em.offsetWidth;
            if (w - b.clientWidth > 2) {
              tr.appendChild(em.cloneNode(true));
              tr.style.setProperty("--mq", -(w + 32) + "px");
              tr.style.setProperty("--mt", ((w + 32) / 45).toFixed(2) + "s");
              tr.classList.add("run");
            }
          }
        });
      }
      var mo = null;
      try { mo = new MutationObserver(fitMq); mo.observe(ctx.view, { childList: true }); } catch (err) { /* 没有就不跑马灯，只省略 */ }
      function kick() { if (!raf) { lastT = 0; raf = requestAnimationFrame(tick); } }
      var wasPlaying = false;
      function onVis() {
        if (ctx.cfg.bgPause === false) return;
        if (document.hidden) { if (cur && playing) { wasPlaying = true; audio.pause(); } }
        else if (wasPlaying) {
          wasPlaying = false;
          var p = audio.play();
          if (p && p.catch) p.catch(function () { roche.ui.toast("欢迎回来，点一下 ▶ 继续播放"); });
        }
      }
      document.addEventListener("visibilitychange", onVis);
      async function saveRename() {
        var s0 = mine[renaming], n = String(renText || "").trim().slice(0, 40);
        if (!s0) { renaming = -1; return ctx.render(); }
        if (!n) return roche.ui.toast("名字不能是空的");
        s0.name = n; renaming = -1;
        await roche.storage.set("recIndex", mine);
        roche.ui.toast("已改名"); refresh();
      }
      function onRenIn(ev) { var t = ev.target; if (t && t.dataset && t.dataset.ren != null) renText = t.value; }
      function onRenKey(ev) { var t = ev.target; if (ev.key === "Enter" && t && t.dataset && t.dataset.ren != null) { ev.preventDefault(); saveRename(); } }
      ctx.root.addEventListener("input", onRenIn); ctx.root.addEventListener("keydown", onRenKey);
      function clampFl() {
        if (!fl.dataset.placed || fl.style.display === "none") return;
        var rw = ctx.root.clientWidth, rh = ctx.root.clientHeight;
        fl.style.left = Math.max(0, Math.min(rw - fl.offsetWidth, fl.offsetLeft)) + "px";
        fl.style.top = Math.max(0, Math.min(rh - fl.offsetHeight, fl.offsetTop)) + "px";
      }
      var lastTs = 0;
      function onRz() { clampFl(); if (onRecordPage() && renaming < 0 && Math.abs(tsOf() - lastTs) > 0.01) ctx.render(); kick(); }   // 转屏 / 键盘弹出：卡片拉回屏幕内，唱机台重新缩放
      window.addEventListener("resize", onRz);
      if (window.visualViewport) visualViewport.addEventListener("resize", onRz);
      var fl = document.createElement("div");
      fl.className = "rfl"; fl.style.display = "none"; ctx.root.appendChild(fl);

      function unlocked(s) { var n = new Date(); return !s.lock || ctx.cfg.test || (n.getMonth() === 11 && n.getDate() >= 24); }
      function list(sh) { return sh === "xmas" ? SONGS : mine; }
      function urlOf(sh, i) { return sh === "xmas" ? xurls[SONGS[i].id] : murls[mine[i].id]; }
      function sh2t(s) { return s.t || s.name; }
      function onRecordPage() { return st.view === "record"; }

      function paintFloat() {
        if (!cur) { fl.style.display = "none"; return; }
        var s = list(cur.shelf)[cur.idx];
        fl.className = "rfl" + (playing ? " playing" : "") + (mini ? " mini" : "");
        fl.innerHTML = '<button class="rfl-v" aria-label="收起或展开">' + discHtml() + '</button><div class="rfl-t">' + (playing ? '<b class="mq"><span class="tr"><em>' + e(sh2t(s)) + '</em></span></b>' : '<b>' + e(sh2t(s)) + '</b>') + '<small>' + (cur.shelf === "xmas" ? "圣诞经典" : "我的唱片") + '</small></div>' +
          '<button class="gbtn" data-act="record.pp" aria-label="播放或暂停">' + (playing ? IC.pause : IC.play) + '</button><button class="gbtn" data-act="record.next" aria-label="下一首">' + IC.next + '</button>' +
          '<button class="gbtn" data-act="record.close" aria-label="关闭">' + IC.close + '</button>';
        fl.style.display = "flex";
        if (!fl.dataset.placed) { fl.style.left = Math.max(0, ctx.root.clientWidth - fl.offsetWidth - 10) + "px"; fl.style.top = "calc(76px + max(env(safe-area-inset-top, 0px), 12px))"; fl.dataset.placed = "1"; }
        else clampFl();
        fitMq();
      }
      function refresh() { paintFloat(); if (onRecordPage()) ctx.render(); }

      function play(sh, i) {
        var s = list(sh)[i], url = urlOf(sh, i);
        if (!s) return;
        if (!unlocked(s)) return roche.ui.toast("这首歌还没解锁");
        if (!url) return roche.ui.toast("唱片还在准备，稍等一下再点");
        audio.src = url; cur = { shelf: sh, idx: i };
        var p = audio.play(); if (p && p.catch) p.catch(function () { roche.ui.toast("播放被系统拦住了，再点一次播放试试"); });
        try {
          if (navigator.mediaSession) {
            navigator.mediaSession.metadata = new MediaMetadata({ title: sh2t(s), artist: "圣诞小屋" });
            navigator.mediaSession.setActionHandler("play", function () { audio.play(); });
            navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); });
            navigator.mediaSession.setActionHandler("nexttrack", function () { step(1); });
            navigator.mediaSession.setActionHandler("previoustrack", function () { step(-1); });
          }
        } catch (err) { /* 不支持就算了 */ }
        refresh();
      }
      function step(d) {
        if (!cur) return;
        var L = list(cur.shelf), n = L.length;
        for (var k = 1; k <= n; k++) {
          var j = ((cur.idx + d * k) % n + n) % n;
          if (unlocked(L[j]) && urlOf(cur.shelf, j)) return play(cur.shelf, j);
        }
      }
      function stop() {
        audio.pause(); audio.removeAttribute("src"); try { audio.load(); } catch (err) { /* 忽略 */ }
        cur = null; playing = false; refresh(); kick();
      }
      audio.addEventListener("play", function () { playing = true; refresh(); kick(); });
      audio.addEventListener("pause", function () { if (!audio.ended) { playing = false; refresh(); kick(); } });
      audio.addEventListener("ended", function () { step(1); });
      audio.addEventListener("error", function () { if (audio.getAttribute("src")) roche.ui.toast("这个音频播放不了，换一首试试"); });

      async function prepare() {
        if (preparing) return;
        preparing = true;
        try {
          var todo = SONGS.filter(function (s) { return unlocked(s) && !xurls[s.id]; }), i;
          for (i = 0; i < todo.length; i++) {
            msg = "正在给唱片上蜡（" + (i + 1) + "/" + todo.length + "）：" + todo[i].t;
            if (onRecordPage()) ctx.render();
            xurls[todo[i].id] = URL.createObjectURL(await synth(todo[i]));
          }
        } catch (err) { msg = ""; roche.ui.toast("合成唱片失败：" + (err && err.message || err)); }
        msg = ""; preparing = false;
        if (onRecordPage()) ctx.render();
      }
      async function loadMine() {
        if (loadingMine) return;
        loadingMine = true;
        try {
          var todo = mine.filter(function (s) { return !murls[s.id]; }), i;
          for (i = 0; i < todo.length; i++) {
            msg = "正在读取唱片（" + (i + 1) + "/" + todo.length + "）：" + todo[i].name;
            if (onRecordPage()) ctx.render();
            var du = await roche.storage.get("rec:" + todo[i].id);
            if (du) murls[todo[i].id] = URL.createObjectURL(dataToBlob(du, todo[i].mime));
          }
        } catch (err) { roche.ui.toast("读取唱片失败：" + (err && err.message || err)); }
        msg = ""; loadingMine = false;
        if (onRecordPage()) ctx.render();
      }
      function addFile(file) {
        if (!file) return;
        if (mine.length >= MAX_SONGS) return roche.ui.toast("最多存 " + MAX_SONGS + " 首，先删掉一首吧");
        if (file.size > MAX_MB * 1048576) return roche.ui.toast("这个文件超过 " + MAX_MB + "MB 了");
        var ext = (/\.([^.]+)$/.exec(file.name) || [])[1], typed = /^(audio|video)\//.test(file.type);
        ext = ext ? ext.toLowerCase() : "";
        if (!typed && !MIME[ext]) return roche.ui.toast("这看起来不是音频文件（支持 mp3、m4a、aac、wav、flac、ogg、mp4 等）");
        var mime = typed ? file.type : MIME[ext], id = ctx.uid();
        (async function () {
          try {
            msg = "正在读取文件…（1/3）"; ctx.render();
            var du = await readAsDataURL(file);
            msg = "正在保存到插件存储…（2/3）"; ctx.render();
            await roche.storage.set("rec:" + id, du);
            mine.push({ id: id, name: file.name.replace(/\.[^.]+$/, ""), size: file.size, mime: mime });
            await roche.storage.set("recIndex", mine);
            msg = "正在准备播放…（3/3）"; ctx.render();
            murls[id] = URL.createObjectURL(new Blob([file], { type: mime }));
            roche.ui.toast("唱片已放上架");
          } catch (err) { roche.ui.toast("添加失败：" + (err && err.message || err)); }
          msg = ""; ctx.render();
        })();
      }

      // 悬浮卡片拖动 / 点唱片收成小球
      fl.addEventListener("pointerdown", function (ev) {
        if (ev.target.closest("[data-act]")) return;
        drag = { x: ev.clientX, y: ev.clientY, l: fl.offsetLeft, t: fl.offsetTop, moved: false };
        try { fl.setPointerCapture(ev.pointerId); } catch (err) { /* 忽略 */ }
      });
      fl.addEventListener("pointermove", function (ev) {
        if (!drag) return;
        var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        fl.style.left = Math.max(0, Math.min(ctx.root.clientWidth - fl.offsetWidth, drag.l + dx)) + "px";
        fl.style.top = Math.max(0, Math.min(ctx.root.clientHeight - fl.offsetHeight, drag.t + dy)) + "px";
      });
      function endDrag(ev) {
        if (drag && !drag.moved && ev.type === "pointerup" && ev.target.closest(".rfl-v")) { mini = !mini; paintFloat(); }
        drag = null;
      }
      fl.addEventListener("pointerup", endDrag); fl.addEventListener("pointercancel", endDrag);

      return {
        init: async function () {
          mine = (await roche.storage.get("recIndex")) || [];
          loopOne = !!(await roche.storage.get("recLoop")); audio.loop = loopOne;
          prepare();
        },
        destroy: function () {
          document.removeEventListener("visibilitychange", onVis);
          cancelAnimationFrame(raf); window.removeEventListener("resize", onRz); if (window.visualViewport) visualViewport.removeEventListener("resize", onRz); if (mo) mo.disconnect();
          ctx.root.removeEventListener("input", onRenIn); ctx.root.removeEventListener("keydown", onRenKey);
          audio.pause(); audio.removeAttribute("src");
          Object.keys(xurls).forEach(function (k) { URL.revokeObjectURL(xurls[k]); });
          Object.keys(murls).forEach(function (k) { URL.revokeObjectURL(murls[k]); });
          fl.remove();
        },
        view: function () {
          if (!preparing && SONGS.some(function (s) { return unlocked(s) && !xurls[s.id]; })) prepare();
          var L = list(shelf), s = cur && cur.shelf === shelf ? L[cur.idx] : null, on = playing && s;
          var ts = tsOf(); lastTs = ts;
          var h = '<div class="ttw" style="height:' + Math.round(230 * ts) + 'px"><div class="tt tex-wood' + (on ? " on" : "") + '" style="transform:scale(' + ts.toFixed(3) + ')"><div class="plate">' + discHtml() + '</div><div class="arm" style="transform:rotate(' + armA.toFixed(2) + 'deg)"></div></div></div>' +
            '<div class="np">' + (s ? e(sh2t(s)) + '<small>' + e(s.e || "") + '</small>' : '<small>选一张唱片开始播放</small>') + '</div>' +
            '<div class="ctl"><button class="gbtn" data-act="record.prev"' + (cur ? "" : " disabled") + '>' + IC.prev + '</button>' +
            '<button class="gbtn big" data-act="record.pp"' + (cur ? "" : " disabled") + '>' + (playing ? IC.pause : IC.play) + '</button>' +
            '<button class="gbtn" data-act="record.next"' + (cur ? "" : " disabled") + '>' + IC.next + '</button>' +
            '<button class="gbtn' + (loopOne ? " act" : "") + '" data-act="record.loop" aria-label="循环方式">' + (loopOne ? IC.repeat1 : IC.repeat) + '</button></div>' +
            '<div class="tabs"><button class="' + (shelf === "xmas" ? "on" : "") + '" data-act="record.tab" data-t="xmas">圣诞经典</button><button class="' +
            (shelf === "mine" ? "on" : "") + '" data-act="record.tab" data-t="mine">我的唱片</button></div>';
          if (msg) h += ctx.wait(e(msg));
          if (shelf === "mine") {
            h += '<div class="center" style="margin:6px 0"><button class="btn sm" data-act="record.add">添加唱片</button></div><p class="hint" style="text-align:center">本地音频，最多 ' + MAX_SONGS + ' 首，单首不超过 ' + MAX_MB + 'MB（' + mine.length + '/' + MAX_SONGS + '）</p>';
          }
          h += '<ul class="songs">' + L.map(function (x, i) {
            var lock = !unlocked(x), isCur = s === x, ready = urlOf(shelf, i);
            if (shelf === "mine" && renaming === i) return '<li class="ren"><input class="in" data-ren="1" maxlength="40" value="' + e(renText) + '"><button class="btn sm" data-act="record.rensave">保存</button><button class="link" data-act="record.rencancel">取消</button></li>';
            return '<li class="' + (isCur ? "cur " : "") + (isCur && playing ? "pl " : "") + (lock ? "lock" : "") + '"><button class="sg" data-act="record.play" data-i="' + i + '"' + (lock ? " disabled" : "") + '><i>' + (isCur && playing ? "♪" : i + 1) + '</i><span>' + (isCur && playing ? '<b class="mq"><span class="tr"><em>' + e(sh2t(x)) + '</em></span></b>' : '<b>' + e(sh2t(x)) + '</b>') +
              '<small>' + (lock ? "12 月 24 日解锁" : e(x.e || (Math.round(x.size / 1048576 * 10) / 10) + "MB") + (ready ? "" : "（准备中）")) + '</small></span></button>' +
              (shelf === "mine" ? '<button class="del" data-act="record.ren" data-i="' + i + '" aria-label="改名">✎</button><button class="del" data-act="record.del" data-i="' + i + '" aria-label="删除">×</button>' : "") + '</li>';
          }).join("") + (L.length ? "" : '<li><small class="hint">架子上还没有唱片，点上面的「添加唱片」放一张吧。</small></li>') + '</ul>';
          return ctx.page("Record Player", "唱 片 机", h);
        },
        act: async function (name, el) {
          var i = +el.dataset.i;
          if (name === "ren") {
            if (!mine[i]) return;
            renaming = i; renText = mine[i].name; ctx.render();
            var inp = ctx.view.querySelector("[data-ren]");
            if (inp) { inp.focus(); try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (err) { /* 忽略 */ } }
            return;
          }
          if (name === "rensave") return saveRename();
          if (name === "rencancel") { renaming = -1; return ctx.render(); }
          if (name === "tab") {
            var t = el.dataset.t;
            if (cur && cur.shelf !== t) stop();
            shelf = t; renaming = -1; if (t === "mine") loadMine();
            return ctx.render();
          }
          if (name === "play") return play(shelf, i);
          if (name === "pp") { if (cur) { if (audio.paused) audio.play(); else audio.pause(); } return; }
          if (name === "next") return step(1);
          if (name === "prev") return step(-1);
          if (name === "close") return stop();
          if (name === "loop") {
            loopOne = !loopOne; audio.loop = loopOne; await roche.storage.set("recLoop", loopOne);
            roche.ui.toast(loopOne ? "单曲循环" : "列表循环（播完自动下一首）"); return refresh();
          }
          if (name === "add") {
            var inp = document.createElement("input");
            inp.type = "file";   // 不限制类型：iOS 文件选择器写了 accept 会把 mp3/m4a 灰掉，选完后再检查格式
            inp.onchange = function () { addFile(inp.files && inp.files[0]); };
            return inp.click();
          }
          if (name === "del") {
            var s = mine[i];
            if (!s || !(await roche.ui.confirm({ title: "删除唱片", message: "确定把「" + s.name + "」从架子上拿走吗？" }))) return;
            if (cur && cur.shelf === "mine" && cur.idx === i) stop();
            else if (cur && cur.shelf === "mine" && cur.idx > i) cur.idx--;
            if (murls[s.id]) { URL.revokeObjectURL(murls[s.id]); delete murls[s.id]; }
            mine.splice(i, 1); renaming = -1;
            await roche.storage.delete("rec:" + s.id); await roche.storage.set("recIndex", mine);
            return refresh();
          }
        }
      };
    }
  });
})();
