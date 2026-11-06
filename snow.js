/* snow.js — 雪仗：回合制（我方防守 / 我方进攻），5 颗心，最多 8 回合
 * 台词：进入前一次性预生成并缓存（每个角色只花一次钱），游戏中按事件类型挑，所以台词和画面一定对得上
 * 形象：对手用角色头像，我方用你的人设头像；不用生图 */
(function () {
  "use strict";
  var R = window.RCC;
  var LANE = [27, 73];                 // 左右两条路的横向位置（%）
  var MAX_ROUND = 8;
  var EV = { start: "开局", throw: "出手扔雪球", dodge: "我方躲开了", hit: "打中了我方", gotHit: "被我方打中", miss: "我方扔偏了", oppWin: "你赢了整场", oppLose: "你输了整场" };
  var DEF = {
    start: ["准备好了吗？", "来打雪仗吧！", "别想跑！"], throw: ["接招！", "看球！", "小心啦！"],
    dodge: ["哎，躲开了！", "溜得真快！", "下次一定！"], hit: ["打中啦！", "漂亮！", "嘿嘿，中了！"],
    gotHit: ["哇，被打中了！", "好球！", "这下扯平了！"], miss: ["差一点！", "嘿，没中吧！", "我躲开啦！"],
    oppWin: ["我赢啦！", "承让承让！", "再来一局？"], oppLose: ["我认输！", "你好厉害！", "下次不会输！"]
  };
  var SVG = '<svg viewBox="0 0 48 48" fill="none" stroke="#8a5a1c" stroke-width="2.2"><circle cx="24" cy="30" r="12" fill="rgba(255,255,255,.7)"/><circle cx="24" cy="14" r="8" fill="rgba(255,255,255,.7)"/><path d="M22 14h5" stroke="#c9742a"/></svg>';
  function heart(on) { return '<svg viewBox="0 0 24 24" width="17" height="17"><path d="M12 21s-8-5.6-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.4-8 11-8 11z" fill="' + (on ? "#c23a4c" : "rgba(60,40,20,.25)") + '" stroke="' + (on ? "#6e1522" : "rgba(60,40,20,.4)") + '" stroke-width="1"/></svg>'; }

  var CSS = `
.rcc .arena{position:relative;height:430px;border-radius:12px;overflow:hidden;background:linear-gradient(#8fa8cf 0%,#d6e2f2 52%,#f6f9fc 53%,#dfe8f2 100%);box-shadow:inset 0 0 22px rgba(50,70,110,.4),0 0 0 2px #5a3a20}
.rcc .arena .hill{position:absolute;left:-10%;right:-10%;top:44%;height:60px;border-radius:50%;background:#fff;box-shadow:0 -4px 10px rgba(120,150,190,.25)}
.rcc .rb{position:absolute;left:8px;top:8px;z-index:5;padding:3px 12px;border-radius:8px;font-size:12px;color:#3a2410;background:#f3e7c6;box-shadow:0 0 0 2px #5a3a20,0 2px 4px rgba(0,0,0,.4)}
.rcc .hp{position:absolute;z-index:5;display:flex;gap:1px;padding:3px 7px;border-radius:12px;background:rgba(255,255,255,.75);font-size:11px;align-items:center;gap:3px;color:#3a2410}
.rcc .hp.o{right:8px;top:8px}.rcc .hp.m{left:8px;bottom:8px}
.rcc .av2{position:absolute;z-index:3;transform:translateX(-50%);border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#6a4a2a;color:#f3e6c8;font-size:26px;border:3px solid #fff;box-shadow:0 4px 8px rgba(40,60,100,.5);transition:left .25s ease}
.rcc .av2.o{top:62px;width:66px;height:66px}.rcc .av2.m{top:285px;width:78px;height:78px}
.rcc .av2 img{width:100%;height:100%;object-fit:cover}
.rcc .av2.shake{animation:rcc-shake .5s}
@keyframes rcc-shake{20%{margin-left:-8px}40%{margin-left:8px}60%{margin-left:-5px}80%{margin-left:4px}}
.rcc .splat{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 40% 40%,#fff 0 45%,rgba(255,255,255,.7) 60%,transparent 72%);animation:rcc-splat .7s ease-out forwards}
@keyframes rcc-splat{from{transform:scale(.3);opacity:1}to{transform:scale(1.15);opacity:.9}}
.rcc .mound{position:absolute;z-index:2;width:92px;height:34px;border-radius:50%;background:radial-gradient(#fff,#e3ebf5);transform:translateX(-50%);box-shadow:0 3px 6px rgba(60,90,140,.35)}
.rcc .ball{position:absolute;z-index:4;width:26px;height:26px;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle at 35% 30%,#fff,#e1e9f3 65%,#b4c4da);box-shadow:0 3px 5px rgba(50,80,120,.5)}
.rcc .mark{position:absolute;z-index:2;width:58px;height:18px;border-radius:50%;transform:translateX(-50%);background:rgba(163,41,58,.28);border:2px solid rgba(163,41,58,.75);transition:left .18s}
.rcc .tell{position:absolute;z-index:4;top:38px;transform:translateX(-50%);padding:2px 9px;border-radius:10px;font-size:12px;background:#fff;color:#a3293a;animation:rcc-pulse .5s ease-in-out infinite}
.rcc .bubble{position:absolute;z-index:6;left:50%;top:42px;transform:translateX(-50%);max-width:70%;padding:6px 12px;border-radius:14px;background:#fff;color:#3a2410;font-size:13px;box-shadow:0 3px 8px rgba(40,60,100,.4);text-align:center}
.rcc .res{position:absolute;inset:0;z-index:7;display:grid;place-content:center;gap:10px;text-align:center;background:rgba(20,30,50,.55);color:#fff}
.rcc .res h3{margin:0;font-size:34px;font-weight:400;text-shadow:0 2px 6px rgba(0,0,0,.6)}
.rcc .res .bubble{position:static;transform:none;margin:0 auto}
.rcc .two{display:flex;gap:14px;margin-top:14px}
.rcc .two .btn{flex:1;padding:14px 0;font-size:16px}
.rcc .meta{display:flex;align-items:center;gap:12px;margin:8px 0 4px}
.rcc .meta .a{width:44px;height:44px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#6a4a2a;color:#f3e6c8;box-shadow:0 0 0 2px #d9a63a,0 2px 4px rgba(0,0,0,.4)}
.rcc .meta .a img{width:100%;height:100%;object-fit:cover}
`;

  R.add({
    id: "snow", style: CSS, jobs: "snow:",
    home: { order: 6, en: "Snowball Fight", zh: "雪 仗", desc: "和角色打一场回合制雪仗", icon: "snow", svg: SVG },
    create: function (ctx) {
      var st = ctx.st, roche = ctx.roche, e = ctx.esc;
      var game = null, timers = [], lineMsg = "";

      function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
      function clearAll() { timers.forEach(clearTimeout); timers = []; }
      function rnd() { return Math.random(); }
      function lines(c) { return (st.d.snowLines && st.d.snowLines[c.id]) || null; }
      function stats() { return st.d.snowStats || { win: 0, lose: 0 }; }
      function avatar(img, name) { return img ? '<img src="' + e(img) + '" alt="">' : e(String(name || "?").slice(0, 1)); }
      function el(sel) { return ctx.view.querySelector(sel); }
      function say(ev) {
        var L = (game.c && lines(game.c)) || {}, arr = (L[ev] && L[ev].length ? L[ev] : DEF[ev]);
        game.bubble = String(arr[Math.floor(rnd() * arr.length)]).slice(0, 24);
      }

      // ---------- 回合流程 ----------
      function start(c) {
        clearAll();
        game = { c: c, turn: null, round: 1, hp: { me: 5, opp: 5 }, phase: "intro", lane: { me: rnd() < 0.5 ? 0 : 1, opp: rnd() < 0.5 ? 0 : 1 }, bubble: "", fx: null, ball: null, tell: null, over: null };
        say("start"); ctx.render(); later(beginDefend, 1500);
      }
      function dur() { return Math.max(850, 1500 - (game.round - 1) * 110); }
      function beginDefend() {
        game.phase = "defend"; game.turn = "defend"; game.fx = null;
        game.ball = { by: "opp", lane: rnd() < 0.5 ? 0 : 1, dur: dur() };
        say("throw"); ctx.render();
        later(function () { var b = el(".ball"); if (b) b.style.top = "66%"; }, 40);
        var feint = game.round >= 3 ? 0.45 : (game.round === 2 ? 0.2 : 0);
        if (rnd() < feint) later(function () { game.ball.lane = 1 - game.ball.lane; var b = el(".ball"), m = el(".mark"); if (b) b.style.left = LANE[game.ball.lane] + "%"; if (m) m.style.left = LANE[game.ball.lane] + "%"; }, game.ball.dur * 0.5);
        later(resolveDefend, game.ball.dur + 80);
      }
      function resolveDefend() {
        var hit = game.lane.me === game.ball.lane;
        game.phase = "after"; game.ball = null;
        if (hit) { game.hp.me--; game.fx = "me"; say("hit"); } else say("dodge");
        ctx.render();
        later(function () { game.fx = null; if (game.hp.me <= 0) return finish("lose"); beginAttack(); }, 1400);
      }
      function beginAttack() {
        game.phase = "attack"; game.turn = "attack"; game.aim = null; game.bubble = ""; game.F = rnd() < 0.5 ? 0 : 1;
        game.tell = rnd() < 0.7 ? game.F : 1 - game.F;       // 70% 的概率提示是真的
        ctx.render();
        later(function () { game.tell = null; if (game.phase === "attack") ctx.render(); }, 1100);
        later(function () { if (game.phase === "attack" && game.aim == null) aim(rnd() < 0.5 ? 0 : 1); }, 2800);
      }
      function aim(l) {
        game.aim = l; game.phase = "flight"; game.tell = null;
        game.ball = { by: "me", lane: l, dur: 700 }; ctx.render();
        later(function () { var b = el(".ball"); if (b) b.style.top = "27%"; }, 40);
        later(function () { game.lane.opp = game.F; var o = el(".av2.o"), md = ctx.view.querySelectorAll(".mound"); if (o) o.style.left = LANE[game.F] + "%"; if (md[0]) md[0].style.left = LANE[game.F] + "%"; }, 260);
        later(resolveAttack, 780);
      }
      function resolveAttack() {
        var hit = game.aim === game.F;
        game.phase = "after"; game.ball = null;
        if (hit) { game.hp.opp--; game.fx = "opp"; say("gotHit"); } else say("miss");
        ctx.render();
        later(function () {
          game.fx = null;
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
      }
      function leave() { clearAll(); game = null; }

      // ---------- 视图 ----------
      function arenaHtml() {
        var g = game, c = g.c, ph = g.phase, u = st.user || {};
        var turn = g.turn === "defend" ? "我方防守" : (g.turn === "attack" ? "我方进攻" : "准备");
        var hearts = function (n) { var s = ""; for (var i = 0; i < 5; i++) s += heart(i < n); return s; };
        var h = '<div class="arena"><div class="hill"></div><div class="rb">第 ' + g.round + '/' + MAX_ROUND + ' 回合 · ' + turn + '</div>' +
          '<div class="hp o">' + e(ctx.nm(c)) + ' ' + hearts(g.hp.opp) + '</div>' +
          '<div class="mound" style="left:' + LANE[g.lane.opp] + '%;top:112px"></div>' +
          '<div class="av2 o' + (g.fx === "opp" ? " shake" : "") + '" style="left:' + LANE[g.lane.opp] + '%">' + avatar(c.avatar, ctx.nm(c)) + (g.fx === "opp" ? '<i class="splat"></i>' : "") + '</div>' +
          '<div class="mound" style="left:' + LANE[g.lane.me] + '%;top:352px"></div>' +
          '<div class="av2 m' + (g.fx === "me" ? " shake" : "") + '" style="left:' + LANE[g.lane.me] + '%">' + avatar(u.avatar, ctx.userName()) + (g.fx === "me" ? '<i class="splat"></i>' : "") + '</div>' +
          '<div class="hp m">' + e(ctx.userName()) + ' ' + hearts(g.hp.me) + '</div>';
        if (g.ball) {
          var b = g.ball, down = b.by === "opp";
          h += '<div class="ball" style="left:' + LANE[b.lane] + '%;top:' + (down ? 27 : 66) + '%;transition:top ' + b.dur + 'ms linear,left .18s"></div>';
          if (down) h += '<div class="mark" style="left:' + LANE[b.lane] + '%;top:72%"></div>';
        }
        if (g.tell != null) h += '<div class="tell" style="left:' + LANE[g.tell] + '%">盯着这边…</div>';
        if (g.bubble && !g.over) h += '<div class="bubble">' + e(g.bubble) + '</div>';
        if (g.over) {
          var t = g.over === "win" ? "你赢啦" : (g.over === "lose" ? "你输了" : "平局");
          h += '<div class="res"><h3 class="en">' + t + '</h3>' + (g.bubble ? '<div class="bubble">' + e(g.bubble) + '</div>' : "") +
            '<div><button class="btn" data-act="snow.again">再来一局</button></div></div>';
        }
        h += '</div>';
        var def = ph === "defend", att = ph === "attack";
        h += '<div class="two"><button class="btn" data-act="snow.lane" data-l="0"' + (def || att ? "" : " disabled") + '>' + (att ? "← 瞄左边" : "← 往左躲") + '</button>' +
          '<button class="btn" data-act="snow.lane" data-l="1"' + (def || att ? "" : " disabled") + '>' + (att ? "瞄右边 →" : "往右躲 →") + '</button></div>' +
          '<p class="hint" style="text-align:center">' + (def ? "雪球砸来了，红圈是落点，快躲到另一边（小心它会变招）" : (att ? "留意对手的眼神提示，但它不一定说真话" : "")) + '</p>';
        return h;
      }
      function setup() {
        var c = ctx.curChar(), L = c && lines(c), pend = c && st.jobs["snow:" + c.id], u = st.user || {}, s = stats();
        var h = ctx.picker(false) + '<div class="meta"><div class="a">' + avatar(c && c.avatar, ctx.nm(c)) + '</div><div><b>' + e(ctx.nm(c)) + '</b><small style="display:block;color:var(--soft)">对手</small></div></div>' +
          '<div class="meta"><div class="a">' + avatar(u.avatar, ctx.userName()) + '</div><div><b>' + e(ctx.userName()) + '</b><small style="display:block;color:var(--soft)">我方</small></div></div>' +
          '<p class="hint">回合制：我方防守时躲雪球，我方进攻时猜对手往哪边躲。每人 5 颗心，最多 ' + MAX_ROUND + ' 回合。战绩：' + s.win + ' 胜 ' + s.lose + ' 负</p>' +
          '<div class="center"><button class="btn" data-act="snow.go"' + (c ? "" : " disabled") + '>开战</button></div>';
        h += '<div class="center" style="margin-top:0"><button class="btn ghost sm" data-act="snow.lines"' + (pend ? " disabled" : "") + '>' + (pend ? "准备中" : (L ? "重新准备台词" : "让 TA 准备台词")) + '</button></div>' +
          '<p class="hint" style="text-align:center">' + (L ? "台词已备好，不会再花钱。" : "不准备台词也能开战，会用通用台词；准备一次要调用一次模型，之后永久缓存。") + '</p>';
        if (pend) h += ctx.wait(e(lineMsg || "正在准备台词，你可以先去别处逛逛"));
        return h;
      }

      return {
        destroy: clearAll,
        back: function () { if (game) leave(); return false; },
        view: function () { return ctx.page("Snowball Fight", "雪 仗", game ? arenaHtml() : setup()); },
        act: function (name, el0) {
          var c = ctx.curChar();
          if (name === "go") { if (!c) return roche.ui.toast("请先选一个对手"); return start(c); }
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
