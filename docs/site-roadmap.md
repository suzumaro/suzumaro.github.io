# suzuφathenaeum 機能追加ロードマップ

`docs/site-audit.md` の「4. 静的サイトの方針に沿った機能候補」を実装するための手順書です。後で Opus 5.5 が実装する前提で、対象ファイルと完了条件を明記しています。

## 共通ルール（全タスク）

- **方針**：公開されるのは静的ファイルだけにする。JavaScript とビルド工程は、必要性が明確な場合だけ追加する。生成スクリプトを使う場合も「手元で実行 → 生成された静的ファイルをコミット」の形にし、GitHub Pages 側でビルドはさせない。
- **公開ブランチ**：`main` / ルート。作業はブランチで行い、`main` へのマージはユーザーの確認後にする。
- **サイト URL**：`https://suzumaro.github.io/`（ユーザーサイト。パスの接頭辞なし）。
- **ページの共通構造**（全ページで同じ）：
  - `<head>` の中に `<meta charset>`、`<meta name="viewport">`、`<title>`、`<link rel="stylesheet" href="(相対パス)/style.css">`、ダークモード初期化の1行 `<script>` が入っている。
  - 本文は `<header><h1>…</h1><nav>…</nav></header>` → `<main>` → `<footer>`。
  - 記事は `<article><h2>タイトル</h2><p>YYYY/M/D<br>本文…</p></article>`。日付は h2 の直後の要素の先頭にある（`main.js` の目次機能も同じ前提で日付を拾っている）。
  - `body` の最後の `<script>` が `style.css` のパスから `main.js` を読み込む。
- **例外ページ**：`studies/topics/evernote/index.html` は Evernote の書き出しのままで、共通構造に従っていない（style.css なし、h1 が多数）。一括処理では除外するか、個別に対応する。
- **完了確認**：`python3 -m pip install html5lib` のうえで、全 HTML の構文エラーが増えていないことを確認する（監査時点の残りは、URL 中の裸の `&` による `expected-named-entity` 警告のみ）。

---

## R1. meta description / OGP / title へのサイト名追加 — 優先度：高

**目的**：検索結果の説明文と、SNS・LINE に URL を貼ったときのカード表示を整える。

**対象ファイル**
- 全 HTML（67ファイル。`studies/topics/evernote/index.html` は title のみ）
- 新規：`tools/add_meta.py`（一括挿入スクリプト。1回使い切りでよい）
- 新規（任意）：`ogp.png`（1200×630。用意できない場合は og:image を省略）

**手順**
1. `tools/add_meta.py` を作る。各 HTML について：
   - `<title>X</title>` を `<title>X｜suzuφathenaeum</title>` にする（トップの `index.html` は `suzuφathenaeum` のまま）。
   - `<meta name="description">` を `<title>` の直後に入れる。内容は、(a) header 内の `<p class="subtitle">` があればその文、(b) なければ h1 と、カテゴリの説明文（例：essay/index.html の「たぶん当サイトのメインコンテンツ」）を組み合わせて、80〜120字にする。記事一覧ページは「suzumaroの日記。YYYY年〜の記録」のように、ページ単位の説明でよい。
   - OGP 4行と canonical 1行を入れる：`og:title`（title と同じ）、`og:description`（description と同じ）、`og:url`（`https://suzumaro.github.io/` ＋ リポジトリ内のパス。`index.html` は付けずにディレクトリで終える）、`og:type`（トップは `website`、それ以外は `article`）、`<link rel="canonical" href="(og:url と同じ)">`。
   - `ogp.png` を用意した場合のみ `og:image`（絶対 URL）と `<meta name="twitter:card" content="summary_large_image">` を入れる。
   - すでにあるタグは重複させない（何度実行しても同じ結果になるようにする）。
2. 生成された description を一覧で出力して、ユーザーが文言を確認・修正できるようにする（ユーザーの言葉で書かれたサイトなので、説明文は勝手に作り込みすぎない）。
3. コミット：スクリプトと HTML の変更を分けて2コミットにする。

**完了条件**：全ページに description・og:title・og:url・canonical が1つずつある。title にサイト名が入っている。

---

## R2. favicon — 優先度：高

**対象ファイル**
- 新規：`favicon.svg`（ルート直下）。題材はサイトのマスコットのフクロウ（`main.js` の `initPixelChar` にある 10×12 のドット絵の「Lv.5 ふくろう」のパレットとグリッドを流用できる）。
- 新規：`favicon.ico`（32×32。SVG 非対応の環境と、ブラウザが自動で要求する `/favicon.ico` の 404 対策）
- 全 HTML の `<head>`：`<link rel="icon" href="/favicon.svg" type="image/svg+xml">` と `<link rel="icon" href="/favicon.ico" sizes="32x32">`

**手順**
1. ドット絵のグリッドから `favicon.svg` を作る（1マス＝1つの `<rect>`、`shape-rendering="crispEdges"`）。
2. 同じ絵を32×32の `favicon.ico` に書き出す（Python の Pillow で生成してよい）。
3. R1 の `tools/add_meta.py` に link タグの挿入を足す。ルートからの絶対パス `/favicon.svg` にすれば、階層ごとに相対パスを変えなくて済む。

**完了条件**：公開後に `https://suzumaro.github.io/favicon.ico` が 200 を返す。タブにアイコンが出る。

---

## R3. sitemap.xml / robots.txt — 優先度：中

**対象ファイル**
- 新規：`robots.txt`

  ```
  User-agent: *
  Allow: /
  Sitemap: https://suzumaro.github.io/sitemap.xml
  ```

- 新規：`sitemap.xml`（R6 のスクリプトで生成。R6 より先にやる場合は手書き）

**手順**
1. 全 HTML（67ファイル）の URL を `<url><loc>…</loc><lastmod>…</lastmod></url>` で列挙する。`lastmod` はそのファイルの最新コミット日（`git log -1 --format=%cs -- <file>`）を使う。
2. Google Search Console へのサイトマップ送信はユーザーの作業（アカウント操作）なので、手順をユーザーに案内するだけにする。

**完了条件**：`/robots.txt` と `/sitemap.xml` が 200。sitemap が XML として正しい（`python3 -c "import xml.dom.minidom,sys;xml.dom.minidom.parse('sitemap.xml')"` が通る）。

---

## R4. 404 ページ — 優先度：高

**対象ファイル**
- 新規：`404.html`（ルート直下。GitHub Pages は存在しない URL のときに自動でこれを返す）

**手順**
1. 既存ページと同じ構造で作る。**どの階層の URL でも表示されるため、CSS と JS は絶対パス**（`/style.css`、`/main.js`）で読み込む。`main.js` の読み込みは他ページの「style.css のパスから組み立てる」方式のままで動く（`l.href` は絶対 URL になるため）。
2. 内容：「ページが見つかりませんでした」の一文、トップ（`/`）と主要カテゴリ（Essay / Gallery / Essentials / Studies / Profile）へのリンク。旧 FC2 から来た人向けに「サイトは 2026/11 に移転しました」の一文を入れる。
3. `<meta name="robots" content="noindex">` を入れる。

**完了条件**：公開後、`https://suzumaro.github.io/aaa` で自作の 404 ページが出る。ダークモード切り替えが動く。

---

## R5 ＋ R6. 記事一覧・RSS・sitemap の生成スクリプト — 優先度：中

**目的**：記事を書いたあと1コマンドで、更新履歴の元データ・RSS・sitemap を作り直す。公開されるのは生成済みの静的ファイルだけ。

**対象ファイル**
- 新規：`tools/build_feeds.py`（Python 3 の標準ライブラリだけで書く。`html.parser` で十分。外部パッケージは使わない）
- 新規（生成物）：`feed.xml`（RSS 2.0）、`sitemap.xml`（R3 と共通）
- 変更：全 HTML の `<head>` に `<link rel="alternate" type="application/rss+xml" title="suzuφathenaeum" href="/feed.xml">`（R1 のスクリプトに足す）
- 新規：`tools/README.md`（実行方法を2〜3行で）

**記事を抜き出す対象ページ**：`essay/diary/`、`essay/music/`、`essay/movie/`、`essay/book/`、`essay/songwriting/`、`essentials/instruments/kizai/`、`essay/archive/20XX/`

**手順**
1. 各ページの `<article>` ごとに、h2 の文字列（`<small>[玩具]</small>` のようなカテゴリ表示は除く）、h2 直後の要素の先頭にある日付（正規表現 `\d{4}/\d{1,2}/\d{1,2}`）、本文の先頭100字を取り出す。
2. 記事へのリンクは `ページURL#article-N` にする。**注意**：今の `main.js` の目次は読み込み時に `article-0, article-1…` と上から順に id を振るので、記事を先頭に追加すると番号が全部ずれる。RSS のリンクを長く使えるようにするには、次のどちらかが必要：
   - (a) 各 `<article>` に日付ベースの固定 id（例 `id="d20261121"`。同じ日が複数あれば `-2` を付ける）をスクリプトで書き込み、`main.js` の `initTOC` は id がすでにある場合はそれを使うように変える（数行の変更）。
   - (b) RSS のリンクはページ単位（`#` なし）にする。
   推奨は (a)。
3. 日付の新しい順に最新30件を `feed.xml` にする。`pubDate` は RFC 822 形式、時刻は 00:00 +0900。
4. `sitemap.xml` も同じスクリプトで出す（R3）。
5. 何度実行しても、記事が変わっていなければ差分が出ないようにする（並び順を固定し、生成日時は書き込まない）。

**完了条件**：`python3 tools/build_feeds.py` で `feed.xml` と `sitemap.xml` が更新される。W3C Feed Validator（ユーザーがブラウザで確認）で妥当と出る。

**運用（ユーザー向けに README に書く）**：記事を書く → `python3 tools/build_feeds.py` → GitHub Desktop で Commit → Push。

---

## R7. main.js の使われていないコードの削除 — 優先度：低

**対象ファイル**：`main.js`、`style.css`

**手順**
1. `main.js` から `initSiteSearch`（`window.SEARCH_INDEX` はどこにも定義されていない）と `initPixelChar`（`#pixel-char` 要素はどのページにも無い。マスコットは `owl-game.js` に移行済み）を削除し、`init()` の呼び出しも消す。約350行減る。
2. `style.css` から対応するセレクタ（`#site-search*`、`.site-search-list`、`.sr-*`、`.search-no-result`、`#pixel-char`、`.pixel-info`）を削除する。印刷用の `#pixel-char` 指定も消す。
3. R2 でフクロウのドット絵を favicon に使う場合は、削除の前にグリッドとパレットを `favicon.svg` に移しておく。
4. ファイル冒頭コメントの機能一覧を更新する。
5. `index.html` の `main.js?v=` の日付を更新する（キャッシュ対策）。

**完了条件**：トップ・Diary・Photo でダークモード、目次、記事検索、トップへ戻るボタン、フクロウのゲームが動く。ブラウザのコンソールにエラーが出ない。

---

## R8. 大きなページの分割 — 優先度：低（Diary が 300KB を超えたら）

**対象ファイル**：`essay/diary/index.html`（現在 271KB・64記事）、`essay/archive/index.html`

**手順**
1. 前年以前の Diary 記事を `essay/archive/20XX/index.html` に移す（Archive に年別ページがすでにあるので、その形式に合わせる）。
2. Diary ページの先頭に「過去の日記は Archive へ」のリンクを置く。
3. 移した記事の見出し・日付・本文を一切変えないこと（ユーザーの文章）。

**完了条件**：移す前と後で、全記事の h2 と日付の組み合わせが過不足なく一致する（スクリプトで照合する）。

---

## R9. GitHub Actions による自動チェック — 優先度：低

**対象ファイル**：新規 `.github/workflows/check.yml`、新規 `tools/check_html.py`

**手順**
1. `tools/check_html.py`：全 HTML を html5lib で解析し、`unexpected-end-tag`・`end-tag-too-early` などのエラーと、内部リンク切れ（ファイルが存在しない相対リンク）があれば終了コード1で終わる。`expected-named-entity`（URL 中の `&`）は警告だけにする。
2. `check.yml`：push と pull_request で `pip install html5lib` → `python3 tools/check_html.py`。
3. 公開には影響しない（Pages は従来どおり `main` のファイルをそのまま配信する）。

**完了条件**：わざと `</p>` を1つ余計に入れたブランチで Actions が失敗し、戻すと成功する。

---

## 実装しないもの

- **R10. Firebase による共有フクロウ**（`owl-config.js` の `OWL_DB_URL`）：外部 DB が必要で静的方針から外れる。設定コメントにあるルール（`".write": true`）では誰でもデータを書き換えられるので、使う場合は書き込みの検証ルールを別途設計する必要がある。今は空欄（ローカルモード）のままにする。
- **静的サイトジェネレーター（Jekyll / Hugo など）への移行**：記事の書き方が大きく変わり、「HTML を直接書いて置くだけ」という今の運用の良さがなくなる。
