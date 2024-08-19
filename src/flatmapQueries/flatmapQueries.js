function transformKeyValueArrayToObject(data) {
  try {
    let result = data.values.map(valueArray =>
      data.keys.reduce((acc, key, index) => {
        acc[key] = valueArray[index];
        return acc;
      }, {})
    )
    return result
  } catch (error) {
    console.error(`Error occured during conversion of Key Value Array to Object: ${error}`)
    return {}
  }

}

// remove duplicates by stringifying the objects
const removeDuplicates = function (arrayOfAnything) {
  if (!arrayOfAnything) return []
  return [...new Set(arrayOfAnything.map((e) => JSON.stringify(e)))].map((e) =>
    JSON.parse(e)
  )
}


let FlatmapQueries = function () {
  this.initialise = function (flatmapApi) {
    this.flatmapApi = flatmapApi
    this.features = []
    this.limit = 10
    this.offset = 0
    this.numberOfHits = 0
    this.sqlPreOffset = ''
    this.lookup = {}
    this.createLookup()
  }

  this.updateOffset = function (offset) {
    this.offset = offset
  }
  this.updateLimit = function (limit) {
    this.limit = limit
  }

  this.offsetText = function () {
    return 'limit ' + this.limit + ' offset ' + this.offset
  }

  this.createTermSQL = function (terms) {
    let sql = ''
    let validFilter = false


    if (terms && terms.length > 0) {
      sql += 'and '
      terms.forEach((t, i) => {
        if (i == 0) {
          sql += '('
        }
        if (t !== '') {
          sql += `m.term='${t}'`
          validFilter = true
          if (i < terms.length - 1) {
            sql += ' or '
          }
        }
        if (i == terms.length - 1) {
          sql += ') '
        }
      })
    }
    if (!validFilter) {
      sql = ''
    }
    return sql
  }


  this.pmrSQL = function (terms=[], search='') {
    let sql = 'select distinct m.term, m.exposure, m.score, m.workspace, d.metadata from pmr_text '
    sql += 'as t left join pmr_metadata as d on t.entity=d.entity left join pmr_models as m on m.exposure=t.entity '
    sql += 'where d.metadata is not null '

    // add filters for the terms
    const termsSql = this.createTermSQL(terms)
    sql += termsSql

    // Add the text search
    if (search && search !== '') {
      sql += `and (t.pmr_text match '${search}')`
    }

    // Add exposure and score filters if we aren't text searching
    if (!search || search === '') {
      sql += 'and m.exposure is not null and score > 0.69'
    }

    // group by exposure
    sql += ' group by m.exposure'

    this.sqlPreOffset = sql

    // add the limit and offset for pagination
    sql += ' ' + this.offsetText() + ';'

    console.log(sql)
    return sql
  }

  this.convertTermsToIds = function (terms) {
    return terms.filter(t => this.lookUpId(t))
  }

  this.labelSQL = function (){
    return "select entity, label from labels"
  }

  this.countSQL = function (sql) {
    sql = `select count(*) from (${sql})`
    return sql
  }


  this.flatmapQuery = function (sql) {
    const data = { sql: sql }
    return fetch(`${this.flatmapApi}knowledge/query/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .catch((error) => {
      console.error('Error:', error)
    })
  }

  this.processFilters = function (filters) {
    let featureFacets = []
    filters.forEach((f) => {
      if (f.facet !== 'Show all' && f.facet !== 'PMR')
        featureFacets.push(f.facet)
    })
    return featureFacets
  }



  this.pmrSearch = function (filters=[], search='') {
    let features = this.processFilters(filters)
    let featureIds = this.convertTermsToIds(features)
    return new Promise((resolve, reject) => {
      this.flatmapQuery(this.pmrSQL(featureIds, search))
        .then(data => {
          const pd = this.processPMRData(data, featureIds)
          this.setAvailableFeatures(pd)

          // get the number of hits for pagination
          this.flatmapQuery(this.countSQL(this.sqlPreOffset)).then(data => {
            this.numberOfHits = data.values[0][0]
            resolve(pd);
          })
        })
        .catch(reject);
    });
  }

  // setAvailableFeatures returns the available features in the flatmap for filtering
  // pd is the processed data from the flatmap
  this.setAvailableFeatures = function (pd) {
    pd.forEach((d) => {
      Object.keys(d).forEach((key) => {
        if (!this.features.includes(key)) {
          this.features.push(key)
        }
      })
    })
  }


  this.processPMRData = function (data, featureIds=[]) {
    // Convert the flatmap data into an array of objects
    let dataObj = transformKeyValueArrayToObject(data)

    // Only use the results with metadata
    let metadataResults = dataObj.filter(d => d.metadata)
    let metadataOnly = metadataResults.map(d => {
      let md = JSON.parse(d.metadata)
      md.dataSource = 'PMR'
      return md
    })

    // If there are featureIds, filter the results
    if (featureIds.length > 0) {
      metadataOnly = metadataOnly.filter(d => featureIds.includes(d.term))
    }

    // Remove duplicates
    let uniqueResults = removeDuplicates(metadataOnly)
    return uniqueResults
  }

  this.createLookup = function () {
    this.flatmapQuery(this.labelSQL())
      .then(data => {
        data.values.forEach(d => {
          if (d[1] && (typeof d[1] === 'string' || d[1] instanceof String)) {
            this.lookup[d[1].toLowerCase()] = d[0]
          }
        })
      })
  }

  this.lookUpId = function (label) {
    return this.lookup[label.toLowerCase()]
  }

}

export default FlatmapQueries