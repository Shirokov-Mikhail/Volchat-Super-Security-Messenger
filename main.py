from flask_mysqldb import MySQL
from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_socketio import SocketIO, emit, join_room
from functions.db import DB, DataBaseLoader

from flask_session import Session

app = Flask(__name__)
app.config["MYSQL_HOST"] = "localhost"
app.config["MYSQL_USER"] = "root"
app.config["MYSQL_PASSWORD"] = ""
app.config["MYSQL_DB"] = "volchat"
app.config['SECRET_KEY'] = "Volchatus45Naperdatus7211"
app.secret_key = 'Volchatus45Naperdatus7211'
app.config['SESSION_COOKIE_HTTPONLY'] = True

app.config['SESSION_COOKIE_SECURE'] = False  # отключить при https

app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'

app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

mysql = MySQL(app)
socketio = SocketIO(app, cors_allowed_origins="*", manage_session=False)


@app.route('/')
def index():
    return render_template('index.html')


@socketio.on('connect')
def authorization_check():
    if 'login' in session and session['login'] != '':
        login = session['login']
        db = DataBaseLoader(mysql)
        if db.auth(login):
            emit('auth', {'status': 'success',
                                   'id': db.id,
                                   'key-verifi': db.message,
                                   'key': db.key
                                   })
        else:
            emit('auth', {
                'status': 'error'
            })


@socketio.on('start-session')
def handle_connect(data):
    try:
        status = data['status']
        id = int(data['id'])
        session['login'] = data['login']
        data = {
            "status": 200,
            "clients": [],
            'error': None
        }
        db = DataBaseLoader(mysql)

        data['clients'] = db.loadChats(id)
        session['auth'] = True
        session['id'] = id
        emit('start-session', data)

    except Exception as e:
        data = {
            "status": 500,
            "clients": [],
            'error': e
        }
        emit('start-session', data)


# супер нужная функция
@socketio.on('auth')
def user_load_messages(data):
    login: str = data['login']
    db = DataBaseLoader(mysql)
    login.capitalize()
    if db.auth(login):
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

        db = DataBaseLoader(mysql)

        out, into, all = db.loadMessages(data['user_id'], data['chat_id'])

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
    except Exception as e:
        print('load-chat', e)

    finally:
        if db:
            db.close()
        emit('load-chat', {'status': 'error',
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
        emit('registration', {'status': 'success',
                                       'id': id})
    else:
        emit('registration', {'status': 'error'})



@socketio.on('send-message')
def sending_messages(data):
    message = data['message']
    user_id = data['user_id']
    chat_id = data['chat_id']
    db = DataBaseLoader(mysql)
    if db.send_messages(message, user_id, chat_id):
        db = DataBaseLoader(mysql)
        out, into, all = db.loadMessages(user_id, chat_id)
        friend_login = db.load_Friends_Info(user_id, chat_id)
        friend_id = db.friend_id
        room_name = f"chat_{chat_id}"
        emit('load-chat', {'status': 'success',
                           'out': list(out),
                           'into': list(into),
                           'all': list(all),
                           'friend_login': friend_login,
                           'friend_id': friend_id,
                           }, to=room_name)
    else:
        emit('load-chat', {'status': 'error'})

# @socketio.on('need-members')
# def need_members(data):
#     try:
#         db = DataBaseLoader(mysql)
#         members = db.open_all_members_names()
#         emit('need-members', {'status': 'success',
#                           'members': members
#                           })
#     except Exception as e:
#         print('need-members error:', e)
#
#     finally:
#         emit('need-members', {'status': 'error', 'members': []})
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
        db = DataBaseLoader(mysql)
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
        emit('make_new_chat', {'status': 'unsuccess'})

    except Exception as e:
        print('make_new_chat error:', e)


if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
