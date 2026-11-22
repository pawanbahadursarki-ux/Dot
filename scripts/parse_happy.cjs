const https = require('https');

https.get('https://jitter.video/template/happy-faces-landing-page/', (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const videoMatches = body.match(/https:\/\/[^"'\\]+\.(mp4|webm)/gi) || [];
    console.log('Video matches:', videoMatches);
    const s3 = body.match(/https:\/\/[a-zA-Z0-9_\-\./%]+\.(mp4|webm|gif|png|json)/gi) || [];
    console.log('All media:', [...new Set(s3)]);

    // Check loaderData content around happy-faces
    const idx = body.indexOf('happy-faces');
    if (idx !== -1) {
      console.log('Context around happy-faces:');
      console.log(body.slice(Math.max(0, idx - 200), idx + 600));
    }
  });
});
