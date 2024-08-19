<script>
// The functions below are needed because the number of results shown on the page is dependent what is available from each index.
// We fix this by calcuting how many results we have shown before the requested page and then calculating the offset based on that.

// Note that this.RatioOfPMRResults is a number that determines how many PMR results are shown compared to SPARC results. It is grabbed from a constant in
//  SidebarContent.vue.

export default {
  methods: {

    // Calculate Variable Ratio is used as a number to determine how the ratio of PMR results to SPARC results
    //   will be shown on the page. 1 means only PMR results, 0 means only SPARC results.
    calculateVariableRatio: function () {
      if (this.page === 1) {
        this.variableRatio = this.RatioOfPMRResults

      // Check if we have run out of Sparc results
      } else if( this.npp_SPARC * (this.page -1) >= this.sparcNumberOfHits) {
        this.variableRatio = 1

      // Check if we have run out of PMR results
      } else if(this.npp_PMR * (this.page - 1) >= this.pmrNumberOfHits) {
        this.variableRatio = 0
      } else {

        // Set the ratio to the same as the previous page if both indeces have results
        this.variableRatio = this.RatioOfPMRResults
      }
    },

    // calculatePMROffest is used to calculate how many PMR results we have shown before the requested page
    calculatePMROffest: function() {

      // If variable ratio has not changed, we have not run out of results.
      //   we can use the the number per page PMR to calculate the offset
      if (this.variableRatio === this.RatioOfPMRResults) {
        return (this.page-1)*this.npp_PMR

      // If we have run out of SPARC results, we need to calculate how many PMR results we have shown before the requested page
      } else if (this.variableRatio === 1) {

        // calculate how many results we showed before the requested page
        // We want our offset to be the number of PMR results shown before the requested page
        //  This can be though of as numberOfPMRResultsShownInMixed + numberOfPMRResultsShownInPMROnly = offset
        let pageWhereSPARCResultsRanOut = Math.ceil(this.sparcNumberOfHits / this.npp_SPARC)
        let numberOfPMRResultsShownInMixed = this.npp_PMR * pageWhereSPARCResultsRanOut
        let numberOfPMRResultsShownInPMROnly = (this.page - 1 - pageWhereSPARCResultsRanOut) * this.numberPerPage
        return numberOfPMRResultsShownInMixed + numberOfPMRResultsShownInPMROnly
      }
    },

    // calculateSPARCOffest is used to calculate how many SPARC results we have shown before the requested page. See above for details
    calculateSPARCOffest: function() {
      if(this.variableRatio === this.RatioOfPMRResults) {
        return (this.page-1)*this.npp_SPARC
      } else if (this.variableRatio === 0) {

        // calculate how many results we showed before the requested page
        let pageWherePMRResultsRanOut = Math.ceil(this.pmrNumberOfHits / this.npp_PMR)
        let numberOfSPARCResultsShownInMixed = this.npp_SPARC * pageWherePMRResultsRanOut
        let numberOfSPARCResultsShownInSPARCOnly = (this.page - 1 - pageWherePMRResultsRanOut) * this.numberPerPage
        let offset = numberOfSPARCResultsShownInMixed + numberOfSPARCResultsShownInSPARCOnly
        return offset
      }
    },

    // PMRLimit is used to calculate how many PMR results we can show on the page.
    PMRLimit: function(pmrResultsFlag=false) {
      // If we only want PMR results, return the number per page
      if (pmrResultsFlag) {
        return this.numberPerPage
      }
      // If the variable ratio is the same as the ratio of PMR results, return the number per page set for PMR
      if (this.variableRatio === this.RatioOfPMRResults) {
        return this.npp_PMR

      // if we have run out of sparc results, we want to show pmr results equal to the total number of results per page
      } else if (this.variableRatio === 1) {
        return this.numberPerPage

      // if we have run out of pmr results, we want to show 0 pmr results
      } else if (this.variableRatio === 0) {
        return 0
      }
    },
    SPARCLimit: function(pmrResultsFlag=false) {
      if(pmrResultsFlag) {
        return 0
      }
      if (this.variableRatio === this.RatioOfPMRResults) {
        return this.npp_SPARC
      } else if (this.variableRatio === 0) {
        return this.numberPerPage
      } else if (this.variableRatio === 1) {
        return 0
      }
    },
  }
};
</script>


