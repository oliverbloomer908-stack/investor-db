'use client';

export interface RankResult {
  rank: number;
  name: string;
  title: string;
  company: string;
  linkedInUrl: string;
  reason: string;
  score: number;
}

interface ResultsTableProps {
  results: RankResult[];
}

function openLinkedIn(url: string) {
  window.open(url, '_blank');
}

export default function ResultsTable({ results }: ResultsTableProps) {
  if (results.length === 0) return <p className="no-results">No results yet. Import a CSV and run a query.</p>;

  return (
    <div className="results-table">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Title</th>
            <th>Company</th>
            <th>Fit Reason</th>
            <th>Score</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {results.map(r => (
            <tr key={r.rank}>
              <td>{r.rank}</td>
              <td>{r.name}</td>
              <td>{r.title}</td>
              <td>{r.company}</td>
              <td className="reason">{r.reason}</td>
              <td><span className="score-badge">{r.score}/10</span></td>
              <td>
                <button onClick={() => openLinkedIn(r.linkedInUrl)}>LinkedIn</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}