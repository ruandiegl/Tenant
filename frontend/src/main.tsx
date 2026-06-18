import React from "react";
import ReactDOM from "react-dom/client";
import { AppProviders } from "./app/providers/app-providers";
import { AppRoutes } from "./routes";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  </React.StrictMode>
);
