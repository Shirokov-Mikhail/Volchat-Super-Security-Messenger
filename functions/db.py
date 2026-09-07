import jwt
import uuid

from werkzeug.security import generate_password_hash, check_password_hash
import datetime

class DataBaseLoader:
    def __init__(self, mysql):
        self.mysql = mysql
        self.cur = mysql.connection.cursor()

    def auth(self, login):
        try:
            self.cur.execute(f'''SELECT EXISTS(SELECT 1 FROM users WHERE `Login` = '{login}');''')

            if int(self.cur.fetchall()[0][0]) == int(1):
                self.cur.execute(f'''SELECT `id`, `iv`, `private_key`, `public_key` FROM users WHERE `Login` = '{login}'; ''')
                self.id, iv, key, public = self.cur.fetchone()
                self.message = iv
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

    def select_user_id_where_login(self, id):
        self.cur.execute(f'''SELECT `Login` FROM `users` WHERE `id`='{id}'; ''')
        db_data = self.cur.fetchone()
        return db_data[0]

    def fast_registration(self, login):#выделяем место под пользователя
        try:
            self.cur.execute(f'''INSERT INTO `users`(`Login`, `private_key`, `public_key`, `iv`) VALUES ('{login}','{None}','{None}','{None}');''')
            self.mysql.connection.commit()
            self.cur.execute(f''' SELECT `id` FROM `users` WHERE `Login`='{login}';''')
            self.id = self.cur.fetchone()[0]
            return
        except Exception as e:
            print('fast-registration', e)

    def registration(self, login, public_key, private_key, iv):
        try:

            print(login, public_key, private_key, iv, sep='\n')
            self.cur.execute(f'''UPDATE `users` SET `private_key`='{private_key}',`public_key`='{public_key}',`iv`='{iv}' WHERE `Login`='{login}';''')
            self.mysql.connection.commit()
            return True
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
            self.cur.execute(f'''SELECT `content`, `author_id`, `iv` FROM `messages` WHERE `chat_id`='{chat_id}';''')

            all = [(i[0], True if int(i[1]) == user_id else False, i[2]) for i in self.cur.fetchall()]

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

                self.cur.execute(f''' SELECT `Login`, `public_key` FROM `users` WHERE `id`='{self.friend_id}';''')
                friend_login, public_key = self.cur.fetchone()
                return friend_login, public_key
            else:
                raise ValueError('User not found')
        except Exception as e:
            print('load Friends info', e)
            return ''

    def send_messages(self, message, user_id, chat_id, iv, type_message='text'):
        try:
            if type_message == 'text' or True:
                self.cur.execute(f'''INSERT INTO `messages`(`chat_id`, `author_id`, `content`, `iv`) VALUES ('{chat_id}','{user_id}','{message}','{iv}') ''')
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



    def new_chat(self, name:str, members:list, desk=None, type='local'):
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

    def publickey_for_user_id(self, user_id):
        try:
            self.cur.execute(f'''SELECT `public_key` FROM `users` WHERE `id`={user_id};''')
            result = self.cur.fetchone()
            return result
        except Exception as e:
            print(e)

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


class TokenManager(DbTokenAccessCheck):
    def __init__(self, mysql, ACCESS_SECRET = "super_secret_for_access", REFRESH_SECRET = "super_secret_for_refresh"):
        super().__init__(mysql)
        self.ACCESS_SECRET = ACCESS_SECRET
        self.REFRESH_SECRET = REFRESH_SECRET

        self.ACCESS_MAX_AGE = 60 * 60  # 15 минут
        self.REFRESH_MAX_AGE = 30 * 24 * 60 * 60  # 30 дней


    def _generate_access(self, user_id: int) -> str:
        now = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            'user_id': user_id,
            'type': 'access',
            'exp': now + datetime.timedelta(seconds=self.ACCESS_MAX_AGE)
        }
        return jwt.encode(payload, self.ACCESS_SECRET, algorithm='HS256')

    def _generate_refresh(self, user_id: int, jti: str) -> str:
        now = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            'user_id': user_id,
            'type': 'refresh',
            'jti': jti,
            'exp': now + datetime.timedelta(seconds=self.REFRESH_MAX_AGE)
        }
        return jwt.encode(payload, self.REFRESH_SECRET, algorithm='HS256')

    def verify_token(self, token_string: str, expected_type: str) -> dict:
        if expected_type not in ['access', 'refresh']:
            raise ValueError("expected_type должен быть 'access' или 'refresh'")

        secret = self.ACCESS_SECRET if expected_type == 'access' else self.REFRESH_SECRET

        try:
            payload = jwt.decode(token_string, secret, algorithms=['HS256'])

            if payload.get('type') != expected_type:
                raise ValueError(f"Неверный тип токена. Ожидался: {expected_type}")

            if expected_type == 'refresh':
                jti = payload.get('jti')
                if not self.checkRefreshToken(jti):
                    raise ValueError("Refresh-токен аннулирован (не найден в базе данных)")

            return payload

        except jwt.ExpiredSignatureError:
            raise ValueError(f"Срок действия {expected_type}-токена истек")
        except jwt.InvalidTokenError:
            raise ValueError(f"Недействительный {expected_type}-токен")

    def check_token(self, token_string: str, expected_type: str) -> list:
        try:
            self.verify_token(token_string, expected_type)
            return [True, None]
        except ValueError as e:
            return [False, f'{e}']

    def create_tokens(self, user_id: int):
        jti = str(uuid.uuid4())

        access_token = self._generate_access(user_id)
        refresh_token = self._generate_refresh(user_id, jti)

        self.addRefreshToken(jti, self.REFRESH_MAX_AGE)

        return access_token, refresh_token

    def refresh_access_token(self, refresh_token_string: str) -> str:
        try:

            payload = self.verify_token(refresh_token_string, expected_type='refresh')

            user_id = payload.get('user_id')
            jwt = self._generate_access(user_id)
            return str(jwt)
        except ValueError as e:
            raise ValueError(f"Block users")

    def rotate_tokens(self, refresh_token_string: str):
        try:

            payload = self.verify_token(refresh_token_string, expected_type='refresh')

            old_jti = payload.get('jti')
            user_id = payload.get('user_id')

            new_jti = str(uuid.uuid4())
            self.updateRefreshToken(old_jti, new_jti, self.REFRESH_MAX_AGE)

            new_access = self._generate_access(user_id)
            new_refresh = self._generate_refresh(user_id, new_jti)

            return new_access, new_refresh
        except ValueError as e:
            raise ValueError(f"Block users")

        finally:
            raise Exception("Fatality server error")

