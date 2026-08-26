import {auth, makeNewChat, register, send_messages, new_chat_activity} from "./index";


// x-bnt and form in start page
const register_button = document.getElementById("register-btn");
const register_form = document.getElementById("register");
const x_register = document.getElementById("close-register");
const auth_btn = document.getElementById("auth-btn");
const auth_form = document.getElementById("autorisi");
const x_close = document.getElementById("close_auth");
const send_button = document.getElementById("send-button");
const submit_auth = document.querySelectorAll(".button-auth");
const register_btn = document.querySelectorAll(".button-registation");


send_button.addEventListener('click', (event) => {
    if (!new_chat_activity) {
        send_messages()
    } else {
        makeNewChat()
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