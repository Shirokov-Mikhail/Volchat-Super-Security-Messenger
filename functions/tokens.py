import jwt
import datetime
import uuid
from db import DbTokenAccessCheck

class TokenManager(DbTokenAccessCheck):
    def __init__(self, mysql):
        super().__init__(mysql)
        self.ACCESS_SECRET = "super_secret_for_access"
        self.REFRESH_SECRET = "super_secret_for_refresh"

        self.ACCESS_MAX_AGE = 15 * 60  # 15 минут
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
        """
        Проверяет токен на подлинность.
        Возвращает расшифрованный payload (данные внутри токена).
        """
        if expected_type not in ['access', 'refresh']:
            raise ValueError("expected_type должен быть 'access' или 'refresh'")

        # Выбираем правильный секрет для расшифровки
        secret = self.ACCESS_SECRET if expected_type == 'access' else self.REFRESH_SECRET

        try:
            # jwt.decode автоматически проверит подпись и срок действия (exp)
            payload = jwt.decode(token_string, secret, algorithms=['HS256'])

            # Проверяем, что нам не подсунули refresh вместо access и наоборот
            if payload.get('type') != expected_type:
                raise ValueError(f"Неверный тип токена. Ожидался: {expected_type}")

            # Если это refresh-токен, обязательно проверяем его наличие в базе
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
            # Переиспользуем нашу новую функцию проверки
            payload = self.verify_token(refresh_token_string, expected_type='refresh')
            user_id = payload.get('user_id')
            return self._generate_access(user_id)
        except ValueError as e:
            raise ValueError(f"Block users")

        finally:
            raise Exception("Fatality server error")

    def rotate_tokens(self, refresh_token_string: str):
        try:
            # Переиспользуем нашу новую функцию проверки
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

