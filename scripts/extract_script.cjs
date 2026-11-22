const https = require('https');

https.get('https://jitter.video/file/?id=gqKIPtnq1KRyUdF7VTXNUhIG', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const scriptTags = body.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const tag of scriptTags) {
      if (tag.includes('Happy Faces') || tag.includes('loaderData') || tag.includes('gqKIPtnq1KRyUdF7VTXNUhIG')) {
        console.log('--- SCRIPT TAG ---');
        console.log(tag.slice(0, 500));
        console.log('...');
        console.log(tag.slice(-500));
      }
    }
  });
});
