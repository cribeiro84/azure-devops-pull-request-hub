<p align="center">
  <img src="marketplace/logo.png?raw=true" />
</p>

# Azure DevOps Pull Request Manager Hub

[![Build Status](https://dev.azure.com/caixaazul/Pull%20Request%20Manager%20Hub/_apis/build/status/cribeiro84.azure-devops-pull-request-hub?branchName=main)](https://dev.azure.com/caixaazul/Pull%20Request%20Manager%20Hub/_build/latest?definitionId=11&branchName=main)

Please report any feedback/issue [here](https://github.com/cribeiro84/azure-devops-pull-request-hub):

------

Manage your Pull Requests of all your projects and repositories at a single place without having to switch between each repository. Track its status and what's most important to focus on your code review process.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

### Prerequisites

Please make sure you have the following tools installed to proceed

```csharp
- Git
- Visual Studio Code (or any other editor with TypeScript support)
- TypeScript
- NodeJS
```

### Installing

First step is to clone this repo locally on your workspace and then:

```bash
npm install
```

And then

#### MacOS/Linux

```bash
HTTPS=true react-scripts start
```

#### Windows PowerShell

```powershell
($env:HTTPS = "true") -and (react-scripts start)
```

#### Windows CMD.exe

```cmd
set HTTPS=true&&react-scripts start
```

These above commands will trigger the compilation and will start a new browser instance pointing to <https://localhost:3000/>

### Developing and Testing

The extension supports two modes: DEV and Public. DEV Mode is meant for debugging also to be installed and to run over the https://localhost:3000/.
Please follow the below commands to generate the extension for each mode.

1. Run `npm run package-dev` and upload the package as a private extension to your  Azure DevOps publisher account

  > Note: You may need to add a directory called `build` to the project root when running the script. The output of the `package-dev` script is there.

- Be sure to update the `manifest.json` to use your publisher's ID before running the script.

2. Install the private extension on your Azure DevOps oragnization and test your changes.

DEV Mode

```bash
npm run package-dev
```

Public Mode (Production)

```bash
npm run package-release
```

## Built With

* [Visual Studio Code](https://code.visualstudio.com/) - IDE
* [Git](https://git-scm.com/) - Repository
* [NodeJS](https://nodejs.org/en/) - Local server
* [TypeScript](https://www.typescriptlang.org/) - Language
* [ReactJS](https://reactjs.org/) - Web framework

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. 

## Authors

* **Carlos Alessandro Ribeiro** - [cribeiro84](https://github.com/cribeiro84)

See also the list of [contributors](https://github.com/cribeiro84/azure-devops-pull-request-hub/graphs/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
