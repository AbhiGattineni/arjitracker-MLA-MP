export default function NotConfigured() {
  return (
    <div className="center-screen">
      <div className="card narrow">
        <h1>Connect Firebase</h1>
        <p>This app needs a Firebase project. To set it up:</p>
        <ol>
          <li>Create a project at <b>console.firebase.google.com</b>.</li>
          <li>Enable <b>Authentication → Email/Password</b>.</li>
          <li>Create a <b>Firestore Database</b>.</li>
          <li>Add a <b>Web app</b> and copy its config.</li>
          <li>Copy <code>.env.example</code> to <code>.env</code>, paste the values and restart <code>npm run dev</code>.</li>
        </ol>
        <p className="muted small">See README.md for the full guide.</p>
      </div>
    </div>
  );
}
