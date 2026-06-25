async function testNews() {
  const res = await fetch('https://newsapi.org/v2/everything?q=test&apiKey=1e7b4e94b2f1469e8b6b23b1c67dfb4f', {
    headers: { 'User-Agent': 'fnd-backend/1.0.0' }
  });
  console.log('NewsAPI Status:', res.status);
  console.log('NewsAPI Body:', await res.text());
}

async function testTavily() {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: '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', query: 'test' })
  });
  console.log('Tavily Status:', res.status);
  console.log('Tavily Body:', await res.text());
}

async function run() {
  await testNews();
  await testTavily();
}

run();
