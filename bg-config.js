// bg-config.js

/**
 * 預設背景設定
 */
export const DEFAULT_BG_URL = "./background.jpg";
export const DEFAULT_SAKURA_BG_URL = "./present.jpg";

/**
 * 更新全站背景圖片 UI
 * @param {string} url 圖片網址/DataURL
 */
export function applyGlobalBackground(url) {
    if (url) {
        // 使用 background 簡寫一次性覆蓋背景圖與佈局
        document.body.style.background = `url('${url}') center/cover fixed no-repeat`;
    } else {
        // 若無圖片，還原為預設深色漸層
        document.body.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%) fixed';
    }
}

/**
 * 更新紀念背景圖片框架 UI
 * @param {string} url 圖片網址/DataURL
 */
export function applySakuraBackground(url) {
    const sakuraFrame = document.getElementById('sakura-img-frame');
    if (sakuraFrame) {
        const bgUrl = url || DEFAULT_SAKURA_BG_URL;
        // 一次性設定背景圖片與呈現方式，避免樣式遺失
        sakuraFrame.style.background = `url('${bgUrl}') center/cover no-repeat`;
    }
}