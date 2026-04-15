"""Tests for src.api.services module"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.api.services.fund_info_service import (
    get_fund_list,
    get_fund_detail,
    search_funds,
)
from src.api.services.fund_rating_service import (
    get_rating_list,
    get_fund_rating,
    get_rating_distribution,
)
from src.api.services.fund_nav_service import (
    get_fund_nav,
    _format_date as _format_nav_date,
)
from src.api.services.situation_service import (
    _format_date as _format_situation_date,
)


class TestPaginateQuery:
    """Tests for paginate_query function"""

    def test_paginate_first_page(self, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 50}
        mock_cursor.fetchall_result = [{'id': i} for i in range(20)]

        from src.api.services import paginate_query
        rows, pagination = paginate_query(
            "SELECT * FROM test",
            "SELECT COUNT(*) FROM test",
            params=(),
            page=1,
            page_size=20,
        )

        assert pagination['page'] == 1
        assert pagination['page_size'] == 20
        assert pagination['total'] == 50
        assert len(rows) == 20

    def test_paginate_second_page(self, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 50}
        mock_cursor.fetchall_result = [{'id': i} for i in range(20, 40)]

        from src.api.services import paginate_query
        rows, pagination = paginate_query(
            "SELECT * FROM test",
            "SELECT COUNT(*) FROM test",
            params=(),
            page=2,
            page_size=20,
        )

        assert pagination['page'] == 2
        # Verify offset calculation: (2-1) * 20 = 20
        assert mock_cursor.executed_params[-2] == 20
        assert mock_cursor.executed_params[-1] == 20

    def test_paginate_clamps_page_size(self, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 50}
        mock_cursor.fetchall_result = []

        from src.api.services import paginate_query
        _, pagination = paginate_query(
            "SELECT * FROM test",
            "SELECT COUNT(*) FROM test",
            params=(),
            page=1,
            page_size=200,
        )

        assert pagination['page_size'] == 100  # max capped at 100

    def test_paginate_min_page_is_one(self, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 10}
        mock_cursor.fetchall_result = []

        from src.api.services import paginate_query
        _, pagination = paginate_query(
            "SELECT * FROM test",
            "SELECT COUNT(*) FROM test",
            params=(),
            page=0,
            page_size=10,
        )

        assert pagination['page'] == 1

    def test_paginate_with_params(self, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 5}
        mock_cursor.fetchall_result = []

        from src.api.services import paginate_query
        paginate_query(
            "SELECT * FROM test WHERE type = %s",
            "SELECT COUNT(*) FROM test WHERE type = %s",
            params=('fund',),
            page=1,
            page_size=10,
        )

        # Verify params include the pagination offset
        assert mock_cursor.executed_params[-2] == 0  # offset
        assert mock_cursor.executed_params[-1] == 10  # page_size


class TestFundInfoService:
    """Tests for fund_info_service"""

    def test_get_fund_list_no_filter(self, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 3}
        mock_cursor.fetchall_result = [
            {'fund_code': '000001', 'fund_name': 'Fund A'},
            {'fund_code': '000002', 'fund_name': 'Fund B'},
        ]

        rows, pagination = get_fund_list(page=1, page_size=20)

        assert pagination['total'] == 3
        assert len(rows) == 2

    def test_get_fund_list_with_type_filter(self, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 1}
        mock_cursor.fetchall_result = [
            {'fund_code': '000001', 'fund_type': '股票型'},
        ]

        rows, _ = get_fund_list(fund_type='股票型')

        # Verify the filter parameter was passed
        assert mock_cursor.executed_params[0] == '股票型'

    def test_get_fund_detail(self, mock_cursor):
        mock_cursor.fetchone_result = {
            'fund_code': '000051',
            'fund_name': 'Test Fund',
            'fund_type': '混合型',
        }

        result = get_fund_detail('000051')

        assert result['fund_code'] == '000051'
        assert result['fund_name'] == 'Test Fund'

    def test_get_fund_detail_not_found(self, mock_cursor):
        mock_cursor.fetchone_result = None

        result = get_fund_detail('999999')

        assert result is None

    def test_search_funds(self, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 2}
        mock_cursor.fetchall_result = [
            {'fund_code': '000051', 'fund_name': '华夏成长'},
        ]

        rows, pagination = search_funds('成长', page=1, page_size=20)

        assert pagination['total'] == 2
        # Verify LIKE params are set
        assert mock_cursor.executed_params[0] == '%成长%'
        assert mock_cursor.executed_params[1] == '%成长%'


class TestFundRatingService:
    """Tests for fund_rating_service"""

    def test_get_rating_list(self, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 10}
        mock_cursor.fetchall_result = [
            {'fund_code': '000001', 'rating': 'A', 'rating_date': '2024-01-01'},
        ]

        rows, pagination = get_rating_list(page=1, page_size=20)

        assert pagination['total'] == 10
        assert len(rows) == 1

    def test_get_rating_list_with_filter(self, mock_cursor):
        mock_cursor.fetchone_result = {'COUNT(*)': 5}
        mock_cursor.fetchall_result = [
            {'fund_code': '000001', 'rating': 'A'},
        ]

        get_rating_list(rating='A')

        assert mock_cursor.executed_params[0] == 'A'

    def test_get_fund_rating(self, mock_cursor):
        mock_cursor.fetchall_result = [
            {
                'fund_code': '000051',
                'rating': 'A',
                'rating_date': '2024-01-01',
                'rating_desc': '优秀',
            },
        ]

        result = get_fund_rating('000051')

        assert len(result) == 1
        assert result[0]['rating'] == 'A'

    def test_get_fund_rating_empty(self, mock_cursor):
        mock_cursor.fetchall_result = []

        result = get_fund_rating('999999')

        assert result == []

    def test_get_rating_distribution(self, mock_cursor):
        mock_cursor.fetchall_result = [
            {'rating': 'A', 'count': 10},
            {'rating': 'B', 'count': 20},
            {'rating': 'C', 'count': 30},
        ]

        result = get_rating_distribution()

        assert result == {'A': 10, 'B': 20, 'C': 30}


class TestFundNavService:
    """Tests for fund_nav_service"""

    def test_get_fund_nav(self, mock_cursor):
        mock_cursor.fetchone_result = {'fund_name': 'Test Fund'}
        mock_cursor.fetchall_result = [
            {'nav_date': '20240101', 'accumulated_nav': 1.5, 'daily_growth': 0.01},
            {'nav_date': '20240102', 'accumulated_nav': 1.52, 'daily_growth': 0.013},
        ]

        result = get_fund_nav('000051', period='3m')

        assert result['fundCode'] == '000051'
        assert result['fundName'] == 'Test Fund'
        assert result['period'] == '3m'
        assert len(result['navData']) == 2
        assert result['navData'][0]['date'] == '2024-01-01'
        assert result['navData'][0]['accumulatedNav'] == 1.5

    def test_get_fund_nav_not_found(self, mock_cursor):
        mock_cursor.fetchone_result = None

        result = get_fund_nav('999999')

        assert result is None

    def test_get_fund_nav_no_data(self, mock_cursor):
        mock_cursor.fetchone_result = {'fund_name': 'Test Fund'}
        mock_cursor.fetchall_result = []

        result = get_fund_nav('000051')

        assert result is None

    def test_get_fund_nav_null_values(self, mock_cursor):
        mock_cursor.fetchone_result = {'fund_name': 'Test Fund'}
        mock_cursor.fetchall_result = [
            {'nav_date': '20240101', 'accumulated_nav': None, 'daily_growth': None},
        ]

        result = get_fund_nav('000051')

        assert result['navData'][0]['accumulatedNav'] is None
        assert result['navData'][0]['dailyGrowth'] is None

    def test_format_date_yyyymmdd(self):
        assert _format_nav_date('20240115') == '2024-01-15'

    def test_format_date_already_formatted(self):
        assert _format_nav_date('2024-01-15') == '2024-01-15'

    def test_format_date_none(self):
        assert _format_nav_date(None) is None

    def test_format_date_short_string(self):
        assert _format_nav_date('2024') == '2024'


class TestSituationServiceDate:
    """Tests for situation_service date formatting"""

    def test_format_date_yyyymmdd(self):
        assert _format_situation_date('20240115') == '2024-01-15'

    def test_format_date_none(self):
        assert _format_situation_date(None) is None

    def test_format_date_short(self):
        assert _format_situation_date('2024') == '2024'
