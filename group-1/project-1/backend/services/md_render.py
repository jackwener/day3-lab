"""Markdown rendering and XSS sanitization."""

from __future__ import annotations

import re
from typing import Optional
import markdown
import bleach


# Allowed HTML tags (whitelist)
ALLOWED_TAGS = [
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'em', 'strong', 'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'br', 'hr', 'span', 'div'
]

# Allowed attributes per tag
ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'table': ['class'],
    'th': ['align'],
    'td': ['align'],
    'span': ['class'],
    'div': ['class'],
    'code': ['class'],
    'pre': ['class'],
}

# Dangerous URL schemes to block
DANGEROUS_URL_SCHEMES = re.compile(
    r'^\s*(javascript|data|vbscript|file):',
    re.IGNORECASE
)

# Allowed protocols
ALLOWED_PROTOCOLS = ['http', 'https']


def sanitize_url(url: Optional[str]) -> Optional[str]:
    """Sanitize a URL, blocking dangerous schemes.
    
    Args:
        url: URL to sanitize
    
    Returns:
        str or None: Sanitized URL or None if dangerous
    """
    if not url:
        return None
    
    url = url.strip()
    
    # Check for dangerous schemes
    if DANGEROUS_URL_SCHEMES.match(url):
        return None
    
    # Allow relative URLs and http/https
    if url.startswith('/') or url.startswith('./') or url.startswith('../'):
        return url
    
    if url.startswith('http://') or url.startswith('https://'):
        return url
    
    # Allow anchor links
    if url.startswith('#'):
        return url
    
    # Default: allow (but could be more restrictive)
    return url


class MdRender:
    """Markdown renderer with XSS sanitization.
    
    Uses markdown library for parsing, then bleach for HTML sanitization.
    """
    
    def __init__(
        self,
        allowed_tags: Optional[list[str]] = None,
        allowed_attributes: Optional[dict] = None
    ):
        """Initialize renderer.
        
        Args:
            allowed_tags: Override default allowed tags
            allowed_attributes: Override default allowed attributes
        """
        self.allowed_tags = allowed_tags or ALLOWED_TAGS
        self.allowed_attributes = allowed_attributes or ALLOWED_ATTRIBUTES
        
        # Initialize markdown parser
        self.md = markdown.Markdown(
            extensions=[
                'fenced_code',
                'codehilite',
                'tables',
                'toc'
            ]
        )
    
    def render(self, markdown_text: str) -> str:
        """Render markdown to sanitized HTML.
        
        Args:
            markdown_text: Raw markdown content
        
        Returns:
            str: Sanitized HTML
        """
        if not markdown_text:
            return ""
        
        # Reset markdown parser state
        self.md.reset()
        
        # Convert markdown to HTML
        html = self.md.convert(markdown_text)
        
        # Sanitize HTML
        clean_html = bleach.clean(
            html,
            tags=self.allowed_tags,
            attributes=self.allowed_attributes,
            protocols=ALLOWED_PROTOCOLS,
            strip=True
        )
        
        # Additional URL sanitization for links
        clean_html = self._sanitize_urls_in_html(clean_html)
        
        return clean_html
    
    def _sanitize_urls_in_html(self, html: str) -> str:
        """Sanitize URLs in HTML attributes.
        
        Args:
            html: HTML string
        
        Returns:
            str: HTML with sanitized URLs
        """
        # This is a simple implementation - bleach should handle most cases
        # but we add extra protection for href/src attributes
        def sanitize_attr(match):
            attr = match.group(1)
            url = match.group(2)
            sanitized = sanitize_url(url)
            if sanitized:
                return f'{attr}="{sanitized}"'
            return ''
        
        # Match href="..." or src="..."
        html = re.sub(
            r'(href|src)\s*=\s*["\']([^"\']*)["\']',
            sanitize_attr,
            html,
            flags=re.IGNORECASE
        )
        
        return html
    
    def is_safe(self, html: str) -> bool:
        """Check if HTML content is safe.
        
        Args:
            html: HTML string to check
        
        Returns:
            bool: True if HTML passes safety checks
        """
        # Check for script tags
        if re.search(r'<script[^>]*>', html, re.IGNORECASE):
            return False
        
        # Check for event handlers (onclick, onerror, etc.)
        if re.search(r'\bon\w+\s*=', html, re.IGNORECASE):
            return False
        
        # Check for javascript: URLs
        if re.search(r'javascript:', html, re.IGNORECASE):
            return False
        
        return True
    
    def strip_dangerous(self, text: str) -> str:
        """Strip dangerous content from text.
        
        Args:
            text: Input text
        
        Returns:
            str: Text with dangerous content removed
        """
        # Remove script tags
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove event handlers
        text = re.sub(r'\s+on\w+\s*=\s*["\'][^"\']*["\']', '', text, flags=re.IGNORECASE)
        
        # Remove javascript: URLs
        text = re.sub(r'javascript:[^"\'>\s]*', '', text, flags=re.IGNORECASE)
        
        return text


# Global renderer instance
_renderer: Optional[MdRender] = None


def get_renderer() -> MdRender:
    """Get the global markdown renderer instance.
    
    Returns:
        MdRender: Global instance
    """
    global _renderer
    if _renderer is None:
        _renderer = MdRender()
    return _renderer


def render_markdown(markdown_text: str) -> str:
    """Convenience function to render markdown.
    
    Args:
        markdown_text: Raw markdown content
    
    Returns:
        str: Sanitized HTML
    """
    return get_renderer().render(markdown_text)
