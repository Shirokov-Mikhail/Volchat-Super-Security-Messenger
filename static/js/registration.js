async function saveDecryptedKeyToLocal(decryptedCryptoKey, storageKeyName = 'my_active_private_key') {
    // 1. Экспортируем рабочий CryptoKey в формат JWK (JSON Web Key)
    const jwkKey = await window.crypto.subtle.exportKey("jwk", decryptedCryptoKey);

    // 2. Превращаем JSON-объект в строку и кладем в localStorage
    localStorage.setItem(storageKeyName, JSON.stringify(jwkKey));

    console.log("Дешифрованный ключ успешно сохранен в localStorage!");
    return jwkKey
}

async function loadDecryptedKeyFromLocal(storageKeyName = 'my_active_private_key') {
    // 1. Достаем строку из localStorage
    const storedKeyString = localStorage.getItem(storageKeyName);

    if (!storedKeyString) {
        return null; // Если ключа нет (например, юзер вышел)
    }

    // 2. Превращаем строку обратно в объект JWK
    const jwkKey = JSON.parse(storedKeyString);

    // 3. Импортируем JWK обратно в работоспособный объект CryptoKey
    // Используем строго те же параметры, что и в твоем коде при генерации!
    const workingKey = await window.crypto.subtle.importKey(
        "jwk",
        jwkKey,
        {
            name: "ECDH",
            namedCurve: "P-256"
        },
        true, // Разрешаем извлечение
        ["deriveKey", "deriveBits"] // Права для генерации Хеллмана
    );

    console.log("Ключ успешно извлечен и готов к работе!");
    return workingKey;
}

/* 1. Генерация ключей шифрования пользователя */
async function generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-256"
        },
        true, // Разрешаем извлечение
        ["deriveKey", "deriveBits"]
    );
    console.log("Пара ключей (ECDH) успешно сгенерирована!");
    return keyPair;
}

/* 2. Извлечение ключей (с сохранением оригиналов для Хеллмана) */
async function extractKeys(keyPair) {
    // Публичный ключ в JWK для базы данных
    const publicKeyJWK = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const publicKeyString = JSON.stringify(publicKeyJWK);
    // Приватный ключ в PKCS8 для шифрования паролем
    const privateKeyBytes = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    console.log("Ключи успешно извлечены во всех форматах!");

    return {
        publicKeyJWK: publicKeyString,           // Отправляем на сервер (открыто)
        privateKeyBytes: privateKeyBytes,     // Шифруем паролем
        originalPublicKey: keyPair.publicKey, // Оставляем в памяти для Хеллмана
        originalPrivateKey: keyPair.privateKey // Оставляем в памяти для Хеллмана
    };
}

/* Вспомогательная функция: ArrayBuffer -> Base64 */
function bufferToBase64(buffer) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
}

/* Вспомогательная функция: Base64 -> Uint8Array */
function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/* 3. Шифрование сырых байт приватного ключа паролем */

// Обрати внимание: теперь функция принимает уже извлеченные privateKeyBytes
async function encryptPrivateKey(privateKeyBytes, userId, password) {
    const encoder = new TextEncoder();

    const passwordKeyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        {name: "PBKDF2"},
        false,
        ["deriveKey"]
    );

    const salt = encoder.encode(userId.toString());

    const aesKey = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        passwordKeyMaterial,
        {name: "AES-GCM", length: 256},
        false,
        ["encrypt"]
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedPrivateKeyBuffer = await window.crypto.subtle.encrypt(
        {name: "AES-GCM", iv: iv},
        aesKey,
        privateKeyBytes
    );

    return {
        encryptedKeyBase64: bufferToBase64(encryptedPrivateKeyBuffer),
        ivBase64: bufferToBase64(iv)
    };
}

/* 4. Расшифровка приватного ключа (при логине) */
async function decryptPrivateKey(encryptedKeyBase64, ivBase64, userId, password) {
    const encoder = new TextEncoder();

    const passwordKeyMaterial = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        {name: "PBKDF2"},
        false,
        ["deriveKey"]
    );

    const salt = encoder.encode(userId.toString());

    const aesKey = await window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        passwordKeyMaterial,
        {name: "AES-GCM", length: 256},
        false,
        ["decrypt"]
    );

    const encryptedBytes = base64ToUint8Array(encryptedKeyBase64);
    const iv = base64ToUint8Array(ivBase64);

    const decryptedPrivateKeyBuffer = await window.crypto.subtle.decrypt(
        {name: "AES-GCM", iv: iv},
        aesKey,
        encryptedBytes
    );

    // Возвращаем полноценный CryptoKey для Хеллмана
    return await window.crypto.subtle.importKey(
        "pkcs8",
        decryptedPrivateKeyBuffer,
        {name: "ECDH", namedCurve: "P-256"},
        true,
        ["deriveKey", "deriveBits"]
    );
}

/* 5. Генерация общего секрета Хеллмана */
async function deriveSharedAESKey(myPrivateKey, friendPublicKey) {
    return await window.crypto.subtle.deriveKey(
        {
            name: "ECDH",
            public: friendPublicKey
        },
        myPrivateKey,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );
}

/* 6. Импорт чужого публичного ключа (с сервера в формат CryptoKey) */
async function importFriendPublicKey(jwkKey) {
    return await window.crypto.subtle.importKey(
        "jwk",
        jwkKey,
        {name: "ECDH", namedCurve: "P-256"},
        true,
        []
    );
}

async function importFriendPublicKey(jwkKey) {
    return await window.crypto.subtle.importKey(
        "jwk",
        jwkKey,
        {name: "ECDH", namedCurve: "P-256"},
        true,
        []
    );
}

/**
 * Шифрование сообщения перед отправкой
 * @param {CryptoKey} sharedAesKey - Симметричный ключ AES-GCM (сгенерированный Хеллманом)
 * @param {string} textMessage - Исходный текст сообщения от пользователя
 * @returns {Promise<Object>} Зашифрованный текст и вектор инициализации в Base64
 */
async function encryptChatMessage(sharedAesKey, textMessage) {
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(textMessage);

    // Вектор инициализации (IV) обязательно генерируется заново для КАЖДОГО сообщения[cite: 1, 4]
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Шифруем данные симметричным ключом[cite: 1, 4]
    const cipherTextBuffer = await window.crypto.subtle.encrypt(
        {name: "AES-GCM", iv: iv},
        sharedAesKey,
        encodedText
    );

    return {
        cipherTextBase64: bufferToBase64(cipherTextBuffer),
        ivBase64: bufferToBase64(iv) // Открыто передаем вектор собеседнику вместе с сообщением[cite: 1, 4]
    };
}

/**
 * Расшифровка входящего сообщения
 * @param {CryptoKey} sharedAesKey - Тот же общий симметричный ключ чата
 * @param {string} cipherTextBase64 - Зашифрованный текст из базы данных/сокетов
 * @param {string} ivBase64 - Вектор инициализации, пришедший вместе с сообщением
 * @returns {Promise<string|null>} Расшифрованный текст или null при ошибке
 */
async function decryptChatMessage(sharedAesKey, cipherTextBase64, ivBase64) {
    try {
        // Подготавливаем бинарные данные для алгоритма[cite: 1, 4]
        const cipherTextBuffer = base64ToUint8Array(cipherTextBase64);
        const iv = base64ToUint8Array(ivBase64);

        // Расшифровываем, используя ТОТ ЖЕ вектор, с которым шифровалось сообщение[cite: 1, 4]
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            {name: "AES-GCM", iv: iv},
            sharedAesKey,
            cipherTextBuffer
        );

        // Декодируем байты обратно в читаемую строку[cite: 1, 4]
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);

    } catch (error) {
        console.error("Ошибка расшифровки сообщения! Данные повреждены или неверный ключ:", error);
        return null;
    }
}

async function privateKeyToJWK(privateKey) {
    // Экспортируем рабочий CryptoKey в формат JWK
    const jwkKey = await window.crypto.subtle.exportKey("jwk", privateKey);

    return jwkKey;
    // Если нужно получить текстовую строку для передачи,
    // используйте: return JSON.stringify(jwkKey);
}

async function jwkToPrivateKey(jwkKey) {
    // Если jwkKey пришел в виде строки, сначала сделайте:
    // const parsedJwk = typeof jwkKey === 'string' ? JSON.parse(jwkKey) : jwkKey;

    // Импортируем JWK обратно в работоспособный объект CryptoKey[cite: 1, 3, 4]
    const privateKey = await window.crypto.subtle.importKey(
        "jwk",
        jwkKey,
        {
            name: "ECDH",
            namedCurve: "P-256"
        },
        true, // Разрешаем извлечение ключа в будущем[cite: 1, 3, 4]
        ["deriveKey", "deriveBits"] // Права для генерации Хеллмана[cite: 1, 3, 4]
    );

    return privateKey;
}

(async () => {
    try {
        console.log("=== Тест шифрования 'hello world' ===");

        // 1. Имитируем двух пользователей: генерируем две пары ключей вашей функцией
        const aliceKeys = await generateKeyPair();
        const bobKeys = await generateKeyPair();

        // 2. Генерируем общий AES-ключ вашей функцией (Алиса использует свой приватный и публичный Боба)
        const sharedAesKey = await deriveSharedAESKey(aliceKeys.privateKey, bobKeys.publicKey);

        // 3. Исходное сообщение
        const message = "hello world";
        console.log("Исходное сообщение:", message);

        // 4. Шифруем вашей функцией
        const encryptedData = await encryptChatMessage(sharedAesKey, message);

        console.log("🔒 Шифротекст (Base64):", encryptedData.cipherTextBase64);
        console.log("🔑 IV (Base64):", encryptedData.ivBase64);

        // 5. Расшифровываем вашей функцией
        const decryptedMessage = await decryptChatMessage(
            sharedAesKey,
            encryptedData.cipherTextBase64,
            encryptedData.ivBase64
        );

        console.log("✅ Расшифрованное сообщение:", decryptedMessage);

    } catch (error) {
        console.error("Ошибка выполнения:", error);
    }
})();
