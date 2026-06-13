/**
 * 消息工具函数 — createMessage 工厂。
 */

export function createMessage(role, content, extra = {}) {
  return {
    id: Math.random().toString(36).slice(2),
    role,           // 'user' | 'assistant' | 'tool_result'
    content,
    timestamp: Date.now(),
    thinking: null,
    toolCalls: null,
    status: 'done',
    ...extra,
  }
}
