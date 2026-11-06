/* home.js — 主页：夜空小屋 + 木纹面板 + 羊皮纸功能卡片（按各功能模块的 home 信息自动生成）
 * 想换图：把 bg-top.webp、decor-bottom.webp 放进仓库即可，没有图时显示代码画的备用样式 */
(function () {
  "use strict";
  var R = window.RCC;

  var CABIN = '<svg class="cabin" viewBox="0 0 320 170" aria-hidden="true">' +
    '<ellipse cx="160" cy="158" rx="170" ry="26" fill="#e8f0ef"/>' +
    '<g fill="#164032"><polygon points="36,152 56,92 76,152"/><polygon points="246,154 270,80 294,154"/></g>' +
    '<rect x="104" y="94" width="112" height="60" fill="#7a5233"/><rect x="192" y="52" width="14" height="28" fill="#4a2f1b"/>' +
    '<polygon points="92,98 160,52 228,98" fill="#5b3a22"/><polygon points="92,98 160,52 228,98 216,98 160,64 104,98" fill="#f1f5f4"/>' +
    '<rect class="win" x="124" y="110" width="30" height="26" rx="2" fill="#f4b860"/><path d="M139 110v26M124 123h30" stroke="#5b3a22" stroke-width="2"/>' +
    '<rect x="170" y="114" width="26" height="40" rx="2" fill="#3f2816"/><circle cx="190" cy="136" r="2" fill="#f4b860"/></svg>';
  var GEAR = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#4a2a07" stroke-width="2.2"><circle cx="12" cy="12" r="7.5" stroke-width="3.4" stroke-dasharray="3.1 2.6"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.8" fill="#4a2a07"/></svg>';

  var CSS = `
.rcc .hero{position:relative;height:310px;overflow:hidden;background:radial-gradient(1.5px 1.5px at 18% 22%,#fff,transparent),radial-gradient(1px 1px at 62% 14%,#fff,transparent),radial-gradient(1.5px 1.5px at 84% 30%,#fff,transparent),radial-gradient(1px 1px at 40% 38%,#fff,transparent),linear-gradient(#08122a,#1c2b55 72%,#3a3f66)}
.rcc .hero svg.cabin{position:absolute;bottom:-2px;right:-20px;width:340px}
.rcc .hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center bottom}
.rcc .hero::after{content:"";position:absolute;left:0;right:0;bottom:0;height:40px;background:linear-gradient(transparent,#3b2415)}
.rcc .hero .t{position:absolute;left:22px;top:max(env(safe-area-inset-top),14px);margin-top:56px;z-index:2}
.rcc .hero .t .en{font-size:46px;line-height:1.02;background:linear-gradient(#fff4cf,#f1c45e 55%,#c98d26);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 6px rgba(244,184,96,.45))}
.rcc .hero .t p{margin:8px 0 0;font-style:italic;font-size:14px;color:#f3e6c8;opacity:.9;text-shadow:0 1px 3px rgba(0,0,0,.7)}
.rcc .corner{position:absolute;top:max(env(safe-area-inset-top),14px);z-index:3;width:36px;height:36px;font-size:20px}
.rcc .corner.l{left:14px}.rcc .corner.r{right:14px}
.rcc .win{animation:rcc-glow 3.2s ease-in-out infinite alternate}
@keyframes rcc-glow{from{opacity:.78}to{opacity:1;filter:drop-shadow(0 0 8px #f4b860)}}
.rcc .panel{position:relative;margin-top:-4px;padding:40px 14px 18px;background-color:var(--wood);background-image:var(--tex-wood,none);background-size:256px 256px;box-shadow:inset 0 16px 18px -10px rgba(0,0,0,.75)}
.rcc .panel::before{content:"";position:absolute;left:0;right:0;top:-12px;height:24px;background:radial-gradient(circle at 14px 16px,#f1f5f8 13px,transparent 14px) 0 0/30px 24px repeat-x,linear-gradient(#f1f5f8,#d8e0e8) 0 14px/100% 10px no-repeat;filter:drop-shadow(0 3px 2px rgba(0,0,0,.45))}
.rcc .cd{position:relative;z-index:2;width:max-content;max-width:92%;margin:-62px auto 20px;padding:7px 22px;border-radius:10px;color:var(--ink);text-align:center;font-size:14px;letter-spacing:.14em;background-color:var(--paper);background-image:var(--tex-paper,none);background-size:256px 256px;box-shadow:inset 0 0 14px rgba(120,76,24,.5),0 0 0 2px #5a3a20,0 0 0 3px rgba(255,214,150,.3),0 4px 8px rgba(0,0,0,.5)}
.rcc .cd b{font-family:"Iowan Old Style","Palatino",Georgia,serif;font-size:24px;color:var(--berry);margin:0 4px;letter-spacing:0}
.rcc .cd i{color:#b07a1e;font-style:normal;margin:0 6px}
.rcc .card{position:relative;display:flex;align-items:center;gap:12px;width:100%;margin:0 0 16px;padding:12px 14px;text-align:left;border:0;border-radius:12px;color:var(--ink);background-color:var(--paper);background-image:var(--tex-paper,none);background-size:256px 256px;box-shadow:inset 0 0 28px rgba(120,76,24,.55),inset 0 0 2px rgba(70,36,8,.9),0 0 0 3px #5a3a20,0 0 0 4px rgba(255,214,150,.28),0 9px 14px rgba(0,0,0,.55)}
.rcc .card:active{transform:translateY(1px)}
.rcc .card .tx{flex:1;min-width:0}
.rcc .card .en{display:block;font-size:27px;line-height:1.2;text-shadow:0 1px 0 rgba(255,255,255,.4)}
.rcc .card .en em{font-style:normal;color:#b07a1e;font-size:15px;margin-left:6px}
.rcc .card .zh{display:block;margin:1px 0 3px}
.rcc .card small{display:block;color:var(--soft);font-size:12px;line-height:1.5}
.rcc .card .gbtn{width:36px;height:36px;font-size:19px}
.rcc .card .st{position:absolute;right:16px;top:8px;font-size:11px;color:var(--berry);letter-spacing:.08em}
.rcc .rdot{position:absolute;right:14px;top:10px;width:10px;height:10px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff8a8a,var(--berry));box-shadow:0 0 8px #ff5c5c,0 1px 2px rgba(0,0,0,.5)}
.rcc .decor{text-align:center;padding:4px 0 0}
.rcc .decor img{display:block;width:100%}
.rcc .decor img~.mc{display:none}
.rcc .decor .mc{font-style:italic;font-size:20px;color:#e9c46a;text-shadow:0 2px 4px rgba(0,0,0,.7);padding:6px 0 14px}
`;

  R.add({
    id: "home", style: CSS,
    create: function (ctx) {
      function daysLine() {
        var n = new Date(), y = n.getFullYear();
        var d = Math.ceil((new Date(y, 11, 24) - new Date(y, n.getMonth(), n.getDate())) / 86400000);
        if (d > 0) return '距离平安夜还有<b>' + d + '</b>天';
        if (d === 0) return "今天是平安夜";
        return n.getMonth() === 11 && n.getDate() <= 25 ? "圣诞快乐" : "明年圣诞见";
      }
      return {
        view: function () {
          var st = ctx.st, cards = R.mods.filter(function (m) { return m.home; }).sort(function (a, b) { return a.home.order - b.home.order; })
            .map(function (m) {
              var h = m.home, right = ctx.hasJob(m.jobs || m.id + ":") ? '<span class="st">生成中</span>' : (st.d.ready[m.id] ? '<span class="rdot"></span>' : "");
              return '<button class="card" data-act="core.go" data-v="' + m.id + '">' + ctx.icon(h.icon, h.svg) +
                '<span class="tx"><span class="en">' + h.en + '<em>✦</em></span><span class="zh">' + h.zh + '</span><small>' + h.desc + '</small></span>' +
                '<span class="gbtn">→</span>' + right + '</button>';
            }).join("");
          return '<div class="hero">' + CABIN + '<img src="' + R.base + 'bg-top.webp" alt="" onerror="this.remove()">' +
            '<button class="gbtn corner l" data-act="core.exit" aria-label="退出">‹</button>' +
            '<button class="gbtn corner r" data-act="core.go" data-v="settings" aria-label="设置">' + GEAR + '</button>' +
            '<div class="t"><div class="en">Christmas<br>Cabin</div><p>May your Christmas be warm and bright.</p></div></div>' +
            '<div class="panel"><div class="cd"><i>✦</i>' + daysLine() + '<i>✦</i></div>' + cards +
            '<div class="decor"><img src="' + R.base + 'decor-bottom.webp" alt="" onerror="this.remove()"><div class="mc">✦ Merry Christmas ✦</div></div></div>';
        }
      };
    }
  });
})();
