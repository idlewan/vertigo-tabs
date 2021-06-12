all: manifest.json panel.js panel.html panel.css loading.png \
	icon48.png icon128.png tab-audio-muted.svg tab-audio-playing.svg
	apack vertigo_tabs.zip $^

source:
	mkdir vertigo_tabs_source
	(cd vertigo_tabs_source && git clone --depth=1 ../ ./)
	apack vertigo_tabs_source.zip vertigo_tabs_source/*
	rm -rfv vertigo_tabs_source/

manifest.json: manifest.yaml
	yq . $< > $@

panel.html: panel.pug
	pug $<

panel.css: panel.styl
	stylus < $< > $@
