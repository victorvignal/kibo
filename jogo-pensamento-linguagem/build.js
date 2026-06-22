// build.js — gera public/ com os arquivos estáticos e aplica env var override
const fs = require('fs');
const path = require('path');

const envKey = process.env.FIREBASE_API_KEY;
const outputDir = 'public';

// arquivos que vão pro deploy (sem tests, vercel.json, build.js)
const sourceFiles = ['data.js', 'tela.html', 'painel.html', 'style.css', 'index.html', 'test-sync.html'];

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

let replaced = 0;
sourceFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`[build] skip ${file} (não existe)`);
    return;
  }
  let content = fs.readFileSync(file, 'utf8');
  if (file === 'data.js' && envKey) {
    const matches = content.match(/AIzaSy[A-Za-z0-9_-]+/g) || [];
    if (matches.length > 0) {
      content = content.replace(/AIzaSy[A-Za-z0-9_-]+/g, envKey);
      replaced = matches.length;
    }
  }
  fs.writeFileSync(path.join(outputDir, file), content);
  console.log(`[build] ${file} → public/${file}`);
});

if (envKey && replaced > 0) {
  console.log(`[build] ${replaced} chave(s) API substituída(s) pela env var FIREBASE_API_KEY`);
} else if (envKey) {
  console.log(`[build] env var FIREBASE_API_KEY setada mas nenhuma chave AIzaSy... encontrada no data.js`);
} else {
  console.log(`[build] FIREBASE_API_KEY não setada, usando chave hardcoded do data.js`);
}
