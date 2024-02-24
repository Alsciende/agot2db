// the following code has been copied from NetrunnerDB's codebase (https://NetrunnerDB/netrunnerdb)
// and modified to work with ThronesDB
// [ST 2024/02/24]

/* An object representing the general purpose panels used across nrdb
 * Assumes there will be at most one header, subheader, and body
 * Attempting to add more will result in unintended duplication of content
 * Hidden attributes:
 * - exclusiveShow: bool - if true, hide all sibling panels when this is shown
 */
class Panel {
    static instances = new Map();
    static get(id) {
        return Panel.instances.get(id);
    }

    constructor(parent, id, visible=true) {
        this.parent = parent;
        this.id = id;
        this.visible = visible;
        this.jqRef = parent.append(`<div id="${id}" class="panel panel-default"></div>`).find(`#${id}`);
        Panel.instances.set(id, this);
    }

    addHeader(name) {
        this.title = name;
        this.header = this.jqRef.append(`<div class="header panel-heading" style="display: flex;"></div>`).find(`.header`);
        this.header.append(`<h3 style="margin: 15px 0 10px 0">${name}</h3>`)
            .append(`<button class="btn btn-secondary" style="margin-left:auto; margin-top: auto; margin-bottom: auto;">${this.visible ? 'Hide' : 'Show'}</button>`);
        this.button = this.header.find('button');
        const caller = this;
        this.button.on('click', function() {caller.toggle(250);});
        return this;
    }

    addSubheader(content) {
        this.subtitle = content;
        this.subheader = this.jqRef.append(`<div class="subheader panel-heading" ${this.visible ? '' : 'style="display: none;"'}>${content}</div>`).find('.subheader');
        return this;
    }

    addBody() {
        this.body = this.jqRef.append(`<div class="panel-body" ${this.visible ? '' : 'style="display: none;"'}>`).find('.panel-body');
        return this;
    }
    addBodyContent(content) {
        this.body.append(content);
        return this;
    }

    show(duration=0) {
        if (this.onShowFunc) {
            this.onShowFunc();
            this.onShowFunc = null;
        }
        if (this.exclusiveShow) {
            this.parent.find('.panel').each(function() {
                Panel.get($(this).attr('id')).hide(duration);
            });
        }
        this.visible = true;
        this.button.html('Hide');
        this.subheader?.show(duration);
        this.body?.show(duration);
    }
    hide(duration=0) {
        this.visible = false;
        this.button.html('Show');
        this.subheader?.hide(duration);
        this.body?.hide(duration);
    }
    toggle(duration=0) {
        if (this.visible) {
            this.hide(duration);
        } else {
            this.show(duration);
        }
    }

    // Provides the panel a function to run the next time show() is called
    // Assumes the panel is currently hidden
    set onShow(f) {
        this.onShowFunc = f;
    }
}

// A container of panels
// id is optional
// controls specifies which controls to generate:
// - "toggle" - the show/hide all buttons
// - "search" - the search bar
// - "sort" - the sort dropdown
class PanelList {
    constructor(parent, id=null, exclusiveShow=false, ...controls) {
        this.panelList = parent.append(`<div ${id ? `id="${id}"` : ''} class="panel-list"></div>`).find('.panel-list');
        this.panels = new Map();
        this.exclusiveShow = exclusiveShow;
        if (controls.length > 0) {
            // Create control panel
            this.row = this.panelList.append('<p class="row"></p>').find('.row');

            // Get flags
            const toggle = controls.includes("toggle");
            const search = controls.includes("search");
            const sort = controls.includes("sort");

            // Add controls
            if (toggle) { this.row.append('<button class="show-all btn btn-secondary">Show all</button>'); }
            if (search) { this.row.append('<div class="panel-search"><input type="text" class="form-control" placeholder="Search..." aria-label="Search"></input></div>'); }
            if (toggle) { this.row.append('<button class="hide-all col-md-1 col-sm-2 btn btn-secondary">Hide all</button>'); }
            if (sort) {
                this.row.append('<div class="panel-dropdown dropdown"><button class="dropdown-toggle btn" data-toggle="dropdown" role="button" aria-expanded="false">Sort <span class="caret"></span></button><ul class="dropdown-menu dropdown-menu-right" role="menu"></ul></div>');
                this.sortDropdown = this.row.find('.dropdown-menu');
            }

            // Enable event handling
            if (toggle) {
                const panelList = this.panelList;
                this.panelList.find('.show-all').on('click', function (event) {
                    const panels = panelList.find('.panel').each(function() {
                        Panel.get($(this).attr('id')).show();
                    });
                });
                this.panelList.find('.hide-all').on('click', function (event) {
                    const panels = panelList.find('.panel').each(function() {
                        Panel.get($(this).attr('id')).hide();
                    });
                });
            }
            if (search) {
                const panelList = this.panelList;
                const inputField = this.panelList.find('.panel-search input');
                inputField.on('keyup', function() {
                    const query = inputField.val().trim().toLowerCase();
                    panelList.find('.panel').each(function() {
                        if ($(this).find('.header').text().toLowerCase().includes(query)) {
                            $(this).show();
                        } else {
                            $(this).hide();
                        }
                    });
                });
            }
        }
    }

    // Generate a Panel
    // Expects the same arguments as Panel.constructor, excluding parent
    createPanel(...args) {
        const panel = new Panel(this.panelList, ...args);
        panel.exclusiveShow = this.exclusiveShow;
        this.panels.set(panel.id, panel);
        return panel;
    }

    // Adds a sort option that sorts panels by passing them to valueFunc
    static sortCount = 0;
    addSortOption(desc, valueFunc, order="descending") {
        const id = `sort-${PanelList.sortCount++}`;
        const ascending = order == "ascending";
        const caller = this;
        this.sortDropdown.append(`<li><a href="#" onClick="return false;" id="${id}">${desc}</a></li>`);
        this.sortDropdown.find(`#${id}`).on('click', function(event) {
            event.stopPropagation();
            caller.sortDropdown.dropdown("toggle");
            $(caller.panelList.find('.panel').toArray().sort(function(a,b) {
                const valA = valueFunc(caller.panels.get($(a).attr('id')));
                const valB = valueFunc(caller.panels.get($(b).attr('id')));
                const comp = ascending ? valA > valB : valA < valB;
                return (valA == valB) ? 0 : comp ? 1 : -1;
            })).each(function() {console.log($(this).find('h3').html());}).appendTo(caller.panelList);
        });
    }
}