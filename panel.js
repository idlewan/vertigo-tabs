const $create = document.createElement.bind(document)

document.addEventListener("contextmenu", event => event.preventDefault())
const $container = document.querySelector("#tabs")
var window_id;
var loaded = {}
var current_tab_id = null
//var tabs = []
var tabs_by_id = {}

function on_tab_click(e) {
    id = parseInt(this.dataset.id)
    browser.tabs.update(id, {active: true}).then((tab) => {
        console.log(tab)
    })
}

function create_li(tab) {
    console.info("create_li:", tab)
    var li = $create("li")

    li.dataset.id = tab.id
    tabs_by_id[tab.id] = li

    li.className = "tab"
    if (tab.highlighted) {
        li.classList.add("highlighted")
        loaded[tab.id] = true
    }
    if (loaded[tab.id]) {
        li.classList.add("loaded")
    }
    if (tab.active) {
        current_tab_id = tab.id
    }

    var favicon = $create("img")
    if (tab.favIconUrl) {
        favicon.src = tab.favIconUrl
    } else {
        favicon.src = "no_favicon.png"
        //var favicon = $create("div")
    }
    favicon.className = "favicon"
    li.appendChild(favicon)

    var title = $create("span")
    title.textContent = tab.title
    li.appendChild(title)
    li.addEventListener("click", on_tab_click)
    console.info("create_li end")
    return li
}

function update_content() {
    console.info("update_content")
    browser.tabs.query({windowId: window_id}).then((window_tabs) => {
        console.log(window_tabs)
        $container.textContent = ""
        //tabs = []
        tabs_by_id = {}
        window_tabs.forEach((tab, i) => {
            var li = create_li(tab)
            $container.appendChild(li)
            //tabs.push(li)
        })
    })
}

function on_remove_tab(tabId) {
    console.info("on_remove_tab", current_tab_id, tabId)
    if (current_tab_id == tabId) {
        current_tab_id = null
    }
    var $tab = tabs_by_id[tabId]
    $tab.remove()
    delete tabs_by_id[tabId]
}

function on_update_tab(tabId, changes, state) {
    console.info("on_update tab:", tabId)
    console.log(tabs_by_id)
    var $tab = tabs_by_id[tabId]
    console.log($tab)
    console.info("changes:", changes)
    console.info("state:", state)
    favicon = $tab.children[0]
    if (changes.status == "loading") {
        favicon.src = "loading_bars_2.png"
        //favicon.classList.add("spinning")
    }
    if (changes.title) {
        $tab.children[1].textContent = changes.title
    }
    if (changes.status == "complete") {
        if (state.favIconUrl) {
            favicon.src = state.favIconUrl
        } else {
            favicon.src = "no_favicon.png"
        }
        favicon.classList.remove("spinning")
    }
}

function insert_tab_at(index, tab) {
    var $tabs = $container.querySelectorAll(".tab")
    if ($tabs.length <= index) {
        $container.appendChild(tab)
        console.log("mtfkr", $tabs.length, index)
    } else {
        console.log("noshit")
        $container.insertBefore(tab, $tabs[index])
    }
}

function on_create_tab(tab) {
    console.info("on_create_tab:", tab)
    if (tab.highlighted) {
        unhighlight_current_tab()
    }
    loaded[tab.id] = true
    var li = create_li(tab)
    insert_tab_at(tab.index, li)
}

function on_moved_tab(tabId, opts) {
    console.info("on_moved:", tabId, opts)
    var $tab = tabs_by_id[tabId]
    var new_index = opts.toIndex
    if (opts.fromIndex < new_index) {
        new_index += 1
    }
    insert_tab_at(new_index, $tab)
}

function unhighlight_current_tab() {
    if (current_tab_id) {
        console.info("has_previous current_tab_id:", current_tab_id)
        var $tab = tabs_by_id[current_tab_id]
        $tab.classList.remove("highlighted")
    }
}

function change_current_tab(active_info) {
    let new_current_id = active_info.tabId
    console.info("change_current_tab", new_current_id)
    //let $tabs = $container.querySelectorAll(".tab")

    // previous active tab
    unhighlight_current_tab()

    // current active tab
    var $tab = tabs_by_id[new_current_id]
    $tab.classList.add("highlighted")
    $tab.classList.add("loaded")
    loaded[new_current_id] = true
    current_tab_id = new_current_id
    console.log("change_current_tab ended well")
}

function on_detach_tab(tabId, opts) {
    var $tabs = $container.querySelectorAll(".tab")
    li = $tabs[opts.oldPosition]
    tabs_by_id[tabId] = li
}

function attach_logger(event_prop) {
    function listener(arg1, arg2) {
        console.debug(event_prop, arg1, arg2)
    }
    console.log("adding logging for:", event_prop)
    browser.tabs[event_prop].addListener(listener)
}

const to_log = [
    "onActivated", "onAttached", "onCreated",
    "onDetached", "onHighlighted", "onMoved", "onReplaced",
    "onUpdated", "onZoomChange"
]
to_log.forEach(attach_logger)


/*browser.tabs.onAttached.addListener(update_content)
browser.tabs.onCreated.addListener(update_content)
browser.tabs.onDetached.addListener(update_content)
browser.tabs.onMoved.addListener(update_content)
browser.tabs.onReplaced.addListener(update_content)*/
browser.tabs.onUpdated.addListener(on_update_tab)

browser.tabs.onActivated.addListener(change_current_tab)
browser.tabs.onRemoved.addListener(on_remove_tab)

browser.tabs.onCreated.addListener(on_create_tab)

browser.tabs.onMoved.addListener(on_moved_tab)

browser.tabs.onDetached.addListener(on_detach_tab)
browser.tabs.onAttached.addListener(on_detach_tab)

browser.windows.getCurrent().then((window_info) => {
    window_id = window_info.id
    update_content()
})
