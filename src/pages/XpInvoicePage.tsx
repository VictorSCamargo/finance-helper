import { useMemo, useState, type FormEvent } from "react";
import { extractPdfText, PdfPasswordError } from "@/lib/extractPdfText";
import {
  parseXpTransactions,
  transactionsToTsv,
  type XpTransaction,
} from "@/lib/parseXpTransactions";

export function XpInvoicePage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<XpTransaction[]>([]);
  const [copied, setCopied] = useState(false);

  const tsv = useMemo(() => transactionsToTsv(transactions), [transactions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Choose a PDF file first.");
      return;
    }

    setBusy(true);
    setError(null);
    setTransactions([]);
    setCopied(false);

    try {
      const text = await extractPdfText(file, password);
      const rows = parseXpTransactions(text);
      setTransactions(rows);

      if (rows.length === 0) {
        setError(
          "No invoice transactions were found. Check that this is an XP statement PDF.",
        );
      }
    } catch (cause) {
      if (cause instanceof PdfPasswordError) {
        setError("Wrong or missing password. Try again.");
      } else if (cause instanceof Error) {
        setError(cause.message);
      } else {
        setError("Failed to read the PDF.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(tsv);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="page">
      <header className="page__header">
        <p className="brand">Finance Helper</p>
        <h1>XP invoice to Google Sheets</h1>
        <p className="lede">
          Extract card charges from an XP invoice PDF into rows you can paste
          into Google Sheets. Processing stays in your browser.
        </p>
      </header>

      <section className="privacy-banner" aria-label="Privacy">
        <strong>Your PDF never leaves this device.</strong>
        <span>No upload to a backend. Password and file stay in the browser.</span>
      </section>

      <form className="panel" onSubmit={handleSubmit}>
        <label className="field">
          <span>PDF file</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setTransactions([]);
              setError(null);
              setCopied(false);
            }}
          />
        </label>

        <label className="field">
          <span>PDF password</span>
          <input
            type="password"
            autoComplete="off"
            value={password}
            disabled={busy}
            placeholder="Invoice password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <button className="button" type="submit" disabled={busy || !file}>
          {busy ? "Extracting..." : "Extract charges"}
        </button>
      </form>

      {file ? (
        <p className="file-meta">
          Selected: <span>{file.name}</span>
        </p>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      {transactions.length > 0 ? (
        <section className="result">
          <div className="result__header">
            <h2>{transactions.length} charges</h2>
            <button type="button" className="button" onClick={handleCopy}>
              {copied ? "Copied" : "Copy for Google Sheets"}
            </button>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cartao</th>
                  <th>Data</th>
                  <th>Descricao</th>
                  <th>Valor BRL</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => (
                  <tr key={`${tx.card}-${tx.date}-${tx.description}-${index}`}>
                    <td>{tx.card}</td>
                    <td>{tx.date}</td>
                    <td>{tx.description}</td>
                    <td className="amount">{tx.amountBrl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
