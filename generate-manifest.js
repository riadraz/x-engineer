const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'docs');

const titleMap = {
  'ja': '（日本語）',
  'en': '（English）',
};

function fileNameToTitle(filename) {
  return filename
    .replace(/\.md$/, '')
    .replace(/-ja$/, ' (JA)')
    .replace(/-en$/, ' (EN)')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

const files = fs.readdirSync(docsDir)
  .filter(f => f.endsWith('.md'))
  .map(f => ({
    id: f.replace(/\.md$/, ''),
    title: fileNameToTitle(f),
    file: `docs/${f}`
  }));

fs.writeFileSync(
  path.join(docsDir, 'manifest.json'),
  JSON.stringify(files, null, 2)
);

console.log(`manifest.json updated with ${files.length} entries.`);
