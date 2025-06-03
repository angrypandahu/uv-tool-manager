import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { CommandTreeItem } from '../models/Command';

const execAsync = promisify(exec);

export class CommandService {
    private uvToolRoot: CommandTreeItem | null = null;

    async loadCommands(): Promise<CommandTreeItem> {
        try {
            const { stdout } = await execAsync('uv tool list');
            const lines = stdout.split('\n').map(line => line.trim()).filter(line => line);

            const uvToolChildren: CommandTreeItem[] = [];
            let currentPkg: CommandTreeItem | null = null;

            for (const line of lines) {
                if (/^[^-\s].* v\d+\.\d+\.\d+/.test(line)) {
                    currentPkg = new CommandTreeItem(
                        line,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        [],
                        new vscode.ThemeIcon('package')
                    );
                    uvToolChildren.push(currentPkg);
                } else if (line.startsWith('- ') && currentPkg) {
                    const toolName = line.replace(/^-\s*/, '');
                    const cmdNode = new CommandTreeItem(
                        toolName,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        [],
                        new vscode.ThemeIcon('gear'),
                        'uvCommand'
                    );
                    cmdNode.parent = currentPkg;
                    currentPkg.children.push(cmdNode);
                }
            }

            this.uvToolRoot = new CommandTreeItem(
                'UV Tool List',
                vscode.TreeItemCollapsibleState.Expanded,
                uvToolChildren,
                new vscode.ThemeIcon('folder')
            );

            return this.uvToolRoot;
        } catch (error) {
            vscode.window.showErrorMessage(`加载命令列表失败: ${error}`);
            this.uvToolRoot = new CommandTreeItem(
                'UV Tool List',
                vscode.TreeItemCollapsibleState.None,
                [],
                new vscode.ThemeIcon('folder')
            );
            return this.uvToolRoot;
        }
    }

    getRoot(): CommandTreeItem | null {
        return this.uvToolRoot;
    }
} 