/* =========================================================
 * OWL KEEPER 設定
 *
 * 全訪問者で1羽を共有するには Firebase Realtime Database が必要です。
 * 未設定(空文字)の間は「ローカルモード」で動作します
 * (訪問者ごとに別々に育つ・動作確認用)。
 *
 * 設定手順:
 * 1. https://console.firebase.google.com で無料プロジェクト作成
 * 2. 構築 > Realtime Database > データベースを作成(ロケーションは任意)
 * 3. ルールタブで以下を貼り付けて公開:
 *    { "rules": { "owl": { ".read": true, ".write": true } } }
 * 4. データタブ上部に表示されるURL(https://xxxx-default-rtdb.firebaseio.com/ など)を
 *    下の '' の中に貼り付ける
 * ========================================================= */
window.OWL_DB_URL = '';
