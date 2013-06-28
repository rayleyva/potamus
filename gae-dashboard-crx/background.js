/**
 * @fileoverview
 * Provides the background methods for the Offline Estimator
 *
 * @author josselinc@google.com (Josselin Cornou)
 * @author tim@cloudlock.com
 */

/** console namespace for Chrome/Firebug logger */
var console = console || {};

/** ApiClient object for API Methods. */
var apiClient = {};
var activePageID = 0;

function potamusURL(url) {
    if (typeof url === 'undefined') {
        return localStorage['potamusURL'];
    }
    else {
        if (url === false) {
            delete localStorage['potamusURL'];
        }
        else {
            localStorage['potamusURL'] = url;
        }
    }
}

function isEnable(){
    if (typeof localStorage['appEnabled'] === 'undefined'){
	localStorage['appEnabled']  = "false";
    }
    return localStorage['appEnabled'] === "true";
}
function setEnable(value){
    localStorage['appEnabled'] = value ? "true" : "false";
}
function isTermsAgreed (){
    if(typeof localStorage['dictionary']=='undefined'){
	localStorage['termsAgreed']  = "false";
    }
    return localStorage['termsAgreed'] === "true";
}

function setTermsAgreed(value){
    localStorage['termsAgreed'] = value ? "true" : "false";
}

chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
	switch (request.greeting) {
	case "loadApp":
            sendResponse({dict: dictionary, defaultDict: defaultDictionary, extEnable:isEnable(), potamus_url:potamusURL()});
            break;
        case "getDictionary":
            sendResponse({farewell: request.defaults ? defaultDictionary : dictionary});
            break;
        case "isDisclaimer":
	    sendResponse({farewell: !isTermsAgreed () });
            break;
	case "setDisclaimer":
	    setTermsAgreed(true);
	    // Default behavior. We activate it by default
	    setEnable(true);
	    sendResponse({farewell:isTermsAgreed () });
            break;
        case "setPotamusURL":
            potamusURL(request.potamus_url);
            break;
        case "setDictionary":
	    dictionary = request.dict;
            // Only save non-default values
            $.each(dictionary, function(index, value) {
                if (value == defaultDictionary[index]) {
                    delete dictionary[index];
                }
            });
	    localStorage['dictionary']=JSON.stringify(dictionary);	
            sendResponse({farewell: "done"});
            break;
        case "isEnable":
	    sendResponse({farewell: !isEnable() });
            break;
	case "enableExt":
	    setEnable(true);
            sendResponse({farewell: "done"});
            break;
	case "disableExt":
	    setEnable(false);
            sendResponse({farewell: "done"});
            break;
        case "getAppIDs":
            $.get("https://appengine.google.com/?limit=200", function(data) {
                var app_ids = [];
                var dom = $(data);
                $("#ae-apps-all tbody tr td:first-child", dom).each(function() {
                    var admin = $("+ td + td", this).text().trim();
                    // Billing admin column removed circa 3/29/2013 13:35 GMT
                    var status = $("+ td + td + td + td", this).text().trim();
                    console.info("status for ", this, " is ", status);
                    //if (admin == "cloudlock.com") {
                    if (status.match('Running')) {
                        var a = $("a", this);
                        var app_id = a.text().trim();
                        app_ids.push({id:a.text().trim(), url:a.attr('href')});
                    }
                });
                console.info("App ids: ", app_ids);
                sendResponse({app_ids: app_ids});
            });
            break;
        case "suspend":
            if (activePageID == request.page_id) {
                activePageID = 0;
                console.info("Deactivated dashboard page " + request.page_id);
            }
            break;
        case "postData":
            if (!potamusURL()) {
                break;
            }
            // Avoid data posts from more than one dashboard page
            if (activePageID != 0 && activePageID != request.page_id) {
                //console.info("Ignoring input from " + request.page_id);
                sendResponse({farewell: "ignored", when: new Date()});
                break;
            }
            if (activePageID == 0) {
                console.info("Active dashboard now " + request.page_id);
                activePageID = request.page_id;
            }
            //console.info("Send ", request.data);
            request.data.sender = 'gae-dashboard';
            var settings = {
                url: potamusURL().replace('APP_ID', request.app_id).replace('TS', request.ts),
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(request.data),
                success: function(result) {
                    sendResponse({farewell: "success", when: new Date()});
                },
                error: function(result) {
                    sendResponse({farewell: "error", when: new Date()});
                }
            };
            $.ajax(settings);
            break;
        default:
            break;
        }
    }
);

function DictionaryItem(i,t,dt,r,fq){
    this.id=i;
    this.dashboardTitle = dt;
    this.title=t;
    this.price=r;
    this.freeQuotas = fq;
}

DictionaryItem.prototype.calculate = function (amount) {
    if((amount <= this.freeQuotas)){
	return 0;
    }
    return (amount-this.freeQuotas)*this.price;
}

// first installation or update
if((localStorage['versionNumber'] != chrome.app.getDetails().version)){
    localStorage['versionNumber'] = chrome.app.getDetails().version;
    localStorage.removeItem('dictionary');
} 

var ONE_MONTH = 30;
var defaultDictionary = [ 
    new DictionaryItem('fih',"Frontend Instance Hours","Frontend Instance Hours",0.05,28),
    new DictionaryItem("dih",'Discounted Instance Hour','Discounted Instance Hour',0.05,0),
    new DictionaryItem("bih",'Backend Instance Hours',"Backend Instance Hours",0.08,9),
    // Pro-rate these for daily rate
    new DictionaryItem("ds",'Datastore Storage','Datastore Stored Data',0.18/ONE_MONTH,1),
    new DictionaryItem("ls",'Logs Storage','Logs Stored Data',0.24/ONE_MONTH,1),
    new DictionaryItem("ts",'Taskqueue Storage','Task Queue Stored Task Bytes',0.24/ONE_MONTH,1),
    new DictionaryItem("bs",'Blobstore Storage','Blobstore Stored Data',0.13/ONE_MONTH,5),
    
    new DictionaryItem("dw",'Datastore Writes','Datastore Write Operations',0.9,0.05),
    new DictionaryItem("dr",'Datastore Reads','Datastore Read Operations',0.6,0.05),
    new DictionaryItem("sdo",'Small Datastore Operations','Datastore Small Operations',0.1,0.05),
    
    new DictionaryItem("bo",'Bandwidth Out','Outgoing Bandwidth',0.12,1),
    new DictionaryItem("e",'Emails','Recipients Emailed',0.0001,100),
    new DictionaryItem("xp",'XMPP Stanzas','Stanzas Sent',0.000001,10000),
    new DictionaryItem("oc",'Opened Channels','Channels Created',0.0001,100),
    new DictionaryItem("lrb",'Logs Read Bandwidth','Logs Read Bandwidth',0.12,0),
    new DictionaryItem("pob",'PageSpeed Out Bandwidth','PageSpeed Outgoing Bandwidth',0.39,0),
    new DictionaryItem("sslv",'SSL VIPs','SSL VIPs',39.0,0),
    new DictionaryItem("ssls",'SSL SNI Certificates','SSL SNI Certificates',9.0,0),
    new DictionaryItem("casfs",'Code and Static File Storage','Code and Static File Storage',0.13,1), 
    
    new DictionaryItem("sapibo",'Search API Basic Operations','Search API Basic Operations',0.18,1000), // per Gb per month, 1k ops/day
    new DictionaryItem("sapibi",'Search API Bytes Indexed','Search API Bytes Indexed',0.13,0.01), // per 10k queries, 0.01Gb/day
    new DictionaryItem("sapisd",'Search API Stored Data','Search API Stored Data',0.60,0.25), // per Gb, 0.25 Gb free
    new DictionaryItem("sapics",'Search API Complex Searches','Search API Complex Searches',2.0/10000,100), // per 10k queries, 100 free
    new DictionaryItem("sapiss",'Search API Simple Searches','Search API Simple Searches',0.10/10000,1000), // per 10k ops, 1k free
];
    
if(typeof localStorage['dictionary']=='undefined'){
    // definition of the current dictionary
    dictionary = defaultDictionary;
    localStorage['dictionary']=JSON.stringify(dictionary);

} else {
    dictionary = JSON.parse(localStorage['dictionary']);
    $.each(defaultDictionary, function(index, value) {
        if (dictionary[index] === undefined) {
            dictionary[index] = value;
        }
    });
}


