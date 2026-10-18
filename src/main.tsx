import { createRoot } from "react-dom/client";
import { App } from "./App";

// No StrictMode, to rule out double rendering as the cause.
createRoot(document.getElementById("root")!).render(<App />);
