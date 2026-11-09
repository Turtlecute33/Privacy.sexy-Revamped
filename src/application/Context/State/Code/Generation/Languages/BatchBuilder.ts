import { CodeBuilder } from '@/application/Context/State/Code/Generation/CodeBuilder';

export class BatchBuilder extends CodeBuilder {
  protected getCommentDelimiter(): string {
    return '::';
  }

  protected writeStandardOut(text: string): string {
    return `echo ${escapeForEcho(text)}`;
  }

  protected escapeCommentText(text: string): string {
    /*
      `::` comments are labels, and cmd expands `%` on every line before it recognizes one, so a
      script name such as "100%~ off" aborted the whole batch file with a parse error.
    */
    return escapePercentSigns(text);
  }

  protected getNewLineTerminator(): string {
    return '\r\n';
  }
}

/*
  Outside double quotes, `^ & | < >` are cmd operators and must be escaped with `^`; inside them
  they are printed as they are, and so is a `^`, so escaping there would print a stray caret
  (`"Movies ^& TV"`). `%` is expanded everywhere, quoted or not.
*/
function escapeForEcho(text: string): string {
  let isInsideQuotes = false;
  let escaped = '';
  for (const character of escapePercentSigns(text)) {
    if (character === '"') {
      isInsideQuotes = !isInsideQuotes;
    } else if (!isInsideQuotes && CmdOperators.has(character)) {
      escaped += '^';
    }
    escaped += character;
  }
  return escaped;
}

const CmdOperators = new Set(['^', '&', '|', '<', '>']);

function escapePercentSigns(text: string): string {
  return text.replaceAll('%', '%%');
}
