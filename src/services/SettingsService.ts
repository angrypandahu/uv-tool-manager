import * as vscode from 'vscode';
import { CaseData, CaseTreeItem } from '../models/Case';
import { KeybindingConfig, SettingsData, StorageKeys } from '../models/Settings';

export class SettingsService {
    private lastTasks: CaseTreeItem[] = [];
    private favorites: CaseTreeItem[] = [];
    private keybindings = new Map<string, CaseTreeItem>();
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadLastTasks();
        this.loadFavorites();
        this.loadKeybindings();
    }

    private loadLastTasks() {
        const tasks = this.context.globalState.get<CaseData[]>(StorageKeys.LAST_TASKS, []);
        this.lastTasks = tasks.map(task => new CaseTreeItem(task.caseName, task.caseCommand));
    }

    private saveLastTasks() {
        const tasks = this.lastTasks.map(task => task.toCase().toData());
        this.context.globalState.update(StorageKeys.LAST_TASKS, tasks);
    }

    private loadFavorites() {
        const favs = this.context.globalState.get<CaseData[]>(StorageKeys.FAVORITES, []);
        this.favorites = favs.map(fav => new CaseTreeItem(fav.caseName, fav.caseCommand, true));
    }

    private saveFavorites() {
        const favs = this.favorites.map(fav => fav.toCase().toData());
        this.context.globalState.update(StorageKeys.FAVORITES, favs);
    }

    private loadKeybindings() {
        const bindings = this.context.globalState.get<Record<string, CaseData>>(StorageKeys.KEYBINDINGS, {});
        this.keybindings.clear();
        for (const [key, data] of Object.entries(bindings)) {
            this.keybindings.set(key, new CaseTreeItem(data.caseName, data.caseCommand));
        }
    }

    private saveKeybindings() {
        const bindings: Record<string, CaseData> = {};
        for (const [key, item] of this.keybindings.entries()) {
            bindings[key] = item.toCase().toData();
        }
        this.context.globalState.update(StorageKeys.KEYBINDINGS, bindings);
    }

    getLastTasks(): CaseTreeItem[] {
        return this.lastTasks;
    }

    getFavorites(): CaseTreeItem[] {
        return this.favorites;
    }

    getKeybindings(): Map<string, CaseTreeItem> {
        return this.keybindings;
    }

    addToLastTasks(caseItem: CaseTreeItem) {
        const existingIndex = this.lastTasks.findIndex(
            task => task.caseName === caseItem.caseName && task.caseCommand === caseItem.caseCommand
        );

        if (existingIndex !== -1) {
            this.lastTasks.splice(existingIndex, 1);
        }

        this.lastTasks.unshift(caseItem);

        if (this.lastTasks.length > 10) {
            this.lastTasks.pop();
        }

        this.saveLastTasks();
    }

    addToFavorites(caseItem: CaseTreeItem) {
        const existingIndex = this.favorites.findIndex(
            fav => fav.caseName === caseItem.caseName && fav.caseCommand === caseItem.caseCommand
        );

        if (existingIndex === -1) {
            const favoriteItem = new CaseTreeItem(caseItem.caseName, caseItem.caseCommand, true);
            this.favorites.push(favoriteItem);
            this.saveFavorites();
            vscode.window.showInformationMessage(`已添加到收藏夹: ${caseItem.caseName}`);
        } else {
            vscode.window.showInformationMessage(`已在收藏夹中: ${caseItem.caseName}`);
        }
    }

    removeFromFavorites(caseItem: CaseTreeItem) {
        const index = this.favorites.findIndex(
            fav => fav.caseName === caseItem.caseName && fav.caseCommand === caseItem.caseCommand
        );

        if (index !== -1) {
            this.favorites.splice(index, 1);
            this.saveFavorites();
            vscode.window.showInformationMessage(`已从收藏夹移除: ${caseItem.caseName}`);
        }
    }

    async bindKeybinding(caseItem: CaseTreeItem) {
        const keybinding = await vscode.window.showInputBox({
            prompt: '请输入快捷键（例如：ctrl+shift+1）',
            placeHolder: '快捷键'
        });

        if (keybinding) {
            if (this.keybindings.has(keybinding)) {
                vscode.window.showWarningMessage(`快捷键 ${keybinding} 已被使用`);
                return;
            }

            this.keybindings.set(keybinding, caseItem);
            this.saveKeybindings();

            const keybindingsConfig = vscode.workspace.getConfiguration('keyboard.dispatch');
            const keybindings = keybindingsConfig.get<KeybindingConfig[]>('keybindings') || [];
            
            keybindings.push({
                key: keybinding,
                command: 'myProjects.runCaseWithKeybinding',
                args: {
                    caseName: caseItem.caseName,
                    caseCommand: caseItem.caseCommand
                },
                when: 'view == myProjects'
            });

            await keybindingsConfig.update('keybindings', keybindings, true);
            vscode.window.showInformationMessage(`已绑定快捷键 ${keybinding} 到用例 ${caseItem.caseName}`);
        }
    }

    async unbindKeybinding(keybinding: string) {
        if (this.keybindings.has(keybinding)) {
            this.keybindings.delete(keybinding);
            this.saveKeybindings();

            const keybindingsConfig = vscode.workspace.getConfiguration('keyboard.dispatch');
            const keybindings = keybindingsConfig.get<KeybindingConfig[]>('keybindings') || [];
            
            const newKeybindings = keybindings.filter(k => k.key !== keybinding);
            await keybindingsConfig.update('keybindings', newKeybindings, true);

            vscode.window.showInformationMessage(`已解除快捷键 ${keybinding} 的绑定`);
        }
    }

    async bindKeybindingWithKey(key: string, caseItem: CaseTreeItem) {
        if (this.keybindings.has(key)) {
            vscode.window.showWarningMessage(`快捷键 ${key} 已被使用`);
            return;
        }
        this.keybindings.set(key, caseItem);
        this.saveKeybindings();

        const keybindingsConfig = vscode.workspace.getConfiguration('keyboard.dispatch');
        const keybindings = keybindingsConfig.get<KeybindingConfig[]>('keybindings') || [];
        keybindings.push({
            key: key,
            command: 'myProjects.runCaseWithKeybinding',
            args: {
                caseName: caseItem.caseName,
                caseCommand: caseItem.caseCommand
            },
            when: 'view == myProjects'
        });
        await keybindingsConfig.update('keybindings', keybindings, true);
        vscode.window.showInformationMessage(`已绑定快捷键 ${key} 到用例 ${caseItem.caseName}`);
    }

    clearLastTasks() {
        this.lastTasks = [];
        this.context.globalState.update(StorageKeys.LAST_TASKS, []);
        vscode.window.showInformationMessage('已清空最近任务');
    }

    clearFavorites() {
        this.favorites = [];
        this.context.globalState.update(StorageKeys.FAVORITES, []);
        vscode.window.showInformationMessage('已清空收藏夹');
    }

    async exportSettings() {
        const settings: SettingsData = {
            lastTasks: this.lastTasks.map(task => task.toCase().toData()),
            favorites: this.favorites.map(fav => fav.toCase().toData()),
            keybindings: Object.fromEntries(
                Array.from(this.keybindings.entries()).map(([key, item]) => [
                    key,
                    item.toCase().toData()
                ])
            )
        };

        const content = JSON.stringify(settings, null, 2);
        const uri = await vscode.window.showSaveDialog({
            filters: {
                'JSON': ['json']
            },
            defaultUri: vscode.Uri.file('uv-tool-settings.json')
        });

        if (uri) {
            try {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
                vscode.window.showInformationMessage('配置已导出');
            } catch (error) {
                vscode.window.showErrorMessage(`导出配置失败: ${error}`);
            }
        }
    }

    async importSettings() {
        const uri = await vscode.window.showOpenDialog({
            filters: {
                'JSON': ['json']
            },
            canSelectMany: false
        });

        if (uri && uri[0]) {
            try {
                const content = await vscode.workspace.fs.readFile(uri[0]);
                const settings = JSON.parse(content.toString()) as SettingsData;

                if (settings.lastTasks) {
                    this.lastTasks = settings.lastTasks.map(task => 
                        new CaseTreeItem(task.caseName, task.caseCommand));
                    this.context.globalState.update(StorageKeys.LAST_TASKS, settings.lastTasks);
                }

                if (settings.favorites) {
                    this.favorites = settings.favorites.map(fav => 
                        new CaseTreeItem(fav.caseName, fav.caseCommand, true));
                    this.context.globalState.update(StorageKeys.FAVORITES, settings.favorites);
                }

                if (settings.keybindings) {
                    this.keybindings.clear();
                    for (const [key, data] of Object.entries(settings.keybindings)) {
                        this.keybindings.set(key, new CaseTreeItem(data.caseName, data.caseCommand));
                    }
                    this.saveKeybindings();
                }

                vscode.window.showInformationMessage('配置已导入');
            } catch (error) {
                vscode.window.showErrorMessage(`导入配置失败: ${error}`);
            }
        }
    }

    getAllCases(): CaseData[] {
        const caseSet = new Map<string, CaseData>();
        
        // 从最近任务中获取
        for (const task of this.lastTasks) {
            caseSet.set(task.caseName + task.caseCommand, task.toCase().toData());
        }
        
        // 从收藏夹中获取
        for (const fav of this.favorites) {
            caseSet.set(fav.caseName + fav.caseCommand, fav.toCase().toData());
        }
        
        // 从快捷键绑定中获取
        for (const item of this.keybindings.values()) {
            caseSet.set(item.caseName + item.caseCommand, item.toCase().toData());
        }
        
        return Array.from(caseSet.values());
    }
} 