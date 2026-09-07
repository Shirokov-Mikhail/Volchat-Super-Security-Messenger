import { appState } from './state.js';
import {ui} from "./ui.js";
import {
    openChat,
    closeNewChat,
    newChat,
    new_chat_button_active,
    makeNewChat,
    send_messages,
    register
} from './actions.js';

// x-bnt and form in start page
ui.send_button.addEventListener('click', (event) => {
    if (!appState.new_chat_activity) {
        send_messages()
    } else {
        makeNewChat()
        closeNewChat()
    }
})
ui.submit_auth.forEach((button) => {
    button.addEventListener('click', (event) => {
        auth();
    })
})
ui.register_btn.forEach((button) => {
    button.addEventListener('click', (event) => {
        register();
    })
})

ui.register_button.addEventListener("click", () => {
    ui.register_form.style.display = "flex";
})
ui.x_register.addEventListener("click", () => {
    ui.register_form.style.display = "none";
    ui.auth_btn.style.display = "block";
})
ui.auth_btn.addEventListener("click", () => {

    ui.auth_form.style.display = "flex";
})
ui.x_close.addEventListener("click", () => {
    ui.auth_form.style.display = "none";
})