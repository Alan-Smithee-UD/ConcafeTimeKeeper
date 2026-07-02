// グローバル変数
let shops = {};

// DOM要素の取得
const shopSelect = document.getElementById('shopSelect');
const entryTime = document.getElementById('entryTime');
const chargeInterval = document.getElementById('chargeInterval');
const chargeAmount = document.getElementById('chargeAmount');
const nowBtn = document.getElementById('nowBtn');
const clearBtn = document.getElementById('clearBtn');
const tableContainer = document.getElementById('tableContainer');
const chargeForm = document.getElementById('chargeForm');

// 初期化処理
document.addEventListener('DOMContentLoaded', async () => {
    // config.jsonを読み込む
    try {
        const response = await fetch('./data/config.json');
        const config = await response.json();
        
        // 店舗データをオブジェクトに変換
        config.shops.forEach(shop => {
            shops[shop.id] = {
                interval: shop.interval,
                amount: shop.amount
            };
        });

        // プルダウンのオプションを動的に生成
        config.shops.forEach(shop => {
            const option = document.createElement('option');
            option.value = shop.id;
            option.textContent = `${shop.name}（${shop.interval}分 ${shop.amount}円）`;
            shopSelect.appendChild(option);
        });

        // 「その他」オプションを追加
        const otherOption = document.createElement('option');
        otherOption.value = 'other';
        otherOption.textContent = 'その他（カスタム設定）';
        shopSelect.appendChild(otherOption);
    } catch (error) {
        console.error('config.jsonの読み込みに失敗しました:', error);
        // フォールバック: デフォルト店舗データを使用
        shops = {
            karerax: { interval: 30, amount: 100 },
            netrunner: { interval: 60, amount: 200 },
            popai: { interval: 20, amount: 50 },
            bigbonusmap: { interval: 45, amount: 150 }
        };
    }

    tableContainer.innerHTML = '<div class="no-data">入店時刻、チャージ更新間隔、チャージ料金を入力してください</div>';

    // イベントリスナーを登録
    setupEventListeners();
});

// イベントリスナーの設定
function setupEventListeners() {
    // 店舗選択時の処理
    shopSelect.addEventListener('change', (e) => {
        const selected = e.target.value;

        if (selected === 'other') {
            // カスタム設定の場合は入力可能
            chargeInterval.disabled = false;
            chargeAmount.disabled = false;
            chargeInterval.value = '';
            chargeAmount.value = '';
        } else if (selected && shops[selected]) {
            // 店舗が選択されている場合は自動入力で入力不可
            const shop = shops[selected];
            chargeInterval.disabled = true;
            chargeAmount.disabled = true;
            chargeInterval.value = shop.interval;
            chargeAmount.value = shop.amount;
            generateTable();
        } else {
            // 未選択の場合はリセット
            chargeInterval.disabled = true;
            chargeAmount.disabled = true;
            chargeInterval.value = '';
            chargeAmount.value = '';
            tableContainer.innerHTML = '<div class="no-data">入店時刻、チャージ更新間隔、チャージ料金を入力してください</div>';
        }
    });

    // 現在時刻ボタン
    nowBtn.addEventListener('click', () => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        entryTime.value = `${hours}:${minutes}`;
        generateTable();
    });

    // リセットボタン
    clearBtn.addEventListener('click', () => {
        chargeForm.reset();
        shopSelect.value = '';
        chargeInterval.disabled = true;
        chargeAmount.disabled = true;
        tableContainer.innerHTML = '<div class="no-data">入店時刻、チャージ更新間隔、チャージ料金を入力してください</div>';
    });

    // 入力欄の変更時にテーブル生成
    entryTime.addEventListener('change', generateTable);
    entryTime.addEventListener('blur', generateTable);
    chargeInterval.addEventListener('change', generateTable);
    chargeInterval.addEventListener('blur', generateTable);
    chargeAmount.addEventListener('change', generateTable);
    chargeAmount.addEventListener('blur', generateTable);
}

// テーブル生成関数
function generateTable() {
    // バリデーション
    if (!entryTime.value || !chargeInterval.value || !chargeAmount.value) {
        tableContainer.innerHTML = '<div class="no-data">入店時刻、チャージ更新間隔、チャージ料金を入力してください</div>';
        return;
    }

    const interval = parseInt(chargeInterval.value);
    const amount = parseInt(chargeAmount.value);

    if (interval < 1 || interval > 1440) {
        tableContainer.innerHTML = '<div class="no-data">チャージ更新間隔は1～1440分で入力してください</div>';
        return;
    }

    if (amount < 1) {
        tableContainer.innerHTML = '<div class="no-data">チャージ料金は1円以上で入力してください</div>';
        return;
    }

    // 入店時刻をDate オブジェクトに変換
    const [hours, minutes] = entryTime.value.split(':');
    const entryDate = new Date();
    entryDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // テーブルデータを生成
    const rows = [];
    let currentTime = new Date(entryDate);
    let totalCharge = 0;
    const startDate = new Date(entryDate);
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    // 初期状態（入店時刻）
    rows.push({
        time: formatTime(currentTime),
        charge: 0,
        isInitial: true
    });

    // チャージ更新を計算
    while (true) {
        currentTime = new Date(currentTime.getTime() + interval * 60000);
        totalCharge += amount;

        const currentDateOnly = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());

        rows.push({
            time: formatTime(currentTime),
            charge: totalCharge
        });

        // 日付をまたいだら終了
        if (currentDateOnly > startDateOnly) {
            break;
        }
    }

    // HTMLテーブルを生成
    let html = '<table><thead><tr><th>時刻</th><th>累計チャージ（円）</th></tr></thead><tbody>';
    rows.forEach(row => {
        const className = row.isInitial ? 'highlight-charge' : '';
        html += `<tr class="${className}"><td>${row.time}</td><td>¥${row.charge.toLocaleString('ja-JP')}</td></tr>`;
    });
    html += '</tbody></table>';

    tableContainer.innerHTML = html;
}

// 時刻フォーマット関数
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}
