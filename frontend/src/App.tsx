import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import FileUpload from "./components/FileUpload";

/*function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> test:)
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App*/

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  return (
    <div style={{ padding: 40 }}>
      <h1>Terraform Wizard</h1>

      {!sessionId && (
        <FileUpload onSessionId={(id) => setSessionId(id)} />
      )}

      {sessionId && (
        <div style={{ marginTop: 30 }}>
          <h2>Session created</h2>
          <p>ID: {sessionId}</p>
          <p>You can now request the graph.</p>
        </div>
      )}
    </div>
  );
}

export default App;