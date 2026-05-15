import React, { useState, useMemo } from 'react';
import {
  cn, fmt, activeVer, Btn, Inp, Sel, StatusBadge, IC, Modal,
  Rule, Table, Flow, STATUS_META,
} from './shared';

/* ── NEW DECISION MODAL ──────────────────────────── */
type DecisionType = 'rule' | 'table' | 'flow';

const DECISION_OPTIONS: { type: DecisionType; label: string; desc: string; available: boolean; icon: React.ReactNode }[] = [
  {
    type: 'rule',
    label: 'Rule',
    desc: 'Define conditional logic with if/then blocks to drive automated decisions.',
    available: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    type: 'table',
    label: 'Decision Table',
    desc: 'Map input combinations to outputs using a structured lookup table.',
    available: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" />
      </svg>
    ),
  },
  {
    type: 'flow',
    label: 'Decision Flow',
    desc: 'Orchestrate multiple rules and tables in a sequential decision pipeline.',
    available: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
        <path d="M12 7v4M10 13l-3 4M14 13l3 4" />
      </svg>
    ),
  },
];

const NewDecisionModal: React.FC<{ open: boolean; onClose: () => void; onCreateRule: () => void }> = ({ open, onClose, onCreateRule }) => {
  const [selected, setSelected] = useState<DecisionType>('rule');

  const handleCreate = () => {
    if (selected === 'rule') { onClose(); onCreateRule(); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Decision" subtitle="Choose the type of decision to create." width="max-w-md">
      <div className="p-5 flex flex-col gap-3">
        {DECISION_OPTIONS.map(opt => (
          <label
            key={opt.type}
            className={cn(
              'flex items-start gap-4 p-4 rounded-xl border-2 transition-all',
              !opt.available && 'opacity-40 cursor-not-allowed',
              opt.available && 'cursor-pointer',
              selected === opt.type && opt.available
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white',
            )}
          >
            <input
              type="radio"
              name="decision-type"
              value={opt.type}
              checked={selected === opt.type}
              disabled={!opt.available}
              onChange={() => opt.available && setSelected(opt.type)}
              className="mt-0.5 accent-blue-600"
            />
            <div className={cn('shrink-0 mt-0.5', selected === opt.type && opt.available ? 'text-blue-600' : 'text-gray-400')}>
              {opt.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800">{opt.label}</span>
                {!opt.available && (
                  <span className="text-[10px] font-medium bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Coming soon</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>
      <div className="px-5 pb-5 flex justify-end gap-2">
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={handleCreate} disabled={!DECISION_OPTIONS.find(o => o.type === selected)?.available}>
          Create {DECISION_OPTIONS.find(o => o.type === selected)?.label}
        </Btn>
      </div>
    </Modal>
  );
};

/* ── UNIFIED ITEM ────────────────────────────────── */
type Kind = 'rule' | 'table' | 'flow';

interface UnifiedItem {
  id: string;
  kind: Kind;
  name: string;
  category: string;
  description: string;
  tags: string[];
  updatedAt: string;
  latestVer: { version: number; status: string } | null;
  versionsCount: number;
  statusCounts: Record<string, number>;
  raw: Rule | Table | Flow;
}

function computeUpdatedAt(raw: Rule | Table | Flow): string {
  const dates: string[] = [raw.createdAt];
  for (const v of raw.versions) {
    if (v.effectiveFrom) dates.push(v.effectiveFrom);
    const av = (v as { activatedAt?: string | null }).activatedAt;
    if (av) dates.push(av);
  }
  return [...dates].sort().reverse()[0];
}

function computeStatusCounts(raw: Rule | Table | Flow): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of raw.versions) counts[v.status] = (counts[v.status] || 0) + 1;
  return counts;
}

function toUnified(rules: Rule[], tables: Table[], flows: Flow[]): UnifiedItem[] {
  const r: UnifiedItem[] = rules.map(rule => {
    const ver = activeVer(rule);
    return {
      id: rule.id, kind: 'rule', name: rule.name, category: rule.category,
      description: ver?.description || '', tags: rule.tags,
      updatedAt: computeUpdatedAt(rule),
      latestVer: ver ? { version: ver.version, status: ver.status } : null,
      versionsCount: rule.versions.length, statusCounts: computeStatusCounts(rule), raw: rule,
    };
  });
  const t: UnifiedItem[] = tables.map(tbl => {
    const ver = activeVer(tbl);
    return {
      id: tbl.id, kind: 'table', name: tbl.name, category: tbl.category,
      description: ver?.description || '', tags: tbl.tags,
      updatedAt: computeUpdatedAt(tbl),
      latestVer: ver ? { version: ver.version, status: ver.status } : null,
      versionsCount: tbl.versions.length, statusCounts: computeStatusCounts(tbl), raw: tbl,
    };
  });
  const f: UnifiedItem[] = flows.map(flow => {
    const ver = activeVer(flow);
    return {
      id: flow.id, kind: 'flow', name: flow.name, category: flow.category,
      description: ver?.description || '', tags: flow.tags,
      updatedAt: computeUpdatedAt(flow),
      latestVer: ver ? { version: ver.version, status: ver.status } : null,
      versionsCount: flow.versions.length, statusCounts: computeStatusCounts(flow), raw: flow,
    };
  });
  return [...r, ...t, ...f];
}

/* ── KIND BADGE ──────────────────────────────────── */
const KIND_STYLE: Record<Kind, string> = {
  rule:  'bg-violet-50 text-violet-700 border-violet-200',
  table: 'bg-teal-50 text-teal-700 border-teal-200',
  flow:  'bg-orange-50 text-orange-700 border-orange-200',
};

const KindBadge: React.FC<{ kind: Kind }> = ({ kind }) => (
  <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border', KIND_STYLE[kind])}>
    {kind.toUpperCase()}
  </span>
);

/* ── VERSION BADGE ───────────────────────────────── */
const VerBadge: React.FC<{ version: number; mono?: boolean }> = ({ version, mono }) => (
  <span className={cn(
    'inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200',
    mono ? 'text-[10px] font-semibold tracking-wide' : 'text-[10px] font-semibold',
  )}>
    V{version}
  </span>
);

/* ── STATUS CHIPS ────────────────────────────────── */
const STATUS_ORDER = ['ACTIVE', 'APPROVED', 'COMPLIANCE_REVIEW', 'BUSINESS_REVIEW', 'PEER_REVIEW', 'DRAFT', 'INACTIVE', 'DEPRECATED', 'ARCHIVE'];

const STATUS_SHORT: Record<string, string> = {
  ACTIVE: 'active', DRAFT: 'draft', INACTIVE: 'inactive', DEPRECATED: 'depr.',
  ARCHIVE: 'archive', PEER_REVIEW: 'peer rev.', BUSINESS_REVIEW: 'biz rev.',
  COMPLIANCE_REVIEW: 'compliance', APPROVED: 'approved',
};

/* Uses the same STATUS_META tokens as StatusBadge for full consistency */
const StatusChips: React.FC<{ counts: Record<string, number> }> = ({ counts }) => {
  const entries = Object.entries(counts).sort(([a], [b]) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b));
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([status, count]) => {
        const m = STATUS_META[status] || STATUS_META.DRAFT;
        return (
          <span key={status} className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium', m.bg, m.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', m.dot)} />
            <span className="font-bold">{count}</span>
            <span>{STATUS_SHORT[status] || status.toLowerCase()}</span>
          </span>
        );
      })}
    </div>
  );
};

/* ── SORT ────────────────────────────────────────── */
type SortCol = 'name' | 'kind' | 'category' | 'latestVer' | 'updatedAt';
interface SortState { col: SortCol; dir: 'asc' | 'desc' }

function sortItems(items: UnifiedItem[], sort: SortState): UnifiedItem[] {
  return [...items].sort((a, b) => {
    let cmp = 0;
    if (sort.col === 'name') cmp = a.name.localeCompare(b.name);
    else if (sort.col === 'kind') cmp = a.kind.localeCompare(b.kind);
    else if (sort.col === 'category') cmp = a.category.localeCompare(b.category);
    else if (sort.col === 'latestVer') cmp = (a.latestVer?.version || 0) - (b.latestVer?.version || 0);
    else if (sort.col === 'updatedAt') cmp = a.updatedAt.localeCompare(b.updatedAt);
    return sort.dir === 'asc' ? cmp : -cmp;
  });
}

/* ── SORT HEADER ─────────────────────────────────── */
const SortTh: React.FC<{ col: SortCol; label: string; sort: SortState; onSort: (c: SortCol) => void; className?: string }> = ({ col, label, sort, onSort, className }) => {
  const active = sort.col === col;
  return (
    <th className={cn('text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none group', active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700', className)}
      onClick={() => onSort(col)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={cn('text-[10px]', active ? 'text-blue-500' : 'text-gray-300 group-hover:text-gray-400')}>
          {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
};

/* ── VERSION SUB-ROWS ────────────────────────────── */
const VersionSubRows: React.FC<{ item: UnifiedItem; onViewRule: (rule: Rule, version: number) => void }> = ({ item, onViewRule }) => {
  const versions = (item.raw as Rule | Table | Flow).versions;
  const sorted = [...versions].sort((a, b) => b.version - a.version);
  return (
    <>
      {sorted.map(v => (
        <tr key={v.version}
          className="bg-blue-50/30 border-l-2 border-l-blue-300 hover:bg-blue-100/40 cursor-pointer transition-colors"
          onClick={() => item.kind === 'rule' && onViewRule(item.raw as Rule, v.version)}>
          <td className="px-4 py-2 pl-10" colSpan={4}>
            <div className="flex items-center gap-2 min-w-0">
              <VerBadge version={v.version} />
              {v.changeSummary && <span className="text-xs text-gray-700 font-medium truncate">{v.changeSummary}</span>}
            </div>
          </td>
          <td className="px-4 py-2"><StatusBadge status={v.status} /></td>
          <td className="px-4 py-2 text-xs text-gray-400">
            {fmt((v as { effectiveFrom?: string }).effectiveFrom)}
          </td>
          <td className="px-4 py-2" />
        </tr>
      ))}
    </>
  );
};

/* ── PAGINATOR ───────────────────────────────────── */
const Paginator: React.FC<{ page: number; total: number; pageSize: number; onChange: (p: number) => void }> = ({ page, total, pageSize, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const pages: (number | '…')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-white rounded-b-xl">
      <span className="text-xs text-gray-400">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button disabled={page === 1} onClick={() => onChange(page - 1)}
          className="h-7 w-7 flex items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none">
          ‹
        </button>
        {pages.map((p, i) => p === '…'
          ? <span key={`e${i}`} className="h-7 w-5 flex items-center justify-center text-xs text-gray-300">…</span>
          : <button key={p} onClick={() => onChange(p as number)}
              className={cn('h-7 w-7 flex items-center justify-center rounded text-xs font-medium transition-colors',
                p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100')}>
              {p}
            </button>
        )}
        <button disabled={page === totalPages} onClick={() => onChange(page + 1)}
          className="h-7 w-7 flex items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none">
          ›
        </button>
      </div>
    </div>
  );
};

/* ── UNIFIED TABLE ───────────────────────────────── */
const PAGE_SIZE = 10;

interface UnifiedTableProps {
  items: UnifiedItem[];
  page: number;
  onPageChange: (p: number) => void;
  sort: SortState;
  onSort: (col: SortCol) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onViewRule: (rule: Rule, version?: number) => void;
  onEditRule: (rule: Rule) => void;
  onDeleteRule: (rule: Rule) => void;
  onViewTable: (tbl: Table) => void;
  onViewFlow: (flow: Flow) => void;
}

const UnifiedTable: React.FC<UnifiedTableProps> = ({
  items, page, onPageChange, sort, onSort, expanded, onToggle,
  onViewRule, onEditRule, onDeleteRule, onViewTable, onViewFlow,
}) => {
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleView = (item: UnifiedItem) => {
    if (item.kind === 'rule') onViewRule(item.raw as Rule);
    else if (item.kind === 'table') onViewTable(item.raw as Table);
    else onViewFlow(item.raw as Flow);
  };

  const handleViewRuleVersion = (rule: Rule, version: number) => onViewRule(rule, version);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <SortTh col="name" label="Name" sort={sort} onSort={onSort} />
            <SortTh col="kind" label="Kind" sort={sort} onSort={onSort} />
            <SortTh col="category" label="Category" sort={sort} onSort={onSort} />
            <SortTh col="latestVer" label="Versions" sort={sort} onSort={onSort} />
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
            <SortTh col="updatedAt" label="Last Updated" sort={sort} onSort={onSort} />
            <th className="px-4 py-2.5 w-[110px]" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {pageItems.map(item => {
            const isExpanded = expanded.has(item.id);
            const isRule = item.kind === 'rule';
            return (
              <React.Fragment key={item.id}>
                <tr className="hover:bg-gray-50/70 transition-colors cursor-pointer" onClick={() => onToggle(item.id)}>
                  {/* Name */}
                  <td className="px-4 py-3">
                    {isRule ? (
                      <button onClick={e => { e.stopPropagation(); onViewRule(item.raw as Rule); }}
                        className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline text-left leading-snug">
                        {item.name}
                      </button>
                    ) : (
                      <span className="text-sm font-medium text-gray-900 leading-snug">{item.name}</span>
                    )}
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[240px]">{item.description}</p>
                    )}
                  </td>
                  {/* Kind */}
                  <td className="px-4 py-3"><KindBadge kind={item.kind} /></td>
                  {/* Category */}
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {item.category || <span className="text-gray-300">—</span>}
                  </td>
                  {/* Versions count */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700 font-medium">{item.versionsCount}</span>
                  </td>
                  {/* Status chips */}
                  <td className="px-4 py-3"><StatusChips counts={item.statusCounts} /></td>
                  {/* Last Updated */}
                  <td className="px-4 py-3 text-xs text-gray-400">{fmt(item.updatedAt)}</td>
                  {/* Actions */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-0.5">
                      <Btn size="icon" variant="ghost" onClick={() => handleView(item)} title="View">
                        <IC.Eye size={13} className="text-gray-500" />
                      </Btn>
                      {isRule && (
                        <>
                          <Btn size="icon" variant="ghost" onClick={() => onEditRule(item.raw as Rule)} title="Edit">
                            <IC.Edit size={13} className="text-gray-500" />
                          </Btn>
                          <Btn size="icon" variant="ghost" onClick={() => onDeleteRule(item.raw as Rule)} className="hover:bg-red-50" title="Delete">
                            <IC.Trash size={13} className="text-red-400" />
                          </Btn>
                        </>
                      )}
                      <span className={cn('ml-0.5 text-gray-400 transition-transform duration-150', isExpanded && 'rotate-180')}>
                        <IC.ChevD size={12} />
                      </span>
                    </div>
                  </td>
                </tr>
                {isExpanded && <VersionSubRows item={item} onViewRule={handleViewRuleVersion} />}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {items.length === 0 ? (
        <div className="py-16 text-center">
          <IC.Rules size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No items found</p>
        </div>
      ) : (
        <Paginator page={page} total={items.length} pageSize={PAGE_SIZE} onChange={onPageChange} />
      )}
    </div>
  );
};

/* ── DECISIONS PAGE ──────────────────────────────── */
type Tab = 'all' | 'rules' | 'tables' | 'flows';

interface DecisionsPageProps {
  rules: Rule[];
  tables: Table[];
  flows: Flow[];
  onViewRule: (rule: Rule, version?: number) => void;
  onCreateRule: () => void;
  onEditRule: (rule: Rule) => void;
  onDeleteRule: (rule: Rule) => void;
  onViewTable: (tbl: Table) => void;
  onViewFlow: (flow: Flow) => void;
}

export const DecisionsPage: React.FC<DecisionsPageProps> = ({
  rules, tables, flows, onViewRule, onCreateRule, onEditRule, onDeleteRule, onViewTable, onViewFlow,
}) => {
  const [newDecisionOpen, setNewDecisionOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [categoryF, setCategoryF] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortState>({ col: 'updatedAt', dir: 'desc' });
  const [page, setPage] = useState(1);

  const allItems = useMemo(() => toUnified(rules, tables, flows), [rules, tables, flows]);

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleSort = (col: SortCol) => {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
    setPage(1);
  };

  const handleSearch = (value: string) => { setSearch(value); setPage(1); };
  const handleStatusF = (value: string) => { setStatusF(value); setPage(1); };
  const handleCategoryF = (value: string) => { setCategoryF(value); setPage(1); };

  const visibleItems = useMemo(() => sortItems(
    allItems.filter(item => {
      const kindOk = tab === 'all' || item.kind === (tab === 'tables' ? 'table' : tab === 'flows' ? 'flow' : 'rule');
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusF || item.statusCounts[statusF] > 0;
      const matchCategory = !categoryF || item.category === categoryF;
      return kindOk && matchSearch && matchStatus && matchCategory;
    }),
    sort,
  ), [allItems, tab, search, statusF, categoryF, sort]);

  const resetTab = (key: Tab) => { setTab(key); setSearch(''); setStatusF(''); setCategoryF(''); setExpanded(new Set()); setPage(1); };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all',   label: `All (${allItems.length})` },
    { key: 'rules', label: `Rules (${rules.length})` },
    { key: 'tables',label: `Decision Tables (${tables.length})` },
    { key: 'flows', label: `Flows (${flows.length})` },
  ];

  const categories = useMemo(() => {
    const s = new Set<string>();
    allItems.forEach(i => { if (i.category) s.add(i.category); });
    return Array.from(s).sort();
  }, [allItems]);

  return (
    <div className="flex flex-col h-full">
      <NewDecisionModal open={newDecisionOpen} onClose={() => setNewDecisionOpen(false)} onCreateRule={onCreateRule} />
      {/* header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Decisions</h1>
            <p className="text-sm text-gray-500">Rules, decision tables, and flows in this space</p>
          </div>
          <Btn onClick={() => setNewDecisionOpen(true)}><IC.Plus size={14} />New Decision</Btn>
        </div>
        <div className="flex gap-0 -mb-4">
          {TABS.map(t => (
            <button key={t.key} onClick={() => resetTab(t.key)}
              className={cn('px-4 py-2 text-sm transition-colors border-b-2',
                tab === t.key ? 'border-blue-500 text-blue-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* filters */}
      <div className="bg-white border-b border-gray-100 px-6 py-2.5 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <IC.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Inp value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search by name…" className="pl-8 w-full" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Sel value={categoryF} onChange={e => handleCategoryF(e.target.value)}
            options={[{ value: '', label: 'All categories' }, ...categories.map(c => ({ value: c, label: c }))]} />
          <Sel value={statusF} onChange={e => handleStatusF(e.target.value)}
            options={[{ value: '', label: 'All statuses' }, ...Object.keys(STATUS_META).map(k => ({ value: k, label: STATUS_META[k].label }))]} />
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <UnifiedTable
          items={visibleItems}
          page={page}
          onPageChange={setPage}
          sort={sort}
          onSort={handleSort}
          expanded={expanded}
          onToggle={toggleExpand}
          onViewRule={onViewRule}
          onEditRule={onEditRule}
          onDeleteRule={onDeleteRule}
          onViewTable={onViewTable}
          onViewFlow={onViewFlow}
        />
      </div>
    </div>
  );
};
