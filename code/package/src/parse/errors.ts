/**
 * Thrown by {@link parseFlowchart} when the DSL text cannot be parsed.
 * Carries a 1-based line (and optional column) so a caller — human or agent —
 * can point back at the offending source line.
 */
export class FlowchartParseError extends Error {
  /** 1-based line number of the offending text. */
  public readonly line: number;
  /** 1-based column number of the offending text. */
  public readonly column: number;
  /** Machine-readable reason, also used as the human-readable message. */
  public readonly reason: string;

  constructor(reason: string, line: number, column = 1) {
    super(`${reason} (line ${line})`);
    this.name = 'FlowchartParseError';
    this.reason = reason;
    this.line = line;
    this.column = column;
    Object.setPrototypeOf(this, FlowchartParseError.prototype);
  }
}
