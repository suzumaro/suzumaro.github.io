/**
 * main.js — suzuφathenaeum 共通スクリプト
 * 機能: ダークモード / 目次 / 記事検索 / サイト内全文検索 / トップへ戻る / ピクセルキャラ
 */

(function () {
    'use strict';

    // ==================
    // Dark Mode
    // ==================

    function initDarkMode() {
        var header = document.querySelector('header');
        if (!header) return;

        var btn = document.createElement('button');
        btn.id = 'dark-toggle';
        btn.setAttribute('aria-label', 'ダークモード切替');
        btn.textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';

        btn.addEventListener('click', function () {
            var nowDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', nowDark ? 'dark' : 'light');
            btn.textContent = nowDark ? '☀️' : '🌙';
        });

        header.appendChild(btn);
    }

    // ==================
    // Table of Contents
    // ==================

    function initTOC() {
        var container = document.getElementById('toc');
        if (!container) return;

        var headings = document.querySelectorAll('article h2');
        if (headings.length === 0) {
            container.style.display = 'none';
            return;
        }

        var details = document.createElement('details');
        var summary = document.createElement('summary');
        summary.textContent = '目次（' + headings.length + '件）';
        details.appendChild(summary);

        var ul = document.createElement('ul');
        headings.forEach(function (h, i) {
            var id = 'article-' + i;
            h.id = id;

            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = '#' + id;
            a.textContent = h.textContent;
            li.appendChild(a);

            // 日付を付記
            var next = h.nextElementSibling;
            if (next) {
                var m = next.textContent.match(/\d{4}\/\d{1,2}\/\d{1,2}/);
                if (m) {
                    var small = document.createElement('small');
                    small.textContent = '  ' + m[0];
                    li.appendChild(small);
                }
            }
            ul.appendChild(li);
        });

        details.appendChild(ul);
        container.appendChild(details);
    }

    // ==================
    // Article Search（ページ内）
    // ==================

    function initSearch() {
        var container = document.getElementById('search-box');
        if (!container) return;

        var articles = document.querySelectorAll('article');
        if (articles.length === 0) return;

        var input = document.createElement('input');
        input.type = 'search';
        input.id = 'search-input';
        input.placeholder = '記事タイトル・本文で絞り込み...';
        input.setAttribute('aria-label', '記事検索');

        var count = document.createElement('span');
        count.id = 'search-count';
        count.textContent = articles.length + '件';

        input.addEventListener('input', function () {
            var q = input.value.trim().toLowerCase();
            var visible = 0;
            articles.forEach(function (art) {
                var h2 = art.querySelector('h2');
                var title = h2 ? h2.textContent.toLowerCase() : '';
                var body = art.textContent.toLowerCase();
                var match = (q === '') || title.includes(q) || body.includes(q);
                art.style.display = match ? '' : 'none';
                if (match) visible++;
            });
            count.textContent = visible + '件';
        });

        container.appendChild(input);
        container.appendChild(count);
    }

    // ==================
    // Site-wide Search（ホーム用）
    // ==================

    function initSiteSearch() {
        var container = document.getElementById('site-search');
        if (!container) return;
        if (!window.SEARCH_INDEX || window.SEARCH_INDEX.length === 0) return;

        var input = document.createElement('input');
        input.type = 'search';
        input.id = 'site-search-input';
        input.placeholder = '全記事を検索（タイトル・本文）...';
        input.setAttribute('aria-label', 'サイト内検索');

        var meta = document.createElement('p');
        meta.id = 'site-search-meta';
        var total = window.SEARCH_INDEX.reduce(function(n, p){ return n + p.articles.length; }, 0);
        meta.textContent = total + '件の記事から検索';

        var results = document.createElement('div');
        results.id = 'site-search-results';

        input.addEventListener('input', function () {
            var q = input.value.trim().toLowerCase();
            results.innerHTML = '';
            if (q.length === 0) {
                meta.textContent = total + '件の記事から検索';
                return;
            }

            var matches = [];
            window.SEARCH_INDEX.forEach(function (page) {
                page.articles.forEach(function (art) {
                    if (art.title.toLowerCase().includes(q) || art.excerpt.toLowerCase().includes(q)) {
                        matches.push({
                            pageTitle: page.title,
                            url: page.url + (art.anchor || ''),
                            artTitle: art.title,
                            date: art.date,
                            excerpt: art.excerpt
                        });
                    }
                });
            });

            meta.textContent = matches.length + '件ヒット';

            if (matches.length === 0) {
                results.innerHTML = '<p class="search-no-result">「' + input.value + '」に一致する記事が見つかりませんでした</p>';
                return;
            }

            var ul = document.createElement('ul');
            ul.className = 'site-search-list';
            matches.slice(0, 30).forEach(function (m) {
                var li = document.createElement('li');
                var link = document.createElement('a');
                link.href = m.url;
                var tag = document.createElement('span');
                tag.className = 'sr-page';
                tag.textContent = m.pageTitle;
                var title = document.createElement('span');
                title.className = 'sr-title';
                title.textContent = m.artTitle;
                link.appendChild(tag);
                link.appendChild(document.createTextNode(' '));
                link.appendChild(title);
                var date = document.createElement('span');
                date.className = 'sr-date';
                date.textContent = m.date;
                var excerpt = document.createElement('p');
                excerpt.className = 'sr-excerpt';
                excerpt.textContent = m.excerpt ? m.excerpt.slice(0, 80) + '…' : '';
                li.appendChild(link);
                li.appendChild(date);
                li.appendChild(excerpt);
                ul.appendChild(li);
            });
            results.appendChild(ul);
        });

        container.appendChild(input);
        container.appendChild(meta);
        container.appendChild(results);
    }

    // ==================
    // Pixel Character（ホームマスコット）
    // ==================

    function initPixelChar() {
        var container = document.getElementById('pixel-char');
        if (!container) return;

        // ━━━━━━━━━━━━━━━━━━━━━━
        // 1% レアキャラ：ドラゴン
        // ━━━━━━━━━━━━━━━━━━━━━━
        if (Math.random() < 0.01) {
            var dragonPal = {
                1:  '#000000',  // 黒（アウトライン）
                7:  '#ffffff',  // 白（お腹）
                9:  '#cc0000',  // 赤（目）
                10: '#ff4444',  // 赤明（アクセント）
                30: '#6699ff',  // 水色（体）
            };
            var dragonGrid = [
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
                [0,1,1,1,1,1,7,7,1,1,1,1,1,1,0,0],
            ];
            var dPx = 8, dCols = 16, dRows = 16;
            var dCanvas = document.createElement('canvas');
            dCanvas.width  = dCols * dPx;
            dCanvas.height = dRows * dPx;
            dCanvas.className = 'dragon-canvas';
            dCanvas.title = '？？？（レアキャラ）';
            var dCtx = dCanvas.getContext('2d');
            dCtx.imageSmoothingEnabled = false;
            for (var dr = 0; dr < dRows; dr++) {
                for (var dc = 0; dc < dCols; dc++) {
                    var dIdx = dragonGrid[dr][dc];
                    if (!dIdx) continue;
                    dCtx.fillStyle = dragonPal[dIdx] || '#ff00ff';
                    dCtx.fillRect(dc * dPx, dr * dPx, dPx, dPx);
                }
            }
            var dInfo = document.createElement('p');
            dInfo.className = 'pixel-info';
            dInfo.textContent = '？？？　レアキャラ出現！　（確率 1/100）';
            container.appendChild(dCanvas);
            container.appendChild(dInfo);
            return; // フクロウは描画しない
        }

        // 更新回数（YYYY/M/D 形式の日付を数える）
        var updates = 0;
        var content = document.querySelector('.content, main.content, main');
        if (content) {
            var dates = content.textContent.match(/20\d\d\/\d{1,2}\/\d{1,2}/g);
            updates = dates ? dates.length : 0;
        }

        // 成長レベル（1〜5）
        var level;
        if      (updates >= 25) level = 5;
        else if (updates >= 15) level = 4;
        else if (updates >= 8)  level = 3;
        else if (updates >= 3)  level = 2;
        else                    level = 1;

        // 時間帯バリエーション（おやすみのみ）
        var hour = new Date().getHours();
        var variant = (hour < 6 || hour >= 23) ? 'sleep' : 'normal';

        var PIXEL = 8, COLS = 10, ROWS = 12;

        // カラーパレット
        var palette = [
            null,       // 0: 透明
            '#f5e6c8',  // 1: クリーム（体）
            '#3d2b1f',  // 2: こげ茶（目）
            '#f0c040',  // 3: 黄色（くちばし）
            '#8b6914',  // 4: 茶色（羽・耳）
            '#ffffff',  // 5: 白（目のハイライト）
            '#d4621a',  // 6: オレンジ（足）
            '#f0d080',  // 7: 卵の色
            '#a0b8e8',  // 8: 水色（Zzz）
            '#e8c060',  // 9: 暖色（食べ物・本）
            '#c8a87a',  // 10: 薄茶（フェイシャルディスク）
        ];

        // 成長ステージ（通常時・10×12グリッド）
        var stages = [
            // Lv.1 たまご
            [
                [0,0,0,7,7,7,7,0,0,0],
                [0,0,7,7,7,7,7,7,0,0],
                [0,7,7,5,7,7,7,7,7,0],
                [0,7,7,7,7,7,7,7,7,0],
                [7,7,7,7,7,7,7,7,7,7],
                [7,7,7,7,7,7,7,7,7,7],
                [7,7,7,7,7,7,7,7,7,7],
                [7,7,7,7,7,7,7,7,7,7],
                [0,7,7,7,7,7,7,7,7,0],
                [0,7,7,7,7,7,7,7,7,0],
                [0,0,7,7,7,7,7,7,0,0],
                [0,0,0,7,7,7,7,0,0,0],
            ],
            // Lv.2 ひびわれたまご
            [
                [0,0,0,7,7,7,7,0,0,0],
                [0,0,7,7,2,7,7,7,0,0],
                [0,7,7,2,2,7,7,7,7,0],
                [0,7,7,7,2,7,7,7,7,0],
                [7,7,7,7,7,7,7,7,7,7],
                [7,7,7,7,7,7,7,7,7,7],
                [7,7,7,7,7,7,7,7,7,7],
                [7,7,7,7,7,7,7,7,7,7],
                [0,7,7,7,7,7,7,7,7,0],
                [0,7,7,7,7,7,7,7,7,0],
                [0,0,7,7,7,7,7,7,0,0],
                [0,0,0,7,7,7,7,0,0,0],
            ],
            // Lv.3 ふくろうのひな（卵から頭が出る）
            [
                [0,0,1,4,1,1,4,1,0,0],
                [0,0,1,2,1,1,2,1,0,0],
                [0,0,1,1,3,3,1,1,0,0],
                [0,0,1,1,1,1,1,1,0,0],
                [0,0,7,7,2,2,7,7,0,0],
                [0,7,7,7,7,7,7,7,7,0],
                [7,7,7,7,7,7,7,7,7,7],
                [7,7,7,7,7,7,7,7,7,7],
                [0,7,7,7,7,7,7,7,7,0],
                [0,0,7,7,7,7,7,7,0,0],
                [0,0,0,7,7,7,7,0,0,0],
                [0,0,0,0,0,0,0,0,0,0],
            ],
            // Lv.4 こふくろう
            [
                [0,0,4,4,1,1,4,4,0,0],
                [0,0,4,1,1,1,1,4,0,0],
                [0,1,10,10,10,10,10,10,1,0],
                [0,10,5,2,10,10,5,2,10,0],
                [0,10,2,2,10,10,2,2,10,0],
                [0,10,10,10,3,3,10,10,10,0],
                [0,4,10,10,10,10,10,10,4,0],
                [0,4,4,1,1,1,1,4,4,0],
                [0,0,4,4,1,1,4,4,0,0],
                [0,0,1,6,1,1,6,1,0,0],
                [0,0,6,6,0,0,6,6,0,0],
                [0,0,0,0,0,0,0,0,0,0],
            ],
            // Lv.5 ふくろう（成体・翼全開）
            [
                [0,0,4,4,1,1,4,4,0,0],
                [0,0,4,1,1,1,1,4,0,0],
                [0,1,10,10,10,10,10,10,1,0],
                [0,10,5,2,10,10,5,2,10,0],
                [0,10,2,2,10,10,2,2,10,0],
                [0,10,10,10,3,3,10,10,10,0],
                [4,4,10,10,10,10,10,10,4,4],
                [4,4,4,1,1,1,1,4,4,4],
                [0,4,4,1,1,1,1,4,4,0],
                [0,0,1,6,1,1,6,1,0,0],
                [0,0,6,6,0,0,6,6,0,0],
                [0,0,4,4,4,4,4,4,0,0],
            ],
        ];

        // おやすみバリエーション（(-_-)zzZ）レベル別
        // Lv.1/2（たまご）はおやすみなし
        var sleepGrids = {
            3: [
                [0,0,0,0,0,0,8,8,8,0],
                [0,0,0,0,0,8,0,0,0,0],
                [0,0,0,0,8,8,8,0,0,0],
                [0,0,1,4,1,1,4,1,0,0],
                [0,0,1,2,2,1,2,2,0,0],
                [0,0,1,1,3,3,1,1,0,0],
                [0,0,7,7,1,1,7,7,0,0],
                [0,7,7,7,7,7,7,7,7,0],
                [7,7,7,7,7,7,7,7,7,7],
                [7,7,7,7,7,7,7,7,7,7],
                [0,7,7,7,7,7,7,7,7,0],
                [0,0,7,7,7,7,7,7,0,0],
            ],
            4: [
                [0,0,0,0,0,0,8,8,8,0],
                [0,0,0,0,0,8,0,0,0,0],
                [0,0,0,0,8,8,8,0,0,0],
                [0,0,4,4,1,1,4,4,0,0],
                [0,1,10,10,10,10,10,10,1,0],
                [0,10,2,2,10,10,2,2,10,0],
                [0,10,10,10,3,3,10,10,10,0],
                [0,4,10,10,10,10,10,10,4,0],
                [0,4,4,1,1,1,1,4,4,0],
                [0,0,1,6,1,1,6,1,0,0],
                [0,0,6,6,0,0,6,6,0,0],
                [0,0,0,0,0,0,0,0,0,0],
            ],
            5: [
                [0,0,0,0,0,0,8,8,8,0],
                [0,0,0,0,0,8,0,0,0,0],
                [0,0,4,4,1,1,4,4,0,0],
                [0,0,4,1,1,1,1,4,0,0],
                [0,1,10,10,10,10,10,10,1,0],
                [0,10,2,2,10,10,2,2,10,0],
                [0,10,10,10,3,3,10,10,10,0],
                [4,4,10,10,10,10,10,10,4,4],
                [4,4,4,1,1,1,1,4,4,4],
                [0,4,4,1,1,1,1,4,4,0],
                [0,0,1,6,1,1,6,1,0,0],
                [0,0,6,6,0,0,6,6,0,0],
            ],
        };

        var variantLabels = {
            sleep: 'おやすみ中',
        };

        var stageNames = ['たまご', 'ひびわれたまご', 'ふくろうのひな', 'こふくろう', 'ふくろう'];
        var nextAt     = [3, 8, 15, 25, null];

        // グリッド選択（Lv.1/2はおやすみなし → 通常の卵を表示）
        var grid;
        if (variant === 'sleep' && level >= 3 && sleepGrids[level]) {
            grid = sleepGrids[level];
        } else {
            grid = stages[level - 1];
            if (variant === 'sleep') variant = 'normal';
        }

        var canvas = document.createElement('canvas');
        canvas.width  = COLS * PIXEL;
        canvas.height = ROWS * PIXEL;
        canvas.className = 'owl-canvas';
        canvas.title  = 'Lv.' + level + ' ' + stageNames[level - 1];

        var ctx = canvas.getContext('2d');
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                var ci = grid[r][c];
                if (ci === 0) continue;
                ctx.fillStyle = palette[ci];
                ctx.fillRect(c * PIXEL, r * PIXEL, PIXEL, PIXEL);
            }
        }

        var info = document.createElement('p');
        info.className = 'pixel-info';
        var next = nextAt[level - 1];
        var nextText = next ? '　次の進化まであと ' + (next - updates) + ' 回' : '　最終形態';
        var vLabel = variantLabels[variant] ? '　' + variantLabels[variant] : '';
        info.textContent = 'Lv.' + level + '　' + stageNames[level - 1] + vLabel + '　（更新 ' + updates + ' 回）' + nextText;

        container.appendChild(canvas);
        container.appendChild(info);
    }

    // ==================
    // Back to Top
    // ==================

    function initBackToTop() {
        var btn = document.createElement('button');
        btn.id = 'back-to-top';
        btn.textContent = '▲';
        btn.setAttribute('aria-label', 'ページ上部へ戻る');
        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        document.body.appendChild(btn);

        window.addEventListener('scroll', function () {
            btn.style.display = window.scrollY > 300 ? 'block' : 'none';
        }, { passive: true });
    }

    // ==================
    // Init
    // ==================

    function init() {
        initDarkMode();
        initTOC();
        initSearch();
        initSiteSearch();
        initBackToTop();
        initPixelChar();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

}());
