const register_button = document.getElementById("register-btn");
const register_form = document.getElementById("register");
const x_register = document.getElementById("close-register");
register_button.addEventListener("click", (e) => {
    register_form.style.display = "flex";
})
x_register.addEventListener("click", (e) => {
    register_form.style.display = "none";
})
