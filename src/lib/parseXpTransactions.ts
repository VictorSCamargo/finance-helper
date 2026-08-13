export type XpTransaction = {
  card: string;
  date: string;
  description: string;
  amountBrl: string;
};

const CARD_HEADER_RE =
  /([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s.'-]{1,}?)\s*-\s*(\d{4}\*{4,}\d{4})/gi;

const TRANSACTION_RE =
  /(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;

/**
 * Pull only purchase rows from XP invoice text.
 * Columns: card, date, description, BRL amount.
 */
export function parseXpTransactions(rawText: string): XpTransaction[] {
  const transactions: XpTransaction[] = [];
  const normalized = rawText.replace(/\u00a0/g, " ");

  // Walk the text with card headers as section anchors
  const headers = [...normalized.matchAll(CARD_HEADER_RE)];
  if (headers.length === 0) {
    return transactions;
  }

  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    const card = header[2];
    const sectionStart = (header.index ?? 0) + header[0].length;
    const sectionEnd =
      index + 1 < headers.length
        ? (headers[index + 1].index ?? normalized.length)
        : normalized.length;
    const section = normalized.slice(sectionStart, sectionEnd);

    for (const match of section.matchAll(TRANSACTION_RE)) {
      const description = match[2].replace(/\s+/g, " ").trim();

      // Skip table headers / summary leftovers
      if (/^(data|descri|subtotal)\b/i.test(description)) {
        continue;
      }

      transactions.push({
        card,
        date: match[1],
        description,
        amountBrl: match[3],
      });
    }
  }

  return transactions;
}

/** Tab-separated rows for pasting into Google Sheets. */
export function transactionsToTsv(transactions: XpTransaction[]): string {
  const header = ["Cartao", "Data", "Descricao", "Valor BRL"].join("\t");
  const rows = transactions.map((tx) =>
    [tx.card, tx.date, tx.description, tx.amountBrl].join("\t"),
  );
  return [header, ...rows].join("\n");
}
