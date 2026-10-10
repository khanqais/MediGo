const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../supabase/migrations');
const outputFile = path.join(__dirname, '../supabase/full_schema_for_dashboard.sql');

const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

let fullSchema = '';

for (const file of files) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  fullSchema += '-- Migration: ' + file + '\n' + cleanContent + '\n\n';
}

fs.writeFileSync(outputFile, fullSchema, 'utf8');
console.log('Built ' + outputFile);