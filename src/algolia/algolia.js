/* eslint-disable no-alert, no-console */
import algoliasearch from 'algoliasearch'

// export `createAlgoliaClient` to use it in page components
export class AlgoliaClient {
  constructor(algoliaId, algoliaKey, PENNSIEVE_API_LOCATION = 'https://api.pennsieve.io') {
    this.client = algoliasearch(
      algoliaId,
      algoliaKey
    )
    this.PENNSIEVE_API_LOCATION = PENNSIEVE_API_LOCATION
    this.anatomyFacetLabels = []
  }
  initIndex(ALGOLIA_INDEX) {
    this.index = this.client.initIndex(ALGOLIA_INDEX);
  }

  getAlgoliaFacets(propPathMapping) {
    const facetPropPaths = propPathMapping.map(facet => facet.facetPropPath)
    const facetSubpropPaths = propPathMapping.map(item => item.facetSubpropPath)
    let facetData = []
    let facetId = 0
    return this.index
      .search('', {
        sortFacetValuesBy: 'alpha',
        facets: facetPropPaths.concat(facetSubpropPaths),
      })
      .then(response => {
        facetPropPaths.map((facetPropPath) => {
          const parentFacet = propPathMapping.find(item => item.facetPropPath == facetPropPath)
          var children = []
          const responseFacets = response.facets
          if (responseFacets === undefined) {return}
          const responseFacetChildren =
            responseFacets[facetPropPath] == undefined // if no facets, return empty object
              ? {}
              : responseFacets[facetPropPath]
          const allPossibleChildrenSubfacets = parentFacet && responseFacets[parentFacet.facetSubpropPath] ? Object.keys(responseFacets[parentFacet.facetSubpropPath]) : []
          // Loop through all subfacets and find the ones that are children of the current facet
          Object.keys(responseFacetChildren).map(facet => {
            const childrenSubfacets = allPossibleChildrenSubfacets.reduce((filtered, childFacetInfo) => {
              const info = childFacetInfo.split('.');
              if (info.length !== 2) {
                return filtered;
              }
              if (facet === info[0]) {
                filtered.push({
                  label: info[1],
                  id: facetId++,
                  facetPropPath: `${parentFacet ? parentFacet.facetSubpropPath : undefined}`
                });
              }
              return filtered;
            }, []); // Provide an empty array as the initial value
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
        dataSource: 'SPARC',
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
    let foundKeyWords = []
    let foundLabels = []
    let uniqueLabels = []
    let uniqueKeywords = []
    hits.forEach(hit => {
      if (hit.item && hit.item.keywords) {
        hit.item.keywords.forEach(keywordObj => {
          let keyword = keywordObj.keyword.toUpperCase()
          if (keyword.includes('UBERON') || keyword.includes('ILX')) {
            foundKeyWords.push(this._processUberonURL(keyword))
          }
        })
      }
      if (hit.anatomy && hit.anatomy.organ ) {
        hit.anatomy.organ.forEach(anatomy => {
          if (anatomy.curie) {
            foundKeyWords.push(anatomy.curie)
            foundLabels.push(anatomy.name)
          }
        })
      }
    })
    uniqueKeywords = [...new Set(foundKeyWords) ]
    uniqueLabels = [...new Set(foundLabels) ]
    this.anatomyFacetLabels = uniqueLabels
    return uniqueKeywords
  }

  _processUberonURL(url) {
    let ub = url.split('/').pop()
    return ub.replace('_', ':')
  }

  /**
   * Get Search results
   * This is using fetch from the Algolia API
   */
  search(filter, query = '', offset = 0, length = 8) {
    // If the length is 0, return an empty result
    if (length === 0) {
      return new Promise(resolve => {
        resolve({
          items: [],
          total: 0,
          discoverIds: [],
          dois: []
        })
      })
    } else {
      return new Promise(resolve => {
        this.index
          .search(query, {
            facets: ['*'],
            offset: offset,
            length: length,
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
          })
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
            'anatomy.organ.curie'
          ],
        })
        .then(response => {
          // Saving the line below incase we want to starty using keywords again
          // let anatomyAsUberons = this._processAnatomy(response.hits)

          resolve({
            forFlatmap: this.processResultsForFlatmap(response.hits),
            forScaffold: this.processResultsForScaffold(response.hits)
          })
        })
    })
  }
  processResultsForFlatmap(hits) {
    let curieForDatsets = hits.map(h=>({
      id: h.objectID,
      terms: h.anatomy? h.anatomy.organ.map(o=>o.curie) : []
    }))
    return curieForDatsets
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
