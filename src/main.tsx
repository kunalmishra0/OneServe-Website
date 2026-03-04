import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

console.log("Main.tsx initialization starting...");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("Critical: Root element not found!");
} else {
  try {
    createRoot(rootElement).render(<App />);
    console.log("Main.tsx: App rendered successfully.");
  } catch (error) {
    console.error("Main.tsx: Error during render:", error);
  }
}
