"""Tests for src.utils.utils module"""

import sys
import os
import pandas as pd
from datetime import datetime
from unittest.mock import patch, MagicMock

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.utils.utils import (
    format_date,
    format_fund_code,
    retry_decorator,
    parse_scale,
    ensure_dir_exists,
    print_progress,
    load_csv,
    save_to_csv,
)


class TestFormatDate:
    """Tests for format_date function"""

    def test_format_yyyy_mm_dd_to_yyyymmdd(self):
        assert format_date('2024-01-15') == '20240115'

    def test_format_yyyy_mm_dd_custom_output(self):
        assert format_date('2024-01-15', '%Y-%m') == '2024-01'

    def test_format_yyyy_mm_dd_slash(self):
        assert format_date('2024/01/15') == '20240115'

    def test_format_yyyymmdd(self):
        assert format_date('20240115') == '20240115'

    def test_format_pandas_timestamp(self):
        ts = pd.Timestamp('2024-01-15')
        assert format_date(ts) == '20240115'

    def test_format_invalid_string_returns_original(self):
        assert format_date('not-a-date') == 'not-a-date'

    def test_format_none_returns_none(self):
        assert format_date(None) is None


class TestFormatFundCode:
    """Tests for format_fund_code function"""

    def test_format_short_code(self):
        assert format_fund_code('123') == '000123'

    def test_format_exact_six_digits(self):
        assert format_fund_code('123456') == '123456'

    def test_format_code_with_prefix(self):
        assert format_fund_code('SZ123456') == '123456'

    def test_format_integer(self):
        assert format_fund_code(123) == '000123'

    def test_format_float(self):
        assert format_fund_code(123.0) == '000123'

    def test_format_with_letters_mixed(self):
        assert format_fund_code('abc123def') == '123'
        result = format_fund_code('abc123def')
        assert result == '000123'

    def test_format_empty_string(self):
        assert format_fund_code('') == '000000'


class TestParseScale:
    """Tests for parse_scale function"""

    def test_parse_with_yi_unit(self):
        assert parse_scale('10亿') == 10.0

    def test_parse_with_yi_unit_decimal(self):
        assert parse_scale('3.5亿') == 3.5

    def test_parse_with_wan_unit(self):
        assert parse_scale('5000万') == 0.5

    def test_parse_no_unit(self):
        assert parse_scale('100') == 100.0

    def test_parse_with_commas(self):
        assert parse_scale('1,000') == 1000.0

    def test_parse_with_spaces(self):
        assert parse_scale('  10亿  ') == 10.0

    def test_parse_integer(self):
        assert parse_scale(50) == 50.0

    def test_parse_float(self):
        assert parse_scale(3.14) == 3.14

    def test_parse_invalid_returns_zero(self):
        assert parse_scale('abc') == 0

    def test_parse_none_returns_zero(self):
        assert parse_scale(None) == 0


class TestEnsureDirExists:
    """Tests for ensure_dir_exists function"""

    def test_create_new_directory(self, tmp_path):
        new_dir = tmp_path / 'new_dir' / 'subdir'
        ensure_dir_exists(str(new_dir))
        assert new_dir.exists()

    def test_existing_directory_no_error(self, tmp_path):
        existing_dir = tmp_path / 'existing'
        existing_dir.mkdir()
        ensure_dir_exists(str(existing_dir))
        assert existing_dir.exists()


class TestPrintProgress:
    """Tests for print_progress function"""

    def test_print_at_100_boundary(self, capsys):
        print_progress(99, 200)
        captured = capsys.readouterr()
        assert '100' in captured.out

    def test_print_at_end(self, capsys):
        print_progress(199, 200)
        captured = capsys.readouterr()
        assert '200' in captured.out

    def test_no_print_mid_batch(self, capsys):
        print_progress(50, 200)
        captured = capsys.readouterr()
        assert captured.out == ''


class TestRetryDecorator:
    """Tests for retry_decorator function"""

    def test_retry_succeeds_on_first_try(self, capsys):
        call_count = 0

        @retry_decorator(max_retries=3, delay=0)
        def always_succeeds():
            nonlocal call_count
            call_count += 1
            return 'ok'

        result = always_succeeds()
        assert result == 'ok'
        assert call_count == 1

    def test_retry_succeeds_after_failures(self, capsys):
        call_count = 0

        @retry_decorator(max_retries=3, delay=0)
        def fails_twice():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError(f'fail #{call_count}')
            return 'ok'

        result = fails_twice()
        assert result == 'ok'
        assert call_count == 3

    def test_retry_returns_none_after_max_retries(self, capsys):
        @retry_decorator(max_retries=2, delay=0)
        def always_fails():
            raise ValueError('always fails')

        result = always_fails()
        assert result is None


class TestSaveToCsv:
    """Tests for save_to_csv function"""

    def test_save_none_returns_false(self):
        assert save_to_csv(None, '/tmp/test.csv') is False

    def test_save_success(self, tmp_path):
        csv_path = tmp_path / 'test.csv'
        df = pd.DataFrame({'a': [1, 2], 'b': ['x', 'y']})
        result = save_to_csv(df, str(csv_path))
        assert result is True
        assert csv_path.exists()

    def test_save_invalid_path(self, capsys):
        df = pd.DataFrame({'a': [1]})
        result = save_to_csv(df, '/nonexistent/deep/path/test.csv')
        # Should still succeed as makedirs creates dirs
        assert result is True


class TestLoadCsv:
    """Tests for load_csv function"""

    def test_load_success(self, tmp_path):
        csv_path = tmp_path / 'test.csv'
        csv_path.write_text('a,b\n1,x\n2,y')
        df = load_csv(str(csv_path))
        assert df is not None
        assert len(df) == 2

    def test_load_nonexistent_file(self):
        result = load_csv('/nonexistent/file.csv')
        assert result is None
