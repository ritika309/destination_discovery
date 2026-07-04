import json
import re


def extract_json(text):
    """Best-effort JSON extraction (object or array) from a Gemini text response."""
    try:
        return json.loads(text)
    except Exception:
        pass
    for pattern in (r"\{[\s\S]*\}", r"\[[\s\S]*\]"):
        match = re.search(pattern, text)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                continue
    return None
