"""Rate limiting utility for API endpoints."""

from __future__ import annotations

import time
import threading
from collections import defaultdict, deque
from functools import wraps
from typing import Callable, Optional
from flask import request, g

from utils.errors import ApiError, api_error, ErrorCode


class RateLimiter:
    """Thread-safe rate limiter using sliding window algorithm.
    
    Tracks request counts per key (e.g., visitor_id, IP address) and
    enforces rate limits based on configurable thresholds.
    """
    
    def __init__(self):
        """Initialize rate limiter with empty tracking storage."""
        self._requests: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()
    
    def _cleanup_old_requests(self, key: str, window_start: float) -> None:
        """Remove requests outside the time window.
        
        Args:
            key: Identifier for the rate limit bucket
            window_start: Start of the valid time window
        """
        while self._requests[key] and self._requests[key][0] < window_start:
            self._requests[key].popleft()
    
    def is_allowed(self, key: str, max_calls: int, period: int) -> tuple[bool, int]:
        """Check if a request is allowed under the rate limit.
        
        Args:
            key: Identifier for the rate limit bucket (e.g., visitor_id)
            max_calls: Maximum number of calls allowed in the period
            period: Time period in seconds
        
        Returns:
            tuple: (is_allowed: bool, retry_after: int seconds)
        """
        with self._lock:
            current_time = time.time()
            window_start = current_time - period
            
            # Clean up old requests
            self._cleanup_old_requests(key, window_start)
            
            # Count requests in current window
            request_count = len(self._requests[key])
            
            if request_count >= max_calls:
                # Calculate retry_after based on oldest request in window
                oldest = self._requests[key][0] if self._requests[key] else current_time
                retry_after = int(oldest + period - current_time) + 1
                return False, max(1, retry_after)
            
            # Record this request
            self._requests[key].append(current_time)
            return True, 0
    
    def reset(self, key: Optional[str] = None) -> None:
        """Reset rate limit counter.
        
        Args:
            key: Identifier for the rate limit bucket (resets all if None)
        """
        with self._lock:
            if key is None:
                self._requests.clear()
            elif key in self._requests:
                del self._requests[key]


# Global rate limiter instance
_rate_limiter = RateLimiter()


def get_rate_limiter() -> RateLimiter:
    """Get the global rate limiter instance.
    
    Returns:
        RateLimiter: Global rate limiter instance
    """
    return _rate_limiter


def reset_rate_limits() -> None:
    """Reset all rate limits (for testing)."""
    _rate_limiter.reset()


def get_client_key() -> str:
    """Get a unique key for the current client.
    
    Uses visitor_id from cookie if available, otherwise falls back to
    IP address.
    
    Returns:
        str: Unique client identifier
    """
    visitor_id = request.cookies.get('hub_visitor')
    if visitor_id:
        return f"visitor:{visitor_id}"
    
    # Fall back to IP address
    # Check for X-Forwarded-For header first (for reverse proxy setups)
    forwarded = request.headers.get('X-Forwarded-For')
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    
    return f"ip:{request.remote_addr}"


def _client_key() -> str:
    """Legacy function for backward compatibility.
    
    Returns:
        str: Client IP address
    """
    return request.headers.get("X-Forwarded-For") or request.remote_addr or "127.0.0.1"


def rate_limit(max_calls: int, period: int, key_func: Optional[Callable[[], str]] = None):
    """Decorator for rate limiting API endpoints.
    
    Args:
        max_calls: Maximum number of calls allowed in the period
        period: Time period in seconds
        key_func: Optional function to generate rate limit key
                  (default: uses visitor_id or IP address)
    
    Returns:
        Decorator function
    
    Example:
        @rate_limit(max_calls=5, period=60)
        def my_endpoint():
            return {"data": "ok"}
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get the rate limit key
            if key_func:
                key = key_func()
            else:
                key = f"{request.endpoint}:{_client_key()}"
            
            # Check rate limit
            limiter = get_rate_limiter()
            allowed, retry_after = limiter.is_allowed(key, max_calls, period)
            
            if not allowed:
                raise ApiError(
                    code="RATE_LIMITED",
                    status_code=429,
                    details={"retry_after": retry_after},
                )
            
            # Store remaining count in g for potential use in response headers
            g.rate_limit_remaining = max_calls - len(limiter._requests.get(key, []))
            
            return func(*args, **kwargs)
        
        return wrapper
    
    return decorator


def rate_limit_by_visitor(max_calls: int, period: int):
    """Rate limit decorator specifically keyed by visitor_id.
    
    Args:
        max_calls: Maximum calls per period
        period: Time period in seconds
    
    Returns:
        Decorator function
    """
    def get_visitor_key():
        visitor_id = request.cookies.get('hub_visitor', 'anonymous')
        return f"visitor:{visitor_id}:{request.endpoint}"
    
    return rate_limit(max_calls, period, key_func=get_visitor_key)
