from flask_mysqldb import MySQL
from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_socketio import SocketIO, emit
from functions.db import DB

app = Flask(__name__)
app.config["MYSQL_HOST"] = "localhost"
app.config["MYSQL_USER"] = "root"
app.config["MYSQL_PASSWORD"] = ""
app.config["MYSQL_DB"] = "volchat"
app.config['SECRET_KEY'] = "Volchatus45Naperdatus7211"
app.secret_key = 'Volchatus45Naperdatus7211'
app.config['SESSION_COOKIE_HTTPONLY'] = True

app.config['SESSION_COOKIE_SECURE'] = False # отключить при https

app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'


mysql = MySQL(app)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def index():
    if 'auth' not in session:
        session['auth'] = False
        session['id'] = -1
    if not session['auth']:
        return render_template('index.html')
    return render_template('pages/chats.html', id=session['id'])

@socketio.on('connect')
def handle_connect():
    try:
        data = {
            "status": 200,
            "clients": [],
            'error': None
        }
        if not session.get('auth'):
            data['status'] = 401
            socketio.emit('start-session', data)
        else:
            db = DB(mysql)
            data['clients'] = db.view_chats_id(session['id'])
            socketio.emit('start-session', data)

    except Exception as e:
        data = {
            "status": 500,
            "clients": [],
            'error': e
        }
        socketio.emit('start-session', data)



@socketio.on('start-session')
def user_session(data):
    print("Получено событие start-session:", data)
    user_id = data.get('user_id')
    db = DB(mysql)
    all_chats = db.view_chats_id(user_id)
    socketio.emit('start-session', {'greeting': 'Hello from Python Flask!'})

@socketio.on('load-messages')
def user_load_messages(data):
    user_id = data.get('user_id')
    chat_id = data.get('chat_id')
    db = DB(mysql)



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
    if request.form.get('email') and db.registartion(request.form.get('public-login'), request.form.get('password'), mail=request.form.get('email')):
        session['auth'] = True
        session['id'] = db.id
        return redirect(url_for('auth'))
    elif request.form.get('phone') and db.registartion(request.form.get('public-login'), request.form.get('password'), tel=request.form.get('phone')):
        session['auth'] = True
        session['id'] = db.id
        return redirect(url_for('auth'))
    return render_template('/pages/registration.html', login_error='none')

if __name__ == '__main__':
    socketio.run(app, debug=True, allow_unsafe_werkzeug=True)
