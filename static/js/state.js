// state.js

export const appState = {
    // Данные из LocalStorage
    username_local: localStorage.getItem('username') || undefined, // имя пользователя
    user_id: localStorage.getItem('user_id') || undefined,         // id пользователя
    publickey: localStorage.getItem('user_key') || undefined,      // публичный ключ пользователя
    jwt_token: localStorage.getItem('jwt_token') || '',            // jwt ТОКЕН
    iv: localStorage.getItem('iv') || undefined,                   // вектор инициализации

    // Состояние чатов и интерфейса
    chats: [],                  // список чатов
    current_chat_id: -1,        // текущий id чата (-1 значит никакой не открыт)
    new_chat_activity: false,   // статус создания нового чата
    users_selected: [],         // выбранные пользователи при создании нового чата
    famous_users: [],           // известные контакты (чтобы не подгружать заново)

    // Оперативные криптографические ключи (не сохраняем напрямую в localStorage в виде объектов)
    privatekey: undefined,      // приватный ключ пользователя (CryptoKey)
    companion_key: undefined,   // публичный ключ собеседника
    helman_key: undefined       // симметричный ключ (AES-GCM), сгенерированный из публичного и приватного
};