'use strict';

const { ValidationError, parseHelpSubmission } = require('./help-forms');

function parseSalesSubmission(payload, now = new Date()) {
	return parseHelpSubmission('sales-inquiry', payload, now);
}

module.exports = { ValidationError, parseSalesSubmission };
