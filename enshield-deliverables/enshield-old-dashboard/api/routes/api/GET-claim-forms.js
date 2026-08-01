// List claim intake forms for the caller's accessible shop(s)/client(s).
import { PERMISSIONS } from "../../lib/permissions.js";
import { requireInternalAccess, shopIdFilter } from "../../lib/internalAccess.js";
import { pageInfoFor, parsePageSize, parseSearch } from "../../lib/listQuery.js";

const route = async ({ reply, api, logger, session, query = {} }) => {
  try {
    const access = await requireInternalAccess({ api, session }, PERMISSIONS.VIEW_CLIENTS, query.shopId);
    const clauses = [shopIdFilter(access.shopIds, access.includesLegacy)];
    const search = parseSearch(query.search);
    if (search) clauses.push({ name: { contains: search } });
    if (query.clientId) clauses.push({ client: { id: { equals: String(query.clientId) } } });
    if (query.status) clauses.push({ status: { equals: query.status } });

    const records = await api.claimForm.findMany({
      filter: clauses.length === 1 ? clauses[0] : { AND: clauses },
      first: parsePageSize(query.first),
      after: query.after || undefined,
      sort: { createdAt: "Descending" },
      select: {
        id: true,
        name: true,
        publicSlug: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        client: { id: true, storeName: true },
      },
    });
    await reply.send({ success: true, forms: [...records], pageInfo: pageInfoFor(records) });
  } catch (error) {
    logger.error({ errorName: error?.name, statusCode: error?.statusCode }, "Error listing claim forms");
    const statusCode = [400, 401, 403].includes(error?.statusCode) ? error.statusCode : 500;
    await reply
      .code(statusCode)
      .send({ success: false, error: statusCode === 500 ? "Internal server error while listing claim forms" : error.message });
  }
};
export default route;
