const fs = require('fs');
const https = require('https');

https.get('https://raw.githubusercontent.com/Joulerk/WorldDomination/master/README.md', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    fs.writeFileSync('./README_fetched.md', data);
    console.log('Done');
  });
});
