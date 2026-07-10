/*
* preMapFunction
*/
function preMap (options) {
  const currencyID = options.settings.flow.currencyID;
  const accountID = options.settings.flow.accountID;
  
  return options.data.map((d) => {
    if (d && currencyID && accountID) {
      d.accountID = accountID;
      d.currencyID = currencyID;
    } else {
      throw Error('Missing Currency Internal ID & Account Internal ID. Configure it on General Settings tab.')
    }
    
    return {
      data: d
    };
  });
}