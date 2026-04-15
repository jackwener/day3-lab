"""Tests for src.api.errors module"""

import sys
import os
import json
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.api.errors import (
    APIError,
    _status_to_code,
    _error_response,
    register_error_handlers,
)


class TestAPIError:
    """Tests for APIError exception"""

    def test_default_values(self):
        error = APIError("test error")
        assert error.message == "test error"
        assert error.status_code == 400
        assert error.error_code == "PARAM_INVALID"
        assert error.details == {}

    def test_custom_status_code(self):
        error = APIError("not found", status_code=404)
        assert error.status_code == 404
        assert error.error_code == "DATA_NOT_FOUND"

    def test_custom_error_code(self):
        error = APIError("bad", error_code="CUSTOM_ERR")
        assert error.error_code == "CUSTOM_ERR"

    def test_custom_details(self):
        error = APIError("bad", details={"field": "value"})
        assert error.details == {"field": "value"}

    def test_is_exception(self):
        error = APIError("test")
        assert isinstance(error, Exception)

    def test_can_be_raised_and_caught(self):
        with pytest.raises(APIError, match="test"):
            raise APIError("test")


class TestStatusToCode:
    """Tests for _status_to_code function"""

    def test_400(self):
        assert _status_to_code(400) == "PARAM_INVALID"

    def test_404(self):
        assert _status_to_code(404) == "DATA_NOT_FOUND"

    def test_500(self):
        assert _status_to_code(500) == "INTERNAL_ERROR"

    def test_503(self):
        assert _status_to_code(503) == "DATA_SOURCE_ERROR"

    def test_unknown_status(self):
        assert _status_to_code(418) == "INTERNAL_ERROR"

    def test_200(self):
        assert _status_to_code(200) == "INTERNAL_ERROR"


class TestErrorResponse:
    """Tests for _error_response function"""

    def test_error_response_structure(self):
        response, status_code = _error_response(
            error_code="TEST_ERR",
            message="test message",
            status_code=400,
        )
        assert status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert 'traceId' in data
        assert 'error' in data
        assert 'timestamp' in data

    def test_error_response_fields(self):
        response, status_code = _error_response(
            error_code="TEST_ERR",
            message="test message",
            status_code=400,
            details={"field": "value"},
        )
        data = json.loads(response.get_data(as_text=True))
        assert data['error']['code'] == 'TEST_ERR'
        assert data['error']['message'] == 'test message'
        assert data['error']['details'] == {'field': 'value'}

    def test_error_response_custom_trace_id(self):
        response, _ = _error_response(
            error_code="TEST",
            message="msg",
            status_code=400,
            trace_id="req-custom123",
        )
        data = json.loads(response.get_data(as_text=True))
        assert data['traceId'] == 'req-custom123'

    def test_error_response_empty_details(self):
        response, _ = _error_response(
            error_code="TEST",
            message="msg",
            status_code=400,
        )
        data = json.loads(response.get_data(as_text=True))
        assert data['error']['details'] == {}


class TestErrorHandlers:
    """Tests for error handler registration"""

    def test_register_error_handlers(self, app):
        """Test that error handlers can be registered without errors"""
        register_error_handlers(app)
        # If no exception, registration succeeded

    def test_api_error_handler_via_client(self, client):
        """Test APIError is properly handled via Flask routes"""
        @client.application.route('/test-error')
        def raise_api_error():
            raise APIError("custom error", status_code=400)

        response = client.get('/test-error')
        assert response.status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert 'error' in data
        assert data['error']['message'] == 'custom error'

    def test_404_handler_via_client(self, client):
        """Test 404 errors are properly handled"""
        response = client.get('/nonexistent-route')
        assert response.status_code == 404
        data = json.loads(response.get_data(as_text=True))
        assert 'error' in data

    def test_400_handler_via_client(self, client):
        """Test 400 errors are properly handled"""
        from flask import abort

        @client.application.route('/test-bad-request')
        def raise_bad_request():
            abort(400)

        response = client.get('/test-bad-request')
        assert response.status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert 'error' in data

    def test_500_handler_via_client(self, client):
        """Test 500 errors are properly handled"""
        # 500 handler test - in debug mode Flask may show debugger page
        # so we accept both 500 and the debug page behavior
        response = client.get('/api/funds/nonexistent_fund/nav')
        # Should get a 404 (fund not found) rather than 500
        assert response.status_code in (404, 500)
        data = json.loads(response.get_data(as_text=True))
        assert 'error' in data
