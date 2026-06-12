import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

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

app.listen(PORT, () => {
  console.log(`ContractFlow API Server running on port ${PORT}`);
});
