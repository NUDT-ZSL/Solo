import uuid
from datetime import datetime
from typing import Dict, List, Optional
from .models import RetroItem, RetroType


class MemoryStorage:
    def __init__(self):
        self._items: Dict[str, RetroItem] = {}
        self._by_type: Dict[RetroType, List[str]] = {
            RetroType.good: [],
            RetroType.improve: [],
            RetroType.action: [],
        }
        self._counters: Dict[RetroType, int] = {
            RetroType.good: 0,
            RetroType.improve: 0,
            RetroType.action: 0,
        }

    def add_item(self, item_type: RetroType, content: str) -> RetroItem:
        item_id = str(uuid.uuid4())
        self._counters[item_type] += 1
        order = self._counters[item_type]
        item = RetroItem(
            id=item_id,
            type=item_type,
            content=content,
            created_at=datetime.now(),
            order=order,
        )
        self._items[item_id] = item
        self._by_type[item_type].append(item_id)
        return item

    def get_all(self) -> List[RetroItem]:
        return sorted(
            self._items.values(),
            key=lambda x: (x.type.value, x.order),
        )

    def get_by_id(self, item_id: str) -> Optional[RetroItem]:
        return self._items.get(item_id)

    def delete_item(self, item_id: str) -> bool:
        item = self._items.get(item_id)
        if not item:
            return False
        del self._items[item_id]
        if item_id in self._by_type[item.type]:
            self._by_type[item.type].remove(item_id)
        self.reorder(item.type)
        return True

    def reorder(self, item_type: RetroType) -> None:
        ids = self._by_type[item_type]
        self._counters[item_type] = len(ids)
        for idx, item_id in enumerate(ids, start=1):
            if item_id in self._items:
                self._items[item_id].order = idx


storage = MemoryStorage()
