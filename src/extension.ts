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
		vscode.commands.registerCommand('myProjects.createCase', async (item: UvTreeItem) => {
			const caseName = await vscode.window.showInputBox({
				prompt: '请输入用例名称',
				placeHolder: '用例名称'
			});
			if (!caseName) return;
			const caseCommand = await vscode.window.showInputBox({
				prompt: '请输入用例命令',
				placeHolder: '用例命令'
			});
			if (!caseCommand) return;
			provider.addCaseToCommand(item, caseName, caseCommand);
		})
	);

	// 注册运行用例命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.runCase', (item: CaseTreeItem) => {
			if (item && item.caseCommand) {
				const terminal = vscode.window.createTerminal(`用例: ${item.caseName}`);
				terminal.show();
				terminal.sendText(item.caseCommand);
			}
		})
	);
}

class UvTreeItem extends vscode.TreeItem {
	public parent: UvTreeItem | null = null;

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

// 用例节点类型
class CaseTreeItem extends UvTreeItem {
	constructor(
		public readonly caseName: string,
		public readonly caseCommand: string
	) {
		super(caseName, vscode.TreeItemCollapsibleState.None, [], new vscode.ThemeIcon('symbol-event'), 'uvCase');
		this.tooltip = caseCommand;
		this.description = caseCommand;
	}
}

class UvToolProvider implements vscode.TreeDataProvider<UvTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<UvTreeItem | undefined | void> = new vscode.EventEmitter<UvTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<UvTreeItem | undefined | void> = this._onDidChangeTreeData.event;

	private uvToolRoot: UvTreeItem | null = null;
	private lastTasksRoot: UvTreeItem;
	private commandCases: Map<string, CaseTreeItem[]> = new Map<string, CaseTreeItem[]>();

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

			const uvToolChildren: UvTreeItem[] = [];
			let currentPkg: UvTreeItem | null = null;
			for (const line of lines) {
				if (/^[^-\s].* v\d+\.\d+\.\d+/.test(line)) {
					currentPkg = new UvTreeItem(line, vscode.TreeItemCollapsibleState.Collapsed, [], new vscode.ThemeIcon('package'));
					uvToolChildren.push(currentPkg);
				} else if (line.startsWith('- ') && currentPkg) {
					const toolName = line.replace(/^-\s*/, '');
					const cmdNode = new UvTreeItem(
						toolName,
						vscode.TreeItemCollapsibleState.Collapsed,
						[],
						new vscode.ThemeIcon('gear'),
						'uvCommand'
					);
					(cmdNode as UvTreeItem).parent = currentPkg;
					currentPkg.children.push(cmdNode);
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
			console.log('[getChildren] 顶层节点');
			return Promise.resolve([this.lastTasksRoot, this.uvToolRoot!]);
		}
		if (element.contextValue === 'uvCommand') {
			const key = this.getCommandKey(element);
			const cases = this.commandCases.get(key) || [];
			console.log(`[getChildren] 命令节点: ${element.label}, key: ${key}, cases:`, cases.map(c => c.label));
			return Promise.resolve(cases);
		}
		console.log(`[getChildren] 其他节点: ${element.label}, children:`, element.children.map(c => c.label));
		return Promise.resolve(element.children);
	}

	addCaseToCommand(commandItem: UvTreeItem, caseName: string, caseCommand: string) {
		if (commandItem.contextValue === 'uvCommand') {
			const key = this.getCommandKey(commandItem);
			const cases = this.commandCases.get(key) || [];
			cases.push(new CaseTreeItem(caseName, caseCommand));
			this.commandCases.set(key, cases);
			console.log(`[addCaseToCommand] 添加用例: ${caseName}, key: ${key}, 当前用例数: ${cases.length}`);
			this._onDidChangeTreeData.fire(commandItem);
		}
	}
	private getCommandKey(commandItem: UvTreeItem): string {
		return `${commandItem.parent?.label || ''}::${commandItem.label}`;
	}
}
