// socket.js
import { appState } from './state.js';

export const socket = io("http://127.0.0.1:5000", {
    auth: { token: appState.jwt_token },
    login: appState.username_local
});