import * as vscode from 'vscode';

export interface CaseData {
    caseName: string;
    caseCommand: string;
}

export class Case {
    constructor(
        public readonly caseName: string,
        public readonly caseCommand: string,
        public readonly isFavorite = false
    ) {}

    toData(): CaseData {
        return {
            caseName: this.caseName,
            caseCommand: this.caseCommand
        };
    }

    static fromData(data: CaseData, isFavorite = false): Case {
        return new Case(data.caseName, data.caseCommand, isFavorite);
    }
}

export class CaseTreeItem extends vscode.TreeItem {
    constructor(
        public readonly caseName: string,
        public readonly caseCommand: string,
        public readonly isFavorite = false,
        public readonly isLastTask = false
    ) {
        super(caseName, vscode.TreeItemCollapsibleState.None);
        this.tooltip = caseCommand;
        this.description = caseCommand;
        this.iconPath = new vscode.ThemeIcon('symbol-event');
        this.setContextValue();
    }

    private setContextValue() {
        if (this.isLastTask) {
            this.contextValue = 'lastTask';
        } else if (this.isFavorite) {
            this.contextValue = 'favoriteCase';
        } else {
            this.contextValue = 'uvCase';
        }
    }

    toCase(): Case {
        return new Case(this.caseName, this.caseCommand, this.isFavorite);
    }
} 