// SETUP: parse-error port — the typed failure the parser throws on malformed DSL. Never a
// partial graph; always a FlowchartParseError carrying 1-based line/column + reason.

/**
 * Typed parse error. The parser never silently produces a partial graph — on any
 * malformed input it throws this, carrying the 1-based line/column and a reason.
 */
export class FlowchartParseError extends Error {
  /** 1-based line number where parsing failed. */
  readonly line: number;
  /** 1-based column number where parsing failed. */
  readonly column: number;
  /** Human-readable reason. */
  readonly reason: string;

  constructor(reason: string, line: number, column = 1) {
    super(`line ${line}:${column}: ${reason}`);
    this.name = 'FlowchartParseError';
    this.reason = reason;
    this.line = line;
    this.column = column;
    Object.setPrototypeOf(this, FlowchartParseError.prototype);
  }
}
