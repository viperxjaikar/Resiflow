import { Link } from "react-router-dom";
import "./LostFound.css";

function LostandFound() {
  return (
    <div className="lf-page">
      <div className="lf-shell">
        <header className="lf-header">
          <p className="lf-eyebrow">Lost & Found</p>
          <h1 className="lf-title">Lost something? Found something?</h1>
          <p className="lf-subtitle">
            Choose a flow to browse posts from others or share what you have.
          </p>
        </header>

        <section className="lf-buttons">
          <div className="lf-card">
            <h3>Lost Something?</h3>
            <p>View items found by other users.</p>
            <Link className="lf-button" to="/lost-found/lost">
              Lost
            </Link>
          </div>

          <div className="lf-card">
            <h3>Found Something?</h3>
            <p>Browse lost reports from other users.</p>
            <Link className="lf-button" to="/lost-found/found">
              Found
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LostandFound;
