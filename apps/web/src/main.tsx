import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { preloadViews } from "./game/lazyViews";
import "@fontsource/alegreya-sans/latin-400.css";
import "@fontsource/alegreya-sans/latin-400-italic.css";
import "@fontsource/alegreya-sans/latin-500.css";
import "@fontsource/alegreya-sans/latin-700.css";
import "@fontsource/alegreya-sans/latin-800.css";
import "@fontsource/cinzel/latin-500.css";
import "@fontsource/cinzel/latin-700.css";
import "@fontsource/cinzel/latin-900.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "./theme.css";
import "./game/game.css";
import "./game/screens.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root element missing");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PixiJS and the arena load right after the first paint, so the title shows at once.
window.setTimeout(preloadViews, 0);
