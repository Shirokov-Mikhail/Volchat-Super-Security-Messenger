import datetime
import redis

from glob import escape

from flask_mysqldb import MySQL
from flask import Flask, render_template, request, redirect, url_for, jsonify, session, make_response
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from sqlalchemy.util.langhelpers import tag_method_for_warnings

from functions.db import DB, DataBaseLoader, DbTokenAccessCheck
from functions.tokens import TokenManager
from functions.nonce import *

app = Flask(__name__)
app.config["MYSQL_HOST"] = "localhost"
app.config["MYSQL_USER"] = "root"
app.config["MYSQL_PASSWORD"] = ""
app.config["MYSQL_DB"] = "volchat"
app.config['SECRET_KEY'] = "Volchatus45Naperdatus7211"
# Файл .env на вашем сервере
ACCESS_SECRET="ваша_постоянная_строка_которую_знает_только_сервер"
REFRESH_SECRET="другая_постоянная_строка_которую_знает_только_сервер"

SECRET_KEY = "Volchatus45Naperdatus7211"
app.secret_key = 'Volchatus45Naperdatus7211'
app.config['SESSION_COOKIE_HTTPONLY'] = True

app.config['SESSION_COOKIE_SECURE'] = False  # отключить при https

app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'
app.config['SESSION_COOKIE_HTTPONLY'] = False #True при https
app.config['SESSION_COOKIE_SAMESITE'] = 'None' # Или 'Lax', если фронт и бек на одном домене
app.config['SESSION_TYPE'] = 'filesystem'

mysql = MySQL(app)
socketio = SocketIO(app, cors_allowed_origins="*", manage_session=True)
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
        emit('need-new-access-token', {})
        return

    try:
        # Проверяем токен
        payload = token_menager.verify_token(token, 'access')
        print(f"Пользователь {payload.get('id')} успешно подключен (SID: {request.sid})")


    except ValueError as e:
        print(e)
        return

@socketio.on('start-session')
def start_session(data):
    try:
        status = data['status']
        id = int(data['id'])
        data = {
            "status": 'success',
            "clients": [],
            'error': None,
            'token': []
        }
        db = TokenManager(mysql)
        if db.check_token(data['token'], 'access')[0]:
            data['clients'] = db.loadChats(id)
            data['token'] = 'asd'
            emit('start-session', data)
        else:
            data['token'] = None
            data['status'] = 'error'
            emit('start-session', data)
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


# супер нужная функция
@socketio.on('auth')
def user_load_messages(data):
    login: str = data['login']
    db = TokenManager(mysql)
    login.capitalize()
    if db.auth(login):
        if not data['token']:
            nonce = generate_nonce()
            r.setex(name=f"nonce:{login}", time=60, value=nonce)
            emit('need-access-token', {'status': 'success',
                                       'login': login,
                                       'id': db.id,
                                       'private-key': db.key,
                                       'public-key': db.public,
                                       'nonce': nonce
                                       })
        elif not db.check_token(data['token'], 'access')[0]:
            emit('need-new-access-token', {'status': 'success'})
        else:
            # тут придется повторить запрос
            emit('auth', {'status': 'success',
                          'id': db.id,
                          'key-verifi': db.message,
                          'key': db.key
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
            friend_login = db.load_Friends_Info(data['user_id'], data['chat_id'])
            room_name = f"chat_{data['chat_id']}"
            join_room(room_name)
            friend_id = db.friend_id
            emit('load-chat', {'status': 'success',
                           'out': list(out),
                           'into': list(into),
                           'all': list(all),
                           'friend_login': friend_login,
                           'friend_id': friend_id
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
        emit('registration-check', {'status': 'success'})
    else:
        emit('registration-check', {'status': 'error'})


@socketio.on('registration')
def registration(data):
    login = str(data['login'])
    public_key = data['public_key']
    private_key = data['private_key']
    test_message = data['test-message']
    db = DataBaseLoader(mysql)

    if db.registration(login, public_key, private_key, test_message):
        id = db.select_id(login)
        emit('need-new-access-token', {'status': 'success'})
        emit('registration', {'status': 'success',
                                       'id': id})
    else:
        emit('registration', {'status': 'error'})



@socketio.on('send-message')
def sending_messages(data):
    message = escape(data['message'])
    user_id = data['user_id']
    chat_id = data['chat_id']
    db = TokenManager(mysql)
    if db.send_messages(message, user_id, chat_id) and db.check_token(data['token'], 'access')[0]:
        room_name = f"chat_{chat_id}"
        emit('new-message', {'status': 'success',
                             'author_id': user_id,
                             'chat_id': chat_id
                             ,'text': message}, to=room_name)
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
                print('daaa')
                emit('make_new_chat', {'status': 'success',  'chat_id': chat_id,
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
def login(data):
    token_manager = TokenManager(mysql)
    access_token, refresh_token = token_manager.create_tokens(data['user_id'])
    token_manager.close()
    response = make_response(jsonify({
        "access_token": access_token
    }))

    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=False,       # КРИТИЧНО: Запрещает JavaScript читать куку (защита от XSS-атак)
        secure=False,         # КРИТИЧНО: Кука передается только по HTTPS (на localhost можно поставить False)
        samesite='Strict',   # КРИТИЧНО: Защита от CSRF-атак (кука не уйдет, если запрос сделан с чужого сайта)
        max_age=30 * 24 * 60 * 60, # Время жизни куки в браузере (в секундах, например 30 дней)
        path='/refresh'      # СУПЕР-ОПТИМИЗАЦИЯ: Браузер будет прикреплять эту куку ТОЛЬКО к запросам на URL /refresh
    )

    return response

# Пример использования при обновлении:
@app.route('/refresh', methods=['POST'])
def refresh(data):
    db_checker = DbTokenAccessCheck(mysql)
    token_manager = TokenManager(db_checker)
    old_refresh = request.cookies.get('refresh_token')
    old_access = data['access']
    if not old_refresh:
        return jsonify({"error": "Refresh-токен отсутствует"}), 401

    if not old_access:
        return jsonify({"error": "Access-токен не предоставлен"}), 401
    try:
        if data['type'] == 'access' and token_manager.check_token(old_access, 'access')[0]:
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
    finally:
        return jsonify({"error": 'Fatality error'}), 404

# @app.route('/disconnect', methods=['POST'])
# def delete_tokens(data):
#     access = data['access']
#
#     if access


if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
