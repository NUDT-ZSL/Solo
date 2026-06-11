import { analyzeText, splitSentences, getAllKeywords } from './src/analyzer.ts';

const testText = '今天是个开心的日子，阳光明媚，心情舒畅。完成了一个重要的项目，感到很欣慰也很满足。虽然中间有些小挫折让人焦虑，但最终都顺利解决了，现在感到十分平静和安宁。';

console.log('=== 情绪分析测试 ===\n');

console.log('原始文本:');
console.log(testText);
console.log();

const sentences = splitSentences(testText);
console.log(`分句结果 (共${sentences.length}句):`);
sentences.forEach((s, i) => {
  console.log(`  ${i + 1}. "${s.text}" (字符位置 ${s.start}-${s.end})`);
});
console.log();

const result = analyzeText(testText);
console.log('句子详细分析:');
result.sentences.forEach((s, i) => {
  console.log(`\n  句${i + 1} (位置比例 ${s.charIndex.toFixed(2)}):`);
  console.log(`    文本: "${s.text}"`);
  console.log(`    主导情绪: ${s.dominantEmotion}`);
  console.log(`    强度: ${s.intensity}/5`);
  if (s.keywords.length > 0) {
    console.log(`    关键词:`);
    s.keywords.forEach(k => {
      console.log(`      - "${k.word}" [${k.emotion}] 强度${k.intensity} @pos${k.position}`);
    });
  } else {
    console.log(`    关键词: (无)`);
  }
});

console.log('\n整体情绪统计:');
for (const [emotion, score] of Object.entries(result.overallEmotions)) {
  console.log(`  ${emotion}: ${score}`);
}
console.log(`\n主导情绪: ${result.dominantEmotion}`);
console.log(`总字符数: ${result.totalChars}`);

const allKw = getAllKeywords(result);
console.log(`\n所有关键词 (共${allKw.length}个): ${allKw.map(k => k.word).join(', ')}`);
