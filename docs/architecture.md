# Architecture overview

This repository consists of:

- A [layered application](#layered-application).
- [Web infrastructure](#web-infrastructure) for automated website deployment.
- [GitOps](#gitops) practices for development, maintenance and deployment.

## Layered application

Application is

- powered by **TypeScript** and **Vue.js**,
- and driven by **Domain-driven design**, **Event-driven architecture**, **Data-driven programming** concepts.

Application uses highly decoupled models & services in different DDD layers:

**Application layer** (see [application.md](./application.md)):

- Coordinates application activities and consumes the domain layer.

**Presentation layer** (see [presentation.md](./presentation.md)):

- Handles UI/UX, consumes both the application and domain layers.
- May communicate directly with the infrastructure layer for technical needs, but avoids domain logic.

**Domain layer**:

- Serves as the system's core and central truth.
- It should be independent of other layers and encapsulate the core business concepts.

**Infrastructure layer**:

- Provides technical implementations.
- Depends on the application and domain layers in terms of interfaces and contracts but should not include business logic.

![DDD + vue.js](./../img/architecture/app-ddd.drawio.png)

### Application state

State handling uses an event-driven subscription model to signal state changes and special functions to register changes. It does not depend on third party packages.

The presentation layer can read and modify state through the context. State changes trigger events that components can subscribe to for reactivity.

Each layer treat application layer differently.

![State](./../img/architecture/app-state.png)

*[Presentation layer](./presentation.md)*:

- Each component holds their own state about presentation-related data.
- Components register shared state changes into application state using functions.
- Components listen to shared state changes using event subscriptions.
- 📖 Read more: [presentation.md | Application state](./presentation.md#application-state).

*[Application layer](./application.md)*:

- Stores the application-specific state.
- The state it exposed for read with getter functions and set using setter functions, setter functions also fire application events that allows other parts of application and the view in presentation layer to react.
- So state is mutable, and fires related events when mutated.
- 📖 Read more: [application.md | Application state](./application.md#application-state).

It's comparable with `flux`, `vuex`, and `pinia`. A difference is that mutable application layer state in privacy.sexy is mutable and lies in single "store" that holds app state and logic. The "actions" mutate the state directly which in turns act as dispatcher to notify its own event subscriptions (callbacks).

## Web infrastructure

The website is built and deployed to GitHub Pages by the
[`deploy.pages.yaml`](../.github/workflows/deploy.pages.yaml) workflow.
The deployment configuration is stored in this repository and runs from the
published source code.

## GitOps

CI/CD pipelines automate operational tasks based on different Git events. [bump-everywhere](https://github.com/undergroundwires/bump-everywhere) enables this automation.

📖 Read more in [`ci-cd.md`](./ci-cd.md#gitops).

[![CI/CD using GitHub Actions](../img/architecture/gitops.png)](../.github/workflows/)
