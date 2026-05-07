from flask_mysqldb import MySQL
from flask import Flask, render_template, request, redirect, url_for, jsonify, session


app = Flask(__name__)

app.config["MYSQL_HOST"] = "localhost"
app.config["MYSQL_USER"] = "root"
app.config["MYSQL_PASSWORD"] = ""
app.config["MYSQL_DB"] = "main"
app.config['SECRET_KEY'] = "GooglePassword"
mysql = MySQL(app)


@app.route('/')
def index():
    return render_template('index.html')

@app.route('', methods=['POST'])
def users():
    pass


