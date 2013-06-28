/** Content script for per-app ID GAE dashboard page. */
$(document).ready(function() {
    var FREQUENCY = 5*60*1000;

    chrome.extension.sendRequest({greeting: "loadApp"}, function(response) {
	var	dictionary = response.dict;
	var	extEnable = response.extEnable;

	// function : dictionary
	// method used to get the current dictionary
	function getDictionary() {
	    return dictionary;
	}

	// used to test if the application is a premier app. If not, we display nothing
	/** @const */ var BILLING_FOOTER = "#ae-dash-quota .ae-table > tfoot";
	/** @const */ var BILLING_STATUS = "#ae-dash-quota-title .g-unit.g-first::contains('Billing Status')";
	// used to identify the dashboard quotas
	/** @const */ var AEDASH_QUOTA = "#ae-dash-quota";

	// function calculate
	function calculate(amount, dictionaryItem) {
	    if ((amount <= dictionaryItem.freeQuotas)) {
		return 0;
	    }
	    return (amount - dictionaryItem.freeQuotas) * dictionaryItem.price;
	}

	// API PART
	// definition of an item (contain a name and amount)
	function Item(name, amount) {
	    this.name = name;
	    this.amount = parseFloat(amount.replace(',', ''));
	}

	Item.prototype.calculate = function(amount) {
	    return amount;
	}

	function getBillingLogTableTitle() {
	    return billing_logs_table + " thead tr";
	}

	function getBillingUsageClass() {
	    return billing_row;
	}

	function getDayBillingUsageClass() {
	    return billing_container + " tbody tr";
	}

	// generate the item from TR
	function getItemFromTR(TRElement) {
	    var amount = TRElement.find("td:eq(2) span").html();
	    // in some case, the amount is not shown on td:eq(2)
	    if (amount == null) amount = TRElement.find("td:eq(3) span").html();
	    // return the item
	    return new Item($.trim(TRElement.find("td:first").text()), amount);
	}

	// getItem from the dashboard definition
	// VAR name : current string to retrieve
	function getItemFromDictionaryDashboard(name) {
	    var returnedItem;

	    $.each(getDictionary(), function(key, item) {
		if (name == item.dashboardTitle) returnedItem = item;
	    });

	    return returnedItem;
	};

	// function onText
	// function displaying the estimation
	function onText() {

	    // Set the titles
	    $(AEDASH_QUOTA + " colgroup").append("<col  class=\"ae-billing-report-charge\" style=\"width:15%;\"></col>")
	        .append("<col  class=\"ae-billing-report-charge\" style=\"width:20%;\"></col>");
	    $(AEDASH_QUOTA + " thead tr").append("<th  class=\"ae-currency-th ose_text\">Price</th>")
	        .append("<th  class=\"ae-currency-th ose_text\">Cost</th>");

            var TOTAL_COST = 0;
	    $(AEDASH_QUOTA + " table tbody tr").each(function(index, element) {
		// Get the current item
		var itemToCompute = getItemFromTR($(this));
		// Get dictionary definition
		var dictionaryDefinition = getItemFromDictionaryDashboard(itemToCompute.name);
		// if the element have been found on the dictionary
		if (typeof dictionaryDefinition!='undefined'){
		    var cost = calculate(itemToCompute.amount, dictionaryDefinition);
		    $(this).append("<td class=\"ae-currency ose_text\">$" + dictionaryDefinition.price + "</td>");
		    $(this).append("<td class=\"ae-currency ose_text\">$" + cost.toFixed(2) + "</td>");
                    TOTAL_COST += cost;
		} else {
		    // if we cannot calculate the value (free feature and/or bad count)
                    console.info("Could not find " + itemToCompute.name);
		    $(this).append("<td class=\"ae-currency ose_text\">Not available (No daily count)</td>");
		    $(this).append("<td class=\"ae-currency ose_text\">Not available (No daily count)</td>");
		}
	    });

            function format_number(x) {
                return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            };

            function quota_fraction(quota) {
                if (typeof quota == 'undefined') {
                    return "Calculating...";
                }
                return "$" + format_number(TOTAL_COST.toFixed(2)) + " / $" + format_number(quota);
            };

            function usage_bar_class(quota) {
                if (typeof quota == 'undefined' || quota === 0) {
                    return "ae-quota-unknown";
                }
                var fraction = Math.min(1, Math.max(0, TOTAL_COST / quota));
                if (ELAPSED_HOURS > 2) {
                    fraction = fraction * 24 / ELAPSED_HOURS;
                }
                if (fraction >= 0.90) {
                    return "ae-quota-alert";
                }
                if (fraction >= 0.75) {
                    return "ae-quota-warning";
                }
                return "ae-quota-normal";
            };

            function usage_bar_percent(quota, numeric) {
                if (typeof quota == 'undefined') {
                    return numeric ? "0%" : "Calculating...";
                }
                if (quota === 0) {
                    return numeric ? "0%" : "N/A";
                }
                return Math.min(100, Math.round(TOTAL_COST * 100 / quota)) + "%";
            };

            var USAGE_BAR_CLASSES = ['ae-quota-unknown','ae-quota-alert','ae-quota-warning','ae-quota-normal'];
            var app_id = $('[name=app_id]').val();
            var QUOTA_KEY = 'quota-' + app_id;
            var quota = localStorage[QUOTA_KEY];
            var percent = usage_bar_percent(quota);
            var width_percent = usage_bar_percent(quota, true);
            var next = $('#ae-dash-quota-refresh-info').text().replace(/.*?([0-9]+) hrs.*/, '$1');
            var ELAPSED_HOURS = 24 - next;

            // Instantiate a quota footer similar to non-premier apps
            var cell1 = $('<td/>', {'colspan':4,'class':'ae-currency ose_text'}).text('Estimated cost for the last ' + ELAPSED_HOURS + ' hours:');
            var cell2 = $('<td/>', {'colspan':2, 'id':'ae-dollar-dash-bucket-c'});
            
            var bar = $('<div/>', {'class':"ae-dash-quota-bar",'id':"ae-dash-dollar-bucket"}).css('width','100%');
            var usage_bar = $('<img/>', {'id':'ae-quota-bar', 'src':'/img/pix.gif', 'class':usage_bar_class(quota), 'height':'13', 'width':width_percent, 'alt':percent, 'quota':quota, 'cost':TOTAL_COST});
            cell2.append(bar.append(usage_bar));
            var quota_usage = $('<strong/>', {'id':'ae-quota-fraction', 'class':'ose_text'}).text(quota_fraction(quota));
            var cell3 = $('<td/>', {'colspan':2}).append(quota_usage).css('text-align','right');
            $(AEDASH_QUOTA + " table").append($('<tfoot/>').append($('<tr/>').append(cell1).append(cell2).append(cell3)));
                                                         
            var billing_url = window.location.href.replace('dashboard', 'billing/settings');
            $.get(billing_url, function(data) {
                var budget = $(data).find('.ae-billing-settings-section').filter(function() {
                    return $(this).find('h2').text().match(/Max.* Daily Budget/);
                });
                var quota = budget.text().replace(/[^]*?\$([0-9.,]+)[^]*$/, '$1').replace(',','');
                localStorage[QUOTA_KEY] = quota;
                quota_usage.text(quota_fraction(quota));
                usage_bar.attr('alt', usage_bar_percent(quota)).width(usage_bar_percent(quota, true));
                $.each(USAGE_BAR_CLASSES, function() {
                    usage_bar.removeClass(this);
                });
                usage_bar.addClass(usage_bar_class(quota));
            });
	};

	// Test if an app is premier
	function isPremierApp(context) {
            var text = $(BILLING_STATUS, context).text();
            return text.match('(Premier Account Billing|Changing Daily Budget)') && $(BILLING_FOOTER, context).length == 0;
	}

	// if is a premier app, then display the text
	if (extEnable && isPremierApp(document)) {
	    onText();
	}

        var capture_dashboard = function(app_id, context) {
            if (!app_id) {
                app_id = $('[name=app_id]', context).val().replace(/^s~/, '');
            }
            if (!context) {
                context = document;
            }
            var data = {
                items:[]
            };
            var total_cost = 0;
            // Instance data
            var instances = $("#ae-dash-instances table tbody tr", context);
            var instanceCount = instances.find('td:nth-child(2)').text() || "0";
            if (!instanceCount.match(/^Unknown/)) {
                data.items.push({item:'instances', value:parseInt(instanceCount)});
            }
            var qps = instances.find('td:nth-child(3)').text() || "0";
            if (!qps.match(/^Unknown/)) {
                data.items.push({item:'qps', value:parseFloat(qps)});
            }
            var latency = instances.find('td:nth-child(4)').text() || "0";
            if (!latency.match(/^Unknown/)) {
                data.items.push({item:'latency', value:parseFloat(latency)});
            }
            var memory = instances.find('td:nth-child(5)').text() || "0";
            if (!memory.match(/^Unknown/)) {
                data.items.push({item:'memory', value:parseFloat(memory)});
            }

            // Cost data
	    $('#ae-dash-quota table tbody tr', context).each(function(index, element) {
	        var item = getItemFromTR($(this));
	        var rate_info = getItemFromDictionaryDashboard(item.name);
	        if (typeof rate_info != 'undefined'){
                    var cost = calculate(item.amount, rate_info);
		    data.items.push({item:item.name, usage:item.amount, cost:cost});
                    total_cost += cost;
	        };
            });
            data.items.push({item:'total', cost:total_cost});
            chrome.extension.sendRequest({greeting: "postData", app_id: app_id, ts: new Date().toISOString(), data: data, page_id: pageID}, function(response) {
                if (response.farewell != 'success' && response.farewell != 'ignored') {
                    console.info("postData failed: " + response);
                }
            });
        };
        var capture_dashboards = function(apps) {
            console.log("Reading dashboards at " + new Date() + " for " + apps.length + " apps");
            if (apps.length == 0 && $("#no-apps").length == 0) {
                console.error("Failed to find any app IDs on http://appengine.google.com");
                var alert = $("<div/>", {"class":"ae-alert ose_text"}).text("No applications were found on http://appengine.google.com");
                $("<div/>", {"id":'no-apps',"class":"ae-message ae-quota-warning"}).append(alert).insertAfter('#hd');
            }
            for (i in apps) {
                (function(url, app_id) {
                    $.get(url, function(data) {
                        var context = $(data);
                        if (extEnable && isPremierApp(context)) {
                            capture_dashboard(app_id, context);
                        }
                    });
                })(apps[i].url, apps[i].id);
            }
        };
        var intervalID = 0;
        var pageID = new Date().getTime() + ":" + document.location;
        chrome.extension.sendRequest({greeting:"getAppIDs"}, function(response) {
            capture_dashboards(response.app_ids);
            intervalID = setInterval(function() { capture_dashboards(response.app_ids); }, FREQUENCY);
        });
        $(window).bind('beforeunload', function() {
            clearInterval(intervalID);
            chrome.extension.sendRequest({greeting:"suspend", page_id:pageID});
        });
    });
});
