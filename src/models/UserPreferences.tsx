import { USER_SETTINGS_STORE_KEY } from "../common";

export class UserPreferences {

  constructor(public lastVisit: Date = new Date()) {
  }

  save = () => {
    this.lastVisit = new Date();
    localStorage.setItem(USER_SETTINGS_STORE_KEY, JSON.stringify(this));
  };

  load = () => {
    const cachedInstance = localStorage.getItem(USER_SETTINGS_STORE_KEY);

    if (!cachedInstance || cachedInstance.length === 0) {
      return;
    }

    const cachedUserSettings: UserPreferences = JSON.parse(cachedInstance);
    const savedDate = new Date(cachedUserSettings.lastVisit.toString());

    this.lastVisit = savedDate;
  };
}
