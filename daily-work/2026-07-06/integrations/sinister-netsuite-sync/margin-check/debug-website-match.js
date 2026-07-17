require('dotenv').config();
const { getActiveProductCodes } = require('../miva');

getActiveProductCodes().then(codes => {
  const arr = Array.from(codes);
  console.log('Total active codes:', arr.length);
  console.log('Sample containing "18500" or similar Edge-style codes:');
  console.log(arr.filter(c => /^\d{4,5}(-\d+)?$/.test(c)).slice(0, 20));
  console.log('Does set contain "18500"?', codes.has('18500'));
  console.log('Does set contain "98004"?', codes.has('98004'));
}).catch(e => console.error(e.message));
