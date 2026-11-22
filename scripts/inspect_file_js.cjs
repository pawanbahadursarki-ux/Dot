const https = require('https');

https.get('https://jitter.video/assets/file-CwsGhYb_.js', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('File JS length:', body.length);
    // Find all fetch or api calls
    const apis = body.match(/\/api\/[a-zA-Z0-9_\/]+/g) || [];
    console.log('APIs:', [...new Set(apis)]);
    const urls = body.match(/https:\/\/[a-zA-Z0-9_\-\./]+/g) || [];
    console.log('URLs in file.js:', [...new Set(urls)].slice(0, 10));
  });
});
