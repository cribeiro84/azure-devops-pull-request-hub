import { USER_SETTINGS_STORE_KEY } from "../common";

export class UserPreferences {
  public showFilterByDefault: boolean = true;
  public openPRNewWindow: boolean = true;
  public selectedProjects: string[] = [];
  public topNumberCompletedAbandoned: number = 25;
  public selectedDefaultSorting: string = "desc";

  constructor(public lastVisit: Date = new Date()) {
    this.restoreToDefaults();
  }

  restoreToDefaults = (): void => {
    this.showFilterByDefault = true;
    this.openPRNewWindow = true;
    this.selectedProjects = [];
    this.topNumberCompletedAbandoned = 25;
    this.selectedDefaultSorting = "desc";
  };

  save = () => {
    this.lastVisit = new Date();
    localStorage.setItem(USER_SETTINGS_STORE_KEY, JSON.stringify(this));
  };

  load = () => {
    try {
      const cachedInstance = localStorage.getItem(USER_SETTINGS_STORE_KEY);

      if (!cachedInstance || cachedInstance.length === 0) {
        return;
      }

      const cachedUserSettings: UserPreferences = JSON.parse(cachedInstance);
      const savedDate = new Date(cachedUserSettings.lastVisit.toString());

      this.lastVisit = savedDate;
      this.selectedDefaultSorting = cachedUserSettings.selectedDefaultSorting !== undefined
        ? cachedUserSettings.selectedDefaultSorting
        : this.selectedDefaultSorting;
      this.openPRNewWindow = cachedUserSettings.openPRNewWindow !== undefined
        ? cachedUserSettings.openPRNewWindow
        : this.openPRNewWindow;
      this.selectedProjects = cachedUserSettings.selectedProjects !== undefined
        ? cachedUserSettings.selectedProjects
        : this.selectedProjects;
      this.showFilterByDefault = cachedUserSettings.showFilterByDefault !== undefined
        ? cachedUserSettings.showFilterByDefault
        : this.showFilterByDefault;
      this.topNumberCompletedAbandoned = cachedUserSettings.topNumberCompletedAbandoned !== undefined
        ? cachedUserSettings.topNumberCompletedAbandoned
        : this.topNumberCompletedAbandoned;
    } catch (error) {
      this.restoreToDefaults();
    }
  };
}
