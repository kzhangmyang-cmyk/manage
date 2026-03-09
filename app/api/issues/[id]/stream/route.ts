import { listExecutionLogs } from '../../../../../lib/db'

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
    return new Response('missing issue id', { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const sentIds = new Set<string>()
      let closed = false

      function closeStream() {
        if (!closed) {
          closed = true
          controller.close()
        }
      }

      function push(data: unknown) {
        if (!closed) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }
      }

      function flushLogs() {
        if (closed) {
          return
        }

        const logs = listExecutionLogs(issueId)
        const newLogs = logs.filter((log) => !sentIds.has(log.id))

        for (const log of newLogs) {
          sentIds.add(log.id)
          push(log)

          if (isTerminalStreamLog(log)) {
            push({ type: 'done', issueId })
            closeStream()
            return
          }
        }
      }

      push({ type: 'ready', issueId })
      flushLogs()

      const timer = setInterval(flushLogs, 500)

      const heartbeat = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(': keep-alive\n\n'))
        }
      }, 15000)

      ;(controller as ReadableStreamDefaultController & {
        _cleanup?: () => void
      })._cleanup = () => {
        clearInterval(timer)
        clearInterval(heartbeat)
        closeStream()
      }
    },
    cancel() {
      return
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

function isTerminalStreamLog(log: {
  phase: string
  status: string
  action: string
}) {
  if (log.phase === 'error' || log.status === 'failed') {
    return true
  }

  if (log.phase !== 'system') {
    return false
  }

  return [
    'Agent执行完成',
    '已生成处理建议，等待负责人确认',
    '已升级给管理层，等待人工介入',
  ].includes(log.action)
}
