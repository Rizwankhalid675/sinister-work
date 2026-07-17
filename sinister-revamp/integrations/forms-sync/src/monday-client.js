'use strict';

const MONDAY_API_URL = 'https://api.monday.com/v2';
const CREATE_ITEM_MUTATION = `
	mutation CreateHelpRequest(
		$boardId: ID!
		$groupId: String!
		$itemName: String!
		$columnValues: JSON!
	) {
		create_item(
			board_id: $boardId
			group_id: $groupId
			item_name: $itemName
			column_values: $columnValues
		) {
			id
		}
	}
`;

class MondayProviderError extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = 'MondayProviderError';
	}
}

function createMondayClient({ token, fetchImpl = globalThis.fetch }) {
	if (!token || !token.trim()) throw new Error('MONDAY_API_TOKEN is required.');
	if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required.');

	return {
		async createItem(item) {
			let response;
			try {
				response = await fetchImpl(MONDAY_API_URL, {
					method: 'POST',
					headers: {
						authorization: token,
						'content-type': 'application/json'
					},
					body: JSON.stringify({
						query: CREATE_ITEM_MUTATION,
						variables: {
							boardId: item.boardId,
							groupId: item.groupId,
							itemName: item.itemName,
							columnValues: JSON.stringify(item.columnValues)
						}
					})
				});
			} catch (error) {
				throw new MondayProviderError('The Monday API request failed.', { cause: error });
			}

			if (!response.ok) {
				throw new MondayProviderError(`The Monday API returned HTTP ${response.status}.`);
			}

			let body;
			try {
				body = await response.json();
			} catch (error) {
				throw new MondayProviderError('The Monday API returned invalid JSON.', { cause: error });
			}

			if (body.errors?.length || !body.data?.create_item?.id) {
				throw new MondayProviderError('The Monday API rejected the item mutation.');
			}

			return { id: body.data.create_item.id };
		}
	};
}

module.exports = {
	CREATE_ITEM_MUTATION,
	MONDAY_API_URL,
	MondayProviderError,
	createMondayClient
};

