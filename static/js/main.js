const contacts = document.getElementById("contacts");
const username = document.getElementById("name");
const messages_list = document.getElementById("messages-list");
const send_button = document.getElementById("send-button");
const send_message = document.getElementById("send-message");
const start_panel = document.getElementById("start-panel");
const main_chat_panel = document.getElementById("chat-panel");

let chats = []
const socket = io("http://127.0.0.1:5000");
socket.on('start-session', function(data) {
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
});
function updateCertificate(){
    socket.emit('needUpdateCertificate', {
        oldCertificate: 'adasd',
        time: new Date().toISOString(),
    });
}

function loadChat(chat_id) {
    socket.emit('load-chat', {

                                chat_id: chat_id});

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
document.addEventListener("keydown", (event) => {
    switch (event.code) {
        case 'Escape':
            clearMessages()
            break

    }
})