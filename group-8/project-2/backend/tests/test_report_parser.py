"""
研报解析模块单元测试

测试覆盖 PDF/HTML 解析和关键信息提取
"""

import os
import pytest
from app.report_parser import parse_report, _extract_key_info


def test_parse_pdf_success(tmp_path):
    """TC-M01-075: PDF 文件解析成功，含 raw_text"""
    # 创建一个简单的测试 PDF（使用 pdfplumber 能读取的格式）
    # 由于创建真实 PDF 需要额外库，这里用 mock 方式测试
    # 创建一个包含文本的简易 PDF-like 测试
    import pdfplumber
    from io import BytesIO
    
    # 方案：创建一个真实的最小 PDF
    # 使用 reportlab 或手工构造。这里用最简方式 - 直接测试解析流程
    # 如果没有 reportlab，改用 mock
    try:
        from unittest.mock import patch, MagicMock
        
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "投资评级：买入\n目标价：150.00元\n公司业绩持续增长，市场份额不断扩大。"
        
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdf.__enter__ = MagicMock(return_value=mock_pdf)
        mock_pdf.__exit__ = MagicMock(return_value=False)
        
        # 创建一个假文件以通过 exists 检查
        fake_pdf = tmp_path / "test.pdf"
        fake_pdf.write_bytes(b"fake pdf content")
        
        with patch("pdfplumber.open", return_value=mock_pdf):
            result = parse_report(str(fake_pdf), "pdf")
        
        assert result["status"] == "parsed"
        assert result["extracted_data"] is not None
        assert result["extracted_data"]["raw_text"] is not None
        assert len(result["extracted_data"]["raw_text"]) > 0
    except ImportError:
        pytest.skip("pdfplumber not available")


def test_parse_html_success(tmp_path):
    """TC-M01-076: HTML 文件解析成功"""
    html_content = """
    <html>
    <head><title>研报</title></head>
    <body>
        <h1>贵州茅台研究报告</h1>
        <p>投资评级：买入</p>
        <p>目标价：2100.00元</p>
        <p>公司业绩保持稳定增长，品牌价值持续提升，市场竞争力不断增强。</p>
        <p>核心观点：高端白酒市场持续扩容，公司作为行业龙头将持续受益。</p>
    </body>
    </html>
    """
    html_file = tmp_path / "test_report.html"
    html_file.write_text(html_content, encoding="utf-8")
    
    result = parse_report(str(html_file), "html")
    assert result["status"] == "parsed"
    assert result["extracted_data"] is not None
    assert result["extracted_data"]["rating"] == "买入"
    assert result["extracted_data"]["target_price"] == "2100.00"
    assert len(result["extracted_data"]["raw_text"]) > 0


def test_parse_invalid_file(tmp_path):
    """TC-M01-077: 无效文件 → status='failed'"""
    # 测试不存在的文件
    result = parse_report(str(tmp_path / "nonexistent.pdf"), "pdf")
    assert result["status"] == "failed"
    assert result["error_message"] is not None
    
    # 测试不支持的文件类型
    txt_file = tmp_path / "test.txt"
    txt_file.write_text("some text")
    result = parse_report(str(txt_file), "txt")
    assert result["status"] == "failed"
    assert "不支持" in result["error_message"]


def test_extract_key_info():
    """TC-M01-078: 提取评级/目标价/核心观点字段存在"""
    text = """
    贵州茅台投资研究报告
    投资评级：买入
    目标价：2100.00元
    核心观点如下：
    公司作为高端白酒龙头，品牌壁垒深厚，竞争优势明显，具有较高的投资价值。
    2025年公司营收有望突破1500亿元，净利润增速预计保持在15%以上。
    """
    result = _extract_key_info(text)
    assert "rating" in result
    assert "target_price" in result
    assert "key_points" in result
    assert "summary" in result
    assert result["rating"] == "买入"
    assert result["target_price"] == "2100.00"
    assert len(result["key_points"]) > 0
    assert len(result["summary"]) > 0
