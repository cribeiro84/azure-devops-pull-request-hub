import "es6-promise/auto";
import "./common.scss";

import * as React from "react";
import * as ReactDOM from "react-dom";

export function showRootComponent(component: React.ReactElement<any>) {
    ReactDOM.render(component, document.getElementById("root"));
}