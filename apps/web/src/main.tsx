import React from "react";
import ReactDOM from "react-dom/client";
import App from "@desktop/App";
import "@desktop/styles.css";
import { clearAuthToken, installHttpApi } from "./httpApi";

installHttpApi();

const SESSION_KEY = "gestion-notas:session";
const originalRemoveItem = sessionStorage.removeItem.bind(sessionStorage);
sessionStorage.removeItem = (key: string) => {
  if (key === SESSION_KEY) {
    clearAuthToken();
  }
  originalRemoveItem(key);
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
