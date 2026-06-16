import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, 'src/Data/mockData.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

console.log('=== 数据结构验证 ===\n');

let allValid = true;

data.poets.forEach((poet, index) => {
  console.log(`${index + 1}. ${poet.name} (${poet.dynasty})`);
  console.log(`   - ID: ${poet.id}`);
  console.log(`   - 生卒年: ${poet.birthYear} - ${poet.deathYear}`);
  console.log(`   - 籍贯: ${poet.hometown}`);
  console.log(`   - 坐标: (${poet.coordinates.lat}, ${poet.coordinates.lng})`);
  console.log(`   - 诗作数量: ${poet.poems.length}`);
  
  if (poet.poems.length < 2) {
    console.log('   ❌ 诗作数量不足2首');
    allValid = false;
  }
  
  poet.poems.forEach((poem, pIndex) => {
    console.log(`     ${pIndex + 1}. 《${poem.title}》`);
    console.log(`        标签: ${poem.tags.join(', ')}`);
    console.log(`        内容长度: ${poem.content.length} 字`);
  });
  
  console.log('');
});

const totalPoems = data.poets.reduce((sum, p) => sum + p.poems.length, 0);
console.log(`总计: ${data.poets.length} 位诗人, ${totalPoems} 首诗作`);
console.log(allValid ? '\n✅ 所有数据结构验证通过' : '\n❌ 数据结构存在问题');
