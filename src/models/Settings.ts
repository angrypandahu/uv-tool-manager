import { CaseData } from './Case';

export interface SettingsData {
    favorites: CaseData[];
    lastTasks: CaseData[];
    keybindings: Record<string, CaseData>;
    cases: CaseData[];
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