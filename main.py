from flask_mysqldb import MySQL
from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_socketio import SocketIO, emit
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
    print('/', session)
    return render_template('index.html')


@socketio.on('connect')
def authorization_check():
    print('connect', session)
    if 'login' in session and session['login'] != '':
        login = session['login']
        db = DataBaseLoader(mysql)
        if db.auth(login):
            socketio.emit('auth', {'status': 'success',
                                   'id': db.id,
                                   'key-verifi': db.message,
                                   'key': db.key
                                   })
        else:
            socketio.emit('auth', {
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
        print('clients ', data['clients'], 'len s')
        socketio.emit('start-session', data)

    except Exception as e:
        data = {
            "status": 500,
            "clients": [],
            'error': e
        }
        socketio.emit('start-session', data)


# супер нужная функция
@socketio.on('auth')
def user_load_messages(data):
    login: str = data['login']
    db = DataBaseLoader(mysql)
    login.capitalize()
    if db.auth(login):
        socketio.emit('auth', {'status': 'success',
                               'id': db.id,
                               'key-verifi': db.message,
                               'key': db.key
                               })
    else:
        socketio.emit('auth', {
            'status': 'error'
        })


@socketio.on('load-chat')
def load_chat(data):
    db = DataBaseLoader(mysql)
    out, into = db.loadMessages(data['user_id'], data['chat_id'])
    friend_login = db.load_Friends_Info(data['user_id'], data['chat_id'])
    friend_id = db.friend_id
    emit('load-chat', {'status': 'success',
                       'out': list(out),
                       'into': list(into),
                       'friend_login': friend_login,
                       'friend_id': friend_id
                       })


@socketio.on('registration-check')
def register(data):
    login = data['login']
    db = DataBaseLoader(mysql)
    login.capitalize()
    if db.check_login(login):
        socketio.emit('registration-check', {'status': 'success'})
    else:
        socketio.emit('registration-check', {'status': 'error'})


@socketio.on('registration')
def registration(data):
    login = str(data['login'])
    public_key = data['public_key']
    private_key = data['private_key']
    test_message = data['test-message']
    db = DataBaseLoader(mysql)

    if db.registration(login, public_key, private_key, test_message):
        id = db.select_id(login)
        socketio.emit('registration', {'status': 'success',
                                       'id': id})
    else:
        socketio.emit('registration', {'status': 'error'})


# устарело уберу потом
@app.route('/auth')
def auth():
    return render_template('/pages/auth.html', login_error='none', password_error='none')


@app.route('/auth', methods=['POST'])
def users_post():
    db = DB(mysql)
    login = request.form.get('email')
    password = request.form.get('password')

    if '@' in login and db.auth(password, mail=login):
        session['auth'] = True
        session['id'] = db.id
        session["auth"] = True
        print('auth ', session['auth'])
        return redirect('/')
    elif '+' in login and db.auth(password, tel=login):
        session['auth'] = True
        session['id'] = db.id
        return redirect('/')
    elif db.auth(password, login=login):
        session['auth'] = True
        session['id'] = db.id
        return redirect('/')
    return render_template('/pages/auth.html', login_error='none', password_error='none')


@app.route('/registration')
def rg():
    return render_template('/pages/registration.html', login_error='none')


@app.route('/registration/', methods=['POST'])
def rg_post():
    db = DB(mysql)
    print(request.form.get('public-login'))
    if request.form.get('email') and db.registartion(request.form.get('public-login'), request.form.get('password'),
                                                     mail=request.form.get('email')):
        session['auth'] = True
        session['id'] = db.id
        return redirect(url_for('auth'))
    elif request.form.get('phone') and db.registartion(request.form.get('public-login'), request.form.get('password'),
                                                       tel=request.form.get('phone')):
        session['auth'] = True
        session['id'] = db.id
        return redirect(url_for('auth'))
    return render_template('/pages/registration.html', login_error='none')


if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
