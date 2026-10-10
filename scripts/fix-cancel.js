const fs = require('fs');
let content = fs.readFileSync('src/app/api/orders/[id]/cancel/route.ts', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('refundMessage =') && lines[i].includes('Refund already processed')) {
        lines[i] = '          refundMessage = \" Refund already processed.\";';
    }
    if (lines[i].includes('refundMessage =') && lines[i].includes('Refund recovered and completed')) {
        lines[i] = '            refundMessage = \" Refund recovered and completed.\";';
    }
}
fs.writeFileSync('src/app/api/orders/[id]/cancel/route.ts', lines.join('\n'));
