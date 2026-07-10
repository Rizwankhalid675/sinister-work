/*
* preMapFunction stub:
*
* The name of the function can be changed to anything you like.
*
* The function will be passed one ‘options’ argument that has the following fields:
*   ‘data’ - an array of records representing the page of data before it has been mapped.  A record can be an object {} or array [] depending on the data source.
*   '_importId' - the _importId currently running.
*   '_connectionId' - the _connectionId currently running.
*   '_flowId' - the _flowId currently running.
*   '_integrationId' - the _integrationId currently running.
*   'settings' - all custom settings in scope for the import currently running.
*   'testMode' - Boolean flag that executes script only on test mode and preview/send actions.
*
* The function needs to return an array, and the length MUST match the options.data array length.
* Each element in the array represents the actions that should be taken on the record at that index.
* Each element in the array should have the following fields:
*   'data' - the modified/unmodified record that should be passed along for processing.
*   'errors' -  used to report one or more errors for the specific record.  Each error must have the following structure: {code: '', message: '', source: ‘’ }
* Returning an empty object {} for a specific record will indicate that the record should be ignored.
* Returning both 'data' and 'errors' for a specific record will indicate that the record should be processed but errors should also be logged.
* Throwing an exception will fail the entire page of records.
*/
function preMap (options) {
	return options.data.map((d) => {
		if (d.discounts && d.discounts.length > 0) {
			d.discount_item = 38;
			d.discount_total = 0 - d.discounts[0].total;
		}
	
		if (d.charges && d.charges.length > 0) {
			let shipping_cost = 0;
			let enshield_cost = 0;
			
			d.charges.forEach((charge) => {
				if (charge.type === 'SHIPPING' && charge.amount > 0) {
					shipping_cost = charge.amount;
				}
				
				if (charge.type === 'enshield_charge' && charge.amount > 0) {
					enshield_cost = charge.amount;
				}
			});
			
			
			d.enshield_cost = enshield_cost;
			d.shipping_cost = shipping_cost;
		}

		// If enshield charge present, add enshield item to items list
		if(d.enshield_cost > 0) {
			d.items.push({
				// Netsuite ID is 10322 - MIVA ID 15639
				product_id: '15639',
				sku: 'SD-ENSHIELD',
				name: 'Enhanced Shipping Protection',
				quantity: 1,
				price: d.enshield_cost,
				tax: 0,
				total: d.enshield_cost
			});
		}

		for (let i = 0; i < d.items.length; i++) {
			let itemDesc = [];
			
			if (d.items[i].options && d.items[i].options.length > 0) {
				itemDesc.push('Options:');
				
				d.items[i].options.forEach((itemOpt) => {
					itemDesc.push(itemOpt.attr_prompt + ': ' + itemOpt.opt_prompt);
				});
			}
		
			d.items[i].description = itemDesc.join('\n');
		
			// Item Price Level
			// if (d.items[i].name != 'Enhanced Shipping Protection' && d.items[i].name != 'Extended Protection Plan') {
			//   d.items[i].pricelevel = 5;
			// }
		
			// Hardcode certain items
			if (d.items[i].sku === 'SD-UFC-OIL') {
				d.items[i].product_id = 15405;
			} else if (d.items[i].sku === 'SD-RADTUBE-6.7C-19-HO') {
				d.items[i].product_id = 14922;
			} else if (d.items[i].sku === 'SD-RADTUBE-6.7C-19') {
				d.items[i].product_id = 14923;
			} else if (d.items[i].sku === 'SD-FC-FUEL-U-GRN') {
				d.items[i].product_id = 14351;
			} else if (d.items[i].sku === 'SDG-CAI-6.0') {
				d.items[i].product_id = 13309;
			} else if (d.items[i].sku === 'SD-FC-FUEL-U') {
				d.items[i].product_id = 14715;
			} else if (d.items[i].sku === 'SD-FC-FUEL-U-GRY') {
				d.items[i].product_id = 14461;
			} else if (d.items[i].sku === 'SD-REOFCF-6.0') {
				d.items[i].product_id = 14919;
			} else {
				const itemCode = d.items[i].code ? d.items[i].code.toLowerCase() : "";
				const itemSKU = d.items[i].sku ? d.items[i].sku.toLowerCase() : "";
				const itemName = d.items[i].name ? d.items[i].name.toLowerCase() : "";
				
				if (itemCode.indexOf('-blem') >= 0 || itemSKU.indexOf('-blem') >= 0 || itemName.indexOf('blemish') >= 0) {
					d.items[i].product_id = 'SD-BLEMISH';
					d.items[i].description = d.items[i].sku;
				}
			}
		
			// Line Tax
			if (d.items[i].tax > 0) {
				d.items[i].ns_tax_code = 12260;
			} else {
				d.items[i].ns_tax_code = -7;
			}
		}
	
		return {
			data: d
		}
  })
}