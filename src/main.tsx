import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Critical: Root element not found!");
} else {
  createRoot(rootElement).render(<App />);
}
