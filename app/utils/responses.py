from typing import Any


def success(data: Any) -> dict:
    return {"success": True, "data": data, "error": None}


def failure(code: str, message: str) -> dict:
    return {"success": False, "data": None, "error": {"code": code, "message": message}}
