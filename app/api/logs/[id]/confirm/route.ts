import { NextResponse } from 'next/server'
import { confirmExecutionLog } from '../../../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  context: {
    params: {
      id?: string
    }
  },
) {
  const logId = typeof context.params.id === 'string' ? context.params.id.trim() : ''

  if (!logId) {
    return NextResponse.json({ error: '缺少日志 id。' }, { status: 400 })
  }

  try {
    const result = confirmExecutionLog(logId)

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : '确认执行失败。'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
