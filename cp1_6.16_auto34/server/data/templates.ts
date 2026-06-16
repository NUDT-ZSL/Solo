import { v4 as uuidv4 } from 'uuid';
import { RecipeTemplate, RecipeStep } from '../../src/lib/types';

const createStep = (
  title: string,
  description: string,
  timerHours: number,
  timerMinutes: number
): RecipeStep => ({
  id: uuidv4(),
  title,
  description,
  timerHours,
  timerMinutes,
  ingredients: [],
});

export const recipeTemplates: RecipeTemplate[] = [
  {
    id: uuidv4(),
    name: '经典海绵蛋糕',
    stepCount: 5,
    steps: [
      createStep('准备材料', '将所有材料称量好，鸡蛋回温至室温', 0, 0),
      createStep('打发蛋液', '全蛋加糖隔水打发至浓稠，滴落花纹不消失', 0, 15),
      createStep('混合粉类', '筛入面粉，翻拌均匀至无颗粒', 0, 5),
      createStep('加入黄油牛奶', '黄油融化后与牛奶混合，沿刮刀倒入面糊', 0, 3),
      createStep('烘烤', '倒入模具，160°C烤制约35分钟', 0, 35),
    ],
  },
  {
    id: uuidv4(),
    name: '奶香曲奇饼干',
    stepCount: 4,
    steps: [
      createStep('软化黄油', '黄油室温软化至手指能轻易按下', 1, 0),
      createStep('打发黄油', '黄油加糖打发至颜色变浅体积膨胀', 0, 10),
      createStep('加入蛋液和粉类', '分次加入蛋液，筛入粉类拌匀', 0, 8),
      createStep('挤花烘烤', '装入裱花袋挤花，180°C烤制约15分钟', 0, 15),
    ],
  },
  {
    id: uuidv4(),
    name: '基础吐司面包',
    stepCount: 6,
    steps: [
      createStep('揉面', '所有材料混合揉至扩展阶段', 0, 20),
      createStep('基础发酵', '28°C发酵至两倍大，手指戳洞不回弹', 1, 30),
      createStep('排气分割', '发酵好的面团排气，分割成三等份', 0, 5),
      createStep('松弛', '滚圆后松弛15分钟', 0, 15),
      createStep('整形', '擀卷两次放入吐司盒', 0, 10),
      createStep('最后发酵与烘烤', '38°C发酵至8分满，180°C烤制约40分钟', 1, 10),
    ],
  },
];
