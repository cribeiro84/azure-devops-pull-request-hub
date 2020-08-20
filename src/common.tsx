import "./common.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { MessageCard, MessageCardSeverity } from "azure-devops-ui/MessageCard";
import { UserPreferences } from "./models/UserPreferences";

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

export const USER_SETTINGS_STORE_KEY: string = "PRMH_USER_SETTINGS_KEY";

export const UserPreferencesInstance: UserPreferences = new UserPreferences();

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

