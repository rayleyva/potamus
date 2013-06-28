/** Content script for GAE Billing History page. */
var RIGHT_PART = "#ae-content";
var USAGE_TABLE = "#ae-billing-logs-table";
var BILLING_ROW = "tr[id^=ae-billing-usage-]";
var BILLING_CONTAINER = ".ae-billing-usage-premier";
var BILLING_LOGS_TABLE = "#ae-billing-logs-table";
var BILLING_LOGS_LIMIT = "#ae-billing-logs-limit";

$(document).ready(function(){
    chrome.extension.sendRequest({greeting: "loadApp"}, function(response) {
	dictionary =response.dict;
	extEnable = response.extEnable;

        function calculate(amount,dictionaryItem ){
	    
	    if((amount <= dictionaryItem.freeQuotas)){
		return 0;
	    }
	    return (amount-dictionaryItem.freeQuotas)*dictionaryItem.price;
        }

        // API PART
        function Item(name, amount){
 	    this.name= name;
	    this.amount = parseFloat(amount.replace(',',''));
        }

        Item.prototype.calculate = function (amount) {
 	    return amount;
        }

        function getBillingLogTableTitle(){
	    return BILLING_LOGS_TABLE+ " > thead tr"; 
        }
        function getBillingUsageClass(){
 	    return BILLING_ROW; 
        }
        
        function getDayBillingUsageClass(){
	    return BILLING_CONTAINER+" tbody tr";
        }
        
        function getColBillingUsageClasst (number){
	    return getBillingUsageClass()+" "+BILLING_CONTAINER+" colgroup";
        }

        function getHeaderBillingUsageClasst (number){
	    return getBillingUsageClass()+" "+BILLING_CONTAINER+" thead tr";
        }

        function getItemFromTR(TRElement){
	    return new Item(TRElement.find("td:first strong").html(),TRElement.find("td:last").html());
        }
        
        function getItemFromDictionary(name){
	    var returnedItem;
	    
	    $.each(getDictionary(), function(key,item){
	        if(item.title == name)
	  	    returnedItem =item;
            });
	    
	    return returnedItem;
        };
        
        /**
         * Compute and display the statistics
         */
        function onText() {
	    $(RIGHT_PART).append("<div class='OSEdisclaimer ose_text'>OSE (Offline Statistic estimator) is an unofficial tool made for App Engine. Please don't hesitate to <span class=\"ose-option ae-action\">edit your rates</span>.</div>");
	    $(".ae-billing-report-resource").css("width","30%");
	    $(".ae-billing-report-used").css("width","20%");
	    $(getColBillingUsageClasst(0)).append("<col  class=\"ae-billing-report-price\"></col>");
	    $(getColBillingUsageClasst(0)).append("<col  class=\"ae-billing-report-charge\"></col>");
	    $(getHeaderBillingUsageClasst(0)).append("<th  class=\"ae-currency-th ose_text\">Price</th>");
	    $(getHeaderBillingUsageClasst(0)).append("<th  class=\"ae-currency-th ose_text\">Charge</th>");
	    $(BILLING_LOGS_LIMIT).append('<option value="100">100 (OSE)</option>');
	    
	    $(getBillingLogTableTitle()).append("<th class='ose_text'>Amount</th>");
	    
	    var price;
	    var priceHeaderName;
	    $(getBillingUsageClass()).each(function(){
		//var item1 = getItemFromTR(value);
		
		// get the class of the parent
		priceHeaderName = "#"+ $(this).attr('id')+"-title";
		var headerEntry = $(priceHeaderName).parent().parent();
		//var test = (headerEntry.length == 2);
	        
		if (($(priceHeaderName).html().indexOf("Usage Report for") != -1) 
		    && ((headerEntry.children("td:contains('N/A')").length == 2)
                        || (headerEntry.children().length == 2))) {
		    
		    price = 0;
		    
		    $(this).find(getDayBillingUsageClass()).each(function(){
			
			
			var itemToCompute= getItemFromTR($(this));
			
			
			// Get dictionary definition
			var dictionaryDefinition = getItemFromDictionary(itemToCompute.name);
			
			if (typeof dictionaryDefinition!='undefined'){
			    var cost = calculate(itemToCompute.amount,dictionaryDefinition);
			    
			    $(this).append('<td class="ae-currency ose_text">$'+dictionaryDefinition.price+'</td>');
			    $(this).append('<td class="ae-currency ose_text">$'+cost.toFixed(2)+'</td>');
			    
			    price+=cost;
		        }
		    });
		    $(priceHeaderName).closest('tr').append("<td><strong class=\"ose_text\" style='float:right;'>$"+price.toFixed(2)+"</strong></td>");
		}
                else {
                    $(priceHeaderName).closest('tr').append("<td/>");
                }
	    });
        };

        function isPremierApp() {
            var numberCol = $(getBillingLogTableTitle()).first().children().length;
            //also check for the case where the page shows both premier and online billing
            var firstColumnData = $(BILLING_LOGS_TABLE).find("td:contains('N/A')");
            return (numberCol == "2" || (firstColumnData && firstColumnData.length > 1) ); 
        }

        if(extEnable && isPremierApp()){
	    chrome.extension.sendRequest({greeting: "getDictionary"}, function(response) {
		//dictionary =response.farewell;
		onText();
            });
        }
    });
});
