import "./App.css";
import IndependenceDay from "./IndependenceDay.jsx";
import { Analytics } from "@vercel/analytics/react";

function App() {
  return (
    <div className="App">
      <IndependenceDay />
      <Analytics />
    </div>
  );
}

export default App;
