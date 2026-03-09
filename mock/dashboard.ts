import type { DepartmentBacklogItem, IndustryId, RiskItem } from '../lib/types'

type DashboardSeed = {
  departmentBacklog: DepartmentBacklogItem[]
  backgroundRisks: RiskItem[]
  focusPrompts: string[]
  summaryLead: string
}

export const dashboardSeedMap: Record<IndustryId, DashboardSeed> = {
  manufacturing: {
    departmentBacklog: [
      { department: '设备维护', openCount: 7, overdueCount: 2, riskLevel: 'high' },
      { department: '质量管理', openCount: 5, overdueCount: 1, riskLevel: 'medium' },
      { department: '采购', openCount: 4, overdueCount: 1, riskLevel: 'medium' },
      { department: 'IT 支持', openCount: 2, overdueCount: 0, riskLevel: 'low' },
    ],
    backgroundRisks: [
      {
        id: 'm-seed-1',
        title: '三号线视觉检测告警重复出现',
        category: '设备',
        priority: '中',
        owner: '设备维护',
        ageLabel: '42 分钟',
        escalationStatus: 'watching',
        nextAction: '确认是否转人工复检并同步产线负责人',
      },
      {
        id: 'm-seed-2',
        title: '关键包装材料到货时间不稳定',
        category: '采购',
        priority: '高',
        owner: '采购',
        ageLabel: '1.8 小时',
        escalationStatus: 'escalated',
        nextAction: '给供应商追踪节点并准备替代方案',
      },
    ],
    focusPrompts: ['先盯住产线连续性', '确认高风险批次范围', '避免出货承诺被动失守'],
    summaryLead: '今天制造现场的关键问题不是“消息有没有发出来”，而是哪些异常已经开始影响产线和出货。',
  },
  retail: {
    departmentBacklog: [
      { department: '设备支持', openCount: 6, overdueCount: 2, riskLevel: 'high' },
      { department: '门店运营', openCount: 5, overdueCount: 1, riskLevel: 'medium' },
      { department: '客服', openCount: 4, overdueCount: 1, riskLevel: 'medium' },
      { department: '供应链', openCount: 3, overdueCount: 0, riskLevel: 'low' },
    ],
    backgroundRisks: [
      {
        id: 'r-seed-1',
        title: '东城店冷柜温控异常仍未恢复',
        category: '设备',
        priority: '高',
        owner: '设备支持',
        ageLabel: '55 分钟',
        escalationStatus: 'escalated',
        nextAction: '确认临时替换方案并同步区域经理',
      },
      {
        id: 'r-seed-2',
        title: '主推商品补货延迟波及周末活动',
        category: '采购',
        priority: '中',
        owner: '供应链',
        ageLabel: '1.2 小时',
        escalationStatus: 'watching',
        nextAction: '协调配送中心优先出库并预警门店运营',
      },
    ],
    focusPrompts: ['先处理营业受阻门店', '避免客诉进入社交扩散', '对区域经理输出明确升级信号'],
    summaryLead: '今天零售前线最需要管理者关注的，不是消息数量，而是哪些门店问题已经开始影响营业和顾客体验。',
  },
  service: {
    departmentBacklog: [
      { department: '客户成功', openCount: 6, overdueCount: 2, riskLevel: 'high' },
      { department: '项目管理', openCount: 5, overdueCount: 1, riskLevel: 'medium' },
      { department: '实施支持', openCount: 4, overdueCount: 1, riskLevel: 'medium' },
      { department: 'IT 支持', openCount: 3, overdueCount: 0, riskLevel: 'low' },
    ],
    backgroundRisks: [
      {
        id: 's-seed-1',
        title: 'B 项目联调阻塞已影响客户培训计划',
        category: '其他',
        priority: '高',
        owner: '项目管理',
        ageLabel: '2.1 小时',
        escalationStatus: 'escalated',
        nextAction: '确认阻塞责任方并给交付负责人出升级结论',
      },
      {
        id: 's-seed-2',
        title: '客户二次催响应答仍停留在群内',
        category: '客诉',
        priority: '中',
        owner: '客户成功',
        ageLabel: '48 分钟',
        escalationStatus: 'watching',
        nextAction: '明确回复窗口并同步项目负责人',
      },
    ],
    focusPrompts: ['优先稳定客户感知', '把项目延期风险提前浮出', '减少跨团队来回追问'],
    summaryLead: '今天服务交付侧最重要的不是谁解释得更多，而是哪些客户和项目风险需要被更早升级。',
  },
}
