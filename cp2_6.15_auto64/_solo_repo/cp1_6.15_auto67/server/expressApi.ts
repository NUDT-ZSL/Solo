import express, { Request, Response } from 'express';
import cors from 'cors';
import { Idea, Category } from '../src/logic/types';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const categories: Category[] = ['growth', 'efficiency', 'experience', 'tech'];

const sampleTitles: Array<{ title: string; desc: string; cat: Category; score: number }> = [
  { title: '用户增长裂变活动', desc: '设计一套邀请好友注册的裂变活动机制，老用户邀请新用户双方均可获得优惠券奖励，通过社交关系链实现病毒式增长。目标30天内新增用户10万。', cat: 'growth', score: 92 },
  { title: '订单处理自动化流程', desc: '引入RPA机器人自动化处理日常订单流程，包括库存校验、订单分配、物流跟踪等环节，预计可减少80%人工操作时间。', cat: 'efficiency', score: 88 },
  { title: '产品首页个性化推荐', desc: '基于用户历史行为数据和偏好画像，在首页展示个性化的内容推荐流，提升用户停留时长和转化率。', cat: 'experience', score: 95 },
  { title: '微服务架构升级', desc: '将现有单体应用拆分为微服务架构，采用容器化部署，提升系统可扩展性和维护性，支持更高并发量。', cat: 'tech', score: 80 },
  { title: '社交分享激励机制', desc: '增加用户分享到社交媒体的奖励机制，分享后获得积分可兑换商品或服务，扩大品牌曝光。', cat: 'growth', score: 78 },
  { title: '智能客服机器人', desc: '接入AI大模型开发智能客服系统，处理80%常见咨询问题，人工客服专注复杂问题，降低客服成本。', cat: 'efficiency', score: 85 },
  { title: '移动端交互体验优化', desc: '重新设计移动端关键页面的交互流程，优化手势操作和动画反馈，提升用户操作流畅度和满意度。', cat: 'experience', score: 90 },
  { title: '数据仓库实时化改造', desc: '将离线数据仓库升级为实时数据架构，使用Flink流处理引擎，实现业务数据秒级更新，支持实时决策。', cat: 'tech', score: 72 },
  { title: '新用户首单优惠策略', desc: '针对新注册用户设计差异化首单优惠方案，根据用户来源渠道和画像推荐最适合的优惠，提高首单转化率。', cat: 'growth', score: 86 },
  { title: '审批流程电子化', desc: '将公司内部各类审批流程电子化、移动化，支持在线审批、自动流转、电子签章，大幅缩短审批周期。', cat: 'efficiency', score: 75 },
  { title: '搜索功能智能增强', desc: '引入语义搜索和联想词推荐，支持模糊匹配和纠错，提升用户搜索结果的准确性和搜索体验。', cat: 'experience', score: 82 },
  { title: 'API网关性能优化', desc: '重构API网关，增加缓存层和限流策略，优化请求路由算法，提升接口响应速度和系统稳定性。', cat: 'tech', score: 68 },
  { title: 'KOL合作营销计划', desc: '与行业头部KOL建立长期合作关系，通过内容种草和直播带货形式，快速触达目标用户群体。', cat: 'growth', score: 88 },
  { title: '项目协作工具集成', desc: '打通Jira、飞书、钉钉等多个协作工具的数据，实现任务状态自动同步，减少跨平台切换成本。', cat: 'efficiency', score: 70 },
  { title: '无障碍设计升级', desc: '按照WCAG 2.1标准对产品进行无障碍改造，支持屏幕阅读器、键盘导航、高对比度模式，惠及更多用户。', cat: 'experience', score: 76 },
  { title: 'DevOps流水线自动化', desc: '构建完整的CI/CD自动化流水线，实现代码提交后自动测试、构建、部署，缩短发布周期从周级到小时级。', cat: 'tech', score: 94 },
  { title: '线下快闪店体验活动', desc: '在一线城市核心商圈开设快闪体验店，结合AR互动和限时优惠，打造网红打卡点，带动线上线下联动。', cat: 'growth', score: 80 },
  { title: '报表模板自定义功能', desc: '提供可视化报表拖拽设计器，业务人员无需写代码即可自定义报表格式和数据源，满足多样化数据分析需求。', cat: 'efficiency', score: 83 },
  { title: '暗黑模式适配', desc: '全产品支持暗黑模式切换，跟随系统自动切换，减少夜间使用时的眼睛疲劳，提升专业感。', cat: 'experience', score: 65 },
  { title: '多云容灾备份方案', desc: '搭建跨云厂商的多活容灾架构，实现数据实时同步和故障自动切换，保障业务连续性99.99%。', cat: 'tech', score: 78 },
  { title: '会员等级权益体系', desc: '设计完善的会员成长体系，根据消费和活跃度划分等级，不同等级享受差异化权益，提升用户粘性和复购率。', cat: 'growth', score: 90 },
  { title: '知识库智能检索系统', desc: '构建企业内部知识库，支持向量检索和智能问答，新员工可快速获取所需信息，降低培训成本。', cat: 'efficiency', score: 77 },
  { title: '加载状态动效设计', desc: '统一设计产品内所有加载状态和空状态的动画效果，缓解用户等待焦虑，提升产品品质感。', cat: 'experience', score: 72 },
  { title: '前端工程化规范建设', desc: '制定团队前端开发规范，包括代码风格、组件库标准、性能监控指标，统一脚手架，提升团队协作效率。', cat: 'tech', score: 64 },
  { title: '用户分层精准运营', desc: '基于RFM模型对用户进行分层，针对不同层级用户制定差异化运营策略，实现精细化营销。', cat: 'growth', score: 87 },
  { title: '智能排班调度系统', desc: '结合历史业务量预测和员工技能矩阵，AI自动生成最优排班方案，降低人力成本同时保证服务质量。', cat: 'efficiency', score: 91 },
  { title: '沉浸式产品引导流程', desc: '新用户首次使用时设计沉浸式引导教程，通过交互式演示快速让用户了解核心功能价值，降低流失率。', cat: 'experience', score: 84 },
  { title: '全链路监控告警平台', desc: '搭建覆盖应用、服务、基础设施的全链路监控系统，智能异常检测和根因分析，提前发现潜在问题。', cat: 'tech', score: 86 },
  { title: '跨界品牌联名活动', desc: '与互补品类品牌开展联名合作，推出限定款产品和联合会员，共享用户资源，扩大品牌影响力。', cat: 'growth', score: 83 },
  { title: '财务对账自动化', desc: '开发智能财务对账引擎，自动匹配多平台流水数据，异常情况智能标记，财务人员只需处理异常。', cat: 'efficiency', score: 89 },
  { title: '隐私保护体验优化', desc: '简化隐私授权流程，提供清晰易懂的隐私说明和权限管理面板，让用户感受到对数据的掌控感。', cat: 'experience', score: 68 },
  { title: '边缘计算节点部署', desc: '在全国核心节点部署边缘计算服务器，将静态资源和计算任务下沉，降低网络延迟，提升用户体验。', cat: 'tech', score: 74 }
];

function generatePresetIdeas(): Idea[] {
  const ideas: Idea[] = [];
  const now = Date.now();

  sampleTitles.forEach((sample, index) => {
    ideas.push({
      id: uuidv4(),
      title: sample.title,
      description: sample.desc,
      category: sample.cat,
      intuitionScore: sample.score,
      createdAt: new Date(now - index * 86400000 * Math.random() * 7).toISOString()
    });
  });

  return ideas;
}

const presetIdeas = generatePresetIdeas();

app.get('/api/ideas', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: presetIdeas,
      total: presetIdeas.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取创意数据失败'
    });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Express server is running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET /api/ideas  - 获取预设创意数据`);
  console.log(`  GET /api/health - 健康检查`);
});

export default app;
