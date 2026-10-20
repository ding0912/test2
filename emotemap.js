// questions.js

/**
 * Twitch 貼圖對照表
 * Key: 文字關鍵字, Value: 動態圖檔 URL (GIF, APNG, WebP 等)
 */
export const emoteMap = {
    "koppaNYO": "./2.gif", // 替換為實際貼圖網址
          // 替換為實際貼圖網址
};

/**
 * 將文字中的表情關鍵字替換為 <img> 標籤
 * @param {string} text 原始問題敘述
 * @returns {string} 包含貼圖 HTML 標籤的字串
 */
export function parseEmotes(text) {
    if (!text) return '';
    let parsedText = text;
    
    Object.keys(emoteMap).forEach(code => {
        // 使用正則表達式尋找所有符合的關鍵字，並替換為 <img>
        const regex = new RegExp(`${code}`, 'g');
        const imgTag = `<img src="${emoteMap[code]}" alt="${code}" class="twitch-emote inline-block" />`;
        parsedText = parsedText.replace(regex, imgTag);
    });

    return parsedText;
}

/**
 * 預設題目與祝福資料庫
 */
export const defaultDataset = [
    // ... 原本的題目清單 ...
];