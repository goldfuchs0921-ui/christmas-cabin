/* mail.js — 圣诞信箱 v2
 * 许愿树：拟物圣诞树（分层枝叶 / 积雪 / 灯串 / 星星），愿望是挂在枝上的玻璃球；愿望可逐条编辑、删除
 * 写信：可以 AI 润色（只小改，可提意见，新旧版本可来回看）；信寄出后第二天 9 点有回信
 * 木桌：点「拆信 / 再看看」进入一张木桌——拆信封（有动画）、读圣诞老人的回信、重读自己寄出的信、桌角的明信片
 * 明信片：回信时一并生成背面的短话；正面画面是可选的生图（要点了、确认后才画，消耗生图额度）
 * 存储：愿望 wishes / 信 letters / 明信片图 pcimg:<信id> 都在插件自己的存储里 */
(function () {
  "use strict";
  var R = window.RCC;
  var SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="#8a5a1c" stroke-width="2.2"><rect x="6" y="12" width="36" height="25" rx="2" fill="rgba(255,255,255,.35)"/><path d="M6 14l18 13 18-13"/><circle cx="24" cy="27" r="4" fill="#a3293a" stroke="none"/></svg>';
  var KAI = '"KaiTi","STKaiti","Kaiti SC",serif';
  var CSS = `
.rcc .tabs{display:flex;gap:24px;margin:0 0 14px;border-bottom:1px solid rgba(90,58,24,.35)}
.rcc .tabs button{padding:8px 0;border:0;border-bottom:2px solid transparent;background:none;color:var(--soft)}
.rcc .tabs button.on{color:var(--ink);font-weight:600;border-color:#b07a1e}
.rcc .tree{display:block;width:210px;margin:0 auto;filter:drop-shadow(0 6px 6px rgba(60,30,0,.35))}
.rcc .mt-lt{animation:rcc-mtw 2.6s ease-in-out infinite;animation-delay:var(--d,0s)}
@keyframes rcc-mtw{0%,100%{opacity:1}50%{opacity:.45}}
.rcc ul.wl{list-style:none;padding:0;margin:8px 0}
.rcc ul.wl li{display:flex;align-items:center;gap:6px;padding:9px 0;border-bottom:1px dashed rgba(90,58,24,.4)}
.rcc ul.wl li>span{flex:1;min-width:0;white-space:pre-wrap;word-break:break-word}
.rcc ul.wl small{color:var(--soft);white-space:nowrap}
.rcc ul.wl .del{background:none;border:0;color:var(--soft);font-size:18px;padding:8px 9px}
.rcc ul.wl li.we{flex-wrap:wrap}
.rcc ul.wl li.we .in{flex:1 1 100%;resize:none;line-height:1.5}
.rcc textarea.in.wt{resize:none;line-height:1.5;align-self:stretch}
.rcc .row.end{align-items:flex-end}
.rcc .pw{position:relative}
.rcc textarea.paper{display:block;width:100%;height:210px;border:0;outline:none;resize:none;padding-top:46px}
.rcc .stamp{position:absolute;top:12px;right:14px;width:34px;height:42px;border:1px dashed #3a2410;opacity:.45;display:grid;place-items:center;font-size:14px;pointer-events:none}
.rcc .pm{position:absolute;top:16px;right:46px;width:58px;height:58px;border:1px solid rgba(58,36,16,.45);border-radius:50%;display:grid;place-items:center;text-align:center;font:10px/1.25 sans-serif;color:rgba(58,36,16,.6);transform:rotate(-14deg);pointer-events:none}
.rcc .lt{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 0;border-bottom:1px dashed rgba(90,58,24,.4)}
.rcc .lt small{display:block;color:var(--soft)}
.rcc .lt .del{background:none;border:0;color:var(--soft);font-size:18px;padding:8px 9px}
.rcc .mm-v{font-size:12px;color:var(--soft);white-space:nowrap}
/* ---------- 木桌 ---------- */
.rcc .desk{position:relative;min-height:580px;border-radius:14px;overflow:hidden;background-color:#4a2c18;background-image:radial-gradient(ellipse 85% 55% at 16% 0%,rgba(255,214,150,.42),rgba(255,214,150,0) 72%),var(--tex-wood,none);background-size:auto,256px 256px;box-shadow:inset 0 0 44px rgba(0,0,0,.7),inset 0 0 0 2px rgba(255,214,150,.12),0 0 0 3px #2c180c,0 10px 18px rgba(0,0,0,.55)}
.rcc .desk::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 42%,transparent 48%,rgba(0,0,0,.5) 100%)}
.rcc .desk-cap{position:absolute;left:0;right:0;top:336px;text-align:center;color:#f3e6c8;font-size:13px;letter-spacing:.08em;text-shadow:0 1px 3px rgba(0,0,0,.8)}
.rcc .env{position:absolute;left:50%;top:150px;width:260px;height:170px;margin-left:-130px;perspective:800px;transform:rotate(-2deg);filter:drop-shadow(0 12px 10px rgba(0,0,0,.55));cursor:pointer}
.rcc .env.opened,.rcc .env.opening,.rcc .env.far{cursor:default}
.rcc .env.far{opacity:.62;filter:drop-shadow(0 8px 8px rgba(0,0,0,.5)) saturate(.7)}
.rcc .env.wait{animation:rcc-mwig 1.1s ease-in-out infinite}
@keyframes rcc-mwig{0%,100%{transform:rotate(-2deg)}25%{transform:rotate(-4deg)}75%{transform:rotate(0)}}
.rcc .env-back{position:absolute;inset:0;border-radius:4px;background:repeating-linear-gradient(135deg,rgba(0,0,0,.05) 0 2px,transparent 2px 6px),linear-gradient(#b99556,#a07e42);box-shadow:inset 0 16px 16px -10px rgba(0,0,0,.4)}
.rcc .env-letter{position:absolute;left:8%;right:8%;top:9%;bottom:7px;z-index:2;border-radius:2px;background-color:#f3e7c6;background-image:repeating-linear-gradient(transparent 0 15px,rgba(120,80,40,.2) 15px 16px),var(--tex-paper,none);background-size:auto,256px 256px;box-shadow:0 1px 3px rgba(0,0,0,.45)}
.rcc .env-front{position:absolute;inset:0;z-index:3;pointer-events:none}
.rcc .env-front i{position:absolute;inset:0;border-radius:4px;background-color:#ecdcb3;background-image:linear-gradient(rgba(255,255,255,.2),rgba(0,0,0,.07)),var(--tex-paper,none);background-size:auto,256px 256px}
.rcc .env-front .fl{clip-path:polygon(0 0,53% 54%,0 100%);filter:brightness(.97)}
.rcc .env-front .fr{clip-path:polygon(100% 0,47% 54%,100% 100%);filter:brightness(.95)}
.rcc .env-front .fb{clip-path:polygon(0 100%,50% 46%,100% 100%);filter:brightness(1.03)}
.rcc .env-flap{position:absolute;left:0;right:0;top:0;height:66%;z-index:4;transform-origin:50% 0;clip-path:polygon(0 0,100% 0,50% 100%);background-color:#e6d3a2;background-image:linear-gradient(rgba(255,255,255,.22),rgba(0,0,0,.1)),var(--tex-paper,none);background-size:auto,256px 256px}
.rcc .env.opening .env-flap{animation:rcc-mflap .95s linear .15s both}
.rcc .env.opened .env-flap{transform:perspective(520px) rotateX(180deg);z-index:0;background-color:#c4a566;filter:brightness(.93)}
@keyframes rcc-mflap{0%{transform:perspective(520px) rotateX(0deg);z-index:4;filter:brightness(1);animation-timing-function:cubic-bezier(.42,0,1,1)}49%{transform:perspective(520px) rotateX(88deg);z-index:4;filter:brightness(.78);background-color:#e6d3a2}50%{z-index:0;background-color:#c4a566;animation-timing-function:cubic-bezier(0,0,.58,1)}100%{transform:perspective(520px) rotateX(180deg);z-index:0;background-color:#c4a566;filter:brightness(.93)}}
.rcc .env.opening .env-letter{animation:rcc-mslide 1.25s 1.15s both}
.rcc .env.opened .env-letter{transform:translateY(-62%);cursor:pointer}
@keyframes rcc-mslide{0%{transform:translateY(0) rotate(0);z-index:2;animation-timing-function:cubic-bezier(.25,.9,.3,1)}52%{transform:translateY(-62%) rotate(-1.5deg);z-index:2;animation-timing-function:cubic-bezier(.4,0,.2,1)}53%{z-index:6}100%{transform:translateY(-96%) rotate(0) scale(1.12);z-index:6}}
.rcc .desk.rd .env-letter{visibility:hidden}
.rcc .env-seal{position:absolute;left:50%;top:57%;width:40px;height:40px;margin:-20px 0 0 -20px;z-index:5;border-radius:50%;display:grid;place-items:center;color:#f8dede;font-size:16px;background:radial-gradient(circle at 35% 30%,#dc5866,#a3293a 55%,#6e1522);box-shadow:inset 0 2px 3px rgba(255,255,255,.35),inset 0 -3px 5px rgba(0,0,0,.4),0 2px 4px rgba(0,0,0,.5)}
.rcc .env.opening .env-seal{animation:rcc-mseal .35s ease-out forwards}
@keyframes rcc-mseal{to{transform:scale(1.5);opacity:0}}
.rcc .env.opened .env-seal{display:none}
.rcc .env-addr{position:absolute;left:0;right:0;bottom:15px;z-index:3;text-align:center;font-family:` + KAI + `;font-size:16px;color:#4a2c14;pointer-events:none}
.rcc .env-stp{position:absolute;right:12px;bottom:12px;z-index:3;width:28px;height:34px;border:1px dashed rgba(58,36,16,.55);display:grid;place-items:center;color:#a3293a;font-size:12px;background:rgba(255,255,255,.3);pointer-events:none}
.rcc .myl{position:absolute;left:16px;bottom:30px;width:128px;height:158px;overflow:hidden;transform:rotate(-6deg);cursor:pointer;background-color:#f1e5c2;background-image:linear-gradient(transparent 32%,rgba(90,58,24,.3) 33%,rgba(255,255,255,.25) 34%,transparent 36%,transparent 65%,rgba(90,58,24,.3) 66%,rgba(255,255,255,.25) 67%,transparent 69%),var(--tex-paper,none);background-size:auto,256px 256px;box-shadow:0 8px 12px rgba(0,0,0,.6),inset 0 0 14px rgba(150,100,40,.3)}
.rcc .myl p{margin:16px 11px 0;font-family:` + KAI + `;font-size:10.5px;line-height:1.6;color:rgba(58,36,16,.8);white-space:pre-wrap;word-break:break-all}
.rcc .myl::before{content:"";position:absolute;left:30px;top:-3px;width:60px;height:16px;background:rgba(255,236,170,.62);transform:rotate(-3deg);box-shadow:0 1px 2px rgba(0,0,0,.25)}
.rcc .myl b{position:absolute;left:0;right:0;bottom:7px;text-align:center;font-weight:400;font-size:11px;color:var(--soft);letter-spacing:.2em}
.rcc .pcd{position:absolute;right:14px;bottom:34px;width:158px;height:106px;padding:5px;transform:rotate(5deg);cursor:pointer;background:#fbf6e6;border-radius:2px;box-shadow:0 8px 12px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.6)}
.rcc .pcd img{display:block;width:100%;height:100%;object-fit:contain}
.rcc .pcd .pb{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px dashed rgba(90,58,24,.4);color:#8a5a1c;font-size:11px;line-height:1.35;text-align:center;padding:0 8px}
.rcc .pen{position:absolute;left:118px;bottom:14px;width:104px;transform:rotate(-9deg);filter:drop-shadow(0 3px 3px rgba(0,0,0,.5))}
/* ---------- 读信 / 明信片 ---------- */
.rcc .mov{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:18px}
.rcc .mbk{position:absolute;inset:0;background:rgba(20,10,0,.64);animation:rcc-mfade .4s ease-out}
@keyframes rcc-mfade{from{opacity:0}}
.rcc .mw{position:relative;width:100%;max-width:440px}
.rcc .mx{position:absolute;right:-4px;top:-14px;z-index:3}
.rcc .mpap{position:relative;max-height:78vh;max-height:78dvh;overflow:auto;padding:30px 24px 28px;border-radius:3px;color:#3a2410;font-family:` + KAI + `;font-size:17px;line-height:34px;white-space:pre-wrap;word-break:break-word;background-color:#f3e7c6;background-image:repeating-linear-gradient(transparent 0 33px,rgba(120,80,40,.18) 33px 34px),var(--tex-paper,none);background-size:auto,256px 256px;box-shadow:0 12px 30px rgba(0,0,0,.65),inset 0 0 26px rgba(150,100,40,.4);animation:rcc-munf .6s cubic-bezier(.2,.9,.3,1)}
@keyframes rcc-munf{from{opacity:0;transform:translateY(34px) scale(.92)}to{opacity:1;transform:none}}
.rcc .mpap .gap{height:34px}
.rcc .mcw{perspective:1100px;display:flex;justify-content:center;animation:rcc-munf .6s cubic-bezier(.2,.9,.3,1)}
.rcc .mcard{--ar:1.5;position:relative;width:min(86vw,380px,calc(56vh * var(--ar)));aspect-ratio:var(--ar);transform-style:preserve-3d;transition:transform .8s cubic-bezier(.3,.8,.3,1);cursor:pointer}
.rcc .mcard.flip{transform:rotateY(180deg)}
.rcc .mf,.rcc .mb{position:absolute;inset:0;border-radius:4px;overflow:hidden;-webkit-backface-visibility:hidden;backface-visibility:hidden;box-shadow:0 12px 24px rgba(0,0,0,.6)}
.rcc .mf{background:#fbf6e6;padding:9px}
.rcc .mf img{display:block;width:100%;height:100%;object-fit:contain}
.rcc .mf-b{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1px dashed rgba(90,58,24,.4);color:#8a5a1c;text-align:center;font-size:13px;padding:0 14px}
.rcc .mb{transform:rotateY(180deg);display:flex;gap:12px;padding:14px 12px 14px 16px;color:#3a2410;background-color:#f1e4c0;background-image:var(--tex-paper,none);background-size:256px 256px}
.rcc .mb::before{content:"";position:absolute;left:58%;top:14px;bottom:14px;width:1px;background:rgba(90,58,24,.4)}
.rcc .mb-l{flex:0 0 54%;font-family:` + KAI + `;font-size:16px;line-height:1.7;white-space:pre-wrap;overflow:hidden}
.rcc .mb-r{flex:1;position:relative;display:flex;flex-direction:column;justify-content:flex-end;gap:9px;padding-top:44px}
.rcc .mb-r u{display:block;height:10px;border-bottom:1px solid rgba(90,58,24,.45);text-decoration:none}
.rcc .mb-r b{font-weight:400;font-size:12px;font-family:` + KAI + `}
.rcc .mb-st{position:absolute;right:0;top:0;width:32px;height:38px;border:1px dashed rgba(58,36,16,.6);display:grid;place-items:center;font-size:14px;color:#a3293a;background:rgba(255,255,255,.35)}
.rcc .mb-pm{position:absolute;right:22px;top:6px;width:52px;height:52px;border:1px solid rgba(58,36,16,.45);border-radius:50%;display:grid;place-items:center;text-align:center;font:9px/1.25 sans-serif;color:rgba(58,36,16,.6);transform:rotate(-14deg)}
.rcc .mcard.por .mb{flex-direction:column;padding:16px 16px 14px}
.rcc .mcard.por .mb::before{display:none}
.rcc .mcard.por .mb-l{flex:1 1 auto;flex-basis:auto;margin-top:46px;font-size:15px}
.rcc .mcard.por .mb-r{position:static;flex:0 0 auto;padding-top:0}
.rcc .mcard.por .mb-st{right:16px;top:16px}
.rcc .mcard.por .mb-pm{right:56px;top:18px}
.rcc .mhint{color:#f3e6c8;text-align:center;font-size:12px;margin:12px 0 4px;text-shadow:0 1px 3px rgba(0,0,0,.8)}
.rcc .mw .wait{color:#f3e6c8;justify-content:center}
@media (prefers-reduced-motion:reduce){.rcc .env.opening .env-flap,.rcc .env.opening .env-letter,.rcc .env.opening .env-seal{animation-duration:.01s;animation-delay:0s}.rcc .env.wait,.rcc .mt-lt{animation:none}.rcc .mcard{transition-duration:.01s}}
`;

  // ---------- 圣诞树（拟物）----------
  function qpt(p0,c,p1,t){var u=1-t;return [u*u*p0[0]+2*u*t*c[0]+t*t*p1[0],u*u*p0[1]+2*u*t*c[1]+t*t*p1[1]];}
  function rnd(seed){var s=seed>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
  function f1(x){return Math.round(x*10)/10;}
  var TIERS=[[20,88,44],[52,138,64],[88,190,86]];
  var BA=[["#ffb0b8","#c8283a","#6e1522"],["#fff1bd","#e0b44a","#8a5a1c"],["#b8d6ff","#4a82cc","#1f3f78"],["#ffffff","#b4c0d0","#5f6f84"]];
  var SPOTS=[[96,58],[114,74],[84,80],[104,100],[76,112],[126,118],[58,142],[96,132],[138,146],[44,172],[84,168],[128,176]];
  function side(top,bot,hw,t){var h=bot-top;return qpt([100,top],[100-hw*.62,top+h*.5],[100-hw,bot],t);}
  function tierPath(top,bot,hw){var h=bot-top,c=[100-hw*.62,top+h*.5],n=Math.max(4,Math.round(hw/13)),step=2*hw/n,p="M100 "+top+" Q"+f1(c[0])+" "+f1(c[1])+" "+(100-hw)+" "+bot,i;
   for(i=0;i<n;i++){var x1=100-hw+(i+1)*step;p+=" Q"+f1(x1-step/2)+" "+(bot+10)+" "+f1(x1)+" "+bot;}
   return p+" Q"+f1(100+hw*.62)+" "+f1(c[1])+" 100 "+top+"Z";}
  function snowPath(top,bot,hw){var ts=[.5,.4,.3,.2,.1,.02],i,a,p="";
   for(i=0;i<ts.length;i++){a=side(top,bot,hw,ts[i]);p+=(i?"L":"M")+f1(a[0])+" "+f1(a[1]);}
   p+="L100 "+top;
   for(i=ts.length-1;i>=0;i--){a=side(top,bot,hw,ts[i]);p+="L"+f1(200-a[0])+" "+f1(a[1]);}
   var a0=side(top,bot,hw,.5),xa=200-a0[0],xb=a0[0],y=a0[1];
   for(i=0;i<5;i++){var x1=xa+(xb-xa)*(i+1)/5,cx=xa+(xb-xa)*(i+.5)/5;p+=" Q"+f1(cx)+" "+f1(y+(i%2?8:12))+" "+f1(x1)+" "+f1(y);}
   return p+"Z";}
  function needles(top,bot,hw,seed){var r=rnd(seed),s="",k;
   for(k=0;k<34;k++){var t=.12+r()*.82,a=side(top,bot,hw,t),left=r()<.5,w=Math.abs(100-a[0]),x=left?a[0]+w*(.08+r()*.75):200-a[0]-w*(.08+r()*.75),y=a[1]+r()*4,dir=left?-1:1,L=5+r()*5;
    s+='<path d="M'+f1(x)+' '+f1(y)+'l'+f1(dir*L*.6)+' '+f1(L)+'" stroke="'+(r()<.55?'rgba(8,38,22,.45)':'rgba(170,230,180,.22)')+'" stroke-width="1" stroke-linecap="round"/>';}
   return s;}
  function star(cx,cy,R,r){var p=[],i;for(i=0;i<10;i++){var a=-Math.PI/2+i*Math.PI/5,rr=i%2?r:R;p.push(f1(cx+Math.cos(a)*rr)+","+f1(cy+Math.sin(a)*rr));}return '<polygon points="'+p.join(" ")+'"/>';}
  function tree(n){
   var s='<svg class="tree" viewBox="0 0 200 236" aria-hidden="true"><defs>'+
   '<linearGradient id="mt-lf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#56a46e"/><stop offset=".5" stop-color="#2c6a45"/><stop offset="1" stop-color="#143a29"/></linearGradient>'+
   '<linearGradient id="mt-sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>'+
   '<linearGradient id="mt-sn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfdcee"/></linearGradient>'+
   '<linearGradient id="mt-tk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3719"/><stop offset=".45" stop-color="#8f6034"/><stop offset="1" stop-color="#3f2410"/></linearGradient>'+
   '<linearGradient id="mt-st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#d9a63a"/></linearGradient>'+
   '<radialGradient id="mt-gl"><stop offset="0" stop-color="#ffe9a0" stop-opacity=".85"/><stop offset="1" stop-color="#ffe9a0" stop-opacity="0"/></radialGradient>';
   BA.forEach(function(c,i){s+='<radialGradient id="mt-b'+i+'" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="'+c[0]+'"/><stop offset=".55" stop-color="'+c[1]+'"/><stop offset="1" stop-color="'+c[2]+'"/></radialGradient>';});
   s+='</defs><ellipse cx="100" cy="222" rx="88" ry="10" fill="url(#mt-sn)" stroke="#aebfd8" stroke-width=".8"/><rect x="92" y="184" width="16" height="38" fill="url(#mt-tk)" stroke="#2e1a0c" stroke-width="1"/><path d="M74 224Q100 214 126 224Q100 232 74 224Z" fill="#fff" opacity=".9"/>';
   var i;
   for(i=TIERS.length-1;i>=0;i--){var T=TIERS[i],tp=tierPath(T[0],T[1],T[2]);
    s+='<path d="'+tp+'" fill="url(#mt-lf)" stroke="#12301f" stroke-width="1.3" stroke-linejoin="round"/>'+needles(T[0],T[1],T[2],31+i*17)+'<path d="'+tp+'" fill="url(#mt-sh)"/><path d="'+snowPath(T[0],T[1],T[2])+'" fill="url(#mt-sn)" stroke="#b9c9e0" stroke-width=".7" stroke-linejoin="round"/>';}
   s+='<circle class="mt-lt" style="--d:-.4s" cx="100" cy="20" r="17" fill="url(#mt-gl)"/><g fill="url(#mt-st)" stroke="#b07a1e" stroke-width=".8" stroke-linejoin="round">'+star(100,18,11,4.7)+'</g>';
   for(i=0;i<Math.min(n,12);i++){var P=SPOTS[i],b=i%4;
    s+='<path d="M'+P[0]+' '+(P[1]-16)+'L'+P[0]+' '+(P[1]-8)+'" stroke="#c9a45c" stroke-width=".8"/><rect x="'+(P[0]-2.4)+'" y="'+(P[1]-9)+'" width="4.8" height="3.4" rx=".8" fill="#d9a63a" stroke="#8a5a1c" stroke-width=".5"/><circle cx="'+P[0]+'" cy="'+P[1]+'" r="7" fill="url(#mt-b'+b+')" stroke="rgba(0,0,0,.35)" stroke-width=".6"/><ellipse cx="'+(P[0]-2.4)+'" cy="'+(P[1]-2.8)+'" rx="2.2" ry="1.3" fill="#fff" opacity=".8" transform="rotate(-35 '+(P[0]-2.4)+' '+(P[1]-2.8)+')"/>';}
   return s+'</svg>';}

  function clip(s, n) { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : s; }
  function parseCard(raw) {
    var t = String(raw || "").trim(), m = t.match(/\{[\s\S]*\}/), o = null;
    if (m) { try { o = JSON.parse(m[0]); } catch (err) { o = null; } }
    if (!o) {
      var g = function (k) { var x = t.match(new RegExp('"' + k + '"\\s*:\\s*"([\\s\\S]*?)"\\s*(?:,\\s*"|\\})')); return x ? x[1].replace(/\\n/g, "\n") : ""; };
      o = { reply: g("reply"), card: g("card"), scene: g("scene") };
    }
    var reply = String(o.reply || "").trim();
    if (!reply && !m) reply = t.replace(/^```[a-z]*\n?|```$/g, "").trim();
    return { reply: reply, card: String(o.card || "").trim().slice(0, 40), scene: String(o.scene || "").trim().slice(0, 300) };
  }
  async function toData(src) {
    if (/^data:/.test(src)) return src;
    try {
      var b = await (await fetch(src)).blob();
      return await new Promise(function (ok, no) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.onerror = no; f.readAsDataURL(b); });
    } catch (err) { return src; }
  }
  function measure(src) {
    return new Promise(function (ok) {
      var im = new Image(), done = false;
      function fin(v) { if (!done) { done = true; ok(v); } }
      im.onload = function () { fin(im.naturalWidth && im.naturalHeight ? Math.max(0.5, Math.min(2, im.naturalWidth / im.naturalHeight)) : 1.5); };
      im.onerror = function () { fin(1.5); };
      setTimeout(function () { fin(1.5); }, 4000);
      im.src = src;
    });
  }
  var PEN = '<svg class="pen" viewBox="0 0 120 14" aria-hidden="true"><defs><linearGradient id="mp-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d65a"/><stop offset=".5" stop-color="#e0b53a"/><stop offset="1" stop-color="#a97f1c"/></linearGradient></defs>' +
    '<rect x="14" y="2" width="88" height="10" fill="url(#mp-b)"/><rect x="4" y="2" width="10" height="10" rx="2" fill="#e58d98"/><rect x="14" y="2" width="6" height="10" fill="#b9c3cf"/><path d="M102 2L118 7L102 12Z" fill="#e8c99a"/><path d="M112 5L118 7L112 9Z" fill="#3a2a1a"/></svg>';

  R.add({
    id: "mail", style: CSS, jobs: "mail:",
    home: { order: 3, en: "Mailbox", zh: "圣 诞 信 箱", desc: "许愿树，和写给圣诞老人的信", icon: "mail", svg: SVG },
    create: function (ctx) {
      var st = ctx.st, roche = ctx.roche, e = ctx.esc, tab = "wish", open = null, ov = null, testReveal = false;
      var editW = -1, editWText = "", pv = { vers: [], vi: 0, fbOpen: false }, imgs = {}, flip = false, anim = null, timers = [];
      st.wishText = st.wishText || ""; st.letterText = st.letterText || ""; st.polishFb = st.polishFb || "";
      function later(fn, ms) { var t = setTimeout(function () { var i = timers.indexOf(t); if (i > -1) timers.splice(i, 1); fn(); }, ms); timers.push(t); }
      function revealed(w) { return testReveal || Date.now() >= new Date(w.year, 11, 25).getTime(); }
      function wishChar(n) { return st.chars.filter(function (x) { return ctx.nm(x) === n; })[0] || null; }
      function letterById(id) { return st.letters.filter(function (x) { return x.id === id; })[0] || null; }
      var ovFrom = null;
      function reduced() { return !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
      function arOf(l) { return (l && l.pc && l.pc.ar) || 1.5; }
      // 读信纸 / 明信片从桌上的原位置「展开」出来：先量好起点，再让它从起点的位置和大小过渡到最终位置
      function flipIn() {
        var from = ovFrom; ovFrom = null;
        if (!from || reduced()) return;
        requestAnimationFrame(function () {
          var t = ctx.view.querySelector(ov && ov.k === "card" ? ".mcard" : ".mpap");
          if (!t || !t.animate) return;
          var r = t.getBoundingClientRect();
          if (!r.width || !from.width) return;
          var par = t.closest(".mcw") || t, sc = Math.min(1, from.width / r.width);
          par.style.animation = "none";
          t.animate([{ transform: "translate(" + ((from.left + from.width / 2) - (r.left + r.width / 2)) + "px," + ((from.top + from.height / 2) - (r.top + r.height / 2)) + "px) scale(" + sc + ")", opacity: 0.85 },
            { transform: "none", opacity: 1 }], { duration: 560, easing: "cubic-bezier(.2,.85,.25,1)" });
        });
      }
      function saveLetters() { return roche.storage.set("letters", st.letters); }
      function saveWishes() { return roche.storage.set("wishes", st.wishes); }

      // ---------- 许愿树页 ----------
      function vWish() {
        var any = st.wishes.length && st.wishes.every(revealed), pw = st.jobs["mail:wish"], lv = st.live["mail:wish"];
        var h = tree(st.wishes.length) +
          '<div class="row end"><textarea class="in wt" rows="2" maxlength="60" data-in="wishText" placeholder="写下一个圣诞愿望">' + e(st.wishText) + '</textarea><button class="btn sm" data-act="mail.addWish">挂上树</button></div>' +
          '<p class="hint">愿望会一直保密，12 月 25 日才揭晓，由 TA 回应。可以随时修改或删掉自己的愿望。</p><ul class="wl">' +
          (st.wishes.length ? st.wishes.map(function (w, i) {
            if (editW === i) return '<li class="we"><textarea class="in" rows="2" maxlength="60" data-we="1">' + e(editWText) + '</textarea><button class="btn sm" data-act="mail.wsave">保存</button><button class="link" data-act="mail.wcancel">取消</button></li>';
            return '<li><span>' + e(w.text) + '</span><small>' + (revealed(w) ? "已揭晓" : "封存中") + '</small><button class="del" data-act="mail.wedit" data-i="' + i + '" aria-label="编辑">✎</button><button class="del" data-act="mail.wdel" data-i="' + i + '" aria-label="删除">×</button></li>';
          }).join("") : '<li><small>树上还空着，挂上第一个愿望吧。</small></li>') + '</ul>';
        if (ctx.cfg.test) h += '<div class="center"><button class="link" data-act="mail.testReveal">测试：' + (testReveal ? "取消" : "提前") + '揭晓</button></div>';
        if (any) {
          h += ctx.picker(false) + '<div class="center"><button class="btn" data-act="mail.replyWish"' + (pw ? " disabled" : "") + '>' + (pw ? "生成中" : "请 " + e(ctx.nm(ctx.curChar())) + " 回应愿望") + '</button></div>';
          if (pw && !lv) h += ctx.wait("TA 在读你的愿望，你可以先去别处逛逛");
        }
        if (lv) h += '<div class="paper" data-live="mail:wish">' + e(lv) + '</div>';
        else if (st.wishReply) h += '<div class="paper" style="min-height:0">' + ctx.rich(st.wishReply.text, wishChar(st.wishReply.who)) + '\n—— ' + e(st.wishReply.who) + '</div>';
        return h;
      }

      // ---------- 写信页 ----------
      function vLetters() {
        var busy = st.jobs["mail:polish"];
        var h = ctx.picker(false) + '<div class="pw"><div class="stamp">★</div><textarea class="paper" data-in="letterText" placeholder="亲爱的圣诞老人……">' + e(st.letterText) + '</textarea></div>' +
          '<div class="row" style="margin:6px 0;align-items:center;flex-wrap:wrap"><button class="btn ghost sm" data-act="mail.polish"' + (busy ? " disabled" : "") + '>' + (busy ? "润色中" : "✦ 润色") + '</button>' +
          '<button class="btn ghost sm" data-act="mail.fbtog">提意见</button>' +
          (pv.vers.length > 1 ? '<span class="mm-v"><button class="link" data-act="mail.pv" data-d="-1">‹</button> 版本 ' + (pv.vi + 1) + '/' + pv.vers.length + ' <button class="link" data-act="mail.pv" data-d="1">›</button></span>' : "") + '</div>' +
          (pv.fbOpen ? '<div class="row" style="margin:0 0 6px"><input class="in" data-in="polishFb" placeholder="比如：别太书面，保留我原来的语气" value="' + e(st.polishFb) + '"><button class="btn sm" data-act="mail.fbgo"' + (busy ? " disabled" : "") + '>按意见润色</button></div>' : "") +
          (busy ? ctx.wait("正在润色，只会小改") : "") +
          '<div class="center"><button class="btn" data-act="mail.send">投进信箱</button></div><p class="hint">润色只做小改，不会改变你的意思；回信会在第二天早上 9 点送到。</p>';
        return h + st.letters.slice().reverse().map(function (l) {
          var ready = Date.now() >= l.replyAt, pl = st.jobs["mail:letter:" + l.id];
          var status = pl ? "正在写回信" : (l.reply ? (l.opened ? "已读" : "回信到了") : (ready ? "回信到了" : ctx.fmt(l.replyAt) + " 送达"));
          var label = l.reply ? (l.opened ? "再看看" : "拆信") : (ready ? "拆信" : "看看");
          var skip = (!l.reply && !ready && ctx.cfg.test) ? '<button class="link" data-act="mail.skip" data-id="' + e(l.id) + '">测试：提前送达</button>' : "";
          return '<div class="lt"><span>给 ' + e(l.charName) + '<small>' + ctx.fmt(l.sentAt) + ' 寄出 · ' + status + '</small></span><span>' + skip + '<button class="btn sm" data-act="mail.desk" data-id="' + e(l.id) + '">' + label + '</button><button class="del" data-act="mail.ldel" data-id="' + e(l.id) + '" aria-label="删除这封信">×</button></span></div>';
        }).join("");
      }

      // ---------- 木桌 ----------
      function vDesk(l) {
        var ready = Date.now() >= l.replyAt, jobd = st.jobs["mail:letter:" + l.id], animating = anim === l.id, opened = !!(l.reply && l.opened);
        var cls = "env" + (animating ? " opening" : (opened ? " opened" : "")) + (jobd ? " wait" : "") + (!l.reply && !ready ? " far" : "");
        var tap = (!animating && !opened && !jobd && (l.reply || ready)) ? ' data-act="mail.env"' : "";
        var cap = jobd ? "圣诞老人正在写回信…" : (!l.reply && !ready ? "回信还在路上，" + ctx.fmt(l.replyAt) + " 送达" : (opened ? "点信纸，再读一遍" : (animating ? "" : "点信封，拆开它")));
        var env = '<div class="' + cls + '"' + tap + ' role="button" aria-label="信封"><div class="env-back"></div>' +
          '<div class="env-letter"' + (opened && !animating ? ' data-act="mail.read" data-k="reply"' : "") + '></div>' +
          '<div class="env-front"><i class="fl"></i><i class="fr"></i><i class="fb"></i></div>' +
          '<div class="env-addr">致 ' + e(ctx.userName()) + '</div><div class="env-stp">★</div>' +
          '<div class="env-flap"></div><div class="env-seal">★</div></div>';
        var im = imgs[l.id], pcd = "";
        var ar = arOf(l), pw = ar >= 1 ? 158 : Math.round(140 * ar) + 10, ph = ar >= 1 ? Math.round(148 / ar) + 10 : 150;
        if (!im) { pw = 158; ph = 106; }
        if (l.reply) pcd = '<div class="pcd" data-act="mail.card" role="button" aria-label="明信片" style="width:' + pw + 'px;height:' + ph + 'px">' + (im ? '<img src="' + e(im) + '" alt="">' :
          '<div class="pb">' + (l.pc ? '<span>✻</span><span>点开看看</span>' : '<span>点一下，请圣诞老人补寄明信片</span>') + '</div>') + '</div>';
        return '<div class="pg"><div class="bar"><button class="gbtn" data-act="core.back" aria-label="返回">‹</button><div class="ttl"><div class="en">Letters</div><div class="zh">信 件</div></div></div>' +
          '<div class="desk' + (ov && ov.k === "reply" ? " rd" : "") + '">' + PEN + env + '<div class="desk-cap">' + e(cap) + '</div>' +
          '<div class="myl" data-act="mail.read" data-k="mine"><p>' + e(clip(l.text, 120)) + '</p><b>我的信</b></div>' + pcd + '</div></div>';
      }
      function ovHtml() {
        if (!ov || !open) return "";
        var l = letterById(open);
        if (!l) { ov = null; return ""; }
        var close = '<button class="gbtn mx" data-act="mail.cov" aria-label="关闭">×</button>', bk = '<div class="mbk" data-act="mail.cov"></div>';
        if (ov.k === "card") {
          var im = imgs[l.id], pc = l.pc, ji = st.jobs["mail:img:" + l.id], jc = st.jobs["mail:card:" + l.id];
          var front = '<div class="mf">' + (im ? '<img src="' + e(im) + '" alt="">' : '<div class="mf-b"><span style="font-size:26px">✻</span><span>' + (pc ? "还没有画面，可以让圣诞老人画一张" : "圣诞老人还没写明信片") + '</span></div>') + '</div>';
          var back = '<div class="mb"><div class="mb-l">' + e((pc && pc.text) || "（还没有话）") + '</div><div class="mb-r"><div class="mb-st">★</div><div class="mb-pm">北极邮局<br>' + e(ctx.fmt(l.replyAt)) + '</div><u></u><u></u><u></u><b>' + e(ctx.userName()) + ' 收</b></div></div>';
          var btn = !pc ? '<button class="btn" data-act="mail.cardmake"' + (jc ? " disabled" : "") + '>' + (jc ? "写明信片中" : "请圣诞老人补寄（调用一次模型）") + '</button>'
            : '<button class="btn" data-act="mail.cardimg"' + (ji ? " disabled" : "") + '>' + (ji ? "绘制中" : (im ? "重画一张" : "生成明信片图（消耗额度，可选）")) + '</button>';
          return '<div class="mov">' + bk + '<div class="mw">' + close + '<div class="mcw"><div class="mcard' + (flip ? " flip" : "") + (im && arOf(l) < 1 ? " por" : "") + '" style="--ar:' + (im ? arOf(l) : 1.5) + '" data-act="mail.flip">' + front + back + '</div></div>' +
            '<p class="mhint">点卡片翻面</p><div class="center" style="margin:6px 0">' + btn + '</div>' + ((ji || jc) ? ctx.wait("正在准备，你可以先关掉看别的") : "") + '</div></div>';
        }
        var re = ov.k === "reply", body = re ? ctx.rich(l.reply || "", ctx.charById(l.charId)) : e(l.text) + '\n\n' + e(ctx.fmt(l.sentAt));
        return '<div class="mov">' + bk + '<div class="mw">' + close + '<div class="mpap">' + (re ? '<div class="stamp">★</div><div class="pm">北极邮局<br>' + e(ctx.fmt(l.replyAt)) + '</div><div class="gap"></div>' : "") + body + '</div></div></div>';
      }

      // ---------- 动作 ----------
      // 开信封分镜：封口沿折痕翻下去 → 抽出信纸 → 举到面前 → 展开成读信纸
      function playOpen(l) {
        if (reduced()) { l.opened = true; saveLetters(); ov = { k: "reply" }; ctx.render(); return; }
        anim = l.id; ctx.render();
        later(function () {
          var el = ctx.view.querySelector(".env-letter"), r = el ? el.getBoundingClientRect() : null;
          anim = null; l.opened = true; saveLetters();
          if (open === l.id) { ov = { k: "reply" }; ovFrom = r; ctx.render(); flipIn(); }
        }, 2450);
      }
      function genReply(l) {
        var ch = ctx.charById(l.charId) || ctx.curChar();
        if (!ch) return roche.ui.toast("找不到这个角色了");
        ctx.job("mail:letter:" + l.id, "mail", "回信", async function () {
          var c = await ctx.context(ch);
          var raw = await ctx.ask(ctx.sysFor(ch, c), "你扮演圣诞老人，给对方写一封手写风格的回信，并附一张明信片。对方的来信：\n" + l.text +
            "\n只输出 JSON：{\"reply\":\"回信正文，120-220 字，亲切温暖、有画面感，落款写圣诞老人\",\"card\":\"明信片背面的手写短话，不超过 20 字\",\"scene\":\"明信片正面画面的英文生图提示词，一句话，贴合回信内容和对方喜好，不要出现文字\"}", false);
          var o = parseCard(raw);
          if (!o.reply) throw new Error("没有收到回信，再试一次");
          l.reply = o.reply; l.pc = { text: o.card, scene: o.scene };
          await saveLetters();
        }).then(function (res) { if (res && res.ok && open === l.id && l.reply) later(function () { playOpen(l); }, 250); });
      }
      async function loadImg(l) {
        if (!l || !l.pc || !l.pc.img || imgs[l.id]) return;
        try {
          var s = await roche.storage.get("pcimg:" + l.id);
          if (s) { imgs[l.id] = s; if (!l.pc.ar) { l.pc.ar = await measure(s); saveLetters(); } if (open === l.id) ctx.render(); }
        } catch (err) { /* 读不到就显示空白明信片 */ }
      }
      function polish(fb) {
        var cur = String(st.letterText || "").trim();
        if (!cur) return roche.ui.toast("信还是空的");
        ctx.job("mail:polish", "mail", "润色", async function () {
          if (!pv.vers.length) { pv.vers = [cur]; pv.vi = 0; } else pv.vers[pv.vi] = cur;
          var sys = "你是写信润色助手。只做小幅润色：改正错别字和病句，让语句更通顺自然。必须保留原意、语气、人称、段落结构和大致长度；不要扩写，不要改变风格，不要添加原文没有的内容。只输出润色后的信件正文，不要解释。";
          var u = "【原信】\n" + cur + (fb ? "\n【用户意见】" + fb + "\n请按意见做小幅调整，仍然不要大改。" : "");
          var t = String(await ctx.ask(sys, u, false)).replace(/^```[a-z]*\n?|```$/g, "").trim();
          if (!t) throw new Error("没有收到内容，再试一次");
          pv.vers.push(t); pv.vi = pv.vers.length - 1; st.letterText = t; if (fb) st.polishFb = "";
        });
      }
      function onIn(ev) { var t = ev.target; if (t && t.dataset && t.dataset.we != null) editWText = t.value; }
      ctx.root.addEventListener("input", onIn);

      return {
        init: function () { st.wishText = st.wishText || ""; },
        destroy: function () { timers.forEach(clearTimeout); timers = []; ctx.root.removeEventListener("input", onIn); },
        back: function () {
          if (ov) { ov = null; return true; }
          if (open) { open = null; anim = null; return true; }
          return false;
        },
        view: function () {
          if (open) { var l = letterById(open); if (l) return vDesk(l) + ovHtml(); open = null; }
          return ctx.page("Mailbox", "圣 诞 信 箱", '<div class="tabs"><button class="' + (tab === "wish" ? "on" : "") + '" data-act="mail.tab" data-t="wish">许愿树</button><button class="' +
            (tab === "letter" ? "on" : "") + '" data-act="mail.tab" data-t="letter">写信</button></div>' + (tab === "wish" ? vWish() : vLetters()));
        },
        act: async function (name, el) {
          var c = ctx.curChar(), id = el.dataset.id, i = +el.dataset.i;
          if (name === "tab") { tab = el.dataset.t; return ctx.render(); }
          if (name === "testReveal") { testReveal = !testReveal; return ctx.render(); }
          // ----- 愿望 -----
          if (name === "addWish") {
            var t = st.wishText.trim();
            if (!t) return roche.ui.toast("先写下愿望");
            st.wishes.push({ id: ctx.uid(), text: t, year: new Date().getFullYear(), at: Date.now() }); st.wishText = "";
            await saveWishes(); roche.ui.toast("愿望已挂上树"); return ctx.render();
          }
          if (name === "wedit") {
            if (!st.wishes[i]) return;
            editW = i; editWText = st.wishes[i].text; ctx.render();
            var ta = ctx.view.querySelector("[data-we]");
            if (ta) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (err) { /* 忽略 */ } }
            return;
          }
          if (name === "wcancel") { editW = -1; return ctx.render(); }
          if (name === "wsave") {
            var nt = String(editWText || "").trim();
            if (!st.wishes[editW]) { editW = -1; return ctx.render(); }
            if (!nt) return roche.ui.toast("愿望不能是空的，想删掉请点 ×");
            st.wishes[editW].text = nt; editW = -1;
            await saveWishes(); roche.ui.toast("已修改"); return ctx.render();
          }
          if (name === "wdel") {
            var w0 = st.wishes[i];
            if (!w0 || !(await roche.ui.confirm({ title: "删除愿望", message: "确定把「" + clip(w0.text, 20) + "」从树上摘掉吗？" }))) return;
            st.wishes.splice(i, 1); editW = -1;
            await saveWishes(); return ctx.render();
          }
          if (name === "replyWish") {
            if (!c) return;
            ctx.job("mail:wish", "mail", "愿望回应", async function () {
              var l = await ctx.context(c);
              var txt = await ctx.ask(ctx.sysFor(c, l), "你扮演圣诞老人，12 月 25 日到了，对方挂在许愿树上的愿望如下：\n" + st.wishes.map(function (w, k) { return (k + 1) + ". " + w.text; }).join("\n") +
                "\n请逐条温暖地回应，可以说会努力帮忙实现，总共 150-250 字，直接输出正文。", false, "mail:wish");
              st.wishReply = { text: txt, who: ctx.nm(c), at: Date.now() };
              await roche.storage.set("wishReply", st.wishReply);
            });
            return;
          }
          // ----- 写信 / 润色 -----
          if (name === "polish") return polish("");
          if (name === "fbtog") { pv.fbOpen = !pv.fbOpen; return ctx.render(); }
          if (name === "fbgo") {
            var fb = String(st.polishFb || "").trim();
            if (!fb) return roche.ui.toast("先写下你的意见");
            return polish(fb);
          }
          if (name === "pv") {
            if (!pv.vers.length) return;
            pv.vers[pv.vi] = st.letterText;
            pv.vi = Math.max(0, Math.min(pv.vers.length - 1, pv.vi + (+el.dataset.d))); st.letterText = pv.vers[pv.vi];
            return ctx.render();
          }
          if (name === "send") {
            var lt = st.letterText.trim();
            if (!c) return roche.ui.toast("请先选一个收信角色");
            if (!lt) return roche.ui.toast("信还是空的");
            var dd = new Date(); dd.setDate(dd.getDate() + 1); dd.setHours(9, 0, 0, 0);
            st.letters.push({ id: ctx.uid(), charId: c.id, charName: ctx.nm(c), text: lt, sentAt: Date.now(), replyAt: dd.getTime(), reply: null }); st.letterText = "";
            pv = { vers: [], vi: 0, fbOpen: false };
            await saveLetters(); roche.ui.toast("信已投进信箱"); return ctx.render();
          }
          if (name === "ldel") {
            var Ld = letterById(id);
            if (!Ld) return;
            if (st.jobs["mail:letter:" + id]) return roche.ui.toast("正在写回信，等写完再删");
            if (!(await roche.ui.confirm({ title: "删除这封信", message: "会删掉你寄出的信、圣诞老人的回信和明信片，删掉就找不回来了。确定吗？" }))) return;
            st.letters.splice(st.letters.indexOf(Ld), 1); delete imgs[id];
            try { await roche.storage.delete("pcimg:" + id); } catch (err) { /* 没有图就算了 */ }
            await saveLetters();
            if (open === id) { open = null; ov = null; anim = null; }
            roche.ui.toast("已删除"); return ctx.render();
          }
          if (name === "skip") { st.letters.forEach(function (x) { if (x.id === id) x.replyAt = Date.now(); }); await saveLetters(); return ctx.render(); }
          // ----- 木桌 -----
          if (name === "desk") {
            var L = letterById(id);
            if (!L) return;
            open = id; ov = null; flip = false; anim = null; ctx.render(); loadImg(L); return;
          }
          if (name === "env") {
            var L2 = letterById(open);
            if (!L2 || anim || st.jobs["mail:letter:" + L2.id]) return;
            if (!L2.reply) return Date.now() < L2.replyAt ? roche.ui.toast("回信还没到，" + ctx.fmt(L2.replyAt) + " 送达") : genReply(L2);
            if (!L2.opened) return playOpen(L2);
            return;
          }
          if (name === "read") { ovFrom = el.getBoundingClientRect(); ov = { k: el.dataset.k }; ctx.render(); return flipIn(); }
          if (name === "cov") { ov = null; return ctx.render(); }
          if (name === "card") { ovFrom = el.getBoundingClientRect(); ov = { k: "card" }; flip = false; ctx.render(); return flipIn(); }
          if (name === "flip") {
            var cd = ctx.view.querySelector(".mcard");
            if (cd) { cd.classList.toggle("flip"); flip = cd.classList.contains("flip"); }
            return;
          }
          if (name === "cardmake") {
            var L3 = letterById(open);
            if (!L3 || !L3.reply) return;
            if (!(await roche.ui.confirm({ title: "补寄明信片", message: "会调用一次模型，让圣诞老人为这封信写一张明信片。确定吗？" }))) return;
            var ch3 = ctx.charById(L3.charId) || c;
            ctx.job("mail:card:" + L3.id, "mail", "明信片", async function () {
              var cx = ch3 ? await ctx.context(ch3) : "";
              var raw = await ctx.ask(ch3 ? ctx.sysFor(ch3, cx) : "你扮演圣诞老人。", "你扮演圣诞老人，已经回了对方一封信，现在再寄一张明信片。来信：\n" + L3.text + "\n你的回信：\n" + L3.reply +
                "\n只输出 JSON：{\"card\":\"明信片背面的手写短话，不超过 20 字\",\"scene\":\"明信片正面画面的英文生图提示词，一句话，不要出现文字\"}", false);
              var o = parseCard(raw);
              if (!o.card && !o.scene) throw new Error("没有收到内容，再试一次");
              L3.pc = { text: o.card, scene: o.scene }; await saveLetters();
            });
            return;
          }
          if (name === "cardimg") {
            var L4 = letterById(open);
            if (!L4 || !L4.pc) return;
            if (!(await roche.ui.confirm({ title: "生成明信片图", message: "生图会消耗你的生图额度，确定要生成吗？" }))) return;
            ctx.job("mail:img:" + L4.id, "mail", "明信片图", async function () {
              var r = await roche.ai.generateImage({ prompt: "vintage christmas postcard illustration, " + (L4.pc.scene || "a snowy cabin with warm lights") + ", warm light, soft storybook watercolor style, no text, no letters" });
              var src = ctx.imgSrc(r);
              if (!src) throw new Error("没有拿到图片，请检查生图设置");
              src = await toData(src);
              await roche.storage.set("pcimg:" + L4.id, src);
              imgs[L4.id] = src; L4.pc.img = true; L4.pc.ar = await measure(src); await saveLetters();
            });
            return;
          }
        }
      };
    }
  });
})();
