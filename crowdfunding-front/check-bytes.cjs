const fs = require('fs');
const content = fs.readFileSync('src/bytecodes.ts', 'utf8');

const verifierMatch = content.match(/VERIFIER_BYTECODE = "([^"]+)"/);
if (verifierMatch) {
  console.log('VERIFIER_BYTECODE length:', verifierMatch[1].length);
  console.log('VERIFIER ends with:', verifierMatch[1].substring(verifierMatch[1].length - 20));
  console.log('VERIFIER valid hex:', /^0x[0-9a-fA-F]+$/.test(verifierMatch[1]));
}

const crowdfundMatch = content.match(/CROWDFUNDING_BYTECODE = "([^"]+)"/);
if (crowdfundMatch) {
  console.log('CROWDFUNDING_BYTECODE length:', crowdfundMatch[1].length);
  console.log('CROWDFUNDING starts with:', crowdfundMatch[1].substring(0, 40));
  console.log('CROWDFUNDING ends with:', crowdfundMatch[1].substring(crowdfundMatch[1].length - 20));
  console.log('CROWDFUNDING valid hex:', /^0x[0-9a-fA-F]+$/.test(crowdfundMatch[1]));
  console.log('CROWDFUNDING even length:', crowdfundMatch[1].length % 2 === 0);
} else {
  console.log('CROWDFUNDING not found via regex');
  const idx = content.indexOf('CROWDFUNDING_BYTECODE');
  console.log('Found at index:', idx);
  const afterEquals = content.indexOf('"', idx + 21);
  console.log('Quote starts at:', afterEquals);
  const quoteEnd = content.indexOf('";', afterEquals + 1);
  console.log('Quote ends at:', quoteEnd);
  const bc = content.substring(afterEquals + 1, quoteEnd);
  console.log('Extracted length:', bc.length);
  console.log('Starts with:', bc.substring(0, 40));
  console.log('Ends with:', bc.substring(bc.length - 20));
  console.log('Valid hex:', /^0x[0-9a-fA-F]+$/.test(bc));
}
