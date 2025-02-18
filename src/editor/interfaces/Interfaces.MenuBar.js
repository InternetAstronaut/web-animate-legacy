/* Wick - (c) 2017 Zach Rispoli, Luca Damasco, and Josh Rispoli */

/*  This file is part of Wick.

    Wick is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Wick is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Wick.  If not, see <http://www.gnu.org/licenses/>. */

const MenuBarInterface = function({guiActionHandler, canvas, project}) {

    let editorElem;
    let menuElem;
    let tabContainer;
    let projectNameElem;
    let projectSettingsElem;

    let tabs;

	const Tab = function (name, buttons, func) {
        this.buttons = buttons;
        this.name = name;

        this.generateElem = function () {
            const self = this;

            const tabElem = document.createElement('div');
            tabElem.className = "menubarTab";
            tabElem.id = `menubarMenu${this.name}`;
            tabElem.innerHTML = this.name;
            tabElem.onclick = () => {
                if(func) {
                    func();
                    return;
                }
                const visible = self.elem.style.display === "block";
                closeAllMenus();
                if(visible) {
                    self.elem.style.display = "none";
                } else {
                    self.elem.style.display = "block";
                }
                self.elem.style.left = `${tabElem.offsetLeft-8}px`;
            }
            tabContainer.appendChild(tabElem);

            this.elem = document.createElement('div');
            this.elem.className ='GUIBox menubarMenu';
            this.elem.id = `menubarMenuDropdown${this.name}`;
            this.elem.style.display = 'none';

            this.buttons.forEach(button => {
                button.generateElem();
                self.elem.appendChild(button.elem);
            });
            editorElem.appendChild(this.elem);
        }
    };

    const TabButton = function (name, func) {
        this.name = name;
        this.func = func;

        this.generateElem = function () {
            this.elem = document.createElement('div');
            this.elem.className ='menubarButton';
            this.elem.id = `menubarMenu${this.name}`;
            this.elem.innerHTML = this.name;
            this.elem.onclick = () => {
                closeAllMenus();
                func();
            }
        }
    };

    const TabSpacer = function () {
        this.generateElem = function () {
            this.elem = document.createElement('hr');
        }
    };

    this.setup = () => {
        editorElem = document.getElementById('editor');

        menuElem = document.createElement('div');
        menuElem.id = "menuBarGUI";
        menuElem.className = "GUIBox";
        editorElem.appendChild(menuElem);

        tabContainer = document.createElement('div');
        tabContainer.className = "tab-container";
        menuElem.appendChild(tabContainer);

        projectNameElem = document.createElement('div');
        projectNameElem.className = "menuBarProjectTitle";
        projectNameElem.onclick = () => {
            guiActionHandler.doAction('saveProject')
        }

        projectSettingsElem = document.createElement('div');
        projectSettingsElem.className = 'tooltipElem menuBarProjectSettingsButton';
        projectSettingsElem.setAttribute('alt', "Project settings");
        projectSettingsElem.onclick = () => {
            guiActionHandler.doAction("toggleProjectSettings");
        }

        const menuBarProjectControls = document.createElement('div');
        menuBarProjectControls.className = "menuBarProjectControls";
        menuBarProjectControls.appendChild(projectNameElem);
        menuBarProjectControls.appendChild(projectSettingsElem);
        menuElem.appendChild(menuBarProjectControls);

        tabs = [];

        canvas.getCanvasContainer().addEventListener('mousedown', e => {
            closeAllMenus();
        });

        addTab('File', [
            new TabButton('New Project', () => {
                guiActionHandler.doAction("newProject");
            }),
            new TabButton('Open Project', () => {
                guiActionHandler.doAction("openFile");
            }),
            new TabButton('Save Project', () => {
                guiActionHandler.doAction("exportProjectWick");
            }),
            new TabSpacer(),

            /*new TabButton('Export SVG', function () {
                wickEditor.guiActionHandler.doAction("exportFrameSVG");
            }),
            new TabButton('Export PNG', function () {
                wickEditor.guiActionHandler.doAction("exportProjectPNG");
            }),*/
            new TabButton('Export HTML', () => {
                guiActionHandler.doAction("exportProjectHTML");
            }),
            new TabButton('Export ZIP', () => {
                guiActionHandler.doAction("exportProjectZIP");
            }),
            /*new TabButton('Export Project as JSON', function () {
                wickEditor.guiActionHandler.doAction("exportProjectJSON");
            }),*/
            new TabButton('Export Animated GIF', () => {
                guiActionHandler.doAction("exportProjectGIF");
            }),
            new TabButton('Export Video', () => {
                guiActionHandler.doAction("openProjectExportWindow");
            }),
            new TabSpacer(),

            new TabButton('Run project', () => {
                guiActionHandler.doAction("runProject");
            }),
            new TabButton('Project settings', () => {
                guiActionHandler.doAction("openProjectSettings");
            }),
        ]);

        addTab('Edit', [
            new TabButton('Undo', () => {
                guiActionHandler.doAction("undo")
            }),
            new TabButton('Redo', () => {
                guiActionHandler.doAction("redo")
            }),
            new TabSpacer(),

            new TabButton('Cut', () => {
                guiActionHandler.doAction("cut")
            }),
            new TabButton('Copy', () => {
                guiActionHandler.doAction("copy")
            }),
            new TabButton('Paste', () => {
                guiActionHandler.doAction("paste")
            }),
            new TabButton('Delete', () => {
                guiActionHandler.doAction("deleteSelectedObjects")
            }),
            new TabSpacer(),

            new TabButton('Select All', () => {
                guiActionHandler.doAction("selectAll")
            }),
            new TabButton('Deselect All', () => {
                guiActionHandler.doAction("deselectAll")
            }),
        ]);

        addTab('Import', [
            new TabButton('Image', () => {
                guiActionHandler.doAction("importFile");
            }),
            new TabButton('Sound', () => {
                guiActionHandler.doAction("importFile");
            }),
            new TabButton('SVG', () => {
                guiActionHandler.doAction("importFile");
            }),
            /*new TabButton('JSON', function () {
                wickEditor.guiActionHandler.doAction("importFile");
            }),
            new TabButton('Script', function () {
                wickEditor.guiActionHandler.doAction("importFile");
            }),*/
        ]);

        addTab('Help', [
            new TabButton('Hotkeys', () => {
                guiActionHandler.doAction("openEditorSettings");
            }),
            new TabButton('Examples', () => {
                window.open('http://www.wickeditor.com/#examples')
            }),
            new TabButton('Tutorials', () => {
                window.open('http://www.wickeditor.com/#tutorials')
            }),
            new TabButton('Forums', () => {
                window.open('http://forum.wickeditor.com/')
            }),
            new TabButton('Browser Info', () => {
                guiActionHandler.doAction('printBrowserInfo');
            }),
        ]);

        addTab('About', [
            new TabButton('Source code', () => {
                window.open('https://www.github.com/zrispo/wick/');
            }),
            new TabButton('Credits', () => {
                window.open('http://www.wickeditor.com/#about');
            }),
        ]);

        addTab('Run', [], () => {
                guiActionHandler.doAction("runProject");
            });
    }

    var addTab = (name, buttons, func) => {
        const tab = new Tab(name, buttons, func);
        tab.generateElem();
        tabs.push(tab);
    }

    var closeAllMenus = () => {
        tabs.forEach(({elem}) => {
            elem.style.display = "none";
        })
    }

    this.syncWithEditorState = () => {
        document.title = `Wick Editor: ${project.name}`

        if(projectNameElem) {
            if(project.unsaved) {
                projectNameElem.innerHTML = `${project.name} <span class="unsavedText">(unsaved)</span>`;
            } else {
                projectNameElem.innerHTML = project.name;
            }
        }
    }

};
