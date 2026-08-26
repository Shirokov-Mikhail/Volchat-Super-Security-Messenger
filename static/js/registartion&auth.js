import {
    encryptPrivateKey,
    extractKeys,
    generateKeyPair,
    loadDecryptedKeyFromLocal,
    saveDecryptedKeyToLocal
} from "./crypto";
import {publickey, user_id, privatekey, username_local, iv} from "./index";

const register_button = document.getElementById("register-btn");
const register_form = document.getElementById("register");
const x_register = document.getElementById("close-register");
const auth_btn = document.getElementById("auth-btn");
const auth_form = document.getElementById("autorisi");
const x_close = document.getElementById("close_auth");

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

export async function authorization(data) {
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
}
export async function registrations(data) {
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
}