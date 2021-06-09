const $create = document.createElement.bind(document)

document.addEventListener("contextmenu", event => event.preventDefault())
if (navigator.platform == "Win32") document.body.className.add("windows")

const $container = document.querySelector("#tabs")
var window_id
var current_tab_id = null
var tabs_by_id = {}
var detached_tabs = {}   // maps which detached tab refers to which real tab

function on_tab_click(e) {
    let id = parseInt(this.dataset.id)
    if (e.buttons === 4) { // if middle click
        browser.tabs.remove(id)  // close the tab
        e.preventDefault()
        return
    }
    // switch to clicked tab
    browser.tabs.update(id, {active: true})
    //.then((tab) => { console.log("click on tab", tab) })
}
function on_sound_icon_click(e) {
    let id = parseInt(this.parentNode.dataset.id)
    var muted = false
    browser.tabs.get(id).then((tab) => {
        muted = !tab.mutedInfo.muted
        browser.tabs.update(id, {muted: muted})
    })
    e.stopPropagation()
}

function ensure_sound_icon_is_present($tab) {
    if ($tab.children.length != 3) {
        var icon = document.createElement("div")
        icon.className = "soundicon"
        $tab.appendChild(icon)
        icon.addEventListener("click", on_sound_icon_click)
    }
}

function create_li(tab) {
    var li = $create("li")

    li.dataset.id = tab.id
    tabs_by_id[tab.id] = li

    li.className = "tab"
    if (tab.highlighted) {
        li.classList.add("highlighted")
    }
    if (!tab.discarded) {
        li.classList.add("loaded")
    }
    if (tab.active) {
        unhighlight_current_tab()
        current_tab_id = tab.id
    }

    var favicon = $create("div")
    favicon.className = "favicon"
    var img = $create("img")
    img.onerror = function () {
        favicon.classList.add("no-favicon")
    }
    if (tab.favIconUrl) {
        img.src = tab.favIconUrl
    } else {
        favicon.classList.add("no-favicon")
    }
    favicon.appendChild(img)
    li.appendChild(favicon)

    var title = $create("span")
    title.textContent = tab.title
    li.appendChild(title)

    if (tab.mutedInfo.reason || tab.audible) {
        ensure_sound_icon_is_present(li)
    }
    if (tab.audible) {
        li.classList.add("audible")
    }

    add_drag_events(li)
    li.addEventListener("mousedown", on_tab_click)
    return li
}

function scroll_into_view($el) {
    let visible_top_y = window.scrollY
    let visible_bottom_y = visible_top_y + window.innerHeight

    let sizing_info = $el.getBoundingClientRect()
    let el_top_y = sizing_info.y + window.scrollY
    let el_bottom_y = sizing_info.y + window.scrollY + sizing_info.height

    if (el_bottom_y > visible_bottom_y) {
        $el.scrollIntoView({behavior: "smooth", block: "end"})
    } else if (el_top_y < visible_top_y) {
        $el.scrollIntoView({behavior: "smooth", block: "start"})
    }
}

function fill_content() {
    browser.tabs.query({windowId: window_id}).then((window_tabs) => {
        $container.textContent = ""
        tabs_by_id = {}
        window_tabs.forEach((tab) => {
            var li = create_li(tab)
            $container.appendChild(li)
        })
        let $current_tab = tabs_by_id[current_tab_id]
        scroll_into_view($current_tab)
    })
}

function on_remove_tab(tabId, windowInfo) {
    if (window_id != windowInfo.windowId) {
        return
    }
    //console.info("on_remove_tab", current_tab_id, tabId)
    if (current_tab_id == tabId) {
        current_tab_id = null
    }
    var $tab = tabs_by_id[tabId]
    if (!$tab && detached_tabs[tabId]) {
        // tab isn't in the list because it's detached, remove its linked tab
        $tab = tabs_by_id[detached_tabs[tabId]]
    }
    $tab.remove()
    delete tabs_by_id[tabId]
}

function on_update_tab(tabId, changes, state) {
    if (window_id != state.windowId) {
        return  // doesn't concert this window
    }

    var $tab = tabs_by_id[tabId]
    if (!$tab) {
        //console.error("Tab hasn't been created yet? on_update_tab can't proceed")
        return  // nothing we can do, tab hasn't been created yet
    }
    let favicon = $tab.children[0]
    if (changes.status == "loading") {
        favicon.children[0].src = "loading.png"
        favicon.classList.remove("no-favicon")
    }
    if (changes.title) {
        $tab.children[1].textContent = changes.title
    }
    if (typeof changes.audible != "undefined") {
        ensure_sound_icon_is_present($tab)
        if (changes.audible) {
            $tab.classList.add("audible")
        } else if (state.mutedInfo.muted == false) {
            $tab.classList.remove("audible")
        }
    }
    if (changes.mutedInfo) {
        ensure_sound_icon_is_present($tab)
        if (changes.mutedInfo.muted) {
            $tab.classList.add("muted")
        } else {
            $tab.classList.remove("muted")
        }
    }

    if (changes.status == "complete") {
        if (state.favIconUrl) {
            favicon.children[0].src = state.favIconUrl
        } else {
            favicon.classList.add("no-favicon")
        }
    }
}

function insert_tab_at(index, tab) {
    var $tabs = $container.querySelectorAll(".tab")
    $container.insertBefore(tab, $tabs[index])
}

function on_create_tab(tab) {
    if (window_id != tab.windowId) {
        return
    }
    //console.info("on_create_tab", tab)
    if (tab.highlighted) {
        unhighlight_current_tab()
    }
    var li = create_li(tab)
    insert_tab_at(tab.index, li)
    tabs_by_id[tab.id] = li
    scroll_into_view(li)
}

function on_moved_tab(tabId, opts) {
    if (window_id != opts.windowId) {
        return  // doesn't concern this window
    }
    var parent_id = detached_tabs[tabId]
    var $tab = tabs_by_id[parent_id] || tabs_by_id[tabId]
    var new_index = opts.toIndex
    if (opts.fromIndex < new_index) {
        new_index += 1
    }
    insert_tab_at(new_index, $tab)
}

function unhighlight_current_tab() {
    if (current_tab_id) {
        //console.info("unhighlight_current_tab", current_tab_id)
        var $tab = tabs_by_id[current_tab_id]
        $tab.classList.remove("highlighted")
    }
}

function change_current_tab(active_info) {
    if (window_id != active_info.windowId) {
        return
    }

    let new_current_id = active_info.tabId

    if (detached_tabs[new_current_id]) {
        //console.info("USING DETACHED TAB: from", new_current_id,
        //             " to ", detached_tabs[new_current_id])
        new_current_id = detached_tabs[new_current_id]
    }

    // current active tab
    var $tab = tabs_by_id[new_current_id]
    if (!$tab) {
        //console.error("ABORT change_current_tab")
        //console.info("new:", new_current_id, tabs_by_id[new_current_id])
        //console.info("old:", current_tab_id, tabs_by_id[current_tab_id])
        return  // abort, maybe a tab detached or something
    }

    // previous active tab
    unhighlight_current_tab()

    $tab.classList.add("highlighted")
    $tab.classList.add("loaded")
    scroll_into_view($tab)

    current_tab_id = new_current_id
}

function on_detach_tab(tabId, opts) {
    if (opts.oldWindowId != window_id) {
        return  // doesn't concern this window
    }
    //console.info("on_detach_tab", tabId, opts)
    var $tabs = $container.querySelectorAll(".tab")
    let li = $tabs[opts.oldPosition]
    tabs_by_id[tabId] = li
    if (li) {
        $container.removeChild(li) // li might not have been inserted
    }

    // detached tab's parent is current_tab when opening responsive mode,
    // and itself when tab is moved (doesn't support moving tabs
    // without them being selected yet anyway)
    detached_tabs[tabId] = current_tab_id
}

function on_attach_tab(tabId, opts) {
    if (opts.newWindowId != window_id) {
        return  // doesn't concern this window
    }
    browser.tabs.get(tabId).then((tab) => {
        let li = create_li(tab)
        insert_tab_at(opts.newPosition, li)
        tabs_by_id[tab.id] = li
    })
}

// eslint-disable-next-line no-unused-vars
function attach_logger(event_prop) {
    function listener(arg1, arg2, arg3) {
        var windowId = arg1.windowId
        if (!windowId && arg2) {
            windowId = arg2.windowId
        }
        if (!windowId && arg3) {
            windowId = arg3.windowId
        }
        if (!windowId || windowId == window_id) {
            // eslint-disable-next-line no-console
            console.debug(event_prop, arg1, arg2, arg3)
        }
    }
    browser.tabs[event_prop].addListener(listener)
}

// eslint-disable-next-line no-unused-vars
const to_log = [
    "onActivated", "onAttached", "onCreated",
    "onDetached", "onMoved", "onReplaced", "onRemoved",
    "onUpdated", "onZoomChange"
    //"onHighlighted",
]
//to_log.forEach(attach_logger)


browser.tabs.onUpdated.addListener(on_update_tab)

browser.tabs.onActivated.addListener(change_current_tab)
browser.tabs.onRemoved.addListener(on_remove_tab)

browser.tabs.onCreated.addListener(on_create_tab)

browser.tabs.onMoved.addListener(on_moved_tab)

browser.tabs.onDetached.addListener(on_detach_tab)
browser.tabs.onAttached.addListener(on_attach_tab)

browser.windows.getCurrent().then((window_info) => {
    window_id = window_info.id
    fill_content()
})

window.addEventListener("resize", event => {
    let $current_tab = tabs_by_id[current_tab_id]
    scroll_into_view($current_tab)
})


//---------- Drag & Drop tabs on the sidebar ----------
//=====================================================
const $dragline = document.querySelector("#drag-line")
const $emptyspace = document.querySelector("#empty-space")

function add_drag_events($el) {
    $el.setAttribute("draggable", "true")
    $el.addEventListener("dragstart", on_drag_start)
    $el.addEventListener("dragend", on_drag_end)
    $el.addEventListener("dragenter", on_drag_enter)
    $el.addEventListener("dragover", on_drag_over)
    $el.addEventListener("drop", on_drop)
}

function on_drag_start(e) {
    let tab_index = [].indexOf.call($container.children, this)
    let data = this.dataset.id + "|" + tab_index + "&" + window_id
    e.dataTransfer.setData("tab/id", data)
    e.effectAllowed = "move"
}

// position the dotted line indicating a drop where would insert the tab
function on_drag_enter(e) {
    e.preventDefault()
    var line_y = window.scrollY
    if (this === $emptyspace) {
        let $tabs = $container.querySelectorAll(".tab")
        let sizing_info = $tabs[$tabs.length - 1].getBoundingClientRect()
        line_y += sizing_info.bottom
    } else {
        let sizing_info = this.getBoundingClientRect()
        line_y += sizing_info.top
    }
    $dragline.style.display = "block"
    $dragline.style.top = line_y + "px"
}

function on_drop(e) {
    e.preventDefault()

    let data = e.dataTransfer.getData("tab/id")
    let sep_index = data.indexOf("|")
    let sep2_index = data.indexOf("&")

    let tab_to_move_id = parseInt(data.substring(0, sep_index))
    let tab_to_move_index = parseInt(data.substring(sep_index + 1, sep2_index))
    let origin_window = parseInt(data.substring(sep2_index + 1))

    if (this === $emptyspace) {
        var index = $container.querySelectorAll(".tab").length
        browser.tabs.move(tab_to_move_id, {index: index, windowId: window_id})
        //console.info("drop emptyspace", index, "window:", window_id)
    } else {
        var destination_tab = parseInt(this.dataset.id)
        browser.tabs.get(destination_tab).then((tab) => {
            let index = tab.index
            if (window_id === origin_window && tab_to_move_index < index) {
                index -= 1
            }
            browser.tabs.move(tab_to_move_id,
                              {index: index, windowId: window_id})
        })
        //console.info("drop tab", tab_to_move_id, "to:", destination_tab,
        //             "window:", window_id)
    }
    // hide dragline in the context/window where the tab is dropped
    $dragline.style.display = "none"
}

function on_drag_over(e) {
    e.preventDefault()
}

function on_drag_end() {
    // hide dragline in the context/window where the tab is from
    $dragline.style.display = "none"
}
$emptyspace.addEventListener("dragenter", on_drag_enter)
$emptyspace.addEventListener("dragover", on_drag_over)
$emptyspace.addEventListener("drop", on_drop)
