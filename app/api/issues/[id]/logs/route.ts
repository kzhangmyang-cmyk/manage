import { NextResponse } from 'next/server'
import { getExecutionLogs } from '../../../../../lib/agent'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: {
    params: {
      id?: string
    }
  },
) {
  const issueId = typeof context.params.id === 'string' ? context.params.id.trim() : ''

  if (!issueId) {
    return NextResponse.json({ error: '缺少 issue id。' }, { status: 400 })
  }

  try {
    const logs = getExecutionLogs(issueId)

    return NextResponse.json({ issueId, logs })
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取执行日志失败。'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
