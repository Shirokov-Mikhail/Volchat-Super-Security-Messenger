import secrets
import base64
import json
import hashlib
from ecdsa import VerifyingKey, BadSignatureError, NIST256p

def generate_nonce() -> str:
    """
    Генерирует криптографически безопасный одноразовый токен.
    Возвращает строку из 32 hex-символов.
    """
    return secrets.token_hex(16)

def verify_nonce_signature(original_nonce: str, signature_b64: str, public_key_jwk_str: str) -> bool:
    """
    Проверяет, действительно ли nonce был подписан приватным ключом пользователя.
    Адаптировано под Volchat: ключ приходит в формате JWK, хэширование SHA-256.

    :param original_nonce: Исходный nonce из временной памяти
    :param signature_b64: Подпись от клиента в Base64
    :param public_key_jwk_str: Публичный ключ из БД MySQL в виде JSON-строки (JWK)
    :return: True если подпись верна, иначе False
    """
    try:
        # 1. Парсим JWK (который JS сохранил в БД как строку)
        jwk = json.loads(public_key_jwk_str)

        # Вспомогательная функция: JWK использует Base64URL без паддинга ('='),
        # а стандартной библиотеке Python нужны отступы.
        def b64url_to_bytes(s: str) -> bytes:
            s += '=' * (-len(s) % 4)
            return base64.urlsafe_b64decode(s)

        # 2. Извлекаем сырые байты координат эллиптической кривой
        x_bytes = b64url_to_bytes(jwk['x'])
        y_bytes = b64url_to_bytes(jwk['y'])

        # 3. Собираем рабочий публичный ключ P-256 из сырых координат
        vk = VerifyingKey.from_string(x_bytes + y_bytes, curve=NIST256p)

        # 4. Декодируем саму подпись из обычного Base64
        signature_bytes = base64.b64decode(signature_b64)

        # 5. Проверяем подпись. ВАЖНО: явно указываем SHA-256!
        is_valid = vk.verify(
            signature_bytes,
            original_nonce.encode('utf-8'),
            hashfunc=hashlib.sha256
        )

        return is_valid

    except BadSignatureError:
        # Срабатывает, если подпись криптографически не совпадает
        return False
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, base64.binascii.Error) as e:
        # Срабатывает при битом Base64, неправильном JSON или отсутствии 'x'/'y'
        print(f"[AUTH ERROR] Ошибка парсинга данных: {e}")
        return False