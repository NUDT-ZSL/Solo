import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-test-key',
  baseURL: process.env.OPENAI_BASE_URL
});

export async function generateDiscussionQuestions(
  topicTitle: string,
  topicContent: string,
  replies: { author: string; content: string }[]
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-test-key') {
    return generateFallbackQuestions(topicTitle, topicContent);
  }

  try {
    const replySummaries = replies
      .map((r, i) => `${i + 1}. ${r.author}: ${r.content.substring(0, 200)}`)
      .join('\n');

    const prompt = `你是一个读书会的资深主持人。请根据以下讨论主题和已有回复，生成3个有深度、能激发进一步思考的讨论问题。

讨论主题：${topicTitle}
主题内容：${topicContent}

已有回复：
${replySummaries || '（暂无回复）'}

请生成3个启发式讨论问题，每个问题用一行表示，不要编号，不要其他说明文字。问题应该能够激发成员的深度思考和热烈讨论。`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 300
    });

    const content = response.choices[0]?.message?.content || '';
    const questions = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^\d+[\.\、]\s*/, ''))
      .slice(0, 3);

    if (questions.length < 3) {
      return [...questions, ...generateFallbackQuestions(topicTitle, topicContent)].slice(0, 3);
    }

    return questions;
  } catch (error) {
    console.error('AI生成问题失败:', error);
    return generateFallbackQuestions(topicTitle, topicContent);
  }
}

function generateFallbackQuestions(topicTitle: string, topicContent: string): string[] {
  const baseQuestions = [
    `你认为《${topicTitle}》这个话题最值得深入探讨的是什么？`,
    `如果让你从不同的角度来解读这个主题，你会怎么看？`,
    `这个话题让你联想到了哪些相似的经历或观点？`
  ];
  
  return baseQuestions;
}

export default { generateDiscussionQuestions };
