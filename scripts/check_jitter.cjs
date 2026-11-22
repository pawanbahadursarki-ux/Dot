const https = require('https');

https.get('https://jitter.video/file/?id=gqKIPtnq1KRyUdF7VTXNUhIG', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Body length:', body.length);
    // Find all strings containing gqKIPtnq1KRyUdF7VTXNUhIG or cloudfront
    const regex = /[a-zA-Z0-9_\-\./:\?=&%]+\.(png|jpg|mp4|webm|json|gif)/gi;
    const matches = body.match(regex) || [];
    console.log('Matches:', [...new Set(matches)]);

    // Check for title or any text content
    const titleMatch = body.match(/<title>(.*?)<\/title>/i);
    console.log('Title:', titleMatch ? titleMatch[1] : 'No title');

    // Look for meta tags
    const metas = body.match(/<meta[^>]+>/gi) || [];
    metas.forEach(m => console.log('Meta:', m));

    // Search for any script tags containing loaderData
    const loaderMatches = body.match(/loaderData[^<]+/gi) || [];
    console.log('Loader matches:', loaderMatches.slice(0, 3));
  });
});
