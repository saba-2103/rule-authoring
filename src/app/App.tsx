import React, { useState, useCallback, useEffect } from 'react';
import {
  uid, IC, Modal, PrimarySidebar, SecondarySidebar, Toast,
  SEED_SPACES, SEED_RULES, SEED_GTL_RULES, SEED_A2_RULES, SEED_A3_RULES, SEED_A4_RULES, SEED_A5_RULES,
  SEED_TABLES, SEED_FLOWS, SEED_FACTS, SEED_FACT_FIELDS, SEED_LOOKUP_TABLES,
  Space, Rule, Table, Flow, Fact, FactField, LookupTable,
} from './components/shared';
import { SpacesPage, SpacePickerModal } from './components/spaces';
import { DecisionsPage } from './components/decisions-list';
import { RuleDetailPage, EditMetaModal, DeleteRuleModal } from './components/rule-detail';
import { RuleCreatePage, RuleForm } from './components/rule-create';
import { TableDetailPage, TableCreatePage, EditTableModal } from './components/table-detail';
import { FlowDetailPage } from './components/flow-detail';
import { FieldsPage } from './components/fields';
import { SandboxPage } from './components/sandbox';
import { LookupListPage, LookupTableDetail, LookupTableCreate, EditLookupTableModal } from './components/lookup';

type Page =
  | 'decisions'
  | 'rule-detail'
  | 'rule-create'
  | 'rule-new-version'
  | 'table-detail'
  | 'table-create'
  | 'table-new-version'
  | 'flow-detail'
  | 'spaces'
  | 'fields'
  | 'sandbox'
  | 'lookup'
  | 'lookup-detail'
  | 'lookup-create'
  | 'lookup-new-version';

/* ── HELP MODAL ──────────────────────────────────── */
type ApiEntry   = { method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; path: string; desc: string };
type PathFilter = { normalized: string; methods?: string[] };
type PageHelpExtra = { pageTitle: string; extraData: { label: string; detail: string }[] };

const OPENAPI_URL = 'https://rule-engine-dev.anairacloud.com/openapi';
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
function normPath(p: string) { return p.replace(/\{[^}]+\}/g, '{?}'); }

const METHOD_PILL: Record<string, string> = {
  GET:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  POST:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  PUT:    'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  PATCH:  'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  DELETE: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};

// Path filters: normalized paths (with {?} placeholders) to include per page
const PAGE_PATH_FILTERS: Partial<Record<Page, PathFilter[]>> = {
  decisions: [
    { normalized: '/api/v1/spaces/{?}/rules',         methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/tables',        methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/flows',         methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/lookup-tables', methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/documents' },
    { normalized: '/api/v1/spaces/{?}/rules/{?}',     methods: ['delete'] },
  ],
  'rule-detail': [
    { normalized: '/api/v1/spaces/{?}/rules/{?}',                         methods: ['get', 'put'] },
    { normalized: '/api/v1/spaces/{?}/rules/{?}/versions',                methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/rules/{?}/versions/{?}',            methods: ['get', 'patch', 'delete'] },
    { normalized: '/api/v1/spaces/{?}/rules/{?}/versions/{?}/activate' },
    { normalized: '/api/v1/spaces/{?}/rules/{?}/versions/{?}/deactivate' },
    { normalized: '/api/v1/spaces/{?}/rules/{?}/versions/{?}/restore' },
  ],
  'rule-create': [
    { normalized: '/api/v1/spaces/{?}/rules',              methods: ['post'] },
    { normalized: '/api/v1/spaces/{?}/rules/{?}/versions', methods: ['post'] },
    { normalized: '/api/v1/fact-types',                    methods: ['get'] },
    { normalized: '/api/v1/fact-types/{?}/fields',         methods: ['get'] },
    { normalized: '/api/v1/metadata/operators',            methods: ['get'] },
    { normalized: '/api/v1/metadata/actions',              methods: ['get'] },
  ],
  'rule-new-version': [
    { normalized: '/api/v1/spaces/{?}/rules/{?}',          methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/rules/{?}/versions', methods: ['post'] },
    { normalized: '/api/v1/fact-types',                    methods: ['get'] },
    { normalized: '/api/v1/fact-types/{?}/fields',         methods: ['get'] },
    { normalized: '/api/v1/metadata/operators',            methods: ['get'] },
    { normalized: '/api/v1/metadata/actions',              methods: ['get'] },
  ],
  'table-detail': [
    { normalized: '/api/v1/spaces/{?}/tables/{?}',                         methods: ['get', 'put'] },
    { normalized: '/api/v1/spaces/{?}/tables/{?}/versions',                methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/tables/{?}/versions/{?}',            methods: ['get', 'patch', 'delete'] },
    { normalized: '/api/v1/spaces/{?}/tables/{?}/versions/{?}/activate' },
    { normalized: '/api/v1/spaces/{?}/tables/{?}/versions/{?}/deactivate' },
    { normalized: '/api/v1/spaces/{?}/tables/{?}/versions/{?}/restore' },
    { normalized: '/api/v1/spaces/{?}/tables/{?}/rows/{?}/enable' },
    { normalized: '/api/v1/spaces/{?}/tables/{?}/rows/{?}/disable' },
  ],
  'table-create': [
    { normalized: '/api/v1/spaces/{?}/tables',              methods: ['post'] },
    { normalized: '/api/v1/spaces/{?}/tables/{?}/versions', methods: ['post'] },
    { normalized: '/api/v1/spaces/{?}/tables/import/preview' },
    { normalized: '/api/v1/spaces/{?}/tables/import/upload' },
    { normalized: '/api/v1/fact-types',                     methods: ['get'] },
    { normalized: '/api/v1/fact-types/{?}/fields',          methods: ['get'] },
    { normalized: '/api/v1/metadata/operators',             methods: ['get'] },
    { normalized: '/api/v1/metadata/data-types',            methods: ['get'] },
  ],
  'table-new-version': [
    { normalized: '/api/v1/spaces/{?}/tables/{?}',          methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/tables/{?}/versions', methods: ['post'] },
    { normalized: '/api/v1/fact-types',                     methods: ['get'] },
    { normalized: '/api/v1/fact-types/{?}/fields',          methods: ['get'] },
    { normalized: '/api/v1/metadata/operators',             methods: ['get'] },
  ],
  'flow-detail': [
    { normalized: '/api/v1/spaces/{?}/flows/{?}',                         methods: ['get', 'put'] },
    { normalized: '/api/v1/spaces/{?}/flows/{?}/versions',                methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/flows/{?}/versions/{?}',            methods: ['get', 'patch', 'delete'] },
    { normalized: '/api/v1/spaces/{?}/flows/{?}/versions/{?}/activate' },
    { normalized: '/api/v1/spaces/{?}/flows/{?}/versions/{?}/deactivate' },
    { normalized: '/api/v1/spaces/{?}/flows/{?}/versions/{?}/restore' },
  ],
  spaces: [
    { normalized: '/api/v1/spaces' },
    { normalized: '/api/v1/spaces/{?}' },
    { normalized: '/api/v1/spaces/{?}/members' },
    { normalized: '/api/v1/spaces/{?}/members/{?}' },
    { normalized: '/api/v1/spaces/{?}/analytics' },
    { normalized: '/api/v1/spaces/{?}/audit-trail' },
  ],
  fields: [
    { normalized: '/api/v1/fact-types' },
    { normalized: '/api/v1/fact-types/{?}' },
    { normalized: '/api/v1/fact-types/{?}/fields' },
    { normalized: '/api/v1/fact-types/{?}/fields/{?}' },
    { normalized: '/api/v1/metadata/data-types', methods: ['get'] },
  ],
  sandbox: [
    { normalized: '/api/v1/spaces/{?}/rules/{?}/execute' },
    { normalized: '/api/v1/spaces/{?}/tables/{?}/execute' },
    { normalized: '/api/v1/spaces/{?}/execute/{?}' },
  ],
  lookup: [
    { normalized: '/api/v1/spaces/{?}/lookup-tables',      methods: ['get', 'post'] },
    { normalized: '/api/v1/spaces/{?}/lookup-tables/{?}',  methods: ['get', 'put', 'delete'] },
  ],
  'lookup-detail': [
    { normalized: '/api/v1/spaces/{?}/lookup-tables/{?}',                         methods: ['get', 'put'] },
    { normalized: '/api/v1/spaces/{?}/lookup-tables/{?}/versions',                methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/lookup-tables/{?}/versions/{?}',            methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/lookup-tables/{?}/versions/{?}/activate' },
    { normalized: '/api/v1/spaces/{?}/lookup-tables/{?}/versions/{?}/deactivate' },
    { normalized: '/api/v1/spaces/{?}/lookup-tables/{?}/versions/{?}/restore' },
  ],
  'lookup-create': [
    { normalized: '/api/v1/spaces/{?}/lookup-tables',              methods: ['post'] },
    { normalized: '/api/v1/spaces/{?}/lookup-tables/{?}/versions', methods: ['post'] },
    { normalized: '/api/v1/metadata/data-types',                   methods: ['get'] },
  ],
  'lookup-new-version': [
    { normalized: '/api/v1/spaces/{?}/lookup-tables/{?}',          methods: ['get'] },
    { normalized: '/api/v1/spaces/{?}/lookup-tables/{?}/versions', methods: ['post'] },
    { normalized: '/api/v1/metadata/data-types',                   methods: ['get'] },
  ],
};

// Static extra data (client-side context not covered by the API)
const PAGE_HELP_EXTRA: Partial<Record<Page, PageHelpExtra>> = {
  decisions: {
    pageTitle: 'Decisions List',
    extraData: [
      { label: 'Categories & Tags',   detail: 'Static list defined client-side; not a dedicated API resource' },
      { label: 'Status badge config', detail: 'Colour and label mapping for version lifecycle states is local config' },
      { label: 'Document counts',     detail: '"All" tab counts are computed by aggregating list responses client-side' },
    ],
  },
  'rule-detail': {
    pageTitle: 'Rule Detail',
    extraData: [
      { label: 'Fact type field labels',  detail: 'Field display names are resolved from GET /api/v1/fact-types/{factType}/fields and cached locally' },
      { label: 'Operator display labels', detail: 'Human-readable operator names (e.g. "equals") are a local mapping over the operator enum' },
      { label: 'Block type labels',       detail: 'Block type names (IF, ELSE IF, ELSE, OVERRIDE, DEFAULT) are local constants' },
    ],
  },
  'rule-create': {
    pageTitle: 'Rule Create',
    extraData: [
      { label: 'Categories',        detail: 'Static list of categories (Motor, Life, Health, etc.) defined client-side' },
      { label: 'Block type options', detail: 'Block types are local constants; not returned by any API' },
      { label: 'Tags',              detail: 'Free-form strings entered by the user; no tag registry API exists' },
    ],
  },
  'rule-new-version': {
    pageTitle: 'Rule — New Version',
    extraData: [
      { label: 'Prefilled logic',    detail: "The previous version's rule tree is copied client-side as a starting point" },
      { label: 'Block type options', detail: 'IF / ELSE IF / ELSE / OVERRIDE / DEFAULT are local constants' },
    ],
  },
  'table-detail': {
    pageTitle: 'Decision Table Detail',
    extraData: [
      { label: 'Hit policy labels',       detail: 'Hit policy options (First Match, Collect All, etc.) are a local enum; the API stores the raw value string' },
      { label: 'Operator display labels', detail: 'Operator names for input columns are mapped client-side from the operator enum' },
    ],
  },
  'table-create': {
    pageTitle: 'Decision Table Create',
    extraData: [
      { label: 'Hit policy options', detail: 'First Match / Collect All / Unique Match / Priority Order are local constants' },
      { label: 'Categories',        detail: 'Static list of categories defined client-side' },
    ],
  },
  'table-new-version': {
    pageTitle: 'Decision Table — New Version',
    extraData: [
      { label: 'Schema prefill', detail: "Previous version's column schema and rows are copied client-side as a starting point" },
    ],
  },
  'flow-detail': {
    pageTitle: 'Flow Detail',
    extraData: [
      { label: 'Flow node types', detail: 'Node type definitions and connection schema are defined locally; flow authoring is not yet backed by the API' },
      { label: 'Visual canvas',   detail: 'Flow graph layout and node positions are client-side state only' },
    ],
  },
  spaces: {
    pageTitle: 'Spaces',
    extraData: [
      { label: 'Member roles',         detail: 'Available roles (ADMIN, RULE_AUTHOR, RULE_APPROVER, RULE_EXECUTOR, VIEWER) are local constants' },
      { label: 'Space switcher state', detail: 'The currently active space is client-side state; no API call persists this selection' },
    ],
  },
  fields: {
    pageTitle: 'Fields & Fact Types',
    extraData: [
      { label: 'Data type display labels', detail: 'Human-readable labels for data types (e.g. "Text" for string) are a local mapping' },
    ],
  },
  sandbox: {
    pageTitle: 'Sandbox',
    extraData: [
      { label: 'Client-side evaluation', detail: 'In this prototype, rule/table/lookup evaluation runs in-browser using local data. The live API will replace this.' },
      { label: 'Input schema',           detail: 'Input field names and types are derived from fact type definitions stored locally' },
      { label: 'Lookup execution',       detail: 'No dedicated lookup table execute endpoint exists; lookup key resolution is computed client-side' },
    ],
  },
  lookup: {
    pageTitle: 'Lookup Tables',
    extraData: [
      { label: 'Categories', detail: 'Static category list defined client-side' },
      { label: 'Data types', detail: 'Key and value column data types use GET /api/v1/metadata/data-types; display labels are mapped client-side' },
    ],
  },
  'lookup-detail': {
    pageTitle: 'Lookup Table Detail',
    extraData: [
      { label: 'Data type labels', detail: 'Display names for column data types are mapped client-side from the API enum values' },
    ],
  },
  'lookup-create': {
    pageTitle: 'Lookup Table Create',
    extraData: [
      { label: 'Categories', detail: 'Static category list defined client-side' },
    ],
  },
  'lookup-new-version': {
    pageTitle: 'Lookup Table — New Version',
    extraData: [
      { label: 'Schema prefill', detail: "Previous version's key/value column schema is copied client-side as a starting point" },
    ],
  },
};

const HelpModal: React.FC<{ open: boolean; onClose: () => void; page: Page }> = ({ open, onClose, page }) => {
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<ApiEntry[] | null>(null);

  useEffect(() => {
    if (!open) return;
    const filters = PAGE_PATH_FILTERS[page];
    if (!filters) { setEndpoints([]); return; }
    setLoading(true); setFetchError(null); setEndpoints(null);
    fetch(OPENAPI_URL, { headers: { Accept: 'application/json' } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((spec: any) => {
        const paths: Record<string, any> = spec.paths || {};
        const found: ApiEntry[] = [];
        for (const filter of filters) {
          for (const [specPath, pathItem] of Object.entries(paths)) {
            if (normPath(specPath) === filter.normalized) {
              for (const method of HTTP_METHODS) {
                if (method in pathItem) {
                  if (!filter.methods || filter.methods.includes(method)) {
                    found.push({ method: method.toUpperCase() as ApiEntry['method'], path: specPath, desc: (pathItem as any)[method].summary || '' });
                  }
                }
              }
            }
          }
        }
        setEndpoints(found);
      })
      .catch(e => setFetchError(e.message || 'Failed to load API specification'))
      .finally(() => setLoading(false));
  }, [open, page]);

  const extra = PAGE_HELP_EXTRA[page];
  const pageTitle = extra?.pageTitle ?? page;
  const specHost = OPENAPI_URL.replace('https://', '').replace('/openapi', '');

  return (
    <Modal open={open} onClose={onClose} title={`API Reference — ${pageTitle}`} subtitle="Endpoints consumed by this page · fetched live from the OpenAPI spec" width="max-w-2xl">
      <div className="p-5 flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">APIs Used</p>
            {!loading && !fetchError && endpoints != null && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live · {specHost}
              </span>
            )}
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              Fetching live API spec…
            </div>
          )}
          {fetchError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5 text-xs text-destructive">
              <IC.X size={12} className="shrink-0 mt-0.5" />
              <span>Could not reach the API spec: {fetchError}. Check network connectivity or CORS settings on the server.</span>
            </div>
          )}
          {!loading && !fetchError && endpoints != null && (
            endpoints.length === 0
              ? <p className="text-xs text-muted-foreground py-2">No matching endpoints found for this page.</p>
              : <div className="flex flex-col gap-1.5">
                  {endpoints.map((api, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                      <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${METHOD_PILL[api.method]}`}>{api.method}</span>
                      <div className="min-w-0">
                        <code className="text-xs font-mono text-foreground break-all">{api.path}</code>
                        {api.desc && <p className="text-xs text-muted-foreground mt-0.5">{api.desc}</p>}
                      </div>
                    </div>
                  ))}
                </div>
          )}
        </div>
        {extra && extra.extraData.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Additional Data (Not in API Contract)</p>
            <div className="flex flex-col gap-2">
              {extra.extraData.map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg bg-amber-50/60 border border-amber-100 px-3 py-2.5">
                  <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default function App() {
  /* ── STATE ─────────────────────────────────────── */
  const [primaryNav, setPrimaryNav] = useState('rules');
  const [secondaryNav, setSecondaryNav] = useState('decisions');
  const [spaces, setSpaces] = useState<Space[]>(SEED_SPACES);
  const [currentSpaceId, setCurrentSpaceId] = useState(SEED_SPACES[0].id);
  const [rules, setRules] = useState<Rule[]>([
    ...SEED_RULES.map(r => ({ ...r, spaceId: 'motor-uw' })),
    ...SEED_GTL_RULES.map(r => ({ ...r, spaceId: 'default-space' })),
    ...SEED_A2_RULES.map(r => ({ ...r, spaceId: 'default-space' })),
    ...SEED_A3_RULES.map(r => ({ ...r, spaceId: 'default-space' })),
    ...SEED_A4_RULES.map(r => ({ ...r, spaceId: 'default-space' })),
    ...SEED_A5_RULES.map(r => ({ ...r, spaceId: 'default-space' })),
  ]);
  const [tables, setTables] = useState<Table[]>(SEED_TABLES.map(t => ({ ...t, spaceId: 'motor-uw' })));
  const [lookupTables, setLookupTables] = useState<LookupTable[]>(SEED_LOOKUP_TABLES.map(l => ({ ...l, spaceId: 'motor-uw' })));
  const [selectedLookupTable, setSelectedLookupTable] = useState<LookupTable | null>(null);
  const [flows] = useState<Flow[]>(SEED_FLOWS.map(f => ({ ...f, spaceId: 'motor-uw' })));
  const [facts, setFacts] = useState<Fact[]>(SEED_FACTS);
  const [factFields, setFactFields] = useState<FactField[]>(SEED_FACT_FIELDS);
  const [page, setPage] = useState<Page>('decisions');
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [editMetaOpen, setEditMetaOpen] = useState(false);
  const [editTableOpen, setEditTableOpen] = useState(false);
  const [editLookupOpen, setEditLookupOpen] = useState(false);
  const [deleteRule, setDeleteRule] = useState<Rule | null>(null);
  const [spacePickerOpen, setSpacePickerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const currentSpace = spaces.find(s => s.id === currentSpaceId) || spaces[0];

  const showToast = useCallback((msg: string) => setToast(msg), []);

  /* ── NAVIGATION ────────────────────────────────── */
  const handleSecNav = (key: string) => {
    setSecondaryNav(key);
    if (key === 'dashboard') handleGoToDashboard();
    else if (key === 'decisions') { setPage('decisions'); setSelectedRule(null); }
    else if (key === 'spaces') setPage('spaces');
    else if (key === 'fields' || key === 'facts') setPage('fields');
    else if (key === 'sandbox') setPage('sandbox');
    else if (key === 'lookup') { setPage('lookup'); setSelectedLookupTable(null); }
  };

  const handleBack = () => {
    setPage('decisions');
    setSelectedRule(null);
    setSelectedTable(null);
    setSelectedFlow(null);
  };

  const handleGoToDashboard = () => {
    setPage('decisions');
    setSecondaryNav('decisions');
    setSelectedRule(null);
    setSelectedTable(null);
    setSelectedFlow(null);
    setSelectedLookupTable(null);
  };

  /* ── LOOKUP HANDLERS ───────────────────────────── */
  const handleViewLookup = (tbl: LookupTable) => { setSelectedLookupTable(tbl); setPage('lookup-detail'); };
  const handleSaveLookupTable = (tbl: LookupTable) => {
    const isNew = !lookupTables.find(t => t.id === tbl.id);
    const tableToSave = isNew ? { ...tbl, spaceId: currentSpaceId } : tbl;
    setLookupTables(ts => isNew ? [...ts, tableToSave] : ts.map(t => t.id === tableToSave.id ? tableToSave : t));
    setSelectedLookupTable(tableToSave);
    setPage('lookup-detail');
    showToast(isNew ? `"${tbl.name}" created` : `New version added to "${tbl.name}"`);
  };

  const handleEditLookupMeta = (data: { name: string; category: string; tags: string[] }) => {
    if (!selectedLookupTable) return;
    const updated = { ...selectedLookupTable, ...data };
    setLookupTables(ts => ts.map(t => t.id === selectedLookupTable.id ? updated : t));
    setSelectedLookupTable(updated);
    setEditLookupOpen(false);
    showToast('Table updated');
  };

  /* ── RULE HANDLERS ─────────────────────────────── */
  const handleViewRule = (rule: Rule, version?: number) => { setSelectedRule(rule); setSelectedVersion(version); setPage('rule-detail'); };
  const handleCreateRule = () => setPage('rule-create');
  const handleEditRule = (rule: Rule) => { setSelectedRule(rule); setSelectedVersion(undefined); setPage('rule-detail'); };
  const handleDeleteRuleRequest = (rule: Rule) => setDeleteRule(rule);
  const handleViewTable = (tbl: Table) => { setSelectedTable(tbl); setPage('table-detail'); };
  const handleCreateTable = () => setPage('table-create');
  const handleEditTableMeta = (data: { name: string; category: string; tags: string[] }) => {
    if (!selectedTable) return;
    const updated = { ...selectedTable, ...data };
    setTables(ts => ts.map(t => t.id === selectedTable.id ? updated : t));
    setSelectedTable(updated);
    setEditTableOpen(false);
    showToast('Table updated');
  };
  const handleSaveTable = (tbl: Table) => {
    const isNew = !tables.find(t => t.id === tbl.id);
    const tableToSave = isNew ? { ...tbl, spaceId: currentSpaceId } : tbl;
    setTables(ts => isNew ? [...ts, tableToSave] : ts.map(t => t.id === tableToSave.id ? tableToSave : t));
    setSelectedTable(tableToSave);
    setPage('table-detail');
    showToast(isNew ? `"${tbl.name}" created` : `New version added to "${tbl.name}"`);
  };
  const handleViewFlow = (flow: Flow) => { setSelectedFlow(flow); setPage('flow-detail'); };

  const handleSaveRule = (form: RuleForm) => {
    const newRule: Rule = {
      id: 'r' + uid(),
      spaceId: currentSpaceId,
      name: form.name,
      category: form.category,
      tags: form.tags,
      createdAt: new Date().toISOString(),
      createdBy: 'alice@insure.com',
      versions: [{
        id: uid(), version: 1, status: 'DRAFT',
        description: form.description,
        changeSummary: form.changeSummary,
        effectiveFrom: form.effectiveFrom,
        effectiveUntil: form.effectiveUntil || null,
        activatedAt: null, activatedBy: null,
        rule: form.rule,
      }],
    };
    setRules(rs => [...rs, newRule]);
    setPage('decisions');
    showToast(`Rule "${form.name}" created as Draft`);
  };

  const handleSaveNewVersion = (existingRule: Rule, form: RuleForm) => {
    const nextVer = Math.max(...existingRule.versions.map(v => v.version)) + 1;
    const newVer = {
      id: uid(), version: nextVer, status: 'DRAFT',
      description: form.description,
      changeSummary: form.changeSummary,
      effectiveFrom: form.effectiveFrom,
      effectiveUntil: form.effectiveUntil || null,
      activatedAt: null, activatedBy: null,
      rule: form.rule,
    };
    const updated = { ...existingRule, versions: [...existingRule.versions, newVer] };
    setRules(rs => rs.map(r => r.id === existingRule.id ? updated : r));
    setSelectedRule(updated);
    setPage('rule-detail');
    showToast(`Version ${nextVer} created as Draft`);
  };

  const handleUpdateRule = (updatedRule: Rule) => {
    setRules(rs => rs.map(r => r.id === updatedRule.id ? updatedRule : r));
    setSelectedRule(updatedRule);
  };

  const handleEditMeta = ({ tags, category }: { tags: string[]; category: string }) => {
    if (!selectedRule) return;
    const updated = { ...selectedRule, tags, category };
    setRules(rs => rs.map(r => r.id === selectedRule.id ? updated : r));
    setSelectedRule(updated);
    setEditMetaOpen(false);
    showToast('Metadata updated');
  };

  const handleConfirmDelete = () => {
    if (!deleteRule) return;
    setRules(rs => rs.filter(r => r.id !== deleteRule.id));
    if (selectedRule?.id === deleteRule.id) { setPage('decisions'); setSelectedRule(null); }
    showToast(`Rule "${deleteRule.name}" deleted`);
    setDeleteRule(null);
  };

  /* ── FACT / FIELD HANDLERS ──────────────────────── */
  const handleCreateFact = (data: { name: string; displayName: string; description: string }) => {
    const newFact: Fact = { id: 'f-' + uid(), ...data, createdAt: new Date().toISOString(), createdBy: 'alice@insure.com' };
    setFacts(fs => [...fs, newFact]);
    showToast(`Fact "${newFact.displayName}" created`);
  };
  const handleUpdateFact = (fact: Fact) => { setFacts(fs => fs.map(f => f.id === fact.id ? fact : f)); showToast('Fact updated'); };
  const handleDeleteFact = (factId: string) => {
    setFacts(fs => fs.filter(f => f.id !== factId));
    setFactFields(ffs => ffs.filter(f => f.factId !== factId));
    showToast('Fact deleted');
  };
  const handleCreateField = (data: Omit<FactField, 'id' | 'createdAt' | 'createdBy' | 'path'>) => {
    const fact = facts.find(f => f.id === data.factId)!;
    const newField: FactField = { id: 'ff-' + uid(), ...data, path: `${fact.name}.${data.name}`, createdAt: new Date().toISOString(), createdBy: 'alice@insure.com' };
    setFactFields(ffs => [...ffs, newField]);
    showToast(`Field "${newField.path}" created`);
  };
  const handleUpdateField = (field: FactField) => { setFactFields(ffs => ffs.map(f => f.id === field.id ? field : f)); showToast('Field updated'); };
  const handleDeleteField = (fieldId: string) => { setFactFields(ffs => ffs.filter(f => f.id !== fieldId)); showToast('Field deleted'); };

  /* space-scoped fact fields for the current space */
  const spaceFactFields = factFields.filter(f => currentSpace.enabledFactIds.includes(f.factId));
  const spaceFacts = facts.filter(f => spaceFactFields.some(ff => ff.factId === f.id));

  /* space-scoped decisions & lookups */
  const spaceRules = rules.filter(r => r.spaceId === currentSpaceId);
  const spaceTables = tables.filter(t => t.spaceId === currentSpaceId);
  const spaceFlows = flows.filter(f => f.spaceId === currentSpaceId);
  const spaceLookupTables = lookupTables.filter(l => l.spaceId === currentSpaceId);

  /* ── SPACE HANDLERS ────────────────────────────── */
  const handleSelectSpace = (space: Space) => {
    setCurrentSpaceId(space.id);
    setSpacePickerOpen(false);
    setPage('decisions');
    setSecondaryNav('decisions');
    showToast(`Switched to ${space.name}`);
  };

  const handleCreateSpace = (space: Space) => {
    setSpaces(ss => [...ss, space]);
    showToast(`Space "${space.name}" created`);
  };

  const handleUpdateSpace = (space: Space) => {
    setSpaces(ss => ss.map(s => s.id === space.id ? space : s));
  };

  const handleDeleteSpace = (space: Space) => {
    setSpaces(ss => ss.filter(s => s.id !== space.id));
    if (currentSpaceId === space.id && spaces.length > 1) {
      const remaining = spaces.filter(s => s.id !== space.id);
      setCurrentSpaceId(remaining[0].id);
    }
    showToast(`Space "${space.name}" deleted`);
  };

  /* ── RENDER ────────────────────────────────────── */
  return (
      <div className="h-screen flex overflow-hidden bg-background" style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        input[type=checkbox] { accent-color: #2563EB; }
        input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
      `}</style>

      <PrimarySidebar active={primaryNav} onSelect={setPrimaryNav} />

      <SecondarySidebar
        active={secondaryNav}
        onSelect={handleSecNav}
      />

      <main className="flex-1 overflow-hidden flex flex-col relative">
        {/* Top-right controls */}
        <div className="absolute top-3 right-4 z-10 flex items-center gap-1">
          <button
            onClick={() => setHelpOpen(true)}
            title="API Reference"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <IC.HelpCircle size={16} />
          </button>
          <button
            onClick={() => setSpacePickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-accent transition-colors"
          >
            <span className="text-muted-foreground font-normal">Space</span>
            <span className="truncate max-w-[160px] text-foreground font-semibold">{currentSpace.name}</span>
            <IC.ChevD size={12} className="text-muted-foreground shrink-0" />
          </button>
        </div>
        {/* Spaces Page */}
        {page === 'spaces' && (
          <SpacesPage
            spaces={spaces}
            currentSpaceId={currentSpaceId}
            onSelectSpace={s => { setCurrentSpaceId(s.id); showToast(`Switched to ${s.name}`); }}
            onOpenSpace={s => { handleSelectSpace(s); setSecondaryNav('decisions'); }}
            onCreate={handleCreateSpace}
            onUpdate={handleUpdateSpace}
            onDelete={handleDeleteSpace}
            facts={facts}
            factFields={factFields}
            onHome={handleGoToDashboard}
          />
        )}

        {/* Fields & Facts Page */}
        {page === 'fields' && (
          <FieldsPage
            facts={facts}
            factFields={factFields}
            spaces={spaces}
            onCreateFact={handleCreateFact}
            onUpdateFact={handleUpdateFact}
            onDeleteFact={handleDeleteFact}
            onCreateField={handleCreateField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            initialTab={secondaryNav === 'facts' ? 'facts' : 'facts'}
            onHome={handleGoToDashboard}
          />
        )}

        {/* Decisions List */}
        {page === 'decisions' && (
          <DecisionsPage
            rules={spaceRules} tables={spaceTables} flows={spaceFlows}
            onViewRule={handleViewRule}
            onCreateRule={handleCreateRule}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRuleRequest}
            onViewTable={handleViewTable}
            onCreateTable={handleCreateTable}
            onViewFlow={handleViewFlow}
            onHome={handleGoToDashboard}
            onTestRule={rule => { setSelectedRule(rule); setSecondaryNav('sandbox'); setPage('sandbox'); }}
          />
        )}

        {/* Rule Detail */}
        {page === 'rule-detail' && selectedRule && (
          <RuleDetailPage
            rule={selectedRule}
            onBack={handleBack}
            onUpdate={handleUpdateRule}
            onNewVersion={r => { setSelectedRule(r); setPage('rule-new-version'); }}
            onEditMeta={() => setEditMetaOpen(true)}
            initialVersion={selectedVersion}
            onTestRule={(rule, version) => { setSelectedRule(rule); setSelectedVersion(version); setSecondaryNav('sandbox'); setPage('sandbox'); }}
          />
        )}

        {/* Rule Create */}
        {page === 'rule-create' && (
          <RuleCreatePage onSave={handleSaveRule} onCancel={handleBack} factFields={spaceFactFields} />
        )}

        {/* Rule New Version */}
        {page === 'rule-new-version' && selectedRule && (
          <RuleCreatePage
            initialRule={selectedRule}
            onSave={form => handleSaveNewVersion(selectedRule, form)}
            onCancel={() => setPage('rule-detail')}
            factFields={spaceFactFields}
          />
        )}

        {/* Table Detail */}
        {page === 'table-detail' && selectedTable && (
          <TableDetailPage
            tbl={selectedTable}
            onBack={handleBack}
            onHome={handleGoToDashboard}
            onNewVersion={tbl => { setSelectedTable(tbl); setPage('table-new-version'); }}
            onUpdate={tbl => { setTables(ts => ts.map(t => t.id === tbl.id ? tbl : t)); setSelectedTable(tbl); }}
            onEditMeta={() => setEditTableOpen(true)}
          />
        )}

        {/* Table Create */}
        {page === 'table-create' && (
          <TableCreatePage
            onSave={handleSaveTable}
            onCancel={handleBack}
            onHome={handleGoToDashboard}
            facts={spaceFacts}
            factFields={spaceFactFields}
            lookupTables={spaceLookupTables}
          />
        )}

        {/* Table New Version */}
        {page === 'table-new-version' && selectedTable && (
          <TableCreatePage
            existingTable={selectedTable}
            onSave={handleSaveTable}
            onCancel={() => setPage('table-detail')}
            onHome={handleGoToDashboard}
            facts={spaceFacts}
            factFields={spaceFactFields}
            lookupTables={spaceLookupTables}
          />
        )}

        {/* Flow Detail */}
        {page === 'flow-detail' && selectedFlow && (
          <FlowDetailPage flow={selectedFlow} onBack={handleBack} />
        )}

        {/* Sandbox */}
        {page === 'sandbox' && (
          <SandboxPage rules={spaceRules} tables={spaceTables} lookupTables={spaceLookupTables} onHome={handleGoToDashboard} initialRuleId={selectedRule?.id} initialVersion={selectedVersion} />
        )}

        {/* Lookup List */}
        {page === 'lookup' && (
          <LookupListPage
            tables={spaceLookupTables}
            onView={handleViewLookup}
            onCreateNew={() => setPage('lookup-create')}
            onHome={handleGoToDashboard}
          />
        )}

        {/* Lookup Detail */}
        {page === 'lookup-detail' && selectedLookupTable && (
          <LookupTableDetail
            tbl={selectedLookupTable}
            onBack={() => { setPage('lookup'); setSecondaryNav('lookup'); }}
            onHome={handleGoToDashboard}
            onNewVersion={tbl => { setSelectedLookupTable(tbl); setPage('lookup-new-version'); }}
            onUpdate={tbl => { setLookupTables(ts => ts.map(t => t.id === tbl.id ? tbl : t)); setSelectedLookupTable(tbl); }}
            onEditMeta={() => setEditLookupOpen(true)}
          />
        )}

        {/* Lookup Create */}
        {page === 'lookup-create' && (
          <LookupTableCreate
            onSave={handleSaveLookupTable}
            onCancel={() => setPage('lookup')}
            onHome={handleGoToDashboard}
            factFields={spaceFactFields}
          />
        )}

        {/* Lookup New Version */}
        {page === 'lookup-new-version' && selectedLookupTable && (
          <LookupTableCreate
            existingTable={selectedLookupTable}
            onSave={handleSaveLookupTable}
            onCancel={() => setPage('lookup-detail')}
            onHome={handleGoToDashboard}
            factFields={spaceFactFields}
          />
        )}
      </main>

      {/* Modals */}
      <SpacePickerModal
        open={spacePickerOpen}
        spaces={spaces}
        currentSpaceId={currentSpaceId}
        onSelect={s => { setCurrentSpaceId(s.id); showToast(`Switched to ${s.name}`); }}
        onManage={() => { setSpacePickerOpen(false); setPage('spaces'); setSecondaryNav('spaces'); }}
        onClose={() => setSpacePickerOpen(false)}
        factFields={factFields}
      />

      {selectedRule && (
        <EditMetaModal
          rule={selectedRule}
          open={editMetaOpen}
          onClose={() => setEditMetaOpen(false)}
          onSave={handleEditMeta}
        />
      )}

      {selectedTable && (
        <EditTableModal
          tbl={selectedTable}
          open={editTableOpen}
          onClose={() => setEditTableOpen(false)}
          onSave={handleEditTableMeta}
        />
      )}

      {selectedLookupTable && (
        <EditLookupTableModal
          tbl={selectedLookupTable}
          open={editLookupOpen}
          onClose={() => setEditLookupOpen(false)}
          onSave={handleEditLookupMeta}
        />
      )}

      <DeleteRuleModal
        rule={deleteRule}
        open={!!deleteRule}
        onClose={() => setDeleteRule(null)}
        onConfirm={handleConfirmDelete}
      />

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} page={page} />

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
