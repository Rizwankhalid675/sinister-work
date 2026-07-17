'use strict';

const BOARD_ID = 2428283337;
const GROUP_ID = 'emailed_items';
const COMMON_FIELDS = ['name', 'email', 'phone', 'details', 'evidenceUrl', 'website'];

const FORM_DEFINITIONS = Object.freeze({
	'sales-inquiry': {
		inquiryIndex: 102,
		fields: ['itemSku', 'question'],
		required: []
	},
	'missing-damaged-parts': {
		inquiryIndex: 110,
		fields: ['orderNumber', 'itemSku', 'installed'],
		required: ['orderNumber']
	},
	'returns-exchanges': {
		inquiryIndex: 3,
		fields: ['orderNumber', 'itemSku', 'returnType', 'reason', 'installed'],
		required: ['orderNumber']
	},
	'order-tracking': {
		inquiryIndex: 11,
		fields: ['orderNumber'],
		required: ['orderNumber']
	},
	'tech-support': {
		inquiryIndex: 101,
		fields: ['orderNumber', 'itemSku', 'installed'],
		required: []
	},
	'warranty-inquiry': {
		inquiryIndex: 12,
		fields: ['orderNumber', 'itemSku'],
		required: ['orderNumber']
	},
	'shipping-claim': {
		inquiryIndex: 106,
		fields: ['orderNumber', 'trackingNumber', 'ifNumber'],
		required: ['orderNumber']
	}
});

class ValidationError extends Error {
	constructor(fields) {
		super('The help request is invalid.');
		this.name = 'ValidationError';
		this.fields = fields;
	}
}

function text(value) {
	return typeof value === 'string' ? value.trim() : '';
}

function normalizeUsPhone(value) {
	const digits = text(value).replace(/\D/g, '');
	if (digits.length === 10) return `+1${digits}`;
	if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
	return null;
}

function validUrl(value) {
	if (!value) return true;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:';
	} catch {
		return false;
	}
}

function parseHelpSubmission(slug, payload, now = new Date()) {
	const definition = FORM_DEFINITIONS[slug];
	if (!definition) throw new Error(`Unknown help form: ${slug}`);
	const input = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
	if (text(input.website)) return { discarded: true };

	const allowed = new Set([...COMMON_FIELDS, ...definition.fields]);
	const name = text(input.name);
	const email = text(input.email).toLowerCase();
	const phone = normalizeUsPhone(input.phone);
	const detailsField = slug === 'sales-inquiry' ? 'question' : 'details';
	const details = text(input[detailsField]);
	const fields = {};

	if (!name) fields.name = 'Enter your name.';
	else if (name.length > 255) fields.name = 'Keep your name under 255 characters.';
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fields.email = 'Enter a valid email address.';
	if (!phone) fields.phone = 'Enter a valid phone number.';
	if (!details) fields[detailsField] = slug === 'sales-inquiry' ? 'Enter your question.' : 'Describe how we can help.';
	else if (details.length > 2000) fields[detailsField] = slug === 'sales-inquiry' ? 'Keep your question under 2,000 characters.' : 'Keep the details under 2,000 characters.';

	for (const field of definition.required) {
		if (!text(input[field])) fields[field] = `Enter your ${field === 'orderNumber' ? 'order number' : field}.`;
	}
	for (const field of ['itemSku', 'orderNumber', 'trackingNumber', 'ifNumber', 'returnType', 'reason']) {
		if (text(input[field]).length > 255) fields[field] = 'Keep this value under 255 characters.';
	}
	if (input.installed && !['yes', 'no'].includes(text(input.installed).toLowerCase())) fields.installed = 'Choose Yes or No.';
	if (!validUrl(text(input.evidenceUrl))) fields.evidenceUrl = 'Enter a valid evidence link.';
	if (Object.keys(input).some((key) => !allowed.has(key))) fields.form = 'The request contains unsupported fields.';
	if (Object.keys(fields).length) throw new ValidationError(fields);

	const detailLines = [details];
	const detailLabels = {
		returnType: 'Return type', reason: 'Reason', trackingNumber: 'Tracking number',
		ifNumber: 'IF number', evidenceUrl: 'Evidence'
	};
	for (const [field, label] of Object.entries(detailLabels)) {
		if (text(input[field])) detailLines.push(`${label}: ${text(input[field])}`);
	}

	const columnValues = {
		label1: { index: definition.inquiryIndex },
		email: { email, text: email },
		phone: { phone, countryShortName: 'US' },
		long_text8: detailLines.join('\n\n'),
		date85: { date: now.toISOString().slice(0, 10) }
	};
	if (text(input.orderNumber)) columnValues.long_textcd308p4p = text(input.orderNumber);
	if (text(input.itemSku)) columnValues.long_text_mm0btcjw = text(input.itemSku);
	if (text(input.installed)) columnValues.color_mm0dprrg = { index: text(input.installed).toLowerCase() === 'yes' ? 105 : 3 };

	return { boardId: BOARD_ID, groupId: GROUP_ID, itemName: name, columnValues };
}

module.exports = { BOARD_ID, FORM_DEFINITIONS, GROUP_ID, ValidationError, parseHelpSubmission };
