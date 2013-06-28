// current dictionary definition
var dictionary = ""; 
var defaultDictionary = "";
var url_template = "http://{your-url-here}.appspot.com/events/APP_ID/cost-data?ts=TS";
var potamus_url = url_template;

// Get current dictionary
function getDictionary(){
    return dictionary;
} 

function getDefaultDictionary() {
    return defaultDictionary;
}

// we are in jquery
$(document).ready(function(){
    // get the current dictionary
    chrome.extension.sendRequest({greeting: "loadApp"}, function(response) {
	dictionary = response.dict;
        defaultDictionary = response.defaultDict;
	extEnable = response.extEnable;
        potamus_url = response.potamus_url || potamus_url;

        // function : version
        // get the current versiotn of the app
        function getVersion() {
            var details = chrome.app.getDetails();
            return details.version;
        }

        // function : showDisclaimer
        // test if first install and show the disclaimer
        function showDisclaimer(){
	    
	    chrome.extension.sendRequest({greeting: "isDisclaimer"}, function(disclaimerResponse) {
		
		var disclaimerResp = disclaimerResponse.farewell;
		if (disclaimerResp){
                    // TODO: externalize this markup
		    var disclaimer ='<div id="disclaimer" class="visible">\
<h1>Offline Statistics Estimator (OSE) DISCLAIMER</h1>\
  <h2>Terms</h2>\
    <p>The goal of this tool is to provide missing Admin console functionality for Google App Engine Premier customers. This tool will allow you to estimate and manage your current usage cost, reflecting your negotiated usage rates. This chrome extension is an offline tool as it doesn’t share any information with any other web application. As this tool is not developed by Google, you must not contact Google with information obtained from this tool, or with regards to the tool itself.<br />\
Please find below a summary of the features offered.</p>\
  <h2>Version supported</h2>\
    <p>Google App Engine 1.7.4</p>\
  <h2>Features</h2>\
    V1.0 :\
    <ul>\
    <li>estimation of the billing prices (history) on your billing history.</li>\
    <li>estimation of the billing prices (current day) on your dashboard.</li>\
    <li>customization of usage rates / quotes.</li>\
    </ul>\
    V2.0 (Cloudlock):\
    <ul>\
    <li>show daily quota consumption bar graph.</li>\
    </ul>\
    <p>Please don\'t hesitate to file a ticket within the <a id="issues" href=”https://code.google.com/p/appengine-ose/issues/list” target="ose_issues">issue tracker</a> if you find any issues related to this project.</p>\
    <button class="ose_disclaimer_submit">Accept</button>\
    <!--<button class="ose_close">Deny</button>-->\
</div>';
                    $(disclaimer).insertBefore(document.body);
                    // Dashboard rewrites links to make them all local; fix this one
		    $('#issues').click(function() {
                        window.open("http://code.google.com/p/appengine-ose/issues/list", this.target);
                        return false;
                    });
		    $('.ose_disclaimer_submit').click(function() { 
			chrome.extension.sendRequest({greeting: "setDisclaimer", dict : getDictionary() }, function(response) {

			    if(response.farewell)
			    {
				$("#disclaimer").removeClass("visible");
				$("#backgroundDisclaimer").removeClass("visible");
                                location.reload();
			    }
			});
		    });
		}
	    });
        }

        // function addPreferenceTool
        // injection of the preference tool box
        // This code inject the chrome extension preference in the page
        function addPreferenceTool(){
	    var trends_dom = document.createElement('div');
	    var formChangeDom = document.createElement('div');
	    var aebillinghistoryexpand="#ae-userinfo ul";
	    
            var checked = potamus_url && potamus_url != url_template;
            var potamusButton = "<table class=\"ose_potamus\"><tr><td><label><input type=\"checkbox\" class=\"ose_potamus_enable\"" + (checked?" checked=\"checked\"":"") + "/>Use&nbsp;Potamus</label></td></tr><tr><td><input type=\"text\" class=\"ose_potamus_url\" value=\""+potamus_url+"\"/></td></tr></table>";
	    var activateButton = "<button class=\"ose_turn_on_off off\">Turn OFF</button>";
	    var activatedStr = "(extension enabled)";
	    var	menubar = "<li><strong class=\"ose-option ose_text\">OSE SETTINGS (ON)</strong> </li>";
	    if (!extEnable){
		menubar = "<li><strong class=\"ose-option ose_text\">OSE SETTINGS (OFF)</strong> </li>"
		activateButton = "<button class=\"ose_turn_on_off on\">Turn ON</button>";
		activatedStr = "(extension deactived)";
	    }
	    
	    var formChangeValues ='<div id="msgbox">Save changed. Reloading page...</div><div id="modalshield"></div><div id ="modaldialog" class="">'+activateButton+'<h1>OSE : Edit '+activatedStr+'</h1>' + potamusButton;
	    
	    if(extEnable){
		
		formChangeValues+='<form id="edit_OSE"><br /><h2 class="ose_title">Name<div class="ose_title_stub"></div><div class="ose_title_right middle">Rate</div><div class="ose_title_right">Free Quotas</div></h2><div class="inputs">';
		$.each(getDictionary(), function(index, value) { 
  		    formChangeValues += "<div class='ose_inputtext'>"+value.title +":  <input type=\"text\"  id=\"ose_input_"+value.id+"\" name=\""+value.id+"\" value=\""+ value.price +"\" ></input><input id=\"ose_input_quotas_"+value.id+"\" type=\"text\"  value=\""+ value.freeQuotas +"\" ></div>";
	        });
		formChangeValues += '</div><button class="ose_submit">Submit</button><button class="ose_defaults">Defaults</button><button class="ose_close">Close</button></form></div>';
	    } else {
		formChangeValues+="</div>"
	    }
	    formChangeDom.innerHTML = formChangeValues;
	    
	    document.body.parentElement.insertBefore(formChangeDom,document.body);
	    
	    trends_dom.innerHTML = '<div class="plugin_OSE">'+
		'<h1 class="title">GAE OSE</h1>'+
		'<ul class="ose_ul">'+
		/*'<li class="button active"><div class="logos">G</div>Generate from<br /> page</li>'+*/
	    '<li class="button">'+
		'<div class="logos">S</div>View my stats</li>'+
		'<li class="button">'+
		'<div class="logos">E</div>Export</li>'+
		'</ul>tyrfegrht'+	
		'</div>';
	    document.body.style.cssText = 'position: relative';
	    
	    // add title
	    $(aebillinghistoryexpand).prepend(menubar);
        }

        function addListeners(){
	    // Allow other initialization to finish before adding the click handler(s)
            setTimeout(function() {
	        // event to show the option page
	        $('.ose-option').click(function() { $("#modaldialog").addClass("visible");$("#modalshield").addClass("visible"); });
            }, 1000);
	    
            $('.ose_defaults').click(function() {
                $.each(getDefaultDictionary(), function(index, value) {
                    $('#ose_input_'+value.id).val(value.price);
                    $('#ose_input_quotas_'+value.id).val(value.freeQuotas);
                });
                return false;
            });

	    $('.ose_turn_on_off.on').click(function(){
		
		chrome.extension.sendRequest({greeting: "enableExt"}, function(response) {
		    $("#modaldialog").removeClass("visible");
		    $("#msgbox").addClass("visible");
		    location.reload();
		    return false;
	        });
	    });
	    
	    $('.ose_turn_on_off.off').click(function(){
		
		chrome.extension.sendRequest({greeting: "disableExt"}, function(response) {
		    $("#modaldialog").removeClass("visible");
		    $("#msgbox").addClass("visible");
		    location.reload();
		    return false;
	        });
	    });
	    // event to close the option page
	    $('.ose_close,#modalshield').click(function() { 
		$("#modaldialog").removeClass("visible");
		$("#modalshield").removeClass("visible");
		
		$("[id^=ose_input_]").each(function(index, element) {
                    // revert change as cancelled
		    this.value = this.defaultValue;
                });
		return false;
	    });
	    
	    // test if a value have been change in the modal box.
	    $("[id^=ose_input_]").change(function(){
		var valueToTest = parseFloat($(this).val());
		// test the new value entered and change it if needed
		if( !isNaN(valueToTest) && valueToTest >=0){
		    if(this.value != this.defaultValue){
			if(valueToTest != this.defaultValue) {
			    $(this).addClass("ose_greenBox");
			}
			this.value = valueToTest;
		    } else {
			$(this).removeClass("ose_greenBox");
		    }
		} else {
		    // inferior or nan :)
		    this.value = this.defaultValue;
		    $(this).removeClass("ose_greenBox");
		}
	    });
	    
            var update_url = function() {
                var url = $('.ose_potamus_enable').is(':checked') && $('.ose_potamus_url').val();
		chrome.extension.sendRequest({greeting: "setPotamusURL", potamus_url: url && url != url_template ? url : false});
            };
            $('.ose_potamus_url').keyup(update_url);
            $('.ose_potamus_enable').click(update_url);

	    $('.ose_submit').click(function() { 
		$.each(getDictionary(), function(index, value) { 

  		    value1 = parseFloat($("#ose_input_"+value.id).val());
		    var freeQuotas1 = parseFloat($("#ose_input_quotas_"+value.id).val());
		    
		    if(value.freeQuotas != freeQuotas1)
		    {
			value.freeQuotas = freeQuotas1;
		    }
		    
		    if(value.price != value1)
		    {
			value.price = value1;
		    }
		});
		chrome.extension.sendRequest({greeting: "setDictionary", dict : getDictionary(), potamus_url: potamus_url }, function(response) {
		    $("#modaldialog").removeClass("visible");
		    $("#msgbox").addClass("visible");
		    location.reload();

		    return false;
		});
	    });
        }

	addPreferenceTool();
	showDisclaimer();
	addListeners();	
    });
});
