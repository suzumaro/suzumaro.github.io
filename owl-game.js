/* =========================================================
 * OWL KEEPER — トップページ育成ゲーム
 * ・状態は全訪問者で共有(Firebase Realtime Database / REST)
 *   owl-config.js の OWL_DB_URL 未設定時はローカルモードで動作
 * ・進化はサイトの成長(更新回数)と日数の複合
 * ・4日間誰も訪れないと星になる / 23時〜6時は睡眠
 *
 * [次回変更の検討候補]
 * ・進化分岐を増やす(例: お世話量/更新ペース/訪問時間帯で成鳥の亜種分岐)
 * ・寿命(ADULT_LIFE_DAYS=14)の延長、または天寿制の廃止
 * ========================================================= */
(function () {
    'use strict';

    var MS_DAY = 86400000;
    var DEATH_DAYS = 4;        // 誰も来ないと星になる日数
    var ADULT_LIFE_DAYS = 14;  // 最終形態の寿命(天寿を全うして星になる)
    var UPDATE_BOOST = 0.5;    // サイト更新1回 = 成長+0.5日ぶん
    var RARE_RATE = 0.10;      // レア卵の確率
    var TH = { chick: 1, juvenile: 3, final: 6 }; // 進化しきい値(実効日数)

    /* ---------------- ドット絵(main.jsのマスコットを引用) ---------------- */
    var PALETTE = [
        null, '#f5e6c8', '#3d2b1f', '#f0c040', '#8b6914', '#ffffff',
        '#d4621a', '#f0d080', '#a0b8e8', '#e8c060', '#c8a87a'
    ];
    var GRID_EGG = [
        [0,0,0,7,7,7,7,0,0,0],[0,0,7,7,7,7,7,7,0,0],[0,7,7,5,7,7,7,7,7,0],
        [0,7,7,7,7,7,7,7,7,0],[7,7,7,7,7,7,7,7,7,7],[7,7,7,7,7,7,7,7,7,7],
        [7,7,7,7,7,7,7,7,7,7],[7,7,7,7,7,7,7,7,7,7],[0,7,7,7,7,7,7,7,7,0],
        [0,7,7,7,7,7,7,7,7,0],[0,0,7,7,7,7,7,7,0,0],[0,0,0,7,7,7,7,0,0,0]
    ];
    var GRID_EGG_CRACK = [
        [0,0,0,7,7,7,7,0,0,0],[0,0,7,7,2,7,7,7,0,0],[0,7,7,2,2,7,7,7,7,0],
        [0,7,7,7,2,7,7,7,7,0],[7,7,7,7,7,7,7,7,7,7],[7,7,7,7,7,7,7,7,7,7],
        [7,7,7,7,7,7,7,7,7,7],[7,7,7,7,7,7,7,7,7,7],[0,7,7,7,7,7,7,7,7,0],
        [0,7,7,7,7,7,7,7,7,0],[0,0,7,7,7,7,7,7,0,0],[0,0,0,7,7,7,7,0,0,0]
    ];
    var GRID_CHICK = [
        [0,0,1,4,1,1,4,1,0,0],[0,0,1,2,1,1,2,1,0,0],[0,0,1,1,3,3,1,1,0,0],
        [0,0,1,1,1,1,1,1,0,0],[0,0,7,7,2,2,7,7,0,0],[0,7,7,7,7,7,7,7,7,0],
        [7,7,7,7,7,7,7,7,7,7],[7,7,7,7,7,7,7,7,7,7],[0,7,7,7,7,7,7,7,7,0],
        [0,0,7,7,7,7,7,7,0,0],[0,0,0,7,7,7,7,0,0,0],[0,0,0,0,0,0,0,0,0,0]
    ];
    var GRID_JUVENILE = [
        [0,0,4,4,1,1,4,4,0,0],[0,0,4,1,1,1,1,4,0,0],[0,1,10,10,10,10,10,10,1,0],
        [0,10,5,2,10,10,5,2,10,0],[0,10,2,2,10,10,2,2,10,0],[0,10,10,10,3,3,10,10,10,0],
        [0,4,10,10,10,10,10,10,4,0],[0,4,4,1,1,1,1,4,4,0],[0,0,4,4,1,1,4,4,0,0],
        [0,0,1,6,1,1,6,1,0,0],[0,0,6,6,0,0,6,6,0,0],[0,0,0,0,0,0,0,0,0,0]
    ];
    var GRID_ADULT = [
        [0,0,4,4,1,1,4,4,0,0],[0,0,4,1,1,1,1,4,0,0],[0,1,10,10,10,10,10,10,1,0],
        [0,10,5,2,10,10,5,2,10,0],[0,10,2,2,10,10,2,2,10,0],[0,10,10,10,3,3,10,10,10,0],
        [4,4,10,10,10,10,10,10,4,4],[4,4,4,1,1,1,1,4,4,4],[0,4,4,1,1,1,1,4,4,0],
        [0,0,1,6,1,1,6,1,0,0],[0,0,6,6,0,0,6,6,0,0],[0,0,4,4,4,4,4,4,0,0]
    ];
    var SLEEP_GRIDS = {
        chick: [
            [0,0,0,0,0,0,8,8,8,0],[0,0,0,0,0,8,0,0,0,0],[0,0,0,0,8,8,8,0,0,0],
            [0,0,1,4,1,1,4,1,0,0],[0,0,1,2,2,1,2,2,0,0],[0,0,1,1,3,3,1,1,0,0],
            [0,0,7,7,1,1,7,7,0,0],[0,7,7,7,7,7,7,7,7,0],[7,7,7,7,7,7,7,7,7,7],
            [7,7,7,7,7,7,7,7,7,7],[0,7,7,7,7,7,7,7,7,0],[0,0,7,7,7,7,7,7,0,0]
        ],
        juvenile: [
            [0,0,0,0,0,0,8,8,8,0],[0,0,0,0,0,8,0,0,0,0],[0,0,0,0,8,8,8,0,0,0],
            [0,0,4,4,1,1,4,4,0,0],[0,1,10,10,10,10,10,10,1,0],[0,10,2,2,10,10,2,2,10,0],
            [0,10,10,10,3,3,10,10,10,0],[0,4,10,10,10,10,10,10,4,0],[0,4,4,1,1,1,1,4,4,0],
            [0,0,1,6,1,1,6,1,0,0],[0,0,6,6,0,0,6,6,0,0],[0,0,0,0,0,0,0,0,0,0]
        ],
        adult: [
            [0,0,0,0,0,0,8,8,8,0],[0,0,0,0,0,8,0,0,0,0],[0,0,4,4,1,1,4,4,0,0],
            [0,0,4,1,1,1,1,4,0,0],[0,1,10,10,10,10,10,10,1,0],[0,10,2,2,10,10,2,2,10,0],
            [0,10,10,10,3,3,10,10,10,0],[4,4,10,10,10,10,10,10,4,4],[4,4,4,1,1,1,1,4,4,4],
            [0,4,4,1,1,1,1,4,4,0],[0,0,1,6,1,1,6,1,0,0],[0,0,6,6,0,0,6,6,0,0]
        ]
    };
    /* ドラゴン(1%レアキャラを最終分岐として引用) */
    var DRAGON_PAL = { 1:'#000000', 7:'#ffffff', 9:'#cc0000', 10:'#ff4444', 30:'#6699ff' };
    var GRID_DRAGON = [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,1,1,1,1,0,0,1,0,0,0,0],
        [0,0,0,0,1,30,30,30,30,1,1,30,1,0,0,0],
        [0,0,1,1,30,30,1,1,7,30,30,30,30,1,0,0],
        [0,1,30,30,30,1,1,7,7,7,1,7,1,30,1,0],
        [0,1,30,30,30,1,1,1,7,7,7,1,0,1,10,0],
        [0,0,1,1,1,7,7,7,7,7,1,7,7,0,0,0],
        [0,0,1,7,7,7,7,7,7,7,7,1,30,1,0,0],
        [0,0,0,1,1,1,7,7,1,1,1,0,1,30,1,0],
        [0,0,0,0,1,7,7,7,7,7,1,1,30,30,30,1],
        [0,0,1,1,30,30,7,7,1,7,1,30,0,1,30,1],
        [0,1,30,1,7,7,7,7,1,1,30,1,1,0,30,1],
        [0,1,30,1,30,30,7,1,30,30,1,1,1,0,1,0],
        [0,0,1,1,1,7,7,1,30,30,1,1,0,0,0,0],
        [0,1,30,1,30,1,1,1,1,1,30,1,30,1,0,0],
        [0,1,1,1,1,1,7,7,1,1,1,1,1,1,0,0]
    ];

    var STAGE_NAMES = {
        egg: 'たまご', chick: 'ふくろうのひな', juvenile: 'こふくろう',
        adult: 'ふくろう', dragon: '？？？(ドラゴン)'
    };

    /* ---------------- サイト成長の計測 ---------------- */
    function countUpdates() {
        var content = document.querySelector('.content, main.content, main');
        if (!content) return 0;
        var dates = content.textContent.match(/20\d\d\/\d{1,2}\/\d{1,2}/g);
        return dates ? dates.length : 0;
    }

    /* ---------------- 共有ストレージ(Firebase REST / ローカル) ---------------- */
    var DB_URL = (typeof window.OWL_DB_URL === 'string' && window.OWL_DB_URL.indexOf('http') === 0)
        ? window.OWL_DB_URL.replace(/\/?$/, '') + '/owl.json'
        : null;
    var localMode = !DB_URL;
    var LS_KEY = 'owlKeeperState';

    function loadState() {
        if (localMode) {
            try {
                var s = localStorage.getItem(LS_KEY);
                return Promise.resolve(s ? JSON.parse(s) : null);
            } catch (e) { return Promise.resolve(null); }
        }
        return fetch(DB_URL).then(function (r) {
            if (!r.ok) throw new Error('db');
            return r.json();
        }).catch(function () {
            localMode = true;
            return loadState();
        });
    }
    function saveState(st) {
        if (localMode) {
            try { localStorage.setItem(LS_KEY, JSON.stringify(st)); } catch (e) {}
            return Promise.resolve();
        }
        return fetch(DB_URL, { method: 'PUT', body: JSON.stringify(st) })
            .catch(function () {});
    }
    function patchState(obj) {
        if (localMode) {
            try {
                var s = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
                for (var k in obj) s[k] = obj[k];
                localStorage.setItem(LS_KEY, JSON.stringify(s));
            } catch (e) {}
            return Promise.resolve();
        }
        return fetch(DB_URL, { method: 'PATCH', body: JSON.stringify(obj) })
            .catch(function () {});
    }

    /* ---------------- 状態モデル ---------------- */
    function newEgg(gen, stars) {
        return {
            gen: gen,
            born: Date.now(),
            updatesAtBirth: countUpdates(),
            lastVisit: Date.now(),
            care: 0,
            rare: Math.random() < RARE_RATE,
            finalForm: null,
            stars: stars || []
        };
    }

    function effectiveDays(st, now) {
        var real = (now - st.born) / MS_DAY;
        var growth = Math.max(0, countUpdates() - (st.updatesAtBirth || 0));
        return real + growth * UPDATE_BOOST;
    }
    function stageOf(st, now) {
        var d = effectiveDays(st, now);
        if (d < TH.chick) return 'egg';
        if (d < TH.juvenile) return 'chick';
        if (d < TH.final) return 'juvenile';
        return st.finalForm || 'adult';
    }
    function isAsleep() {
        var h = new Date().getHours();
        return h >= 23 || h < 6;
    }
    function dragonChance(st) {
        if (st.rare) return 0.9;
        var growth = Math.max(0, countUpdates() - (st.updatesAtBirth || 0));
        var c = 0.05 + growth * 0.05 + (st.care || 0) * 0.01;
        return Math.min(0.45, c);
    }

    /* ---------------- UI ---------------- */
    var css = [
        '#owl-game { margin: 1.2em 0; }',
        '.og-card { max-width: 340px; border-radius: 14px; padding: 2px;',
        '  background: linear-gradient(135deg,#9db8d6,#e3ecf5 30%,#7c9cc0 60%,#c8d6e6);',
        '  box-shadow: 0 4px 16px var(--shadow); }',
        '.og-inner { background: var(--content-bg); border-radius: 12px; padding: 14px 16px 12px; }',
        '.og-head { display:flex; justify-content:space-between; align-items:baseline;',
        '  font-size:11px; letter-spacing:2px; color:#7c9cc0; }',
        '.og-head b { font-weight:normal; color: var(--color); opacity:.7; letter-spacing:0; }',
        '.og-sky { min-height:16px; font-size:12px; letter-spacing:4px; color:#8aa8cc;',
        '  text-align:right; text-shadow:0 0 6px rgba(140,170,220,.8); cursor:default; }',
        '.og-cv-wrap { display:flex; justify-content:center; padding:6px 0 2px; }',
        '.og-cv-wrap canvas { image-rendering: pixelated; cursor:pointer; }',
        '.og-status { display:flex; justify-content:space-between; font-size:12px;',
        '  color:var(--color); opacity:.85; margin-top:4px; }',
        '.og-bar { height:6px; margin-top:6px; border-radius:3px; overflow:hidden;',
        '  background: var(--border);',
        '  background: color-mix(in srgb, var(--border) 60%, transparent); }',
        '.og-bar i { display:block; height:100%; border-radius:3px; transition:width .5s;',
        '  background: linear-gradient(90deg,#7c9cc0,#c8d6e6,#7c9cc0); }',
        '.og-msg { font-size:12px; line-height:1.5; min-height:2.9em; margin-top:8px;',
        '  color:var(--color); opacity:.9; }',
        '.og-btns { display:flex; gap:10px; margin-top:8px; }',
        '.og-btns button { flex:1; padding:7px 0; font-size:12px; cursor:pointer;',
        '  border:1px solid #9db8d6; border-radius:8px; color:var(--color);',
        '  background: var(--content-bg);',
        '  background: linear-gradient(180deg, color-mix(in srgb,#c8d6e6 25%,var(--content-bg)), var(--content-bg));',
        '  transition: filter .15s; }',
        '.og-btns button:hover { filter: brightness(1.08); }',
        '.og-btns button:disabled { opacity:.4; cursor:default; }',
        '.og-foot { font-size:10px; margin-top:8px; color:var(--color); opacity:.45;',
        '  display:flex; justify-content:space-between; }',
        '@keyframes og-flash { 50% { opacity:.15; } }',
        '.og-evolving canvas { animation: og-flash .3s 7; }',
        '@media print { #owl-game { display:none; } }'
    ].join('\n');

    var state = null;
    var justDied = null;   // {gen, stage}
    var frame = 0;
    var evolving = false;
    var cvW = 176, cvH = 152;
    var el = {};

    function buildUI(container) {
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);

        container.innerHTML =
            '<div class="og-card"><div class="og-inner">' +
            '<div class="og-head"><span>OWL KEEPER</span><b id="og-gen"></b></div>' +
            '<div class="og-sky" id="og-sky" title=""></div>' +
            '<div class="og-cv-wrap"><canvas id="og-cv" width="' + cvW + '" height="' + cvH + '"></canvas></div>' +
            '<div class="og-status"><span id="og-stage"></span><span id="og-age"></span></div>' +
            '<div class="og-bar"><i id="og-prog"></i></div>' +
            '<div class="og-msg" id="og-msg"></div>' +
            '<div class="og-btns">' +
            '<button id="og-feed">ごはん</button>' +
            '<button id="og-pet">なでる</button>' +
            '</div>' +
            '<div class="og-foot"><span id="og-care"></span><span id="og-mode"></span></div>' +
            '</div></div>';

        ['og-gen','og-sky','og-cv','og-stage','og-age','og-prog','og-msg','og-feed','og-pet','og-care','og-mode']
            .forEach(function (id) { el[id] = document.getElementById(id); });
    }

    /* ---------------- 描画 ---------------- */
    function drawGrid(ctx, grid, pal, px, ox, oy) {
        for (var r = 0; r < grid.length; r++) {
            for (var c = 0; c < grid[r].length; c++) {
                var i = grid[r][c];
                if (!i) continue;
                ctx.fillStyle = pal[i] || '#f0f';
                ctx.fillRect(ox + c * px, oy + r * px, px, px);
            }
        }
    }
    function drawZzz(ctx) {
        ctx.fillStyle = '#a0b8e8';
        var px = 6;
        [[24,2],[26,2],[28,2],[26,4],[24,6],[26,6],[28,6]].forEach(function (p) {
            ctx.fillRect(p[0] * px / 2 + 60, p[1] * px / 2, px, px);
        });
    }
    function render() {
        var cv = el['og-cv'], ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cvW, cvH);
        if (!state) return;
        var now = Date.now();
        var stage = stageOf(state, now);
        var bounce = frame % 2 ? 2 : 0;

        if (stage === 'dragon') {
            var px = 9, w = 16 * px;
            drawGrid(ctx, GRID_DRAGON, DRAGON_PAL, px, (cvW - w) / 2, (cvH - 16 * px) / 2 + bounce);
            if (isAsleep()) drawZzz(ctx);
            return;
        }
        var grid;
        if (stage === 'egg') {
            var d = effectiveDays(state, now);
            grid = (d > TH.chick * 0.7) ? GRID_EGG_CRACK : GRID_EGG;
            var wob = frame % 2 ? 1 : -1;
            drawGrid(ctx, grid, PALETTE, 11, (cvW - 110) / 2 + wob, (cvH - 132) / 2);
            return;
        }
        if (isAsleep() && SLEEP_GRIDS[stage]) grid = SLEEP_GRIDS[stage];
        else grid = { chick: GRID_CHICK, juvenile: GRID_JUVENILE, adult: GRID_ADULT }[stage];
        drawGrid(ctx, grid, PALETTE, 11, (cvW - 110) / 2, (cvH - 132) / 2 + (isAsleep() ? 0 : bounce));
    }

    /* ---------------- メッセージ ---------------- */
    var tempMsg = null, tempTimer = null;
    function say(text, sec) {
        tempMsg = text;
        if (tempTimer) clearTimeout(tempTimer);
        tempTimer = setTimeout(function () { tempMsg = null; updateUI(); }, (sec || 4) * 1000);
        updateUI();
    }
    function statusMsg() {
        var now = Date.now();
        var stage = stageOf(state, now);
        if (justDied) {
            return justDied.gen + '代目の' + justDied.stage + 'は、しばらく誰も来なかったので星になりました…。' +
                '空に★がひとつ増えています。あたらしい たまごが届きました。';
        }
        if (isAsleep() && stage !== 'egg') return 'すやすや…おやすみ中(23時〜6時)。そっとしておこう。';
        var d = effectiveDays(state, now);
        if (stage === 'egg') return 'たまごをあたため中… サイトが更新されると早くかえるらしい。';
        if (stage === 'chick') return 'ひなが うまれた!(進化まで実効' + (TH.juvenile - d).toFixed(1) + '日。サイト更新1回で半日ぶん成長)';
        if (stage === 'juvenile') return 'すくすく成長中。(進化まで実効' + (TH.final - d).toFixed(1) + '日。ごはんとサイト更新がレア分岐率を上げる…?)';
        if (stage === 'dragon') return 'な、なんと…ドラゴンに分岐した!! でんせつのレア進化!(' + ADULT_LIFE_DAYS + '日みんなと過ごすと星になる)';
        return 'りっぱなふくろうに成長した。(' + ADULT_LIFE_DAYS + '日みんなと過ごすと、天寿を全うして星になる)';
    }

    /* ---------------- UI更新 ---------------- */
    function updateUI() {
        if (!state) return;
        var now = Date.now();
        var stage = stageOf(state, now);
        var d = effectiveDays(state, now);

        el['og-gen'].textContent = state.gen + '代目' + (state.rare && stage === 'egg' ? ' ✧' : '');
        el['og-stage'].textContent = STAGE_NAMES[stage] + (isAsleep() && stage !== 'egg' ? ' (おやすみ中)' : '');
        el['og-age'].textContent = '生後' + Math.floor((now - state.born) / MS_DAY) + '日';

        var prog = Math.min(1, d / TH.final) * 100;
        el['og-prog'].style.width = prog + '%';

        var stars = (state.stars || []);
        el['og-sky'].textContent = stars.map(function () { return '★'; }).join(' ');
        el['og-sky'].title = stars.map(function (s) {
            return s.gen + '代目 ' + s.stage;
        }).join(' / ') || '';

        el['og-msg'].textContent = tempMsg || statusMsg();
        el['og-care'].textContent = 'みんなのごはん ' + (state.care || 0) + '回';
        el['og-mode'].textContent = localMode ? 'ローカルモード(共有DB未設定)' : 'みんなで育成中';

        el['og-feed'].disabled = stage === 'egg' || isAsleep() || evolving;
        el['og-pet'].disabled = stage === 'egg' || evolving;
    }

    /* ---------------- 進化チェック ---------------- */
    function lastStageKey() { return 'owlStageSeen_g' + state.gen; }
    function checkTransitions() {
        var now = Date.now();
        var stage = stageOf(state, now);

        // 最終形態の分岐ロール(未決定なら最初に気づいた訪問者が確定させる)
        if (!state.finalForm && effectiveDays(state, now) >= TH.final) {
            state.finalForm = (Math.random() < dragonChance(state)) ? 'dragon' : 'adult';
            patchState({ finalForm: state.finalForm });
            stage = state.finalForm;
        }

        // 天寿(最終形態のまま一定日数)→星になり次世代へ
        if ((stage === 'adult' || stage === 'dragon')) {
            var finalDays = effectiveDays(state, now) - TH.final;
            if (finalDays > ADULT_LIFE_DAYS) {
                var stars = (state.stars || []).concat([{ gen: state.gen, stage: STAGE_NAMES[stage] }]);
                state = newEgg(state.gen + 1, stars);
                saveState(state);
                say('天寿を全うして星になりました。空をみてごらん。そして…あたらしい たまごが届きました。', 12);
                return;
            }
        }

        // この訪問者が進化の瞬間を見たか
        var seen = null;
        try { seen = localStorage.getItem(lastStageKey()); } catch (e) {}
        if (seen && seen !== stage && !evolving) {
            evolving = true;
            var card = document.querySelector('#owl-game .og-card');
            if (card) card.classList.add('og-evolving');
            say('……なにかが おこっている!?', 2.5);
            setTimeout(function () {
                if (card) card.classList.remove('og-evolving');
                evolving = false;
                say(STAGE_NAMES[stage] + ' に進化した!', 6);
                updateUI();
            }, 2300);
        }
        try { localStorage.setItem(lastStageKey(), stage); } catch (e) {}
    }

    /* ---------------- 操作 ---------------- */
    function bindEvents() {
        el['og-feed'].addEventListener('click', function () {
            if (el['og-feed'].disabled) return;
            state.care = (state.care || 0) + 1;
            patchState({ care: state.care });
            var eats = ['もぐもぐ…おいしそうに食べた!', 'ぱくっ! ごきげんだ', 'もしゃもしゃ…まだ食べたそうだ'];
            say(eats[Math.floor(Math.random() * eats.length)]);
        });
        el['og-pet'].addEventListener('click', function () {
            var msgs = ['ほう…と嬉しそうに鳴いた', 'ふわふわだ', '目を細めている', 'くるっと首をかしげた'];
            say(msgs[Math.floor(Math.random() * msgs.length)], 3);
        });
        el['og-cv'].addEventListener('click', function () {
            var stage = stageOf(state, Date.now());
            if (stage === 'egg') say('コンコン…たまごが ぴくっと動いた!', 3);
            else if (isAsleep()) say('…おきないみたい。', 3);
            else say('こちらを じっと見ている。', 3);
        });
    }

    /* ---------------- 初期化 ---------------- */
    function init() {
        var container = document.getElementById('owl-game');
        if (!container) return;
        buildUI(container);
        bindEvents();

        loadState().then(function (st) {
            var now = Date.now();
            if (!st || !st.born) {
                st = newEgg(1, []);
                saveState(st);
            } else if (now - (st.lastVisit || now) > DEATH_DAYS * MS_DAY) {
                // 誰も来なかった → 星になる
                var deadStage = STAGE_NAMES[stageOf(st, st.lastVisit)] || 'たまご';
                justDied = { gen: st.gen, stage: deadStage };
                var stars = (st.stars || []).concat([{ gen: st.gen, stage: deadStage }]);
                st = newEgg(st.gen + 1, stars);
                saveState(st);
                setTimeout(function () { justDied = null; updateUI(); }, 20000);
            } else {
                st.lastVisit = now;
                patchState({ lastVisit: now });
            }
            state = st;
            updateUI();
            render();
            checkTransitions();

            setInterval(function () { frame++; render(); }, 600);
            setInterval(function () { checkTransitions(); updateUI(); }, 5000);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}());
