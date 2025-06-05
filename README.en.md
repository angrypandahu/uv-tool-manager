# UV Tool Manager VS Code Extension

**UV Tool Manager** is a VS Code extension designed for the [uv tool](https://docs.astral.sh/uv/) ecosystem, helping you efficiently manage all uv tools, save frequently used cases, and execute them in the terminal with one click. Ideal for developers who frequently use uv tools and need to manage and reuse commands in bulk.

---

## Main Features

- **Auto-load uv tools**  
  Automatically parses local `uv tool list` on startup and displays all available tools in groups.
- **Custom Commands**  
  Add, execute, and manage your own shell commands in Custom Folders.
- **Case Management**  
  Create, save, delete, and edit cases for each tool (such as common commands, parameter combinations, etc.).
- **One-click Execution**  
  Select a case to run it directly in the VS Code terminal, no need to type manually.
- **Favorites & Recent Tasks**  
  Frequently used cases can be favorited, and recently executed tasks are automatically recorded for quick reuse.
- **Fuzzy Search**  
  Quickly locate tools, cases, and custom commands.
- **Import/Export Configurations**  
  Backup/migrate all cases and settings with one click, ensuring data safety.

---

## Custom Commands (Custom Folders)

- Manage your custom commands centrally under the "Custom Folders" node in the sidebar.
- Click the "+" button (Add New Command) in the top-right corner of the view to add a custom command.
- After adding, you can run, favorite, or delete custom commands just like regular commands.
- The search function also includes custom commands.
- You can clear all custom commands via the settings menu.

---

## Installation & Usage

1. Clone this repository and install dependencies:
   ```bash
   git clone https://github.com/angrypandahu/uv-tool-manager.git
   cd uv-tool-manager
   npm install
   ```
2. Press F5 in VS Code to start debugging, or run the `Run Extension` task.
3. The sidebar will show the "Project Manager" view, where you can use context menus and top buttons for various operations.

---

## FAQ

- **The tool list is empty?**
  - Make sure uv is installed locally and you can run `uv tool list` in your terminal.
  - uv installation: https://docs.astral.sh/uv/
- **Cases cannot be executed?**
  - Please check the case command format, or test it manually in the terminal.
- **Data loss?**
  - All plugin data is stored in VS Code global storage, so upgrading/reinstalling will not lose data.
  - You can use the "Export/Import Configurations" feature to backup and migrate data.

---

## Contact

If you have suggestions or questions, feel free to open an issue or contact the author:
- GitHub: [https://github.com/angrypandahu/uv-tool-manager]
- Email: angrypandahu@163.com 