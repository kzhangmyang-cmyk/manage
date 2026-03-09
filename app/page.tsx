'use client'

import { useMemo, useRef, useState } from 'react'
import { AgentActivityPanel } from '../components/analysis/AgentActivityPanel'
import { AIAnalysisCard } from '../components/analysis/AIAnalysisCard'
import { ParsingReasonCard } from '../components/analysis/ParsingReasonCard'
import { DepartmentBacklogChart } from '../components/dashboard/DepartmentBacklogChart'
import { FocusItemCard } from '../components/dashboard/FocusItemCard'
import { ManagerSummaryCard } from '../components/dashboard/ManagerSummaryCard'
import { RiskBoard } from '../components/dashboard/RiskBoard'
import { RiskTable } from '../components/dashboard/RiskTable'
import { PageShell } from '../components/layout/PageShell'
import { TopBar } from '../components/layout/TopBar'
import { AntiSurveillanceNotice } from '../components/issue/AntiSurveillanceNotice'
import { AttachmentPlaceholder } from '../components/issue/AttachmentPlaceholder'
import { ExampleIssueList } from '../components/issue/ExampleIssueList'
import { IssueInputCard } from '../components/issue/IssueInputCard'
import { StepTabs } from '../components/shared/StepTabs'
import { EscalationCard } from '../components/timeline/EscalationCard'
import { OwnershipFlowCard } from '../components/timeline/OwnershipFlowCard'
import { TimelinePanel } from '../components/timeline/TimelinePanel'
import { buildDashboardData, buildTimelineData } from '../lib/demo-flow'
import { getDefaultIssueText, getIndustryData, getIndustryOptions } from '../lib/industry-config'
import type {
  AgentActivityItem,
  AIAnalysisResult,
  AnalysisStatus,
  AttachmentPlaceholderItem,
  DemoStep,
  DashboardData,
  IndustryId,
  IssueDraft,
  StepTabItem,
  TimelineData,
} from '../lib/types'

const stepItems: StepTabItem[] = [
  {
    value: 'input',
    label: '问题输入',
    caption: '单页入口承接自然语言问题，后续在这里接示例与附件占位。 ',
  },
  {
    value: 'analysis',
    label: 'AI 解析',
    caption: '展示真实 AI 输出结果，并把 Agent 生命周期绑定到一次分析请求。',
  },
  {
    value: 'timeline',
    label: '流转时间线',
    caption: '把已提交、已分配、待响应和升级状态串成可演示的处理链路。',
  },
  {
    value: 'dashboard',
    label: '管理者看板',
    caption: '聚焦高风险异常、超时事项和当前最该关注的管理结果。',
  },
]

const industryOptions = getIndustryOptions()

const defaultAttachmentItems: AttachmentPlaceholderItem[] = [
  {
    id: 'att-1',
    name: '现场照片占位',
    typeLabel: 'Image',
    sizeLabel: '2.4 MB',
  },
  {
    id: 'att-2',
    name: '群消息截图占位',
    typeLabel: 'PNG',
    sizeLabel: '860 KB',
  },
  {
    id: 'att-3',
    name: '工单附件占位',
    typeLabel: 'PDF',
    sizeLabel: '1.1 MB',
  },
]

type PanelChip = {
  label: string
}

type PanelSpec = {
  kicker: string
  title: string
  description: string
  chips: PanelChip[]
  className?: string
}

export default function HomePage() {
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryId>('manufacturing')
  const [currentStep, setCurrentStep] = useState<DemoStep>('input')
  const [issueDraft, setIssueDraft] = useState<IssueDraft>({
    text: getDefaultIssueText('manufacturing'),
    attachments: defaultAttachmentItems,
  })
  const [activeIssueText, setActiveIssueText] = useState('')
  const [activeIndustryId, setActiveIndustryId] = useState<IndustryId | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle')
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [agentActivities, setAgentActivities] = useState<AgentActivityItem[]>([])
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const latestRunIdRef = useRef<string | null>(null)

  const currentIndustry = getIndustryData(selectedIndustry)
  const activeIndustry = activeIndustryId ? getIndustryData(activeIndustryId) : currentIndustry
  const displayIndustry = currentStep === 'input' ? currentIndustry : activeIndustry
  const activeStep = stepItems.find((item) => item.value === currentStep) ?? stepItems[0]
  const hasTimeline = Boolean(timelineData)
  const hasDashboard = Boolean(dashboardData)
  const disabledSteps: DemoStep[] = [
    ...(hasTimeline ? [] : ['timeline' as const]),
    ...(hasDashboard ? [] : ['dashboard' as const]),
  ]

  const heroMeta = useMemo(
    () => [
      {
        label: 'Current Industry',
        value: displayIndustry.label,
        note: displayIndustry.heroSubtitle,
      },
      {
        label: 'Build Scope',
        value: 'Real AI parsing + flow view',
        note: '问题输入页保持轻量，AI 解析页和流转时间线都已经接到真实解析结果。',
      },
      {
        label: 'Suggested Owners',
        value: displayIndustry.defaultDepartments.slice(0, 2).join(' / '),
        note: displayIndustry.resultCopy,
      },
    ],
    [displayIndustry],
  )

  const stageContent = getStageContent(currentStep)

  function handleIndustryChange(industryId: IndustryId) {
    const previousDefault = getDefaultIssueText(selectedIndustry)

    setSelectedIndustry(industryId)
    setIssueDraft((current) => {
      if (!current.text.trim() || current.text.trim() === previousDefault.trim()) {
        return {
          ...current,
          text: getDefaultIssueText(industryId),
        }
      }

      return current
    })
  }

  function handleIssueDraftChange(value: string) {
    setIssueDraft((current) => ({
      ...current,
      text: value,
    }))
  }

  function handleApplyExample(text: string) {
    setIssueDraft((current) => ({
      ...current,
      text,
    }))
  }

  async function handleRunExampleDemo(text: string) {
    const submittedText = text.trim()

    if (!submittedText || analysisStatus === 'loading') {
      return
    }

    setIssueDraft((current) => ({
      ...current,
      text: submittedText,
    }))

    await runAnalysis(submittedText, selectedIndustry)
  }

  function handleStepChange(step: DemoStep) {
    if (disabledSteps.includes(step)) {
      return
    }

    setCurrentStep(step)
  }

  async function runAnalysis(submittedText: string, industryId: IndustryId) {
    const runId = crypto.randomUUID()

    latestRunIdRef.current = runId

    setActiveIssueText(submittedText)
    setActiveIndustryId(industryId)
    setAnalysisStatus('loading')
    setAnalysisResult(null)
    setAnalysisError(null)
    setTimelineData(null)
    setDashboardData(null)
    setAgentActivities(createInitialActivities())
    setCurrentStep('analysis')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: submittedText }),
      })

      if (latestRunIdRef.current !== runId) {
        return
      }

      updateActivitiesForRun(runId, (current) => {
        let next = completeActivity(current, 'request', 'AI 解析接口已接收请求。')
        next = activateActivity(next, 'awaiting', '正在等待模型返回结构化 JSON。')
        return next
      })

      const payload = (await response.json().catch(() => null)) as
        | (AIAnalysisResult & { error?: string })
        | { error?: string }
        | null

      if (latestRunIdRef.current !== runId) {
        return
      }

      if (!response.ok) {
        throw new Error(readApiError(payload))
      }

      const result = normalizeClientAnalysis(payload)

      if (latestRunIdRef.current !== runId) {
        return
      }

      setAnalysisResult(result)
      const nextTimelineData = buildTimelineData({
        industryId,
        issueId: runId,
        issueText: submittedText,
        analysisResult: result,
      })
      setTimelineData(nextTimelineData)
      setDashboardData(
        buildDashboardData({
          industryId,
          issueId: runId,
          issueText: submittedText,
          analysisResult: result,
          timelineData: nextTimelineData,
        }),
      )

      await playSuccessLifecycle(runId, result)
    } catch (error) {
      if (latestRunIdRef.current !== runId) {
        return
      }

      const message = error instanceof Error ? error.message : 'AI 解析失败，请稍后重试。'

      setAnalysisStatus('error')
      setAnalysisResult(null)
      setAnalysisError(message)
      setTimelineData(null)
      setDashboardData(null)
      setAgentActivities(buildFailedActivities(message))
    }
  }

  async function handleInputSubmit() {
    const submittedText = issueDraft.text.trim()

    if (!submittedText || analysisStatus === 'loading') {
      return
    }

    await runAnalysis(submittedText, selectedIndustry)
  }

  async function handleRetryAnalysis() {
    const retryText = activeIssueText.trim() || issueDraft.text.trim()
    const retryIndustryId = activeIndustryId ?? selectedIndustry

    if (!retryText || analysisStatus === 'loading') {
      return
    }

    await runAnalysis(retryText, retryIndustryId)
  }

  function updateActivitiesForRun(
    runId: string,
    updater: (current: AgentActivityItem[]) => AgentActivityItem[],
  ) {
    if (latestRunIdRef.current !== runId) {
      return
    }

    setAgentActivities((current) => updater(current))
  }

  async function playSuccessLifecycle(runId: string, result: AIAnalysisResult) {
    updateActivitiesForRun(runId, (current) => {
      let next = completeActivity(current, 'awaiting', '模型已返回结构化 JSON。')
      next = activateActivity(next, 'category', '正在写入问题类型。')
      return next
    })
    await wait(140)

    if (latestRunIdRef.current !== runId) {
      return
    }

    updateActivitiesForRun(runId, (current) => {
      let next = completeActivity(current, 'category', `已识别问题类型：${result.category}。`)
      next = activateActivity(next, 'priority', '正在判断优先级与影响范围。')
      return next
    })
    await wait(140)

    if (latestRunIdRef.current !== runId) {
      return
    }

    updateActivitiesForRun(runId, (current) => {
      let next = completeActivity(
        current,
        'priority',
        `优先级 ${result.priority}，影响范围：${result.impact}`,
      )
      next = activateActivity(next, 'routing', '正在生成路由建议与响应时限。')
      return next
    })
    await wait(140)

    if (latestRunIdRef.current !== runId) {
      return
    }

    updateActivitiesForRun(runId, (current) => {
      let next = completeActivity(
        current,
        'routing',
        `建议路由到 ${result.recommended_owner}，建议 SLA：${result.suggested_sla}`,
      )
      next = activateActivity(next, 'ready', '正在整理最终展示内容。')
      return next
    })
    await wait(120)

    if (latestRunIdRef.current !== runId) {
      return
    }

    updateActivitiesForRun(runId, (current) =>
      completeActivity(current, 'ready', '解析完成，已可进入流转视图。'),
    )
    setAnalysisStatus('success')
  }

  return (
    <PageShell
      title="让问题自动流转，让风险提前出现。"
      description={`manage 是一个面向企业管理者的 AI 运营结果层。${displayIndustry.heroSubtitle}`}
      meta={heroMeta}
    >
      <TopBar
        productName="manage"
        tagline="不是普通工单系统，也不是员工监控软件；它的核心是推动问题流转，并把风险更早暴露给管理者。"
        selectedIndustry={selectedIndustry}
        industryOptions={industryOptions}
        onIndustryChange={handleIndustryChange}
      />

      <StepTabs
        items={stepItems}
        currentStep={currentStep}
        disabledSteps={disabledSteps}
        onStepChange={handleStepChange}
      />

      <section className="stage-shell">
        <div className="stage-header">
          <div>
            <span className="eyebrow">Single-page demo</span>
            <h2 className="stage-title">{stageContent.title}</h2>
            <p className="stage-summary">{stageContent.summary}</p>
          </div>

          <div className="stage-indicator">
            <span className="stage-indicator-label">Current Step</span>
            <span className="stage-indicator-value">{activeStep.label}</span>
          </div>
        </div>

        {currentStep === 'input' ? (
          <div className="canvas-grid canvas-grid--input stage-view">
            <div className="panel-stack">
              <IssueInputCard
                industryLabel={currentIndustry.label}
                value={issueDraft.text}
                placeholder={currentIndustry.exampleIssues[0]?.text ?? ''}
                suggestedDepartments={currentIndustry.defaultDepartments}
                isSubmitting={analysisStatus === 'loading' && currentStep === 'input'}
                onChange={handleIssueDraftChange}
                onSubmit={handleInputSubmit}
              />
              <AttachmentPlaceholder items={issueDraft.attachments} />
            </div>

            <div className="panel-stack">
              <ExampleIssueList
                industryLabel={currentIndustry.label}
                issues={currentIndustry.exampleIssues}
                selectedText={issueDraft.text}
                onSelectIssue={handleApplyExample}
                onRunIssue={handleRunExampleDemo}
              />
              <AntiSurveillanceNotice
                antiSurveillanceCopy={currentIndustry.antiSurveillanceCopy}
                withoutManageCopy={currentIndustry.withoutManageCopy}
                resultCopy={currentIndustry.resultCopy}
              />
            </div>
          </div>
        ) : currentStep === 'analysis' ? (
          <div className="canvas-grid canvas-grid--analysis stage-view">
            <div className="panel-stack">
              <AIAnalysisCard
                status={analysisStatus}
                industryLabel={activeIndustry.label}
                issueText={activeIssueText}
                result={analysisResult}
                error={analysisError}
              />
              <ParsingReasonCard
                status={analysisStatus}
                result={analysisResult}
                error={analysisError}
              />
            </div>

            <div className="panel-stack">
              <AgentActivityPanel status={analysisStatus} activities={agentActivities} />
              <article className="placeholder-panel">
                <span className="panel-kicker">Next connection</span>
                <h3 className="panel-title">真实请求已接入</h3>
                <p className="panel-description">
                  现在这里已经改成真实 `/api/analyze` 请求驱动。若要本地跑通，请在 `.env.local` 中提供
                  `OPENAI_API_KEY`，也可用 `OPENAI_MODEL` 覆盖默认模型。
                </p>
                <div className="panel-chips">
                  <span className="panel-chip">POST /api/analyze</span>
                  <span className="panel-chip">fixed prompt</span>
                  <span className="panel-chip">OPENAI_API_KEY</span>
                </div>
              </article>
            </div>
          </div>
        ) : currentStep === 'timeline' ? (
          <div className="canvas-grid canvas-grid--timeline stage-view">
            <div className="panel-stack">
              <TimelinePanel data={timelineData} />
            </div>

            <div className="panel-stack">
              <EscalationCard
                industryId={activeIndustry.id}
                data={timelineData}
                result={analysisResult}
              />
              <OwnershipFlowCard
                industryId={activeIndustry.id}
                data={timelineData}
                result={analysisResult}
              />
            </div>
          </div>
        ) : currentStep === 'dashboard' ? (
          <div className="canvas-grid canvas-grid--dashboard stage-view">
            <RiskBoard data={dashboardData} />
            <RiskTable data={dashboardData} />
            <DepartmentBacklogChart data={dashboardData} />
            <ManagerSummaryCard data={dashboardData} />
            <FocusItemCard data={dashboardData} />
          </div>
        ) : (
          renderStageLayout(stageContent.panels, currentStep)
        )}

        {renderStageActions({
          currentStep,
          analysisStatus,
          hasTimeline,
          hasDashboard,
          onBackToInput: () => setCurrentStep('input'),
          onOpenAnalysis: () => setCurrentStep('analysis'),
          onOpenTimeline: () => setCurrentStep('timeline'),
          onOpenDashboard: () => setCurrentStep('dashboard'),
          onRetryAnalysis: handleRetryAnalysis,
        })}

        <div className="footer-note">{stageContent.footer}</div>
      </section>
    </PageShell>
  )
}

function renderStageLayout(panels: PanelSpec[], currentStep: DemoStep) {
  if (currentStep === 'dashboard') {
    return (
      <div className="canvas-grid canvas-grid--dashboard">
        {panels.map((panel) => (
          <article
            key={panel.title}
            className={`placeholder-panel ${panel.className ?? ''}`.trim()}
          >
            <span className="panel-kicker">{panel.kicker}</span>
            <h3 className="panel-title">{panel.title}</h3>
            <p className="panel-description">{panel.description}</p>
            <div className="panel-chips">
              {panel.chips.map((chip) => (
                <span key={chip.label} className="panel-chip">
                  {chip.label}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className={`canvas-grid canvas-grid--${currentStep}`}>
      <article className={`placeholder-panel is-primary ${panels[0]?.className ?? ''}`.trim()}>
        <span className="panel-kicker">{panels[0].kicker}</span>
        <h3 className="panel-title">{panels[0].title}</h3>
        <p className="panel-description">{panels[0].description}</p>
        <div className="panel-chips">
          {panels[0].chips.map((chip) => (
            <span key={chip.label} className="panel-chip">
              {chip.label}
            </span>
          ))}
        </div>
      </article>

      <div className="panel-stack">
        {panels.slice(1).map((panel) => (
          <article key={panel.title} className={`placeholder-panel ${panel.className ?? ''}`.trim()}>
            <span className="panel-kicker">{panel.kicker}</span>
            <h3 className="panel-title">{panel.title}</h3>
            <p className="panel-description">{panel.description}</p>
            <div className="panel-chips">
              {panel.chips.map((chip) => (
                <span key={chip.label} className="panel-chip">
                  {chip.label}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function getStageContent(step: DemoStep): {
  title: string
  summary: string
  footer: string
  panels: PanelSpec[]
} {
  switch (step) {
    case 'input':
      return {
        title: '问题输入页',
        summary:
          '这一屏已经接上行业数据、示例问题、附件占位和反监控叙事。输入仍保持简单，只承接自然语言问题，不做复杂表单。',
        footer:
          '点击示例问题会回填左侧输入框；点击“继续到 AI 解析”会发起真实 API 请求，并在下一屏展示结构化结果。',
        panels: [
          {
            kicker: 'Primary zone',
            title: 'IssueInputCard placeholder',
            description:
              '未来放自然语言问题输入、附件占位和提交动作。当前先保留主要视觉权重与内容容器。',
            chips: [{ label: 'textarea' }, { label: 'attachments' }, { label: 'submit action' }],
          },
          {
            kicker: 'Support zone',
            title: 'ExampleIssueList placeholder',
            description:
              '未来放行业示例问题，一键填充输入框，帮助演示快速进入核心故事。',
            chips: [{ label: 'manufacturing' }, { label: 'retail' }, { label: 'service' }],
          },
          {
            kicker: 'Trust zone',
            title: 'Narrative placeholder',
            description:
              '未来放反监控声明和“没有 manage 时”的对比时刻，提前设定产品边界。',
            chips: [{ label: 'anti-surveillance' }, { label: 'without manage' }, { label: 'result-driven' }],
          },
        ],
      }
    case 'analysis':
      return {
        title: 'AI 解析页',
        summary:
          '这一屏现在由真实 `/api/analyze` 请求驱动：左侧展示结构化结果，右侧展示绑定请求生命周期的 Agent Activity。',
        footer:
          '当前没有使用纯定时器动画。Agent Activity 的开始、返回和字段完成都绑定到真实请求与真实返回内容。',
        panels: [
          {
            kicker: 'Primary zone',
            title: 'AIAnalysisCard placeholder',
            description:
              '未来放分类、优先级、影响范围、推荐责任人、SLA 和判断依据的结构化结果。',
            chips: [
              { label: 'category' },
              { label: 'priority' },
              { label: 'impact' },
              { label: 'recommended owner' },
            ],
          },
          {
            kicker: 'Agent zone',
            title: 'AgentActivityPanel placeholder',
            description:
              '未来必须绑定真实 AI 请求生命周期，不做纯定时器动画。当前先保留结构和权重。',
            chips: [{ label: 'request start' }, { label: 'field completion' }, { label: 'final ready' }],
          },
          {
            kicker: 'Explainability zone',
            title: 'Reasoning placeholder',
            description:
              '未来放判断依据和结果解释，帮助管理者快速理解为什么要这样分级与路由。',
            chips: [{ label: 'reason' }, { label: 'SLA note' }, { label: 'routing note' }],
          },
        ],
      }
    case 'timeline':
      return {
        title: '流转时间线页',
        summary:
          '这一屏已经由真实 AI 解析结果驱动：左侧把流转节点串成时间线，右侧说明是否已升级、当前该谁接、下一步该谁盯。',
        footer:
          '没有 manage 时，这类问题通常停在群消息、私聊或口头同步里；现在你能直接看到它是否已被接住、什么时候该升级。',
        panels: [
          {
            kicker: 'Primary zone',
            title: 'TimelinePanel placeholder',
            description:
              '未来放已提交、已分配、待响应、已升级、处理中等状态，形成可读的推进轨迹。',
            chips: [{ label: 'submitted' }, { label: 'assigned' }, { label: 'escalated' }],
          },
          {
            kicker: 'Escalation zone',
            title: 'EscalationCard placeholder',
            description:
              '未来放超时升级状态、SLA 观察点和升级触发说明。',
            chips: [{ label: 'SLA' }, { label: 'overdue' }, { label: 'manager alert' }],
          },
          {
            kicker: 'Ownership zone',
            title: 'OwnershipFlowCard placeholder',
            description:
              '未来放当前责任部门、协同关系和下一步推进人。',
            chips: [{ label: 'owner team' }, { label: 'handoff' }, { label: 'next action' }],
          },
        ],
      }
    case 'dashboard':
      return {
        title: '管理者看板',
        summary:
          '这一屏已经把真实解析结果和流转状态汇总成管理视图：上层看风险数量，下层看责任团队积压、重点事项和简洁摘要。',
        footer:
          '第一版没有接复杂图表库，部门积压先用轻量条形卡片表现；重点不是可视化炫技，而是让管理者有可信感和控制感。',
        panels: [
          {
            kicker: 'Metrics',
            title: 'High risk metric placeholder',
            description: '未来放今日高风险异常数量和趋势文案。',
            chips: [{ label: 'risk count' }, { label: 'today' }],
            className: 'span-3',
          },
          {
            kicker: 'Metrics',
            title: 'Overdue metric placeholder',
            description: '未来放超时事项数量与升级状态。',
            chips: [{ label: 'overdue' }, { label: 'escalations' }],
            className: 'span-3',
          },
          {
            kicker: 'Metrics',
            title: 'Focus metric placeholder',
            description: '未来放当前最需要关注的事项数量。',
            chips: [{ label: 'focus items' }, { label: 'priority' }],
            className: 'span-3',
          },
          {
            kicker: 'Metrics',
            title: 'In-progress metric placeholder',
            description: '未来放当前处理中事项和推进状态。',
            chips: [{ label: 'in progress' }, { label: 'ownership' }],
            className: 'span-3',
          },
          {
            kicker: 'Main board',
            title: 'RiskTable placeholder',
            description:
              '未来放高风险事项、超时事项和下一步动作建议，强化可追踪、可升级的管理视角。',
            chips: [{ label: 'risk list' }, { label: 'owner' }, { label: 'next action' }],
            className: 'span-7',
          },
          {
            kicker: 'Sidebar',
            title: 'DepartmentBacklog placeholder',
            description:
              '未来用轻量条形卡片展示部门积压和逾期分布，不依赖复杂图表库。',
            chips: [{ label: 'bars' }, { label: 'department backlog' }, { label: 'overdue split' }],
            className: 'span-5',
          },
          {
            kicker: 'Summary',
            title: 'ManagerSummaryCard placeholder',
            description:
              '未来用一段简洁但可信的摘要，说明今天有哪些风险正在抬头、管理者应该先盯什么。',
            chips: [{ label: 'summary' }, { label: 'manager focus' }, { label: 'result view' }],
            className: 'span-12',
          },
        ],
      }
  }
}
function createInitialActivities(): AgentActivityItem[] {
  return [
    {
      id: 'received',
      label: '已接收问题',
      status: 'completed',
      detail: '自然语言问题已锁定，准备提交给 AI 解析接口。',
    },
    {
      id: 'request',
      label: '正在提交 AI 解析请求',
      status: 'active',
      detail: '请求已发起，等待接口接收。',
    },
    {
      id: 'awaiting',
      label: '等待模型返回结果',
      status: 'pending',
      detail: '返回后会进入结构化字段写入阶段。',
    },
    {
      id: 'category',
      label: '等待问题类型识别',
      status: 'pending',
      detail: '将从真实返回结果中读取 category。',
    },
    {
      id: 'priority',
      label: '等待优先级与影响范围判断',
      status: 'pending',
      detail: '将从真实返回结果中读取 priority 和 impact。',
    },
    {
      id: 'routing',
      label: '等待路由建议与 SLA',
      status: 'pending',
      detail: '将从真实返回结果中读取 recommended_owner 和 suggested_sla。',
    },
    {
      id: 'ready',
      label: '等待解析完成',
      status: 'pending',
      detail: '完成后可进入流转视图。',
    },
  ]
}

function buildFailedActivities(message: string): AgentActivityItem[] {
  return [
    {
      id: 'received',
      label: '已接收问题',
      status: 'completed',
      detail: '自然语言问题已锁定。',
    },
    {
      id: 'request',
      label: 'AI 解析失败',
      status: 'failed',
      detail: message,
    },
    {
      id: 'ready',
      label: '等待重新发起解析',
      status: 'pending',
      detail: '可回到输入页修改描述后再次提交。',
    },
  ]
}

function activateActivity(
  activities: AgentActivityItem[],
  id: string,
  detail: string,
): AgentActivityItem[] {
  return activities.map((activity) =>
    activity.id === id
      ? {
          ...activity,
          status: 'active',
          detail,
        }
      : activity,
  )
}

function completeActivity(
  activities: AgentActivityItem[],
  id: string,
  detail: string,
): AgentActivityItem[] {
  return activities.map((activity) =>
    activity.id === id
      ? {
          ...activity,
          status: 'completed',
          detail,
        }
      : activity,
  )
}

function normalizeClientAnalysis(payload: unknown): AIAnalysisResult {
  if (!payload || typeof payload !== 'object') {
    throw new Error('AI 解析接口返回为空。')
  }

  const record = payload as Record<string, unknown>

  return {
    category: readClientField(record, 'category'),
    priority: readClientField(record, 'priority'),
    impact: readClientField(record, 'impact'),
    recommended_owner: readClientField(record, 'recommended_owner'),
    suggested_sla: readClientField(record, 'suggested_sla'),
    reason: readClientField(record, 'reason'),
  }
}

function readClientField(record: Record<string, unknown>, key: keyof AIAnalysisResult) {
  const value = record[key]

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`AI 解析结果缺少字段 ${key}。`)
  }

  return value.trim()
}

function readApiError(payload: unknown): string {
  if (payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string') {
    return (payload as { error: string }).error
  }

  return 'AI 解析失败，请稍后重试。'
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function renderStageActions({
  currentStep,
  analysisStatus,
  hasTimeline,
  hasDashboard,
  onBackToInput,
  onOpenAnalysis,
  onOpenTimeline,
  onOpenDashboard,
  onRetryAnalysis,
}: {
  currentStep: DemoStep
  analysisStatus: AnalysisStatus
  hasTimeline: boolean
  hasDashboard: boolean
  onBackToInput: () => void
  onOpenAnalysis: () => void
  onOpenTimeline: () => void
  onOpenDashboard: () => void
  onRetryAnalysis: () => Promise<void>
}) {
  if (currentStep === 'input') {
    return null
  }

  if (currentStep === 'analysis') {
    return (
      <div className="stage-actions">
        <button type="button" className="action-button action-button--ghost" onClick={onBackToInput}>
          返回输入页
        </button>

        {analysisStatus === 'error' ? (
          <button
            type="button"
            className="action-button action-button--primary"
            onClick={() => {
              void onRetryAnalysis()
            }}
          >
            重新解析
          </button>
        ) : null}

        {analysisStatus === 'success' ? (
          <button
            type="button"
            className="action-button action-button--primary"
            onClick={onOpenTimeline}
            disabled={!hasTimeline}
          >
            查看流转时间线
          </button>
        ) : null}
      </div>
    )
  }

  if (currentStep === 'timeline') {
    return (
      <div className="stage-actions">
        <button type="button" className="action-button action-button--secondary" onClick={onOpenAnalysis}>
          回到 AI 解析
        </button>
        <button
          type="button"
          className="action-button action-button--primary"
          onClick={onOpenDashboard}
          disabled={!hasDashboard}
        >
          查看管理者看板
        </button>
      </div>
    )
  }

  return (
    <div className="stage-actions">
      <button type="button" className="action-button action-button--secondary" onClick={onOpenTimeline}>
        回到流转时间线
      </button>
      <button type="button" className="action-button action-button--ghost" onClick={onBackToInput}>
        重新输入问题
      </button>
    </div>
  )
}
