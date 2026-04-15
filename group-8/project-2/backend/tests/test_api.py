"""
API 集成测试 + Contract 测试

测试覆盖:
- 会话管理集成测试 (6条)
- 问答集成测试 (5条)
- 问答记录集成测试 (3条)
- Contract 测试 (6条)
"""

import uuid


# ==================== 会话管理集成测试 ====================

def test_get_sessions_empty(client):
    """GET /sessions → 200, sessions=[]"""
    response = client.get("/api/v1/agent/sessions")
    assert response.status_code == 200
    data = response.get_json()
    assert "traceId" in data
    assert data["sessions"] == []


def test_create_session_default_title(client):
    """POST /sessions → 201, title='新会话'"""
    response = client.post("/api/v1/agent/sessions", data='{}', content_type='application/json')
    assert response.status_code == 201
    data = response.get_json()
    assert "traceId" in data
    assert data["title"] == "新会话"
    assert "session_id" in data
    assert "created_at" in data
    assert data["query_count"] == 0


def test_create_session_custom_title(client):
    """POST /sessions with title → 201, title matches input"""
    response = client.post("/api/v1/agent/sessions", json={"title": "测试"}, content_type='application/json')
    assert response.status_code == 201
    data = response.get_json()
    assert data["title"] == "测试"


def test_create_session_title_too_long(client):
    """title 超 23 字符 → 400 INVALID_QUERY"""
    long_title = "这" * 24
    response = client.post("/api/v1/agent/sessions", json={"title": long_title}, content_type='application/json')
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"]["code"] == "INVALID_QUERY"


def test_delete_session_success(client):
    """DELETE → 200, 再 GET 列表不含该 session"""
    # 先创建会话
    create_resp = client.post("/api/v1/agent/sessions", json={"title": "待删除"}, content_type='application/json')
    session_id = create_resp.get_json()["session_id"]

    # 删除会话
    delete_resp = client.delete(f"/api/v1/agent/sessions/{session_id}")
    assert delete_resp.status_code == 200
    data = delete_resp.get_json()
    assert data["message"] == "会话已删除"
    assert data["deleted_session_id"] == session_id

    # 验证列表中已无该会话
    list_resp = client.get("/api/v1/agent/sessions")
    sessions = list_resp.get_json()["sessions"]
    assert not any(s["session_id"] == session_id for s in sessions)


def test_delete_session_not_found(client):
    """DELETE 不存在的 UUID → 404 SESSION_NOT_FOUND"""
    fake_id = str(uuid.uuid4())
    response = client.delete(f"/api/v1/agent/sessions/{fake_id}")
    assert response.status_code == 404
    data = response.get_json()
    assert data["error"]["code"] == "SESSION_NOT_FOUND"


# ==================== 问答集成测试 ====================

def test_ask_success(client):
    """POST /ask → 200, 含 answer、llm_used、traceId"""
    # 先创建会话
    create_resp = client.post("/api/v1/agent/sessions", data='{}', content_type='application/json')
    session_id = create_resp.get_json()["session_id"]

    # 发送问答请求
    response = client.post("/api/v1/agent/ask", json={
        "query": "你好",
        "session_id": session_id
    })
    assert response.status_code == 200
    data = response.get_json()
    assert "traceId" in data
    assert "answer" in data
    assert isinstance(data["llm_used"], bool)
    assert "model" in data
    assert isinstance(data["response_time_ms"], int)
    assert "answer_source" in data


def test_ask_empty_query(client):
    """空 query → 400 EMPTY_QUERY"""
    response = client.post("/api/v1/agent/ask", json={
        "query": "",
        "session_id": str(uuid.uuid4())
    })
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"]["code"] == "EMPTY_QUERY"


def test_ask_long_query(client):
    """>500 字符 → 400 INVALID_QUERY"""
    long_query = "a" * 501
    response = client.post("/api/v1/agent/ask", json={
        "query": long_query,
        "session_id": str(uuid.uuid4())
    })
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"]["code"] == "INVALID_QUERY"


def test_ask_demo_fallback(client, monkeypatch):
    """无 API Key → answer_source=demo"""
    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
    monkeypatch.delenv("IRA_COPAW_AUTH_URL", raising=False)
    monkeypatch.delenv("IRA_COPAW_QA_URL", raising=False)
    # 先创建会话
    create_resp = client.post("/api/v1/agent/sessions", data='{}', content_type='application/json')
    session_id = create_resp.get_json()["session_id"]

    response = client.post("/api/v1/agent/ask", json={
        "query": "测试问题",
        "session_id": session_id
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["answer_source"] == "demo"
    assert data["llm_used"] is False


def test_ask_missing_session_id(client):
    """缺少 session_id → 400"""
    response = client.post("/api/v1/agent/ask", json={
        "query": "测试"
    })
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


# ==================== 问答记录集成测试 ====================

def test_get_records_with_data(client):
    """有记录时 → 200, records 含 query/answer/timestamp"""
    # 创建会话并发送问答
    create_resp = client.post("/api/v1/agent/sessions", data='{}', content_type='application/json')
    session_id = create_resp.get_json()["session_id"]

    client.post("/api/v1/agent/ask", json={
        "query": "测试查询",
        "session_id": session_id
    })

    # 获取记录
    response = client.get(f"/api/v1/agent/sessions/{session_id}/records")
    assert response.status_code == 200
    data = response.get_json()
    assert "traceId" in data
    assert len(data["records"]) == 1
    record = data["records"][0]
    assert "query" in record
    assert "answer" in record
    assert "timestamp" in record


def test_get_records_empty(client):
    """有会话无记录 → 200, records=[]"""
    create_resp = client.post("/api/v1/agent/sessions", data='{}', content_type='application/json')
    session_id = create_resp.get_json()["session_id"]

    response = client.get(f"/api/v1/agent/sessions/{session_id}/records")
    assert response.status_code == 200
    data = response.get_json()
    assert data["records"] == []


def test_get_records_session_not_found(client):
    """会话不存在 → 404 SESSION_NOT_FOUND"""
    fake_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/agent/sessions/{fake_id}/records")
    assert response.status_code == 404
    data = response.get_json()
    assert data["error"]["code"] == "SESSION_NOT_FOUND"


# ==================== Contract 测试 ====================

def test_contract_capabilities(client):
    """traceId(str), copaw_configured(bool), bailian_configured(bool)"""
    response = client.get("/api/v1/agent/capabilities")
    assert response.status_code == 200
    data = response.get_json()

    assert "traceId" in data
    assert isinstance(data["traceId"], str)
    assert "copaw_configured" in data
    assert isinstance(data["copaw_configured"], bool)
    assert "bailian_configured" in data
    assert isinstance(data["bailian_configured"], bool)


def test_contract_ask(client):
    """traceId(str), answer(str), llm_used(bool), model, response_time_ms(int), answer_source(str)"""
    create_resp = client.post("/api/v1/agent/sessions", data='{}', content_type='application/json')
    session_id = create_resp.get_json()["session_id"]

    response = client.post("/api/v1/agent/ask", json={
        "query": "合同测试",
        "session_id": session_id
    })
    assert response.status_code == 200
    data = response.get_json()

    assert "traceId" in data and isinstance(data["traceId"], str)
    assert "answer" in data and isinstance(data["answer"], str)
    assert "llm_used" in data and isinstance(data["llm_used"], bool)
    assert "model" in data
    assert "response_time_ms" in data and isinstance(data["response_time_ms"], int)
    assert "answer_source" in data and isinstance(data["answer_source"], str)


def test_contract_get_sessions(client):
    """traceId(str), sessions(list)"""
    response = client.get("/api/v1/agent/sessions")
    assert response.status_code == 200
    data = response.get_json()

    assert "traceId" in data and isinstance(data["traceId"], str)
    assert "sessions" in data and isinstance(data["sessions"], list)


def test_contract_create_session(client):
    """traceId(str), session_id(str), title(str), created_at(str), query_count(int)"""
    response = client.post("/api/v1/agent/sessions", json={"title": "合同测试"}, content_type='application/json')
    assert response.status_code == 201
    data = response.get_json()

    assert "traceId" in data and isinstance(data["traceId"], str)
    assert "session_id" in data and isinstance(data["session_id"], str)
    assert "title" in data and isinstance(data["title"], str)
    assert "created_at" in data and isinstance(data["created_at"], str)
    assert "query_count" in data and isinstance(data["query_count"], int)


def test_contract_delete_session(client):
    """traceId(str), message(str), deleted_session_id(str)"""
    create_resp = client.post("/api/v1/agent/sessions", data='{}', content_type='application/json')
    session_id = create_resp.get_json()["session_id"]

    response = client.delete(f"/api/v1/agent/sessions/{session_id}")
    assert response.status_code == 200
    data = response.get_json()

    assert "traceId" in data and isinstance(data["traceId"], str)
    assert "message" in data and isinstance(data["message"], str)
    assert "deleted_session_id" in data and isinstance(data["deleted_session_id"], str)


def test_contract_get_records(client):
    """traceId(str), records(list)"""
    create_resp = client.post("/api/v1/agent/sessions", data='{}', content_type='application/json')
    session_id = create_resp.get_json()["session_id"]

    response = client.get(f"/api/v1/agent/sessions/{session_id}/records")
    assert response.status_code == 200
    data = response.get_json()

    assert "traceId" in data and isinstance(data["traceId"], str)
    assert "records" in data and isinstance(data["records"], list)


# ==================== 研报上传与查询集成测试 ====================

import io


def test_upload_report_success(client):
    """TC-M01-080: POST /reports/upload PDF -> 201, with report_id"""
    # Create an HTML file with research report content (easier to test)
    html_content = b"""<html><body>
    <h1>Test Report</h1>
    <p>Rating: Buy</p>
    <p>Target Price: 100.00</p>
    <p>The company maintains stable growth, brand value continues to increase.</p>
    </body></html>"""
    
    data = {
        "file": (io.BytesIO(html_content), "test_report.html"),
    }
    response = client.post(
        "/api/v1/agent/reports/upload",
        data=data,
        content_type="multipart/form-data"
    )
    assert response.status_code == 201
    resp_data = response.get_json()
    assert "traceId" in resp_data
    assert "report_id" in resp_data
    assert resp_data["file_name"] == "test_report.html"
    assert resp_data["status"] == "parsed"


def test_upload_invalid_type(client):
    """TC-M01-081: 上传 .txt → 400 INVALID_FILE_TYPE"""
    data = {
        "file": (io.BytesIO(b"plain text"), "test.txt"),
    }
    response = client.post(
        "/api/v1/agent/reports/upload",
        data=data,
        content_type="multipart/form-data"
    )
    assert response.status_code == 400
    resp_data = response.get_json()
    assert resp_data["error"]["code"] == "INVALID_FILE_TYPE"


def test_upload_too_large(client):
    """TC-M01-082: 超 50MB → 400 FILE_TOO_LARGE"""
    # 创建一个超过 50MB 的假文件内容
    large_content = b"x" * (50 * 1024 * 1024 + 1)
    data = {
        "file": (io.BytesIO(large_content), "large.pdf"),
    }
    response = client.post(
        "/api/v1/agent/reports/upload",
        data=data,
        content_type="multipart/form-data"
    )
    assert response.status_code == 400
    resp_data = response.get_json()
    assert resp_data["error"]["code"] == "FILE_TOO_LARGE"


def _upload_test_report(client):
    """Helper: Upload a test report, return report_id"""
    html_content = b"""<html><body>
    <p>Rating: Buy</p>
    <p>Target Price: 150.00</p>
    <p>The company maintains stable growth, brand value continues to increase.</p>
    </body></html>"""
    data = {"file": (io.BytesIO(html_content), "report.html")}
    resp = client.post("/api/v1/agent/reports/upload", data=data, content_type="multipart/form-data")
    return resp.get_json()["report_id"]


def test_get_reports_list(client):
    """TC-M01-083: GET /reports → 200，reports[]"""
    _upload_test_report(client)
    response = client.get("/api/v1/agent/reports")
    assert response.status_code == 200
    resp_data = response.get_json()
    assert "traceId" in resp_data
    assert "reports" in resp_data
    assert isinstance(resp_data["reports"], list)
    assert len(resp_data["reports"]) >= 1


def test_get_report_detail(client):
    """TC-M01-084: GET /reports/{id} → 200，含 extracted_data"""
    report_id = _upload_test_report(client)
    response = client.get(f"/api/v1/agent/reports/{report_id}")
    assert response.status_code == 200
    resp_data = response.get_json()
    assert "traceId" in resp_data
    assert "report" in resp_data
    assert resp_data["report"]["report_id"] == report_id
    assert "extracted_data" in resp_data["report"]


def test_get_report_not_found(client):
    """TC-M01-085: GET /reports/xxx → 404"""
    response = client.get("/api/v1/agent/reports/nonexistent_id")
    assert response.status_code == 404
    resp_data = response.get_json()
    assert resp_data["error"]["code"] == "REPORT_NOT_FOUND"


# ==================== 研报对比集成测试 ====================

def test_compare_reports_success(client):
    """TC-M01-090: 2 份研报 → 200，含 comparison_table"""
    rid1 = _upload_test_report(client)
    rid2 = _upload_test_report(client)
    response = client.post("/api/v1/agent/reports/compare", json={"report_ids": [rid1, rid2]})
    assert response.status_code == 200
    resp_data = response.get_json()
    assert "traceId" in resp_data
    assert "comparison_table" in resp_data
    table = resp_data["comparison_table"]
    assert "dimensions" in table
    assert "reports" in table
    assert len(table["reports"]) == 2


def test_compare_insufficient_reports(client):
    """TC-M01-091: 仅 1 个 ID → 400"""
    rid = _upload_test_report(client)
    response = client.post("/api/v1/agent/reports/compare", json={"report_ids": [rid]})
    assert response.status_code == 400


def test_compare_report_not_found(client):
    """TC-M01-092: 含不存在的 ID → 404"""
    rid = _upload_test_report(client)
    response = client.post("/api/v1/agent/reports/compare", json={"report_ids": [rid, "nonexistent"]})
    assert response.status_code == 404
    resp_data = response.get_json()
    assert resp_data["error"]["code"] == "REPORT_NOT_FOUND"
