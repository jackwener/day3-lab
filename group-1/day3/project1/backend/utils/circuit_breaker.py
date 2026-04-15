"""Circuit breaker pattern implementation for fault tolerance."""

import time
import threading
from enum import Enum
from typing import Callable, TypeVar, Any
from functools import wraps

T = TypeVar('T')


class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation, requests pass through
    OPEN = "open"  # Failing, requests are blocked
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """Circuit breaker for protecting against cascading failures.
    
    Implements the circuit breaker pattern with three states:
    - Closed: Normal operation, all requests pass through
    - Open: Circuit is tripped, all requests fail fast
    - Half-Open: Testing if the service has recovered
    
    State transitions:
    - Closed -> Open: After consecutive_failure_threshold failures
    - Open -> Half-Open: After recovery_timeout seconds
    - Half-Open -> Closed: On successful request
    - Half-Open -> Open: On failed request
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        name: str = "default"
    ):
        """Initialize circuit breaker.
        
        Args:
            failure_threshold: Number of consecutive failures to trip circuit
            recovery_timeout: Seconds to wait before attempting recovery
            name: Name for logging/identification purposes
        """
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.name = name
        
        self._state = CircuitState.CLOSED
        self._consecutive_failures = 0
        self._last_failure_time: float | None = None
        self._lock = threading.RLock()
    
    @property
    def state(self) -> str:
        """Get current circuit state.
        
        Returns:
            str: Current state ('closed', 'open', 'half_open')
        """
        with self._lock:
            # Check if we should transition from OPEN to HALF_OPEN
            if self._state == CircuitState.OPEN:
                if self._should_attempt_recovery():
                    self._state = CircuitState.HALF_OPEN
            return self._state.value
    
    def _should_attempt_recovery(self) -> bool:
        """Check if enough time has passed to attempt recovery.
        
        Returns:
            bool: True if should attempt recovery
        """
        if self._last_failure_time is None:
            return True
        return time.time() - self._last_failure_time >= self.recovery_timeout
    
    def _record_success(self) -> None:
        """Record a successful call, potentially closing the circuit."""
        with self._lock:
            self._consecutive_failures = 0
            self._state = CircuitState.CLOSED
    
    def _record_failure(self) -> None:
        """Record a failed call, potentially opening the circuit."""
        with self._lock:
            self._consecutive_failures += 1
            self._last_failure_time = time.time()
            
            if self._state == CircuitState.HALF_OPEN:
                # Failed during recovery attempt, back to OPEN
                self._state = CircuitState.OPEN
            elif self._consecutive_failures >= self.failure_threshold:
                # Threshold reached, trip the circuit
                self._state = CircuitState.OPEN
    
    def call(self, func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
        """Execute a function with circuit breaker protection.
        
        Args:
            func: Function to execute
            *args: Positional arguments for the function
            **kwargs: Keyword arguments for the function
        
        Returns:
            The return value of the function
        
        Raises:
            CircuitBreakerOpen: If circuit is open and not ready for recovery
            Exception: Re-raises any exception from the function
        """
        current_state = self.state
        
        if current_state == "open":
            raise CircuitBreakerOpen(
                f"Circuit breaker '{self.name}' is open"
            )
        
        try:
            result = func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            raise
    
    def is_available(self) -> bool:
        """Check if the circuit allows requests.
        
        Returns:
            bool: True if requests can pass through
        """
        return self.state != "open"
    
    def reset(self) -> None:
        """Reset the circuit breaker to closed state."""
        with self._lock:
            self._state = CircuitState.CLOSED
            self._consecutive_failures = 0
            self._last_failure_time = None


class CircuitBreakerOpen(Exception):
    """Exception raised when circuit breaker is open."""
    pass


def with_circuit_breaker(breaker: CircuitBreaker):
    """Decorator to wrap a function with circuit breaker protection.
    
    Args:
        breaker: CircuitBreaker instance to use
    
    Returns:
        Decorator function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            return breaker.call(func, *args, **kwargs)
        return wrapper
    return decorator
