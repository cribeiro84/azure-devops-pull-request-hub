import "./UserPreferencesPanel.scss";

import * as React from "react";
import { Panel } from "azure-devops-ui/Panel";
import { Toggle } from "azure-devops-ui/Toggle";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { DropdownMultiSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { TextField, TextFieldWidth } from "azure-devops-ui/TextField";
import {
  RadioButton,
  RadioButtonGroup,
  RadioButtonGroupDirection,
} from "azure-devops-ui/RadioButton";
import { UserPreferencesInstance } from "../common";
import { TeamProjectReference } from "azure-devops-extension-api/Core/Core";

export interface IUserSettingsProps {
  onDismiss: () => void;
  onSave: () => void;
  projects: TeamProjectReference[];
}

export function UserPreferencesPanel(props: IUserSettingsProps): JSX.Element {
  const sortDirectionItems: IListBoxItem[] = [
    { id: "desc", text: "Oldest First", iconProps: { iconName: "SortDown" } },
    { id: "asc", text: "Newest First", iconProps: { iconName: "SortUp" } },
  ];

  const showFilterByDefault = new ObservableValue<boolean>(
    UserPreferencesInstance.showFilterByDefault
  );
  const openPRNewWindow = new ObservableValue<boolean>(
    UserPreferencesInstance.openPRNewWindow
  );
  const userSettingsSelectedProjects = new DropdownMultiSelection();

  if (
    UserPreferencesInstance.selectedProjects &&
    UserPreferencesInstance.selectedProjects.length
  ) {
    UserPreferencesInstance.selectedProjects.forEach((i) => {
      const foundIndex = props.projects.findIndex((p) => p.id === i);

      if (foundIndex >= 0) {
        userSettingsSelectedProjects.select(foundIndex);
      }
    });
  }

  const topNumberCompletedAbandoned = new ObservableValue<string>(
    UserPreferencesInstance.topNumberCompletedAbandoned.toString()
  );
  const selectedDefaultSorting = new ObservableValue<string>(
    UserPreferencesInstance.selectedDefaultSorting
  );

  const restoreDefaults = (): void => {
    UserPreferencesInstance.restoreToDefaults();
    reloadValues();
  };

  const reloadValues = (): void => {
    userSettingsSelectedProjects.clear();
    showFilterByDefault.value = UserPreferencesInstance.showFilterByDefault;
    openPRNewWindow.value = UserPreferencesInstance.openPRNewWindow;

    if (
      UserPreferencesInstance.selectedProjects &&
      UserPreferencesInstance.selectedProjects.length
    ) {
      UserPreferencesInstance.selectedProjects.forEach((i) => {
        const foundIndex = props.projects.findIndex((p) => p.id === i);

        if (foundIndex >= 0) {
          userSettingsSelectedProjects.select(foundIndex);
        }
      });
    }

    topNumberCompletedAbandoned.value = UserPreferencesInstance.topNumberCompletedAbandoned.toString();

    selectedDefaultSorting.value =
      UserPreferencesInstance.selectedDefaultSorting;
  };

  return (
    <Panel
      onDismiss={() => {
        props.onDismiss();
      }}
      titleProps={{ text: "User Preferences" }}
      description={
        "Configure your preferences for making this extension even better for you."
      }
      footerButtonProps={[
        {
          text: "Cancel",
          onClick: () => {
            UserPreferencesInstance.load();
            props.onDismiss();
          },
        },
        {
          text: "Restore Defaults",
          onClick: () => {
            restoreDefaults();
          },
        },
        {
          text: "Save",
          primary: true,
          onClick: () => {
            UserPreferencesInstance.save();
            props.onDismiss();
            props.onSave();
          },
        },
      ]}
    >
      <div className="feature-management-container">
        <div className="features-list body-m">
          <div className="feature flex-grow">
            <div className="feature-header">
              <div className="feature-name title-xs">
                Show Filters by Default
              </div>
              <Toggle
                offText={"Off"}
                onText={"On"}
                checked={showFilterByDefault}
                onChange={(event, value) => {
                  showFilterByDefault.value = value;
                  UserPreferencesInstance.showFilterByDefault = value;
                }}
              />
            </div>
            <div className="feature-description">
              Turn On/Off the Filter Bar by default.
            </div>
          </div>
          <div className="feature flex-grow">
            <div className="feature-header">
              <div className="feature-name title-xs">
                Open PR in a new Window
              </div>
              <Toggle
                offText={"Off"}
                onText={"On"}
                checked={openPRNewWindow}
                onChange={(event, value) => {
                  openPRNewWindow.value = value;
                  UserPreferencesInstance.openPRNewWindow = value;
                }}
              />
            </div>
            <div className="feature-description">
              Enable or disable opening the PR in a new Window or keep on the
              same.
            </div>
          </div>
          {false && <div className="feature flex-grow">
            <div className="feature-header">
              <div className="feature-name title-xs">
                Default Selected Projects
              </div>
              <Dropdown
                actions={[
                  {
                    className: "bolt-dropdown-action-right-button",
                    disabled: userSettingsSelectedProjects.selectedCount === 0,
                    iconProps: { iconName: "Clear" },
                    text: "Clear",
                    onClick: () => {
                      userSettingsSelectedProjects.clear();
                    },
                  },
                ]}
                items={props.projects.map((p) => {
                  return {
                    id: p.id,
                    text: p.name,
                  };
                })}
                selection={userSettingsSelectedProjects}
                placeholder="Select your preferred projects"
                showFilterBox={true}
                onSelect={(
                  event: React.SyntheticEvent<HTMLElement>,
                  item: IListBoxItem<{}>
                ) => {
                  const itemIndex = UserPreferencesInstance.selectedProjects.findIndex(
                    (i) => i === item.id
                  );

                  if (itemIndex < 0) {
                    UserPreferencesInstance.selectedProjects.push(item.id);
                  } else {
                    UserPreferencesInstance.selectedProjects.splice(
                      itemIndex,
                      1
                    );
                  }

                  console.log(UserPreferencesInstance.selectedProjects);
                }}
              />
            </div>
            <div className="feature-description">
              Will keep selected by default when the extension loads again.
            </div>
          </div>}
          <div className="feature flex-grow">
            <div className="feature-header">
              <div className="feature-name title-xs">Default PR Sorting</div>
              <RadioButtonGroup
                onSelect={(selectedId) => {
                  selectedDefaultSorting.value = selectedId;
                  UserPreferencesInstance.selectedDefaultSorting = selectedId;
                }}
                selectedButtonId={selectedDefaultSorting}
                direction={RadioButtonGroupDirection.Horizontal}
              >
                {sortDirectionItems.map((i) => {
                  return <RadioButton id={i.id} text={i.text} key={i.id} />;
                })}
              </RadioButtonGroup>
            </div>
            <div className="feature-description">
              Select which preferred sorting you desire when the PRs are loaded
            </div>
          </div>
          <div className="feature flex-grow">
            <div className="feature-header">
              <div className="feature-name title-xs">
                Top Completed/Abandoned PRs
              </div>
              <TextField
                value={topNumberCompletedAbandoned}
                onChange={(e, newValue) => {
                  topNumberCompletedAbandoned.value = newValue;
                  UserPreferencesInstance.topNumberCompletedAbandoned = parseInt(
                    newValue
                  );
                }}
                placeholder=""
                readOnly={false}
                width={TextFieldWidth.auto}
              />
            </div>
            <div className="feature-description">
              Set the max number of Completed/Abandoned PRs (tabs).
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
