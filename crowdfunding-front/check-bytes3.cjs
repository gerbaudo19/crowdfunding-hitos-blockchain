const fs = require('fs');
const content = fs.readFileSync('src/bytecodes.ts', 'utf8');

const match = content.match(/CROWDFUNDING_BYTECODE = "([^"]+)"/);
if (match) {
  const bc = match[1];
  const hex = bc.startsWith('0x') ? bc.substring(2) : bc;
  console.log('Hex length:', hex.length);
  console.log('Even:', hex.length % 2 === 0);
  console.log('Last 50 hex chars:', hex.substring(hex.length - 50));
  // Expected metadata ending for solc 0.8.x
  console.log('Expected last 20:', '64736f6c634300081a0033');
  const last20 = hex.substring(hex.length - 20);
  console.log('Actual last 20:', last20);
  // If mismatch, check last 22
  if (last20 !== '64736f6c634300081a0033') {
    console.log('Last 22:', hex.substring(hex.length - 22));
    // Check if we're missing a nibble
    console.log('Last 21:', hex.substring(hex.length - 21));
  }
  // Also check the very last character
  console.log('Last char:', hex[hex.length - 1]);
  console.log('Second to last:', hex[hex.length - 2]);
}
