# UV Tool Manager VS Code 插件

一个高效的 VS Code 项目/用例管理扩展，支持项目树、用例管理、快捷键绑定、收藏夹、最近任务、Webview 配置等功能。

## 主要功能

- 项目树视图展示与管理
- 用例的创建、删除、执行
- 用例收藏夹与最近任务
- 用例/命令搜索
- 用例快捷键绑定与管理（支持 Webview 图形界面）
- 配置导入导出
- 一键清空收藏夹/最近任务

## 项目结构

```
your-extension/
├── .vscode/                  # VS Code 工作区配置（可选）
├── media/                    # 存放 webview、图标、样式等静态资源
│   └── uv.svg
├── out/                      # 编译后的 JS 文件（自动生成）
├── src/                      # 源码目录
│   ├── extension.ts          # 插件主入口，只做注册和调度
│   ├── tree/                 # 树视图相关代码
│   │   ├── UvToolProvider.ts     # TreeDataProvider 及相关逻辑
│   │   └── UvTreeItem.ts        # UvTreeItem/CaseTreeItem 等节点定义
│   ├── commands/             # 命令注册与实现
│   │   └── registerCommands.ts
│   ├── webview/              # webview 相关逻辑
│   │   └── keybindingPanel.ts    # 管理快捷键的 webview 面板
│   └── utils/                # 工具函数、类型等（如有需要可扩展）
├── package.json              # 插件描述、命令、菜单、激活事件等
├── tsconfig.json             # TypeScript 配置
├── README.md                 # 插件说明文档
├── .gitignore
├── package-lock.json
└── ...（如 test、CI 配置等）
```

## 安装与运行

1. 克隆本仓库并安装依赖：
   ```bash
   git clone <your-repo-url>
   cd your-extension
   npm install
   ```
2. 在 VS Code 中按 F5 启动调试，或运行 `Run Extension` 任务。
3. 插件会在侧边栏显示"项目管理器"视图，右键菜单和顶部按钮可进行各类操作。

## 常见问题

- **快捷键冲突/无效？**
  - 请确保绑定的快捷键未被其他扩展或系统占用。
  - 可在"管理快捷键"Webview中一键解绑或重新绑定。
- **数据丢失？**
  - 插件所有数据均存储在 VS Code 全局存储中，升级/重装不会丢失。
  - 可通过"导出配置/导入配置"功能备份和迁移。

## 联系方式

如有建议或问题，欢迎提 Issue 或联系作者：
- GitHub: [your-github-url]
- 邮箱: your@email.com

---

![demo](demo.gif)

## VS Code API

### `vscode` module

- [`commands.registerCommand`](https://code.visualstudio.com/api/references/vscode-api#commands.registerCommand)
- [`window.showInformationMessage`](https://code.visualstudio.com/api/references/vscode-api#window.showInformationMessage)

### Contribution Points

- [`contributes.commands`](https://code.visualstudio.com/api/references/contribution-points#contributes.commands)

## Running the Sample

- Run `npm install` in terminal to install dependencies
- Run the `Run Extension` target in the Debug View. This will:
	- Start a task `npm: watch` to compile the code
	- Run the extension in a new VS Code window
