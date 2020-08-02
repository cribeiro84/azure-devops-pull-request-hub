import "./common.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";

export function showRootComponent(component: React.ReactElement<any>) {
    ReactDOM.render(component, document.getElementById("root"));
}

export function isLocalStorageAvailable(){
  var test = 'test';
  try {
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
  } catch(e) {
      return false;
  }
}

export class UsertSettings {
  constructor(public lastVisit: Date = new Date()) {

  }

  save = () => {
    this.lastVisit = new Date();
    localStorage.setItem(USER_SETTINGS_STORE_KEY, JSON.stringify(this));
  }

  load = () => {
    const cachedInstance = localStorage.getItem(USER_SETTINGS_STORE_KEY);

    if (!cachedInstance || cachedInstance.length === 0)
    {
      return;
    }

    const cachedUserSettings: UsertSettings = JSON.parse(cachedInstance);
    const savedDate = new Date(cachedUserSettings.lastVisit.toString());

    this.lastVisit = savedDate;
  }
}

export const USER_SETTINGS_STORE_KEY: string = "PRMH_USER_SETTINGS_KEY";

export const UsertSettingsInstance: UsertSettings = new UsertSettings();

export function ShowErrorMessage(props: any) {
  return (
    <div className="flex-grow margin-top-8">
      <br />
      <MessageCard
        className="flex-self-stretch"
        severity={MessageCardSeverity.Error}
        onDismiss={props.onDismiss}
      >
        {props.errorMessage}
      </MessageCard>
      <br />
    </div>
  );
}

