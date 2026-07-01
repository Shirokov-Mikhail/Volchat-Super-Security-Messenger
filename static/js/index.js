// pages
const start_page = document.getElementById("start-page");
const chat_page = document.getElementById("chat-page");



const register_button = document.getElementById("register-btn");
const register_form = document.getElementById("register");
const x_register = document.getElementById("close-register");
const auth_btn = document.getElementById("auth-btn");
const auth_form = document.getElementById("autorisi");
const x_close = document.getElementById("close_auth");


const contacts = document.getElementById("contacts");

// Пока не используется
const username = document.getElementById("name");
const messages_list = document.getElementById("messages");
const send_button = document.getElementById("send-button");
const send_message = document.getElementById("send-message");

const start_panel = document.getElementById("start-panel");
const main_chat_panel = document.getElementById("chat-panel");

//элементы x - овой авторизации
const email_auth = document.getElementById("email_auth");
const password_auth = document.getElementById("password_auth");
const submit_auth = document.querySelectorAll(".button-auth");
const auth_error = document.getElementById('auth_error')
const auth_pass_error = document.getElementById("auth_pass_error");

// x - овая регистрация
const login = document.getElementById("login");
const register_btn = document.querySelectorAll(".button-registation");
const password_1 = document.getElementById("password");
const password_2 = document.getElementById("password-repeat");
const login_error = document.getElementById("reg-error");
const password_repeat_error = document.getElementById("password-error");

// подгрузка чатов сервер сам поймет что сессии нет
let username_local;
let user_id;
let chats = [];
let user_key;
let current_chat_id;
let privatekey;
let publickey;
let active_chat_id;
// подгрузка чатов
const socket = io("http://127.0.0.1:5000");
socket.on('start-session', function(data) {
    if (data['status'] === 200){
        start_page.style.display = "none";

        chat_page.style.display = "flex";
        contacts.textContent = ''
        contacts.innerHTML = '<div class="chat-panel-element">\n' +
            '      <h2 class="title">Чаты</h2>\n' +
            '    </div>'
        console.log("Message from server:", data);
        console.log(data['clients']);
        for (let key in data['clients']) {
            chats.push(data['clients'][key]);
            console.log(data['clients'][key]);
            contacts.innerHTML += `<button onclick="openChat(${data['clients'][key][0]}, ${key})" class="chat-panel-element">
      <p class="text">${data['clients'][key][1]}</p> </button>`;
        }
        contacts.innerHTML += `<button class="chat-panel-element" id="new-chat-btn">
      <p class="text">Новый чат +</p>
    </button>`
    }
});


//проверка для авторизации
function auth() {
    if (email_auth.value !== '' && password_auth.value !== '') {
        socket.emit('auth', {
            'login': email_auth.value,
        })
    }

}
// авторизация
socket.on('auth', function(data) {
    if (data['status'] === 'success' && user_id !== NaN){
        console.log(data);
        email_auth.style.borderColor='black';
        auth_error.style.display = 'none';
        let user_local_id = data['id']
        let test_messages = data['key-verifi'];
        let key = data['key'];
        // тут должен быть вызов функции расшифровки текста
        if (test_messages === 'hello world') {

            auth_pass_error.style.display = 'none';
            password_auth.style.borderColor='black';
            user_key = key
            user_id = data['id']
            username_local = email_auth.value
            socket.emit('start-session', {'status': 'success', 'id': user_local_id, 'login': username_local})
        }
        else{
            auth_pass_error.style.display = 'block';
            password_auth.style.borderColor='red';
        }
    }
    else {
        auth_error.style.display = 'block';
        email_auth.style.borderColor='red';
        console.log(data['status']);
    }
})
// проверка регистрации
function register() {
    if (login.value !== '' && password_1.value !== '' && password_2.value === password_1.value && username_local !== '' && password_1.value.length >= 8) {
        password_1.style.borderColor = 'black';
        password_2.style.borderColor = 'black';
        password_repeat_error.style.display = 'none';
        socket.emit('registration-check', {
            'login': login.value,
        })
    }else if (password_1.value !== password_2.value) {
        password_1.style.borderColor = 'red';
        password_2.style.borderColor = 'red';
        password_repeat_error.style.display = 'block';
    }
}
socket.on('registration-check', function(data) {
    if (data['status'] === 'success') {
        login.style.borderColor = 'black';
        login_error.style.display = 'none';
        // тут генераци ключей в переменную user_key и своего публичного в локалюную public_key_local
        let public_key_local = ''
        user_key = '';
        username_local = login.value;
        // тут зашифровываем hello world

        //тут шифруем приватный ключ на пароль

        // теперь если все успешно отпровляем снова емит но об регистрации

        socket.emit('registration', {
            'status': 'success',
            'login': username_local,
            'public_key': public_key_local,
            'private_key': user_key,
            'test-message': 'hello world'
        })
    }
    else {
        login.style.borderColor = 'red';
        login_error.style.display = 'block';
    }
})
socket.on('registration', function(data) {
    if (data['status'] === 'success') {
        user_id = data['id']
        socket.emit('start-session', {'status': 'success', 'id': user_id, 'login': username_local})
    }
})
function loadChat(chat_id) {
    current_chat_id = chat_id
    socket.emit('load-chat', {
        'chat_id': chat_id,
        'user_id': user_id});
}
socket.on('load-chat', function(data){
    if (data['status'] === 'success') {
        chat_page.style.display = 'flex'
        username.textContent = data['friend_login'];

        const into = data['into'] || [];
        const out = data['out'] || [];
        const all_messages = data['all'];
        // лютая сортировочка от мистера интелекта
        const allKeys = [...Object.keys(into), ...Object.keys(out)].sort((a, b) => a - b);

        let htmlContent = '';

        all_messages.forEach(key => {
            if (Boolean(key[1])) {
                htmlContent += `<div class="message right">
            <img class="message-img" src="../../static/image/logo.png" alt="Волчат">
            <div class="message-content">
                <p class="text">${key[0]}</p>
                <p class="text time">00:00</p>
            </div>
        </div>`;
            } else {
                htmlContent += `<div class="message left">
            <img class="message-img" src="../../static/image/logo.png" alt="Волчат">
            <div class="message-content">
                <p class="text">${key[0]}</p>
                <p class="text time">00:00</p>
            </div>
        </div>`;
            }
        });
        messages_list.innerHTML = htmlContent;

        const scrollContainer = document.getElementById('messages');

        setTimeout(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 10);
        setTimeout(updateChat, 10000)
    }
})

function send_messages() {
    if (send_message.value !== '' && active_chat_id) {
        console.log(send_message.value);
        let message = send_message.value;
        // шифруем сообщение

        // на публичный ключ союеседника
        socket.emit('send-message', {
            'message': message,
            'user_id': user_id,
            'chat_id': active_chat_id
        })
    }
}

// все что ниже нужно переписать

function openChat(all_id, id) {//id чата, id уже не помню чего;
    console.log(all_id, id);
    start_panel.style.display = "none";
    main_chat_panel.style.filter = "none";
    main_chat_panel.style.pointerEvents = 'auto'
    main_chat_panel.style.display = "block";
    contacts.textContent = ''
    contacts.innerHTML = '<div class="chat-panel-element">\n' +
        '      <h2 class="title">Чаты</h2>\n' +
        '    </div>'
    console.log(chats)
    for (let key in chats) {
        console.log(id, key)
        if (Number(key) === Number(id)) {
            loadChat(Number(all_id));
            active_chat_id = all_id;
            contacts.innerHTML += `<button onclick="openChat(${chats[key][0]}, ${key})" class="chat-panel-element active-chat">
      <p class="text">${chats[key][1]}</p> </button>`;
        }
        else {
            contacts.innerHTML += `<button onclick="openChat(${chats[key][0]}, ${key})" class="chat-panel-element">
      <p class="text">${chats[key][1]}</p> </button>`;
        }
    }
    contacts.innerHTML += `<button class="chat-panel-element" id="new-chat-btn">
      <p class="text">Новый чат +</p>
    </button>`

}
function clearMessages(){
    if(active_chat_id){

    }
}

// до сюда примерно
function updateChat(){
    loadChat(current_chat_id)
    setTimeout(updateChat, 10000)
}
// кнопки
document.addEventListener("keydown", (event) => {
    switch (event.code) {
        case 'Escape':
            break
        case 'Enter':
            break
    }
})
send_button.addEventListener('click', (event) => {
    send_messages()
})

submit_auth.forEach((button) => {
    button.addEventListener('click', (event) => {
        auth();
    })
})
register_btn.forEach((button) => {
    button.addEventListener('click', (event) => {
        register();
    })
})

register_button.addEventListener("click", () => {
    register_form.style.display = "flex";
})
x_register.addEventListener("click", () => {
    register_form.style.display = "none";
    auth_btn.style.display = "block";
})
auth_btn.addEventListener("click", () => {

    auth_form.style.display = "flex";
})
x_close.addEventListener("click", () => {
    auth_form.style.display = "none";


})
