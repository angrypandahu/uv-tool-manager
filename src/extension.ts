// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('扩展开始激活...');

	const provider = new UvToolProvider();
	vscode.window.registerTreeDataProvider('myProjects', provider);

	// 注册刷新命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.refresh', () => provider.refresh())
	);

	// 注册创建用例命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.createCase', (item: UvTreeItem) => {
			vscode.window.showInformationMessage(`为 ${item.label} 创建用例`);
		})
	);
}

class UvTreeItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly children: UvTreeItem[] = [],
		public readonly iconPath?: vscode.ThemeIcon,
		public readonly contextValue?: string
	) {
		super(label, collapsibleState);
		if (iconPath) {
			this.iconPath = iconPath;
		}
		if (contextValue) {
			this.contextValue = contextValue;
		}
	}
}

class UvToolProvider implements vscode.TreeDataProvider<UvTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<UvTreeItem | undefined | void> = new vscode.EventEmitter<UvTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<UvTreeItem | undefined | void> = this._onDidChangeTreeData.event;

	private uvToolRoot: UvTreeItem | null = null;
	private lastTasksRoot: UvTreeItem;

	constructor() {
		this.lastTasksRoot = new UvTreeItem('Last Tasks', vscode.TreeItemCollapsibleState.Collapsed, [], new vscode.ThemeIcon('folder'));
		this.refresh();
	}

	async refresh() {
		await this.loadData();
		this._onDidChangeTreeData.fire();
	}

	async loadData() {
		try {
			const { stdout } = await execAsync('uv tool list');
			const lines = stdout.split('\n').map(line => line.trim()).filter(line => line);

			// 解析格式：包名 vX.X.X，后跟若干 - 工具名
			const uvToolChildren: UvTreeItem[] = [];
			let currentPkg: UvTreeItem | null = null;
			for (const line of lines) {
				if (/^[^-\s].* v\d+\.\d+\.\d+/.test(line)) {
					// 包名+版本号
					currentPkg = new UvTreeItem(line, vscode.TreeItemCollapsibleState.Collapsed, [], new vscode.ThemeIcon('package'));
					uvToolChildren.push(currentPkg);
				} else if (line.startsWith('- ') && currentPkg) {
					// 工具名
					const toolName = line.replace(/^-\s*/, '');
					currentPkg.children.push(new UvTreeItem(toolName, vscode.TreeItemCollapsibleState.None, [], new vscode.ThemeIcon('gear'), 'uvCommand'));
				}
			}

			this.uvToolRoot = new UvTreeItem('UV Tool List', vscode.TreeItemCollapsibleState.Expanded, uvToolChildren, new vscode.ThemeIcon('folder'));
		} catch {
			this.uvToolRoot = new UvTreeItem('UV Tool List', vscode.TreeItemCollapsibleState.None, [], new vscode.ThemeIcon('folder'));
		}
	}

	getTreeItem(element: UvTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: UvTreeItem): Thenable<UvTreeItem[]> {
		if (!element) {
			// 顶层始终有两个分组
			return Promise.resolve([this.lastTasksRoot, this.uvToolRoot!]);
		}
		return Promise.resolve(element.children);
	}
}
