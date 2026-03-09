import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { analyzeIssue } from '../../../lib/ai'
import { runAgent } from '../../../lib/agent'
import { insertExecutionLog, upsertIssue, updateIssueStatus } from '../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: unknown
    }

    const text = typeof body.text === 'string' ? body.text.trim() : ''

    if (!text) {
      return NextResponse.json({ error: '请先输入一条问题描述。' }, { status: 400 })
    }

    const result = await analyzeIssue(text)
    const issueId = randomUUID()

    upsertIssue(issueId, text, result)
    insertExecutionLog({
      id: randomUUID(),
      issueId,
      timestamp: new Date().toISOString(),
      phase: 'system',
      toolName: 'agent',
      action: '接收问题并完成AI解析',
      reason: '问题已完成结构化解析并写入数据库。',
      result: `推荐路径：${result.recommended_path}。`,
      status: 'completed',
      requiresConfirmation: false,
      revocable: false,
    })

    let agentExecutionResults = [] as Array<Record<string, unknown>>

    if (result.recommended_path === '自动完成') {
      updateIssueStatus(issueId, '等待Agent执行')
      const queuedAt = new Date().toISOString()

      agentExecutionResults = [
        {
          id: randomUUID(),
          issueId,
          type: 'message',
          name: 'agent_queued',
          status: 'queued',
          timestamp: queuedAt,
          output: 'Agent 已进入后台执行队列。',
        },
      ]

      setTimeout(() => {
        void runAgent(text, result, { issueId })
      }, 0)
    } else {
      const pendingStatus = result.recommended_path === '建议确认' ? '待确认' : '待人工处理'
      updateIssueStatus(issueId, pendingStatus)

      const pendingAt = new Date().toISOString()
      insertExecutionLog({
        id: randomUUID(),
        issueId,
        timestamp: pendingAt,
        phase: 'system',
        toolName: 'agent',
        action:
          result.recommended_path === '建议确认'
            ? '已生成处理建议，等待负责人确认'
            : '该问题超出自动处理范围',
        reason:
          result.recommended_path === '建议确认'
            ? '当前推荐路径为建议确认，系统不会自动执行，只会等待负责人确认。'
            : '当前推荐路径为升级人工，系统不会自动执行。',
        result:
          result.recommended_path === '建议确认'
            ? `问题当前状态已更新为${pendingStatus}。`
            : '已停止自动处理，准备进入人工介入流程。',
        status: 'completed',
        requiresConfirmation: result.recommended_path === '建议确认',
        revocable: false,
      })

      if (result.recommended_path === '升级人工') {
        insertExecutionLog({
          id: randomUUID(),
          issueId,
          timestamp: new Date().toISOString(),
          phase: 'system',
          toolName: 'agent',
          action: '已升级给管理层，等待人工介入',
          reason: '该问题需要由人工负责人继续处理。',
          result: `问题当前状态已更新为${pendingStatus}。`,
          status: 'completed',
          requiresConfirmation: false,
          revocable: false,
        })
      }

      agentExecutionResults = [
        {
          id: randomUUID(),
          issueId,
          type: 'message',
          name: 'agent_pending',
          status: 'queued',
          timestamp: pendingAt,
          output:
            result.recommended_path === '建议确认'
              ? '系统已生成处理建议，等待负责人确认。'
              : '问题已升级给管理层，等待人工介入。',
        },
      ]
    }

    return NextResponse.json({
      issueId,
      ...result,
      agentExecutionResults,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 解析失败，请稍后重试。'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
