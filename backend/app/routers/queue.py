from fastapi import APIRouter, Query

from app.services.queue_logic import build_queue

router = APIRouter(tags=["queue"])


@router.get("/queue")
def get_queue(
    vibe: str | None = Query(default=None, description="Optional vibe filter"),
) -> list[dict]:
    return build_queue(vibe=vibe)
