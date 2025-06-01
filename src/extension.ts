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

	const provider = new UvToolProvider(context);
	vscode.window.registerTreeDataProvider('myProjects', provider);

	// 立即加载数据
	provider.refresh();

	// 注册刷新命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.refresh', () => provider.refresh())
	);

	// 注册搜索命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.search', async () => {
			const searchTerm = await vscode.window.showInputBox({
				prompt: '请输入搜索关键词',
				placeHolder: '搜索命令或用例'
			});
			if (searchTerm) {
				provider.search(searchTerm);
			}
		})
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
				// 添加到 Last Tasks
				provider['addToLastTasks'](item);
			}
		})
	);

	// 注册删除用例命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.deleteCase', (item: CaseTreeItem) => {
			provider.deleteCase(item);
		})
	);

	// 注册添加到收藏夹命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.addToFavorites', (item: CaseTreeItem) => {
			provider['addToFavorites'](item);
		})
	);

	// 注册从收藏夹移除命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.removeFromFavorites', (item: CaseTreeItem) => {
			provider['removeFromFavorites'](item);
		})
	);
}

class UvTreeItem extends vscode.TreeItem {
	public parent: UvTreeItem | null = null;
	public children: UvTreeItem[] = [];

	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		children: UvTreeItem[] = [],
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
}

// 用例节点类型
class CaseTreeItem extends UvTreeItem {
	constructor(
		public readonly caseName: string,
		public readonly caseCommand: string,
		public readonly isFavorite = false
	) {
		super(caseName, vscode.TreeItemCollapsibleState.None, [], new vscode.ThemeIcon('symbol-event'), isFavorite ? 'favoriteCase' : 'uvCase');
		this.tooltip = caseCommand;
		this.description = caseCommand;
	}
}

interface PersistedCase {
	commandKey: string;
	caseName: string;
	caseCommand: string;
}

class UvToolProvider implements vscode.TreeDataProvider<UvTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<UvTreeItem | undefined | void> = new vscode.EventEmitter<UvTreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<UvTreeItem | undefined | void> = this._onDidChangeTreeData.event;

	private uvToolRoot: UvTreeItem | null = null;
	private lastTasksRoot: UvTreeItem;
	private favoritesRoot: UvTreeItem;
	private commandCases: Map<string, CaseTreeItem[]> = new Map<string, CaseTreeItem[]>();
	private context: vscode.ExtensionContext;
	private static CASES_KEY = 'uvCases';
	private static LAST_TASKS_KEY = 'uvLastTasks';
	private static FAVORITES_KEY = 'uvFavorites';
	private searchResults: UvTreeItem[] = [];
	private isSearching = false;
	private lastTasks: CaseTreeItem[] = [];
	private favorites: CaseTreeItem[] = [];

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.lastTasksRoot = new UvTreeItem('Last Tasks', vscode.TreeItemCollapsibleState.Collapsed, [], new vscode.ThemeIcon('folder'));
		this.favoritesRoot = new UvTreeItem('Favorites', vscode.TreeItemCollapsibleState.Collapsed, [], new vscode.ThemeIcon('star'));
		this.uvToolRoot = new UvTreeItem('UV Tool List', vscode.TreeItemCollapsibleState.Expanded, [], new vscode.ThemeIcon('folder'));
		this.loadLastTasks();
		this.loadFavorites();
	}

	private loadLastTasks() {
		const tasks = this.context.globalState.get<{ caseName: string; caseCommand: string }[]>(UvToolProvider.LAST_TASKS_KEY, []);
		this.lastTasks = tasks.map(task => new CaseTreeItem(task.caseName, task.caseCommand));
		this.lastTasksRoot.children = this.lastTasks;
	}

	private saveLastTasks() {
		const tasks = this.lastTasks.map(task => ({
			caseName: task.caseName,
			caseCommand: task.caseCommand
		}));
		this.context.globalState.update(UvToolProvider.LAST_TASKS_KEY, tasks);
	}

	private addToLastTasks(caseItem: CaseTreeItem) {
		// 检查是否已存在相同的用例
		const existingIndex = this.lastTasks.findIndex(
			task => task.caseName === caseItem.caseName && task.caseCommand === caseItem.caseCommand
		);

		if (existingIndex !== -1) {
			// 如果存在，先移除旧的
			this.lastTasks.splice(existingIndex, 1);
		}

		// 添加到列表开头
		this.lastTasks.unshift(caseItem);

		// 保持最多10条记录
		if (this.lastTasks.length > 10) {
			this.lastTasks.pop();
		}

		// 更新视图
		this.lastTasksRoot.children = this.lastTasks;
		this.saveLastTasks();
		this._onDidChangeTreeData.fire(this.lastTasksRoot);
	}

	private loadFavorites() {
		const favs = this.context.globalState.get<{ caseName: string; caseCommand: string }[]>(UvToolProvider.FAVORITES_KEY, []);
		this.favorites = favs.map(fav => new CaseTreeItem(fav.caseName, fav.caseCommand, true));
		this.favoritesRoot.children = this.favorites;
	}

	private saveFavorites() {
		const favs = this.favorites.map(fav => ({
			caseName: fav.caseName,
			caseCommand: fav.caseCommand
		}));
		this.context.globalState.update(UvToolProvider.FAVORITES_KEY, favs);
	}

	private addToFavorites(caseItem: CaseTreeItem) {
		// 检查是否已存在
		const existingIndex = this.favorites.findIndex(
			fav => fav.caseName === caseItem.caseName && fav.caseCommand === caseItem.caseCommand
		);

		if (existingIndex === -1) {
			// 如果不存在，添加到列表
			const favoriteItem = new CaseTreeItem(caseItem.caseName, caseItem.caseCommand, true);
			this.favorites.push(favoriteItem);
			// 更新视图
			this.favoritesRoot.children = this.favorites;
			this.saveFavorites();
			this._onDidChangeTreeData.fire(this.favoritesRoot);
			vscode.window.showInformationMessage(`已添加到收藏夹: ${caseItem.caseName}`);
		} else {
			vscode.window.showInformationMessage(`已在收藏夹中: ${caseItem.caseName}`);
		}
	}

	private removeFromFavorites(caseItem: CaseTreeItem) {
		const index = this.favorites.findIndex(
			fav => fav.caseName === caseItem.caseName && fav.caseCommand === caseItem.caseCommand
		);

		if (index !== -1) {
			this.favorites.splice(index, 1);
			// 更新视图
			this.favoritesRoot.children = this.favorites;
			this.saveFavorites();
			this._onDidChangeTreeData.fire(this.favoritesRoot);
			vscode.window.showInformationMessage(`已从收藏夹移除: ${caseItem.caseName}`);
		}
	}

	async refresh() {
		// 清除搜索状态
		this.clearSearch();
		// 重新加载数据
		await this.loadData();
		// 通知视图更新
		this._onDidChangeTreeData.fire();
		// 显示提示信息
		vscode.window.showInformationMessage('项目列表已刷新');
	}

	private loadPersistedCases() {
		const arr = this.context.globalState.get<PersistedCase[]>(UvToolProvider.CASES_KEY, []);
		this.commandCases.clear();
		for (const c of arr) {
			const cases = this.commandCases.get(c.commandKey) || [];
			cases.push(new CaseTreeItem(c.caseName, c.caseCommand));
			this.commandCases.set(c.commandKey, cases);
		}
	}

	private savePersistedCases() {
		const arr: PersistedCase[] = [];
		for (const [commandKey, cases] of this.commandCases.entries()) {
			for (const c of cases) {
				arr.push({ commandKey, caseName: c.caseName, caseCommand: c.caseCommand });
			}
		}
		this.context.globalState.update(UvToolProvider.CASES_KEY, arr);
	}

	async loadData() {
		try {
			// 显示加载状态
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "正在加载项目列表...",
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 0 });

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
				progress.report({ increment: 100 });
			});
		} catch (error) {
			vscode.window.showErrorMessage(`加载项目列表失败: ${error}`);
			this.uvToolRoot = new UvTreeItem('UV Tool List', vscode.TreeItemCollapsibleState.None, [], new vscode.ThemeIcon('folder'));
		}
		this.loadPersistedCases();
	}

	getTreeItem(element: UvTreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: UvTreeItem): Thenable<UvTreeItem[]> {
		if (this.isSearching) {
			if (!element) {
				return Promise.resolve(this.searchResults);
			}
			return Promise.resolve([]);
		}

		if (!element) {
			console.log('[getChildren] 顶层节点');
			return Promise.resolve([this.lastTasksRoot, this.favoritesRoot, this.uvToolRoot!]);
		}
		if (element.contextValue === 'uvCommand') {
			const key = this.getCommandKey(element);
			const cases = this.commandCases.get(key) || [];
			console.log(`[getChildren] 命令节点: ${element.label}, key: ${key}, cases:`, cases.map(c => c.label));
			return Promise.resolve(cases);
		}
		if (element === this.lastTasksRoot) {
			return Promise.resolve(this.lastTasks);
		}
		if (element === this.favoritesRoot) {
			return Promise.resolve(this.favorites);
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
			this.savePersistedCases();
			console.log(`[addCaseToCommand] 添加用例: ${caseName}, key: ${key}, 当前用例数: ${cases.length}`);
			this._onDidChangeTreeData.fire(commandItem);
		}
	}

	deleteCase(item: CaseTreeItem) {
		for (const [key, cases] of this.commandCases.entries()) {
			console.log(`[deleteCase] 删除用例: ${item.caseName}, key: ${key}, 当前用例数: ${cases.length}`);
			const idx = cases.findIndex(c => c.caseName === item.caseName && c.caseCommand === item.caseCommand);
			if (idx !== -1) {
				cases.splice(idx, 1);
				this.savePersistedCases();
				this._onDidChangeTreeData.fire();
				break;
			}
		}
	}

	private getCommandKey(commandItem: UvTreeItem): string {
		return `${commandItem.parent?.label || ''}::${commandItem.label}`;
	}

	search(searchTerm: string) {
		this.isSearching = true;
		this.searchResults = [];
		
		// 搜索命令
		if (this.uvToolRoot) {
			for (const pkg of this.uvToolRoot.children) {
				for (const cmd of pkg.children) {
					if (cmd.label.toLowerCase().includes(searchTerm.toLowerCase())) {
						this.searchResults.push(cmd);
					}
					// 搜索用例
					const cases = this.commandCases.get(this.getCommandKey(cmd)) || [];
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
}
