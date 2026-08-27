// index.js
import { appState } from './state.js';
import { ui } from './ui.js';
import { socket } from './socket.js';

import {
    handleStartSession,
    handleAuth,
    handleRegistrationCheck,
    handleRegistration,
    handleLoadChat,
    handleNewMessage,
    handleUpdateToken,
    handleNeedAccessToken,
    handleNeedMembers,
    handleMakeNewChat
} from './socket-handlers.js';

import {
    openChat,
    closeNewChat,
    newChat,
    new_chat_button_active,
    makeNewChat,
    send_messages
} from './actions.js';

// доступ из onclick="..." в HTML
window.openChat = openChat;
window.newChat = newChat;
window.closeNewChat = closeNewChat;
window.new_chat_button_active = new_chat_button_active;

socket.on('start-session', handleStartSession);
socket.on('auth', handleAuth);
socket.on('registration-check', handleRegistrationCheck);
socket.on('registration', handleRegistration);
socket.on('load-chat', handleLoadChat);
socket.on('new-message', handleNewMessage);
socket.on('update-token', handleUpdateToken);
socket.on('need-access-token', handleNeedAccessToken);
socket.on('need-members', handleNeedMembers);
socket.on('make_new_chat', handleMakeNewChat);

document.addEventListener("keydown", (event) => {
    if (event.code !== 'Enter') return;

    if (!appState.new_chat_activity) {
        send_messages();
    } else {
        makeNewChat();
        closeNewChat();
    }
});

ui.send_message.addEventListener('input', () => {
    if (appState.new_chat_activity) {
        ui.username.textContent = ui.send_message.value;
    }
});