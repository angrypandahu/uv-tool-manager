import * as vscode from 'vscode';
import { CaseData } from '../models/Case';
import { SettingsService } from '../services/SettingsService';

export class KeybindingsView {
    private panel: vscode.WebviewPanel | undefined;

    constructor(private settingsService: SettingsService) {}

    show() {
        this.panel = vscode.window.createWebviewPanel(
            'manageKeybindings',
            '管理快捷键',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        this.updateContent();

        this.panel.webview.onDidReceiveMessage(
            message => {
                if (message.command === 'unbind') {
                    this.settingsService.unbindKeybinding(message.key);
                }
                if (message.command === 'bind') {
                    if (message.key) {
                        this.settingsService.bindKeybinding({
                            caseName: message.caseName,
                            caseCommand: message.caseCommand,
                            isFavorite: false,
                            toCase: () => ({
                                caseName: message.caseName,
                                caseCommand: message.caseCommand,
                                isFavorite: false,
                                toData: () => ({
                                    caseName: message.caseName,
                                    caseCommand: message.caseCommand,
                                    isFavorite: false
                                })
                            })
                        });
                    }
                }
                this.updateContent();
            },
            undefined
        );
    }

    private updateContent() {
        if (!this.panel) return;

        const allCases = this.getAllCases();
        this.panel.webview.html = this.getKeybindingsHtml(allCases);
    }
    private getAllCases(): CaseData[] {
        return this.settingsService.getAllCases();
    }

    private findKey(caseName: string, caseCommand: string): string {
        const keybindings = this.settingsService.getKeybindings();
        for (const [key, item] of keybindings.entries()) {
            if (item.caseName === caseName && item.caseCommand === caseCommand) return key;
        }
        return '';
    }

    private getKeybindingsHtml(allCases: CaseData[]): string {
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
                        const key = this.findKey(c.caseName, c.caseCommand);
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
} 