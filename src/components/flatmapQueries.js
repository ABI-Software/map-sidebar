/**
 * Temporary: flatmapQueries from flatmapVuer
**/
const cachedTaxonLabels = [];
let uberons = [];

const query = async function (flatmapApi, sql, params) {
  const url = `${flatmapApi}knowledge/query/`;
  const query = { sql, params };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Accept": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      throw new Error(`Cannot access ${url}`);
    }
    return await response.json();
  } catch {
    return {
      values: []
    };
  }
}

const removeDuplicates = function (arrayOfAnything) {
  if (!arrayOfAnything) return []
  return [...new Set(arrayOfAnything.map((e) => JSON.stringify(e)))].map((e) =>
    JSON.parse(e)
  )
}

const queryLabels = async function (flatmapApi, knowledgeSource, entities) {
  const entityLabels = []
  const entityArray = Array.isArray(entities) ? entities
                    : entities ? [entities]
                    : []
  if (entityArray.length > 0) {
    const rows = await query(
      flatmapApi,
      `select source, entity, knowledge from knowledge
        where (source=? or source is null)
        and entity in (?${', ?'.repeat(entityArray.length-1)})
        order by entity, source desc`,
      [knowledgeSource, ...entityArray]
    )
    let last_entity = null
    for (const row of rows.values) {
        // In entity, source[desc] order; we use the most recent label
        if (row[1] !== last_entity) {
            const knowledge = JSON.parse(row[2])
            entityLabels.push({
                entity: row[1],
                label: knowledge['label'] || row[1]
            })
            last_entity = row[1]
        }
    }
  }
  return entityLabels
}

const inArray = function (ar1, ar2) {
  if (!ar1 || !ar2) return false
  let as1 = JSON.stringify(ar1)
  let as2 = JSON.stringify(ar2)
  return as1.indexOf(as2) !== -1
}

const findComponents = function (connectivity) {
  let dnodes = connectivity.connectivity.flat() // get nodes from edgelist
  let nodes = removeDuplicates(dnodes)

  let found = []
  let terminal = false
  nodes.forEach((node) => {
    terminal = false
    // Check if the node is an destination or origin (note that they are labelled dendrite and axon as opposed to origin and destination)
    if (inArray(connectivity.axons, node)) {
      terminal = true
    }
    if (connectivity.somas && inArray(connectivity.somas, node)) {
      terminal = true
    }
    if (inArray(connectivity.dendrites, node)) {
      terminal = true
    }
    if (!terminal) {
      found.push(node)
    }
  })

  return found
}

const findAllIdsFromConnectivity = function (connectivity) {
  let dnodes = connectivity.connectivity.flat() // get nodes from edgelist
  let nodes = [...new Set(dnodes)] // remove duplicates
  let found = []
  nodes.forEach((n) => {
    if (Array.isArray(n)) {
      found.push(n.flat())
    } else {
      found.push(n)
    }
  })
  return [...new Set(found.flat())]
}

const findTaxonomyLabels = async function (flatmapApi, knowledgeSource, taxonomies) {
  const intersectionTaxonomies = taxonomies.filter((taxonomy) =>
    cachedTaxonLabels.some((obj) => obj.taxon === taxonomy)
  );

  const foundCachedTaxonLabels = cachedTaxonLabels.filter((obj) =>
    intersectionTaxonomies.includes(obj.taxon)
  );

  const leftoverTaxonomies = taxonomies.filter((taxonomy) =>
    !intersectionTaxonomies.includes(taxonomy)
  );

  if (!leftoverTaxonomies.length) {
    return foundCachedTaxonLabels;
  } else {
    const entityLabels = await queryLabels(flatmapApi, knowledgeSource, leftoverTaxonomies);
    if (entityLabels.length) {
      entityLabels.forEach((entityLabel) => {
        let { entity: taxon, label } = entityLabel;
        if (label === 'Mammalia') {
          label = 'Mammalia not otherwise specified'
        }
        const item = { taxon, label };
        foundCachedTaxonLabels.push(item);
        cachedTaxonLabels.push(item);
      });
      return foundCachedTaxonLabels;
    }
  }
}

const createLabelLookup = function (flatmapApi, knowledgeSource, _uberons) {
  return new Promise(async (resolve) => {
    let uberonMap = {}
    uberons = []
    const entityLabels = await findTaxonomyLabels(flatmapApi, knowledgeSource, _uberons);
    if (entityLabels.length) {
      entityLabels.forEach((entityLabel) => {
        const { taxon: entity, label } = entityLabel;
        uberonMap[entity] = label;
        uberons.push({
          id: entity,
          name: label,
        })
      });
      resolve(uberonMap)
    }
  })
}

const findIfNodeIsSingle = function (node) {
  if (node.length === 1) { // If the node is in the form [id]
    console.error("Server returns a single node", node)
    return node[0]
  } else {
    if (node.length === 2 && node[1].length === 0) { // If the node is in the form [id, []]
      return node[0]
    } else {
      return false // If the node is in the form [id, [id1, id2]]
    }
  }
}

const createLabelFromNeuralNode = function (node, lookUp) {

  // Check if the node is a single node or a node with multiple children
  let nodeIsSingle = findIfNodeIsSingle(node)

  // Case where node is in the form [id]
  if (nodeIsSingle) {
    return lookUp[nodeIsSingle]
  }

  // Case where node is in the form [id, [id1 (,id2)]]
  let label = lookUp[node[0]]
  if (node.length === 2 && node[1].length > 0) {
    node[1].forEach((n) => {
      if (lookUp[n] == undefined) {
        label += `, ${n}`
      } else {
        label += `, ${lookUp[n]}`
      }
    })
  }
  return label
}

const flattenConntectivity = function (connectivity) {
  let dnodes = connectivity.flat() // get nodes from edgelist
  let nodes = [...new Set(dnodes)] // remove duplicates
  let found = []
  nodes.forEach((n) => {
    if (Array.isArray(n)) {
      found.push(n.flat())
    } else {
      found.push(n)
    }
  })
  return found.flat()
}

const flattenAndFindDatasets = function (components, axons, dendrites) {
  // process the nodes for finding datasets (Note this is not critical to the tooltip, only for the 'search on components' button)
  let componentsFlat = flattenConntectivity(components)
  let axonsFlat = flattenConntectivity(axons)
  let dendritesFlat = flattenConntectivity(dendrites)

  // Filter for the anatomy which is annotated on datasets
  const destinationsWithDatasets = uberons.filter(
    (ub) => axonsFlat.indexOf(ub.id) !== -1
  )
  const originsWithDatasets = uberons.filter(
    (ub) => dendritesFlat.indexOf(ub.id) !== -1
  )
  const componentsWithDatasets = uberons.filter(
    (ub) => componentsFlat.indexOf(ub.id) !== -1
  )

  return {
    destinationsWithDatasets,
    originsWithDatasets,
    componentsWithDatasets
  }
}

export const processConnectivity = async function (flatmapApi, knowledgeSource, connectivity) {
  return new Promise((resolve) => {
    // Filter the origin and destinations from components
    let components = findComponents(connectivity)

    // Remove duplicates
    let axons = removeDuplicates(connectivity.axons)
    //Somas will become part of origins, support this for future proof
    let dendrites = []
    if (connectivity.somas && connectivity.somas.length > 0) {
      dendrites.push(...connectivity.somas)
    }
    if (connectivity.dendrites && connectivity.dendrites.length > 0) {
      dendrites.push(...connectivity.dendrites)
    }
    dendrites = removeDuplicates(dendrites)

    // Create list of ids to get labels for
    let conIds = findAllIdsFromConnectivity(connectivity)

    // Create readable labels from the nodes. Setting this to 'this.origins' updates the display
    createLabelLookup(flatmapApi, knowledgeSource, conIds).then((lookUp) => {
      const _destinations = axons.map((a) =>
        createLabelFromNeuralNode(a, lookUp)
      )
      const _origins = dendrites.map((d) =>
        createLabelFromNeuralNode(d, lookUp)
      )
      const _components = components.map((c) =>
        createLabelFromNeuralNode(c, lookUp)
      )
      const withDatasets = flattenAndFindDatasets(components, axons, dendrites)
      const result = {
        ids: {
          axons: axons,
          dendrites: dendrites,
          components: components,
        },
        labels: {
          destinations: _destinations,
          origins: _origins,
          components: _components,
        },
        withDatasets
      }
      resolve(result);
    })
  })
}
