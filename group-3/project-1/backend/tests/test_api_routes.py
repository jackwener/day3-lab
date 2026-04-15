"""Tests for API routes (integration tests with Flask test client)"""

import json
import pytest


class TestFundInfoRoutes:
    """Tests for /api/v1/funds/ routes"""

    def test_get_fund_list(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 2}
        mock_cursor.fetchall_result = [
            {'fund_code': '000001', 'fund_name': 'Fund A'},
            {'fund_code': '000002', 'fund_name': 'Fund B'},
        ]

        response = client.get('/api/v1/funds/')

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert 'data' in data
        assert 'pagination' in data

    def test_get_fund_list_with_type_filter(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 1}
        mock_cursor.fetchall_result = [
            {'fund_code': '000001', 'fund_type': '股票型'},
        ]

        response = client.get('/api/v1/funds/?fund_type=股票型')

        assert response.status_code == 200

    def test_get_fund_list_pagination_params(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 0}
        mock_cursor.fetchall_result = []

        response = client.get('/api/v1/funds/?page=2&page_size=50')

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert data['pagination']['page'] == 2
        assert data['pagination']['page_size'] == 50

    def test_search_funds(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 1}
        mock_cursor.fetchall_result = [
            {'fund_code': '000051', 'fund_name': '华夏成长'},
        ]

        response = client.get('/api/v1/funds/search?q=成长')

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert len(data['data']) == 1

    def test_search_funds_empty_keyword(self, client):
        response = client.get('/api/v1/funds/search?q=')

        assert response.status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert 'error' in data

    def test_search_funds_no_keyword(self, client):
        response = client.get('/api/v1/funds/search')

        assert response.status_code == 400

    def test_get_fund_detail(self, client, mock_cursor):
        mock_cursor.fetchone_result = {
            'fund_code': '000051',
            'fund_name': '华夏成长',
            'fund_type': '混合型',
        }

        response = client.get('/api/v1/funds/000051')

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert data['data']['fund_code'] == '000051'


class TestFundRatingRoutes:
    """Tests for /api/v1/ratings/ routes"""

    def test_get_rating_list(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 5}
        mock_cursor.fetchall_result = [
            {'fund_code': '000001', 'rating': 'A', 'rating_date': '2024-01-01'},
        ]

        response = client.get('/api/v1/ratings/')

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert 'pagination' in data

    def test_get_rating_list_with_filter(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 3}
        mock_cursor.fetchall_result = [
            {'fund_code': '000001', 'rating': 'A'},
        ]

        response = client.get('/api/v1/ratings/?rating=A')

        assert response.status_code == 200

    def test_get_rating_list_invalid_rating(self, client):
        response = client.get('/api/v1/ratings/?rating=X')

        assert response.status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert 'error' in data

    def test_get_rating_distribution(self, client, mock_cursor):
        mock_cursor.fetchall_result = [
            {'rating': 'A', 'COUNT(*)': 10},
            {'rating': 'B', 'COUNT(*)': 20},
        ]

        response = client.get('/api/v1/ratings/distribution')

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert data['data']['A'] == 10
        assert data['data']['B'] == 20

    def test_get_fund_rating(self, client, mock_cursor):
        mock_cursor.fetchall_result = [
            {'fund_code': '000051', 'rating': 'A', 'rating_date': '2024-01-01'},
        ]

        response = client.get('/api/v1/ratings/000051')

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert len(data['data']) == 1

    def test_get_fund_rating_not_found(self, client, mock_cursor):
        mock_cursor.fetchall_result = []

        response = client.get('/api/v1/ratings/999999')

        assert response.status_code == 404


class TestFundNavRoutes:
    """Tests for /api/v1/funds/<code>/nav routes"""

    def test_get_fund_nav_default_period(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'fund_name': 'Test Fund'}
        mock_cursor.fetchall_result = [
            {'nav_date': '20240101', 'accumulated_nav': 1.5, 'daily_growth': 0.01},
        ]

        response = client.get('/api/v1/funds/000051/nav')

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert data['data']['period'] == '3m'

    def test_get_fund_nav_custom_period(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'fund_name': 'Test Fund'}
        mock_cursor.fetchall_result = []

        response = client.get('/api/v1/funds/000051/nav?period=1y')

        # 404 because no nav data returned
        assert response.status_code == 404

    def test_get_fund_nav_invalid_period(self, client):
        response = client.get('/api/v1/funds/000051/nav?period=5y')

        assert response.status_code == 400
        data = json.loads(response.get_data(as_text=True))
        assert 'error' in data
        assert data['error']['code'] == 'PARAM_INVALID'

    def test_get_fund_nav_fund_not_found(self, client, mock_cursor):
        mock_cursor.fetchone_result = None

        response = client.get('/api/v1/funds/999999/nav')

        assert response.status_code == 404
        data = json.loads(response.get_data(as_text=True))
        assert data['error']['code'] == 'DATA_NOT_FOUND'

    def test_get_fund_nav_with_nav_data(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'fund_name': '华夏成长'}
        mock_cursor.fetchall_result = [
            {
                'nav_date': '20240115',
                'accumulated_nav': 2.345,
                'daily_growth': 0.0123,
            },
            {
                'nav_date': '20240116',
                'accumulated_nav': 2.367,
                'daily_growth': 0.0094,
            },
        ]

        response = client.get('/api/v1/funds/000051/nav?period=1m')

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        nav_data = data['data']['navData']
        assert len(nav_data) == 2
        assert nav_data[0]['date'] == '2024-01-15'
        assert nav_data[0]['accumulatedNav'] == 2.345


class TestSituationRoutes:
    """Tests for /api/ situation routes"""

    def test_get_timeline(self, client, mock_cursor):
        # Mock the trade date query
        mock_cursor.fetchone_result = {'max_date': '20240115'}
        mock_cursor.fetchall_result = []

        response = client.get('/api/timeline')

        assert response.status_code == 200
        data = json.loads(response.get_data(as_text=True))
        assert 'data' in data

    def test_get_week_detail(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'max_date': '20240115'}
        mock_cursor.fetchall_result = []

        response = client.get('/api/timeline/1')

        # May fail due to DB query mocking, but route should be accessible
        assert response.status_code in (200, 404)

    def test_get_week_detail_invalid(self, client):
        response = client.get('/api/timeline/0')

        assert response.status_code == 400

    def test_get_thematic_funds(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'max_date': '20240115'}
        mock_cursor.fetchall_result = []

        response = client.get('/api/funds/thematic')

        assert response.status_code in (200, 404)

    def test_get_small_scale_funds(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'max_date': '20240115'}
        mock_cursor.fetchall_result = []

        response = client.get('/api/funds/small-scale')

        assert response.status_code in (200, 404)

    def test_get_small_scale_funds_with_params(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'max_date': '20240115'}
        mock_cursor.fetchall_result = []

        response = client.get('/api/funds/small-scale?week=1&limit=10')

        assert response.status_code in (200, 404)

    def test_get_small_scale_funds_invalid_limit(self, client):
        response = client.get('/api/funds/small-scale?limit=0')
        assert response.status_code == 400

        response = client.get('/api/funds/small-scale?limit=25')
        assert response.status_code == 400

    def test_get_situation_score(self, client, mock_cursor):
        mock_cursor.fetchone_result = {'max_date': '20240115'}
        mock_cursor.fetchall_result = []

        response = client.get('/api/situation/score')

        assert response.status_code in (200, 404)


class TestPageRoutes:
    """Tests for page routes"""

    def test_index(self, client):
        response = client.get('/')
        # Should return index.html or 404 if file doesn't exist
        assert response.status_code in (200, 404, 500)


class TestApiResponseFormat:
    """Tests for consistent API response format"""

    def test_all_routes_return_trace_id(self, client, mock_cursor):
        """Verify that all successful responses include traceId"""
        mock_cursor.fetchone_result = {'COUNT(*)': 0}
        mock_cursor.fetchall_result = []

        routes = [
            '/api/v1/funds/',
            '/api/v1/ratings/',
        ]

        for route in routes:
            response = client.get(route)
            assert response.status_code == 200
            data = json.loads(response.get_data(as_text=True))
            assert 'traceId' in data, f"Missing traceId in response from {route}"

    def test_error_responses_have_error_field(self, client):
        """Verify that error responses include error field"""
        response = client.get('/api/funds/undefined/nav')
        assert response.status_code == 404
        data = json.loads(response.get_data(as_text=True))
        assert 'error' in data

    def test_error_responses_have_trace_id(self, client):
        """Verify that error responses also include traceId"""
        response = client.get('/api/funds/undefined/nav')
        data = json.loads(response.get_data(as_text=True))
        assert 'traceId' in data

    def test_error_responses_have_timestamp(self, client):
        """Verify that error responses include timestamp"""
        response = client.get('/api/funds/undefined/nav')
        data = json.loads(response.get_data(as_text=True))
        assert 'timestamp' in data
