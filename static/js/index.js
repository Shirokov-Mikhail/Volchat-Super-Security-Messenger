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
const username = document.getElementById("name");
const messages_list = document.getElementById("messages-list");
const send_button = document.getElementById("send-button");
const send_message = document.getElementById("send-message");
const start_panel = document.getElementById("start-panel");
const main_chat_panel = document.getElementById("chat-panel");


const error_class = document.querySelectorAll('.error');

//элементы x - овой авторизации
const email_auth = document.getElementById("email_auth");
const password_auth = document.getElementById("password_auth");
const submit_auth = document.querySelectorAll(".button-auth");

// x - овая регистрация
const login = document.getElementById("login");
const register_btn = document.querySelectorAll(".button-registation");
const password_1 = document.getElementById("password");
const password_2 = document.getElementById("password-repeat");


// подгрузка чатов сервер сам поймет что сессии нет
let username_local;
let user_id;
let chats = [];
let user_key;
let publickey;

const socket = io("http://127.0.0.1:5000");
socket.on('start-session', function(data) {
    if (data['status'] === 200){
        start_page.style.display = "none";

        chat_page.style.display = "block";
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



function auth() {
    if (email_auth.value !== '' && password_auth.value !== '') {
        console.log(123)
        socket.emit('auth', {
            'login': email_auth.value,
        })
    }

}
socket.on('auth', function(data) {
    if (data['status'] === 'success'){

        let user_local_id = data['id']
        let test_messages = data['key-verifi'];
        let key = data['key'];
        // тут должен быть вызов функции расшифровки текста
        if (test_messages === 'hello world') {
            user_key = key
            user_id = data['id']
            username_local = email_auth.value
            socket.emit('start-session', {'status': 'success', 'id': user_local_id, 'login': username_local})
        }
    }

    else {
        error_class.forEach((element) => {
            element.style.display = 'flex'
        });
        console.log(data['status']);
    }
})
function register() {
    if (login.value !== '' && password_1.value !== '' && password_2.value === password_1.value && username_local !== '' && password_1.value.length >= 8) {
        socket.emit('registration-check', {
            'login': login.value,
        })
    }
}
socket.on('registration-check', function(data) {
    if (data['status'] === 'success') {
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
})
// все что ниже нужно переписать
function loadChat(chat_id) {
    socket.emit('load-chat', {

        'chat_id': chat_id});

}
function openChat(all_id, id) {
    console.log(all_id, id);
    start_panel.style.display = "none";
    main_chat_panel.style.filter = "none";
    main_chat_panel.style.pointerEvents = 'auto'
    contacts.textContent = ''
    contacts.innerHTML = '<div class="chat-panel-element">\n' +
        '      <h2 class="title">Чаты</h2>\n' +
        '    </div>'
    for (let key in chats) {
        console.log(id, key)
        if (Number(key) === Number(id)) {
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

}

// до сюда примерно
document.addEventListener("keydown", (event) => {
    switch (event.code) {
        case 'Escape':
            clearMessages()
            break

    }
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
