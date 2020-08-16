import "./UserSettingsPanel.scss";

import * as React from "react";
import { Panel } from "azure-devops-ui/Panel";
import { Toggle } from "azure-devops-ui/Toggle";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import { DropdownMultiSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { Dropdown } from "azure-devops-ui/Dropdown";
import { TextField, TextFieldWidth } from "azure-devops-ui/TextField";
import { RadioButton, RadioButtonGroup, RadioButtonGroupDirection } from "azure-devops-ui/RadioButton";

export interface IUserSettingsProps {
  onDismiss: () => void;
}

const sortDirectionItems: IListBoxItem[] = [
  { id: "desc", text: "Oldest First", iconProps: { iconName: "SortDown" } },
  { id: "asc", text: "Newest First", iconProps: { iconName: "SortUp" } },
];

const showFilterByDefault = new ObservableValue<boolean>(true);
const openPRNewWindow = new ObservableValue<boolean>(true);
const userSettingsSelectedProjects = new DropdownMultiSelection();
const topNumberCompletedAbandoned = new ObservableValue<number>(25);
const selectedDefaultSorting = new ObservableValue<string>("desc");

export function UserSettingsPanel(props: IUserSettingsProps): JSX.Element {
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
            props.onDismiss();
          },
        },
        { text: "Save", primary: true },
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
                onChange={(event, value) => (showFilterByDefault.value = value)}
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
                onChange={(event, value) => (openPRNewWindow.value = value)}
              />
            </div>
            <div className="feature-description">
              Enable or disable opening the PR in a new Window or keep on the same.
            </div>
          </div>
          <div className="feature flex-grow">
            <div className="feature-header">
              <div className="feature-name title-xs">
                Default Selected Projects
              </div>
              <Dropdown
                ariaLabel="Multiselect"
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
                items={[
                  {
                    id: "1",
                    text: "Project 1",
                  },
                ]}
                selection={userSettingsSelectedProjects}
                placeholder="Select your preferred projects"
                showFilterBox={true}
              />
            </div>
            <div className="feature-description">
              Will keep selected by default when the extension loads again.
            </div>
          </div>
          <div className="feature flex-grow">
            <div className="feature-header">
              <div className="feature-name title-xs">Default PR Sorting</div>
              <RadioButtonGroup
                onSelect={(selectedId) =>
                  (selectedDefaultSorting.value = selectedId)
                }
                selectedButtonId={selectedDefaultSorting}
                direction={RadioButtonGroupDirection.Horizontal}
              >
                {sortDirectionItems.map(i => {
                  return <RadioButton id={i.id} text={i.text} key={i.id} />
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
                value={topNumberCompletedAbandoned.value.toString()}
                onChange={(e, newValue) =>
                  (topNumberCompletedAbandoned.value = parseInt(newValue))
                }
                placeholder="Search keyword"
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
