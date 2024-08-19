/* eslint-disable no-alert, no-console */

// Mapping between display categories and their Algolia index property path
// Used for populating the Dataset Search Results facet menu dynamically
export const facetPropPathMapping = [
  {
    label: 'Data Type',
    id: 'item.types',
    facetPropPath: 'item.types.name',
    facetSubpropPath: 'item.types.subcategory.name'
  },
  {
    label: 'Anatomical Structure',
    id: 'anatomy.organ.category',
    facetPropPath: 'anatomy.organ.category.name',
    facetSubpropPath: 'anatomy.organ.subcategory.name',
    facetFilterPath: 'anatomy.organ.name'
  },
  {
    label: 'Species',
    id: 'organisms.primary.species',
    facetPropPath: 'organisms.primary.species.name',
    facetSubpropPath: 'organisms.primary.species.subcategory.name'
  },
  {
    label: 'Experimental Approach',
    id: 'item.modalities',
    facetPropPath: 'item.modalities.keyword',
    facetSubpropPath: 'item.modalities.subcategory.name'
  },
  {
    label: 'Sex',
    id: 'attributes.subject.sex',
    facetPropPath: 'attributes.subject.sex.value',
    facetSubpropPath: 'attributes.subject.sex.subcategory.name'
  },
  {
    label: 'Age Categories',
    id: 'attributes.subject.ageCategory',
    facetPropPath: 'attributes.subject.ageCategory.value',
    facetSubpropPath: 'attributes.subject.ageCategory.subcategory.name'
  },
]

// Same as above, but these show on the sidebar filters
export const shownFilters = {
  'anatomy.organ.name' : 'Anatomical Structure',
  'organisms.primary.species.name' : 'Species',
  'attributes.subject.sex.value' : 'Sex',
  'attributes.subject.ageCategory.value' : 'Age Categories',
  'item.types.name' : 'Data type',
}

/* Returns filter for searching algolia. All facets of the same category are joined with OR,
  * and each of those results is then joined with an AND.
  * i.e. (color:blue OR color:red) AND (shape:circle OR shape:red) */
export function getFilters(selectedFacetArray=undefined) {
  // return all datasets if no filter
  if (selectedFacetArray === undefined) {
    return 'NOT item.published.status:embargo'
  }

  // Switch the 'term' attribute to 'label' if 'label' does not exist. Use facet2 if available
  selectedFacetArray.forEach(f=>{
    f.label=f.facet
    if (f.facet2) {
      f.label = f.facet2
    }
  })
  

  let facets = removeShowAllFacets(selectedFacetArray)

  let filters = "NOT item.published.status:embargo";
  filters = `(${filters}) AND `;
  const facetPropPaths = facetPropPathMapping.map((f) => f.facetPropPath);
  facetPropPaths.map((facetPropPath) => {
    let facetsToBool = facets.filter(
      (facet) => facet.facetPropPath == facetPropPath
    );
    let orFilters = "";
    let andFilters = "";
    facetsToBool.map((facet) => {
      let facetPropPathToUse = facet.facetSubPropPath ? facet.facetSubPropPath : facetPropPath // Check if we have a subpath
      if (facet.AND){
        andFilters += `AND "${facetPropPathToUse}":"${facet.label}"`;
      } else {
        orFilters += `"${facetPropPathToUse}":"${facet.label}" OR `;
      }
    });
    if (orFilters == "" && andFilters =="") {
      return;
    }
    orFilters = `(${orFilters.substring(0, orFilters.lastIndexOf(" OR "))})` // remove last OR

    filters += `${orFilters + andFilters} AND `; // Put them together
    // (Note that we add an extra AND in case there are facets at a higher level)

    filters = filters.split('()AND ').join(''); // Handle case where there where no OR facets
  });
  return filters.substring(0, filters.lastIndexOf(" AND "));
}

function removeShowAllFacets(facetArray){
  return facetArray.filter( f => f.label !== 'Show all')
}