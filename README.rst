Potamus
=======
* Export and graph app engine cost information
* Integrate discrete events with the cost graphs
* Provide real-time estimates of usage information on premium accounts

Potamus provides a method of collecting app engine dashboard information over time
and displaying it in easy to understand graphs.  The goal is to provide cost
data correlated with actual app engine activity.

It can actually handle any type of time-based information as well as discrete
events, but only the app engine dashboard information is currently provided.

Potamus consists of an App Engine-based collector, which stores and
regurgitates collected data, and a Chrome extension which scrapes the
dashboard for available information and ships it out to the collector.  

Directories
-----------
gae-dashboard-crx: Chrome plugin
collector: App Engine application

Installation
------------
Follow the instructions in the `README` file in the collector directory to set
up the collector app, then upload to your App Engine.

You can load the Chrome plugin directly from its directory, using the
`Extensions` tab in Chrome, or build it using `make` and load the resulting
.crx file.

Once loaded, the plugin will be visible when you visit the app engine dashboard
page.  On premium accounts, it will provide cost estimates for current usage.
Click on the OSE button to enable the plugin, and configure the potamus URL
with your collector's App ID.



