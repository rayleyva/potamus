#
# Build AE admin dashboard chrome extension
#
NAME=ose
TITLE=GAE Dashboard Enhancer
KEYFILE=$(NAME).pem

DESC=This tool provides missing admin console functionality for App Engine Premier customers (daily usage and cost estimation).
URL=http://www.cloudlock.com
UPDATE_URL=https://dev.cloudlock.com/updates/chrome-update.xml

BUILD=$(shell if [ -f build.number ]; then cat build.number; else echo 0; fi)
VERSION=3.0
FILES=manifest.json \
 jquery-1.7.2.js \
 background.js \
 common.js \
 contentscript-dashboard.js \
 contentscript-adminhistory.js \
 disclaimer.html \
 style.css \
 icon-128.png \
 icon-48.png \
 icon-16.png

CRX=$(NAME).crx

default: $(CRX)

icon-%.png: icon.png
	@cp icon.png $@
	@size=$(shell echo $@|sed 's/icon-\(.*\)\.png/\1/g') && mogrify -scale $${size}x$${size} $@ && echo "Regenerated icon size $$size"

# See http://code.google.com/chrome/extensions/crx.html
$(CRX): $(FILES) chrome-update.xml
	./crxmake.sh $(KEYFILE) $(FILES) > $@ || rm -f $@
	@echo Generated extension: $@

manifest.json: manifest.json.in Makefile
	@sed -e 's|%VERSION%|$(VERSION)|g' \
	     -e 's|%TITLE%|$(TITLE)|g' \
	     -e 's|%URL%|$(URL)|g' \
	     -e 's|%UPDATE_URL%|$(UPDATE_URL)|g' \
	     -e 's|%DESC%|$(DESC)|g' $< > $@
	@echo Regenerated $@

chrome-update.xml: update.xml.in
	@sed -e 's|%VERSION%|$(VERSION)|g' $< > $@
	@echo Regenerated $@

deploy: clean $(CRX)
	scp $(CRX) chrome-update.xml dev.cloudlock.com:/path/to/updates

clean:
	@rm -f $(CRX) chrome-update.xml manifest.json

#EOF
