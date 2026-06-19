from flask_mysqldb import MySQL
from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_socketio import SocketIO, emit
from functions.db import DB, DataBaseLoader

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
    print(session)
    return render_template('index.html')

@socketio.on('connect')
def authorization_check():
    print(session)
    if 'login' in session and session['login'] != ' ':
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
        print(id)
        data = {
            "status": 200,
            "clients": [],
            'error': None
        }
        db = DataBaseLoader(mysql)
        data['clients'] = db.loadChats(id)
        session['auth'] = True
        session['id'] = id
        print(session)
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
    login = data['login']
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

@socketio.on('check-password')
def user_check_password(data):
    password = data['password']
    id = data['id']
    db = DataBaseLoader(mysql)
    if db.check_password(password, id):
        socketio.emit('check-password', {'status': 'success'})
    else:
        socketio.emit('check-password', {'status': 'error'})

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
