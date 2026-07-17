'use strict';

require('dotenv').config();

const http = require('node:http');
const { createApp } = require('./app');
const { createMondayClient } = require('./monday-client');

const DEFAULT_ORIGINS = [
	'https://sinisterdiesel.com',
	'https://www.sinisterdiesel.com'
];

function parseAllowedOrigins(value) {
	if (!value || !value.trim()) return [...DEFAULT_ORIGINS];
	return value.split(',').map((origin) => origin.trim()).filter(Boolean);
}

function buildServer(env = process.env, { fetchImpl = globalThis.fetch, logger = console } = {}) {
	const dryRun = env.DRY_RUN === 'true';
	const monday = dryRun ? null : createMondayClient({
		token: env.MONDAY_API_TOKEN,
		fetchImpl
	});
	return http.createServer(createApp({
		createMondayItem: dryRun ? async () => ({ id: 'dry-run' }) : (item) => monday.createItem(item),
		allowedOrigins: parseAllowedOrigins(env.ALLOWED_ORIGINS),
		logger
	}));
}

if (require.main === module) {
	const port = Number.parseInt(process.env.PORT || '8080', 10);
	const server = buildServer();
	server.listen(port, '0.0.0.0', () => {
		console.log(`forms-sync listening on port ${port}`);
	});
}

module.exports = {
	DEFAULT_ORIGINS,
	buildServer,
	parseAllowedOrigins
};
