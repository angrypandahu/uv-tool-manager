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

	// 注册设置命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.settings', async () => {
			const settings = [
				{
					label: '清空最近任务',
					description: '清除所有最近执行的任务记录'
				},
				{
					label: '清空收藏夹',
					description: '清除所有收藏的用例'
				},
				{
					label: '管理快捷键',
					description: '查看和管理用例的快捷键绑定'
				},
				{
					label: '导出配置',
					description: '导出当前所有配置到文件'
				},
				{
					label: '导入配置',
					description: '从文件导入配置'
				}
			];

			const selected = await vscode.window.showQuickPick(settings, {
				placeHolder: '选择设置选项'
			});

			if (selected) {
				switch (selected.label) {
					case '清空最近任务':
						provider.clearLastTasks();
						break;
					case '清空收藏夹':
						provider.clearFavorites();
						break;
					case '管理快捷键':
						vscode.commands.executeCommand('myProjects.manageKeybindings');
						break;
					case '导出配置':
						provider.exportSettings();
						break;
					case '导入配置':
						provider.importSettings();
						break;
				}
			}
		})
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

	// 注册绑定快捷键命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.bindKeybinding', (item: CaseTreeItem) => {
			provider.bindKeybinding(item);
		})
	);

	// 注册解除快捷键绑定命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.unbindKeybinding', (keybinding: string) => {
			provider.unbindKeybinding(keybinding);
		})
	);

	// 注册通过快捷键执行用例命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.runCaseWithKeybinding', (args: { caseName: string; caseCommand: string }) => {
			if (args && args.caseCommand) {
				const terminal = vscode.window.createTerminal(`用例: ${args.caseName}`);
				terminal.show();
				terminal.sendText(args.caseCommand);
			}
		})
	);

	// 注册管理快捷键命令（Webview弹窗，显示所有用例）
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.manageKeybindings', () => {
			const panel = vscode.window.createWebviewPanel(
				'manageKeybindings',
				'管理快捷键',
				vscode.ViewColumn.One,
				{ enableScripts: true }
			);

			function getAllCases() {
				return provider.getAllCases();
			}
			function findKey(caseName: string, caseCommand: string) {
				for (const [key, item] of provider['keybindings'].entries()) {
					if (item.caseName === caseName && item.caseCommand === caseCommand) return key;
				}
				return '';
			}

			function getKeybindingsHtml(
				allCases: { caseName: string, caseCommand: string }[]
			) {
				return `
					<html>
					<body>
						<h2>所有用例快捷键管理</h2>
						<table border="1" style="width:100%;border-collapse:collapse;">
							<tr>
								<th>用例名</th>
								<th>命令</th>
								<th>当前快捷键</th>
								<th>操作</th>
							</tr>
							${allCases.map(c => {
								const key = findKey(c.caseName, c.caseCommand);
								const inputId = `key_${encodeURIComponent(c.caseName)}_${encodeURIComponent(c.caseCommand)}`;
								return `
									<tr>
										<td>${c.caseName}</td>
										<td><code>${c.caseCommand}</code></td>
										<td>
											${key ? key : `<input type="text" id="${inputId}" style="width:100px;" placeholder="未绑定" />`}
										</td>
										<td>
											${key
												? `<button onclick="unbind('${key}')">解绑</button>`
												: `<button onclick="bind('${c.caseName}','${c.caseCommand}','${inputId}')">绑定</button>`
											}
										</td>
									</tr>
								`;
							}).join('')}
						</table>
						<script>
							const vscode = acquireVsCodeApi();
							function unbind(key) {
								vscode.postMessage({ command: 'unbind', key });
							}
							function bind(caseName, caseCommand, inputId) {
								const key = document.getElementById(inputId).value;
								vscode.postMessage({ command: 'bind', caseName, caseCommand, key });
							}
						</script>
					</body>
					</html>
				`;
			}

			function refreshWebview() {
				const allCases = getAllCases();
				panel.webview.html = getKeybindingsHtml(allCases);
			}

			refreshWebview();

			// 监听解绑和绑定事件
			panel.webview.onDidReceiveMessage(
				message => {
					if (message.command === 'unbind') {
						provider['unbindKeybinding'](message.key);
					}
					if (message.command === 'bind') {
						if (message.key) {
							provider['bindKeybinding'](
								new CaseTreeItem(message.caseName, message.caseCommand)
							);
						}
					}
					// 刷新页面
					refreshWebview();
				},
				undefined,
				context.subscriptions
			);
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

interface CaseData {
	caseName: string;
	caseCommand: string;
}

interface SettingsData {
	lastTasks: CaseData[];
	favorites: CaseData[];
	keybindings: Record<string, CaseData>;
}

interface KeybindingConfig {
	key: string;
	command: string;
	args: {
		caseName: string;
		caseCommand: string;
	};
	when: string;
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
	private static KEYBINDINGS_KEY = 'uvKeybindings';
	private searchResults: UvTreeItem[] = [];
	private isSearching = false;
	private lastTasks: CaseTreeItem[] = [];
	private favorites: CaseTreeItem[] = [];
	private keybindings = new Map<string, CaseTreeItem>();

	constructor(context: vscode.ExtensionContext) {
		this.context = context;
		this.lastTasksRoot = new UvTreeItem('Last Tasks', vscode.TreeItemCollapsibleState.Collapsed, [], new vscode.ThemeIcon('folder'));
		this.favoritesRoot = new UvTreeItem('Favorites', vscode.TreeItemCollapsibleState.Collapsed, [], new vscode.ThemeIcon('star'));
		this.uvToolRoot = new UvTreeItem('UV Tool List', vscode.TreeItemCollapsibleState.Expanded, [], new vscode.ThemeIcon('folder'));
		this.loadLastTasks();
		this.loadFavorites();
		this.loadKeybindings();
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

	private loadKeybindings() {
		const bindings = this.context.globalState.get<Record<string, CaseData>>(UvToolProvider.KEYBINDINGS_KEY, {});
		this.keybindings.clear();
		for (const [key, data] of Object.entries(bindings)) {
			this.keybindings.set(key, new CaseTreeItem(data.caseName, data.caseCommand));
		}
	}

	private saveKeybindings() {
		const bindings: Record<string, CaseData> = {};
		for (const [key, item] of this.keybindings.entries()) {
			bindings[key] = {
				caseName: item.caseName,
				caseCommand: item.caseCommand
			};
		}
		this.context.globalState.update(UvToolProvider.KEYBINDINGS_KEY, bindings);
	}

	async bindKeybinding(caseItem: CaseTreeItem) {
		const keybinding = await vscode.window.showInputBox({
			prompt: '请输入快捷键（例如：ctrl+shift+1）',
			placeHolder: '快捷键'
		});

		if (keybinding) {
			// 检查快捷键是否已被使用
			if (this.keybindings.has(keybinding)) {
				vscode.window.showWarningMessage(`快捷键 ${keybinding} 已被使用`);
				return;
			}

			// 添加新的快捷键绑定
			this.keybindings.set(keybinding, caseItem);
			this.saveKeybindings();

			// 更新 keybindings.json
			const keybindingsConfig = vscode.workspace.getConfiguration('keyboard.dispatch');
			const keybindings = keybindingsConfig.get<KeybindingConfig[]>('keybindings') || [];
			
			// 添加新的快捷键配置
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

			// 更新 keybindings.json
			const keybindingsConfig = vscode.workspace.getConfiguration('keyboard.dispatch');
			const keybindings = keybindingsConfig.get<KeybindingConfig[]>('keybindings') || [];
			
			// 移除快捷键配置
			const newKeybindings = keybindings.filter(k => k.key !== keybinding);
			await keybindingsConfig.update('keybindings', newKeybindings, true);

			vscode.window.showInformationMessage(`已解除快捷键 ${keybinding} 的绑定`);
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

	clearLastTasks() {
		this.lastTasks = [];
		this.lastTasksRoot.children = [];
		this.context.globalState.update(UvToolProvider.LAST_TASKS_KEY, []);
		this._onDidChangeTreeData.fire(this.lastTasksRoot);
		vscode.window.showInformationMessage('已清空最近任务');
	}

	clearFavorites() {
		this.favorites = [];
		this.favoritesRoot.children = [];
		this.context.globalState.update(UvToolProvider.FAVORITES_KEY, []);
		this._onDidChangeTreeData.fire(this.favoritesRoot);
		vscode.window.showInformationMessage('已清空收藏夹');
	}

	async exportSettings() {
		const settings: SettingsData = {
			lastTasks: this.lastTasks.map(task => ({
				caseName: task.caseName,
				caseCommand: task.caseCommand
			})),
			favorites: this.favorites.map(fav => ({
				caseName: fav.caseName,
				caseCommand: fav.caseCommand
			})),
			keybindings: Object.fromEntries(
				Array.from(this.keybindings.entries()).map(([key, item]) => [
					key,
					{
						caseName: item.caseName,
						caseCommand: item.caseCommand
					}
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
					this.lastTasksRoot.children = this.lastTasks;
					this.context.globalState.update(UvToolProvider.LAST_TASKS_KEY, settings.lastTasks);
				}

				if (settings.favorites) {
					this.favorites = settings.favorites.map(fav => 
						new CaseTreeItem(fav.caseName, fav.caseCommand, true));
					this.favoritesRoot.children = this.favorites;
					this.context.globalState.update(UvToolProvider.FAVORITES_KEY, settings.favorites);
				}

				if (settings.keybindings) {
					this.keybindings.clear();
					for (const [key, data] of Object.entries(settings.keybindings)) {
						this.keybindings.set(key, new CaseTreeItem(data.caseName, data.caseCommand));
					}
					this.saveKeybindings();
				}

				this._onDidChangeTreeData.fire();
				vscode.window.showInformationMessage('配置已导入');
			} catch (error) {
				vscode.window.showErrorMessage(`导入配置失败: ${error}`);
			}
		}
	}

	getAllCases(): { caseName: string, caseCommand: string }[] {
		const caseSet = new Map<string, { caseName: string, caseCommand: string }>();
		// UV Tool List
		if (this.uvToolRoot) {
			for (const pkg of this.uvToolRoot.children) {
				for (const cmd of pkg.children) {
					const key = this.getCommandKey(cmd);
					const cases = this.commandCases.get(key) || [];
					for (const c of cases) {
						caseSet.set(c.caseName + c.caseCommand, { caseName: c.caseName, caseCommand: c.caseCommand });
					}
				}
			}
		}
		// 收藏夹
		for (const fav of this.favorites) {
			caseSet.set(fav.caseName + fav.caseCommand, { caseName: fav.caseName, caseCommand: fav.caseCommand });
		}
		// 最近任务
		for (const last of this.lastTasks) {
			caseSet.set(last.caseName + last.caseCommand, { caseName: last.caseName, caseCommand: last.caseCommand });
		}
		return Array.from(caseSet.values());
	}
}
