import * as vscode from 'vscode';

export class CommandTreeItem extends vscode.TreeItem {
    public parent: CommandTreeItem | null = null;
    public children: CommandTreeItem[] = [];

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        children: CommandTreeItem[] = [],
        public readonly iconPath?: vscode.ThemeIcon,
        public readonly contextValue?: string
    ) {
        super(label, collapsibleState);
        this.children = children;
        if (iconPath) {
            this.iconPath = iconPath;
        }
        if (contextValue) {
            this.contextValue = contextValue;
        }
    }

    getCommandKey(): string {
        return `${this.parent?.label || ''}::${this.label}`;
    }
} 