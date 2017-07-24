all: manifest.json panel.js panel.html panel.css loading.png \
	icon48.png icon128.png tab-audio-muted.svg tab-audio-playing.svg
	apack vertigo_tabs.zip $^

manifest.json: manifest.yaml
	remarshal -if yaml -of json --indent-json $< > $@

panel.html: panel.pug
	pug $<

panel.css: panel.styl
	stylus < $< > $@
