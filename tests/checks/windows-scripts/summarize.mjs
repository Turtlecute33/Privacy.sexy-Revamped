/**
 * Description:
 *   Reads the results of a `checks.windows-scripts` run and prints what needs a look: scripts that
 *   timed out, wrote to the error stream, changed nothing, changed something again on the second
 *   run, or left the machine different after being reverted.
 *
 * Usage:
 *   gh run download <run id> --dir <directory>
 *   node tests/checks/windows-scripts/summarize.mjs <directory> [options]
 *
 * Options:
 *   --os <text>        Only machines whose name contains the text, e.g. `arm` or `2025`.
 *   --section <name>   Only one section of the report.
 *   --show <number>    Everything recorded for one script: output and changes of every run.
 *
 * Reading the report:
 *   The runners are not clean installations. Their images already set some of the values the
 *   scripts set, and Windows starts and stops services on its own, so an entry is a lead to follow
 *   and not a verdict. A finding that shows on both machines, or that the script's own output
 *   explains, is the one to act on.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [directory, ...options] = process.argv.slice(2);
if (!directory) {
  console.error('Usage: node summarize.mjs <directory with downloaded artifacts> [--os text] [--section name] [--show number]');
  process.exit(1);
}
const option = (name) => {
  const index = options.indexOf(name);
  return index === -1 ? undefined : options[index + 1];
};

const manifest = JSON.parse(readFileSync(join(directory, 'windows-scripts', 'manifest.json'), 'utf8'));
const registryKeysByScript = new Map(
  manifest.map((entry) => [entry.index, entry.registryKeys.map((key) => key.toLowerCase())]),
);
const machines = loadResults(directory, option('--os'));
for (const [machine, records] of machines) {
  console.log(`${machine}: ${records.size} scripts`);
}

if (option('--show')) {
  showScript(Number(option('--show')));
} else {
  printReport(option('--section'));
}

function loadResults(root, machineFilter) {
  const results = new Map();
  for (const entry of readdirSync(root)) {
    const match = /^results-(.+)-\d+$/.exec(entry);
    const file = join(root, entry, 'results.jsonl');
    if (match && existsSync(file) && (!machineFilter || match[1].includes(machineFilter))) {
      const records = results.get(match[1]) ?? new Map();
      readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line.replace(/^﻿/, '')))
        .forEach((record) => records.set(record.index, record));
      results.set(match[1], records);
    }
  }
  return results;
}

function showScript(index) {
  for (const [machine, records] of machines) {
    const record = records.get(index);
    if (record) {
      console.log(`\n===== ${machine} #${record.index} ${record.name} [${record.level ?? 'no preset'}]`);
      for (const [label, run] of Object.entries(record.runs)) {
        console.log(`--- ${label}: exit code ${run.exitCode}, ${run.seconds} s${run.timedOut ? ', TIMED OUT' : ''}`);
        run.output.forEach((line) => console.log(`   ${line}`));
        console.log('  changes:');
        (record.changes[label] ?? []).forEach((change) => console.log(`     ${change}`));
      }
      console.log('--- still different after revert:');
      (record.changes.residual ?? []).forEach((change) => console.log(`     ${change}`));
    }
  }
}

/*
  Changes that say nothing about the script: services Windows starts and stops by itself, the
  servicing stack arming itself after a feature or capability change, and keys next to a watched
  key that the script never names.
*/
function isNoise(change, index) {
  if (/^[~+-] running:/.test(change)
    || /^~ service:(TrustedInstaller|IsolationSession|BITS|wuauserv|UsoSvc|DoSvc|InstallService|ClipSVC|AppReadiness|sppsvc) /.test(change)
    || change.includes('NET Framework NGEN')) {
    return true;
  }
  const registry = /^[~+-] reg:([^!]*?)\\?(?:!.*)?(?: [:=] .*)$/.exec(change);
  if (!registry) {
    return false;
  }
  const key = registry[1].toLowerCase().replace(/(\.old)+$/, '');
  const known = (registryKeysByScript.get(index) ?? [])
    .some((named) => key === named || key.startsWith(`${named}\\`) || named.startsWith(`${key}\\`));
  return !known && !key.endsWith('environment');
}

function withoutNoise(changes, index) {
  return (changes ?? []).filter((change) => !isNoise(change, index));
}

/* A key that did not exist, was created by the script, and is left empty by its revert. */
function isEmptyKeyLeftBehind(change, all) {
  const created = /^~ reg:(.*) : <absent> => <key>$/.exec(change);
  if (created) {
    return !all.some((other) => other.startsWith(`+ reg:${created[1]}!`));
  }
  const subkeys = /^\+ reg:(.*)\\ = (.*)$/.exec(change);
  return subkeys !== null && all.some((other) => other === `~ reg:${subkeys[1]} : <absent> => <key>`);
}

/*
  PowerShell prints the failing command, which here is a whole inlined script, before the message,
  and its position and category after it. The message is what is left.
*/
function excerpt(errorLines) {
  const messages = errorLines
    .map((line) => line.slice(2).trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^(\+|At line:|CategoryInfo|FullyQualifiedErrorId)/.test(line))
    .filter((line) => !/[;{(|]$/.test(line));
  return (messages.length > 0 ? messages : errorLines.map((line) => line.slice(2)))
    .slice(-2)
    .map((line) => line.slice(0, 200))
    .join(' | ');
}

function printReport(onlySection) {
  const sections = {
    'timed out': [],
    'wrote to the error stream when applied': [],
    'wrote to the error stream when reverted': [],
    'changed nothing that is watched': [],
    'changed something again on the second apply': [],
    'still different after revert': [],
    'left an empty registry key after revert': [],
  };
  for (const [machine, records] of machines) {
    const sorted = [...records.values()].sort((a, b) => a.index - b.index);
    for (const record of sorted) {
      const title = `${machine} #${record.index} ${record.name}${record.level ? ` [${record.level}]` : ''}`;
      for (const [label, run] of Object.entries(record.runs)) {
        if (run.timedOut) {
          sections['timed out'].push(`${title} (${label}, ${run.seconds} s)`);
        }
        const errors = run.output.filter((line) => line.startsWith('E ') && line.trim() !== 'E');
        if (errors.length > 0 && label.endsWith('1')) {
          const section = label.startsWith('apply')
            ? 'wrote to the error stream when applied'
            : 'wrote to the error stream when reverted';
          sections[section].push(`${title}: ${excerpt(errors)}`);
        }
      }
      if (withoutNoise(record.changes.apply1, record.index).length === 0) {
        const lastLines = record.runs.apply1.output
          .filter((line) => !/^O (---|Press any key)|^O $/.test(line))
          .slice(-1)
          .map((line) => line.slice(0, 200));
        sections['changed nothing that is watched'].push(`${title}: ${lastLines.join('')}`);
      }
      const repeated = withoutNoise(record.changes.apply2, record.index);
      if (repeated.length > 0) {
        sections['changed something again on the second apply'].push(`${title}: ${repeated.slice(0, 3).join(' | ')}`);
      }
      const residual = withoutNoise(record.changes.residual, record.index);
      const substantive = residual.filter((change) => !isEmptyKeyLeftBehind(change, residual));
      if (substantive.length > 0) {
        sections['still different after revert'].push(`${title}: ${substantive.slice(0, 4).join(' | ')}`);
      } else if (residual.length > 0) {
        sections['left an empty registry key after revert'].push(title);
      }
    }
  }
  for (const [name, entries] of Object.entries(sections)) {
    if (!onlySection || onlySection === name) {
      console.log(`\n=== ${name}: ${entries.length}`);
      entries.forEach((entry) => console.log(entry));
    }
  }
}
