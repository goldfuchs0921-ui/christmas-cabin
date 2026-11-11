/* theme.js — 拟物材质：程序生成木纹/羊皮纸贴图（高度图 + 法线 + 漫反射 + 高光烘焙）+ 通用组件样式
 * 不需要图片也能显示；以后想换图，改 CSS 里的 --tex-wood / --tex-paper 即可 */
(function () {
  "use strict";
  var R = window.RCC;

  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  // 可平铺的值噪声：sx×sy 个格子，u,v ∈ [0,1)
  function lat(sx, sy, seed) {
    var r = rng(seed), a = new Float32Array(sx * sy), i;
    for (i = 0; i < a.length; i++) a[i] = r();
    return function (u, v) {
      var x = u * sx, y = v * sy, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var x1 = (x0 + 1) % sx, y1 = (y0 + 1) % sy; x0 %= sx; y0 %= sy;
      return (a[y0 * sx + x0] * (1 - fx) + a[y0 * sx + x1] * fx) * (1 - fy) + (a[y1 * sx + x0] * (1 - fx) + a[y1 * sx + x1] * fx) * fy;
    };
  }
  function mix(a, b, t) { return a + (b - a) * t; }

  // 烘焙光照：h 高度图 → 法线 → 漫反射 + 高光；光源固定在左上
  function bake(size, h, albedo, bump, spec, shin, amb) {
    var out = new Uint8ClampedArray(size * size * 4), L = [-0.45, -0.55, 0.7], ll = Math.hypot(L[0], L[1], L[2]);
    L = [L[0] / ll, L[1] / ll, L[2] / ll];
    var H = [L[0], L[1], L[2] + 1], hl = Math.hypot(H[0], H[1], H[2]); H = [H[0] / hl, H[1] / hl, H[2] / hl];
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var i = y * size + x, xl = (x + size - 1) % size, xr = (x + 1) % size, yu = (y + size - 1) % size, yd = (y + 1) % size;
      var dx = (h[y * size + xr] - h[y * size + xl]) * bump, dy = (h[yd * size + x] - h[yu * size + x]) * bump;
      var nl = Math.hypot(dx, dy, 1), nx = -dx / nl, ny = -dy / nl, nz = 1 / nl;
      var diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
      var sp = Math.pow(Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]), shin) * spec;
      var c = albedo(x / size, y / size, h[i]), k = amb + (1 - amb) * diff * 1.15, o = i * 4;
      out[o] = c[0] * k + sp * 255; out[o + 1] = c[1] * k + sp * 235; out[o + 2] = c[2] * k + sp * 200; out[o + 3] = 255;
    }
    return out;
  }

  function wood(size) {
    var g1 = lat(2, 44, 11), g2 = lat(4, 110, 12), g3 = lat(6, 20, 13), warp = lat(3, 3, 14), tone = lat(3, 8, 15), h = new Float32Array(size * size);
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var u = x / size, v = y / size, vw = (v + (warp(u, v) - 0.5) * 0.03 + 1) % 1;
      var g = g1(u, vw) * 0.5 + g2(u, vw) * 0.3 + g3(u, vw) * 0.2;
      var s = (v * 4) % 1, seam = s < 0.014 || s > 0.988 ? 1 : 0;      // 四块木板的接缝
      h[y * size + x] = seam ? -0.9 : g;
    }
    return bake(size, h, function (u, v, hh) {
      var t = Math.min(1, Math.max(0, hh * 1.25)), band = tone(u, v), sm = ((v * 4) % 1);
      var seam = sm < 0.02 || sm > 0.985 ? 0.35 : 1, dk = mix(0.88, 1.08, band);
      return [mix(40, 86, t) * dk * seam, mix(23, 53, t) * dk * seam, mix(11, 29, t) * dk * seam];
    }, 7, 0.38, 14, 0.5);
  }

  function paper(size) {
    var f1 = lat(64, 64, 21), f2 = lat(16, 16, 22), f3 = lat(80, 7, 23), f4 = lat(7, 80, 24), st = lat(2, 2, 25), st2 = lat(3, 3, 26), h = new Float32Array(size * size);
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var u = x / size, v = y / size;
      h[y * size + x] = f1(u, v) * 0.35 + f2(u, v) * 0.25 + f3(u, v) * 0.2 + f4(u, v) * 0.2;
    }
    return bake(size, h, function (u, v) {
      var stain = st(u, v) * 0.6 + st2(u, v) * 0.4, d = 1 - 0.1 * Math.max(0, stain - 0.3);
      return [236 * d, 217 * d, 176 * d * (1 - 0.05 * stain)];
    }, 1.6, 0.06, 10, 0.86);
  }

  R.tex = { wood: wood, paper: paper };

  // ---------- 图片压缩：缩到长边 maxSide 像素，转成 webp（不支持就用 jpeg）；任何一步失败都原样返回，不影响使用 ----------
  function loadImage(src, cors) {
    return new Promise(function (ok, no) {
      var im = new Image(), t = setTimeout(function () { no(new Error("图片加载超时")); }, 15000);
      if (cors) im.crossOrigin = "anonymous";
      im.onload = function () { clearTimeout(t); ok(im); };
      im.onerror = function () { clearTimeout(t); no(new Error("图片加载失败")); };
      im.src = src;
    });
  }
  function blobToData(b) { return new Promise(function (ok, no) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.onerror = no; f.readAsDataURL(b); }); }
  R.img = {
    prepare: async function (src, maxSide, quality) {
      maxSide = maxSide || 1024; quality = quality || 0.82;
      var out = { src: src, ar: 1.5, w: 0, h: 0, ok: false };
      try {
        var data = src, isData = /^data:/.test(src);
        if (!isData) { try { data = await blobToData(await (await fetch(src)).blob()); isData = true; } catch (e1) { data = src; } }
        var im;
        try { im = await loadImage(data, !isData); } catch (e2) { im = await loadImage(data, false); }
        var w = im.naturalWidth, h = im.naturalHeight;
        out.w = w; out.h = h; out.ar = w && h ? Math.max(0.5, Math.min(2, w / h)) : 1.5;
        var k = Math.min(1, maxSide / Math.max(w, h)), cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
        var cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
        cv.getContext("2d").drawImage(im, 0, 0, cw, ch);
        var u = cv.toDataURL("image/webp", quality);
        if (u.indexOf("data:image/webp") !== 0) u = cv.toDataURL("image/jpeg", quality);
        if (isData && u.length < data.length) { out.src = u; out.ok = true; } else if (isData) out.src = data;
      } catch (err) { /* 压缩失败（比如外链图不允许读取）就用原图 */ }
      return out;
    },
    fmt: function (n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  };
  var cache = null;
  function toUrl(fn, size) {
    var cv = document.createElement("canvas"); cv.width = cv.height = size;
    var cx = cv.getContext("2d"), im = cx.createImageData(size, size);
    im.data.set(fn(size)); cx.putImageData(im, 0, 0);
    return "url(" + cv.toDataURL("image/png") + ")";
  }

  var CSS = `
.rcc{--ink:#4a2c14;--soft:#7a5a3a;--cream:#f3e6c8;--wood:#3b2415;--paper:#e8d6ab;--berry:#a3293a;--pine:#3a6b47;position:relative;height:100%;overflow:hidden;background:#1d1109;color:var(--cream);font:15px/1.65 -apple-system,"PingFang SC","Noto Sans SC",sans-serif}
.rcc *{box-sizing:border-box}
.rcc button,.rcc input,.rcc textarea{font:inherit;color:inherit}
.rcc .snowfield{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:4}
.rcc .flake{position:absolute;top:-12px;background:#fff;border-radius:50%;opacity:.6;animation:rcc-fall linear infinite}
@keyframes rcc-fall{to{transform:translate(24px,115vh)}}
.rcc .scroll{position:relative;z-index:1;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch}
.rcc .en{font-family:"Iowan Old Style","Palatino","Songti SC","STSong","Noto Serif SC",Georgia,serif;font-style:italic;font-weight:400;letter-spacing:.01em}
.rcc .zh{font-size:12px;letter-spacing:.38em}
.rcc .tex-wood{background-color:var(--wood);background-image:var(--tex-wood,none);background-size:256px 256px}
.rcc .tex-paper{background-color:var(--paper);background-image:var(--tex-paper,none);background-size:256px 256px}
.rcc .pg{min-height:100%;padding:max(env(safe-area-inset-top),12px) 14px calc(44px + env(safe-area-inset-bottom,0px));background-color:var(--wood);background-image:var(--tex-wood,none);background-size:256px 256px}
.rcc .bar{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.rcc .ttl .en{font-size:27px;line-height:1.15;color:var(--cream);text-shadow:0 2px 3px rgba(0,0,0,.65)}
.rcc .ttl .zh{color:rgba(243,230,200,.65)}
.rcc .sheet{position:relative;min-height:62vh;min-height:62dvh;padding:18px 16px 24px;border-radius:10px;color:var(--ink);background-color:var(--paper);background-image:var(--tex-paper,none);background-size:256px 256px;box-shadow:inset 0 0 30px rgba(120,76,24,.55),inset 0 0 2px rgba(70,36,8,.9),0 0 0 3px #5a3a20,0 0 0 4px rgba(255,214,150,.25),0 10px 18px rgba(0,0,0,.55)}
.rcc .sheet .zh{color:var(--soft)}
.rcc .gbtn{flex:0 0 auto;width:38px;height:38px;border-radius:50%;border:0;display:grid;place-items:center;padding:0;line-height:1;font-size:22px;color:#4a2a07;text-shadow:0 1px 0 rgba(255,255,255,.5);background:radial-gradient(circle at 32% 28%,#fff1b8,#e3b341 38%,#a8741c 72%,#6e4710);box-shadow:inset 0 1px 1px rgba(255,255,255,.75),inset 0 -2px 3px rgba(60,30,0,.6),0 2px 4px rgba(0,0,0,.6)}
.rcc .gbtn:active{transform:translateY(1px)}
.rcc .hint{color:var(--soft);font-size:13px;margin:6px 0 12px}
.rcc .center{text-align:center;margin:16px 0}
.rcc .btn{border:1px solid #6e4710;border-radius:999px;padding:10px 26px;font-weight:600;letter-spacing:.14em;color:#3a2208;text-shadow:0 1px 0 rgba(255,255,255,.45);background:linear-gradient(#f9e3a0,#dba93c 52%,#b07a1e);box-shadow:inset 0 1px 0 rgba(255,255,255,.75),0 2px 4px rgba(0,0,0,.45)}
.rcc .btn:active{transform:translateY(1px);box-shadow:inset 0 2px 4px rgba(60,30,0,.5)}
.rcc .btn.ghost{background:transparent;color:var(--ink);border-color:#8a6a45;box-shadow:none;font-weight:400;text-shadow:none}
.rcc .btn.sm{padding:6px 16px;font-size:13px;letter-spacing:.06em}
.rcc .btn[disabled]{opacity:.5;pointer-events:none}
.rcc .link{background:none;border:0;color:var(--soft);font-size:12px;padding:6px 10px;text-decoration:underline;text-underline-offset:3px}
.rcc .chips{display:flex;gap:12px;overflow-x:auto;padding:6px 4px 12px}
.rcc .chip{flex:0 0 auto;width:68px;text-align:center;background:none;border:0;padding:0}
.rcc .chip .av{width:56px;height:56px;margin:0 auto 5px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:#6a4a2a;color:var(--cream);opacity:.55;filter:sepia(.3);box-shadow:0 2px 4px rgba(0,0,0,.4)}
.rcc .chip.on .av{opacity:1;filter:none;box-shadow:0 0 0 3px #d9a63a,0 0 0 5px #5a3a20,0 3px 6px rgba(0,0,0,.5)}
.rcc .chip img{width:100%;height:100%;object-fit:cover}
.rcc .chip span{display:block;font-size:12px;color:var(--soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rcc .chip.on span{color:var(--ink);font-weight:600}
.rcc .in{flex:1;min-width:0;background:rgba(255,248,230,.4);border:1px solid #b99a68;border-radius:6px;box-shadow:inset 0 2px 4px rgba(90,58,24,.25);padding:8px 10px;outline:none;color:var(--ink);font-size:16px}
.rcc .in:focus{border-color:#a8741c}
.rcc .row{display:flex;gap:10px;margin:12px 0}
.rcc .wait{display:flex;gap:10px;align-items:center;margin:14px 0;color:var(--soft);font-size:13px}
.rcc .wait i{flex:0 0 auto;width:9px;height:9px;border-radius:50%;background:#c58a1d;box-shadow:0 0 6px #e3b341;animation:rcc-pulse 1.2s ease-in-out infinite}
@keyframes rcc-pulse{50%{opacity:.3;transform:scale(.6)}}
.rcc .ico{position:relative;display:block;flex:0 0 auto;width:76px;height:76px}
.rcc .ico svg,.rcc .ico img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.rcc .ico img{filter:drop-shadow(0 4px 4px rgba(60,30,0,.45))}
.rcc .paper{position:relative;padding:16px 20px;white-space:pre-wrap;min-height:140px;line-height:1.95;font-family:"KaiTi","STKaiti","Kaiti SC",serif;font-size:16px;color:#3a2410;background-color:#f3e7c6;background-image:var(--tex-paper,none);background-size:256px 256px;box-shadow:0 2px 6px rgba(60,30,0,.45),inset 0 0 22px rgba(150,100,40,.35)}
@media (prefers-reduced-motion:reduce){.rcc .flake,.rcc .wait i{animation:none}.rcc .flake{display:none}}
`;

  R.add({
    id: "theme", style: CSS,
    create: function (ctx) {
      return {
        init: function () {
          try {
            if (!cache) cache = { wood: toUrl(wood, 256), paper: toUrl(paper, 256) };
            ctx.root.style.setProperty("--tex-wood", cache.wood);
            ctx.root.style.setProperty("--tex-paper", cache.paper);
          } catch (e) { /* 贴图失败就用纯色，不影响使用 */ }
        }
      };
    }
  });
})();
