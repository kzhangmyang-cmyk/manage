import { NextResponse } from 'next/server'
import { getDashboardSnapshot } from '../../../lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = getDashboardSnapshot()
    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取管理者看板数据失败。'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
