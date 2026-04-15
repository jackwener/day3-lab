import json
from typing import List, Optional, Dict, Any

from database import get_connection


def get_history_list(page: int = 1, page_size: int = 20) -> Dict[str, Any]:
    conn = get_connection()
    cur = conn.cursor()

    offset = (page - 1) * page_size

    cur.execute("SELECT COUNT(*) FROM history")
    total = cur.fetchone()[0]

    cur.execute("""
        SELECT id, ritual_id, ending_title, personality_label, cover_cards, created_at
        FROM history
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    """, (page_size, offset))

    rows = cur.fetchall()

    items = []
    for row in rows:
        r = dict(row)
        cover_cards = json.loads(r.get("cover_cards") or "[]")
        cards = []
        card_names = []
        if cover_cards:
            placeholders = ",".join("?" * len(cover_cards))
            cur.execute(
                f"SELECT id, title, subtitle, type, phase, rarity FROM cards WHERE id IN ({placeholders})",
                cover_cards,
            )
            card_map = {
                card_row["id"]: {
                    "id": card_row["id"],
                    "title": card_row["title"],
                    "subtitle": card_row["subtitle"],
                    "type": card_row["type"],
                    "phase": card_row["phase"],
                    "rarity": card_row["rarity"],
                }
                for card_row in cur.fetchall()
            }

            for card_id in cover_cards:
                card = card_map.get(card_id)
                if card:
                    card_names.append(card["title"])
                    cards.append(card)
                else:
                    fallback = {
                        "id": card_id,
                        "title": card_id,
                        "subtitle": "",
                        "type": "",
                        "phase": "",
                        "rarity": "",
                    }
                    card_names.append(card_id)
                    cards.append(fallback)

        items.append({
            "historyId": r["id"],
            "ritualId": r["ritual_id"],
            "createdAt": r["created_at"],
            "endingTitle": r.get("ending_title"),
            "personalityLabel": r.get("personality_label"),
            "coverCards": cover_cards,
            "cards": cards,
            "cardNames": card_names,
        })

    conn.close()

    return {
        "items": items,
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "total": total,
        },
    }


def get_history_detail(history_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM history WHERE id=?", (history_id,))
    row = cur.fetchone()
    if row is None:
        conn.close()
        return None

    history = dict(row)
    ritual_id = history["ritual_id"]
    conn.close()

    # Reuse report logic
    from services.ritual_service import get_report
    report = get_report(ritual_id)
    return report


def delete_history(history_id: str) -> bool:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM history WHERE id=?", (history_id,))
    if cur.fetchone() is None:
        conn.close()
        return False
    cur.execute("DELETE FROM history WHERE id=?", (history_id,))
    conn.commit()
    conn.close()
    return True


def delete_all_history() -> int:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM history")
    count = cur.fetchone()[0]
    cur.execute("DELETE FROM history")
    conn.commit()
    conn.close()
    return count
