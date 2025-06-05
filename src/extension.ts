// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CaseService } from './services/CaseService';
import { CommandService } from './services/CommandService';
import { SettingsService } from './services/SettingsService';
import { UvToolProvider } from './providers/UvToolProvider';
import { KeybindingsView } from './views/KeybindingsView';
import { CaseTreeItem } from './models/Case';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('扩展开始激活...');

	// 初始化服务
	const commandService = new CommandService();
	await commandService.loadCommands();
	const caseService = new CaseService(context, commandService);
	const settingsService = new SettingsService(context, caseService);

	// 初始化视图提供者
	const provider = new UvToolProvider(context, commandService, caseService, settingsService);
	vscode.window.registerTreeDataProvider('myProjects', provider);

	// 初始化快捷键管理视图
	const keybindingsView = new KeybindingsView(settingsService);

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
				// {
				// 	label: '管理快捷键',
				// 	description: '查看和管理用例的快捷键绑定'
				// },
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
						keybindingsView.show();
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
		vscode.commands.registerCommand('myProjects.createCase', async (item) => {
			const caseName = await vscode.window.showInputBox({
				prompt: '请输入用例名称',
				placeHolder: '用例名称'
			});
			if (!caseName) {return;}
			const caseCommand = await vscode.window.showInputBox({
				prompt: '请输入用例命令',
				placeHolder: '用例命令'
			});
			if (!caseCommand) {return;}
			provider.addCaseToCommand(item, caseName, caseCommand);
		})
	);

	// 注册新增自定义命令
	context.subscriptions.push(
		vscode.commands.registerCommand('uv-tool.addNewCommand', async () => {
			const caseName = await vscode.window.showInputBox({
				prompt: '请输入命令名称',
				placeHolder: '命令名称'
			});
			if (!caseName) {return;}
			const caseCommand = await vscode.window.showInputBox({
				prompt: '请输入命令内容',
				placeHolder: '命令内容'
			});
			if (!caseCommand) {return;}
			const caseItem = new CaseTreeItem(caseName, caseCommand);
			settingsService.addToCustomFolders(caseItem);
			provider.refresh();
		})
	);

	// 注册运行用例命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.runCase', (item) => {
			if (item && item.caseCommand) {
				const terminal = vscode.window.createTerminal(`用例: ${item.caseName}`);
				terminal.show();
				terminal.sendText(item.caseCommand);
				settingsService.addToLastTasks(item);
				provider.refresh();
			}
		})
	);

	// 注册删除用例命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.deleteCase', (item) => {
			provider.deleteCase(item);
		})
	);

	// 注册从最近任务中移除命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.removeFromLastTasks', (item) => {
			settingsService.removeFromLastTasks(item);
			provider.refresh();
		})
	);

	// 注册添加到收藏夹命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.addToFavorites', (item) => {
			settingsService.addToFavorites(item);
			provider.refresh();
		})
	);

	// 注册从收藏夹移除命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.removeFromFavorites', (item) => {
			settingsService.removeFromFavorites(item);
			provider.refresh();
		})
	);

	// 注册绑定快捷键命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.bindKeybinding', (item) => {
			provider.bindKeybinding(item);
		})
	);

	// 注册解除快捷键绑定命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.unbindKeybinding', (keybinding) => {
			provider.unbindKeybinding(keybinding);
		})
	);

	// 注册通过快捷键执行用例命令
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.runCaseWithKeybinding', (args) => {
			if (args && args.caseCommand) {
				const terminal = vscode.window.createTerminal(`用例: ${args.caseName}`);
				terminal.show();
				terminal.sendText(args.caseCommand);
			}
		})
	);
}
