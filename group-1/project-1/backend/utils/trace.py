"""Trace ID generation utility."""

from __future__ import annotations

import uuid

from flask import g, has_request_context


def generate_trace_id() -> str:
    """Generate a unique trace ID with 'tr_' prefix.
    
    Returns:
        str: Trace ID in format 'tr_' + uuid4 hex
    """
    return f"tr_{uuid.uuid4().hex}"


def get_trace_id() -> str:
    """Get the current trace ID from Flask g, or generate a new one.
    
    Returns:
        str: Current trace ID
    """
    if has_request_context():
        trace_id = getattr(g, "trace_id", None)
        if trace_id:
            return trace_id
    return generate_trace_id()
