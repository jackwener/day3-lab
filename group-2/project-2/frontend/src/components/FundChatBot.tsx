import { useState, useRef, useEffect } from 'react'
import { Button, Input, Typography, Space, Tag, Avatar, Badge, Grid } from 'antd'
import {
  MessageOutlined,
  CloseOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  BulbOutlined,
} from '@ant-design/icons'

import { chatApi } from '../services/api'

const { Text, Paragraph } = Typography

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  time: string
}

const quickQuestions = [
  '005827 最近建议买入还是卖出？',
  '招商中证白酒现在可以加仓吗？',
  '新能源基金还能继续持有吗？',
  '帮我推荐几只稳健型基金',
]

function getNow() {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function FundChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: '👋 你好！我是基金智投助手。\n\n你可以问我关于基金买卖建议、持仓分析等问题。试试下方的快捷问题吧！',
      time: getNow(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [typing, setTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.sm

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (text?: string) => {
    const question = text || inputValue.trim()
    if (!question || typing) return

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: question,
      time: getNow(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setTyping(true)

    // 调用后端 AI 接口
    const history = messages
      .filter((m) => m.id !== 0)
      .map((m) => ({ role: m.role, content: m.content }))

    chatApi.ask(question, history).then((data) => {
      const reply: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.answer,
        time: getNow(),
      }
      setMessages((prev) => [...prev, reply])
      setTyping(false)
    }).catch(() => {
      const reply: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '抱歉，AI 服务暂时不可用，请稍后重试。',
        time: getNow(),
      }
      setMessages((prev) => [...prev, reply])
      setTyping(false)
    })
  }

  return (
    <>
      {/* 悬浮按钮 */}
      {!open && (
        <div
          onClick={() => setOpen(true)}
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            zIndex: 1000,
            cursor: 'pointer',
          }}
        >
          <Badge dot>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<MessageOutlined />}
              style={{
                width: 56,
                height: 56,
                fontSize: 24,
                boxShadow: '0 4px 16px rgba(22, 119, 255, 0.4)',
              }}
            />
          </Badge>
          <div
            style={{
              position: 'absolute',
              bottom: -8,
              right: -4,
              background: '#1677ff',
              color: '#fff',
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
            }}
          >
            问一问
          </div>
        </div>
      )}

      {/* 聊天窗口 */}
      {open && (
        <div
          style={{
            position: 'fixed',
            right: isMobile ? 0 : 24,
            bottom: isMobile ? 0 : 24,
            width: isMobile ? '100vw' : 400,
            height: isMobile ? '100vh' : 560,
            zIndex: 1000,
            borderRadius: isMobile ? 0 : 16,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1677ff, #4096ff)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Space>
              <Avatar icon={<RobotOutlined />} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <div>
                <Text strong style={{ color: '#fff', fontSize: 15 }}>基金智投助手</Text>
                <br />
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>
                  {typing ? '正在输入...' : '在线 · 随时为您服务'}
                </Text>
              </div>
            </Space>
            <CloseOutlined
              onClick={() => setOpen(false)}
              style={{ color: '#fff', fontSize: 16, cursor: 'pointer', padding: 4 }}
            />
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              background: '#f5f5f5',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12,
                  gap: 8,
                }}
              >
                {msg.role === 'assistant' && (
                  <Avatar size={28} icon={<RobotOutlined />} style={{ backgroundColor: '#1677ff', flexShrink: 0 }} />
                )}
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: msg.role === 'user' ? '#1677ff' : '#fff',
                    color: msg.role === 'user' ? '#fff' : '#333',
                    fontSize: 13,
                    lineHeight: 1.6,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                    {msg.time}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <Avatar size={28} icon={<UserOutlined />} style={{ backgroundColor: '#722ed1', flexShrink: 0 }} />
                )}
              </div>
            ))}
            {typing && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <Avatar size={28} icon={<RobotOutlined />} style={{ backgroundColor: '#1677ff', flexShrink: 0 }} />
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px 12px 12px 2px',
                    background: '#fff',
                    fontSize: 13,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <span className="typing-dots">思考中...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div style={{ padding: '8px 16px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <BulbOutlined /> 快捷提问
              </Text>
              <Space size={[6, 6]} wrap>
                {quickQuestions.map((q) => (
                  <Tag
                    key={q}
                    style={{ cursor: 'pointer', fontSize: 12 }}
                    color="processing"
                    onClick={() => handleSend(q)}
                  >
                    {q}
                  </Tag>
                ))}
              </Space>
            </div>
          )}

          {/* Input */}
          <div
            style={{
              padding: '12px 16px',
              background: '#fff',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              gap: 8,
            }}
          >
            <Input
              placeholder="输入你的问题..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={() => handleSend()}
              disabled={typing}
              style={{ borderRadius: 20 }}
            />
            <Button
              type="primary"
              shape="circle"
              icon={<SendOutlined />}
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || typing}
            />
          </div>
        </div>
      )}
    </>
  )
}
