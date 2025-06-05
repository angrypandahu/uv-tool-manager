import * as vscode from 'vscode';
import { CaseTreeItem } from '../models/Case';
import { CommandTreeItem } from '../models/Command';
import { CaseService } from '../services/CaseService';
import { CommandService } from '../services/CommandService';
import { SettingsService } from '../services/SettingsService';

export class UvToolProvider implements vscode.TreeDataProvider<CommandTreeItem | CaseTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<CommandTreeItem | CaseTreeItem | undefined | void> = new vscode.EventEmitter<CommandTreeItem | CaseTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<CommandTreeItem | CaseTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private lastTasksRoot: CommandTreeItem;
    private favoritesRoot: CommandTreeItem;
    private searchResults: (CommandTreeItem | CaseTreeItem)[] = [];
    private isSearching = false;

    constructor(
        private context: vscode.ExtensionContext,
        private commandService: CommandService,
        private caseService: CaseService,
        private settingsService: SettingsService
    ) {
        this.lastTasksRoot = new CommandTreeItem(
            'Last Tasks',
            vscode.TreeItemCollapsibleState.Collapsed,
            [],
            new vscode.ThemeIcon('folder')
        );
        this.favoritesRoot = new CommandTreeItem(
            'Favorites',
            vscode.TreeItemCollapsibleState.Collapsed,
            [],
            new vscode.ThemeIcon('star')
        );
    }

    async refresh() {
        this.clearSearch();
        await this.commandService.loadCommands();
        this._onDidChangeTreeData.fire();
        vscode.window.showInformationMessage('项目列表已刷新');
    }

    getTreeItem(element: CommandTreeItem | CaseTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: CommandTreeItem | CaseTreeItem): Promise<(CommandTreeItem | CaseTreeItem)[]> {
        if (this.isSearching) {
            if (!element) {
                return this.searchResults;
            }
            return [];
        }

        if (!element) {
            return [this.lastTasksRoot, this.favoritesRoot, this.commandService.getRoot()!];
        }
        if (element.contextValue === 'uvCommand') {
            return this.caseService.getCasesForCommand(element as CommandTreeItem);
        }

        if (element === this.lastTasksRoot) {
            const tasks = this.settingsService.getLastTasks();
            tasks.forEach(task => {
                task.contextValue = 'lastTask';
            });
            return tasks;
        }

        if (element === this.favoritesRoot) {
            return this.settingsService.getFavorites();
        }

        if (element instanceof CommandTreeItem) {
            return element.children;
        }

        return [];
    }

    search(searchTerm: string) {
        this.isSearching = true;
        this.searchResults = [];
        
        const root = this.commandService.getRoot();
        if (root) {
            for (const pkg of root.children) {
                for (const cmd of pkg.children) {
                    if (cmd.label.toLowerCase().includes(searchTerm.toLowerCase())) {
                        this.searchResults.push(cmd);
                    }
                    const cases = this.caseService.getCasesForCommand(cmd);
                    for (const c of cases) {
                        if (c.caseName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.caseCommand.toLowerCase().includes(searchTerm.toLowerCase())) {
                            this.searchResults.push(c);
                        }
                    }
                }
            }
        }

        this._onDidChangeTreeData.fire();
    }

    clearSearch() {
        this.isSearching = false;
        this.searchResults = [];
        this._onDidChangeTreeData.fire();
    }

    addCaseToCommand(commandItem: CommandTreeItem, caseName: string, caseCommand: string) {
        this.caseService.addCaseToCommand(commandItem, caseName, caseCommand);
        this._onDidChangeTreeData.fire(commandItem);
    }

    deleteCase(item: CaseTreeItem) {
        const parentCommand = this.caseService.deleteCase(item);
        if (parentCommand) {
            this._onDidChangeTreeData.fire(parentCommand);
        } else {
            this._onDidChangeTreeData.fire();
        }
    }

    addToLastTasks(caseItem: CaseTreeItem) {
        this.settingsService.addToLastTasks(caseItem);
        this._onDidChangeTreeData.fire(this.lastTasksRoot);
        this.refresh();
    }

    addToFavorites(caseItem: CaseTreeItem) {
        this.settingsService.addToFavorites(caseItem);
        this._onDidChangeTreeData.fire(this.favoritesRoot);
        this.refresh();
    }

    removeFromFavorites(caseItem: CaseTreeItem) {
        this.settingsService.removeFromFavorites(caseItem);
        this._onDidChangeTreeData.fire(this.favoritesRoot);
        this.refresh();
    }

    async bindKeybinding(caseItem: CaseTreeItem) {
        await this.settingsService.bindKeybinding(caseItem);
    }

    async unbindKeybinding(keybinding: string) {
        await this.settingsService.unbindKeybinding(keybinding);
    }

    clearLastTasks() {
        this.settingsService.clearLastTasks();
        this._onDidChangeTreeData.fire(this.lastTasksRoot);
    }

    clearFavorites() {
        this.settingsService.clearFavorites();
        this._onDidChangeTreeData.fire(this.favoritesRoot);
    }

    async exportSettings() {
        await this.settingsService.exportSettings();
    }

    async importSettings() {
        await this.settingsService.importSettings();
        this._onDidChangeTreeData.fire();
    }

    removeFromLastTasks(caseItem: CaseTreeItem) {
        this.settingsService.removeFromLastTasks(caseItem);
        this._onDidChangeTreeData.fire(this.lastTasksRoot);
        this.refresh();
    }
} 