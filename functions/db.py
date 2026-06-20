from werkzeug.security import generate_password_hash, check_password_hash

class DB:
    def __init__(self, mysql):
        self.mysql = mysql
        self.cur = mysql.connection.cursor()

    def auth(self, password, mail=None, tel=None, login=None):
        try:

            self.cur.execute(f'''SELECT EXISTS(SELECT 1 FROM users WHERE email = '{mail}' OR tel = '{tel}' OR `Login` = '{login}');''')

            if int(self.cur.fetchall()[0][0]) == int(1):

                self.cur.execute(f'''SELECT `password`, `id`, `test-message`, `private-key` FROM users WHERE email = '{mail}' OR tel = '{tel}' OR `Login` = '{login}';''')

                password_hash,  self.id, message = self.cur.fetchone()
                self.message = message
                self.id = int(self.id)
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

    def add_chat(self, name, description='', type='lockal'):
        try:
            self.cur.execute(f''' SELECT EXISTS(SELECT 1 FROM chats WHERE name = '{name}')''')
            if int(self.cur.fetchall()[0][0]) == int(0):
                print(123)
                self.cur.execute(f'''INSERT INTO `chats` (`name`, `type`, `description`) VALUES ('{name}','{type}','{description}')''');
                self.mysql.connection.commit()
                print(123)
                return True
            return False
        except Exception as e:
            print('error !!!', e)
            raise ValueError('Server Error')

    def add_members(self, chat_id, user_id, role='lockal'):
        try:
            self.cur.execute(f''' SELECT EXISTS(SELECT 1 FROM chats WHERE id = '{chat_id}')''')
            if int(self.cur.fetchall()[0][0]) == int(1):
                self.cur.execute(f'''INSERT INTO `chat_members`(`chat_id`, `user_id`, `role`) VALUES ('{chat_id}','{user_id}','{role}')''')
                self.mysql.connection.commit()
                return True
            return False
        except Exception as e:
            print('added chat members error', e)
            raise ValueError('Server Error')

    def open_chats_element(self, chat_id):
        try:
            self.cur.execute(f'''SELECT `id`, `name`, `type`, `description` FROM `chats` WHERE `id`='{chat_id}' ''')
            result = self.cur.fetchone()
            print(result)
            return result
        except Exception as e:
            print('open-chat-error', e)
            return []

    def view_chats_id(self, user_id:int):
        try:
            chats = []
            self.cur.execute(f'''SELECT `chat_id` FROM `chat_members` WHERE `user_id`='{user_id}' ''')
            for i in self.cur.fetchall():
                chats.append(self.open_chats_element(i[0]))
            return chats
        except Exception as e:
            print(e)
            return []

    def add_messages(self, sender:int, message:str, chat_id:int):
        try:
            self.cur.execute(f'''INSERT INTO `messages`(`chat_id`, `author_id`, `content`) VALUES ('{chat_id}','{sender}','{message}')''')
            self.mysql.connection.commit()
            return True
        except Exception as e:
            print(e)
            return False

class DataBaseLoader:
    def __init__(self, mysql):
        self.mysql = mysql
        self.cur = mysql.connection.cursor()

    def auth(self, login):
        try:
            self.cur.execute(f'''SELECT EXISTS(SELECT 1 FROM users WHERE `Login` = '{login}');''')
            if int(self.cur.fetchall()[0][0]) == int(1):
                print(f'''SELECT `id`, `test-message`, `private-key` FROM users WHERE `Login` = '{login}'; ''')
                self.cur.execute(f'''SELECT `id`, `test-message`, `private-key` FROM users WHERE `Login` = '{login}'; ''')
                self.id, message, key = self.cur.fetchone()
                self.message = message
                self.id = int(self.id)
                self.key = key
                return True
            return False
        except Exception as e:
            print('auth', e)
            return False

    def check_login(self, login):
        try:
            self.cur.execute(f'''SELECT `id` FROM `users` WHERE `Login`='{login}'; ''')
            if len(self.cur.fetchone()) == 0:
                return True
            return False
        except Exception as e:
            print('check-login', e)
            return False

    def registration(self, login, public_key, private_key, test_message):
        try:
            if self.check_login(login):
                self.cur.execute(f'''INSERT INTO `users`(`Login`, `private-key`, `publick-key`, `test-message`) VALUES ('{login}','{private_key}','{public_key}','{test_message}'); ''')
                self.mysql.connection.commit()
                return True
            return False
        except Exception as e:
            print('registration', e)
            return False


    def loadChats(self, user_id):
        try:
            chats = []
            self.cur.execute(f'''SELECT `id`, `name` FROM `chats` ''')
            for i in self.cur.fetchall():
                chats.append((i[0], i[1]))
            return chats
        except Exception as e:
            print(e)
            return []


    def loadMessages(self, user_id, chat_id):
        pass
