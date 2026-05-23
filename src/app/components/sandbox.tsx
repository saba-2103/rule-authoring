import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  cn, Btn, Inp, IC, StatusBadge,
  Rule, RuleVersion, RuleContent, Condition, RuleAction,
  Table, TableVersion, LookupTable, LookupVersion,
  deriveInputSchema, OPERATORS,
} from './shared';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';

/* ── CLIENT-SIDE RULE EVALUATOR ──────────────────── */
type InputValues = Record<string, string>;

function evalCond(cond: Condition, inputs: InputValues): boolean {
  const raw = inputs[cond.field];
  const val = raw ?? '';
  const cv  = cond.value ?? '';

  switch (cond.operator) {
    case 'IS_NOT_NULL': case 'IS_NOT_EMPTY': return val !== '' && val !== 'null';
    case 'IS_NULL':     case 'IS_EMPTY':     return val === '' || val === 'null';
    case 'EQUALS':         return val.toLowerCase() === cv.toLowerCase();
    case 'NOT_EQUALS':     return val.toLowerCase() !== cv.toLowerCase();
    case 'GREATER_THAN':          return Number(val) >  Number(cv);
    case 'LESS_THAN':             return Number(val) <  Number(cv);
    case 'GREATER_THAN_OR_EQUAL': return Number(val) >= Number(cv);
    case 'LESS_THAN_OR_EQUAL':    return Number(val) <= Number(cv);
    case 'CONTAINS': return val.toLowerCase().includes(cv.toLowerCase());
    case 'IN':     return cv.split(',').map(s => s.trim().toLowerCase()).includes(val.toLowerCase());
    case 'NOT_IN': return !cv.split(',').map(s => s.trim().toLowerCase()).includes(val.toLowerCase());
    case 'BETWEEN': {
      const n = Number(val);
      return n >= Number(cv) && n <= Number(cond.secondValue ?? cv);
    }
    default: return false;
  }
}

interface CondResult {
  field: string;
  operator: string;
  value: string;
  inputValue: string;
  passed: boolean;
}

interface BlockResult {
  blockId: string;
  blockType: string;
  condResults: CondResult[];
  whenPassed: boolean;
  executed: boolean;
  actions: RuleAction[];
}

function evaluateRule(content: RuleContent, inputs: InputValues): BlockResult[] {
  const out: BlockResult[] = [];
  let fired = false;

  for (const group of content.blocks) {
    for (const block of group.blocks) {
      const condResults: CondResult[] =
        block.type !== 'ELSE'
          ? block.when.conditions.map(c => ({
              field: c.field,
              operator: c.operator,
              value: c.value,
              inputValue: inputs[c.field] ?? '',
              passed: evalCond(c, inputs),
            }))
          : [];

      let whenPassed: boolean;
      if (block.type === 'ELSE') {
        whenPassed = !fired;
      } else if (condResults.length === 0) {
        whenPassed = true;
      } else {
        whenPassed = block.when.match === 'and'
          ? condResults.every(r => r.passed)
          : condResults.some(r => r.passed);
      }

      const executed = whenPassed && !fired;
      if (executed) fired = true;

      out.push({ blockId: block.id, blockType: block.type, condResults, whenPassed, executed, actions: block.then });
    }
  }

  return out;
}

/* ── JSON HELPERS ────────────────────────────────── */
function inputsToJsonText(inputs: InputValues): string {
  if (Object.keys(inputs).length === 0) return '{\n  \n}';
  const obj: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(inputs)) {
    if (v === 'true')  { obj[k] = true;  continue; }
    if (v === 'false') { obj[k] = false; continue; }
    const n = Number(v);
    obj[k] = v !== '' && !isNaN(n) ? n : v;
  }
  return JSON.stringify(obj, null, 2);
}

function jsonTextToInputs(text: string): InputValues {
  const parsed = JSON.parse(text); // throws on invalid JSON
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new Error('Expected a JSON object { "field": value, ... }');
  const out: InputValues = {};
  for (const [k, v] of Object.entries(parsed)) out[k] = String(v);
  return out;
}

function buildJsonPayload(
  ruleName: string,
  version: number,
  inputs: InputValues,
  results: BlockResult[]
): object {
  const executed = results.find(r => r.executed);
  const inputObj: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(inputs)) {
    if (v === 'true')  { inputObj[k] = true;  continue; }
    if (v === 'false') { inputObj[k] = false; continue; }
    const n = Number(v);
    inputObj[k] = v !== '' && !isNaN(n) ? n : v;
  }
  const request = { rule: ruleName, version, input: inputObj };
  const response = {
    status: executed ? 'match' : 'no_match',
    firedBlock: executed?.blockType ?? null,
    actions: (executed?.actions ?? []).map(a => ({
      type: a.type,
      ...(a.field ? { field: a.field } : {}),
      ...(a.value !== undefined && a.value !== '' ? { value: a.value } : {}),
    })),
    trace: results.map(r => ({
      block: r.blockType,
      result: r.executed ? 'fired' : r.whenPassed ? 'skipped' : 'no_match',
      conditions: r.condResults.map(c => ({
        field: c.field,
        operator: c.operator,
        expected: c.value,
        got: c.inputValue || null,
        passed: c.passed,
      })),
    })),
  };
  return { request, response };
}

/* ── DECISION TABLE EVALUATOR ───────────────────── */
function evalTableCell(operator: string, got: string, expected: string | number): boolean {
  if (expected === '' || expected === null || expected === undefined) return true;
  const exp = String(expected);
  switch (operator) {
    case 'EQUALS':                return got.toLowerCase() === exp.toLowerCase();
    case 'NOT_EQUALS':            return got.toLowerCase() !== exp.toLowerCase();
    case 'GREATER_THAN':          return Number(got) >  Number(exp);
    case 'LESS_THAN':             return Number(got) <  Number(exp);
    case 'GREATER_THAN_OR_EQUAL': return Number(got) >= Number(exp);
    case 'LESS_THAN_OR_EQUAL':    return Number(got) <= Number(exp);
    case 'CONTAINS':              return got.toLowerCase().includes(exp.toLowerCase());
    case 'IN':     return exp.split(',').map(s => s.trim().toLowerCase()).includes(got.toLowerCase());
    case 'NOT_IN': return !exp.split(',').map(s => s.trim().toLowerCase()).includes(got.toLowerCase());
    default: return got.toLowerCase() === exp.toLowerCase();
  }
}
interface TableCellCheck {
  field: string; label: string; operator: string; expected: string; got: string; passed: boolean; skipped: boolean;
}
interface TableRowEval {
  rowIndex: number; matched: boolean; checks: TableCellCheck[];
  outputs: { field: string; label: string; value: string }[];
}
interface TableEvalResult {
  rowEvals: TableRowEval[]; hitRows: TableRowEval[]; hitPolicy: string;
}
function evaluateTable(ver: TableVersion, inputs: Record<string, string>): TableEvalResult {
  const { hitPolicy, inputs: cols, outputs: outCols, rows } = ver.table;
  const rowEvals: TableRowEval[] = rows.filter(r => r.isEnabled).map((row, ri) => {
    const checks: TableCellCheck[] = cols.map((col, ci) => {
      const expected = row.inputs[ci];
      const skipped  = expected === '' || expected === null || expected === undefined;
      const got      = inputs[col.field] ?? '';
      const passed   = skipped || evalTableCell(col.operator, got, expected);
      return { field: col.field, label: col.label || col.field, operator: col.operator,
               expected: String(expected ?? ''), got, passed, skipped };
    });
    const matched = checks.every(c => c.passed);
    const outputs = outCols.map((col, ci) => ({ field: col.field, label: col.label || col.field, value: String(row.outputs[ci] ?? '') }));
    return { rowIndex: ri + 1, matched, checks, outputs };
  });
  let hitRows: TableRowEval[];
  if (hitPolicy === 'first_match' || hitPolicy === 'priority_order') {
    const first = rowEvals.find(r => r.matched);
    hitRows = first ? [first] : [];
  } else {
    hitRows = rowEvals.filter(r => r.matched);
  }
  return { rowEvals, hitRows, hitPolicy };
}

/* ── LOOKUP EVALUATOR ────────────────────────────── */
interface LookupEvalResult {
  matched: boolean; key: string;
  values?: { field: string; label: string; value: string }[];
}
function evaluateLookup(ver: LookupVersion, key: string): LookupEvalResult {
  if (!key.trim()) return { matched: false, key };
  const row = ver.rows.find(r => r.isEnabled && r.key.toLowerCase() === key.toLowerCase());
  if (!row) return { matched: false, key };
  return { matched: true, key, values: ver.valueColumns.map((col, i) => ({ field: col.field, label: col.label || col.field, value: row.values[i] ?? '' })) };
}

/* ── COPY BUTTON ─────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">
      {copied ? <IC.Check size={11} className="text-emerald-500" /> : <IC.Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/* ── JSON BLOCK ──────────────────────────────────── */
function JsonBlock({ label, value }: { label: string; value: object }) {
  const text = JSON.stringify(value, null, 2);
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <CopyBtn text={text} />
      </div>
      <pre className="p-4 text-xs font-mono text-foreground/80 overflow-auto leading-relaxed max-h-80" style={{ scrollbarWidth: 'thin' }}>
        <code>{text}</code>
      </pre>
    </div>
  );
}

/* ── SANDBOX PAGE ────────────────────────────────── */
interface SandboxPageProps {
  rules: Rule[];
  tables: Table[];
  lookupTables: LookupTable[];
  onHome?: () => void;
  initialRuleId?: string;
  initialVersion?: number;
}

export const SandboxPage: React.FC<SandboxPageProps> = ({ rules, tables, lookupTables, onHome, initialRuleId, initialVersion }) => {
  // Top-level tab
  const [sandboxTab, setSandboxTab] = useState<'rules' | 'tables' | 'lookup'>('rules');

  // ── Rule sandbox state (existing) ──
  const [selectedRuleId, setSelectedRuleId] = useState<string>(initialRuleId ?? '__custom__');
  const [selectedVerNum, setSelectedVerNum] = useState<number | null>(initialVersion ?? null);
  const [inputs, setInputs]                = useState<InputValues>({});
  const [results, setResults]              = useState<BlockResult[] | null>(null);
  const [hasRun, setHasRun]                = useState(false);

  // Custom rule option: no real rule, JSON-only mode
  const isCustom = selectedRuleId === '__custom__';

  // Input mode: form fields or raw JSON
  const [inputMode, setInputMode] = useState<'form' | 'json'>(initialRuleId ? 'form' : 'json');
  const [jsonText, setJsonText]   = useState('{\n  "rule": "",\n  "version": 1,\n  "input": {}\n}');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [customRunMeta, setCustomRunMeta] = useState<{ rule: Rule; ver: RuleVersion } | null>(null);

  // Dropdown open states
  const [ruleDropOpen, setRuleDropOpen]       = useState(false);
  const [versionDropOpen, setVersionDropOpen] = useState(false);
  const ruleDropRef    = useRef<HTMLDivElement>(null);
  const versionDropRef = useRef<HTMLDivElement>(null);
  const inputsContainerRef = useRef<HTMLDivElement>(null);

  // ── Decision table sandbox state ──
  const [selTableId, setSelTableId]         = useState('');
  const [selTableVerNum, setSelTableVerNum] = useState<number | null>(null);
  const [tableInputs, setTableInputs]       = useState<Record<string, string>>({});
  const [tableResult, setTableResult]       = useState<TableEvalResult | null>(null);
  const [tableHasRun, setTableHasRun]       = useState(false);
  const [tableDropOpen, setTableDropOpen]   = useState(false);
  const [tableVerDropOpen, setTableVerDropOpen] = useState(false);
  const tableDropRef    = useRef<HTMLDivElement>(null);
  const tableVerDropRef = useRef<HTMLDivElement>(null);

  // ── Lookup table sandbox state ──
  const [selLookupId, setSelLookupId]         = useState('');
  const [selLookupVerNum, setSelLookupVerNum] = useState<number | null>(null);
  const [lookupKey, setLookupKey]             = useState('');
  const [lookupResult, setLookupResult]       = useState<LookupEvalResult | null>(null);
  const [lookupHasRun, setLookupHasRun]       = useState(false);
  const [lookupDropOpen, setLookupDropOpen]   = useState(false);
  const [lookupVerDropOpen, setLookupVerDropOpen] = useState(false);
  const lookupDropRef    = useRef<HTMLDivElement>(null);
  const lookupVerDropRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ruleDropRef.current && !ruleDropRef.current.contains(e.target as Node)) setRuleDropOpen(false);
      if (versionDropRef.current && !versionDropRef.current.contains(e.target as Node)) setVersionDropOpen(false);
      if (tableDropRef.current && !tableDropRef.current.contains(e.target as Node)) setTableDropOpen(false);
      if (tableVerDropRef.current && !tableVerDropRef.current.contains(e.target as Node)) setTableVerDropOpen(false);
      if (lookupDropRef.current && !lookupDropRef.current.contains(e.target as Node)) setLookupDropOpen(false);
      if (lookupVerDropRef.current && !lookupVerDropRef.current.contains(e.target as Node)) setLookupVerDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Right-panel tab after run
  const [resultTab, setResultTab] = useState<'trace' | 'json'>('trace');

  const rule = !isCustom ? (rules.find(r => r.id === selectedRuleId) ?? null) : null;

  const version: RuleVersion | null = useMemo(() => {
    if (!rule) return null;
    if (selectedVerNum !== null) return rule.versions.find(v => v.version === selectedVerNum) ?? null;
    return [...rule.versions].sort((a, b) => b.version - a.version)[0] ?? null;
  }, [rule, selectedVerNum]);

  const inputSchema = useMemo(() => (version ? deriveInputSchema(version.rule) : null), [version]);

  // Auto-populate JSON template when schema changes
  useEffect(() => {
    if (isCustom || !inputSchema) return;
    const tpl: Record<string, string | number | boolean> = {};
    inputSchema.facts.forEach(f =>
      f.fields.forEach(fld => {
        tpl[`${f.factType}.${fld.name}`] =
          fld.dataType === 'number' ? 0 : fld.dataType === 'boolean' ? false : '';
      })
    );
    setJsonText(Object.keys(tpl).length ? JSON.stringify(tpl, null, 2) : '{\n  \n}');
    setJsonError(null);
  }, [inputSchema, isCustom]);

  const resetAll = useCallback(() => {
    setInputs({}); setJsonError(null);
    setResults(null); setHasRun(false); setResultTab('trace');
    setCustomRunMeta(null);
  }, []);

  // Sync when initialRuleId prop changes (e.g. clicking Play on a different rule while already on sandbox)
  useEffect(() => {
    if (!initialRuleId) return;
    setSelectedRuleId(initialRuleId);
    setSelectedVerNum(initialVersion ?? null);
    setInputMode('form');
    setInputs({}); setJsonError(null); setResults(null); setHasRun(false); setResultTab('trace'); setCustomRunMeta(null);
  }, [initialRuleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus first input after schema loads when arriving via Play button
  useEffect(() => {
    if (!initialRuleId || inputMode !== 'form' || !inputsContainerRef.current) return;
    const first = inputsContainerRef.current.querySelector<HTMLInputElement>('input');
    if (first) setTimeout(() => first.focus(), 80);
  }, [inputSchema, inputMode, initialRuleId]);

  const handleRuleChange = (id: string) => {
    setSelectedRuleId(id); setSelectedVerNum(null);
    setInputMode(id === '__custom__' ? 'json' : 'form');
    if (id === '__custom__') setJsonText('{\n  "rule": "",\n  "version": 1,\n  "input": {}\n}');
    resetAll(); setRuleDropOpen(false);
  };

  const handleVersionChange = (num: number) => {
    setSelectedVerNum(num); resetAll(); setVersionDropOpen(false);
  };

  const switchToJson = () => {
    const hasValues = Object.values(inputs).some(v => v !== '');
    if (hasValues) setJsonText(inputsToJsonText(inputs));
    setJsonError(null);
    setInputMode('json');
  };

  const switchToForm = () => {
    try { setInputs(jsonTextToInputs(jsonText)); setJsonError(null); } catch { /* keep existing */ }
    setInputMode('form');
  };

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (!isCustom && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)))
        throw new Error('Expected a JSON object { "field": value, ... }');
      setJsonError(null);
    } catch (e: unknown) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const handleRun = () => {
    if (isCustom) {
      let payload: { rule?: string; version?: number; input?: Record<string, unknown> };
      try {
        payload = JSON.parse(jsonText);
        if (!payload || typeof payload !== 'object') throw new Error('Expected a JSON object');
      } catch (e: unknown) {
        setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
        return;
      }
      if (!payload.rule) { setJsonError('Missing "rule" field — specify the rule name'); return; }
      const targetRule = rules.find(r => r.name.toLowerCase() === String(payload.rule).toLowerCase());
      if (!targetRule) { setJsonError(`Rule "${payload.rule}" not found`); return; }
      const sortedVers = [...targetRule.versions].sort((a, b) => b.version - a.version);
      const targetVer = payload.version !== undefined
        ? (targetRule.versions.find(v => v.version === payload.version) ?? sortedVers[0])
        : sortedVers[0];
      if (!targetVer) { setJsonError('No versions found for this rule'); return; }
      const runInputs: InputValues = {};
      if (payload.input && typeof payload.input === 'object') {
        for (const [k, v] of Object.entries(payload.input)) runInputs[k] = String(v);
      }
      setInputs(runInputs);
      setCustomRunMeta({ rule: targetRule, ver: targetVer });
      setJsonError(null);
      setResults(evaluateRule(targetVer.rule, runInputs));
      setHasRun(true);
      return;
    }
    if (!version) return;
    let runInputs = inputs;
    if (inputMode === 'json') {
      try {
        runInputs = jsonTextToInputs(jsonText);
        setInputs(runInputs);
        setJsonError(null);
      } catch (e: unknown) {
        setJsonError(e instanceof Error ? e.message : 'Invalid JSON');
        return;
      }
    }
    setResults(evaluateRule(version.rule, runInputs));
    setHasRun(true);
  };

  const executedBlock = results?.find(r => r.executed) ?? null;

  // ── Decision table derived + handlers ──
  const selTable = tables.find(t => t.id === selTableId) ?? null;
  const selTableVersion: TableVersion | null = useMemo(() => {
    if (!selTable) return null;
    if (selTableVerNum !== null) return selTable.versions.find(v => v.version === selTableVerNum) ?? null;
    return [...selTable.versions].sort((a, b) => b.version - a.version)[0] ?? null;
  }, [selTable, selTableVerNum]);

  const handleTableChange = (id: string) => {
    setSelTableId(id); setSelTableVerNum(null);
    setTableInputs({}); setTableResult(null); setTableHasRun(false); setTableDropOpen(false);
  };
  const handleTableVerChange = (num: number) => {
    setSelTableVerNum(num); setTableInputs({}); setTableResult(null); setTableHasRun(false); setTableVerDropOpen(false);
  };
  const handleRunTable = () => {
    if (!selTableVersion) return;
    setTableResult(evaluateTable(selTableVersion, tableInputs)); setTableHasRun(true);
  };
  const resetTable = () => { setTableInputs({}); setTableResult(null); setTableHasRun(false); };

  // ── Lookup derived + handlers ──
  const selLookup = lookupTables.find(t => t.id === selLookupId) ?? null;
  const selLookupVersion: LookupVersion | null = useMemo(() => {
    if (!selLookup) return null;
    if (selLookupVerNum !== null) return selLookup.versions.find(v => v.version === selLookupVerNum) ?? null;
    return [...selLookup.versions].sort((a, b) => b.version - a.version)[0] ?? null;
  }, [selLookup, selLookupVerNum]);

  const handleLookupChange = (id: string) => {
    setSelLookupId(id); setSelLookupVerNum(null);
    setLookupKey(''); setLookupResult(null); setLookupHasRun(false); setLookupDropOpen(false);
  };
  const handleLookupVerChange = (num: number) => {
    setSelLookupVerNum(num); setLookupKey(''); setLookupResult(null); setLookupHasRun(false); setLookupVerDropOpen(false);
  };
  const handleRunLookup = () => {
    if (!selLookupVersion) return;
    setLookupResult(evaluateLookup(selLookupVersion, lookupKey)); setLookupHasRun(true);
  };
  const resetLookup = () => { setLookupKey(''); setLookupResult(null); setLookupHasRun(false); };

  const jsonPayload = useMemo(() => {
    if (!results) return null;
    const r = isCustom ? customRunMeta?.rule ?? null : rule;
    const v = isCustom ? customRunMeta?.ver ?? null : version;
    if (!r || !v) return null;
    return buildJsonPayload(r.name, v.version, inputs, results);
  }, [results, version, rule, inputs, isCustom, customRunMeta]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="bg-background border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
          <button onClick={onHome} className="text-muted-foreground hover:text-foreground transition-colors">Rules</button>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <span className="text-foreground font-medium">Sandbox</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {sandboxTab === 'rules' ? 'Rule Sandbox' : sandboxTab === 'tables' ? 'Decision Table Sandbox' : 'Lookup Table Sandbox'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sandboxTab === 'rules'  && 'Select a rule, fill in inputs, and run to see which logic fires'}
              {sandboxTab === 'tables' && 'Select a decision table, provide input values, and run to see which rows match'}
              {sandboxTab === 'lookup' && 'Select a lookup table, enter a key, and run to retrieve the mapped values'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sandboxTab === 'rules' && hasRun   && <Btn variant="outline" size="sm" onClick={resetAll}><IC.X size={13} />Reset</Btn>}
            {sandboxTab === 'tables' && tableHasRun && <Btn variant="outline" size="sm" onClick={resetTable}><IC.X size={13} />Reset</Btn>}
            {sandboxTab === 'lookup' && lookupHasRun && <Btn variant="outline" size="sm" onClick={resetLookup}><IC.X size={13} />Reset</Btn>}
            {sandboxTab === 'rules' && (
              <Btn size="sm" onClick={handleRun} disabled={(!isCustom && !version) || (inputMode === 'json' && !!jsonError)}>
                <IC.Bolt size={14} />Run Rule
              </Btn>
            )}
            {sandboxTab === 'tables' && (
              <Btn size="sm" onClick={handleRunTable} disabled={!selTableVersion}>
                <IC.Bolt size={14} />Run Table
              </Btn>
            )}
            {sandboxTab === 'lookup' && (
              <Btn size="sm" onClick={handleRunLookup} disabled={!selLookupVersion || !lookupKey.trim()}>
                <IC.Bolt size={14} />Run Lookup
              </Btn>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel: selector + inputs ── */}
        <div className="w-80 border-r border-border bg-background flex flex-col shrink-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>

          {/* ── Tab bar ── */}
          <div className="flex border-b border-border shrink-0">
            {(['rules', 'tables', 'lookup', 'flows'] as const).map(t => (
              <button key={t} type="button"
                disabled={t === 'flows'}
                onClick={() => { if (t !== 'flows') setSandboxTab(t as 'rules' | 'tables' | 'lookup'); }}
                className={cn(
                  'flex-1 py-2.5 text-[11px] font-medium transition-colors border-b-2 -mb-px',
                  sandboxTab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  t === 'flows' && 'opacity-40 cursor-not-allowed',
                )}>
                {t === 'rules' ? 'Rules' : t === 'tables' ? 'Tables' : t === 'lookup' ? 'Lookups' : 'Flows'}
              </button>
            ))}
          </div>

          {/* ── Rules panel ── */}
          {sandboxTab === 'rules' && (<>
          {/* Rule & version selectors */}
          <div className="p-4 border-b border-border flex flex-col gap-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rule</p>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Rule name</label>
              <div ref={ruleDropRef} className="relative">
                <button
                  type="button"
                  onClick={() => setRuleDropOpen(o => !o)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs border border-border rounded-md bg-background text-left transition-colors hover:bg-accent cursor-pointer"
                >
                  {selectedRuleId === '__custom__' ? (
                    <span className="flex-1 text-muted-foreground">Custom JSON</span>
                  ) : (
                    <span className="flex-1 text-foreground font-medium truncate">{rule?.name ?? 'Select a rule…'}</span>
                  )}
                  <IC.ChevD size={12} className="text-muted-foreground shrink-0" />
                </button>
                {ruleDropOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-y-auto max-h-56" style={{ scrollbarWidth: 'thin' }}>
                    <button
                      type="button"
                      onClick={() => handleRuleChange('__custom__')}
                      className={cn('w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent transition-colors', selectedRuleId === '__custom__' && 'bg-primary/5')}
                    >
                      <span className="flex-1 text-muted-foreground">Custom JSON</span>
                      {selectedRuleId === '__custom__' && <IC.Check size={12} className="text-primary shrink-0" />}
                    </button>
                    <div className="border-t border-border" />
                    {rules.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRuleChange(r.id)}
                        className={cn('w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent transition-colors', selectedRuleId === r.id && 'bg-primary/5')}
                      >
                        <span className="flex-1 font-medium text-foreground truncate">{r.name}</span>
                        {selectedRuleId === r.id && <IC.Check size={12} className="text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {rule && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Version</label>
                <div ref={versionDropRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setVersionDropOpen(o => !o)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs border border-border rounded-md bg-background text-left transition-colors hover:bg-accent cursor-pointer"
                  >
                    {version ? (
                      <>
                        <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-semibold text-[10px] leading-none">
                          V{version.version}
                        </span>
                        <span className="flex-1 font-medium text-foreground truncate">
                          {version.description || version.changeSummary || `Version ${version.version}`}
                        </span>
                        <StatusBadge status={version.status} />
                      </>
                    ) : (
                      <span className="flex-1 text-muted-foreground">Select version…</span>
                    )}
                    <IC.ChevD size={12} className="text-muted-foreground shrink-0" />
                  </button>
                  {versionDropOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-y-auto max-h-56" style={{ scrollbarWidth: 'thin' }}>
                      {[...rule.versions].sort((a, b) => b.version - a.version).map(v => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleVersionChange(v.version)}
                          className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors', version?.version === v.version && 'bg-primary/5')}
                        >
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-semibold text-[10px] leading-none">
                            V{v.version}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {v.description || `Version ${v.version}`}
                            </p>
                            {v.changeSummary && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{v.changeSummary}</p>
                            )}
                          </div>
                          <span className="shrink-0 scale-90 origin-right inline-flex"><StatusBadge status={v.status} /></span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Input mode toggle + label */}
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Input Values</p>
            <Tabs
              value={inputMode}
              onValueChange={v => v === 'form' ? switchToForm() : switchToJson()}
              className={cn(isCustom && 'opacity-40 pointer-events-none')}
            >
              <TabsList>
                <TabsTrigger value="form">Form</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Input content */}
          <div ref={inputsContainerRef} className="px-4 pb-4 flex flex-col gap-3 flex-1">
            {inputMode === 'form' && !isCustom ? (
              /* ── FORM MODE ── */
              <>
                {!version ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground">Select a rule and version to see its required inputs</p>
                  </div>
                ) : inputSchema?.facts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground">No input fields detected — add conditions to the rule to populate this</p>
                  </div>
                ) : (
                  inputSchema?.facts.map(fact => (
                    <div key={fact.factType}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 px-0.5">{fact.factType}</p>
                      <div className="flex flex-col gap-2">
                        {fact.fields.map(fld => {
                          const path  = `${fact.factType}.${fld.name}`;
                          const label = fld.name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                          const isHighlight = results != null && executedBlock?.condResults.some(c => c.field === path);
                          return (
                            <div key={path}>
                              <label className="text-xs text-foreground/70 mb-0.5 block">{label}</label>
                              <Inp
                                value={inputs[path] ?? ''}
                                onChange={e => setInputs(prev => ({ ...prev, [path]: e.target.value }))}
                                placeholder={fld.dataType === 'number' ? 'e.g. 42' : fld.dataType === 'boolean' ? 'true or false' : 'value…'}
                                className={cn('text-xs w-full', isHighlight && 'border-primary/40 bg-primary/5')}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </>
            ) : (
              /* ── JSON MODE ── */
              <div className="flex flex-col gap-2">
                {isCustom && (
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Provide <code className="font-mono bg-muted px-1 rounded">rule</code> (name), optional <code className="font-mono bg-muted px-1 rounded">version</code> (number), and <code className="font-mono bg-muted px-1 rounded">input</code> (field values map). The rule is matched by name.
                  </p>
                )}
                <div className={cn('rounded-lg border overflow-hidden', jsonError ? 'border-destructive/50' : 'border-border focus-within:border-ring')}>
                  <textarea
                    value={jsonText}
                    onChange={e => handleJsonChange(e.target.value)}
                    spellCheck={false}
                    className="w-full font-mono text-xs p-3 bg-background text-foreground resize-none focus:outline-none min-h-[220px]"
                    style={{ scrollbarWidth: 'thin' }}
                  />
                </div>
                {jsonError && (
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <IC.X size={10} />{jsonError}
                  </p>
                )}
              </div>
            )}
          </div>

          </>)}

          {/* ── Decision Tables panel ── */}
          {sandboxTab === 'tables' && (<>
            <div className="p-4 border-b border-border flex flex-col gap-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Decision Table</p>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Table name</label>
                <div ref={tableDropRef} className="relative">
                  <button type="button" onClick={() => setTableDropOpen(o => !o)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs border border-border rounded-md bg-background text-left transition-colors hover:bg-accent cursor-pointer">
                    <span className={cn('flex-1 truncate', selTable ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                      {selTable?.name ?? 'Select a table…'}
                    </span>
                    <IC.ChevD size={12} className="text-muted-foreground shrink-0" />
                  </button>
                  {tableDropOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-y-auto max-h-56" style={{ scrollbarWidth: 'thin' }}>
                      {tables.map(t => (
                        <button key={t.id} type="button" onClick={() => handleTableChange(t.id)}
                          className={cn('w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent transition-colors', selTableId === t.id && 'bg-primary/5')}>
                          <span className="flex-1 font-medium text-foreground truncate">{t.name}</span>
                          {selTableId === t.id && <IC.Check size={12} className="text-primary shrink-0" />}
                        </button>
                      ))}
                      {tables.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">No tables available</p>}
                    </div>
                  )}
                </div>
              </div>
              {selTable && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Version</label>
                  <div ref={tableVerDropRef} className="relative">
                    <button type="button" onClick={() => setTableVerDropOpen(o => !o)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs border border-border rounded-md bg-background text-left transition-colors hover:bg-accent cursor-pointer">
                      {selTableVersion ? (
                        <>
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-semibold text-[10px] leading-none">V{selTableVersion.version}</span>
                          <span className="flex-1 font-medium text-foreground truncate">{selTableVersion.changeSummary || `Version ${selTableVersion.version}`}</span>
                          <StatusBadge status={selTableVersion.status} />
                        </>
                      ) : <span className="flex-1 text-muted-foreground">Select version…</span>}
                      <IC.ChevD size={12} className="text-muted-foreground shrink-0" />
                    </button>
                    {tableVerDropOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-y-auto max-h-56" style={{ scrollbarWidth: 'thin' }}>
                        {[...selTable.versions].sort((a, b) => b.version - a.version).map(v => (
                          <button key={v.id} type="button" onClick={() => handleTableVerChange(v.version)}
                            className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors', selTableVersion?.version === v.version && 'bg-primary/5')}>
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-semibold text-[10px] leading-none">V{v.version}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{v.changeSummary || `Version ${v.version}`}</p>
                            </div>
                            <span className="shrink-0 scale-90 origin-right inline-flex"><StatusBadge status={v.status} /></span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 pt-3 pb-1 shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Input Values</p>
            </div>
            <div className="px-4 pb-4 flex flex-col gap-2.5 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {!selTableVersion ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center mt-1">
                  <p className="text-xs text-muted-foreground">Select a table and version to see its input fields</p>
                </div>
              ) : selTableVersion.table.inputs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center mt-1">
                  <p className="text-xs text-muted-foreground">No input columns defined on this table</p>
                </div>
              ) : (
                selTableVersion.table.inputs.map((col, i) => (
                  <div key={i}>
                    <label className="text-xs text-foreground/70 mb-0.5 block">{col.label || col.field}</label>
                    <Inp value={tableInputs[col.field] ?? ''}
                      onChange={e => setTableInputs(prev => ({ ...prev, [col.field]: e.target.value }))}
                      placeholder={col.dataType === 'number' ? 'e.g. 42' : 'value…'}
                      className="text-xs w-full" />
                  </div>
                ))
              )}
            </div>
          </>)}

          {/* ── Lookup Tables panel ── */}
          {sandboxTab === 'lookup' && (<>
            <div className="p-4 border-b border-border flex flex-col gap-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lookup Table</p>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">Table name</label>
                <div ref={lookupDropRef} className="relative">
                  <button type="button" onClick={() => setLookupDropOpen(o => !o)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs border border-border rounded-md bg-background text-left transition-colors hover:bg-accent cursor-pointer">
                    <span className={cn('flex-1 truncate', selLookup ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                      {selLookup?.name ?? 'Select a table…'}
                    </span>
                    <IC.ChevD size={12} className="text-muted-foreground shrink-0" />
                  </button>
                  {lookupDropOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-y-auto max-h-56" style={{ scrollbarWidth: 'thin' }}>
                      {lookupTables.map(t => (
                        <button key={t.id} type="button" onClick={() => handleLookupChange(t.id)}
                          className={cn('w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent transition-colors', selLookupId === t.id && 'bg-primary/5')}>
                          <span className="flex-1 font-medium text-foreground truncate">{t.name}</span>
                          {selLookupId === t.id && <IC.Check size={12} className="text-primary shrink-0" />}
                        </button>
                      ))}
                      {lookupTables.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">No lookup tables available</p>}
                    </div>
                  )}
                </div>
              </div>
              {selLookup && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Version</label>
                  <div ref={lookupVerDropRef} className="relative">
                    <button type="button" onClick={() => setLookupVerDropOpen(o => !o)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs border border-border rounded-md bg-background text-left transition-colors hover:bg-accent cursor-pointer">
                      {selLookupVersion ? (
                        <>
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-semibold text-[10px] leading-none">V{selLookupVersion.version}</span>
                          <span className="flex-1 font-medium text-foreground truncate">{selLookupVersion.changeSummary || `Version ${selLookupVersion.version}`}</span>
                          <StatusBadge status={selLookupVersion.status} />
                        </>
                      ) : <span className="flex-1 text-muted-foreground">Select version…</span>}
                      <IC.ChevD size={12} className="text-muted-foreground shrink-0" />
                    </button>
                    {lookupVerDropOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-y-auto max-h-56" style={{ scrollbarWidth: 'thin' }}>
                        {[...selLookup.versions].sort((a, b) => b.version - a.version).map(v => (
                          <button key={v.id} type="button" onClick={() => handleLookupVerChange(v.version)}
                            className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors', selLookupVersion?.version === v.version && 'bg-primary/5')}>
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-semibold text-[10px] leading-none">V{v.version}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{v.changeSummary || `Version ${v.version}`}</p>
                            </div>
                            <span className="shrink-0 scale-90 origin-right inline-flex"><StatusBadge status={v.status} /></span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 pt-3 pb-1 shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lookup Key</p>
            </div>
            <div className="px-4 pb-4 flex flex-col gap-2.5 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {!selLookupVersion ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center mt-1">
                  <p className="text-xs text-muted-foreground">Select a lookup table and version first</p>
                </div>
              ) : (
                <div>
                  <label className="text-xs text-foreground/70 mb-0.5 block">
                    {selLookupVersion.keyColumn.label || selLookupVersion.keyColumn.field}
                  </label>
                  <Inp value={lookupKey} onChange={e => setLookupKey(e.target.value)}
                    placeholder="Enter key value…" className="text-xs w-full" />
                </div>
              )}
            </div>
          </>)}

        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Rule results */}
          {sandboxTab === 'rules' && (!hasRun ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <IC.Bolt size={24} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Ready to test</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Fill in the input values on the left and click <strong>Run Rule</strong> to see which conditions match and which actions would fire.
                </p>
              </div>
            </div>
          ) : results && (
            <>
              {/* Result tabs */}
              <div className="border-b border-border px-6 pt-4 flex items-center shrink-0">
                {(['trace', 'json'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setResultTab(tab)}
                    className={cn(
                      'px-4 pb-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                      resultTab === tab
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab === 'trace' ? 'Trace' : 'JSON'}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
                {resultTab === 'trace' ? (
                  /* ── TRACE TAB ── */
                  <div className="max-w-2xl mx-auto">
                    {/* Summary banner */}
                    <div className={cn(
                      'rounded-xl border p-4 mb-6 flex items-center gap-4',
                      executedBlock ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
                    )}>
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                        executedBlock ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      )}>
                        {executedBlock ? <IC.Check size={18} /> : <IC.X size={18} />}
                      </div>
                      <div>
                        <p className={cn('text-sm font-semibold', executedBlock ? 'text-emerald-700' : 'text-amber-700')}>
                          {executedBlock
                            ? `Block fired — ${executedBlock.blockType.replace('_', ' ')}`
                            : 'No block fired'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {executedBlock
                            ? `${executedBlock.actions.length} action${executedBlock.actions.length !== 1 ? 's' : ''} would execute`
                            : 'None of the conditions matched the provided inputs'}
                        </p>
                      </div>
                      {executedBlock && executedBlock.actions.length > 0 && (
                        <div className="ml-auto flex flex-wrap gap-1.5">
                          {executedBlock.actions.slice(0, 3).map(a => (
                            <span key={a.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100/80 text-emerald-700 text-[10px] font-semibold">
                              {a.type}{a.field ? ` → ${a.field.split('.').pop()}` : ''}
                            </span>
                          ))}
                          {executedBlock.actions.length > 3 && (
                            <span className="text-[10px] text-muted-foreground self-center">+{executedBlock.actions.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Block-by-block breakdown */}
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Block Breakdown</p>
                    <div className="flex flex-col gap-3">
                      {results.map(res => (
                        <div key={res.blockId} className={cn(
                          'rounded-xl border overflow-hidden',
                          res.executed ? 'border-emerald-200' : 'border-border'
                        )}>
                          <div className={cn(
                            'px-4 py-2.5 flex items-center gap-2.5 border-b',
                            res.executed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-muted/20 border-border'
                          )}>
                            <span className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                              res.blockType === 'IF'      && (res.executed ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/10 text-primary'),
                              res.blockType === 'ELSE_IF' && (res.executed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600'),
                              res.blockType === 'ELSE'    && (res.executed ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'),
                            )}>
                              {res.blockType.replace('_', ' ')}
                            </span>
                            <span className={cn(
                              'text-xs font-medium ml-auto',
                              res.executed ? 'text-emerald-600' : res.whenPassed ? 'text-muted-foreground/60' : 'text-muted-foreground/40'
                            )}>
                              {res.executed ? '✓ Fired' : res.whenPassed ? 'Conditions passed — skipped (earlier block fired)' : 'Did not fire'}
                            </span>
                          </div>

                          <div className="p-4">
                            {res.blockType === 'ELSE' ? (
                              <p className="text-xs text-muted-foreground italic mb-3">Fallback — fires if no earlier block matched</p>
                            ) : res.condResults.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic mb-3">No conditions — always fires</p>
                            ) : (
                              <div className="mb-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                  Conditions ({res.whenPassed || res.executed ? 'passed' : 'failed'})
                                </p>
                                <div className="flex flex-col gap-1.5">
                                  {res.condResults.map((cr, j) => (
                                    <div key={j} className={cn(
                                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs',
                                      cr.passed ? 'bg-emerald-50/60' : 'bg-red-50/40'
                                    )}>
                                      <span className={cn(
                                        'w-4 h-4 rounded-full flex items-center justify-center shrink-0',
                                        cr.passed ? 'bg-emerald-200 text-emerald-700' : 'bg-red-200 text-red-600'
                                      )}>
                                        {cr.passed ? <IC.Check size={9} /> : <IC.X size={9} />}
                                      </span>
                                      <span className="font-mono text-foreground/70">{cr.field}</span>
                                      <span className="text-muted-foreground">
                                        {OPERATORS.find(o => o.value === cr.operator)?.label || cr.operator}
                                      </span>
                                      {cr.value && (
                                        <span className="font-mono bg-background px-1.5 py-0.5 rounded border border-border">{cr.value}</span>
                                      )}
                                      <span className="ml-auto text-muted-foreground/60">
                                        got: <span className="font-mono text-foreground/70">{cr.inputValue || '—'}</span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {res.actions.length > 0 ? (
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                  Actions {res.executed ? '— will execute' : '— would execute if fired'}
                                </p>
                                <div className="flex flex-col gap-1.5">
                                  {res.actions.map(a => (
                                    <div key={a.id} className={cn(
                                      'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
                                      res.executed ? 'bg-emerald-50/60' : 'bg-muted/30'
                                    )}>
                                      <span className={cn(
                                        'px-1.5 py-0.5 rounded font-mono font-semibold text-[10px]',
                                        res.executed ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                                      )}>
                                        {a.type}
                                      </span>
                                      {a.field && <span className="font-mono text-foreground/70">{a.field}</span>}
                                      {a.value && (
                                        <><span className="text-muted-foreground">→</span><span className="font-mono text-foreground font-medium">{a.value}</span></>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">No actions defined for this block</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* ── JSON TAB ── */
                  <div className="max-w-2xl mx-auto flex flex-col gap-6">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Request</p>
                      <p className="text-xs text-muted-foreground mb-3">The input payload sent to the rule engine</p>
                      {jsonPayload && <JsonBlock label="request" value={(jsonPayload as { request: object }).request} />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Response</p>
                      <p className="text-xs text-muted-foreground mb-3">The matched block, output actions, and per-block trace</p>
                      {jsonPayload && <JsonBlock label="response" value={(jsonPayload as { response: object }).response} />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Full Payload</p>
                      <p className="text-xs text-muted-foreground mb-3">Request + response combined — useful for logging or API mocking</p>
                      {jsonPayload && <JsonBlock label="full payload" value={jsonPayload} />}
                    </div>
                  </div>
                )}
              </div>
            </>
          ))}

          {/* Decision Table results */}
          {sandboxTab === 'tables' && (!tableHasRun ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <IC.Bolt size={24} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Ready to test</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Select a table, fill in the inputs, and click Run Table</p>
              </div>
            </div>
          ) : tableResult == null ? null : (
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
              <div className="max-w-3xl mx-auto flex flex-col gap-6">
                {/* Summary */}
                <div className={cn(
                  'rounded-xl border p-4 flex items-center gap-4',
                  tableResult.hitRows.length > 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
                )}>
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    tableResult.hitRows.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600')}>
                    {tableResult.hitRows.length > 0 ? <IC.Check size={18} /> : <IC.X size={18} />}
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', tableResult.hitRows.length > 0 ? 'text-emerald-700' : 'text-amber-700')}>
                      {tableResult.hitRows.length > 0
                        ? `${tableResult.hitRows.length} row${tableResult.hitRows.length !== 1 ? 's' : ''} matched`
                        : 'No rows matched'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tableResult.hitRows.length > 0
                        ? `Hit policy: ${tableResult.hitPolicy}`
                        : 'None of the rows matched the provided inputs'}
                    </p>
                  </div>
                </div>

                {/* Row evaluations */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Row Evaluations</p>
                  {tableResult.rowEvals.map((row, i) => (
                    <div key={i} className={cn('rounded-xl border p-4 flex flex-col gap-3',
                      row.matched ? 'border-emerald-200 bg-emerald-50/30' : 'border-border bg-background')}>
                      <div className="flex items-center gap-2">
                        <div className={cn('w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]',
                          row.matched ? 'bg-emerald-100 text-emerald-600' : 'bg-muted text-muted-foreground')}>
                          {row.matched ? <IC.Check size={10} /> : <IC.X size={10} />}
                        </div>
                        <p className={cn('text-xs font-semibold', row.matched ? 'text-emerald-700' : 'text-muted-foreground')}>
                          Row {row.rowIndex} — {row.matched ? 'Matched' : 'Not matched'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conditions</p>
                        <div className="flex flex-col gap-1">
                          {row.checks.map((c, j) => (
                            <div key={j} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md text-xs',
                              c.passed ? 'bg-emerald-50' : 'bg-destructive/5')}>
                              <span className={cn('font-mono', c.passed ? 'text-emerald-700' : 'text-destructive/80')}>{c.label}</span>
                              {!c.skipped && <><span className="text-muted-foreground text-[10px]">{c.operator}</span>
                              <span className="font-mono text-foreground/70">{c.expected}</span></>}
                              {c.skipped && <span className="text-muted-foreground text-[10px] italic">wildcard</span>}
                              <span className="text-muted-foreground">→</span>
                              <span className="font-mono text-foreground font-medium">{c.got}</span>
                              <span className="ml-auto">{c.passed ? <IC.Check size={10} className="text-emerald-600" /> : <IC.X size={10} className="text-destructive/60" />}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {row.matched && row.outputs.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Outputs</p>
                          <div className="flex flex-wrap gap-2">
                            {row.outputs.map((out, oi) => (
                              <span key={oi} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100/80 text-emerald-700 text-[10px] font-semibold">
                                {out.label}: {out.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Lookup results */}
          {sandboxTab === 'lookup' && (!lookupHasRun ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <IC.Bolt size={24} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Ready to test</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">Select a lookup table, enter a key, and click Run Lookup</p>
              </div>
            </div>
          ) : lookupResult == null ? null : (
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
              <div className="max-w-2xl mx-auto flex flex-col gap-6">
                {/* Summary */}
                <div className={cn(
                  'rounded-xl border p-4 flex items-center gap-4',
                  lookupResult.matched ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/50 border-amber-200'
                )}>
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                    lookupResult.matched ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600')}>
                    {lookupResult.matched ? <IC.Check size={18} /> : <IC.X size={18} />}
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold', lookupResult.matched ? 'text-emerald-700' : 'text-amber-700')}>
                      {lookupResult.matched ? 'Key found' : 'Key not found'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lookupResult.matched
                        ? `Looked up "${lookupResult.key}" — ${lookupResult.values.length} value${lookupResult.values.length !== 1 ? 's' : ''} returned`
                        : `No entry matches key "${lookupResult.key}"`}
                    </p>
                  </div>
                </div>

                {/* Values */}
                {lookupResult.matched && selLookupVersion && (
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Returned Values</p>
                    <div className="flex flex-col gap-2">
                      {selLookupVersion.valueColumns.map((col, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/30">
                          <span className="text-xs text-muted-foreground w-32 truncate">{col.label || col.field}</span>
                          <span className="text-xs font-mono font-semibold text-foreground flex-1">{lookupResult.values[i] ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
