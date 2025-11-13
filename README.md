# Auto Evidence Screenshot Tool

This project is an **example implementation** of an automation tool built with Playwright. It was designed for a specific internal use case: navigating through a multi-step form by repeatedly clicking **Next**, while switching between **languages (English/Arabic)** and **themes (Light/Dark)** at each step.

The tool also captures screenshots for desktop and mobile views to validate UI consistency.

---

## Purpose

This code demonstrates how to:

- Automate navigation through a web flow.
- Dynamically change language and theme settings.
- Capture screenshots for different device profiles.

It is **not intended as a generic solution**. If you plan to use this for your own project, you will likely need to:

- Modify selectors for buttons, menus, and components.
- Adjust logic for handling conditional pages.
- Update URLs and authentication flows.

---

## Usage

Run the executable from the command line:

```bash
screenshot.exe <LOGIN_URL> <START_URL>
```

Example:

```bash
screenshot.exe "https://stage.example.com/login" "https://stage.example.com/start"
```

---

## Tech Stack

- Playwright – Browser automation
- Node.js – Runtime
- pkg – Packaging into executable

---

## Notes

- Ensure the `ms-playwright` folder with browser binaries is placed next to the executable.
- Run from Command Prompt for logs.
- Avoid running from OneDrive or network paths (permissions may block Chromium).

---

### Author

Mohammad AlSmadi  
[GitHub Profile](https://github.com/alsmadi99)

---
