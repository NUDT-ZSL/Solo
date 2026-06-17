const fs = require('fs');
const data = JSON.parse(fs.readFileSync('server/data/questions.json', 'utf8'));
console.log('Total questions:', data.length);

const subjects = {};
const kps = {};

data.forEach(q => {
  subjects[q.subjectId] = (subjects[q.subjectId] || 0) + 1;
  const key = q.subjectId + '-' + q.knowledgePoint;
  kps[key] = (kps[key] || 0) + 1;
});

console.log('\nBy subject:');
Object.entries(subjects).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

console.log('\nBy subject & knowledge point:');
Object.entries(kps).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));

console.log('\nFormat validation:');
let valid = true;
data.forEach((q, i) => {
  if (!q.id || !q.subjectId || !q.text || !q.options || q.options.length !== 4 || 
      q.correctAnswer === undefined || !q.explanation || !q.knowledgePoint || 
      !q.difficulty) {
    console.log(`  Question ${i} (${q.id}) is invalid`);
    valid = false;
  }
  if (q.correctAnswer < 0 || q.correctAnswer > 3) {
    console.log(`  Question ${q.id}: correctAnswer out of range (0-3)`);
    valid = false;
  }
  if (q.difficulty < 1 || q.difficulty > 5) {
    console.log(`  Question ${q.id}: difficulty out of range (1-5)`);
    valid = false;
  }
  if (!['basic', 'logic', 'code', 'security', 'management'].includes(q.knowledgePoint)) {
    console.log(`  Question ${q.id}: invalid knowledgePoint`);
    valid = false;
  }
});

if (valid) {
  console.log('  All questions are valid! ✓');
}
