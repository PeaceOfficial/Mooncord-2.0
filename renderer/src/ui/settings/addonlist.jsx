/* eslint-disable brace-style */
/* eslint-disable no-console */
/* eslint-disable quote-props */
import React from "@modules/react";
import Strings from "@modules/strings";
import Events from "@modules/emitter";
import DataStore from "@modules/datastore";
import DiscordModules from "@modules/discordmodules";
import ipc from "@modules/ipc";

import Button from "../base/button";
import SettingsTitle from "./title";
import AddonCard from "./addoncard";
import Dropdown from "./components/dropdown";
import Search from "./components/search";

import Modals from "@ui/modals";
import ErrorBoundary from "@ui/errorboundary";

import ListIcon from "@ui/icons/list";
import GridIcon from "@ui/icons/grid";
import FolderIcon from "@ui/icons/folder";
import CheckIcon from "@ui/icons/check";
import CloseIcon from "@ui/icons/close";
import RefreshIcon from "@ui/icons/download";

import NoResults from "@ui/blankslates/noresults";
import EmptyImage from "@ui/blankslates/emptyimage";

const {useState, useCallback, useEffect, useReducer, useMemo} = React;

// Utility functions
const buildSortOptions = () => [
    {label: Strings.Addons.name, value: "name"},
    {label: Strings.Addons.author, value: "author"},
    {label: Strings.Addons.version, value: "version"},
    {label: Strings.Addons.added, value: "added"},
    {label: Strings.Addons.modified, value: "modified"},
    {label: Strings.Addons.isEnabled, value: "isEnabled"}
];

const buildDirectionOptions = () => [
    {label: Strings.Sorting.ascending, value: true},
    {label: Strings.Sorting.descending, value: false}
];

function openFolder(folder) {
    ipc.openPath(folder);
}

function blankslate(type, onClick) {
    const message = Strings.Addons.blankSlateMessage.format({link: `https://github.com/PeaceOfficial/Mooncord-2.0/tree/main/plugins`, type}).toString();
    return <EmptyImage title={Strings.Addons.blankSlateHeader.format({type})} message={message}>
        <Button size={Button.Sizes.LARGE} onClick={onClick}>{Strings.Addons.openFolder.format({type})}</Button>
    </EmptyImage>;
}

function makeBasicButton(title, children, action) {
    return <DiscordModules.Tooltip color="primary" position="top" text={title}>
                {(props) => <Button {...props} size={Button.Sizes.NONE} look={Button.Looks.BLANK} className="bd-button" onClick={action}>{children}</Button>}
            </DiscordModules.Tooltip>;
}

function makeControlButton(title, children, action, selected = false) {
    return <DiscordModules.Tooltip color="primary" position="top" text={title}>
                {(props) => {
                    return <Button {...props} size={Button.Sizes.NONE} look={Button.Looks.BLANK} className={"bd-button bd-view-button" + (selected ? " selected" : "")} onClick={action}>{children}</Button>;
                }}
            </DiscordModules.Tooltip>;
}

function getState(type, control, defaultValue) {
    const addonlistControls = DataStore.getBDData("addonlistControls") || {};
    if (!addonlistControls[type]) return defaultValue;
    if (!addonlistControls[type].hasOwnProperty(control)) return defaultValue;
    return addonlistControls[type][control];
}

function saveState(type, control, value) {
    const addonlistControls = DataStore.getBDData("addonlistControls") || {};
    if (!addonlistControls[type]) addonlistControls[type] = {};
    addonlistControls[type][control] = value;
    DataStore.setBDData("addonlistControls", addonlistControls);
}

function confirmDelete(addon) {
    return new Promise(resolve => {
        Modals.showConfirmationModal(Strings.Modals.confirmAction, Strings.Addons.confirmDelete.format({name: addon.name}), {
            danger: true,
            confirmText: Strings.Addons.deleteAddon,
            onConfirm: () => {resolve(true);},
            onCancel: () => {resolve(false);}
        });
    });
}

function confirmEnable(action, type) {
    return function(event) {
        if (event.shiftKey) return action();
        Modals.showConfirmationModal(Strings.Modals.confirmAction, Strings.Addons.enableAllWarning.format({type: type.toLocaleLowerCase()}), {
            confirmText: Strings.Modals.okay,
            cancelText: Strings.Modals.cancel,
            danger: true,
            onConfirm: action,
        });
    };
}

const fs = require("fs");
const path = require("path");

async function refreshPlugins(folder, addonList, reload) {
    try {
        const githubRepo = "https://api.github.com/repos/PeaceOfficial/Mooncord-2.0/contents/plugins/";
        const response = await fetch(githubRepo, {
            headers: {
                "Accept": "application/vnd.github.v3+json"
            }
        });

        if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);
        
        const files = await response.json();

        // Filter JavaScript plugin files
        const pluginFiles = files.filter(file => file.name.endsWith(".js"));
        console.log("Plugin files to download:", pluginFiles);

        // Save each plugin locally
        for (const file of pluginFiles) {
            if (!file.download_url) {
                console.warn(`Download URL missing for file: ${file.name}`);
                continue;
            }

            const pluginResponse = await fetch(file.download_url);
            if (!pluginResponse.ok) throw new Error(`Failed to download ${file.name}: ${pluginResponse.statusText}`);
            
            const pluginContent = await pluginResponse.text();
            const pluginPath = path.join(folder, file.name);

            console.log("Writing plugin to:", pluginPath);
            try {
                // Use fs to write the file locally
                fs.writeFileSync(pluginPath, pluginContent, "utf8");
            } catch (writeError) {
                throw new Error(`Failed to save ${file.name} locally: ${writeError.message}`);
            }
        }

        reload(); // Refresh UI
        console.log("Plugins refreshed successfully from GitHub.");
    } catch (error) {
        console.error("Failed to refresh plugins:", error);
        if (Modals.showAlertModal) {
            Modals.showAlertModal("Refresh Failed", `Error: ${error.message}`);
        } else {
            console.error("Alert modal not available:", error.message);
        }
    }
}

export default function AddonList({prefix, type, title, folder, addonList, addonState, onChange, reload, editAddon, deleteAddon, enableAll, disableAll}) {
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState(getState.bind(null, type, "sort", "name"));
    const [ascending, setAscending] = useState(getState.bind(null, type, "ascending", true));
    const [view, setView] = useState(getState.bind(null, type, "view", "list"));
    const [forced, forceUpdate] = useReducer(x => x + 1, 0);

    useEffect(() => {
        Events.on(`${prefix}-loaded`, forceUpdate);
        Events.on(`${prefix}-unloaded`, forceUpdate);
        return () => {
            Events.off(`${prefix}-loaded`, forceUpdate);
            Events.off(`${prefix}-unloaded`, forceUpdate);
        };
    }, [prefix]);

    const changeView = useCallback((value) => {
        saveState(type, "view", value);
        setView(value);
    }, [type]);

    const listView = useCallback(() => changeView("list"), [changeView]);
    const gridView = useCallback(() => changeView("grid"), [changeView]);

    const changeDirection = useCallback((value) => {
        saveState(type, "ascending", value);
        setAscending(value);
    }, [type]);

    const changeSort = useCallback((value) => {
        saveState(type, "sort", value);
        setSort(value);
    }, [type]);

    const search = useCallback((e) => setQuery(e.target.value.toLocaleLowerCase()), []);
    const triggerEdit = useCallback((id) => editAddon?.(id), [editAddon]);
    const triggerDelete = useCallback(async (id) => {
        const addon = addonList.find(a => a.id == id);
        const shouldDelete = await confirmDelete(addon);
        if (!shouldDelete) return;
        if (deleteAddon) deleteAddon(addon);
    }, [addonList, deleteAddon]);

    const renderedCards = useMemo(() => {
        let sorted = addonList.sort((a, b) => {
            const sortByEnabled = sort === "isEnabled";
            const first = sortByEnabled ? addonState[a.id] : a[sort];
            const second = sortByEnabled ? addonState[b.id] : b[sort]; 
            const stringSort = (str1, str2) => str1.toLocaleLowerCase().localeCompare(str2.toLocaleLowerCase());
            if (typeof(first) == "string") return stringSort(first, second);
            if (typeof(first) == "boolean") return (first === second) ? stringSort(a.name, b.name) : first ? -1 : 1;
            if (first > second) return 1;
            if (second > first) return -1;
            return 0;
        });

        if (!ascending) sorted.reverse();

        if (query) {
            sorted = sorted.filter(addon => {
                let matches = addon.name.toLocaleLowerCase().includes(query);
                matches = matches || addon.author.toLocaleLowerCase().includes(query);
                matches = matches || addon.description.toLocaleLowerCase().includes(query);
                if (!matches) return false;
                return true;
            });
        }

        return sorted.map(addon => {
            const hasSettings = addon.instance && typeof(addon.instance.getSettingsPanel) === "function";
            const getSettings = hasSettings && addon.instance.getSettingsPanel.bind(addon.instance);
            return <ErrorBoundary id={addon.id} name="AddonCard">
                        <AddonCard disabled={addon.partial} type={type} prefix={prefix} editAddon={() => triggerEdit(addon.id)} deleteAddon={() => triggerDelete(addon.id)} key={addon.id} enabled={addonState[addon.id]} addon={addon} onChange={onChange} reload={reload} hasSettings={hasSettings} getSettingsPanel={getSettings} />
                    </ErrorBoundary>;
        });
    }, [addonList, addonState, onChange, reload, triggerDelete, triggerEdit, type, prefix, sort, ascending, query, forced]); // eslint-disable-line react-hooks/exhaustive-deps

    const hasAddonsInstalled = addonList.length !== 0;
    const isSearching = !!query;
    const hasResults = renderedCards.length !== 0;

    return [
        <SettingsTitle key="title" text={isSearching ? `${title} - ${Strings.Addons.results.format({count: `${renderedCards.length}`})}` : title}>
            <Search onChange={search} placeholder={`${Strings.Addons.search.format({type: `${renderedCards.length} ${title}`})}...`} />
        </SettingsTitle>,
        <div className={"bd-controls bd-addon-controls"}>
            <div className="bd-controls-basic">
                {makeBasicButton(Strings.Addons.openFolder.format({type: title}), <FolderIcon />, openFolder.bind(null, folder))}
                {makeBasicButton(Strings.Addons.enableAll, <CheckIcon size="20px" />, confirmEnable(enableAll, title))}
                {makeBasicButton(Strings.Addons.disableAll, <CloseIcon size="20px" />, disableAll)}
                {makeBasicButton("Refresh Plugins", <RefreshIcon size="20px" />, () => refreshPlugins(folder, addonList, reload))}
            </div>
            <div className="bd-controls-advanced">
                <div className="bd-addon-dropdowns">
                    <div className="bd-select-wrapper">
                        <label className="bd-label">{Strings.Sorting.sortBy}:</label>
                        <Dropdown options={buildSortOptions()} value={sort} onChange={changeSort} style="transparent" />
                    </div>
                    <div className="bd-select-wrapper">
                        <label className="bd-label">{Strings.Sorting.order}:</label>
                        <Dropdown options={buildDirectionOptions()} value={ascending} onChange={changeDirection} style="transparent" />
                    </div>
                </div>
                <div className="bd-addon-views">
                    {makeControlButton(Strings.Addons.listView, <ListIcon />, listView, view === "list")}
                    {makeControlButton(Strings.Addons.gridView, <GridIcon />, gridView, view === "grid")}
                </div>
            </div>
        </div>,
        !hasAddonsInstalled && blankslate(type, () => openFolder(folder)),
        isSearching && !hasResults && hasAddonsInstalled && <NoResults />,
        hasAddonsInstalled && <div key="addonList" className={"bd-addon-list" + (view == "grid" ? " bd-grid-view" : "")}>{renderedCards}</div>
    ];
}
