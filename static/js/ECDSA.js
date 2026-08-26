
// Конвертирует ключ чата (ECDH) в ключ для подписи (ECDSA)
export async function convertKeyForSigning(ecdhPrivateKey) {
    // 1. Выгружаем сырые байты приватного ключа
    const rawBytes = await window.crypto.subtle.exportKey("pkcs8", ecdhPrivateKey);

    // 2. Импортируем те же байты, но уже с алгоритмом ECDSA и правом на подпись
    return await window.crypto.subtle.importKey(
        "pkcs8",
        rawBytes,
        {name: "ECDSA", namedCurve: "P-256"},
        true,
        ["sign"]
    );
}

// Подписи
// Вспомогательная функция: переводит сырые байты (ArrayBuffer) в строку Base64
export function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Создает криптографическую подпись ECDSA для любой строки
 * * @param {string} dataString - Исходная строка, которую нужно подписать (например, nonce)
 * @param {CryptoKey} privateKey - Объект приватного ключа пользователя
 * @returns {Promise<string>} - Готовая подпись в формате Base64
 */
export async function generateSignature(dataString, privateKey) {
    try {
        // 1. Кодируем текст в сырые байты, так как криптография работает только с байтами
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(dataString);

        // 2. Ставим подпись с помощью встроенного движка браузера
        const signatureBuffer = await window.crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: {name: "SHA-256"},
            },
            privateKey,
            dataBytes
        );

        // 3. Переводим результат в Base64 для удобной передачи по сети
        return arrayBufferToBase64(signatureBuffer);

    } catch (error) {
        console.error("[Криптография] Ошибка генерации подписи:", error);
        throw error;
    }
}
