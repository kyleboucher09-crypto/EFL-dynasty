import { readFile } from 'node:fs/promises';

const indexUrl = new URL('../home-static.html', import.meta.url);
let cachedHtml = '';

async function homepageHtml() {
  if (!cachedHtml) {
    const source = await readFile(indexUrl, 'utf8');
    cachedHtml = source.includes('home-account.js')
      ? source
      : source.replace('</body>', '<script src="/home-account.js?v=2"></script></body>');
  }
  return cachedHtml;
}

export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end('Method not allowed');
  }

  try {
    const html = await homepageHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).send(html);
  } catch (error) {
    console.error('EFL homepage wrapper failed:', error?.message || error);
    return res.status(500).send('EFL League Hub is temporarily unavailable.');
  }
}
