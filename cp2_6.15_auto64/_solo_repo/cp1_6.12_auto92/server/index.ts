import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

const contractsDB = Datastore.create({ filename: path.join(__dirname, 'data', 'contracts.db'), autoload: true });
const versionsDB = Datastore.create({ filename: path.join(__dirname, 'data', 'versions.db'), autoload: true });
const annotationsDB = Datastore.create({ filename: path.join(__dirname, 'data', 'annotations.db'), autoload: true });

const sampleContractContentV1 = `合同编号：HT-2024-001
甲方：北京科技有限公司
乙方：上海信息技术有限公司

第一条 合作内容
1.1 甲方委托乙方开发企业管理系统一套
1.2 系统包含用户管理、权限管理、数据报表三大模块
1.3 开发周期为3个月，自签订之日起计算

第二条 合同金额
2.1 本合同总金额为人民币500,000元整
2.2 甲方分三期支付款项
2.3 第一期：合同签订后支付30%，即150,000元
2.4 第二期：系统验收后支付60%，即300,000元
2.5 第三期：质保期满后支付10%，即50,000元

第三条 双方权利与义务
3.1 甲方应及时提供所需资料和配合工作
3.2 乙方应按质按量完成系统开发
3.3 乙方应提供系统培训及技术支持

第四条 知识产权
4.1 本系统所有知识产权归甲方所有
4.2 乙方不得将相关技术泄露给第三方

第五条 违约责任
5.1 任何一方违约应承担相应责任
5.2 逾期交付按日支付合同金额0.1%的违约金`;

const sampleContractContentV2 = `合同编号：HT-2024-001
甲方：北京科技有限公司
乙方：上海信息技术有限公司
签订日期：2024年1月15日

第一条 合作内容
1.1 甲方委托乙方开发企业管理系统一套
1.2 系统包含用户管理、权限管理、数据报表、工作流四大模块
1.3 开发周期为4个月，自签订之日起计算
1.4 乙方需提供不少于50人天的需求调研服务

第二条 合同金额
2.1 本合同总金额为人民币680,000元整
2.2 甲方分四期支付款项
2.3 第一期：合同签订后支付20%，即136,000元
2.4 第二期：需求确认后支付30%，即204,000元
2.5 第三期：系统验收后支付40%，即272,000元
2.6 第四期：质保期满后支付10%，即68,000元

第三条 双方权利与义务
3.1 甲方应及时提供所需资料和配合工作
3.2 甲方指定张经理为项目对接人
3.3 乙方应按质按量完成系统开发
3.4 乙方应提供系统培训及技术支持
3.5 乙方提供1年免费质保服务

第四条 知识产权
4.1 本系统所有知识产权归甲方所有
4.2 乙方不得将相关技术泄露给第三方
4.3 乙方保留基础框架的知识产权

第五条 违约责任
5.1 任何一方违约应承担相应责任
5.2 逾期交付按日支付合同金额0.15%的违约金
5.3 逾期超过30天，甲方有权解除合同

第六条 保密条款
6.1 双方应对合作内容严格保密
6.2 保密期限为合同终止后5年`;

const sampleContractContentV3 = `合同编号：HT-2024-001
甲方：北京科技有限公司
乙方：上海信息技术有限公司
签订日期：2024年1月15日

第一条 合作内容
1.1 甲方委托乙方开发企业管理系统一套
1.2 系统包含用户管理、权限管理、数据报表、工作流、移动端五大模块
1.3 开发周期为5个月，自签订之日起计算
1.4 乙方需提供不少于80人天的需求调研服务
1.5 乙方负责系统上线后的运维支持6个月

第二条 合同金额
2.1 本合同总金额为人民币850,000元整
2.2 甲方分四期支付款项
2.3 第一期：合同签订后支付20%，即170,000元
2.4 第二期：需求确认后支付30%，即255,000元
2.5 第三期：系统验收后支付40%，即340,000元
2.6 第四期：质保期满后支付10%，即85,000元

第三条 双方权利与义务
3.1 甲方应及时提供所需资料和配合工作
3.2 甲方指定张经理为项目对接人
3.3 乙方应按质按量完成系统开发
3.4 乙方应提供系统培训及技术支持
3.5 乙方提供2年免费质保服务
3.6 乙方每两周提交一次项目进度报告

第四条 知识产权
4.1 本系统所有知识产权归甲方所有
4.2 乙方不得将相关技术泄露给第三方
4.3 乙方保留基础框架的知识产权

第五条 违约责任
5.1 任何一方违约应承担相应责任
5.2 逾期交付按日支付合同金额0.15%的违约金
5.3 逾期超过30天，甲方有权解除合同

第六条 保密条款
6.1 双方应对合作内容严格保密
6.2 保密期限为合同终止后5年

第七条 争议解决
7.1 因本合同产生的争议应友好协商解决
7.2 协商不成的，提交甲方所在地人民法院诉讼`;

const seedData = async () => {
  const existingContracts = await contractsDB.find({});
  if (existingContracts.length === 0) {
    const contract1Id = uuidv4();
    const contract2Id = uuidv4();
    const contract3Id = uuidv4();

    await contractsDB.insertMany([
      { _id: contract1Id, name: '企业管理系统开发合同', lastModified: Date.now() - 86400000 * 2 },
      { _id: contract2Id, name: '办公设备采购框架协议', lastModified: Date.now() - 86400000 * 5 },
      { _id: contract3Id, name: '年度法律顾问服务合同', lastModified: Date.now() - 86400000 * 1 }
    ]);

    await versionsDB.insertMany([
      { _id: uuidv4(), contractId: contract1Id, version: 'v1.0', submitter: '李明', createdAt: Date.now() - 86400000 * 10, content: sampleContractContentV1 },
      { _id: uuidv4(), contractId: contract1Id, version: 'v1.1', submitter: '王芳', createdAt: Date.now() - 86400000 * 5, content: sampleContractContentV2 },
      { _id: uuidv4(), contractId: contract1Id, version: 'v1.2', submitter: '张伟', createdAt: Date.now() - 86400000 * 2, content: sampleContractContentV3 },
      { _id: uuidv4(), contractId: contract2Id, version: 'v1.0', submitter: '赵丽', createdAt: Date.now() - 86400000 * 15, content: sampleContractContentV1 },
      { _id: uuidv4(), contractId: contract2Id, version: 'v1.1', submitter: '刘强', createdAt: Date.now() - 86400000 * 5, content: sampleContractContentV2 },
      { _id: uuidv4(), contractId: contract3Id, version: 'v1.0', submitter: '孙涛', createdAt: Date.now() - 86400000 * 1, content: sampleContractContentV3 }
    ]);
  }
};

seedData();

app.get('/api/contracts', async (_req, res) => {
  try {
    const contracts = await contractsDB.find({}).sort({ lastModified: -1 });
    const result = await Promise.all(contracts.map(async (contract) => {
      const versions = await versionsDB.find({ contractId: contract._id }).sort({ createdAt: -1 });
      const latestVersion = versions[0];
      return {
        id: contract._id,
        name: contract.name,
        lastModified: contract.lastModified,
        latestVersion: latestVersion ? latestVersion.version : null
      };
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取合同列表失败' });
  }
});

app.get('/api/contract/:id/versions', async (req, res) => {
  try {
    const versions = await versionsDB.find({ contractId: req.params.id }).sort({ createdAt: -1 });
    const annotations = await annotationsDB.find({ contractId: req.params.id });
    const result = versions.map((v) => ({
      id: v._id,
      version: v.version,
      submitter: v.submitter,
      createdAt: v.createdAt,
      content: v.content,
      annotations: annotations.filter((a) => a.versionId === v._id)
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取版本列表失败' });
  }
});

app.post('/api/contract/:id/annotation', async (req, res) => {
  try {
    const { versionId, lineNumber, content } = req.body;
    const annotation = {
      _id: uuidv4(),
      contractId: req.params.id,
      versionId,
      lineNumber,
      content,
      status: 'pending',
      author: '审核员',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const result = await annotationsDB.insert(annotation);
    res.json({ ...result, id: result._id });
  } catch (error) {
    res.status(500).json({ error: '创建批注失败' });
  }
});

app.patch('/api/annotation/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: Date.now() };
    const numReplaced = await annotationsDB.update({ _id: req.params.id }, { $set: updates });
    if (numReplaced === 0) {
      return res.status(404).json({ error: '批注不存在' });
    }
    const annotation = await annotationsDB.findOne({ _id: req.params.id });
    res.json({ ...annotation, id: annotation._id });
  } catch (error) {
    res.status(500).json({ error: '更新批注失败' });
  }
});

app.delete('/api/annotation/:id', async (req, res) => {
  try {
    const numRemoved = await annotationsDB.remove({ _id: req.params.id });
    if (numRemoved === 0) {
      return res.status(404).json({ error: '批注不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除批注失败' });
  }
});

/* ============== 后端直接生成 PDF 文件流 ============== */
const STATUS_LABELS: Record<string, string> = {
  pending: '未处理',
  confirmed: '待确认',
  approved: '已通过',
  rejected: '需修改',
};

const STATUS_SORT = ['pending', 'confirmed', 'rejected', 'approved'];

app.post('/api/contract/:id/export', async (req, res) => {
  try {
    const body = req.body || {};
    const {
      contractName = '未命名合同',
      oldVersion = '-',
      newVersion = '-',
      submitterOld = '-',
      submitterNew = '-',
      diffSummary = { added: 0, removed: 0, modified: 0 },
      annotations = [],
    } = body;

    const contract = await contractsDB.findOne({ _id: req.params.id });
    const finalName = contract?.name || contractName;

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `ContractFlow-${finalName}-审核报告`,
        Author: 'ContractFlow',
        Producer: 'ContractFlow',
        Creator: 'ContractFlow',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => {
      const buf = Buffer.concat(chunks);
      const filename = `ContractFlow_${encodeURIComponent(finalName)}_${oldVersion}_vs_${newVersion}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', String(buf.length));
      res.status(200).end(buf);
    });

    const pageWidth = doc.page.width - 100;
    const leftX = 50;

    // ---- 封面 ----
    doc.rect(0, 0, doc.page.width, 180).fill('#1a2332');
    doc.fill('#ffffff');
    doc.fontSize(24).font('Helvetica-Bold').text('ContractFlow', leftX, 50);
    doc.fontSize(14).font('Helvetica').text('合同版本审核追踪报告', leftX, 85);
    doc.moveTo(leftX, 115).lineTo(leftX + 200, 115).stroke('#3b82f6').lineWidth(2);
    doc.fontSize(11).fill('#94a3b8').text(`生成时间：${new Date().toLocaleString('zh-CN', { hour12: false })}`, leftX, 140);

    let y = 220;
    doc.fill('#1a2332');
    doc.fontSize(16).font('Helvetica-Bold').text(finalName, leftX, y);
    y += 32;

    // ---- 合同元信息 ----
    doc.fontSize(10).fill('#6b7280').font('Helvetica');
    doc.text('合同编号 / 标识', leftX, y);
    doc.fontSize(12).fill('#1a2332').font('Helvetica-Bold').text(req.params.id, leftX + 110, y);
    y += 22;
    doc.fontSize(10).fill('#6b7280').font('Helvetica').text('对比版本', leftX, y);
    doc.fontSize(12).fill('#1a2332').font('Helvetica-Bold').text(`${oldVersion}  →  ${newVersion}`, leftX + 110, y);
    y += 22;
    doc.fontSize(10).fill('#6b7280').font('Helvetica').text('提交者', leftX, y);
    doc.fontSize(12).fill('#1a2332').font('Helvetica-Bold').text(`${submitterOld}  →  ${submitterNew}`, leftX + 110, y);
    y += 30;

    // ---- 差异摘要 ----
    doc.fontSize(13).font('Helvetica-Bold').fill('#1a2332').text('📊  差异摘要', leftX, y);
    y += 20;
    doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).stroke('#e5e7eb').lineWidth(0.5);
    y += 12;

    const summaries = [
      { label: '新增行数', count: diffSummary.added ?? 0, color: '#22c55e', bg: '#dcfce7', fg: '#15803d' },
      { label: '删除行数', count: diffSummary.removed ?? 0, color: '#ef4444', bg: '#fee2e2', fg: '#b91c1c' },
      { label: '修改行数', count: diffSummary.modified ?? 0, color: '#eab308', bg: '#fef9c3', fg: '#a16207' },
    ];

    let sx = leftX;
    const boxW = (pageWidth - 32) / 3;
    for (const s of summaries) {
      doc.roundedRect(sx, y, boxW, 58, 8).fillAndStroke(s.bg, s.color);
      doc.fill(s.fg).fontSize(20).font('Helvetica-Bold').text(String(s.count), sx + 16, y + 14, { width: boxW - 32, align: 'right' });
      doc.fill(s.fg).fontSize(10).font('Helvetica').text(s.label, sx + 16, y + 38, { width: boxW - 32, align: 'right' });
      sx += boxW + 16;
    }
    y += 84;

    // ---- 批注列表 ----
    doc.addPage();
    y = 60;
    doc.fontSize(13).font('Helvetica-Bold').fill('#1a2332').text('💬  批注列表', leftX, y);
    y += 20;
    doc.moveTo(leftX, y).lineTo(leftX + pageWidth, y).stroke('#e5e7eb').lineWidth(0.5);
    y += 14;

    if (!Array.isArray(annotations) || annotations.length === 0) {
      doc.fontSize(11).fill('#9ca3af').font('Helvetica').text('当前版本对比暂无批注。', leftX + 10, y);
    } else {
      const sorted = [...annotations].sort((a: any, b: any) => {
        const sa = STATUS_SORT.indexOf(a.status);
        const sb = STATUS_SORT.indexOf(b.status);
        if (sa !== sb) return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
        return (a.lineNumber ?? 0) - (b.lineNumber ?? 0) || (a.createdAt ?? 0) - (b.createdAt ?? 0);
      });

      let idx = 0;
      for (const ann of sorted) {
        if (y > 760) { doc.addPage(); y = 60; }
        idx++;
        const label = STATUS_LABELS[ann.status] || ann.status || '未处理';
        const lineNum = ann.lineNumber ?? '-';
        const versionTag = ann.version || '-';
        const author = ann.author || '匿名';
        const createdAt = ann.createdAt ? new Date(ann.createdAt).toLocaleString('zh-CN', { hour12: false }) : '-';
        const content = ann.content || '';

        doc.roundedRect(leftX, y, pageWidth, 8, 4).fillAndStroke('#f3f4f6', '#e5e7eb');
        doc.fill('#1a2332').fontSize(10).font('Helvetica-Bold').text(
          `#${idx}  [${versionTag}]  行 ${lineNum}  ·  ${label}  ·  ${author}  ·  ${createdAt}`,
          leftX + 10, y - 2,
          { width: pageWidth - 20, align: 'left' }
        );
        y += 16;

        doc.fill('#374151').fontSize(10).font('Helvetica');
        const lines = doc.heightOfString(content, { width: pageWidth - 24 });
        doc.text(content || '(空)', leftX + 12, y, { width: pageWidth - 24 });
        y += lines + 16;
      }
    }

    // ---- 页脚 ----
    const pages = doc.bufferedPageRange ? (doc.bufferedPageRange().count ?? 1) : 1;
    const finalPages = (doc as any)._pageBuffer ? (doc as any)._pageBuffer.length : pages;
    doc.on('pageAdded', () => {});
    for (let i = 0; i < finalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fill('#9ca3af').font('Helvetica').text(
        `ContractFlow · ${finalName} · ${new Date().toLocaleDateString('zh-CN')}    第 ${i + 1} 页`,
        50,
        doc.page.height - 36,
        { width: doc.page.width - 100, align: 'center' }
      );
    }

    doc.end();
  } catch (error) {
    console.error('导出PDF失败:', error);
    res.status(500).json({ error: '导出PDF失败' });
  }
});

app.listen(PORT, () => {
  console.log(`ContractFlow API Server running on port ${PORT}`);
});
