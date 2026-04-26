// Tiny boolean query language for the guidelines search.
//
// Supported syntax:
//   word          — a Hebrew/English token. Hebrew prefixes (ה/ב/ל/מ/ש/ו/כ)
//                   are stripped to get a "lemma" so "הפגנה" also matches "פגנה".
//   "exact text"  — exact substring (no prefix expansion, no tokenization).
//   A OR B        — boolean OR (also "A או B").
//   (A B) OR C    — grouping with parentheses.
//   A B           — implicit AND between adjacent terms.
//
// All operators are case-insensitive. The parser is permissive: bad input
// degrades to "all the words AND'd", same as the previous behavior.

export type QueryNode =
  | { type: "word"; value: string }
  | { type: "phrase"; value: string }
  | { type: "and"; children: QueryNode[] }
  | { type: "or"; children: QueryNode[] };

const HEB_PREFIX_RE = /^[הבלמשוכ]+/;
const OR_KEYWORDS = new Set(["or", "או"]);

interface Token {
  type: "word" | "phrase" | "or" | "lparen" | "rparen";
  value?: string;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === '"' || c === "“" || c === "”") {
      const start = i + 1;
      let j = start;
      while (j < input.length && input[j] !== '"' && input[j] !== "“" && input[j] !== "”") {
        j++;
      }
      const phrase = input.slice(start, j).trim();
      if (phrase.length > 0) tokens.push({ type: "phrase", value: phrase });
      i = j + 1;
      continue;
    }
    if (c === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    let j = i;
    while (j < input.length && !/[\s()"“”]/.test(input[j])) j++;
    const word = input.slice(i, j);
    if (OR_KEYWORDS.has(word.toLowerCase())) {
      tokens.push({ type: "or" });
    } else if (word.length > 0) {
      tokens.push({ type: "word", value: word });
    }
    i = j;
  }
  return tokens;
}

interface ParseState {
  tokens: Token[];
  pos: number;
}

function parseOr(s: ParseState): QueryNode | null {
  const left = parseAnd(s);
  if (!left) return null;
  const branches: QueryNode[] = [left];
  while (s.pos < s.tokens.length && s.tokens[s.pos].type === "or") {
    s.pos++;
    const right = parseAnd(s);
    if (right) branches.push(right);
  }
  return branches.length === 1 ? branches[0] : { type: "or", children: branches };
}

function parseAnd(s: ParseState): QueryNode | null {
  const children: QueryNode[] = [];
  while (s.pos < s.tokens.length) {
    const t = s.tokens[s.pos];
    if (t.type === "or" || t.type === "rparen") break;
    if (t.type === "word") {
      children.push({ type: "word", value: t.value! });
      s.pos++;
    } else if (t.type === "phrase") {
      children.push({ type: "phrase", value: t.value! });
      s.pos++;
    } else if (t.type === "lparen") {
      s.pos++;
      const inner = parseOr(s);
      if (s.pos < s.tokens.length && s.tokens[s.pos].type === "rparen") s.pos++;
      if (inner) children.push(inner);
    } else {
      break;
    }
  }
  if (children.length === 0) return null;
  return children.length === 1 ? children[0] : { type: "and", children };
}

export function parseQuery(input: string): QueryNode | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const state: ParseState = { tokens: tokenize(trimmed), pos: 0 };
  return parseOr(state);
}

// Turn the AST into a flat string we can hand to the embedding model. The
// embedding doesn't understand operators — drop them and keep the tokens.
export function flattenForEmbedding(node: QueryNode): string {
  switch (node.type) {
    case "word":
    case "phrase":
      return node.value;
    case "and":
    case "or":
      return node.children.map(flattenForEmbedding).join(" ");
  }
}

// Ranking signal: surface terms a user typed (for highlighting in the
// snippet) — phrases and words flat, no operators.
export function collectTerms(node: QueryNode): string[] {
  const out: string[] = [];
  const walk = (n: QueryNode) => {
    if (n.type === "word" || n.type === "phrase") out.push(n.value);
    else n.children.forEach(walk);
  };
  walk(node);
  return out;
}

// True when the query is just one bare word (no operators, no phrase, no
// AND/OR). For these very short queries semantic alone tends to return noise,
// so we require a substring hit before trusting any results.
export function isBareSingleWord(node: QueryNode): boolean {
  return node.type === "word";
}

function expandPrefixes(term: string): string[] {
  const variants = new Set<string>([term]);
  const stripped = term.replace(HEB_PREFIX_RE, "");
  if (stripped.length >= 2) variants.add(stripped);
  return Array.from(variants);
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const pos = haystack.indexOf(needle, idx);
    if (pos === -1) break;
    count += 1;
    idx = pos + needle.length;
  }
  return count;
}

export interface EvalResult {
  matched: boolean;
  matchCount: number;
}

// Evaluate a parsed query against an already-normalized haystack. The caller
// supplies the same normalization function it used to produce the haystack so
// terms in the query get normalized in lock-step.
export function evaluateQuery(
  node: QueryNode,
  normalizedHaystack: string,
  normalizeTerm: (s: string) => string,
): EvalResult {
  switch (node.type) {
    case "word": {
      const term = normalizeTerm(node.value);
      if (term.length < 2) return { matched: false, matchCount: 0 };
      let count = 0;
      for (const variant of expandPrefixes(term)) {
        count += countOccurrences(normalizedHaystack, variant);
      }
      return { matched: count > 0, matchCount: count };
    }
    case "phrase": {
      const term = normalizeTerm(node.value);
      const count = countOccurrences(normalizedHaystack, term);
      return { matched: count > 0, matchCount: count };
    }
    case "and": {
      let total = 0;
      for (const c of node.children) {
        const r = evaluateQuery(c, normalizedHaystack, normalizeTerm);
        if (!r.matched) return { matched: false, matchCount: 0 };
        total += r.matchCount;
      }
      return { matched: true, matchCount: total };
    }
    case "or": {
      let any = false;
      let best = 0;
      for (const c of node.children) {
        const r = evaluateQuery(c, normalizedHaystack, normalizeTerm);
        if (r.matched) {
          any = true;
          if (r.matchCount > best) best = r.matchCount;
        }
      }
      return { matched: any, matchCount: best };
    }
  }
}
