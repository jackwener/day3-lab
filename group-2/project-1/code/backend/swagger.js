/**
 * Swagger/OpenAPI 3.0 规格定义 — 投研问答助手 API。
 * 对齐 09-API接口规格。
 */
module.exports = {
  openapi: "3.0.3",
  info: {
    title: "投研问答助手 API",
    version: "1.0.0",
    description:
      "投研问答助手后端 RESTful API，提供会话管理、智能问答（SSE 流式）、健康检查与原文溯源功能。\n\n" +
      "- 三级降级编排：CoPaw → 百炼 → Demo\n" +
      "- 数据存储：JSON 文件\n" +
      "- 对齐 Spec: 09-API接口规格",
    contact: { name: "投研问答助手团队" },
  },
  servers: [
    { url: "http://localhost:5000/api/v1/agent", description: "本地开发服务器" },
  ],
  tags: [
    { name: "健康与能力", description: "健康检查与能力探测" },
    { name: "会话管理", description: "会话的增删查" },
    { name: "问答", description: "智能问答（SSE 流式响应）" },
    { name: "原文溯源", description: "文档块查询" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["健康与能力"],
        summary: "健康检查",
        description: "返回后端服务健康状态。对齐 US-005、06 §2.2。",
        operationId: "getHealth",
        responses: {
          200: {
            description: "健康状态",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthResponse" },
                examples: {
                  degraded: {
                    summary: "Demo 模式",
                    value: { status: "DEGRADED", message: "所有 LLM Provider 未配置，当前为 Demo 模式" },
                  },
                  up: {
                    summary: "正常运行",
                    value: { status: "UP" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/capabilities": {
      get: {
        tags: ["健康与能力"],
        summary: "能力探测",
        description: "返回当前可用的 LLM Provider 配置信息。对齐 US-005、06 §2.1。",
        operationId: "getCapabilities",
        responses: {
          200: {
            description: "能力配置",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CapabilitiesResponse" },
                example: { copaw_configured: false, bailian_configured: false, model: null },
              },
            },
          },
        },
      },
    },
    "/sessions": {
      get: {
        tags: ["会话管理"],
        summary: "获取会话列表",
        description: "返回全部会话，按 created_at 倒序排列。对齐 US-001、AC-001-02。",
        operationId: "getSessions",
        responses: {
          200: {
            description: "会话列表",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    sessions: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Session" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["会话管理"],
        summary: "新建会话",
        description: "创建一个新的会话。对齐 US-001、AC-001-01。",
        operationId: "createSession",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string", description: "会话标题", example: "新会话", default: "新会话" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "新建的会话对象",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Session" },
              },
            },
          },
        },
      },
    },
    "/sessions/{sessionId}": {
      delete: {
        tags: ["会话管理"],
        summary: "删除会话",
        description: "删除指定会话及其关联的所有问答记录（级联删除）。对齐 US-001、AC-001-03。",
        operationId: "deleteSession",
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "会话 ID",
          },
        ],
        responses: {
          200: {
            description: "删除结果",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    deleted_session_id: { type: "string" },
                    deleted_records_count: { type: "integer" },
                  },
                },
                example: { deleted_session_id: "abc-123", deleted_records_count: 5 },
              },
            },
          },
          404: {
            description: "会话不存在",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/sessions/{sessionId}/records": {
      get: {
        tags: ["会话管理"],
        summary: "获取会话问答记录",
        description: "返回指定会话下的全部问答记录，按 timestamp 正序。对齐 US-004。",
        operationId: "getSessionRecords",
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "会话 ID",
          },
        ],
        responses: {
          200: {
            description: "问答记录列表",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    records: {
                      type: "array",
                      items: { $ref: "#/components/schemas/QARecord" },
                    },
                  },
                },
              },
            },
          },
          404: {
            description: "会话不存在",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/ask": {
      post: {
        tags: ["问答"],
        summary: "提交问答（SSE 流式响应）",
        description:
          "向指定会话提交问题，服务端以 Server-Sent Events 流式返回回答。\n\n" +
          "**SSE 事件格式：**\n" +
          "- `data: {\"event\":\"chunk\",\"text\":\"字\"}` — 逐字输出\n" +
          "- `data: {\"event\":\"done\",\"answer\":\"...\",\"answer_source\":\"demo\",...}` — 完成\n" +
          "- `data: [DONE]` — 流结束\n\n" +
          "对齐 US-002、AC-002-01~03。",
        operationId: "askQuestion",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AskRequest" },
              example: { query: "该股票最新评级是什么？", session_id: "uuid-here" },
            },
          },
        },
        responses: {
          200: {
            description: "SSE 流式响应",
            content: {
              "text/event-stream": {
                schema: { type: "string", description: "SSE 事件流" },
              },
            },
          },
          400: {
            description: "请求参数错误",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          404: {
            description: "会话不存在",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/doc/chunks": {
      get: {
        tags: ["原文溯源"],
        summary: "查询文档块",
        description: "根据 chunk_id 查询原文文档块，用于引用标记溯源。对齐 US-003、AC-003-01~03。",
        operationId: "getDocChunk",
        parameters: [
          {
            name: "chunk_id",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "文档块 ID",
            example: "demo_chunk_001",
          },
        ],
        responses: {
          200: {
            description: "文档块详情",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DocChunk" },
              },
            },
          },
          400: {
            description: "参数缺失",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          404: {
            description: "文档块不存在",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Session: {
        type: "object",
        properties: {
          session_id: { type: "string", format: "uuid", description: "会话唯一标识" },
          title: { type: "string", description: "会话标题", example: "新会话" },
          created_at: { type: "string", format: "date-time", description: "创建时间 (UTC ISO 8601)" },
          updated_at: { type: "string", format: "date-time", description: "最后更新时间" },
          query_count: { type: "integer", description: "问答次数", example: 0 },
        },
      },
      QARecord: {
        type: "object",
        properties: {
          record_id: { type: "string", description: "记录 ID", example: "rec_1700000000000" },
          session_id: { type: "string", format: "uuid", description: "所属会话 ID" },
          query: { type: "string", description: "用户问题" },
          answer: { type: "string", description: "AI 回答（Markdown）" },
          llm_used: { type: "boolean", description: "是否使用了 LLM" },
          model: { type: "string", nullable: true, description: "使用的模型名称" },
          response_time_ms: { type: "integer", description: "响应耗时（毫秒）" },
          answer_source: {
            type: "string",
            enum: ["copaw", "bailian", "demo"],
            description: "回答来源",
          },
          timestamp: { type: "string", format: "date-time", description: "记录时间" },
          references: {
            type: "array",
            items: { $ref: "#/components/schemas/DocChunk" },
            description: "引用文档块列表",
          },
        },
      },
      DocChunk: {
        type: "object",
        properties: {
          chunk_id: { type: "string", description: "文档块 ID", example: "demo_chunk_001" },
          doc_title: { type: "string", description: "文档标题", example: "2025年度投资策略报告" },
          page: { type: "integer", description: "所在页码", example: 12 },
          highlight_text: { type: "string", description: "高亮原文段落" },
          doc_url: { type: "string", description: "PDF 文件 URL" },
        },
      },
      AskRequest: {
        type: "object",
        required: ["query", "session_id"],
        properties: {
          query: { type: "string", description: "用户问题（1~500 字）", maxLength: 500, example: "该股票最新评级是什么？" },
          session_id: { type: "string", format: "uuid", description: "目标会话 ID" },
        },
      },
      HealthResponse: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["UP", "DEGRADED"], description: "服务状态" },
          message: { type: "string", description: "附加说明（可选）" },
        },
      },
      CapabilitiesResponse: {
        type: "object",
        properties: {
          copaw_configured: { type: "boolean", description: "CoPaw 桥接是否配置" },
          bailian_configured: { type: "boolean", description: "百炼是否配置" },
          model: { type: "string", nullable: true, description: "当前使用的模型名称" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", description: "错误码", example: "SESSION_NOT_FOUND" },
              message: { type: "string", description: "错误描述" },
            },
          },
        },
      },
    },
  },
};
