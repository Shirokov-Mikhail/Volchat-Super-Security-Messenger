from flask_mysqldb import MySQL
from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_socketio import SocketIO, emit
from functions.db import DB

app = Flask(__name__)
app.config["MYSQL_HOST"] = "localhost"
app.config["MYSQL_USER"] = "root"
app.config["MYSQL_PASSWORD"] = ""
app.config["MYSQL_DB"] = "volchat"
app.config['SECRET_KEY'] = "GooglePassword"
mysql = MySQL(app)
socketio = SocketIO(app)

@app.route('/')
def index():
    if 'auth' not in session:
        session['auth'] = False
        session['user_id'] = -1
    if not session['auth']:
        db = DB(mysql)
        print(db.add_messages(7, 'Hello world', 4))
        return render_template('index.html')
    return render_template('pages/chats.html')


socketio.on('start-session')
def user_session(user_id):
    db = DB(mysql)
    all_chats = db.view_chats_id(user_id)
    emit(all_chats)

socketio.on('load-messages')
def user_load_messages(user_id, chat_id):
    db = DB(mysql)


@app.route('/auth')
def auth():
    return render_template('/pages/auth.html', login_error='none', password_error='none')

@app.route('/auth', methods=['POST'])
def users_post():
    db = DB(mysql)
    login = request.form.get('email')
    password = request.form.get('password')
    print()
    if '@' in login and db.auth(password, mail=login):
        session['auth'] = True
        session['id'] = db.id
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

@socketio.on('connect')
def chat_connect():
    pass

if __name__ == '__main__':
    app.run(port=8080, host='127.0.0.1')

