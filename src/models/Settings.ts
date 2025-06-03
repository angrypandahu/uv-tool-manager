import { CaseData } from './Case';

export interface SettingsData {
    lastTasks: CaseData[];
    favorites: CaseData[];
    keybindings: Record<string, CaseData>;
}

export interface KeybindingConfig {
    key: string;
    command: string;
    args: {
        caseName: string;
        caseCommand: string;
    };
    when: string;
}

export class StorageKeys {
    static readonly CASES = 'uvCases';
    static readonly LAST_TASKS = 'uvLastTasks';
    static readonly FAVORITES = 'uvFavorites';
    static readonly KEYBINDINGS = 'uvKeybindings';
} 