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
let username_local = localStorage.getItem('username') || undefined; // имя пользователя
let user_id = localStorage.getItem('user_id') || undefined;// id пользователя
let chats = [];// список чатов чтобы не приходилось заново подгружать
let user_key = localStorage.getItem('user_key') || undefined; // публичный ключ пользователя
let current_chat_id = -1;// текущий id чата все id больше 0 изначально чтобы не закртыть существующую комнату -1
let privatekey = localStorage.getItem('private') || undefined;// приватный ключ пользователя
let publickey;// публичный ключ собеседника
let helman_key; // симетричный ключ который будет сгенерирован из публичного и приватного
let new_chat_activity = false;// если идет создание нового чата то true
let users_selected = [];// выбранные пользователи при создании нового чат
let famous_users = [] // чтобы не подгружать заново контакты
let jwt_token = localStorage.getItem('jwt_token') || undefined;// jwt ТОКЕН потом localStorage.getItem('jwt_token');
let iv = localStorage.getItem('iv') || undefined; // вектор инициализации
// а
const socket = io("http://127.0.0.1:5000", {auth: {token: jwt_token}, login: username_local});

// подгрузка чатов
socket.on('start-session', function (data) {
    if (data['status'] === 'success') {
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
        if (jwt_token === undefined) {
            jwt_token = localStorage.getItem('jwt_token') || '';
        }
        socket.emit('auth', {
            'token':jwt_token,
            'login': email_auth.value

        })
    }

}

// авторизация
socket.on('auth',async function (data) {
    if (data['status'] === 'success' && user_id !== undefined) {
        console.log('data');
        email_auth.style.borderColor = 'black';
        auth_error.style.display = 'none';
        auth_pass_error.style.display = 'none';
        password_auth.style.borderColor = 'black';
        user_key = data['public']/*Свой публичный ключ*/
        user_id = data['id']
        if (privatekey === undefined) {
            privatekey = await decryptPrivateKey(data['private'], data['iv'], user_id, password_auth.value);
            localStorage.setItem('private', privatekey);
        }
        iv = data['iv']
        localStorage.setItem('iv', iv);
        localStorage.setItem('user_key', user_key);
        localStorage.setItem('user_id', user_id);
        if (email_auth.value !== '' && username_local !== undefined) {
            username_local = email_auth.value
            localStorage.setItem('username', username_local)
        }
        console.log('next step', typeof jwt_token)
        socket.emit('start-session', {'status': 'success', 'token':jwt_token, 'id': user_id, 'login': username_local})
        }
     else {
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
        // тут генераци ключей в переменную user_key и своего публичного в локалюную public_key_local
        const keyPair = await generateKeyPair();
        const keys = await extractKeys(keyPair);
        user_key = keys.originalPublicKey;
        privatekey = keys.originalPrivateKey;
        localStorage.setItem('private', privatekey);
        // let public_key_local = ''
        // user_key = '';
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
        localStorage.setItem('user_key', user_key);
        console.log('da', {
            'user_key': user_key,
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
// socket.on('need-new-access-token', () => {
//
//
// })
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

        console.log('yes', user_local_id, public_key, nonce, iv, login, privatekey);

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
            console.log('мы у подписи')

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
                    'token':jwt_token
                })
            } else {
                console.error("Ошибка входа:", result);
            }

        } catch (error) {
            console.error("Что-то пошло не так (ошибка криптографии или сети):", error);
        }
    }
});
// Конвертирует ключ чата (ECDH) в ключ для подписи (ECDSA)
async function convertKeyForSigning(ecdhPrivateKey) {
    // 1. Выгружаем сырые байты приватного ключа
    const rawBytes = await window.crypto.subtle.exportKey("pkcs8", ecdhPrivateKey);

    // 2. Импортируем те же байты, но уже с алгоритмом ECDSA и правом на подпись
    return await window.crypto.subtle.importKey(
        "pkcs8",
        rawBytes,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"]
    );
}
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
            { name: "PBKDF2" },
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
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt"]
        );

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encryptedPrivateKeyBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
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
            { name: "PBKDF2" },
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
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );

        const encryptedBytes = base64ToUint8Array(encryptedKeyBase64);
        const iv = base64ToUint8Array(ivBase64);

        const decryptedPrivateKeyBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            encryptedBytes
        );

        // Возвращаем полноценный CryptoKey для Хеллмана
        return await window.crypto.subtle.importKey(
            "pkcs8",
            decryptedPrivateKeyBuffer,
            { name: "ECDH", namedCurve: "P-256" },
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
            { name: "ECDH", namedCurve: "P-256" },
            true,
            []
        );
    }
