const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function testEndpoints() {
  const fileId = 'gqKIPtnq1KRyUdF7VTXNUhIG';
  const urls = [
    `https://jitter.video/api/files/${fileId}`,
    `https://jitter.video/api/file/${fileId}`,
    `https://jitter.video/api/projects/${fileId}`,
    `https://jitter.video/api/v1/files/${fileId}`,
    `https://d1sk5dy9gxckst.cloudfront.net/files/${fileId}.json`,
    `https://d1sk5dy9gxckst.cloudfront.net/projects/${fileId}.json`,
    `https://d1sk5dy9gxckst.cloudfront.net/renders/${fileId}.mp4`,
    `https://d1sk5dy9gxckst.cloudfront.net/renders/${fileId}.gif`,
    `https://d1sk5dy9gxckst.cloudfront.net/previews/${fileId}.mp4`,
    `https://d1sk5dy9gxckst.cloudfront.net/previews/${fileId}.gif`,
    `https://d1sk5dy9gxckst.cloudfront.net/thumbnails/${fileId}.mp4`
  ];

  for (const u of urls) {
    try {
      const res = await fetchUrl(u);
      console.log(res.status, u, res.data ? res.data.slice(0, 80) : '');
    } catch (e) {
      console.log('ERR', u, e.message);
    }
  }
}

testEndpoints();
