# ![icon](icon48.png "Vertigo tabs") Vertigo tabs
This WebExtension is a vertical tab list using the new Sidebar API in Firefox.
It has not been tested on other browsers.

# Goals
From Firefox 57 onwards, only WebExtensions will work. Conversion of legacy
add-ons isn't usually desirable, a re-write from scratch gets you closer to
having an extension ready. This is an attempt to have functional vertical tabs,
with these additional goals in mind:
- respect the user's system theme if possible (use [system colors,
  system font sizes](
  https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#System_Colors)).
- shortest/cleanest code wins. Legacy Addons based on XUL and non-standard APIs
  aren't usually either short or pleasurable to read, so let's take advantage
  of the WebExtension reboot to try to make it readable from the start.
- have sane defaults, and if possible no configuration at all.
  It should just work.

## To Do
- Drag and drop support in-window and between windows. Pull requests welcome :)

## To Not Do (yet)
- Tab tree. Having a tab tree is not currently possible
  (missing [openerTabId support in firefox](
  https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/Tab#Browser_compatibility)),
  however it might be a desirable feature in the future.
- Proper "tab is loaded/unloaded" support. Currently, the extension only tracks
  the loading of tabs from the moment the extension is loaded, so tabs that
  have been loaded before but not selected appear as unloaded.
- Animation of the "loading" favicon. CPU usage seems to go up by a substantial
  amount when having CSS animation displaying, so as long as this stays true,
  the loading favicon will not be spinning.


# License
Released under the GNU Public License v3
