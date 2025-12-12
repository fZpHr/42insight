const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PROJECTS_PATH = path.join(__dirname, '../lib/forty-two/data/projects_21.json');

const AUTH_COOKIE = process.env.INTRA_COOKIE;
if (!AUTH_COOKIE) {
  console.error('INTRA_COOKIE not set in .env');
  process.exit(1);
}

const urlExceptions = {
  'minirt': 'minirt',
  'cub3d': 'cub3d',
  'exam-rank-01': '42next-exam-rank-01',
  'exam-rank-02': '42next-exam-rank-02',
  'exam-rank-03': '42next-exam-rank-03',
  'exam-rank-04': '42next-exam-rank-04',
  'exam-rank-05': '42next-exam-rank-05',
  'exam-rank-06': '42next-exam-rank-06',
};


function getProjectUrls(slug) {
  const urls = [];
  if (urlExceptions[slug]) urls.push(`https://projects.intra.42.fr/projects/${urlExceptions[slug]}`);
  if (!slug.startsWith('42cursus-')) {
    urls.push(`https://projects.intra.42.fr/projects/42cursus-${slug}`);
  }
  urls.push(`https://projects.intra.42.fr/projects/${slug}`);
  if (slug.startsWith('42cursus-')) {
    const noPrefix = slug.replace(/^42cursus-/, '');
    urls.push(`https://projects.intra.42.fr/projects/${noPrefix}`);
    if (urlExceptions[noPrefix]) urls.push(`https://projects.intra.42.fr/projects/${urlExceptions[noPrefix]}`);
  }
  return urls;
}


function checkUrl(url) {
  return new Promise((resolve) => {
    const options = new URL(url);
    options.method = 'GET';
    options.headers = { 'Cookie': AUTH_COOKIE, 'User-Agent': 'Mozilla/5.0' };
    const req = https.request(options, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function main() {
  const data = JSON.parse(fs.readFileSync(PROJECTS_PATH, 'utf-8'));
  for (const project of data.projects) {
    const urls = getProjectUrls(project.slug);
    let found = false;
    for (const url of urls) {
      const ok = await checkUrl(url);
      if (ok) {
        project.url = url;
        found = true;
        console.log(`${url} => OK`);
        break;
      }
    }
    if (!found) {
      project.url = urls[0];
      console.log(`${urls[0]} => NOT FOUND`);
    }
  }
  fs.writeFileSync(PROJECTS_PATH, JSON.stringify(data, null, 2));
  console.log('URLs écrasées dans le fichier projet.');
}

main();
