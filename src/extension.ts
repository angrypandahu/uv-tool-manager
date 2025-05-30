// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "helloworld-sample" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World panda222!');
	});

	context.subscriptions.push(disposable);

	const projectProvider = new ProjectProvider();
	vscode.window.registerTreeDataProvider('myProjects', projectProvider);

	// 注册刷新命令（可选）
	context.subscriptions.push(
		vscode.commands.registerCommand('myProjects.refresh', () => projectProvider.refresh())
	);
}

class ProjectItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly path: string
	) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.tooltip = path;
		this.description = path;
	}
}

class ProjectProvider implements vscode.TreeDataProvider<ProjectItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<ProjectItem | undefined | void> = new vscode.EventEmitter<ProjectItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ProjectItem | undefined | void> = this._onDidChangeTreeData.event;

	private projects: ProjectItem[] = [
		new ProjectItem('示例项目1', '/Users/xxx/project1'),
		new ProjectItem('示例项目2', '/Users/xxx/project2')
	];

	getTreeItem(element: ProjectItem): vscode.TreeItem {
		return element;
	}

	getChildren(_element?: ProjectItem): Thenable<ProjectItem[]> {
		return Promise.resolve(this.projects);
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}
