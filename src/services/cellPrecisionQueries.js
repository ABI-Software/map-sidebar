import { buildCellCards } from '../utils/cellPrecision.js';

/**
 * Cell precision competency queries (31 to 37).
 * See the flatmap server's "Cell Precision Competency Queries" documentation.
 *
 * All queries are POST {endpoint}/competency/query with
 * { query_id, parameters: [{ column, value }] }
 * and return { query_id, results: { keys: [...], values: [[...], ...] } }.
 */

const CELL_CLASSES_QUERY = 31;
const CELL_LEAVES_QUERY = 32;
const CELL_PROPERTIES_QUERY = 33;
const CELL_ATTRIBUTES_QUERY = 34;
const CELL_LOCATIONS_QUERY = 35;
const CELL_PATHS_QUERY = 37;

const cellCardsCache = new Map();

function getQueryUrl(endpoint) {
  const base = String(endpoint || '').trim();
  if (!base) return '';
  return `${base.replace(/\/+$/, '')}/competency/query`;
}

/**
 * Run a cell precision competency query.
 * `source_id` is left out when `sourceId` is empty, so the server uses the latest SCKAN release.
 * @returns {Promise<Array<Object>>} rows as objects keyed by column name
 */
async function queryCellPrecision(endpoint, sourceId, queryId, parameters = []) {
  const url = getQueryUrl(endpoint);
  if (!url) {
    throw new Error('Cell precision API endpoint is not configured.');
  }

  const params = [...parameters];
  if (sourceId) {
    params.push({ column: 'source_id', value: sourceId });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_id: String(queryId), parameters: params }),
  });

  if (!response.ok) {
    throw new Error(`Cell precision query ${queryId} failed: ${response.status}`);
  }

  const data = await response.json();
  const keys = data?.results?.keys || [];
  const values = data?.results?.values || [];
  return values.map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index]])));
}

/**
 * Fetch every cell precision (for the map or SCKAN release given by `sourceId`)
 * and convert them to the card objects used by CellCard.vue.
 * Results are cached per endpoint and source.
 */
function fetchCellCards(endpoint, sourceId) {
  const cacheKey = `${endpoint}|${sourceId || ''}`;

  if (!cellCardsCache.has(cacheKey)) {
    const request = Promise.all([
      queryCellPrecision(endpoint, sourceId, CELL_CLASSES_QUERY),
      queryCellPrecision(endpoint, sourceId, CELL_LEAVES_QUERY),
      queryCellPrecision(endpoint, sourceId, CELL_PROPERTIES_QUERY),
      queryCellPrecision(endpoint, sourceId, CELL_ATTRIBUTES_QUERY),
      queryCellPrecision(endpoint, sourceId, CELL_LOCATIONS_QUERY),
    ])
      .then(([classes, leaves, properties, attributes, locations]) => {
        return buildCellCards({ classes, leaves, properties, attributes, locations });
      })
      .catch((error) => {
        // Do not cache failures, so the next mount can retry.
        cellCardsCache.delete(cacheKey);
        throw error;
      });

    cellCardsCache.set(cacheKey, request);
  }

  return cellCardsCache.get(cacheKey);
}

/**
 * Neuron populations (path ids) that share at least one node with a cell precision (query 37).
 * @returns {Promise<{pathIds: string[], nodeIds: string[]}>}
 */
async function fetchCellPaths(endpoint, sourceId, cellId) {
  const cellIds = Array.isArray(cellId) ? cellId : [cellId];
  const rows = await queryCellPrecision(endpoint, sourceId, CELL_PATHS_QUERY, [
    { column: 'cell_id', value: cellIds },
  ]);

  return {
    pathIds: [...new Set(rows.map((row) => row.path_id).filter(Boolean))],
    nodeIds: [...new Set(rows.map((row) => row.node_id).filter(Boolean))],
  };
}

export { queryCellPrecision, fetchCellCards, fetchCellPaths };
