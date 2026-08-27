// socket-handlers.js
import { appState } from './state.js';
import { ui, chat_panel_additionl_elements } from './ui.js';
import { socket } from './socket.js';
import { openChat, updateNewChatContacts } from './actions.js';
import {
    saveDecryptedKeyToLocal,
    loadDecryptedKeyFromLocal,
    generateKeyPair,
    extractKeys,
    encryptPrivateKey,
    decryptPrivateKey,
    deriveSharedAESKey,
    importFriendPublicKey,
    decryptChatMessage,
} from './crypto.js';
import { convertKeyForSigning, generateSignature } from './ECDSA.js';

export function handleStartSession(data) {
    if (data['status'] !== 'success') return;

    ui.footer.style.display = "none";
    ui.start_page.style.display = "none";
    ui.chat_page.style.display = "flex";

    ui.contacts.textContent = '';
    ui.contacts.innerHTML = chat_panel_additionl_elements.start;

    for (const key in data['clients']) {
        appState.chats.push(data['clients'][key]);
        ui.contacts.innerHTML += `<button onclick="openChat(${data['clients'][key][0]}, ${key})" class="chat-panel-element chat-panel-hover">
            <img class="message-img user-img" src="../../static/image/logo.png" alt="Волчат">
            <p class="text medium">${data['clients'][key][1]}</p>
        </button>`;
    }

    ui.contacts.innerHTML += chat_panel_additionl_elements.end;
}

export async function handleAuth(data) {
    if (data['status'] !== 'success') {
        ui.auth_error.style.display = 'block';
        ui.email_auth.style.borderColor = 'red';
        return;
    }

    ui.email_auth.style.borderColor = 'black';
    ui.auth_error.style.display = 'none';
    ui.auth_pass_error.style.display = 'none';
    ui.password_auth.style.borderColor = 'black';

    appState.publickey = data['public'];
    appState.user_id = data['id'];

    if (appState.privatekey === undefined) {
        appState.privatekey = await loadDecryptedKeyFromLocal();
    }

    appState.iv = data['iv'];
    localStorage.setItem('iv', appState.iv);
    localStorage.setItem('user_key', appState.publickey);
    localStorage.setItem('user_id', appState.user_id);

    if (ui.email_auth.value !== '' && appState.username_local !== undefined) {
        appState.username_local = ui.email_auth.value;
        localStorage.setItem('username', appState.username_local);
    }

    socket.emit('start-session', {
        status: 'success',
        token: appState.jwt_token,
        id: appState.user_id,
        login: appState.username_local
    });
}

export async function handleRegistrationCheck(data) {
    if (data['status'] !== 'success') {
        ui.login.style.borderColor = 'red';
        ui.login_error.style.display = 'block';
        return;
    }

    ui.login.style.borderColor = 'black';
    ui.login_error.style.display = 'none';

    const keyPair = await generateKeyPair();
    const keys = await extractKeys(keyPair);

    appState.publickey = keys.originalPublicKey;
    appState.privatekey = keys.originalPrivateKey;
    await saveDecryptedKeyToLocal(appState.privatekey);

    appState.user_id = data['user_id'];
    appState.username_local = ui.login.value;

    const encryptedData = await encryptPrivateKey(keys.privateKeyBytes, appState.user_id, String(ui.password_1.value));

    localStorage.setItem('username', appState.username_local);
    localStorage.setItem('user_id', appState.user_id);
    localStorage.setItem('user_key', appState.publickey);

    socket.emit('registration', {
        status: 'success',
        login: appState.username_local,
        public_key: keys.publicKeyJWK,
        private_key: encryptedData.encryptedKeyBase64,
        iv: encryptedData.ivBase64
    });
}

export function handleRegistration(data) {
    if (data['status'] !== 'success') return;
    appState.user_id = data['id'];
    localStorage.setItem('user_id', appState.user_id);
}

export async function handleLoadChat(data) {
    if (data['status'] !== 'success' || appState.new_chat_activity) return;

    ui.chat_page.style.display = 'flex';
    ui.username.textContent = data['friend_login'];

    const all_messages = data['all'] || [];

    appState.companion_key = await importFriendPublicKey(JSON.parse(data['friend_public']));
    await saveDecryptedKeyToLocal(appState.privatekey);
    appState.helman_key = await deriveSharedAESKey(appState.privatekey, appState.companion_key);

    ui.send_message.value = '';

    let htmlContent = '';
    for (const [cipherText, isMine, ivValue] of all_messages) {
        const message = await decryptChatMessage(appState.helman_key, cipherText, ivValue);
        const side = isMine ? 'right' : 'left';
        htmlContent += `<div class="message ${side}">
            <img class="message-img" src="../../static/image/logo.png" alt="Волчат">
            <div class="message-content ${side}">
                <p class="text">${message}</p>
                <p class="text time">00:00</p>
            </div>
        </div>`;
    }

    ui.messages_list.innerHTML = htmlContent;
    setTimeout(() => {
        ui.messages_list.scrollTop = ui.messages_list.scrollHeight;
    }, 10);
}

export async function handleNewMessage(data) {
    if (data['status'] !== 'success') {
        console.log('Ошибка получения нового сообщения');
        return;
    }

    const text = await decryptChatMessage(appState.helman_key, data['text'], data['iv']);
    const side = data['author_id'] === appState.user_id ? 'right' : 'left';

    // здесь у message-content нет right/left, в отличие от load-chat — оставил как в оригинале
    const htmlContent = `<div class="message ${side}">
        <img class="message-img" src="../../static/image/logo.png" alt="Волчат">
        <div class="message-content">
            <p class="text">${text}</p>
            <p class="text time">00:00</p>
        </div>
    </div>`;

    ui.messages_list.insertAdjacentHTML('beforeend', htmlContent);
    setTimeout(() => {
        ui.messages_list.scrollTop = ui.messages_list.scrollHeight;
    }, 10);
}

export async function handleUpdateToken() {
    try {
        console.log("Обновление токена...");

        const response = await fetch('http://127.0.0.1:5000/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: appState.user_id,
                login: appState.username_local,
                token: appState.jwt_token,
                type: 'access'
            })
        });

        const result = await response.json();

        if (response.ok && result.access_token) {
            appState.jwt_token = result.access_token;
            localStorage.setItem('jwt_token', appState.jwt_token);
            socket.emit('auth', { login: appState.username_local, token: appState.jwt_token });
        } else {
            console.error("Ошибка входа:", result);
        }
    } catch (error) {
        console.error("Что-то пошло не так (ошибка криптографии или сети):", error);
    }
}

export async function handleNeedAccessToken(data) {
    if (data['status'] !== 'success') return;

    ui.email_auth.style.borderColor = 'black';
    ui.auth_error.style.display = 'none';

    const user_local_id = data['id'];
    const encryptedKey = data['private-key'];
    const nonce = data['nonce'];
    const keyIv = data['iv']; // локальное имя нарочно — иначе затирает appState.iv
    const login = data['login'];

    if (appState.privatekey !== undefined && appState.user_id !== undefined && appState.user_id === user_local_id) {
        console.log("Используем ключ из памяти");
    } else {
        try {
            appState.privatekey = await decryptPrivateKey(encryptedKey, keyIv, user_local_id, ui.password_auth.value);
            await saveDecryptedKeyToLocal(appState.privatekey);
        } catch (error) {
            console.error("Ошибка расшифровки ключа (неверный пароль?):", error);
            ui.auth_pass_error.style.display = 'block';
            ui.password_auth.style.borderColor = 'red';
            return;
        }
    }

    try {
        const signingKey = await convertKeyForSigning(appState.privatekey);
        const signature = await generateSignature(nonce, signingKey);

        const response = await fetch('http://127.0.0.1:5000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user_local_id, login, sig: signature })
        });

        const result = await response.json();

        if (response.ok && result.access_token) {
            appState.jwt_token = result.access_token;
            localStorage.setItem('jwt_token', appState.jwt_token);
            socket.emit('auth', { login, token: appState.jwt_token });
        } else {
            console.error("Ошибка входа:", result);
        }
    } catch (error) {
        console.error("Что-то пошло не так (ошибка криптографии или сети):", error);
    }
}

export function handleNeedMembers(data) {
    if (data['status'] === 'success') {
        updateNewChatContacts(data);
    }
}

export function handleMakeNewChat(data) {
    if (data['status'] !== 'success') return;
    appState.chats.push([data['chat_id'], data['chat_name']]);
    openChat(data['chat_id'], appState.chats.length - 1);
}