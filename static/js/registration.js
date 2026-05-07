const email = document.getElementById("email_block");
const tel = document.getElementById("tel_block");
const toTel = document.getElementById("toTel");
const toEmail = document.getElementById("toEmail");
const loginPrew = document.getElementById("public-login-view");
const login = document.getElementById("login");
toTel.addEventListener("click", () => {
    email.style.display = "none";
    tel.style.display = "flex";
})
console.log('asd')
toEmail.addEventListener("click", () => {
    email.style.display = "flex";
    tel.style.display = "none";
})
login.addEventListener("input", () => {
    loginPrew.innerText = `Вас можно будет найти по логину @${login.value}`;
})