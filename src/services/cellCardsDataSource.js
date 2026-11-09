import { generateUUID } from '../utils/common.js';
import { fetchCellCards } from './cellPrecisionQueries.js';

/**
 * Cell cards can be loaded from:
 * - 'api':  the cell precision competency queries (31-37) on a flatmap server (default)
 * - 'json': the demo cell cards JSON file (DEFAULT_CELL_TYPES, DEFAULT_GENES, ...)
 *
 * The JSON source is kept for comparing the two data sets.
 */
const CELL_CARDS_DATA_SOURCES = {
  API: 'api',
  JSON: 'json',
};

const jsonCache = new Map();

function getCellCardsDataSource(envVars) {
  const source = String(envVars?.CELL_CARDS_DATA_SOURCE || '')
    .trim()
    .toLowerCase();
  return source === CELL_CARDS_DATA_SOURCES.JSON
    ? CELL_CARDS_DATA_SOURCES.JSON
    : CELL_CARDS_DATA_SOURCES.API;
}

function fetchCellCardsJson(url) {
  if (!jsonCache.has(url)) {
    const request = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .catch((error) => {
        // Do not cache failures, so the next load can retry.
        jsonCache.delete(url);
        throw error;
      });
    jsonCache.set(url, request);
  }
  return jsonCache.get(url);
}

/**
 * Load the cell cards from the selected data source.
 * @returns {Promise<{source: string, cellTypes: Array<Object>, genes: Array<Object>|null}>}
 *          `genes` is the JSON's DEFAULT_GENES list, or null for the API.
 */
async function loadCellCards(envVars) {
  const source = getCellCardsDataSource(envVars);

  if (source === CELL_CARDS_DATA_SOURCES.JSON) {
    const url = envVars?.CELL_CARDS_JSON_API;
    if (!url) {
      throw new Error('Cell cards JSON URL (CELL_CARDS_JSON_API) is not configured.');
    }

    const data = await fetchCellCardsJson(url);
    const cellTypes = (data?.DEFAULT_CELL_TYPES || []).map((cellType) => ({
      ...cellType,
      id: generateUUID(),
    }));
    return { source, cellTypes, genes: data?.DEFAULT_GENES || [] };
  }

  const endpoint = envVars?.CELL_CARDS_API;
  if (!endpoint) {
    throw new Error('Cell cards API (CELL_CARDS_API) is not configured.');
  }

  const cellTypes = await fetchCellCards(endpoint, envVars?.CELL_CARDS_SOURCE_ID);
  return { source, cellTypes, genes: null };
}

export { CELL_CARDS_DATA_SOURCES, getCellCardsDataSource, loadCellCards };
