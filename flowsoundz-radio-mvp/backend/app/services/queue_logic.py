import random
from collections import defaultdict, deque
from typing import Any

from app.services.catalog import load_catalog

RECENT_BY_VIBE: dict[str, deque[str]] = defaultdict(lambda: deque(maxlen=3))


def build_queue(vibe: str | None = None, limit: int = 6) -> list[dict[str, Any]]:
    songs = load_catalog()
    filtered = [song for song in songs if vibe in (None, "", "all") or song["vibe"] == vibe]

    if not filtered:
        return []

    random.shuffle(filtered)

    recent_key = vibe or "__all__"
    recent_ids = RECENT_BY_VIBE[recent_key]

    fresh = [song for song in filtered if song["id"] not in recent_ids]
    older = [song for song in filtered if song["id"] in recent_ids]
    ordered = fresh + older if fresh else filtered
    queue = ordered[:limit]

    if queue:
        recent_ids.append(queue[0]["id"])

    return queue
