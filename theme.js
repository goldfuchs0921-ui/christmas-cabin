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

  // 木纹小块（可平铺 384×384 WebP，约 2.5KB）和羊皮纸花边（420 宽 WebP，约 7KB，用 border-image 九宫格拉伸）
  // 想换图：把下面两段 base64 换成新图即可
  var WOOD_IMG = "data:image/webp;base64,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";
  var PAPER_FRAME = "data:image/webp;base64,UklGRuIQAABXRUJQVlA4WAoAAAAQAAAAowEAyAAAQUxQSNMDAAARoIVs/+LK+eBXCaxb3b3N6lVdrtzdrtzd3W3dvW4H2VB3XQvU191dAiEwEBg++C4iM7OaH3O6JyImAP5ulY0z2yYjmZmh0mJsSJkZttcjBj5w7qnYLm03NRlLcNswAAf365PNZrN9+lUOGNCvT2W/Pn2y1Y8++rAD98tE3e+4AUMKkjT1huzRhx18YL37de0ctYNF223t2rlmB4uWpG0DBhwx8LMNEisVmdWDoLBuzexZ9c9eF0giKYnFwoa61y1bGHXeHzPzEad+/dmOPdfc3NTU1NTc3Nzc9HH1D959u+a4miNrDh84svrwieNGjhw5buK4MeMeG/nZNp/77J7sCbcumbew+rx/ZuYjTv3us9gnwhIz4I2ytluqklSD91IkbThjqkRuC4xREdkAlMTtU28YLAnD5RTV6Kd+6wCLzzAgFNX4D/VdJokOf4jywFBvw+IyTBTlg6GugcVjNqBMOSG1MBMXmuUGom6AxWE4rkQ5Qj6uN+QKyzognlmeIOoi7G2RzGyJMww0wOozAM+J8sV1X5wNWB0GXJqXR77dFVYL5/whj6S08GxYjeES6RASVT4ZVtH5a5FyylB5M8Asp1B+SQ2HGR5XKM9kcAJwWJF0jVDPAY+Jck1qFjDPO6TCftlA3kk99pjoHy8N9JDn1sg9qeeLLlJIjRRTI6XUSLFNnZKLBKmR4h4ZlPbIIGj3386j3O6/tqnCdmGxvSMvucirLvJGamSgiwxxkeGpkZEuMsZFxrnIxNTI2y7ybmrkg9TIx/KQJhdpTo3kUiOfucgXqZGvUyPfpUZ+TI38nBr5zUWmtqkzMzWSd5E/2tT5539GpFkussJFCqmRDS6yxkWWucg8F/nHQaiZLvKji+Rc5AMXGekiL7nI8+3+S2HRRcouErjIB6J/PPycf6hw2E2hf2yGbZZzUl8YmkXvuAG4yjnIzV2BDgtF19DDMMOlCh2DmtXBAMNnCj3jDFTYgfMUOgWpe2EAYDh4nkT6Ayk9AENVQ+axFXJHUpp1Ngz1dn3q4zXOIP3zQAaGeg3AfrNEP6B+PDkDGCJaBs97gkpHAIbohoscgfoCeyNOQ7boCRfBYoFhqugE5Iruhrhu9gPdi7hgmdmkC1D5vQ2x4Ww5QXgE4oNhoMLGH6l7YEjQMEQhG3yUHoMhUcNAKWQDj6FKN8GQsOHWdZLIhg4TTIqUNPsEGBI37Hd7Xo37eQ90hmEbNABXPf/qOoWsGpbL5XIQBKVSsWapTIlVq7BmI4Aky8vefj7GgbnmXP6PP5asWLahsLkYBAFjVPD28zcDMMQIAFZQOCDoDAAAsE0AnQEqpAHJAD7RYqtRqCUyLyIzWdpAGglnboE6LYbaSA2qygi1VgMuc0AfDH6PpH2+PPw6aT0Wv/d9mb/TYDmphZ2oRJ8yWUPs/firN3NCU64f64XvcTTOHj3D5jUL1dyg80S4ZQ1ivjn/FhkeI/QUiFE6l2ZCjKl5ghyRavp1mbC5CJvN0rLoNIWJjMo2qq3C/So7KazWFkZ8QD9R4JnnIvqq4cpBgzT1GDwyqRTNfpTWJzzJWbtANjkbEs4ssmRDzYE0GLP8RHraFrhxzac6OPx7+eesS5lPbdgDnEOCsC0Hb0jOMEBjy5jnw95JVPdUVJqBh48sF80iCrN15peDWsqhnuVBj9mQgwXxzRQqj8MB58/Q3ocn+MhPx+pZf2MgP+ACA7h9VBPWPf2ZOLIFrld/czCcvlLoGBzBlMogScMhL7c0QzTpnEtUekovWeqJogAOKzgyd4JpJjudzTwOjeFlTzyq/GKLuA8vWZ9GIjov0qU7zpVuDjeS1W6DnfcYgAYIf0MHwI/PcoEXqSBWCEaPvI0Zf1WyQayuUkIKpMSgcg3vRtU8ECBJVtj+SC00MAV7Ku7N5CEV+ETxFTGrchnPZ1IIj1kBBGcXzSWNnXY4vnch2T7p0K8C22YGD2+hPBAPLIhpv5uEkhZLlbNHhxU+PT9fB4RLGmJ5UAfLB+3YbMCxDyCHoOjMJFhQk+KDm2kkgQcMDpnZq7pggpSZ6UhIGvndmIloJVMCObod3BrEHAHmIs034ow5n4qMqCbghm8LmpnssJdWSTJPg0azcjbwYptyoDQxdm0bvXc8VndmNKWisJl166efa2I8e5KH5iwAAP7Z1XTJHBv5ITfYofZzLzsk6YiMMx7ZyWSxODHlesrbBd7ZYLzXpL4eIMjU+yXl3yPrCIK3WYJ912f3v6bF1aoVZGzB/mxYhcFUk8j69HWVbgY8LKjjMrAD5o2oB0TgxeEImg2uFS/TzJOJy/tn3kGxqoc2YeGGm1ZM1/smOp0t/3vq+0CCsjIJtDX47BgRL/8RmEzhXeeiACw4ePjutfXri/rHLbhUdpS7+Q/sJ/N9h4QsKagltoZ1Gy+EP37WnS8hcrUP3Q0DlaEvPQM+vqbbZ8/NgqtqwfaOqDnwlAMHKy3Wx/yZTOVmWahzw15taLz4P2F6DiqpEjFpBzhMxIX5pF979sPWaJaQcCrnWtPQmDwKpt3TPshxLAmn59vJwNg485qVHrUxh/7VD4paiiXhWUFdEpC3NVUFTPcALgCethSTyn/zZK/7r/ywPEngKv16QZl8C66bnih/A49e/M6TK/Jbel5Fp2Zxj6SuDikFjodIAPcaa9zlw1CCv9IkFwp4FtTzMXqfAHHb9yHh1IAqbyDzZuYBLoMUSnbfdAsBQxE76S/5VAUKzC2DbINBTqjPl1Gr6Agd3EXB/EXCts1nqhhoQ4APLvFrw1g5GfB4STB+XC7F6C0OX1TxfMrXZQ0nCWIx3USdWMvgII/i5T8AfmLbPay/Y1mqo57rJ6l7H4BT4hZ0V5jE6xXBo4G1+tun4bgpjbLNEBRG5tnLIlEMya1H66N59uAMEFEy1Ou+5z9QynRB8ldJQSPo/lGwgUVEnBQhw5d1PRaZO8hUaQGsIZwT6HFjmKCdHWalEJMqBJ77nu8U+TYu55fXcCI9x86kVXWs7gjnnSxPMWzvVfoTf91Q+L7TDzmgTlJH2nWwYAzoIFAniqoF0+i39U4o/1vNr+/smIO+8X5nXLT5BVsUWnl5TaEGT5/b612D/IQf5N6F70uhNXD218ft0X7f3b3QGLBmQAmfQfNSDqGVil3FP8++Zxl4em2TsQKEmztQOPYDOHjIyyV/hkbrTM4ilDe2MpzhOfPdseYpy8eTH/QcZMDxUzhbKYH4qBUpuUXi1XSO3+vJktuF1oqlMccetBSbclZEJr1NNBgJAtR7czFIBuQwQpbEdF8XMeMd35tanL2ikOvPVB4U6KzybheLl9sMB0acUE2E5lVbbymyoQlYlrthxRbMqngcaitpNMCxbdEWG8t4v1Tnh3NVLTa8YFXt+qGLTpBnbzTn+7LRauPXqHgioZ79gBflUoNLOiDiAYRytqTXuotC/g0/qvWdVSj+Rn80u8jKVb6/jlCdQsrm94/VN26+InabggRYD1nRWrptbnxFwEEGqUCxzg2b5Xp7ahKOOXYaIbLU7OXBXJgSSwkG1YvFdeP46hffl5BAfhQZVtmYXJnDD0DPRP9lGK8z11ppg0zKYXJ1atqThR+qUfnPMs5FETjLdkHr7FTd8ckjvUba4KoE9Yykza7E92Jr1c5xyFajIuB58hk+3A1mXOVsAjy4eaUSoO96lSgyuChjYHHh/zL+YmKr6wNOZVREzHZlapHPhyjcmkcL1B9sAGCLYRIOyteqNWn7GVcEkyhKVlNuMr0NL5KVi3l8WipM6n/9DOeKuF3/0HAwVIiOZmUE9ZvTiQ9K6HTJZjwAAHmgL2ZhA2lSO6kQbtdINmkDOSRzZGnVJpAedtseQgYAscOFA6JfGmTQxznOTNaGE9t0mQW6EcplrsPaCzP8EGajVq20FVBKdChiC4L6csI1VhAuAA2OvLApfpCNTz2E5EEdpAXmVthrMU7/3ZIwfZSV9fde3+HFionuclsKEHFCn1OcFm5GUgahpCPaIhxaxsARldFACgADSB6UBBj6EU9zwZdjfjjrOKUVNVAeBR3/YnfJcwJpZ3ogpSd3KsKDHhqHppyFHuoNJAGO1r8w/B1l0G4GwLTN7AaNgvpYvU1sBAoOiJukenKvYfKUK2BWP81q/t+SgXskN7mhVaSupgHFC0FLrjLK5HF9lxy6aLLXNUC+Msn/q2PDX87JVsbxRzyj1fXGpi/xWW95FF5GOszFkK+yVFupznngezpab6qirVTManIG9PA8uPUV1XbvPzTHCz1kbgWFS0B0EaGJScB7yGPbBolUmYiBuG5vPrwO4yyP6a8i433cZSzAK9M81A4TL57zFAGwRwK+HuenkzDncSwrt+GTf/e2a61tyZhOiSsQPm8hw1V2nZGQi6h1sph4q50xmVuTzlKquhk5JGATd2FN2DfrWeCQMZVOXddiFREIDUziaMIpCmIn8vm8yG9lQH0XJEK+zy90OAeeuu2Y4Lf/l9Us79QhjmmhKAIzeTnhJqZnMDVBTCPEv/I/o3hy5RgmUSEsqmzPC5j0GAfO6neEd47VGarGjtkR9fG/gxecjXVI75RFNWld8bff1KXSyrHujCkhu+9vztJMhFXKHlAIA9FmUkYkbXiVyDk69HQ0tD7vnVBMxO8WfixTcb/NVVT+MGQ5KytvbDSbpi8QuiJkkAeL2Xq48HLcW9GTHPHXlF9xNLmNdkrHs9XPOG1Z3qPfklm/H6ivBYSww0fz8ZZ7wwoo/Ga3olFNzRqSE/fKvBv4WuoP1nLX5oFQqt69Tlfolu9xqil2hRF2GjULZChYHwW2bPmRCiYfeJTP74CznZfkt0/PWgkO1o3b2D1Cwpm+p+negDGuDD1znSoFwm34swx3GxYCq4Fm300h4GElUTytvR8+wpZfvuKBuHCGLvC4lkfCeUm+43+fcJSGNkLTcLA14FKjsgX68MbMbHftEyP8NcM0wwsVr/GwlPeiKXLkTUTBCc0/DYjzFGOTJJzDs4ERCyUq0pvRyeP2Y2C+qbD+JJun2i1aALVW2NVYFKHHbiSloezU18LixAZsnw/uyrvGBPB8KQnFj3z4gnSdHzO2RtfW1d7xibMb3ZOUWTyzLXPahwZCx2StI01Lt4V0W2yXzZblhjc97Lcm7Roa+bTX4S+409bquh+yjqPaQ8fa1B/n1TIT1vQviX7GVe/g+3faRZ0cAbLdXgOEPPZ/l70A84RaVUxOKTnUGA/JKDOLLNyu6ntXg3qKFpR1YVmOPY5HTQGFFkZhZAFFHsW32SNXjo7dMLKuN7bZ/UJNljAs6Z5sxZL1T+k0qjS1C4SxmaQFaSFtkfOcYeu+kN8NuxBVPMXG3jHjb9j22+myqD/eg4n3il3daFbC/TwG0FXUdBI3lBw9pSLVVgc1GJlSKZsJ8KvrGbscpa8YRLzlrGoo7ilBE1ZjnPVEHh+rLBcOauxTPAuluZ3HNrc6V7uACv0Zjwu4hBgeNcJ9F5b7Jv/0A9T4WSBRpp/subMO8/IDjArDduiOhSMeVKYOMzqjY5gSz5lB1E0DHue5IbibvhRu+27Hr3jlZFPUhfoeNN6QsFdrXuNEXbAiJ5qKSTxJB2sie5+Ze9gKM2sZTom96013ptGK8CW8VPHAfri09kStFMnZKaiAexyUkvgnCl91NO0gd4+i7H9eOPbJa/m//1fbpc6KqGUOy5rvS9hgTz2bdwSLX6MT2V1aL1kqmE69/PGidBGe/1RrCwAAAA==";
  R.tex = { paper: paper };

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
.rcc.framed .sheet{border:20px solid transparent;border-image:var(--paper-frame) 32 fill/20px stretch;border-radius:0;padding:4px 4px 10px;background:none;box-shadow:none;filter:drop-shadow(0 8px 10px rgba(0,0,0,.55))}
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
            if (!cache) cache = { paper: toUrl(paper, 256) };
            ctx.root.style.setProperty("--tex-wood", "url(" + WOOD_IMG + ")");
            ctx.root.style.setProperty("--paper-frame", "url(" + PAPER_FRAME + ")");
            ctx.root.classList.add("framed");   // 花边图设好后才启用，图没加载出来就保持原来的纸面
            ctx.root.style.setProperty("--tex-paper", cache.paper);
          } catch (e) { /* 贴图失败就用纯色，不影响使用 */ }
        }
      };
    }
  });
})();
