import type { Post, Reply, Book, UserBehavior, BookRecommendation } from '../types';

export interface TFIDFResult {
  term: string;
  tf: number;
  idf: number;
  tfidf: number;
}

export function extractKeywords(text: string): string[] {
  const tags: string[] = [];
  const tagPattern = /#(\S+)/g;
  let match;
  while ((match = tagPattern.exec(text)) !== null) {
    tags.push(match[1]);
  }

  const cleanText = text
    .replace(/#\S+/g, ' ')
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
    .toLowerCase();

  const chineseWords: string[] = [];
  for (let i = 0; i < cleanText.length - 1; i++) {
    if (/[\u4e00-\u9fa5]/.test(cleanText[i]) && /[\u4e00-\u9fa5]/.test(cleanText[i + 1])) {
      chineseWords.push(cleanText.slice(i, i + 2));
    }
  }

  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'shall', 'this', 'that',
    'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our',
    'you', 'your', 'he', 'him', 'his', 'she', 'her', 'i', 'me', 'my',
    '我们', '你们', '他们', '这个', '那个', '这些', '那些', '什么', '怎么',
    '为什么', '因为', '所以', '但是', '而且', '或者', '不是', '就是',
    '一个', '一些', '没有', '已经', '可以', '可能', '应该', '需要',
    '如果', '那么', '虽然', '然而', '因此', '于是', '还有', '以及'
  ]);

  const englishWords = (cleanText.match(/[a-zA-Z]{3,}/g) || []).filter(
    (w) => !stopWords.has(w.toLowerCase())
  );

  return [...tags, ...chineseWords.slice(0, 100), ...englishWords.slice(0, 50)];
}

export function computeTermFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const total = tokens.length || 1;

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  for (const [term, count] of tf.entries()) {
    tf.set(term, count / total);
  }

  return tf;
}

export function computeInverseDocumentFrequency(
  documents: string[][]
): Map<string, number> {
  const idf = new Map<string, number>();
  const totalDocs = documents.length || 1;

  const termDocCount = new Map<string, number>();
  for (const doc of documents) {
    const uniqueTerms = new Set(doc);
    for (const term of uniqueTerms) {
      termDocCount.set(term, (termDocCount.get(term) || 0) + 1);
    }
  }

  for (const [term, docCount] of termDocCount.entries()) {
    idf.set(term, Math.log((totalDocs + 1) / (docCount + 1)) + 1);
  }

  return idf;
}

export function computeTFIDF(
  tokens: string[],
  idf: Map<string, number>
): TFIDFResult[] {
  const tf = computeTermFrequency(tokens);
  const results: TFIDFResult[] = [];

  for (const [term, tfValue] of tf.entries()) {
    const idfValue = idf.get(term) || 0;
    results.push({
      term,
      tf: tfValue,
      idf: idfValue,
      tfidf: tfValue * idfValue
    });
  }

  results.sort((a, b) => b.tfidf - a.tfidf);
  return results;
}

export function buildUserInterestVector(
  posts: Post[],
  replies: Reply[]
): Map<string, number> {
  const allTokens: string[] = [];

  for (const post of posts) {
    const postTokens = extractKeywords(post.title + ' ' + post.content);
    for (let i = 0; i < 3; i++) {
      allTokens.push(...postTokens);
    }
  }

  for (const reply of replies) {
    allTokens.push(...extractKeywords(reply.content));
  }

  const allDocs = [
    ...posts.map((p) => extractKeywords(p.title + ' ' + p.content)),
    ...replies.map((r) => extractKeywords(r.content))
  ];

  const idf = computeInverseDocumentFrequency(allDocs);
  const tfidfResults = computeTFIDF(allTokens, idf);

  const vector = new Map<string, number>();
  const topN = Math.min(50, tfidfResults.length);

  for (let i = 0; i < topN; i++) {
    vector.set(tfidfResults[i].term, tfidfResults[i].tfidf);
  }

  return vector;
}

export function buildBookTagVector(book: Book): Map<string, number> {
  const tokens: string[] = [];

  for (const tag of book.tags) {
    tokens.push(tag);
    tokens.push(...extractKeywords(tag));
  }

  tokens.push(...extractKeywords(book.description));
  tokens.push(...extractKeywords(book.title));

  const tf = computeTermFrequency(tokens);
  const vector = new Map<string, number>();

  const entries = Array.from(tf.entries()).sort((a, b) => b[1] - a[1]);
  const topN = Math.min(30, entries.length);

  for (let i = 0; i < topN; i++) {
    vector.set(entries[i][0], entries[i][1]);
  }

  return vector;
}

export function cosineSimilarity(
  vecA: Map<string, number>,
  vecB: Map<string, number>
): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [term, valueA] of vecA.entries()) {
    normA += valueA * valueA;
    const valueB = vecB.get(term);
    if (valueB !== undefined) {
      dotProduct += valueA * valueB;
    }
  }

  for (const valueB of vecB.values()) {
    normB += valueB * valueB;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function analyzeUserBehavior(
  posts: Post[],
  replies: Reply[],
  userId: number
): UserBehavior {
  const userPosts = posts.filter((p) => p.userId === userId);
  const userReplies = replies.filter((r) => r.userId === userId);

  const allTokens: string[] = [];
  for (const p of userPosts) {
    allTokens.push(...extractKeywords(p.title + ' ' + p.content));
  }
  for (const r of userReplies) {
    allTokens.push(...extractKeywords(r.content));
  }

  const wordFreq = new Map<string, number>();
  for (const t of allTokens) {
    wordFreq.set(t, (wordFreq.get(t) || 0) + 1);
  }

  const tags = Array.from(wordFreq.entries())
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);

  return {
    userId,
    postCount: userPosts.length,
    replyCount: userReplies.length,
    likeCount: 0,
    tags
  };
}

export function generateRecommendations(
  userVector: Map<string, number>,
  books: Book[],
  topN: number = 5
): (Book & { score: number; reason: string })[] {
  const scoredBooks: (Book & { score: number; reason: string })[] = [];

  const topUserTerms = Array.from(userVector.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term]) => term);

  for (const book of books) {
    const bookVector = buildBookTagVector(book);
    const score = cosineSimilarity(userVector, bookVector);

    if (score > 0) {
      const matchedTags: string[] = [];
      for (const tag of book.tags) {
        if (
          topUserTerms.some(
            (term) =>
              tag.includes(term) ||
              term.includes(tag) ||
              extractKeywords(tag).some((t) => topUserTerms.includes(t))
          )
        ) {
          matchedTags.push(tag);
        }
      }

      const uniqueMatched = [...new Set(matchedTags)].slice(0, 3);
      const reason =
        uniqueMatched.length > 0
          ? `根据你对${uniqueMatched.join('、')}的讨论，这本书可能很适合你`
          : book.description || '基于你的阅读兴趣推荐';

      scoredBooks.push({ ...book, score, reason });
    }
  }

  scoredBooks.sort((a, b) => b.score - a.score);
  return scoredBooks.slice(0, topN);
}

export async function fetchUserPosts(groupId: number): Promise<Post[]> {
  const response = await fetch(`/api/groups/${groupId}/posts`);
  if (!response.ok) throw new Error('Failed to fetch posts');
  return response.json();
}

export async function fetchPostReplies(postId: number): Promise<Reply[]> {
  const response = await fetch(`/api/posts/${postId}/replies`);
  if (!response.ok) throw new Error('Failed to fetch replies');
  return response.json();
}

export function generatePersonalizedGreeting(
  topTags: string[],
  userName: string
): string {
  const greetings = [
    `根据你最近对${topTags.length > 0 ? topTags.slice(0, 3).join('和') : '各种话题'}的讨论，推荐以下书籍给热爱探索的你`,
    `${userName || '书友'}你好！基于你近期在${topTags.length > 0 ? topTags.slice(0, 2).join('、') : '阅读'}方面的活跃，为你精心挑选了这些好书`,
    `发现你对${topTags.length > 0 ? topTags.slice(0, 3).join('、') : '各种书籍'}很感兴趣，为你准备了一份专属书单`
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}
