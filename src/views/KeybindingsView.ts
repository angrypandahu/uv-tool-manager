import * as vscode from 'vscode';
import { CaseData, CaseTreeItem } from '../models/Case';
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
            async message => {
                if (message.command === 'unbind') {
                    await this.settingsService.unbindKeybinding(message.key);
                }
                if (message.command === 'bind') {
                    if (message.key) {
                        const caseItem = new CaseTreeItem(message.caseName, message.caseCommand);
                        await this.settingsService.bindKeybindingWithKey(message.key, caseItem);
                    }
                }
                this.updateContent();
            },
            undefined
        );
    }

    private updateContent() {
        if (!this.panel) {return;}

        const allCases = this.getAllCases();
        this.panel.webview.html = this.getKeybindingsHtml(allCases);
    }
    private getAllCases(): CaseData[] {
        return this.settingsService.getAllCases();
    }

    private findKey(caseName: string, caseCommand: string): string {
        const keybindings = this.settingsService.getKeybindings();
        for (const [key, item] of keybindings.entries()) {
            if (item.caseName === caseName && item.caseCommand === caseCommand) {return key;}
        }
        return '';
    }

    private getKeybindingsHtml(allCases: CaseData[]): string {
        // 收集所有已绑定快捷键的配置
        const keybindings = this.settingsService.getKeybindings();
        const keybindingsJson = Array.from(keybindings.entries()).map(([key, item]) => {
            return `{
  "key": "${key}",
  "command": "myProjects.runCaseWithKeybinding",
  "args": { "caseName": "${item.caseName}", "caseCommand": "${item.caseCommand}" }
}`;
        }).join(',\n');
        const exportContent = `[\n${keybindingsJson ? keybindingsJson + '\n' : ''}]`;

        return `
            <html>
            <body style="background:#222;color:#fff;">
                <h2>所有用例快捷键管理</h2>
                <button onclick="showExportModal()" style="margin-bottom:16px;padding:6px 16px;font-size:15px;">导出快捷键配置</button>
                <table border="1" style="width:100%;border-collapse:collapse;">
                    <tr>
                        <th>用例名</th>
                        <th>命令</th>
                        <th>当前快捷键</th>
                        <th>操作</th>
                    </tr>
                    ${allCases.map(c => {
                        const key = this.findKey(c.caseName, c.caseCommand);
                        return `
                            <tr>
                                <td>${c.caseName}</td>
                                <td><code>${c.caseCommand}</code></td>
                                <td ${key ? '' : `ondblclick="bind('${c.caseName}','${c.caseCommand}')"`} style="cursor:${key ? 'default' : 'pointer'};">
                                    ${key ? key : ''}
                                </td>
                                <td>
                                    ${key
                                        ? `<button onclick="unbind('${key}')">解绑</button>`
                                        : ''
                                    }
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </table>
                <div id="key-capture-modal" style="display:none;position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 32px 24px 32px;border:1px solid #ccc;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.15);border-radius:8px;">
                    <div style="margin-bottom:12px;font-size:16px;color:#222;">先按所需的组合键，再按 Enter 键。</div>
                    <input id="key-capture-input" type="text" readonly style="width:220px;font-size:16px;padding:6px 8px;" />
                    <div style="margin-top:12px;text-align:right;">
                        <button onclick="closeModal()" style="padding:4px 12px;">取消</button>
                    </div>
                </div>
                <div id="export-modal" style="display:none;position:fixed;top:20%;left:50%;transform:translate(-50%,0);background:#222;padding:24px 32px 24px 32px;border:1px solid #ccc;z-index:2000;box-shadow:0 2px 8px rgba(0,0,0,0.25);border-radius:8px;min-width:480px;">
                    <div style="margin-bottom:12px;font-size:16px;">请将以下内容复制到 VSCode 的 <b>keybindings.json</b> 文件中：</div>
                    <textarea id="export-content" style="width:100%;height:180px;font-size:14px;background:#111;color:#fff;padding:8px;">${exportContent}</textarea>
                    <div style="margin-top:12px;text-align:right;">
                        <button onclick="closeExportModal()" style="padding:4px 12px;">关闭</button>
                        <button onclick="copyExportContent()" style="padding:4px 12px;margin-left:8px;">复制</button>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    let currentBind = null;
                    let pressedKeys = new Set();
                    let keyOrder = [];

                    function unbind(key) {
                        vscode.postMessage({ command: 'unbind', key });
                    }

                    function bind(caseName, caseCommand) {
                        document.getElementById('key-capture-modal').style.display = 'block';
                        document.getElementById('key-capture-input').value = '';
                        pressedKeys.clear();
                        keyOrder = [];
                        currentBind = { caseName, caseCommand };
                    }

                    function closeModal() {
                        document.getElementById('key-capture-modal').style.display = 'none';
                        pressedKeys.clear();
                        keyOrder = [];
                        currentBind = null;
                    }

                    document.addEventListener('keydown', function(e) {
                        const modal = document.getElementById('key-capture-modal');
                        if (modal && modal.style.display === 'block') {
                            e.preventDefault();
                            if (e.key === 'Enter') {
                                if (keyOrder.length > 0) {
                                    const keyStr = keyOrder.join('+');
                                    vscode.postMessage({ command: 'bind', caseName: currentBind.caseName, caseCommand: currentBind.caseCommand, key: keyStr });
                                }
                                closeModal();
                            } else if (e.key === 'Escape') {
                                closeModal();
                            } else {
                                let displayKey = '';
                                if (e.key === 'Meta') displayKey = 'Cmd';
                                else if (e.key === 'Control') displayKey = 'Ctrl';
                                else if (e.key === 'Alt') displayKey = 'Alt';
                                else if (e.key === 'Shift') displayKey = 'Shift';
                                else displayKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                                if (!pressedKeys.has(displayKey)) {
                                    pressedKeys.add(displayKey);
                                    keyOrder.push(displayKey);
                                }
                                document.getElementById('key-capture-input').value = keyOrder.join('+');
                            }
                        }
                    });

                    function showExportModal() {
                        document.getElementById('export-modal').style.display = 'block';
                    }
                    function closeExportModal() {
                        document.getElementById('export-modal').style.display = 'none';
                    }
                    function copyExportContent() {
                        const textarea = document.getElementById('export-content');
                        textarea.select();
                        document.execCommand('copy');
                    }
                </script>
            </body>
            </html>
        `;
    }
} 