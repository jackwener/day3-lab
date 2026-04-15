"""Tests for src.api.response module"""

import sys
import os
import json
import decimal
import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.api.response import (
    CustomJSONProvider,
    success_response,
    _make_trace_id,
    _now_timestamp,
)


class TestMakeTraceId:
    """Tests for _make_trace_id function"""

    def test_trace_id_format(self):
        trace_id = _make_trace_id()
        assert trace_id.startswith('req-')
        assert len(trace_id) == 16  # 'req-' + 12 hex chars

    def test_trace_id_uniqueness(self):
        ids = {_make_trace_id() for _ in range(100)}
        assert len(ids) == 100


class TestNowTimestamp:
    """Tests for _now_timestamp function"""

    def test_timestamp_format(self):
        ts = _now_timestamp()
        assert ts.endswith('Z')
        assert 'T' in ts

    def test_timestamp_is_recent(self):
        ts = _now_timestamp()
        expected = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        # Should be within 1 second
        assert abs(datetime.datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=datetime.timezone.utc
        ).timestamp() - datetime.datetime.now(datetime.timezone.utc).timestamp()) < 2


class TestCustomJSONProvider:
    """Tests for CustomJSONProvider class"""

    def test_serialize_decimal(self):
        provider = CustomJSONProvider(None)
        result = provider.default(decimal.Decimal('123.45'))
        assert result == 123.45
        assert isinstance(result, float)

    def test_serialize_date(self):
        provider = CustomJSONProvider(None)
        result = provider.default(datetime.date(2024, 1, 15))
        assert result == '2024-01-15'

    def test_serialize_datetime(self):
        provider = CustomJSONProvider(None)
        dt = datetime.datetime(2024, 1, 15, 10, 30, 0)
        result = provider.default(dt)
        assert result == '2024-01-15T10:30:00'

    def test_serialize_numpy_integer(self):
        import numpy as np
        provider = CustomJSONProvider(None)
        result = provider.default(np.int64(42))
        assert result == 42
        assert isinstance(result, int)

    def test_serialize_numpy_float(self):
        import numpy as np
        provider = CustomJSONProvider(None)
        result = provider.default(np.float64(3.14))
        assert result == 3.14
        assert isinstance(result, float)

    def test_serialize_numpy_array(self):
        import numpy as np
        provider = CustomJSONProvider(None)
        result = provider.default(np.array([1, 2, 3]))
        assert result == [1, 2, 3]

    def test_serialize_unknown_type_raises(self):
        provider = CustomJSONProvider(None)
        import pytest
        with pytest.raises(TypeError):
            provider.default(object())


class TestSuccessResponse:
    """Tests for success_response function"""

    def test_basic_response(self):
        response = success_response({'key': 'value'})
        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert 'traceId' in data
        assert 'timestamp' in data
        assert data['data'] == {'key': 'value'}

    def test_response_with_pagination(self):
        response = success_response([1, 2, 3], pagination={'page': 1, 'total': 100})
        data = json.loads(response.get_data(as_text=True))
        assert data['pagination'] == {'page': 1, 'total': 100}

    def test_response_preserves_trace_data(self):
        data = {'traceId': 'req-custom', 'data': {'foo': 'bar'}, 'timestamp': '2024-01-01T00:00:00Z'}
        response = success_response(data)
        result = json.loads(response.get_data(as_text=True))
        assert result['traceId'] == 'req-custom'

    def test_response_with_list_data(self):
        response = success_response([{'id': 1}, {'id': 2}])
        data = json.loads(response.get_data(as_text=True))
        assert len(data['data']) == 2

    def test_response_with_none_data(self):
        response = success_response(None)
        data = json.loads(response.get_data(as_text=True))
        assert data['data'] is None
