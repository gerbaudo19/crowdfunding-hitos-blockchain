const fs = require('fs');
const content = fs.readFileSync('src/bytecodes.ts', 'utf8');

const idx = content.indexOf('CROWDFUNDING_BYTECODE');
const afterEquals = content.indexOf('"', idx + 21);
const quoteEnd = content.indexOf('";', afterEquals + 1);
const bc = content.substring(afterEquals + 1, quoteEnd);
console.log('Length with 0x:', bc.length);
console.log('Hex length:', bc.length - 2);
console.log('Even hex length:', (bc.length - 2) % 2 === 0);
console.log('Last 30 chars:', bc.substring(bc.length - 30));
console.log('Expected ending: 736f6c634300081a0033');

// Try to find the issue by scanning from start and end
const hex = bc.substring(2); // without 0x
for (let i = 0; i < hex.length; i++) {
  if (!'0123456789abcdef'.includes(hex[i])) {
    console.log('Non-hex char at position', i, ':', hex[i]);
    break;
  }
}
