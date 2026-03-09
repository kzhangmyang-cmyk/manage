import type { IndustryData } from '../lib/types'

export const industries: IndustryData[] = [
  {
    id: 'manufacturing',
    label: '制造业',
    heroTitle: '把设备异常、质检波动和供应问题拉进可推进的管理视图。',
    heroSubtitle:
      '面向制造业管理者的高仿真演示，展示设备报修、质检异常和供应商问题如何被自动接住并持续推进。',
    antiSurveillanceCopy:
      'manage 不是监控员工，而是帮助管理者识别堵点、推动流转、提前发现风险。',
    withoutManageCopy:
      '没有 manage 时，这类问题通常会停留在班组群消息、私聊或口头沟通里，没有人知道它是否已被处理，也没有人知道什么时候该升级。',
    resultCopy:
      '系统强调的不是填了多少单，而是问题有没有被推进、风险有没有被提前发现、管理者是不是更少追人了。',
    exampleIssues: [
      {
        id: 'm-1',
        title: '设备报修',
        text: '二号产线封口机连续两次停机，班组已经切人工处理，今天下午的出货节奏可能受影响。',
        pathHint: '升级人工',
        actionHint: '升级人工',
      },
      {
        id: 'm-2',
        title: '质检异常',
        text: '早班质检发现本批次外壳尺寸偏差明显，已经有 18 件不合格，需要确认是否停线复检。',
        pathHint: '建议确认',
        actionHint: '建议处理',
      },
      {
        id: 'm-3',
        title: '供应商问题',
        text: '供应商承诺今天上午送到的关键零件还没到，采购说对方回复不明确，明天装配可能断料。',
        pathHint: '建议确认',
        actionHint: '建议处理',
      },
      {
        id: 'm-4',
        title: '备件库存查询',
        text: '帮我查一下封口机备用加热模组当前还有几套库存，够不够支撑明天两条线的排班。',
        pathHint: '自动完成',
        actionHint: '自动信息查询',
      },
    ],
    defaultDepartments: ['设备维护', 'IT 支持', '质量管理', '采购'],
  },
  {
    id: 'retail',
    label: '连锁门店 / 零售',
    heroTitle: '把门店异常、客诉升级和补货风险从群消息拉进运营结果层。',
    heroSubtitle:
      '面向零售管理者的高仿真演示，展示门店前线问题如何被自动分类、流转和升级。',
    antiSurveillanceCopy:
      'manage 不是监控店员，而是帮助管理者更早看到营业堵点、客诉风险和跨部门卡点。',
    withoutManageCopy:
      '没有 manage 时，这类问题通常散落在店长群、区域私聊或电话通知里，没人知道是否有人接手，也没人知道什么时候该升级。',
    resultCopy:
      '系统强调的不是谁发了消息，而是门店问题有没有被推进、营业影响会不会扩大、管理者是不是更少追人了。',
    exampleIssues: [
      {
        id: 'r-1',
        title: '门店设备故障',
        text: '朝阳店两台收银设备今天早上反复死机，已经开始排长队，店长联系不到维修支持。',
        pathHint: '升级人工',
        actionHint: '升级人工',
      },
      {
        id: 'r-2',
        title: '客诉升级',
        text: '门店刚收到顾客投诉，说昨天买的熟食有异味，区域经理担心会继续扩散到社交平台。',
        pathHint: '升级人工',
        actionHint: '升级人工',
      },
      {
        id: 'r-3',
        title: '补货异常',
        text: '周末主推商品库存已经低于安全线，但配送中心显示补货单还没出库，明天促销可能断货。',
        pathHint: '建议确认',
        actionHint: '建议处理',
      },
      {
        id: 'r-4',
        title: '排班查询',
        text: '帮我查一下本周六朝阳店晚班的排班安排，还有没有收银岗位空缺。',
        pathHint: '自动完成',
        actionHint: '自动信息查询',
      },
    ],
    defaultDepartments: ['门店运营', '设备支持', '客服', '供应链'],
  },
  {
    id: 'service',
    label: '服务型 / 项目型公司',
    heroTitle: '把客户投诉、项目延期和内部支持请求提前浮到管理面前。',
    heroSubtitle:
      '面向服务型和项目型公司的高仿真演示，展示客户与交付风险如何被更早识别和升级。',
    antiSurveillanceCopy:
      'manage 不是监控员工工时，而是帮助管理者更快发现交付堵点、支持卡点和客户风险。',
    withoutManageCopy:
      '没有 manage 时，这类问题往往停留在项目群、口头同步或零散私聊里，管理者通常只在客户已经不满或项目快延期时才看见。',
    resultCopy:
      '系统强调的不是流程有多复杂，而是客户风险有没有被提前发现、支持请求有没有被推进、管理者是不是更少救火了。',
    exampleIssues: [
      {
        id: 's-1',
        title: '客户投诉',
        text: '客户刚反馈本周第二次没人按时回复实施问题，已经提到如果今天还没结果就要升级到采购负责人。',
        pathHint: '升级人工',
        actionHint: '升级人工',
      },
      {
        id: 's-2',
        title: '项目延期风险',
        text: 'A 项目接口联调比计划晚了三天，前端和后端都在等数据确认，下周里程碑大概率保不住。',
        pathHint: '建议确认',
        actionHint: '建议处理',
      },
      {
        id: 's-3',
        title: '内部支持请求',
        text: '顾问团队申请的数据导出权限还没开通，已经影响客户培训准备，项目经理连续两天在群里追。',
        pathHint: '建议确认',
        actionHint: '建议处理',
      },
      {
        id: 's-4',
        title: '项目状态查询',
        text: '帮我查一下 A 项目当前里程碑状态、已完成节点和下一个计划交付时间。',
        pathHint: '自动完成',
        actionHint: '自动信息查询',
      },
    ],
    defaultDepartments: ['客户成功', '项目管理', '实施支持', 'IT 支持'],
  },
]
