require('dotenv').config();
const { getActiveProductCodes } = require('../miva');

getActiveProductCodes()
  .then(codes => {
    console.log('Active product count:', codes.size);
    console.log('Sample:', Array.from(codes).slice(0, 10));
  })
  .catch(e => console.error('ERR', e.message));
