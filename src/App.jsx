import { useState, useEffect } from "react";
import { getIssues, addLabel, getCommits } from "./github";
import "./App.css";

const PROJECT_REPO = "hjalmarzukile/AInterview_litreview";
const TASK_BOARD_REPO = "hjalmarzukile/task-board";

function LabelBadge({ name }) {
  const colors = {
    epic: "#0075ca", task: "#b5a000", "pi-approve": "#d93f0b",
    "self-approve": "#5a7fc9", "awaiting-pi-approval": "#e67e22",
    "pi-approved": "#0e8a16", blocked: "#b60205", available: "#0e8a16", claimed: "#2ecc71",
  };
  return (
    <span style={{ background: colors[name] || "#555", color: "#fff", borderRadius: 4,
      padding: "1px 7px", fontSize: 11, marginRight: 4 }}>{name}</span>
  );
}

function IssueCard({ issue, onApprove }) {
  const needsApproval = issue.labels.some((l) => l.name === "awaiting-pi-approval");
  return (
    <div style={{ border: needsApproval ? "1px solid #e67e22" : "1px solid #333",
      borderRadius: 8, padding: "12px 16px", marginBottom: 10,
      background: needsApproval ? "#1a1200" : "#111" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href={issue.html_url} target="_blank" rel="noreferrer"
          style={{ color: "#58a6ff", textDecoration: "none", fontWeight: 500 }}>
          #{issue.number} {issue.title}
        </a>
        {issue.assignee && (
          <img src={issue.assignee.avatar_url} alt={issue.assignee.login}
            title={issue.assignee.login} style={{ width: 24, height: 24, borderRadius: "50%" }} />
        )}
      </div>
      <div style={{ marginTop: 8 }}>
        {issue.labels.map((l) => <LabelBadge key={l.name} name={l.name} />)}
      </div>
      {needsApproval && (
        <button onClick={() => onApprove(issue.number)}
          style={{ marginTop: 10, background: "#0e8a16", color: "#fff", border: "none",
            borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>
          ✓ Approve &amp; Close
        </button>
      )}
    </div>
  );
}

function CommitFeed({ commits }) {
  return (
    <div style={{ fontFamily: "monospace", fontSize: 13 }}>
      {commits.slice(0, 10).map((c) => (
        <div key={c.sha} style={{ display: "grid", gridTemplateColumns: "60px 1fr 120px",
          gap: 12, padding: "6px 0", borderBottom: "1px solid #222" }}>
          <a href={c.html_url} target="_blank" rel="noreferrer" style={{ color: "#58a6ff" }}>
            {c.sha.slice(0, 7)}
          </a>
          <span style={{ color: "#e6edf3" }}>{c.commit.message.split("\n")[0].slice(0, 80)}</span>
          <span style={{ color: "#8b949e", textAlign: "right" }}>{c.commit.author.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("overview");
  const [issues, setIssues] = useState([]);
  const [boardIssues, setBoardIssues] = useState([]);
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [iss, board, cms] = await Promise.all([
      getIssues(PROJECT_REPO),
      getIssues(TASK_BOARD_REPO),
      getCommits(PROJECT_REPO),
    ]);
    setIssues(Array.isArray(iss) ? iss : []);
    setBoardIssues(Array.isArray(board) ? board : []);
    setCommits(Array.isArray(cms) ? cms : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (issueNumber) => {
    await addLabel(PROJECT_REPO, issueNumber, "pi-approved");
    await load();
  };

  const epics = issues.filter((i) => i.labels.some((l) => l.name === "epic"));
  const tasks = issues.filter((i) => i.labels.some((l) => l.name === "task"));
  const pendingApproval = issues.filter((i) => i.labels.some((l) => l.name === "awaiting-pi-approval"));
  const availableTasks = boardIssues.filter((i) => i.labels.some((l) => l.name === "available"));

  const tabs = ["overview", "epics", "tasks", "board", "commits"];

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: "#161b22", borderBottom: "1px solid #30363d",
        padding: "0 24px", display: "flex", alignItems: "center", gap: 24, height: 56 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Research OS</h1>
        <span style={{ color: "#8b949e", fontSize: 13 }}>{PROJECT_REPO}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {pendingApproval.length > 0 && (
            <span style={{ background: "#e67e22", color: "#fff", borderRadius: 12,
              padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
              {pendingApproval.length} pending approval
            </span>
          )}
          <span style={{ color: "#8b949e", fontSize: 12 }}>{epics.length} epics · {tasks.length} tasks</span>
        </div>
      </header>

      <nav style={{ background: "#161b22", borderBottom: "1px solid #30363d",
        padding: "0 24px", display: "flex", gap: 4 }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ background: "none", border: "none", color: tab === t ? "#e6edf3" : "#8b949e",
              borderBottom: tab === t ? "2px solid #f78166" : "2px solid transparent",
              padding: "10px 14px", cursor: "pointer", fontSize: 14, fontWeight: tab === t ? 600 : 400 }}>
            {t}
          </button>
        ))}
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        {loading && <div style={{ color: "#8b949e" }}>Loading...</div>}

        {!loading && tab === "overview" && (
          <div>
            {pendingApproval.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <h2 style={{ color: "#e67e22", fontSize: 16, marginBottom: 12 }}>Awaiting your approval</h2>
                {pendingApproval.map((i) => <IssueCard key={i.id} issue={i} onApprove={handleApprove} />)}
              </section>
            )}
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Open epics</h2>
              {epics.length === 0
                ? <p style={{ color: "#8b949e" }}>No open epics. <a href={`https://github.com/${PROJECT_REPO}/issues/new/choose`} target="_blank" rel="noreferrer">Create one →</a></p>
                : epics.map((i) => <IssueCard key={i.id} issue={i} onApprove={handleApprove} />)}
            </section>
            <section>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Recent commits</h2>
              <CommitFeed commits={commits} />
            </section>
          </div>
        )}

        {!loading && tab === "epics" && (
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>All epics</h2>
            {epics.map((i) => <IssueCard key={i.id} issue={i} onApprove={handleApprove} />)}
            {epics.length === 0 && <p style={{ color: "#8b949e" }}>No open epics.</p>}
          </div>
        )}

        {!loading && tab === "tasks" && (
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>All tasks</h2>
            {tasks.map((i) => <IssueCard key={i.id} issue={i} onApprove={handleApprove} />)}
            {tasks.length === 0 && <p style={{ color: "#8b949e" }}>No open tasks.</p>}
          </div>
        )}

        {!loading && tab === "board" && (
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Common task board</h2>
            <p style={{ color: "#8b949e", fontSize: 13, marginBottom: 16 }}>
              Students claim tasks by commenting <code>/claim</code> on the issue.
            </p>
            {availableTasks.map((i) => (
              <div key={i.id} style={{ border: "1px solid #333", borderRadius: 8,
                padding: "12px 16px", marginBottom: 10, background: "#111" }}>
                <a href={i.html_url} target="_blank" rel="noreferrer"
                  style={{ color: "#58a6ff", textDecoration: "none", fontWeight: 500 }}>
                  #{i.number} {i.title}
                </a>
                <div style={{ marginTop: 8 }}>
                  {i.labels.map((l) => <LabelBadge key={l.name} name={l.name} />)}
                </div>
              </div>
            ))}
            {availableTasks.length === 0 && (
              <p style={{ color: "#8b949e" }}>No available tasks. <a href={`https://github.com/${TASK_BOARD_REPO}/issues/new`} target="_blank" rel="noreferrer">Post one →</a></p>
            )}
          </div>
        )}

        {!loading && tab === "commits" && (
          <div>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>Recent commits</h2>
            <CommitFeed commits={commits} />
          </div>
        )}
      </main>
    </div>
  );
}
