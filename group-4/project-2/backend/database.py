import sqlite3
import os
import json
from typing import Any

DB_PATH = os.path.join(os.path.dirname(__file__), "fate_cards.db")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_connection()
    cur = conn.cursor()

    # Cards table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS cards (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            subtitle TEXT NOT NULL,
            description TEXT,
            type TEXT NOT NULL,
            phase TEXT NOT NULL,
            rarity TEXT NOT NULL,
            cover_url TEXT,
            illustration_url TEXT,
            tags TEXT,
            times_drawn INTEGER DEFAULT 0,
            last_drawn_at TEXT
        )
    """)

    # Dice faces table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS dice_faces (
            face INTEGER PRIMARY KEY,
            label TEXT NOT NULL,
            rotation TEXT NOT NULL
        )
    """)

    # Endings table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS endings (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            description TEXT NOT NULL,
            mood TEXT NOT NULL,
            theme_color TEXT NOT NULL
        )
    """)

    # Personalities table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS personalities (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            description TEXT NOT NULL
        )
    """)

    # Quotes table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            highlights TEXT NOT NULL
        )
    """)

    # Rituals session table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS rituals (
            id TEXT PRIMARY KEY,
            state TEXT NOT NULL DEFAULT 'initialized',
            enable_dice INTEGER NOT NULL DEFAULT 1,
            draw_count INTEGER NOT NULL DEFAULT 3,
            dice_face INTEGER,
            dice_label TEXT,
            dice_rotation TEXT,
            card_pool TEXT,
            selected_card_ids TEXT,
            phases TEXT,
            ending_id TEXT,
            personality_id TEXT,
            attributes TEXT,
            quote_id INTEGER,
            fate_choice TEXT,
            history_id TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # History table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            ritual_id TEXT NOT NULL,
            ending_title TEXT,
            personality_label TEXT,
            cover_cards TEXT,
            report_snapshot TEXT,
            created_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def row_to_dict(row: sqlite3.Row) -> dict:
    return dict(row)
