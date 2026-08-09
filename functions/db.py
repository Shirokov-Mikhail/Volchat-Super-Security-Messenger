from werkzeug.security import generate_password_hash, check_password_hash
import datetime


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

                self.cur.execute(f'''INSERT INTO `chats` (`name`, `type`, `description`) VALUES ('{name}','{type}','{description}')''');
                self.mysql.connection.commit()

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
            print('view_chats', e)
            return []

    def add_messages(self, sender:int, message:str, chat_id:int):
        try:
            self.cur.execute(f'''INSERT INTO `messages`(`chat_id`, `author_id`, `content`) VALUES ('{chat_id}','{sender}','{message}')''')
            self.mysql.connection.commit()
            return True
        except Exception as e:
            print('add_messages', e)
            return False

#для работы с прямыми данными пользователя
class DataBaseLoader:
    def __init__(self, mysql):
        self.mysql = mysql
        self.cur = mysql.connection.cursor()

    def auth(self, login):
        try:
            self.cur.execute(f'''SELECT EXISTS(SELECT 1 FROM users WHERE `Login` = '{login}');''')
            if int(self.cur.fetchall()[0][0]) == int(1):
                self.cur.execute(f'''SELECT `id`, `test-message`, `private-key`, `public-key` FROM users WHERE `Login` = '{login}'; ''')
                self.id, message, key, public = self.cur.fetchone()
                self.message = message
                self.id = int(self.id)
                self.key = key
                self.public = public

                return True
            return False
        except Exception as e:
            print('auth', e)
            return False

    def check_login(self, login):
        try:

            self.cur.execute(f'''SELECT `id` FROM `users` WHERE `Login`='{login}'; ''')
            db_data = self.cur.fetchone()

            if db_data is None:
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

    def select_id(self, login):
        try:
            self.cur.execute(f'''SELECT `id` FROM `users` WHERE `Login`='{login}'; ''')
            db_data = self.cur.fetchone()
            if db_data is not None:
                return int(db_data[0])
            return False
        except Exception as e:
            print('select-id', e)
            return False

    def load_chat_member(self, user_id:int):
        try:
            self.cur.execute(f'''SELECT `chat_id` FROM `chat_members` WHERE `user_id`='{user_id}' ''')
            chat_ids = [i[0] for i in self.cur.fetchall()]

            return chat_ids
        except Exception as e:
            print('load-chat-member', e)
            return []

    def loadChats(self, user_id):
        try:
            chats = []

            for i in self.load_chat_member(user_id):
                self.cur.execute(f'''SELECT `id`, `name` FROM `chats` WHERE `id`='{i}'; ''')
                info = self.cur.fetchone()

                chats.append((info[0], info[1]))
            return chats
        except Exception as e:
            print('loadChats', e)
            return []

    def loadMessages(self, user_id:int, chat_id:int):
        try:
            self.cur.execute(f'''SELECT `content` FROM `messages` WHERE `chat_id`='{chat_id}' AND `author_id`='{user_id}';''')
            out = [i[0] for i in self.cur.fetchall()]
            self.cur.execute(f'''SELECT `content` FROM `messages` WHERE `chat_id`='{chat_id}' AND `author_id`<>'{user_id}';''')
            into = [i[0] for i in self.cur.fetchall()]
            self.cur.execute(f'''SELECT `content`, `author_id` FROM `messages` WHERE `chat_id`='{chat_id}';''')
            all = [(i[0], True if int(i[1]) == user_id else False) for i in self.cur.fetchall()]
            return out, into, all
        except Exception as e:
            print('load-messages', e)
            return [], [], []

    #Только когда в чате 2 человек
    def serchUserInfo(self, user_id, chat_id):
        try:

            self.cur.execute(f'''SELECT `user_id` FROM `chat_members` WHERE `user_id` <> '{user_id}' AND `chat_id`='{chat_id}';''')
            self.friend_id = list(filter(lambda x: x != 0, [i[0] for i in self.cur.fetchall()]))[0]

            return True
        except Exception as e:
            print('serch-user-info', e)
            return False

    def load_Friends_Info(self, user_id, chat_id):
        try:
            if self.serchUserInfo(user_id, chat_id):

                self.cur.execute(f''' SELECT `Login` FROM `users` WHERE `id`='{self.friend_id}';''')
                friend_login = self.cur.fetchone()[0]
                return friend_login
            else:
                raise ValueError('User not found')
        except Exception as e:
            print('load Friends info', e)
            return ''

    def send_messages(self, message, user_id, chat_id, type_message='text'):
        try:
            if type_message == 'text':
                self.cur.execute(f'''INSERT INTO `messages`(`chat_id`, `author_id`, `content`) VALUES ('{chat_id}','{user_id}','{message}') ''')
            else:
                self.cur.execute(f'''INSERT INTO `messages`(`chat_id`, `author_id`, `content`, `type`) VALUES ('{chat_id}','{user_id}','{message}','{type_message}') ''')
            self.mysql.connection.commit()
            return True
        except Exception as e:
            print('send messages', e)
            return False


    def generate_chat_members(self, chat_id, members:list):
        try:

            for member in members:
                self.cur.execute(f'''INSERT INTO `chat_members`(`chat_id`, `user_id`) VALUES ('{chat_id}','{member}')''')
            self.mysql.connection.commit()
            return True
        except Exception as e:
            print('generate', e)
            self.close()
            return False



    def new_chat(self, name:str, members:list, desk=None, type='lockal'):
        try:
            while_koef = 0
            self.cur.execute(f'''SELECT EXISTS(SELECT 1 FROM chats WHERE `name` = '{name}');''')
            if int(self.cur.fetchall()[0][0]) == int(0):
                self.cur.execute(f'''INSERT INTO `chats`(`name`, `type`, `description`) VALUES ('{name}','{type}','{desk}')''')
            else:
                while int(self.cur.fetchall()[0][0]) == int(1):
                    self.cur.execute(f'''SELECT EXISTS(SELECT 1 FROM chats WHERE `name` = '{name}_{while_koef}');''')
                    if int(self.cur.fetchall()[0][0]) == int(0):
                        self.cur.execute(f'''INSERT INTO `chats`(`name`, `type`, `description`) VALUES ('{name}_{while_koef}','{type}','{desk}')''')
                        break
                    while_koef += 1
            print(name, while_koef)
            self.mysql.connection.commit()
            if (while_koef != 0):
                self.cur.execute(f''' SELECT `id` FROM chats WHERE `name` = '{name}_{while_koef}'; ''')
            else:
                self.cur.execute(f''' SELECT `id` FROM chats WHERE `name` = '{name}'; ''')
            chat_id = self.cur.fetchone()[0]
            print('chat_id', chat_id)
            if self.generate_chat_members(chat_id, members):
                return chat_id, name
        # memebers[0] всегда тот кто создает чат
        # members - id участников чата

            return -1, ''

        except Exception as e:
            print('new chat', e)
            return -1, ''

    def open_all_members_names(self):
        try:
            self.cur.execute(f'''SELECT `id`, `Login` FROM `users`''')
            all_users = [(i[0], i[1]) for i in self.cur.fetchall()]
            return all_users
        except Exception as e:
            print('open all members names', e)
            return []

    def close(self):
        if self.cur:
            self.cur.close()

#для работы с токенами
class DbTokenAccessCheck(DataBaseLoader):
    def __init__(self, mysql):
        # Исправлен вызов конструктора родительского класса
        super().__init__(mysql)

    def addRefreshToken(self, id: str, max_age: int):
        try:
            # Высчитываем точную дату смерти токена на стороне Python (по UTC)
            now = datetime.datetime.now(datetime.timezone.utc)
            expires_at = now + datetime.timedelta(seconds=max_age)

            # Используем %s для защиты от SQL-инъекций
            sql = "INSERT INTO `refresh` (`id`, `max_age`, `expires_at`) VALUES (%s, %s, %s)"
            self.cur.execute(sql, (id, max_age, expires_at))
            self.mysql.connection.commit() # Обязательно сохраняем изменения!

        except Exception as e:
            print(f"Ошибка при добавлении токена: {e}")
            self.mysql.connection.rollback()

    def checkRefreshToken(self, id: str) -> bool:
        try:
            sql = "SELECT `expires_at` FROM `refresh` WHERE `id` = %s"
            self.cur.execute(sql, (id,))
            result = self.cur.fetchone()

            if result:
                # Если курсор возвращает словарь (DictCursor), используйте result['expires_at']
                # Если кортеж, то result[0]
                expires_at = result[0] if isinstance(result, tuple) else result['expires_at']

                # Проверяем, не истекло ли время.
                # Сравниваем с текущим временем (удаляем tzinfo для совместимости с MySQL datetime)
                now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

                if expires_at > now:
                    return True # Токен найден и еще жив

            return False # Токен не найден или протух

        except Exception as e:
            print(f"Ошибка при проверке токена: {e}")
            return False

    def updateRefreshToken(self, old_id: str, new_id: str, new_max_age: int):
        try:
            # Высчитываем новую дату
            now = datetime.datetime.now(datetime.timezone.utc)
            new_expires_at = now + datetime.timedelta(seconds=new_max_age)

            # Обновляем запись (ротация токена)
            sql = "UPDATE `refresh` SET `id` = %s, `max_age` = %s, `expires_at` = %s WHERE `id` = %s"
            self.cur.execute(sql, (new_id, new_max_age, new_expires_at, old_id))
            self.mysql.connection.commit()

        except Exception as e:
            print(f"Ошибка при обновлении токена: {e}")
            self.mysql.connection.rollback()

    def deleteRefreshToken(self, id: str):
        try:
            sql = "DELETE FROM `refresh` WHERE `id` = %s"
            self.cur.execute(sql, (id,))
            self.mysql.connection.commit()

        except Exception as e:
            print(f"Ошибка при удалении токена: {e}")
            self.mysql.connection.rollback()

    def autoDeleteRefreshTokens(self):
        try:
            # Используем встроенную функцию MySQL UTC_TIMESTAMP() для быстрого удаления
            sql = "DELETE FROM `refresh` WHERE `expires_at` < UTC_TIMESTAMP()"
            self.cur.execute(sql)
            self.mysql.connection.commit()

        except Exception as e:
            print(f"Ошибка при очистке старых токенов: {e}")
            self.mysql.connection.rollback()