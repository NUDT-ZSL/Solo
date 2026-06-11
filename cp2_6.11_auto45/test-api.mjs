import http from 'http';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  console.log('=== 测试 GET /api/ratings ===');
  const getResult = await makeRequest('GET', '/api/ratings');
  console.log('初始状态:', JSON.stringify(getResult, null, 2));

  console.log('\n=== 测试 POST /api/ratings (技术协作 - 5分) ===');
  const post1 = await makeRequest('POST', '/api/ratings', {
    category: '技术协作',
    score: 5,
    comment: '协作顺畅',
  });
  console.log('POST 结果:', JSON.stringify(post1, null, 2));

  console.log('\n=== 测试 POST /api/ratings (创新能力 - 4分) ===');
  const post2 = await makeRequest('POST', '/api/ratings', {
    category: '创新能力',
    score: 4,
  });
  console.log('POST 结果 stats:', JSON.stringify(post2.stats, null, 2));

  console.log('\n=== 测试 POST /api/ratings (无效分类) ===');
  const invalidPost = await makeRequest('POST', '/api/ratings', {
    category: '无效分类',
    score: 3,
  });
  console.log('无效分类结果:', JSON.stringify(invalidPost, null, 2));

  console.log('\n=== 测试 POST /api/ratings (无效分数) ===');
  const invalidScore = await makeRequest('POST', '/api/ratings', {
    category: '技术协作',
    score: 6,
  });
  console.log('无效分数结果:', JSON.stringify(invalidScore, null, 2));

  console.log('\n=== 测试 GET /api/ratings (最终状态) ===');
  const finalGet = await makeRequest('GET', '/api/ratings');
  console.log('ratings 数量:', finalGet.ratings.length);
  console.log('stats:', JSON.stringify(finalGet.stats, null, 2));
  console.log('recentRatings 数量:', finalGet.recentRatings.length);

  console.log('\n=== 测试 DELETE /api/ratings ===');
  const deleteResult = await makeRequest('DELETE', '/api/ratings');
  console.log('清空后 ratings 数量:', deleteResult.ratings.length);
  console.log('清空后 stats:', JSON.stringify(deleteResult.stats, null, 2));

  console.log('\n✅ 所有测试完成!');
}

test().catch(console.error);
