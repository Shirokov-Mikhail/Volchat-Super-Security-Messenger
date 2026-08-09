// pages
const start_page = document.getElementById("start-page");
const chat_page = document.getElementById("chat-page");
const footer = document.getElementById("footer");

// x-bnt and form in start page
const register_button = document.getElementById("register-btn");
const register_form = document.getElementById("register");
const x_register = document.getElementById("close-register");
const auth_btn = document.getElementById("auth-btn");
const auth_form = document.getElementById("autorisi");
const x_close = document.getElementById("close_auth");

// основные элементы главной страницы
const contacts = document.getElementById("contacts");

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
// тут элементы нового чата
const new_chat_panel = document.getElementById("new-chat-panel");

// подгрузка чатов сервер сам поймет что сессии нет
let username_local = localStorage.getItem('username'); // имя пользователя
let user_id = localStorage.getItem('user_id');// id пользователя
let chats = [];// список чатов чтобы не приходилось заново подгружать
let user_key = localStorage.getItem('user_key'); // публичный ключ пользователя
let current_chat_id = -1;// текущий id чата все id больше 0 изначально чтобы не закртыть существующую комнату -1
let privatekey;// приватный ключ пользователя
let publickey;// публичный ключ собеседника
let helman_key; // симетричный ключ который будет сгенерирован из публичного и приватного
let new_chat_activity = false;// если идет создание нового чата то true
let users_selected = [];// выбранные пользователи при создании нового чат
let famous_users = [] // чтобы не подгружать заново контакты
let jwt_token = localStorage.getItem('jwt_token');// jwt ТОКЕН потом localStorage.getItem('jwt_token');

// а
const socket = io("http://127.0.0.1:5000", {auth: {token: jwt_token}});

// подгрузка чатов
socket.on('start-session', function (data) {
    if (data['status'] === 'success') {
        jwt_token = data['token'];
        localStorage.setItem('jwt_token', jwt_token);
        footer.style.display = "none";
        start_page.style.display = "none";

        chat_page.style.display = "flex";
        contacts.textContent = ''
        contacts.innerHTML = '<div class="chat-panel-element">\n' +
            '      <h2 class="title">Чаты</h2>\n' +
            '    </div>'
        for (let key in data['clients']) {
            chats.push(data['clients'][key]);
            contacts.innerHTML += `<button onclick="openChat(${data['clients'][key][0]}, ${key})" class="chat-panel-element chat-panel-hover">
      <p class="text">${data['clients'][key][1]}</p> </button>`;
        }
        contacts.innerHTML += `<button class="chat-panel-element chat-panel-hover" id="new-chat-btn" onclick="newChat()">
      <p class="text">Новый чат +</p>
    </button>`
    }
});


//проверка для авторизации
function auth() {
    if (email_auth.value !== '' && password_auth.value !== '') {
        socket.emit('auth', {
            'login': email_auth.value,
            'token':jwt_token
        })
    }

}

// авторизация
socket.on('auth', function (data) {
    if (data['status'] === 'success' && user_id !== NaN) {
        console.log(data);
        email_auth.style.borderColor = 'black';
        auth_error.style.display = 'none';
        let user_local_id = data['id']

        // тут должен быть вызов функции расшифровки текста
        if (test_messages === 'hello world') {

            auth_pass_error.style.display = 'none';
            password_auth.style.borderColor = 'black';
            user_key = key
            user_id = data['id']
            localStorage.setItem('user_key', user_key);
            localStorage.setItem('user_id', user_id);
            username_local = email_auth.value
            localStorage.setItem('username', username_local)
            socket.emit('start-session', {'status': 'success', 'id': user_local_id, 'login': username_local, 'token':jwt_token})
        } else {
            auth_pass_error.style.display = 'block';
            password_auth.style.borderColor = 'red';
        }
    } else {
        auth_error.style.display = 'block';
        email_auth.style.borderColor = 'red';
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
            'token':jwt_token
        })
    } else if (password_1.value !== password_2.value) {
        password_1.style.borderColor = 'red';
        password_2.style.borderColor = 'red';
        password_repeat_error.style.display = 'block';
    }
}

socket.on('registration-check', function (data) {
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
            'test-message': 'hello world',
            'token':jwt_token
        })
    } else {
        login.style.borderColor = 'red';
        login_error.style.display = 'block';
    }
})
socket.on('registration', function (data) {
    if (data['status'] === 'success') {
        user_id = data['id']
        localStorage.setItem('user_id', user_id);
        socket.emit('start-session', {'status': 'success', 'id': user_id, 'login': username_local, 'token':jwt_token})
    }
})

// запрос на сервер для получения сообщений
function loadChat(chat_id) {
    console.log(current_chat_id)
    socket.emit('load-chat', {
        'chat_id': chat_id,
        'user_id': user_id,
        'old_chat_id': current_chat_id,
        'token':jwt_token
    });
    current_chat_id = chat_id
}

socket.on('load-chat', function (data) {
    if (data['status'] === 'success' && !new_chat_activity) {
        chat_page.style.display = 'flex'
        username.textContent = data['friend_login'];

        const into = data['into'] || [];
        const out = data['out'] || [];

        const all_messages = data['all'] || [];
        send_message.value = '';
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

    }
})

function send_messages() {
    if (send_message.value !== '' && current_chat_id !== -1) {
        console.log(send_message.value);
        let message = send_message.value;
        // шифруем сообщение

        // на публичный ключ союеседника

        socket.emit('send-message', {
            'message': message,
            'user_id': user_id,
            'chat_id': current_chat_id,
            'token':jwt_token
        })
    }
}


// все что ниже нужно переписать
// как оказалось не трогай то что работает хорошо
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
            contacts.innerHTML += `<button onclick="openChat(${chats[key][0]}, ${key})" class="chat-panel-element active-chat">
      <p class="text">${chats[key][1]}</p> </button>`;
        } else {
            contacts.innerHTML += `<button onclick="openChat(${chats[key][0]}, ${key})" class="chat-panel-element chat-panel-hover">
      <p class="text">${chats[key][1]}</p> </button>`;
        }
    }
    contacts.innerHTML += `<button class="chat-panel-element chat-panel-hover" id="new-chat-btn" onclick="newChat()">
      <p class="text">Новый чат +</p>
    </button>`

}

// до сюда примерно Ну уже не буду

function closeNewChat() {
    new_chat_panel.style.display = "none";
    new_chat_activity = false
    users_selected = []
    send_message.value = '';
    username.textContent = ''
    openChat(-1, -1)
}

function newChat() {
    console.log('asd new chat')
    new_chat_panel.style.display = "flex"
    start_panel.style.display = "none"
    main_chat_panel.style.filter = "none";
    messages_list.innerHTML = ''
    username.textContent = 'Твой новый чат'
    send_message.value = 'Твой новый чат'
    new_chat_activity = true
    socket.emit('need-members', {})
}
function updateNewChatContacts(data) {
    new_chat_panel.innerHTML = ''
    famous_users = data
    let htmlContent = `
        <!-- Шапка: кнопка назад и поиск -->
        <div class="search-chat-header">
                <button onclick="closeNewChat()" class="chat-panel-element btn-back close button" style="align-self: flex-end">
                   <-
                </button>
                <input type="text" id="search-user" class="input-search" placeholder="Найти по нику...">
            </div>
<!--            <div class="search-chat-header">-->
<!--                <button onclick="closeNewChat()" class="chat-panel-element btn-back">-->
<!--                    <p class="text"><-</p>-->
<!--                </button>-->
<!--                <input type="text" id="search-user" class="input-search" placeholder="Найти по нику...">-->
<!--            </div>-->

            <!-- Блок ошибки -->
            <div class="input-block">
                <p class="error" id="user-not-found" style="text-align: center;">Такого пользователя не существует</p>
            </div>

            <!-- Заголовок списка -->
            <div class="chat-panel-element contacts-title">
                <h2 class="title">Известные контакты</h2>
            </div>

            <!-- Список известных контактов -->`;

    for (let i = 0; i < data['members'].length; i++) {
        if (users_selected.includes(Number(data['members'][i][0]))) {
            htmlContent += `<button class="chat-panel-element active-user" onclick="new_chat_button_active(${data['members'][i][0]})">
                
                <h2 class="text">${data['members'][i][1]}</h2>
            </button>`
        } else {
            htmlContent += `<button class="chat-panel-element chat-panel-hover" onclick="new_chat_button_active(${data['members'][i][0]})">
                
                <h2 class="text">${data['members'][i][1]}</h2>
            </button>`
        }

        //<img src="../../static/image/logo.png" alt="Волчат">
    }
    new_chat_panel.innerHTML += htmlContent;
}

socket.on('need-members', function (data) {
    if (data['status'] === 'success') {
        updateNewChatContacts(data)
    }
})
socket.on('make_new_chat', function (data) {
    if (data['status'] === 'success') {
        //   const newDiv = `<button onclick="openChat(${data['chat_id']}, -1)" class="chat-panel-element">
        // <p class="text">${data['chat_name']}</p> </button>`
        //   contacts.insertAdjacentHTML('beforeend', newDiv);
        chats.push([data['chat_id'], data['chat_name']])
        openChat(data['chat_id'], chats.length - 1)
    }
})
// для создания нового чата
function new_chat_button_active(user_id) {
    users_selected = [user_id]
    console.log(famous_users)
    updateNewChatContacts(famous_users)
    // if (user_id in users_selected)
    // {users_selected.splice(users_selected.indexOf(user_id), 1);}
    // else{
    //     users_selected.push(user_id)
    // }

}
// при поступлении нового сообщения
socket.on('new-message', function (data) {
    if (data['status'] === 'success') {
        // перед этим data['text'] нужно как то дешифровать
        if (data['author_id'] === user_id) {
            const htmlContent = `<div class="message right">
            <img class="message-img" src="../../static/image/logo.png" alt="Волчат">
            <div class="message-content">
                <p class="text">${data['text']}</p>
                <p class="text time">00:00</p>
            </div>
        </div>`;

            messages_list.insertAdjacentHTML('beforeend', htmlContent)
        } else if (data['author_id'] !== user_id) {
            const htmlContent = `<div class="message left">
            <img class="message-img" src="../../static/image/logo.png" alt="Волчат">
            <div class="message-content">
                <p class="text">${data['text']}</p>
                <p class="text time">00:00</p>
            </div>
        </div>`;
            messages_list.insertAdjacentHTML('beforeend', htmlContent)
            //Исправить ошубку конвертации из String to Element
        } else {
            console.log('предятинка');
        }
        const scrollContainer = document.getElementById('messages');

        setTimeout(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 10);
    } else {
        console.log('Error in 394 line')
    }
})
async function loadToken() {
    const response = await fetch('http://127.0.0.1:5000/login', {method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({user_id: user_id, username})})
    console.log(response)
}
socket.on('need-new-access-token', () => {


})
socket.on('need-access-token', function (data) {
    if (data['status'] === 'success' && user_id !== NaN) {
        console.log(data);
        email_auth.style.borderColor = 'black';
        auth_error.style.display = 'none';
        let user_local_id = data['id']// потом станет глобальной
        let key = data['private-key'];
        let public_key = data['public-key'];// потом станет глобальной
        let nonce = data['nonce'];
        let login = data['login'];
        // тут расшифровали key получили чистый приватный ключ

        // тут
        generateSignature(nonce, key).then(function(signature) {

            // ВЕСЬ код, которому нужна подпись, пишется только ЗДЕСЬ
            console.log("Подпись успешно создана!", signature);
            socket.emit('verify_signature', {
                login: login,
                sig: signature,
                public_key: public_key
            });

        }).catch(function(error) {
            // Если произошла ошибка (например, неверный ключ)
            console.error("Что-то пошло не так:", error);
        });
        // // тут должен быть вызов функции расшифровки текста
        // if (test_messages === 'hello world') {
        //
        //     auth_pass_error.style.display = 'none';
        //     password_auth.style.borderColor = 'black';
        //     user_key = key
        //     user_id = data['id']
        //     localStorage.setItem('user_key', user_key);
        //     localStorage.setItem('user_id', user_id);
        //     username_local = email_auth.value
        //     localStorage.setItem('username', username_local)
        //     socket.emit('', {'status': 'success', 'id': user_local_id, 'login': username_local, 'token':jwt_token})
    //     } else {
    //         auth_pass_error.style.display = 'block';
    //         password_auth.style.borderColor = 'red';
    //     }
    // } else {
    //     auth_error.style.display = 'block';
    //     email_auth.style.borderColor = 'red';
    //     console.log(data['status']);
    // }
        }

})
// Подписи
// Вспомогательная функция: переводит сырые байты (ArrayBuffer) в строку Base64
function arrayBufferToBase64(buffer) {
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
async function generateSignature(dataString, privateKey) {
    try {
        // 1. Кодируем текст в сырые байты, так как криптография работает только с байтами
        const encoder = new TextEncoder();
        const dataBytes = encoder.encode(dataString);

        // 2. Ставим подпись с помощью встроенного движка браузера
        const signatureBuffer = await window.crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: { name: "SHA-256" },
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
// кнопки

document.addEventListener("keydown", (event) => {
    switch (event.code) {
        case 'Escape':
            break
        case 'Enter':
            if (!new_chat_activity) {
                send_messages()
            } else {
                console.log('user', user_id)
                socket.emit('make_new_chat', {
                    'users': users_selected,
                    'user_id': Number(user_id),
                    'name': send_message.value,
                    'token':jwt_token
                })

                closeNewChat()

            }
            break
    }
})
send_button.addEventListener('click', (event) => {
    if (!new_chat_activity) {
        send_messages()
    } else {
        console.log('user', user_id)
        socket.emit('make_new_chat', {
            'users': users_selected,
            'user_id': Number(user_id),
            'name': send_message.value,
            'token':jwt_token
        })

        closeNewChat()

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
send_message.addEventListener('input', (event) => {
    if (new_chat_activity) {
        username.textContent = send_message.value;
    }
})
