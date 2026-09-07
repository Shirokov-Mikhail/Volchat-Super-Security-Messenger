#improted libraries
import jwt
#standard library
import uuid
import datetime

class DataBaseLoader:
    def __init__(self, mysql):
        self.mysql = mysql
        self.cur = mysql.connection.cursor()

    def auth(self, login) -> tuple[dict, bool]:
        try:
            with self.mysql.connection.cursor() as cur:
                cur.execute(f'''SELECT EXISTS(SELECT 1 FROM users WHERE `Login` = %s);''', (login,))
                if int(cur.fetchall()[0][0]) == int(1):
                    data = {}
                    cur.execute(f'''SELECT `id`, `iv`, `private_key`, `public_key` FROM users WHERE `Login` = %s; ''', (login,))
                    data['id'], data['iv'], data['key'], data['public'] = cur.fetchone()
                    return data, True
            return {}, False
        except Exception as e:
            print('auth', e)
            return {}, False

    def check_login(self, login) -> bool:
        try:
            with self.mysql.connection.cursor() as cur:
                cur.execute(f'''SELECT `id` FROM `users` WHERE `Login`=%s; ''', (login,))
                db_data = cur.fetchone()

                if db_data is None:
                    return True
                return False
        except Exception as e:
            print('check-login', e)
            return False

    def select_user_id_where_login(self, id) -> str:
        with self.mysql.connection.cursor() as cur:
            cur.execute(f'''SELECT `Login` FROM `users` WHERE `id`=%s; ''', (id,))
            db_data = cur.fetchone()
            if db_data is None:
                return ''
            return db_data[0]

    def fast_registration(self, login) -> int | None:#выделяем место под пользователя
        try:
            with self.mysql.connection.cursor() as cur:
                cur.execute(f'''INSERT INTO `users`(`Login`, `private_key`, `public_key`, `iv`) VALUES (%s,NULL,NULL,NULL);''', (login,))
                id = cur.lastrowid
                self.mysql.connection.commit()

            return id
        except Exception as e:
            print('fast-registration', e)
            return None

    def registration(self, login, public_key, private_key, iv) -> bool:
        try:

            print(login, public_key, private_key, iv, sep='\n')
            with self.mysql.connection.cursor() as cur:
                cur.execute(f'''UPDATE `users` SET `private_key`=%s,`public_key`=%s,`iv`=%s WHERE `Login`=%s;''', (private_key, public_key, iv, login))
                self.mysql.connection.commit()
            return True
        except Exception as e:
            print('registration', e)
            return False

    def select_id(self, login) -> int | bool:
        try:
            with self.mysql.connection.cursor() as cur:
                cur.execute(f'''SELECT `id` FROM `users` WHERE `Login`=%s; ''', (login,))
                db_data = cur.fetchone()
                if db_data is not None:
                    return int(db_data[0])
                return False
        except Exception as e:
            print('select-id', e)
            return False

    def load_chat_member(self, user_id:int) -> list:
        try:
            with self.mysql.connection.cursor() as cur:
                cur.execute(f'''SELECT `chat_id` FROM `chat_members` WHERE `user_id`=%s ''', (user_id,))
                chat_ids = [i[0] for i in cur.fetchall()]

            return chat_ids
        except Exception as e:
            print('load-chat-member', e)
            return []

    def load_chats(self, user_id: int) -> list:
        try:
            chat_ids = self.load_chat_member(user_id)
            if not chat_ids:
                return []
            format_strings = ', '.join(['%s'] * len(chat_ids))
            query = f"SELECT id, name FROM chats WHERE id IN ({format_strings})"

            with self.mysql.connection.cursor() as cur:
                cur.execute(query, tuple(chat_ids))
                return cur.fetchall()

        except Exception as e:
            print(f"Error in load_chats: {e}")
            return []

    def load_messages(self, user_id:int, chat_id:int) -> tuple[list, list, list]:
        try:
            with self.mysql.connection.cursor() as cur:
                cur.execute(f'''SELECT `content` FROM `messages` WHERE `chat_id`=%s AND `author_id`=%s;''', (chat_id, user_id))
                out = [i[0] for i in cur.fetchall()]
                cur.execute(f'''SELECT `content` FROM `messages` WHERE `chat_id`=%s AND `author_id`!=%s;''', (chat_id, user_id))
                into = [i[0] for i in cur.fetchall()]
                cur.execute(f'''SELECT `content`, `author_id`, `iv` FROM `messages` WHERE `chat_id`=%s;''', (chat_id,))

                all = [(i[0], True if int(i[1]) == user_id else False, i[2]) for i in cur.fetchall()]

                return out, into, all
        except Exception as e:
            print('load-messages', e)
            return [], [], []

    #Только когда в чате 2 человек
    def search_user_info(self, user_id, chat_id) -> tuple[bool, list]:
        try:

            with self.mysql.connection.cursor() as cur:
                cur.execute(f'''SELECT `user_id` FROM `chat_members` WHERE `user_id` <> %s AND `chat_id`=%s;''', (user_id, chat_id))
                result = cur.fetchall()
                if not result:
                    raise ValueError("No other members found in the chat.")
                friend_id = list(filter(lambda x: x != 0, [i[0] for i in result]))[0]

            return True, friend_id
        except Exception as e:
            print('serch-user-info', e)
            return False, []

    def load_friends_info(self, user_id, chat_id) -> tuple[str, str, int] | tuple[None, None, None]:
        try:
            is_found, friend_id = self.search_user_info(user_id, chat_id)
            if is_found:
                with self.mysql.connection.cursor() as cur:
                    cur.execute(f''' SELECT `Login`, `public_key` FROM `users` WHERE `id`=%s;''', (friend_id,))
                    friend_login, public_key = cur.fetchone()
                return friend_login, public_key, friend_id
            else:
                raise ValueError('User not found')
        except Exception as e:
            print('load Friends info', e)
            return None, None, None

    def send_messages(self, message, user_id, chat_id, iv, type_message='text') -> bool:
        try:
            with self.mysql.connection.cursor() as cur:
                if type_message == 'text' or True:
                    cur.execute(f'''INSERT INTO `messages`(`chat_id`, `author_id`, `content`, `iv`) VALUES (%s,%s,%s,%s) ''', (chat_id, user_id, message, iv))
                else:
                    cur.execute(f'''INSERT INTO `messages`(`chat_id`, `author_id`, `content`, `type`) VALUES (%s,%s,%s,%s) ''', (chat_id, user_id, message, type_message))
            self.mysql.connection.commit()
            return True
        except Exception as e:
            print('send messages', e)
            return False


    def generate_chat_members(self, chat_id, members:list) -> bool:
        try:

            for member in members:
                with self.mysql.connection.cursor() as cur:
                    cur.execute(f'''INSERT INTO `chat_members`(`chat_id`, `user_id`) VALUES (%s,%s)''', (chat_id, member))
            return True
        except Exception as e:
            print('generate', e)
            self.close()
            return False



    def new_chat(self, name: str, members: list, description: str = None, chat_type: str = 'local') -> tuple[int, str]:
        try:
            final_name = name
            counter = 0
            with self.mysql.connection.cursor() as cur:
                while True:
                    cur.execute("SELECT 1 FROM chats WHERE `name` = %s LIMIT 1", (final_name,))
                    if not cur.fetchone():
                        break
                    counter += 1
                    final_name = f"{name}_{counter}"
                query = "INSERT INTO `chats` (`name`, `type`, `description`) VALUES (%s, %s, %s)"
                cur.execute(query, (final_name, chat_type, description))
                chat_id = cur.lastrowid
                if not self.generate_chat_members(chat_id, members):
                    self.mysql.connection.rollback()
                    return -1, ''
                self.mysql.connection.commit()
                return chat_id, final_name

        except Exception as e:
            self.mysql.connection.rollback()
            print(f"Error in new_chat: {e}")
            return -1, ''

    def open_all_members_names(self) -> list:
        try:
            with self.mysql.connection.cursor() as cur:
                cur.execute(f'''SELECT `id`, `Login` FROM `users`''')
                all_users = [(i[0], i[1]) for i in cur.fetchall()]
                return all_users
        except Exception as e:
            print('open all members names', e)
            return []

    def close(self):
        if self.cur:
            self.cur.close()

    def publickey_for_user_id(self, user_id) -> str | None:
        try:
            with self.mysql.connection.cursor() as cur:
                cur.execute(f'''SELECT `public_key` FROM `users` WHERE `id`=%s;''', (user_id,))
                result = cur.fetchone()
            return result[0] if result else None
        except Exception as e:
            print(e)

#для работы с токенами
class DbTokenAccessCheck(DataBaseLoader):
    def __init__(self, mysql):
        super().__init__(mysql)

    def addRefreshToken(self, id: str, max_age: int):
        try:
            now = datetime.datetime.now(datetime.timezone.utc)
            expires_at = now + datetime.timedelta(seconds=max_age)

            # Используем %s для защиты от SQL-инъекций
            sql = "INSERT INTO `refresh` (`id`, `max_age`, `expires_at`) VALUES (%s, %s, %s)"
            with self.mysql.connection.cursor() as cur:
                cur.execute(sql, (id, max_age, expires_at))
            self.mysql.connection.commit() # Обязательно сохраняем изменения!

        except Exception as e:
            print(f"Ошибка при добавлении токена: {e}")
            self.mysql.connection.rollback()

    def checkRefreshToken(self, id: str) -> bool:
        try:
            sql = "SELECT `expires_at` FROM `refresh` WHERE `id` = %s"
            with self.mysql.connection.cursor() as cur:
                cur.execute(sql, (id,))
                result = cur.fetchone()

            if result:
                expires_at = result[0] if isinstance(result, tuple) else result['expires_at']

                now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

                if expires_at > now:
                    return True # Токен найден и еще жив

            return False # Токен не найден или протух

        except Exception as e:
            print(f"Ошибка при проверке токена: {e}")
            return False

    def updateRefreshToken(self, old_id: str, new_id: str, new_max_age: int):
        try:
            now = datetime.datetime.now(datetime.timezone.utc)
            new_expires_at = now + datetime.timedelta(seconds=new_max_age)
            sql = "UPDATE `refresh` SET `id` = %s, `max_age` = %s, `expires_at` = %s WHERE `id` = %s"
            with self.mysql.connection.cursor() as cur:
                cur.execute(sql, (new_id, new_max_age, new_expires_at, old_id))
            self.mysql.connection.commit()

        except Exception as e:
            print(f"Ошибка при обновлении токена: {e}")
            self.mysql.connection.rollback()

    def deleteRefreshToken(self, id: str):
        try:
            sql = "DELETE FROM `refresh` WHERE `id` = %s"
            with self.mysql.connection.cursor() as cur:
                cur.execute(sql, (id,))
            self.mysql.connection.commit()

        except Exception as e:
            print(f"Ошибка при удалении токена: {e}")
            self.mysql.connection.rollback()

    def autoDeleteRefreshTokens(self):
        try:
            sql = "DELETE FROM `refresh` WHERE `expires_at` < UTC_TIMESTAMP()"
            with self.mysql.connection.cursor() as cur:
                cur.execute(sql)
            self.mysql.connection.commit()

        except Exception as e:
            print(f"Ошибка при очистке старых токенов: {e}")
            self.mysql.connection.rollback()


class TokenManager(DbTokenAccessCheck):
    def __init__(self, mysql, ACCESS_SECRET = "super_secret_for_access", REFRESH_SECRET = "super_secret_for_refresh"):
        super().__init__(mysql)
        self.ACCESS_SECRET = ACCESS_SECRET
        self.REFRESH_SECRET = REFRESH_SECRET

        self.ACCESS_MAX_AGE = 60 * 60  # 60 минут
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
            json_web_token = self._generate_access(user_id)
            return str(json_web_token)

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

