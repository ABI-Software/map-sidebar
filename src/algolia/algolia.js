/* eslint-disable no-alert, no-console */
import algoliasearch from 'algoliasearch'

const getFacetsChildrenMap = (childFacets, numberOfLayers) => {
  const mapping = {}
  childFacets.forEach((facet) => {
    const info = facet.split('.');
    if (info.length !== numberOfLayers) {
      return;
    }
    const pathName = facet.substring(0, facet.lastIndexOf('.'));
    const name = info[info.length - 1];
    if (Object.keys(mapping).includes(pathName)) {
      mapping[pathName].push(name);
    } else {
      mapping[pathName] = [name];
    }
  });
  return mapping;
}

// export `createAlgoliaClient` to use it in page components
export class AlgoliaClient {
  constructor(algoliaId, algoliaKey, PENNSIEVE_API_LOCATION = 'https://api.pennsieve.io') {
    this.client = algoliasearch(
      algoliaId,
      algoliaKey
    )
    this.PENNSIEVE_API_LOCATION = PENNSIEVE_API_LOCATION
  }
  initIndex(ALGOLIA_INDEX) {
    this.index = this.client.initIndex(ALGOLIA_INDEX);
  }

  getAlgoliaFacets(propPathMapping) {
    const facetPropPaths = propPathMapping.map(facet => facet.facetPropPath)
    const facetSubpropPaths = propPathMapping.map(item => item.facetSubpropPath)
    const facetSubsubpropPaths = propPathMapping.map(
      item => item.facetSubsubpropPath).filter(
        i => i !== undefined
      )
    return this.index
      .search('', {
        sortFacetValuesBy: 'alpha',
        facets: facetPropPaths.concat(facetSubpropPaths).concat(facetSubsubpropPaths),
      })
      .then(response => {
        let facetData = []
        let facetId = 0
        facetPropPaths.map((facetPropPath) => {
          const parentFacet = propPathMapping.find(item => item.facetPropPath == facetPropPath)
          var children = []
          const responseFacets = response.facets
          if (responseFacets === undefined) {return}
          const responseFacetChildren =
            responseFacets[facetPropPath] == undefined // if no facets, return empty object
              ? {}
              : responseFacets[facetPropPath]
          const allSubfacets = parentFacet && responseFacets[parentFacet.facetSubpropPath] ? Object.keys(responseFacets[parentFacet.facetSubpropPath]) : []
          const allSubsubfacets = (parentFacet && parentFacet.facetSubsubpropPath &&
            responseFacets[parentFacet.facetSubsubpropPath]) ?
            Object.keys(responseFacets[parentFacet.facetSubsubpropPath]) : []
          const subFacetsMap = getFacetsChildrenMap(allSubfacets, 2);
          const subSubFacetsMap = getFacetsChildrenMap(allSubsubfacets, 3);
          // Loop through all subfacets and find the ones that are children of the current facet
          Object.keys(responseFacetChildren).map(facet => {
            const childrenSubfacets = [];
            if (Object.keys(subFacetsMap).includes(facet)) {
              subFacetsMap[facet].forEach((label) => {
                const fullPath = `${facet}.${label}`
                const childrenSubsubfacets = []
                if (Object.keys(subSubFacetsMap).includes(fullPath)) {
                  subSubFacetsMap[fullPath].forEach((childLabel) => {
                    childrenSubsubfacets.push(
                      {
                        label: childLabel,
                        id: facetId++,
                        facetPropPath: `${parentFacet ? parentFacet.facetSubsubpropPath : undefined}`
                      }
                    )
                  });
                  //REMOVE ME LATER: This is a hack to add an extra item for subsubcategory
                  if (fullPath === "nerves and ganglia.dorsal root ganglion") {
                    childrenSubsubfacets.push(
                      {
                        label: "Non specific",
                        id: facetId++,
                        facetPropPath: `${parentFacet ? parentFacet.facetSubsubpropPath : undefined}`
                      }
                    )
                  }
                }
                childrenSubfacets.push(
                  {
                    label,
                    id: facetId++,
                    facetPropPath: `${parentFacet ? parentFacet.facetSubpropPath : undefined}`,
                    children: childrenSubsubfacets.length ? childrenSubsubfacets : undefined,
                  }
                );
              })
            }
            let newChild = {
              label: facet,
              id: facetId++,
              facetPropPath: facetPropPath
            }
            if (childrenSubfacets.length > 0) {

              newChild.children = childrenSubfacets
            }
            children.push(newChild)
          })
          if (children.length > 0) {
            facetData.push({
              label: parentFacet ? parentFacet.label : '',
              id: facetId++,
              children: children,
              key: facetPropPath
            })
          }
        })
        return facetData
      })
  }

  // Returns all DOIs of all versions for a given discover dataset
  _discoverAllDois(discoverId, PENNSIEVE_API_LOCATION = 'https://api.pennsieve.io') {
    return new Promise(resolve => {
      fetch(`${PENNSIEVE_API_LOCATION}/discover/datasets/${discoverId}/versions`).then(r => r.json()).then(dataset => {
        resolve(dataset.map(version => version.doi))
      })
    })
  }

  // Get all dois given a list of discoverIds
  _expandDois(discoverIds, PENNSIEVE_API_LOCATION = 'https://api.pennsieve.io') {
    return new Promise(resolve => {
      let promiseList = discoverIds.map(discoverId => this._discoverAllDois(discoverId, PENNSIEVE_API_LOCATION))
      Promise.all(promiseList).then((values) => {
        resolve(values.flat())
      });
    })
  }

  _processResultsForCards(results) {
    let newResults = []
    let newResult = {}
    for (let res of results) {
      newResult = { ...res }
      newResult = {
        anatomy: res.anatomy ? res.anatomy.organ.map((organ => organ.curie)) : undefined,
        doi: res.item.curie.split(':')[1],
        name: res.item.name,
        description: res.item.description,
        updated: res.pennsieve ? res.pennsieve.updatedAt : undefined,
        publishDate: res.pennsieve ? res.pennsieve.publishDate : undefined,
        datasetId: res.objectID,
        detailsReady: false
      }
      newResults.push(newResult)
    }
    return newResults
  }

  _processAnatomy(hits) {
    const anatomyUberonMapping = {}
    hits.forEach(hit => {
      if (hit.anatomy && hit.anatomy.organ ) {
        hit.anatomy.organ.forEach(anatomy => {
          if (anatomy.curie) {
            anatomyUberonMapping[anatomy.curie] = anatomy.name;
          }
        })
      }
      localStorage.setItem('available-name-curie-mapping', JSON.stringify(anatomyUberonMapping))
    })
  }

  _processUberonURL(url) {
    let ub = url.split('/').pop()
    return ub.replace('_', ':')
  }

  /**
   * Get Search results
   * This is using fetch from the Algolia API
   */
  search(filter, query = '', hitsperPage = 10, page = 1) {
    const terms = query.replaceAll('"', '').split(",")
    let processed = "";
    const optionalWords = [];
    if (terms) {
      if (terms.length === 1 && (!(query.includes(" ")))) {
        processed = query;
      } else {
        terms.forEach(term => {
          optionalWords.push(term.trim())
          processed += `"${term.trim()}" `;
        });
      }
    }
    processed = processed.trim()

    const payload = {
      advancedSyntax: true,
      advancedSyntaxFeatures: ['exactPhrase'],
      queryType: 'prefixAll',
      facets: ['*'],
      hitsPerPage: hitsperPage,
      page: page - 1,
      filters: filter,
      attributesToHighlight: [],
      attributesToRetrieve: [
        'pennsieve.publishDate',
        'pennsieve.updatedAt',
        'item.curie',
        'item.name',
        'item.description',
        'objectID',
        'anatomy.organ.curie'
      ],
    }
    if (optionalWords.length > 1) {
      payload.optionalWords = optionalWords
    }

    return new Promise(resolve => {
      this.index
        .search(processed, payload)
        .then(response => {
          let searchData = {
            items: this._processResultsForCards(response.hits),
            total: response.nbHits,
            discoverIds: response.hits.map(r => r.pennsieve ? r.pennsieve.identifier : r.objectID),
            dois: response.hits.map(r => r.item.curie.split(':')[1])
          }
          resolve(searchData)
        })
    })
  }

  /**
 * Get key words
 * This is used to return all keywords for a given search. Note that you often want the hits per page to be maxed out
 */
  anatomyInSearch(filter, query = '', hitsperPage = 999999, page = 1) {
    return new Promise(resolve => {
      this.index
        .search(query, {
          facets: ['*'],
          hitsPerPage: hitsperPage,
          page: page - 1,
          filters: filter,
          attributesToHighlight: [],
          attributesToRetrieve: [
            'objectID',
            'item.keywords.keyword',
            'anatomy.organ.name',
            'anatomy.organ.curie',
            'anatomy.organ.subsubcategory.name'
          ],
        })
        .then(response => {
          // Saving the line below incase we want to starty using keywords again
          resolve({
            forFlatmap: this.processResultsForFlatmap(response.facets ,response.hits),
            forScaffold: this.processResultsForScaffold(response.hits)
          })
        })
    })
  }

  setLocalStorageForTermMapping() {
    return new Promise(resolve => {
      this.index
        .search('', {
          facets: ['*'],
          hitsPerPage: 999999,
          page: 0,
          attributesToHighlight: [],
          attributesToRetrieve: [
            'objectID',
            'item.keywords.keyword',
            'anatomy.organ.name',
            'anatomy.organ.curie'
          ],
        })
        .then(response => {
          // Saving the line below incase we want to starty using keywords again
          this._processAnatomy(response.hits)
        })
    })
  }

  processResultsForFlatmap(facets, hits) {
    const filteredOrganNames = this.filterAvailableAnatomies(facets);

    let curieForDatasets = hits.map(h=>{
      const data = {
        id: h.objectID,
        terms: h.anatomy
          ? h.anatomy.organ.map(o => {
              if (filteredOrganNames.includes(o.name.toLowerCase())) {
                return o.curie
              }
            }).filter(Boolean)
          : []
      }
      return data
    })

    return curieForDatasets
  }
  filterAvailableAnatomies(facets) {
    const anatomyOrganName = facets['anatomy.organ.name']
    const anatomyOrganCategoryName = facets['anatomy.organ.category.name']
    const anatomyOrganSubcategoryName = facets['anatomy.organ.subcategory.name']
    const anatomyOrganSubsubcategoryName = facets['anatomy.organ.subsubcategory.name']
    const anatomyOrganNames = anatomyOrganName ? Object.keys(anatomyOrganName) : []
    const anatomyOrganCategoryNames = anatomyOrganCategoryName ? Object.keys(anatomyOrganCategoryName) : []
    const anatomyOrganSubcategoryNames = anatomyOrganSubcategoryName ? Object.keys(anatomyOrganSubcategoryName) : []
    const anatomyOrganSubsubcategoryNames = anatomyOrganSubsubcategoryName ? Object.keys(anatomyOrganSubsubcategoryName) : []
    const filteredOrganNames = []

    anatomyOrganCategoryNames.forEach((_categoryName) => {
      const categoryName = _categoryName.toLowerCase();
      anatomyOrganNames.forEach((_organName) => {
        const organName = _organName.toLowerCase();
        //This will be incorrect for subsubcategory
        const fullName = `${categoryName}.${organName}`
        const found = anatomyOrganSubcategoryNames.some((_subcategoryName) => {
          const subcategoryName = _subcategoryName.toLowerCase();
          if (subcategoryName === fullName) {
            return true
          } else {
            return anatomyOrganSubsubcategoryNames.find((name) => {
              const fullsubsubname = `${subcategoryName}.${organName}`
              return (fullsubsubname === name)
            })
          }
        });

        if (found) {
          filteredOrganNames.push(organName);
        }
      })
    })
    return filteredOrganNames;
  }
  processResultsForScaffold(hits) {
    let numberOfDatasetsForAnatomy = {}
    hits.forEach(hit => {
      if (hit.anatomy && hit.anatomy.organ ) {
        hit.anatomy.organ.forEach(anatomy => {
          if (anatomy.name) {
            if (numberOfDatasetsForAnatomy[anatomy.name]) {
              numberOfDatasetsForAnatomy[anatomy.name]++
            } else {
              numberOfDatasetsForAnatomy[anatomy.name] = 1
            }
          }
        })
      }
    })
    return numberOfDatasetsForAnatomy
  }

}
