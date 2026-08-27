import datetime
import os

import redis

from glob import escape

from flask.cli import load_dotenv
from flask_mysqldb import MySQL
from flask import Flask, render_template, request, redirect, url_for, jsonify, session, make_response
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from sqlalchemy.util.langhelpers import tag_method_for_warnings

from functions.db import DB, DataBaseLoader, DbTokenAccessCheck, TokenManager
from functions.nonce import verify_nonce_signature, generate_nonce

load_dotenv()

app = Flask(__name__)
app.config["MYSQL_HOST"] = os.getenv("MYSQL_HOST")
app.config["MYSQL_USER"] = os.getenv("MYSQL_USER")
app.config["MYSQL_PASSWORD"] = os.getenv("MYSQL_PASSWORD")
app.config["MYSQL_DB"] = os.getenv("MYSQL_DB")
app.config['SECRET_KEY'] = "Volchatus45Naperdatus7211"
# Файл .env на вашем сервере
# ACCESS_SECRET = "ваша_постоянная_строка_которую_знает_только_сервер"
# REFRESH_SECRET = "другая_постоянная_строка_которую_знает_только_сервер"

# 3. Подгружаем секреты
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY")
app.secret_key = os.getenv("SECRET_KEY")

ACCESS_SECRET = os.getenv("ACCESS_SECRET")
REFRESH_SECRET = os.getenv("REFRESH_SECRET")

# 4. Грамотная настройка сессий в зависимости от окружения
is_production = os.getenv("FLASK_ENV") == "production"

app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_COOKIE_SECURE'] = is_production  # False при локальной разработке[cite: 1][cite: 1, 2]
app.config['SESSION_COOKIE_HTTPONLY'] = True         # Всегда True для защиты токенов[cite: 1]
app.config['SESSION_COOKIE_SAMESITE'] = 'Strict' if is_production else 'Lax' # Lax для локалки[cite: 1]

mysql = MySQL(app)
socketio = SocketIO(app, cors_allowed_origins="*", manage_session=False)
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)


@app.route('/')
def index():
    return render_template('index.html')


@socketio.on('connect')
def handle_connect(auth):
    # Socket.IO автоматически передает данные из поля auth клиента
    token = auth.get('token') if auth else None
    token_menager = TokenManager(mysql)
    if not token:
        print("Попытка подключения без токена")
        return

    try:
        # Проверяем токен
        payload = token_menager.verify_token(token, 'access')

        db = DataBaseLoader(mysql)
        login = db.select_user_id_where_login(payload.get('user_id'))
        print(f"Пользователь {payload.get('user_id')} успешно подключен (SID: {request.sid})")
        print({'login': str(login), 'token': token, 'id': payload.get('user_id')})
        user_load_messages({'login': login, 'token': token, 'id': payload.get('user_id')})

    except ValueError as e:
        print(e)
        if str(e) == "Срок действия access-токена истек":
            emit('update-token', {'status': 'success'})
        return


@socketio.on('start-session')
def start_session(data):
    try:
        status = data['status']
        id = int(data['id'])
        base = {
            "status": 'success',
            "clients": [],
            'error': None,
            'token': []
        }
        db = TokenManager(mysql)
        if db.check_token(data['token'], 'access')[0]:

            base['clients'] = db.loadChats(id)
            base['token'] = 'asd'
            emit('start-session', base)
        else:
            base['token'] = None
            base['status'] = 'error'
            emit('start-session', base)
            disconnect()

    except Exception as e:
        print(e)
        data = {
            "status": 'error',
            "clients": [],
            'error': e,
            'token': None
        }
        emit('start-session', data)


# супер нужная функциямы
@socketio.on('auth')
def user_load_messages(data):
    login: str = data['login']
    db = TokenManager(mysql)
    login.capitalize()
    if db.auth(login):

        if not data['token'] or not db.check_token(data['token'], 'access')[0]:
            nonce = generate_nonce()
            r.set(name=f"nonce:{login}", value=nonce, ex=60)
            emit('need-access-token', {'status': 'success',
                                       'login': login,
                                       'id': db.id,
                                       'private-key': db.key,
                                       'public-key': db.public,
                                       'nonce': nonce
                , 'iv': db.message
                                       })
        elif not db.check_token(data['token'], 'access')[0]:
            emit('need-new-access-token', {'status': 'success'})
        elif db.check_token(data['token'], 'access')[0]:
            print(True)
            # тут придется повторить запрос
            emit('auth', {'status': 'success',
                          'id': db.id,
                          'iv': db.message,
                          'private': db.key,
                          'public': db.public
                          })
    else:
        emit('auth', {
            'status': 'error'
        })


@socketio.on('load-chat')
def load_chat(data):
    db = None
    try:

        db = TokenManager(mysql)
        if db.check_token(data['token'], 'access')[0]:
            out, into, all = db.loadMessages(data['user_id'], data['chat_id'])
            leave_room(f'chat_{data['old_chat_id']}')
            friend_login, friend_public = db.load_Friends_Info(data['user_id'], data['chat_id'])
            room_name = f"chat_{data['chat_id']}"
            join_room(room_name)
            friend_id = db.friend_id
            emit('load-chat', {'status': 'success',
                               'out': list(out),
                               'into': list(into),
                               'all': list(all),
                               'friend_login': friend_login,
                               'friend_id': friend_id,
                               'friend_public': friend_public
                               })
            return
        else:
            emit('need-new-access-token', {'status': 'success'})
            emit('load-chat', {'status': 'error',
                               'error': 'Please try again',
                               'out': list(),
                               'into': list(),
                               'all': list(),
                               'friend_login': 'friend_login',
                               'friend_id': 'friend_id'
                               })
            return
    except Exception as e:
        print(e)
        print('load-chat', e)
        if db:
            db.close()
        emit('load-chat', {'status': 'error',
                           'error': 'Server error. Sorry',
                           'out': list(),
                           'into': list(),
                           'all': list(),
                           'friend_login': 'friend_login',
                           'friend_id': 'friend_id'
                           })


@socketio.on('registration-check')
def register(data):
    login = data['login']

    db = DataBaseLoader(mysql)
    login.capitalize()
    if db.check_login(login):
        db.fast_registration(login)
        emit('registration-check', {'status': 'success', 'user_id': db.id})
    else:
        emit('registration-check', {'status': 'error'})


@socketio.on('registration')
def registration(data):
    login = str(data['login'])
    public = data['public_key']
    private = data['private_key']
    iv = data['iv']
    db = DataBaseLoader(mysql)
    if db.registration(login, public, private, iv):
        id = db.select_id(login)
        nonce = generate_nonce()

        r.set(name=f"nonce:{login}", value=nonce, ex=60)
        emit('need-access-token', {'status': 'success',
                                   'login': login,
                                   'id': id,
                                   'private-key': private,
                                   'public-key': public,
                                   'nonce': nonce,
                                   'iv': iv
                                   })

        emit('registration', {'status': 'success',
                              'id': id})
    else:
        emit('registration', {'status': 'error'})


@socketio.on('send-message')
def sending_messages(data):
    message = str(data['message'])
    user_id = data['user_id']
    chat_id = data['chat_id']
    iv = data['iv']
    db = TokenManager(mysql)
    if db.send_messages(message, user_id, chat_id, iv) and db.check_token(data['token'], 'access')[0]:
        room_name = f"chat_{chat_id}"
        emit('new-message', {'status': 'success',
                             'author_id': user_id,
                             'chat_id': chat_id
            , 'text': message,
                             'iv': iv}, to=room_name)
        # emit('load-chat', {'status': 'success',
        #                    'out': list(out),
        #                    'into': list(into),
        #                    'all': list(all),
        #                    'friend_login': friend_login,
        #                    'friend_id': friend_id,
        #                    }, to=room_name)
    elif not db.check_token(data['token'], 'access')[0]:
        emit('need-new-access-token', {'status': 'success'})
    else:
        emit('load-chat', {'status': 'error'})


@socketio.on('need-members')
def need_members(data):
    db = None
    try:
        db = DataBaseLoader(mysql)
        members = db.open_all_members_names()
        emit('need-members', {'status': 'success', 'members': members})
    except Exception as e:
        print('need-members error:', e)
        emit('need-members', {'status': 'error', 'members': []})
    finally:
        if db:
            db.close()


@socketio.on('make_new_chat')
def make_new_chat(data):
    try:
        db = TokenManager(mysql)
        if db.check_token(data['token'], 'access')[0]:
            users_id = data['users']
            owner_id = [data['user_id']]
            chat_type = 'lockal'
            if len(data['users']) > 1:
                chat_type = 'multi'
            users_id = owner_id + users_id
            chat_id, chat_name = db.new_chat(str(data['name']), users_id, type=chat_type)
            if chat_name:
                emit('make_new_chat', {'status': 'success', 'chat_id': chat_id,
                                       'chat_name': chat_name})
                load_chat({
                    'chat_id': chat_id,
                    'user_id': owner_id})
                return
            emit('make_new_chat', {'status': 'unsuccess'})
        else:
            emit('need-new-access-token', {'status': 'success'})

        return

    except Exception as e:
        print('make_new_chat error:', e)


@socketio.on('verify_signature')
def handle_verify_signature(data):
    login = data.get('login')
    signature = data.get('signature')
    public_key = data.get('public_key')

    key = f"nonce:{login}"
    pipe = r.pipeline()
    pipe.get(key)
    pipe.delete(key)
    results = pipe.execute()

    saved_nonce = results[0]

    if not saved_nonce:
        emit('auth', {'success': False, 'error': 'Nonce истек или не запрашивался'})
        return
    if verify_nonce_signature(saved_nonce, signature, public_key):
        emit('auth')


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    login = data.get('login')
    signature = data.get('sig')
    db = DataBaseLoader(mysql)
    user_id = data.get('user_id')
    public_key = db.publickey_for_user_id(user_id)[0]
    key = f"nonce:{login}"
    pipe = r.pipeline()
    pipe.get(key)
    pipe.delete(key)
    results = pipe.execute()

    saved_nonce = results[0]
    if not saved_nonce:
        emit('auth', {'success': False, 'error': 'Nonce истек или не запрашивался'})
        return None
    if verify_nonce_signature(saved_nonce, signature, public_key):

        token_manager = TokenManager(mysql)
        access_token, refresh_token = token_manager.create_tokens(data['user_id'])
        token_manager.close()
        response = make_response(jsonify({
            "access_token": access_token
        }))

        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            httponly=False,  # КРИТИЧНО: Запрещает JavaScript читать куку (защита от XSS-атак)
            secure=False,  # КРИТИЧНО: Кука передается только по HTTPS (на localhost можно поставить False)
            samesite='Strict',  # КРИТИЧНО: Защита от CSRF-атак (кука не уйдет, если запрос сделан с чужого сайта)
            max_age=30 * 24 * 60 * 60,  # Время жизни куки в браузере (в секундах, например 30 дней)
            path='/refresh'  # СУПЕР-ОПТИМИЗАЦИЯ: Браузер будет прикреплять эту куку ТОЛЬКО к запросам на URL /refresh
        )
        # user_load_messages({'login': login, 'token': access_token})
        return response
    return None


# Пример использования при обновлении:
@app.route('/refresh', methods=['POST'])
def refresh():
    data = request.json
    token_manager = TokenManager(mysql)
    login = data.get('login')
    old_access = data.get('token')
    user_id = data.get('user_id')
    old_refresh = request.cookies.get('refresh_token')
    if not old_refresh:
        return jsonify({"error": "Refresh-токен отсутствует"}), 401

    if not old_access:
        return jsonify({"error": "Access-токен не предоставлен"}), 401
    try:
        if data['type'] == 'access' and \
                token_manager.check_token(old_refresh, 'refresh')[0]:
            new_access = token_manager.refresh_access_token(old_refresh)
            token_manager.close()
            return jsonify({"access_token": new_access}), 200
        elif data['type'] == 'refresh' and old_refresh and token_manager.check_token(old_refresh, 'refresh')[0]:
            new_access, new_refresh = token_manager.rotate_tokens(old_refresh)
            response = make_response(jsonify({"access_token": new_access}))
            response.set_cookie(
                key='refresh_token',
                value=new_refresh,
                httponly=False,
                secure=False,
                samesite='Strict',
                max_age=30 * 24 * 60 * 60,
                path='/refresh'
            )
            token_manager.close()
            return response, 200
        else:
            return jsonify({"error": "Invalid token or type"}), 400
    except ValueError as e:
        disconnect()
        return jsonify({"error": str(e)}), 401


# @app.route('/disconnect', methods=['POST'])
# def delete_tokens(data):
#     access = data['access']
#
#     if access


if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
