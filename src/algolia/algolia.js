/* eslint-disable no-alert, no-console */
import algoliasearch from 'algoliasearch'

// export `createAlgoliaClient` to use it in page components
export class AlgoliaClient {
  constructor(algoliaId, algoliaKey, PENNSIEVE_API_LOCATION='https://api.pennsieve.io') {
    this.client = algoliasearch(
      algoliaId,
      algoliaKey
    )
    this.PENNSIEVE_API_LOCATION = PENNSIEVE_API_LOCATION
  }
  initIndex(ALGOLIA_INDEX) {
    this.index = this.client.initIndex(ALGOLIA_INDEX);
  }

  getAlgoliaFacets (propPathMapping) {
    const map = new Map(Object.entries(propPathMapping));
    const facetPropPaths = Array.from(map.keys() );
    let facetData = []
    let facetId = 0
    return this.index
      .search('', {
        sortFacetValuesBy: 'alpha',
        facets: facetPropPaths
      })
      .then(response => {
        facetPropPaths.map((facetPropPath) => {
          var children = []
          const responseFacets = response.facets
          if (responseFacets === undefined) {return}
          const responseFacetChildren =
            responseFacets[facetPropPath] == undefined
              ? {}
              : responseFacets[facetPropPath]
          Object.keys(responseFacetChildren).map(facet => {
            children.push({
              label: facet,
              id: facetId++,
              facetPropPath: facetPropPath
            })
          })
          if (children.length > 0) {
            facetData.push({
              label: map.get(facetPropPath),
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
  _discoverAllDois (discoverId, PENNSIEVE_API_LOCATION='https://api.pennsieve.io') {
    return new Promise(resolve => {
      fetch(`${PENNSIEVE_API_LOCATION}/discover/datasets/${discoverId}/versions`).then(r=>r.json()).then(dataset => {
        resolve(dataset.map(version => version.doi))
      })
    })
  }
  
  // Get all dois given a list of discoverIds
  _expandDois (discoverIds, PENNSIEVE_API_LOCATION='https://api.pennsieve.io') {
    return new Promise(resolve => {
      let promiseList = discoverIds.map(discoverId => this._discoverAllDois(discoverId, PENNSIEVE_API_LOCATION))
      Promise.all(promiseList).then((values) => {
        resolve(values.flat())
      });
    })
  }
  
  /**
   * Get Search results
   * This is using fetch from the Algolia API
   */
  search (filter, query='', hitsperPage=10, page=1) {
    return new Promise(resolve => {
      this.index
      .search(query, {
        facets:['*'],
        hitsPerPage: hitsperPage,
        page: page-1,
        filters: filter
      })
      .then(response => {
        let searchData = {
          items: response.hits,
          total: response.nbHits,
          discoverIds: response.hits.map(r=>r.pennsieve.identifier),
          dois: response.hits.map(r=>r.item.curie.split(':')[1])
        }
        resolve(searchData)
      })
    })
  }
}
