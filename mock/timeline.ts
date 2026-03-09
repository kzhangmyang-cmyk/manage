import type { IndustryId } from '../lib/types'

export const timelineScenarioMap: Record<
  IndustryId,
  {
    submittedActor: string
    assignmentActor: string
    escalationActor: string
    ownershipNote: string
    escalationNote: string
  }
> = {
  manufacturing: {
    submittedActor: '班组长 / 车间现场',
    assignmentActor: 'manage AI Ops Agent',
    escalationActor: '生产经理',
    ownershipNote: '优先把设备、质检和供应问题从现场反馈拉进统一流转视图。',
    escalationNote: '当产线、质量或出货风险持续抬升时，系统会把问题推给厂区管理层，而不是继续停在群里。',
  },
  retail: {
    submittedActor: '店长 / 区域前线',
    assignmentActor: 'manage AI Ops Agent',
    escalationActor: '区域运营经理',
    ownershipNote: '优先把营业受阻、客诉升级和补货异常推给明确责任团队。',
    escalationNote: '当门店营业影响继续扩大时，系统会自动提醒区域管理者，而不是只靠电话追人。',
  },
  service: {
    submittedActor: '项目经理 / 客户成功',
    assignmentActor: 'manage AI Ops Agent',
    escalationActor: '交付负责人',
    ownershipNote: '优先把客户风险、项目延期和内部支持卡点抬升到交付管理层。',
    escalationNote: '当客户感知和交付窗口持续恶化时，系统会尽快升级给负责人，而不是等到客户先发火。',
  },
}
