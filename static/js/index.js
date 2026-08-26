import {
    saveDecryptedKeyToLocal,
    generateKeyPair,
    extractKeys,
    decryptPrivateKey,
    deriveSharedAESKey,
    importFriendPublicKey,
    encryptChatMessage,
    decryptChatMessage,
    loadDecryptedKeyFromLocal,
    encryptPrivateKey
} from './crypto.js';
import {convertKeyForSigning, arrayBufferToBase64, generateSignature} from './ECDSA.js';
// import {authorization, registrations} from "./registartion&auth";
// import {start_chat_session} from "./chat-session"

window.openChat = openChat;
window.newChat = newChat;
window.closeNewChat = closeNewChat;
window.new_chat_button_active = new_chat_button_active;
// pages
const start_page = document.getElementById("start-page");
const chat_page = document.getElementById("chat-page");
const footer = document.getElementById("footer");

// // x-bnt and form in start page
// const register_button = document.getElementById("register-btn");
// const register_form = document.getElementById("register");
// const x_register = document.getElementById("close-register");
// const auth_btn = document.getElementById("auth-btn");
// const auth_form = document.getElementById("autorisi");
// const x_close = document.getElementById("close_auth");

// основные элементы главной страницы
const contacts = document.getElementById("contacts");
const gradientBox = document.querySelector('.gradient-image');
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

const chat_panel_additionl_elements = {
    'start':'<div class="chat-panel-element center">\n' +
        // '<button class="close button input-type-button" id="setings"><img src="../../static/image/setting-3.png" class="message-img"  class="message-img" style="width: 30px !important; height: 30px !important;"></button>\n' +
        '<h2 class="title">Чаты</h2>\n' +
        '    </div>',
    'end': `<button class="chat-panel-element chat-panel-hover center to-bottom" id="new-chat-btn" onclick="newChat()">
      <p class="text medium">Новый чат +</p>
    </button>`
}

// подгрузка чатов сервер сам поймет что сессии нет
export let username_local = localStorage.getItem('username') || undefined; // имя пользователя
export let user_id = localStorage.getItem('user_id') || undefined;// id пользователя
export let chats = [];// список чатов чтобы не приходилось заново подгружать
export let publickey = localStorage.getItem('user_key') || undefined; // публичный ключ пользователя
export let current_chat_id = -1;// текущий id чата все id больше 0 изначально чтобы не закртыть существующую комнату -1
export let privatekey = undefined;// приватный ключ пользователя
export let companion_key;// публичный ключ собеседника
export let helman_key; // симетричный ключ который будет сгенерирован из публичного и приватного
export let new_chat_activity = false;// если идет создание нового чата то true
export let users_selected = [];// выбранные пользователи при создании нового чат
export let famous_users = [] // чтобы не подгружать заново контакты
export let jwt_token = localStorage.getItem('jwt_token') || '';// jwt ТОКЕН потом localStorage.getItem('jwt_token');
export let iv = localStorage.getItem('iv') || undefined; // вектор инициализации
// а
console.log(localStorage)
const socket = io("http://127.0.0.1:5000", {auth: {token: jwt_token}, login: username_local});

// подгрузка чатов
socket.on('start-session', function (data) {
    if (data['status'] === 'success') {
        footer.style.display = "none";
        start_page.style.display = "none";

        chat_page.style.display = "flex";
        contacts.textContent = ''
        contacts.innerHTML = '<div class="chat-panel-element center">\n' +
            // '<button class="close button input-type-button" id="setings"><img src="../../static/image/setting-3.png" class="message-img"  class="message-img" style="width: 30px !important; height: 30px !important;"></button>\n' +
            '<h2 class="title">Чаты</h2>\n' +
            '    </div>'
        for (let key in data['clients']) {
            chats.push(data['clients'][key]);
            contacts.innerHTML += `<button onclick="openChat(${data['clients'][key][0]}, ${key})" class="chat-panel-element chat-panel-hover">
<img class="message-img user-img" src="../../static/image/logo.png" alt="Волчат">
      
      <p class="text medium">${data['clients'][key][1]}</p> </button>`;
        }
        contacts.innerHTML += `<button class="chat-panel-element chat-panel-hover center to-bottom" id="new-chat-btn" onclick="newChat()">
      <p class="text medium">Новый чат +</p>
    </button>`
    }
});


//проверка для авторизации
export function auth() {
    if (email_auth.value !== '' && password_auth.value !== '') {
        socket.emit('auth', {
            'token': jwt_token,
            'login': email_auth.value

        })
    }

}

// авторизация
socket.on('auth', async function (data) {
    if (data['status'] === 'success') {
        console.log('data');
        email_auth.style.borderColor = 'black';
        auth_error.style.display = 'none';
        auth_pass_error.style.display = 'none';
        password_auth.style.borderColor = 'black';
        publickey = data['public']/*Свой публичный ключ*/
        user_id = data['id']
        if (privatekey === undefined) {
            privatekey = await loadDecryptedKeyFromLocal()
        } else {
            console.log(privatekey);
        }
        iv = data['iv']
        localStorage.setItem('iv', iv);
        localStorage.setItem('user_key', publickey);
        localStorage.setItem('user_id', user_id);
        if (email_auth.value !== '' && username_local !== undefined) {
            username_local = email_auth.value
            localStorage.setItem('username', username_local)
        }
        console.log('next step', typeof jwt_token)
        socket.emit('start-session', {'status': 'success', 'token': jwt_token, 'id': user_id, 'login': username_local})
    } else {
        auth_error.style.display = 'block';
        email_auth.style.borderColor = 'red';
        console.log(data['status']);
    }
})

// проверка регистрации
export function register() {
    if (login.value !== '' && password_1.value !== '' && password_2.value === password_1.value && username_local !== '' && password_1.value.length >= 8) {
        password_1.style.borderColor = 'black';
        password_2.style.borderColor = 'black';
        password_repeat_error.style.display = 'none';
        socket.emit('registration-check', {
            'login': login.value
        })
    } else if (password_1.value !== password_2.value) {
        password_1.style.borderColor = 'red';
        password_2.style.borderColor = 'red';
        password_repeat_error.style.display = 'block';
    }
}

socket.on('registration-check', async function (data) {
    if (data['status'] === 'success') {

        login.style.borderColor = 'black';
        login_error.style.display = 'none';
        // тут генераци ключей в переменную publickey и своего публичного в локалюную public_key_local
        const keyPair = await generateKeyPair();
        const keys = await extractKeys(keyPair);
        publickey = keys.originalPublicKey;
        privatekey = keys.originalPrivateKey;
        await saveDecryptedKeyToLocal(privatekey);
        // let public_key_local = ''
        // publickey = '';
        user_id = data['user_id']
        username_local = login.value;

        // версия для базы данных
        const publicKeyForDB = keys.publicKeyJWK;
        // тут зашифровываем hello world

        //тут шифруем приватный ключ на пароль
        console.log(keys.privateKeyBytes, user_id, String(password_1.value));
        const encryptedData = await encryptPrivateKey(keys.privateKeyBytes, user_id, String(password_1.value));
        // Зашифрованный приватный ключ (строка Base64) и его вектор
        const encryptedPrivateKeyForDB = encryptedData.encryptedKeyBase64;
        const privateKeyIvForDB = encryptedData.ivBase64;
        // теперь если все успешно отпровляем снова емит но об регистрации
        localStorage.setItem('username', username_local)
        localStorage.setItem('user_id', user_id);
        localStorage.setItem('user_key', publickey);
        console.log('da', {
            'user_key': publickey,
            'login': username_local,
            'public_key': publicKeyForDB,
            'private_key': encryptedPrivateKeyForDB,
            'iv': privateKeyIvForDB

        })
        socket.emit('registration', {
            'status': 'success',
            'login': username_local,
            'public_key': publicKeyForDB,
            'private_key': encryptedPrivateKeyForDB,
            'iv': privateKeyIvForDB

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
        // тут говорим что все оk и yes
        // socket.emit('start-session', {'status': 'success', 'id': user_id, 'login': username_local, 'token':jwt_token})
    }
})

// запрос на сервер для получения сообщений
export function loadChat(chat_id) {
    console.log(current_chat_id)
    socket.emit('load-chat', {
        'chat_id': chat_id,
        'user_id': user_id,
        'old_chat_id': current_chat_id,
        'token': jwt_token
    });
    current_chat_id = chat_id
}

socket.on('load-chat', async function (data) {
    if (data['status'] === 'success' && !new_chat_activity) {
        chat_page.style.display = 'flex'
        username.textContent = data['friend_login'];

        const into = data['into'] || [];
        const out = data['out'] || [];
        console.log(data, 'data');
        companion_key = await importFriendPublicKey(JSON.parse(data['friend_public']));
        console.log(companion_key, 'companion_key', privatekey, 'privatekey');
        await saveDecryptedKeyToLocal(privatekey);
        const all_messages = data['all'] || [];
        send_message.value = '';
        let htmlContent = '';
        helman_key = await deriveSharedAESKey(privatekey, companion_key)
        let message;
        for (let i = 0; i < all_messages.length; i++) {
            message = await decryptChatMessage(helman_key, all_messages[i][0], all_messages[i][2]);
            if (Boolean(all_messages[i][1])) {
                // Свое сообщение (отправленное) — меняем left на right
                htmlContent += `<div class="message right">
    <img class="message-img" src="../../static/image/logo.png" alt="Волчат">
    <div class="message-content right">
        <p class="text">${message}</p>
        <p class="text time">00:00</p>
    </div>
</div>`;
            } else {
                // Чужое сообщение (полученное) — меняем right на left
                htmlContent += `<div class="message left">
    <img class="message-img" src="../../static/image/logo.png" alt="Волчат">
    <div class="message-content left">
        <p class="text">${message}</p>
        <p class="text time">00:00</p>
    </div>
</div>`;
            }
        }
        messages_list.innerHTML = htmlContent;

        const scrollContainer = document.getElementById('messages');

        setTimeout(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }, 10);

    }
})

export async function send_messages() {
    if (send_message.value !== '' && current_chat_id !== -1) {
        // шифруем сообщение

        let message = await encryptChatMessage(helman_key, send_message.value);
        // на общий союеседника
        console.log(message, 'message');
        socket.emit('send-message', {
            'message': message.cipherTextBase64,
            'iv': message.ivBase64,
            'user_id': user_id,
            'chat_id': current_chat_id,
            'token': jwt_token
        })
    }
}


// все что ниже нужно переписать
// как оказалось не трогай то что работает хорошо
export function openChat(all_id, id) {//id чата, id уже не помню чего;

    start_panel.style.display = "none";
    main_chat_panel.style.filter = "none";
    main_chat_panel.style.pointerEvents = 'auto'
    main_chat_panel.style.display = "block";
    contacts.textContent = ''
    contacts.innerHTML = chat_panel_additionl_elements.start
    for (let key in chats) {
        if (Number(key) === Number(id)) {
            loadChat(Number(all_id));
            contacts.innerHTML += `<button onclick="openChat(${chats[key][0]}, ${key})" class="chat-panel-element active-chat">
<img class="message-img user-img" src="../../static/image/logo.png" alt="Волчат">
      <p class="text medium">${chats[key][1]}</p> </button>`;
        } else {
            contacts.innerHTML += `<button onclick="openChat(${chats[key][0]}, ${key})" class="chat-panel-element chat-panel-hover">
<img class="message-img user-img" src="../../static/image/logo.png" alt="Волчат">
      <p class="text medium">${chats[key][1]}</p> </button>`;
        }
    }
    contacts.innerHTML += chat_panel_additionl_elements.end

}

// до сюда примерно Ну уже не буду

export function closeNewChat() {
    new_chat_panel.style.display = "none";
    new_chat_activity = false
    users_selected = []
    send_message.value = '';
    username.textContent = ''
    openChat(-1, -1)
}
export function makeNewChat(){
    console.log('user', user_id)
    socket.emit('make_new_chat', {
        'users': users_selected,
        'user_id': Number(user_id),
        'name': send_message.value,
        'token': jwt_token
    })
}
export function newChat() {

    new_chat_panel.style.display = "flex"
    start_panel.style.display = "none"
    main_chat_panel.style.filter = "none";
    messages_list.innerHTML = ''
    username.textContent = 'Твой новый чат'
    send_message.value = 'Твой новый чат'
    new_chat_activity = true
    socket.emit('need-members', {})

}

export function updateNewChatContacts(data) {
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

    updateNewChatContacts(famous_users)
    // if (user_id in users_selected)
    // {users_selected.splice(users_selected.indexOf(user_id), 1);}
    // else{
    //     users_selected.push(user_id)
    // }

}

// при поступлении нового сообщения
socket.on('new-message', async function (data) {
    if (data['status'] === 'success') {
        // перед этим data['text'] нужно как то дешифровать
        let text = await decryptChatMessage(helman_key, data['text'], data['iv'])
        if (data['author_id'] === user_id) {
            const htmlContent = `<div class="message right">
        <img class="message-img" src="../../static/image/logo.png" alt="Волчат">
            <div class="message-content">
                <p class="text">${text}</p>
                <p class="text time">00:00</p>
            </div>
        </div>`;

            messages_list.insertAdjacentHTML('beforeend', htmlContent)
        } else if (data['author_id'] !== user_id) {
            const htmlContent = `<div class="message left">
            <img class="message-img" src="../../static/image/logo.png" alt="Волчат">
            <div class="message-content">
                <p class="text">${text}</p>
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
    const response = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({user_id: user_id, username})
    })
    console.log(response)
}

socket.on('update-token', async () => {
    try {
        console.log("Обновление токена...");
        const response = await fetch('http://127.0.0.1:5000/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'user_id': user_id,
                'login': username_local,
                'token': jwt_token,
                'type': 'access'
            })
        });

        const result = await response.json();
        console.log("Ответ сервера:", result);

        if (response.ok && result.access_token) {
            jwt_token = result.access_token;

            localStorage.setItem('jwt_token', jwt_token);
            console.log("Токен успешно сохранен:", jwt_token);
            socket.emit('auth', {
                'login': username_local,
                'token': jwt_token
            })
        } else {
            console.error("Ошибка входа:", result);
        }

    } catch (error) {
        console.error("Что-то пошло не так (ошибка криптографии или сети):", error);
    }

})
socket.on('need-access-token', async function (data) {
    if (data['status'] === 'success') {
        email_auth.style.borderColor = 'black';
        auth_error.style.display = 'none';

        let user_local_id = data['id'];
        let key = data['private-key'];
        let public_key = data['public-key'];
        let nonce = data['nonce'];
        let iv = data['iv'];
        let login = data['login'];


        if (privatekey !== undefined && user_id !== undefined && user_id === user_local_id) {
            // Ключ уже есть в памяти (например, после регистрации)
            console.log("Используем ключ из памяти");
        } else {
            // Ключа нет, расшифровываем тот, что пришел из БД
            try {
                let activePrivateKey = await decryptPrivateKey(
                    key,
                    iv,
                    user_local_id, // Наша "соль" (логин)
                    password_auth.value
                );
                // Сохраняем расшифрованный ключ в память для работы чата
                privatekey = activePrivateKey;
                await saveDecryptedKeyToLocal(activePrivateKey);

                console.log("Ключ успешно расшифрован паролем!");
            } catch (error) {
                console.error("Ошибка расшифровки ключа (неверный пароль?):", error);
                auth_pass_error.style.display = 'block';
                password_auth.style.borderColor = 'red';
                return; // Прерываем процесс входа, пароль не подошел
            }
        }

        try {
            const signingKey = await convertKeyForSigning(privatekey);


            const signature = await generateSignature(nonce, signingKey);
            console.log("Подпись успешно создана!", signature);

            const response = await fetch('http://127.0.0.1:5000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user_local_id,
                    login: login,
                    sig: signature
                })
            });

            const result = await response.json();
            console.log("Ответ сервера:", result);

            if (response.ok && result.access_token) {
                jwt_token = result.access_token;

                localStorage.setItem('jwt_token', jwt_token);
                console.log("Токен успешно сохранен:", jwt_token);
                socket.emit('auth', {
                    'login': login,
                    'token': jwt_token
                })
            } else {
                console.error("Ошибка входа:", result);
            }

        } catch (error) {
            console.error("Что-то пошло не так (ошибка криптографии или сети):", error);
        }
    }
});

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
                    'token': jwt_token
                })

                closeNewChat()

            }
            break
    }
})

send_message.addEventListener('input', (event) => {
    if (new_chat_activity) {
        username.textContent = send_message.value;
    }
})

if (gradientBox) {
    gradientBox.addEventListener('mousemove', (e) => {
        const rect = gradientBox.getBoundingClientRect();

        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        const posX = 40 + (x * 20);
        const posY = 40 + (y * 20);

        gradientBox.style.backgroundPosition = `${posX}% ${posY}%`;
    });

    gradientBox.addEventListener('mouseleave', () => {
        gradientBox.style.backgroundPosition = '50% 50%';
    });
}

