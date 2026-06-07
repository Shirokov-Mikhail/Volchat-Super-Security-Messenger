from werkzeug.security import generate_password_hash, check_password_hash

class DB:
    def __init__(self, mysql):
        self.mysql = mysql
        self.cur = mysql.connection.cursor()

    def auth(self, password, mail=None, tel=None, login=None):
        try:

            self.cur.execute(f'''SELECT EXISTS(SELECT 1 FROM users WHERE email = '{mail}' OR tel = '{tel}' OR `Login` = '{login}');''')

            if int(self.cur.fetchall()[0][0]) == int(1):

                self.cur.execute(f'''SELECT `password`, `id` FROM users WHERE email = '{mail}' OR tel = '{tel}' OR `Login` = '{login}';''')

                password_hash,  self.id = self.cur.fetchone()
                self.id - int(self.id)
                return check_password_hash(password_hash, password)
            return False
        except Exception as e:
            print('auth', e)
            return False


    def registartion(self,login, password,  mail=None, tel=None):
        try:
            self.cur.execute(f'''SELECT `Login`, `email`, `tel` FROM `users`''')
            logins = [i[0] for i in self.cur.fetchall()]
            emails = [i[1] for i in self.cur.fetchall()]
            tels = [i[2] for i in self.cur.fetchall()]

            if login not in logins and mail not in emails and tel not in tels:
                if mail:
                    self.cur.execute(f'''INSERT INTO `users`(`Login`, `email`, `password`) VALUES ('{login}','{mail}','{generate_password_hash(password)}') ''')
                else:
                    self.cur.execute(f'''INSERT INTO `users`(`Login`, `tel`, `password`) VALUES ('{login}','{tel}','{generate_password_hash(password)}') ''')
                self.mysql.connection.commit()
                self.cur.execute(f'''SELECT `id` FROM users WHERE `Login` = '{login}';''')
                self.id = int(self.cur.fetchone()[0])

                return True
            return False
        except Exception as e:
            print('registration', e)
            return False

