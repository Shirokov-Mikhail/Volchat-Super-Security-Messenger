// ui.js
export const ui = {
    start_page: document.getElementById("start-page"),
    chat_page: document.getElementById("chat-page"),
    footer: document.getElementById("footer"),

    contacts: document.getElementById("contacts"),
    gradientBox: document.querySelector('.gradient-image'),
    username: document.getElementById("name"),
    messages_list: document.getElementById("messages"),
    send_button: document.getElementById("send-button"),
    send_message: document.getElementById("send-message"),

    start_panel: document.getElementById("start-panel"),
    main_chat_panel: document.getElementById("chat-panel"),

    email_auth: document.getElementById("email_auth"),
    password_auth: document.getElementById("password_auth"),
    submit_auth: document.querySelectorAll(".button-auth"),
    auth_error: document.getElementById('auth_error'),
    auth_pass_error: document.getElementById("auth_pass_error"),

    login: document.getElementById("login"),
    register_btn: document.querySelectorAll(".button-registation"),
    password_1: document.getElementById("password"),
    password_2: document.getElementById("password-repeat"),
    login_error: document.getElementById("reg-error"),
    password_repeat_error: document.getElementById("password-error"),

    new_chat_panel: document.getElementById("new-chat-panel"),
};

// Раньше дублировалось: захардкожено в socket.on('start-session')
// и одновременно жило здесь для openChat. Теперь один источник.
export const chat_panel_additionl_elements = {
    start: `<div class="chat-panel-element center">
        <h2 class="title">Чаты</h2>
    </div>`,
    end: `<button class="chat-panel-element chat-panel-hover center to-bottom" id="new-chat-btn" onclick="newChat()">
        <p class="text medium">Новый чат +</p>
    </button>`
};