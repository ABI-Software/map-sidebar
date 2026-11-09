/**
 * Converts the rows of the cell precision competency queries (31 to 35)
 * into the card objects used by CellCard.vue and CellCardExplorer.vue.
 */

// TEMPORARY: the API does not provide the source publication or species of a cell yet.
// Cell labels end with a citation key, e.g. "DRG CGRP-zeta (Qi2024)", which is mapped here.
// Remove when the API returns the source publication and taxon for each cell.
const SOURCE_LOOKUP = {
  Bhuiyan2024: {
    uri: 'https://doi.org/10.1126/sciadv.adj9173',
    label: 'CSA paper',
    color: '#667eea',
    species: '', // species is part of each cell label
  },
  Bhuiyan2025: {
    uri: 'https://doi.org/10.1101/2025.11.05.686654',
    label: 'big DRG paper',
    color: '#f59e0b',
    species: 'human',
  },
  'Tavares-Ferreira2022': {
    uri: 'https://doi.org/10.1126/scitranslmed.abj8186',
    label: 'Tavares-Ferreira et al., 2022',
    color: '#22c55e',
    species: 'human',
  },
  Yu2024: {
    uri: 'https://doi.org/10.1038/s41593-024-01794-1',
    label: 'Yu et al., 2024',
    color: '#ef4444',
    species: 'human',
  },
  Krauter2025: {
    uri: 'https://doi.org/10.1038/s42003-025-08315-1',
    label: 'Krauter et al., 2025',
    color: '#8b5cf6',
    species: 'mouse',
  },
  Qi2024: {
    uri: 'https://doi.org/10.1016/j.cell.2024.02.006',
    label: 'Qi et al., 2024',
    color: '#06b6d4',
    species: 'mouse',
  },
  Kupari2021: {
    uri: 'https://doi.org/10.1038/s41467-021-21725-z',
    label: 'Kupari et al., 2021',
    color: '#ec4899',
    species: 'macaque',
  },
};

// TEMPORARY: species names looked for in cell labels (longest first).
const SPECIES_IN_LABELS = ['guinea pig', 'macaque', 'mouse', 'human', 'rat', 'pig'];

const DEFAULT_SOURCE_COLOR = '#8300bf';

const ATTRIBUTE_TYPES = {
  GENE: 'ilxtr:hasNucleicAcidExpressionPhenotype',
  EXPRESSION: 'ilxtr:hasExpressionPhenotype',
  AXON: 'ilxtr:hasAxonPhenotype',
  SENSORY_STRUCTURE: 'ilxtr:hasAxonSensorySubcellularStructure',
  THRESHOLD: 'ilxtr:hasThresholdPhenotype',
  ADAPTATION: 'ilxtr:hasAdaptationPhenotype',
  FUNCTIONAL: 'ilxtr:hasFunctionalPhenotype',
  NEUROTRANSMITTER: 'ilxtr:hasNeurotransmitterPhenotype',
  CIRCUIT: 'ilxtr:isMemberOfCircuit',
  DRIVER: 'ilxtr:hasDriverExpressionConstitutivePhenotype',
};

const LOCATION_TYPES = {
  SOMA: 'ilxtr:hasSomaLocatedIn',
  SENSORY_TERMINAL: 'ilxtr:hasAxonSensorySubcellularElementIn',
  PRESYNAPTIC_TERMINAL: 'ilxtr:hasAxonPresynapticElementIn',
};

const EXPRESSION_LEVELS = {
  'ilxtr:HigherExpression': 'high',
  'ilxtr:LowerExpression': 'low',
};

const PHYSIOLOGY_TYPES = [
  ATTRIBUTE_TYPES.THRESHOLD,
  ATTRIBUTE_TYPES.ADAPTATION,
  ATTRIBUTE_TYPES.FUNCTIONAL,
];

const isMissingValue = (id) => String(id || '').startsWith('TEMP:MISSING');

const unique = (items) => [...new Set(items.filter(Boolean))];

/**
 * Split "DRG Pvalb mouse (Bhuiyan2024)" into
 * { name: 'DRG Pvalb mouse', citationKey: 'Bhuiyan2024', species: 'mouse', className: 'DRG Pvalb' }
 */
function parseCellLabel(label) {
  const text = String(label || '')
    .replace(/\s+/g, ' ')
    .trim();
  const match = text.match(/^(.*?)\s*\(([^()]*)\)$/);
  const name = match ? match[1].trim() : text;
  const citationKey = match ? match[2].trim() : '';

  const species =
    SPECIES_IN_LABELS.find((item) => new RegExp(`\\b${item}\\b`, 'i').test(name)) || '';
  const className = species
    ? name
        .replace(new RegExp(`\\s*\\b${species}\\b`, 'i'), '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

  return { name, citationKey, species: species.toLowerCase(), className };
}

/**
 * Alerts come back as a Postgres array literal, e.g. '{"note one","note two"}'.
 */
function parseAlert(alert) {
  if (!alert) return [];
  if (Array.isArray(alert)) return alert.filter(Boolean);

  const text = String(alert).trim();
  if (text.startsWith('{') && text.endsWith('}')) {
    const inner = text.slice(1, -1);
    const notes = [];
    const pattern = /"((?:[^"\\]|\\.)*)"|([^,]+)/g;
    let match;
    while ((match = pattern.exec(inner)) !== null) {
      const note = (match[1] !== undefined ? match[1].replace(/\\(.)/g, '$1') : match[2]).trim();
      if (note) notes.push(note);
    }
    return notes;
  }

  return [text];
}

function removePhenotypeSuffix(label) {
  return String(label || '')
    .replace(/\s+phenotype$/i, '')
    .trim();
}

function getGeneUri(featureId) {
  const id = String(featureId || '');
  if (id.startsWith('NCBIGene:')) {
    return `https://www.ncbi.nlm.nih.gov/gene/${id.split(':')[1]}`;
  }
  return '';
}

/**
 * Gene expression rows are grouped by combination_id.
 * Expression levels (ilxtr:HigherExpression / ilxtr:LowerExpression) are rows in the same combination.
 */
function buildMarkerGenes(attributeRows) {
  const combinations = new Map();

  attributeRows
    .filter(
      (row) => row.type_id === ATTRIBUTE_TYPES.GENE || row.type_id === ATTRIBUTE_TYPES.EXPRESSION,
    )
    .forEach((row) => {
      const key = row.combination_id || row.feature_id;
      if (!combinations.has(key)) {
        combinations.set(key, { genes: [], expression: '' });
      }
      const combination = combinations.get(key);

      if (EXPRESSION_LEVELS[row.feature_id]) {
        combination.expression = EXPRESSION_LEVELS[row.feature_id];
      } else if (!isMissingValue(row.feature_id)) {
        combination.genes.push(row);
      }
    });

  const markerGenes = [];
  const seen = new Set();

  combinations.forEach(({ genes, expression }) => {
    genes.forEach((gene) => {
      const key = `${gene.feature_id}|${expression}`;
      if (seen.has(key)) return;
      seen.add(key);

      markerGenes.push({
        id: gene.feature_id,
        // Some genes have no label yet, so the label is the CURIE.
        name: String(gene.feature_label || gene.feature_id).trim(),
        uri: getGeneUri(gene.feature_id),
        expression,
      });
    });
  });

  return markerGenes;
}

function getAttributeLabels(attributeRows, typeIds, transform = (label) => label) {
  const types = Array.isArray(typeIds) ? typeIds : [typeIds];
  return unique(
    attributeRows
      .filter((row) => types.includes(row.type_id) && !isMissingValue(row.feature_id))
      .map((row) => transform(String(row.feature_label || row.feature_id).trim())),
  );
}

function getLocationTerms(locationRows, typeId) {
  const terms = new Map();
  locationRows
    .filter((row) => row.type_id === typeId && !isMissingValue(row.feature_id))
    .forEach((row) => {
      const curie = String(row.feature_id || '').trim();
      const label = String(row.feature_label || curie).trim();
      if (label && !terms.has(curie || label)) {
        terms.set(curie || label, { label, curie });
      }
    });
  return [...terms.values()];
}

function groupByCell(rows) {
  return rows.reduce((grouped, row) => {
    if (!grouped.has(row.cell_id)) grouped.set(row.cell_id, []);
    grouped.get(row.cell_id).push(row);
    return grouped;
  }, new Map());
}

function buildCellCard(property, attributeRows, locationRows) {
  const label = String(property.cell_label || property.cell_id).trim();
  const { name, citationKey, species: labelSpecies, className } = parseCellLabel(label);
  const source = SOURCE_LOOKUP[citationKey] || null;

  const markerGenes = buildMarkerGenes(attributeRows);
  const somaLocationTerms = getLocationTerms(locationRows, LOCATION_TYPES.SOMA);
  const sensoryTerminalTerms = getLocationTerms(locationRows, LOCATION_TYPES.SENSORY_TERMINAL);
  const presynapticTerminalTerms = getLocationTerms(
    locationRows,
    LOCATION_TYPES.PRESYNAPTIC_TERMINAL,
  );

  return {
    id: property.cell_id,
    cellId: property.cell_id,
    entity: label,
    preferredLabel: name || label,
    className,
    citationKey,
    species: labelSpecies || source?.species || '',
    biologicalSex: property.biological_sex || '',
    circuitRole: getAttributeLabels(attributeRows, ATTRIBUTE_TYPES.CIRCUIT).join(', '),
    neurotransmitter: getAttributeLabels(attributeRows, ATTRIBUTE_TYPES.NEUROTRANSMITTER).join(
      ', ',
    ),
    somaLocations: somaLocationTerms.map((term) => term.label),
    somaLocationTerms,
    sensoryTerminalLocations: sensoryTerminalTerms.map((term) => term.label),
    sensoryTerminalStructures: getAttributeLabels(attributeRows, ATTRIBUTE_TYPES.SENSORY_STRUCTURE),
    axonTerminalLocations: presynapticTerminalTerms.map((term) => term.label),
    markerGenes,
    geneBaseNames: unique(markerGenes.map((gene) => gene.name.toLowerCase())),
    geneExpressionString: markerGenes
      .map((gene) => (gene.expression ? `${gene.name}^${gene.expression}` : gene.name))
      .join(' + '),
    fiberTypeString: getAttributeLabels(attributeRows, ATTRIBUTE_TYPES.AXON).join(' + '),
    physiologyString: getAttributeLabels(
      attributeRows,
      PHYSIOLOGY_TYPES,
      removePhenotypeSuffix,
    ).join(' + '),
    // API returns ids only (e.g. JAX:021077), no names yet.
    creLine: getAttributeLabels(attributeRows, ATTRIBUTE_TYPES.DRIVER).join(', '),
    sourceNomenclature: source?.uri || '',
    sourceNomenclatureLabel: source?.label || citationKey,
    sourceColor: source?.color || DEFAULT_SOURCE_COLOR,
    alertNotes: parseAlert(property.alert),
    // Not available from the API yet.
    curatorNotes: [],
    sourceData: [],
    relatedCells: [],
  };
}

/**
 * Link species variants of the same cell class, e.g.
 * "DRG Pvalb mouse (Bhuiyan2024)" <-> "DRG Pvalb human (Bhuiyan2024)".
 * TEMPORARY: derived from labels until the API returns the parent class of each cell.
 */
function linkRelatedCells(cards, classLabels) {
  const families = new Map();

  cards.forEach((card) => {
    if (!card.className || !card.species) return;
    const familyKey = `${card.className} (${card.citationKey})`.toLowerCase();
    // Only group when a matching class exists in query 31.
    if (!classLabels.has(familyKey)) return;
    if (!families.has(familyKey)) families.set(familyKey, []);
    families.get(familyKey).push(card);
  });

  families.forEach((members) => {
    members.forEach((card) => {
      card.relatedCells = members
        .filter((member) => member.id !== card.id)
        .map((member) => ({
          id: member.id,
          label: member.preferredLabel,
          species: member.species,
        }));
    });
  });
}

/**
 * @param {Object} data rows of queries 31 (classes), 32 (leaves), 33 (properties),
 *                      34 (attributes) and 35 (locations)
 * @returns {Array<Object>} cell cards for leaf cells (individual cell precisions)
 */
function buildCellCards({
  classes = [],
  leaves = [],
  properties = [],
  attributes = [],
  locations = [],
}) {
  const classIds = new Set(classes.map((row) => row.cell_id));
  const leafIds = new Set(leaves.map((row) => row.cell_id));
  const attributesByCell = groupByCell(attributes);
  const locationsByCell = groupByCell(locations);

  const classLabels = new Set(
    properties
      .filter((row) => classIds.has(row.cell_id))
      .map((row) =>
        String(row.cell_label || '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase(),
      ),
  );

  const seen = new Set();
  const cards = properties
    .filter((row) => {
      if (!row.cell_id || seen.has(row.cell_id)) return false;
      seen.add(row.cell_id);
      // Cards are individual cells; fall back to "not a class" if query 32 returned nothing.
      return leafIds.size ? leafIds.has(row.cell_id) : !classIds.has(row.cell_id);
    })
    .map((row) =>
      buildCellCard(
        row,
        attributesByCell.get(row.cell_id) || [],
        locationsByCell.get(row.cell_id) || [],
      ),
    );

  linkRelatedCells(cards, classLabels);

  return cards.sort((a, b) =>
    a.entity.localeCompare(b.entity, undefined, { sensitivity: 'base', numeric: true }),
  );
}

export { buildCellCards, parseCellLabel, parseAlert, SOURCE_LOOKUP };
