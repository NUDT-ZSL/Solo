from typing import List, Dict, Any
from datetime import datetime
import uuid

_journals: List[Dict[str, Any]] = []


def add_journal(entry: Dict[str, Any]) -> Dict[str, Any]:
    record = {
        "id": str(uuid.uuid4()),
        "emotion": entry["emotion"],
        "activities": entry.get("activities", []),
        "text": entry["text"],
        "timestamp": entry.get("timestamp") or datetime.utcnow().isoformat(),
    }
    _journals.append(record)
    return record


def get_all_journals() -> List[Dict[str, Any]]:
    return list(_journals)


def get_journals_in_range(start_date: str, end_date: str) -> List[Dict[str, Any]]:
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date + "T23:59:59.999999")
    except ValueError:
        return []

    result = []
    for j in _journals:
        try:
            ts = datetime.fromisoformat(j["timestamp"].replace("Z", "+00:00"))
            if start_dt <= ts <= end_dt:
                result.append(j)
        except (ValueError, KeyError):
            continue
    return result
