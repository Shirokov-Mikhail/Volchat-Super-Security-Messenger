import secrets
import base64
from ecdsa import VerifyingKey, BadSignatureError

def generate_nonce() -> str:
    """
    Генерирует криптографически безопасный одноразовый токен.
    Возвращает строку из 32 hex-символов.
    """
    return secrets.token_hex(16)

def verify_nonce_signature(original_nonce: str, signature_b64: str, public_key_pem: str) -> bool:
    """
    Проверяет, действительно ли nonce был подписан приватным ключом пользователя.

    :param original_nonce: Исходный nonce, который мы выдали и сохранили в Redis/сессии (str)
    :param signature_b64: Подпись, присланная клиентом, закодированная в Base64 (str)
    :param public_key_pem: Публичный ключ пользователя из базы данных в формате PEM (str)
    :return: True если подпись верна, иначе False
    """
    try:
        vk = VerifyingKey.from_pem(public_key_pem)

        signature_bytes = base64.b64decode(signature_b64)

        is_valid = vk.verify(signature_bytes, original_nonce.encode('utf-8'))

        return is_valid

    except BadSignatureError:
        # Срабатывает, если подпись криптографически не совпадает
        return False
    except (ValueError, TypeError, base64.binascii.Error) as e:
        # Срабатывает при кривых данных (например, битый Base64 или неверный формат ключа)
        print(f"[AUTH ERROR] Ошибка парсинга данных: {e}")
        return False