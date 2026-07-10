require('dotenv').config();
const { suiteQL } = require('./netsuite');

async function main() {
  try {
    const v = await suiteQL("SELECT TOP 5 id, companyname, entityid FROM vendor WHERE id = '121367'");
    console.log('--- vendor 121367 ---');
    console.log(JSON.stringify(v, null, 2));
  } catch (e) { console.error('vendor ERR', e.message); }

  try {
    const pricelevels = await suiteQL("SELECT item, pricelevelname, price FROM itemprice WHERE item IN ('1490','1491','1492')");
    console.log('--- price levels for sample items ---');
    console.log(JSON.stringify(pricelevels, null, 2));
  } catch (e) { console.error('itemprice ERR', e.message); }

  try {
    const garret = await suiteQL("SELECT TOP 5 v.id, v.companyname FROM vendor v WHERE UPPER(v.companyname) LIKE '%GARRET%' OR UPPER(v.companyname) LIKE '%MBRP%' OR UPPER(v.companyname) LIKE '%EDGE%' OR UPPER(v.companyname) LIKE '%FASS%' OR UPPER(v.companyname) LIKE '%SCT%'");
    console.log('--- matching vendors ---');
    console.log(JSON.stringify(garret, null, 2));
  } catch (e) { console.error('vendor search ERR', e.message); }
}

main();
