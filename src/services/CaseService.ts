import * as vscode from 'vscode';
import { CaseData, CaseTreeItem } from '../models/Case';
import { CommandTreeItem } from '../models/Command';
import { StorageKeys } from '../models/Settings';
import { CommandService } from './CommandService';

export class CaseService {
    private commandCases: Map<string, CaseTreeItem[]> = new Map<string, CaseTreeItem[]>();
    private context: vscode.ExtensionContext;
    private commandService: CommandService;

    constructor(context: vscode.ExtensionContext, commandService: CommandService) {
        this.context = context;
        this.commandService = commandService;
        this.loadPersistedCases();
    }

    private loadPersistedCases() {
        const arr = this.context.globalState.get<{ commandKey: string; caseName: string; caseCommand: string }[]>(StorageKeys.CASES, []);
        this.commandCases.clear();
        if (arr.length === 0) {
            // 遍历所有 command，添加 command --help 用例
            const root = this.commandService.getRoot();
            if (root) {
                for (const pkg of root.children) {
                    for (const cmd of pkg.children) {
                        if (cmd.contextValue === 'uvCommand') {
                            const key = cmd.getCommandKey();
                            const helpCase = new CaseTreeItem('--help', `${cmd.label} --help`);
                            this.commandCases.set(key, [helpCase]);
                        }
                    }
                }
            }
            this.savePersistedCases();
        } else {
            for (const c of arr) {
                const cases = this.commandCases.get(c.commandKey) || [];
                cases.push(new CaseTreeItem(c.caseName, c.caseCommand));
                this.commandCases.set(c.commandKey, cases);
            }
        }
    }

    private savePersistedCases() {
        const arr: { commandKey: string; caseName: string; caseCommand: string }[] = [];
        for (const [commandKey, cases] of this.commandCases.entries()) {
            for (const c of cases) {
                arr.push({ commandKey, caseName: c.caseName, caseCommand: c.caseCommand });
            }
        }
        this.context.globalState.update(StorageKeys.CASES, arr);
    }

    getCasesForCommand(commandItem: CommandTreeItem): CaseTreeItem[] {
        const key = commandItem.getCommandKey();
        return this.commandCases.get(key) || [];
    }

    addCaseToCommand(commandItem: CommandTreeItem, caseName: string, caseCommand: string) {
        if (commandItem.contextValue === 'uvCommand') {
            const key = commandItem.getCommandKey();
            const cases = this.commandCases.get(key) || [];
            cases.push(new CaseTreeItem(caseName, caseCommand));
            this.commandCases.set(key, cases);
            this.savePersistedCases();
        }
    }

    deleteCase(item: CaseTreeItem) {
        for (const [, cases] of this.commandCases.entries()) {
            const idx = cases.findIndex(c => c.caseName === item.caseName && c.caseCommand === item.caseCommand);
            if (idx !== -1) {
                cases.splice(idx, 1);
                this.savePersistedCases();
                break;
            }
        }
    }

    getAllCases(): CaseData[] {
        const caseSet = new Map<string, CaseData>();
        for (const cases of this.commandCases.values()) {
            for (const c of cases) {
                caseSet.set(c.caseName + c.caseCommand, c.toCase().toData());
            }
        }
        return Array.from(caseSet.values());
    }
} 