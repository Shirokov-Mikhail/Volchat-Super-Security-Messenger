import {chats} from "./index";
//сonst
const start_page = document.getElementById("start-page");
const chat_page = document.getElementById("chat-page");
const footer = document.getElementById("footer");
const chat_panel_additionl_elements = {
    'start':'<div class="chat-panel-element center">\n' +
        // '<button class="close button input-type-button" id="setings"><img src="../../static/image/setting-3.png" class="message-img"  class="message-img" style="width: 30px !important; height: 30px !important;"></button>\n' +
        '<h2 class="title">Чаты</h2>\n' +
        '    </div>',
    'end': `<button class="chat-panel-element chat-panel-hover center to-bottom" id="new-chat-btn" onclick="newChat()">
      <p class="text medium">Новый чат +</p>
    </button>`
}


export function start_chat_session(data) {
    if (data['status'] === 'success') {
        footer.style.display = "none";
        start_page.style.display = "none";

        chat_page.style.display = "flex";
        contacts.textContent = ''
        contacts.innerHTML = chat_panel_additionl_elements.start
        for (let key in data['clients']) {
            chats.push(data['clients'][key]);
            contacts.innerHTML += `<button onclick="openChat(${data['clients'][key][0]}, ${key})" class="chat-panel-element chat-panel-hover">
<img class="message-img user-img" src="../../static/image/logo.png" alt="Волчат">
      
      <p class="text medium">${data['clients'][key][1]}</p> </button>`;
        }
        contacts.innerHTML += chat_panel_additionl_elements.end
    }
}