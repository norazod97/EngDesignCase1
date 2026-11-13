"use strict";

// These accounts are deliberately client-side mock data for the demo only.
const DEMO_ACCOUNTS = new Map([
  ["operator1", { password: "WeldDemo123", name: "Operator One" }],
  ["operator2", { password: "WeldDemo456", name: "Operator Two" }],
]);

const STORAGE_KEY = "corob-demo-operator";
const loginView = document.querySelector("#login-view");
const welcomeView = document.querySelector("#welcome-view");
const loginForm = document.querySelector("#login-form");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const errorMessage = document.querySelector("#login-error");
const operatorName = document.querySelector("#operator-name");
const signOutButton = document.querySelector("#sign-out");

function showWelcome(name) {
  operatorName.textContent = name;
  loginView.hidden = true;
  welcomeView.hidden = false;
  document.title = `Welcome, ${name} · COROB Weld Cell`;
}

function showLogin() {
  welcomeView.hidden = true;
  loginView.hidden = false;
  document.title = "Operator sign in · COROB Weld Cell";
}

function clearStoredOperator() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The form still works for the current page if browser storage is disabled.
  }
}

function restoreOperator() {
  try {
    const storedUsername = localStorage.getItem(STORAGE_KEY);
    const account = storedUsername ? DEMO_ACCOUNTS.get(storedUsername) : null;
    if (account) {
      showWelcome(account.name);
    } else if (storedUsername) {
      clearStoredOperator();
    }
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.textContent = "";

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const account = DEMO_ACCOUNTS.get(username);

  if (!account || account.password !== password) {
    errorMessage.textContent = "The operator ID or password is not recognized. Please try again.";
    passwordInput.value = "";
    passwordInput.focus();
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, username);
  } catch {
    // Continue into the demo workspace for this page view if storage is disabled.
  }
  loginForm.reset();
  showWelcome(account.name);
});

signOutButton.addEventListener("click", () => {
  clearStoredOperator();
  errorMessage.textContent = "";
  showLogin();
  usernameInput.focus();
});

restoreOperator();