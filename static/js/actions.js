// actions.js
import { appState } from './state.js';
import { ui, chat_panel_additionl_elements } from './ui.js';
import { socket } from './socket.js';
import { encryptChatMessage } from './crypto.js';

export function auth() {
    if (ui.email_auth.value === '' || ui.password_auth.value === '') return;
    socket.emit('auth', { token: appState.jwt_token, login: ui.email_auth.value });
}

export function register() {
    const samePassword = ui.password_1.value === ui.password_2.value;

    if (ui.login.value !== '' && ui.password_1.value !== '' && samePassword && appState.username_local !== '' && ui.password_1.value.length >= 8) {
        ui.password_1.style.borderColor = 'black';
        ui.password_2.style.borderColor = 'black';
        ui.password_repeat_error.style.display = 'none';
        socket.emit('registration-check', { login: ui.login.value });
    } else if (!samePassword) {
        ui.password_1.style.borderColor = 'red';
        ui.password_2.style.borderColor = 'red';
        ui.password_repeat_error.style.display = 'block';
    }
}

export function loadChat(chat_id) {
    socket.emit('load-chat', {
        chat_id: chat_id,
        user_id: appState.user_id,
        old_chat_id: appState.current_chat_id,
        token: appState.jwt_token
    });
    appState.current_chat_id = chat_id;
}

export async function send_messages() {
    if (ui.send_message.value === '' || appState.current_chat_id === -1) return;

    const message = await encryptChatMessage(appState.helman_key, ui.send_message.value);

    socket.emit('send-message', {
        message: message.cipherTextBase64,
        iv: message.ivBase64,
        user_id: appState.user_id,
        chat_id: appState.current_chat_id,
        token: appState.jwt_token
    });
}

export function openChat(all_id, id) {
    ui.start_panel.style.display = "none";
    ui.main_chat_panel.style.filter = "none";
    ui.main_chat_panel.style.pointerEvents = 'auto';
    ui.main_chat_panel.style.display = "block";

    ui.contacts.textContent = '';
    ui.contacts.innerHTML = chat_panel_additionl_elements.start;

    for (const key in appState.chats) {
        const isActive = Number(key) === Number(id);
        if (isActive) loadChat(Number(all_id));

        const cssClass = isActive ? 'active-chat' : 'chat-panel-hover';
        ui.contacts.innerHTML += `<button onclick="openChat(${appState.chats[key][0]}, ${key})" class="chat-panel-element ${cssClass}">
            <img class="message-img user-img" src="../../static/image/logo.png" alt="Волчат">
            <p class="text medium">${appState.chats[key][1]}</p>
        </button>`;
    }

    ui.contacts.innerHTML += chat_panel_additionl_elements.end;
}

export function closeNewChat() {
    ui.new_chat_panel.style.display = "none";
    appState.new_chat_activity = false;
    appState.users_selected = [];
    ui.send_message.value = '';
    ui.username.textContent = '';
    openChat(-1, -1);
}

export function makeNewChat() {
    socket.emit('make_new_chat', {
        users: appState.users_selected,
        user_id: Number(appState.user_id),
        name: ui.send_message.value,
        token: appState.jwt_token
    });
}

export function newChat() {
    ui.new_chat_panel.style.display = "flex";
    ui.start_panel.style.display = "none";
    ui.main_chat_panel.style.filter = "none";
    ui.messages_list.innerHTML = '';
    ui.username.textContent = 'Твой новый чат';
    ui.send_message.value = 'Твой новый чат';
    appState.new_chat_activity = true;
    socket.emit('need-members', {});
}

export function updateNewChatContacts(data) {
    ui.new_chat_panel.innerHTML = '';
    appState.famous_users = data;

    let htmlContent = `
        <div class="search-chat-header">
            <button onclick="closeNewChat()" class="chat-panel-element btn-back close button" style="align-self: flex-end"><-</button>
            <input type="text" id="search-user" class="input-search" placeholder="Найти по нику...">
        </div>
        <div class="input-block">
            <p class="error" id="user-not-found" style="text-align: center;">Такого пользователя не существует</p>
        </div>
        <div class="chat-panel-element contacts-title">
            <h2 class="title">Известные контакты</h2>
        </div>`;

    for (let i = 0; i < data['members'].length; i++) {
        const [memberId, memberName] = data['members'][i];
        const cssClass = appState.users_selected.includes(Number(memberId)) ? 'active-user' : 'chat-panel-hover';
        htmlContent += `<button class="chat-panel-element ${cssClass}" onclick="new_chat_button_active(${memberId})">
            <h2 class="text">${memberName}</h2>
        </button>`;
    }

    ui.new_chat_panel.innerHTML += htmlContent;
}

export function new_chat_button_active(user_id) {
    appState.users_selected = [user_id];
    updateNewChatContacts(appState.famous_users);
}