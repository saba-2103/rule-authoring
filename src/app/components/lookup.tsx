import React, { useState, useMemo } from 'react';
import {
  cn, uid, fmt, activeVer,
  Btn, Inp, IC, StatusBadge, Tag, Modal, SearchBanner, STATUS_META,
  LookupTable, LookupVersion, LookupValueColumn,
} from './shared';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from './ui/dropdown-menu';

const DATA_TYPES: ('string' | 'number' | 'boolean')[] = ['string', 'number', 'boolean'];
const CATEGORIES = ['Pricing', 'Claims', 'Underwriting', 'Compliance', 'Fraud', 'Operations', 'Other'];

function lookupActiveVer(tbl: LookupTable): LookupVersion | null {
  return activeVer(tbl);
}

/* ── PAGINATOR ───────────────────────────────────── */
const PAGE_SIZE = 10;

const Paginator: React.FC<{ page: number; total: number; onChange: (p: number) => void }> = ({ page, total, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (totalPages <= 1) return null;
  const pages: (number | '…')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <span className="text-xs text-muted-foreground">
        {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button disabled={page === 1} onClick={() => onChange(page - 1)}
          className="h-7 w-7 flex items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:pointer-events-none">‹</button>
        {pages.map((p, i) => p === '…'
          ? <span key={`e${i}`} className="h-7 w-5 flex items-center justify-center text-xs text-muted-foreground/40">…</span>
          : <button key={p} onClick={() => onChange(p as number)}
              className={cn('h-7 w-7 flex items-center justify-center rounded text-xs font-medium transition-colors',
                p === page ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent')}>{p}</button>
        )}
        <button disabled={page === totalPages} onClick={() => onChange(page + 1)}
          className="h-7 w-7 flex items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:pointer-events-none">›</button>
      </div>
    </div>
  );
};

interface LookupListPageProps {
  tables: LookupTable[];
  onView: (tbl: LookupTable) => void;
  onCreateNew: () => void;
  onHome?: () => void;
}

export const LookupListPage: React.FC<LookupListPageProps> = ({ tables, onView, onCreateNew, onHome }) => {
  const [search, setSearch]       = useState('');
  const [categoryF, setCategoryF] = useState('');
  const [statusF, setStatusF]     = useState('');
  const [sortCol, setSortCol]     = useState<'name' | 'category' | 'entries' | 'created'>('created');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');
  const [page, setPage]           = useState(1);
  const [expanded, setExpanded]   = useState(new Set<string>());

  const toggleExpand = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const categories = useMemo(() => {
    const s = new Set<string>();
    tables.forEach(t => { if (t.category) s.add(t.category); });
    return Array.from(s).sort();
  }, [tables]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tables.filter(t => {
      const matchSearch   = !q || t.name.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
      const matchCategory = !categoryF || t.category === categoryF;
      const matchStatus   = !statusF || t.versions.some(v => v.status === statusF);
      return matchSearch && matchCategory && matchStatus;
    });
  }, [tables, search, categoryF, statusF]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = lookupActiveVer(a);
      const bv = lookupActiveVer(b);
      let cmp = 0;
      if (sortCol === 'name')     cmp = a.name.localeCompare(b.name);
      if (sortCol === 'category') cmp = a.category.localeCompare(b.category);
      if (sortCol === 'entries')  cmp = (av?.rows.length ?? 0) - (bv?.rows.length ?? 0);
      if (sortCol === 'created')  cmp = a.createdAt.localeCompare(b.createdAt);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch   = (v: string) => { setSearch(v);    setPage(1); };
  const handleCategory = (v: string) => { setCategoryF(v); setPage(1); };
  const handleStatus   = (v: string) => { setStatusF(v);   setPage(1); };

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  const SortTh: React.FC<{ col: typeof sortCol; label: string; className?: string }> = ({ col, label, className }) => {
    const active = sortCol === col;
    return (
      <th onClick={() => toggleSort(col)}
        className={cn('text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none group',
          active ? 'text-primary' : 'text-muted-foreground hover:text-foreground', className)}>
        <span className="inline-flex items-center gap-1">
          {label}
          <span className="inline-flex flex-col items-center" style={{ lineHeight: 0 }}>
            <IC.ChevU size={9} className={active && sortDir === 'asc' ? 'text-primary' : 'text-muted-foreground/25 group-hover:text-muted-foreground/50'} />
            <IC.ChevD size={9} className={active && sortDir === 'desc' ? 'text-primary' : 'text-muted-foreground/25 group-hover:text-muted-foreground/50'} />
          </span>
        </span>
      </th>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-background border-b border-border px-6 py-4">
        <div className="flex items-center gap-1.5 text-sm font-medium mb-3">
          <button onClick={onHome} className="text-muted-foreground hover:text-foreground transition-colors">Rules</button>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <span className="text-foreground font-medium">Lookup</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Lookup Tables</h1>
            <p className="text-sm text-muted-foreground">Key–value reference tables used by rules at evaluation time</p>
          </div>
          <Btn onClick={onCreateNew}><IC.Plus size={14} />New Lookup Table</Btn>
        </div>
      </div>

      {/* Filters strip */}
      <div className="bg-background border-b border-border px-6 py-2.5 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <IC.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Inp value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search by name…" className="pl-8 w-full" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Select value={categoryF || '_all'} onValueChange={v => handleCategory(v === '_all' ? '' : v)}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusF || '_all'} onValueChange={v => handleStatus(v === '_all' ? '' : v)}>
            <SelectTrigger size="sm" className="w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All statuses</SelectItem>
              {Object.keys(STATUS_META).map(k => <SelectItem key={k} value={k}>{STATUS_META[k].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex flex-col" style={{ scrollbarWidth: 'thin' }}>
        <SearchBanner query={search} count={sorted.length} label="table" />
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <SortTh col="name" label="Name" />
                  <SortTh col="category" label="Category" />
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Value Columns</th>
                  <SortTh col="entries" label="Entries" className="w-20" />
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Versions</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                  <SortTh col="created" label="Created" />
                  <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pageItems.map(tbl => {
                  const ver = lookupActiveVer(tbl);
                  const isExpanded = expanded.has(tbl.id);
                  const sortedVersForRow = [...tbl.versions].sort((a, b) => b.version - a.version);
                  return (
                    <React.Fragment key={tbl.id}>
                      <tr onClick={() => toggleExpand(tbl.id)} className="hover:bg-accent/50 cursor-pointer transition-colors">
                        <td className="px-4 py-2">
                          <button onClick={e => { e.stopPropagation(); onView(tbl); }}
                            className="text-sm font-medium text-primary hover:text-primary/80 hover:underline text-left leading-snug">
                            {tbl.name}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{tbl.category}</td>
                        <td className="px-4 py-2">
                          {ver ? (
                            <div className="flex flex-col">
                              <span className="font-mono text-xs text-foreground">{ver.keyColumn.field}</span>
                              <span className="text-[10px] text-muted-foreground">{ver.keyColumn.dataType}</span>
                            </div>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-2">
                          {ver ? (
                            <div className="flex gap-1 flex-wrap">
                              {ver.valueColumns.map(vc => (
                                <span key={vc.id} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{vc.field}</span>
                              ))}
                            </div>
                          ) : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-2 text-sm text-muted-foreground text-center">
                          {ver ? ver.rows.filter(r => r.isEnabled).length : '—'}
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-sm text-foreground font-medium">{tbl.versions.length}</span>
                        </td>
                        <td className="px-4 py-2">{ver ? <StatusBadge status={ver.status} /> : '—'}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{fmt(tbl.createdAt)}</td>
                        <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onView(tbl)}
                              className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              title="View">
                              <IC.Eye size={14} />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                  title="More options">
                                  <IC.MoreVert size={14} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onView(tbl)}>
                                  <IC.Edit size={13} />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                  <IC.Trash size={13} />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && sortedVersForRow.map(v => (
                        <tr key={v.id}
                          className="bg-primary/5 border-l-2 border-l-primary/40 hover:bg-primary/10 cursor-pointer transition-colors"
                          onClick={e => { e.stopPropagation(); onView(tbl); }}>
                          <td className="px-4 py-2 pl-10" colSpan={5}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border font-semibold shrink-0">V{v.version}</span>
                              {v.changeSummary && (
                                <span className="text-xs text-foreground font-medium truncate">{v.changeSummary}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2"><StatusBadge status={v.status} /></td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{fmt(v.effectiveFrom)}</td>
                          <td className="px-4 py-2" colSpan={2} />

                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {sorted.length === 0 ? (
              <div className="py-16 text-center">
                <IC.Lookup size={32} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search || categoryF || statusF ? 'No tables match your filters' : 'No lookup tables yet'}
                </p>
                {!search && !categoryF && !statusF && (
                  <Btn className="mt-4" onClick={onCreateNew}><IC.Plus size={14} />New Lookup Table</Btn>
                )}
              </div>
            ) : (
              <Paginator page={page} total={sorted.length} onChange={setPage} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface LookupTableDetailProps {
  tbl: LookupTable;
  onBack: () => void;
  onHome: () => void;
  onNewVersion: (tbl: LookupTable) => void;
}

export const LookupTableDetail: React.FC<LookupTableDetailProps> = ({ tbl, onBack, onHome, onNewVersion }) => {
  const sortedVers = [...tbl.versions].sort((a, b) => b.version - a.version);
  const [selVer, setSelVer] = useState(sortedVers[0] ?? null);
  const ver = selVer;
  const [search, setSearch] = useState('');

  const visibleRows = useMemo(() => {
    if (!ver) return [];
    const q = search.toLowerCase();
    if (!q) return ver.rows;
    return ver.rows.filter(r => r.key.toLowerCase().includes(q) || r.values.some(v => v.toLowerCase().includes(q)));
  }, [ver, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-background border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-1.5 text-sm font-medium mb-3">
          <button onClick={onHome} className="text-muted-foreground hover:text-foreground transition-colors">Rules</button>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">Lookup</button>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <span className="text-foreground font-medium">{tbl.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{tbl.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">{tbl.category}</span>
              {tbl.tags.map(t => <Tag key={t} label={t} />)}
            </div>
          </div>
          <Btn size="sm" onClick={() => onNewVersion(tbl)}><IC.Plus size={14} />New Version</Btn>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Versions sidebar */}
        <div className="w-56 border-r border-border bg-background flex flex-col shrink-0">
          <div className="px-4 py-2.5 border-b border-border shrink-0">
            <span className="text-xs font-semibold tracking-wide text-primary">
              Versions ({tbl.versions.length})
            </span>
          </div>
          <div className="overflow-y-auto flex-1 py-2" style={{ scrollbarWidth: 'thin' }}>
            {sortedVers.map(v => (
              <button
                key={v.id}
                onClick={() => setSelVer(v)}
                className={cn(
                  'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-l-2',
                  selVer?.version === v.version
                    ? 'bg-primary/5 border-primary'
                    : 'border-transparent hover:bg-accent',
                )}
              >
                <div className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                  selVer?.version === v.version
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}>
                  V{v.version}
                </div>
                <div className="flex-1 min-w-0">
                  <StatusBadge status={v.status} />
                  <p className="text-xs font-medium text-foreground mt-1 truncate">
                    {v.changeSummary || `Version ${v.version}`}
                  </p>
                  {v.effectiveFrom && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      From {fmt(v.effectiveFrom)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Version detail */}
        {ver ? (
          <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex flex-col gap-5">

              {/* Meta card */}
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-base font-semibold text-foreground">Version {ver.version}</span>
                      <StatusBadge status={ver.status} />
                    </div>
                    <p className="text-sm font-medium text-foreground">{ver.changeSummary || `Version ${ver.version}`}</p>
                  </div>
                </div>
                {ver.description && (
                  <div className="mb-4">
                    <span className="text-xs text-muted-foreground">Version Note</span>
                    <p className="text-sm text-foreground mt-0.5">{ver.description}</p>
                  </div>
                )}
                <div className="flex flex-col gap-3 text-sm">
                  <div className="grid grid-cols-2 gap-x-6">
                    <div>
                      <span className="text-xs text-muted-foreground">Key Column</span>
                      <p className="text-foreground font-medium font-mono mt-0.5">
                        {ver.keyColumn.field}
                        <span className="text-muted-foreground font-sans font-normal text-xs ml-1.5">({ver.keyColumn.dataType})</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Active Entries</span>
                      <p className="text-foreground font-medium mt-0.5">
                        {ver.rows.filter(r => r.isEnabled).length}
                        <span className="text-muted-foreground font-normal">/{ver.rows.length}</span>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6">
                    <div>
                      <span className="text-xs text-muted-foreground">Effective From</span>
                      <p className="text-foreground font-medium mt-0.5">{fmt(ver.effectiveFrom)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Effective Until</span>
                      <p className="text-foreground font-medium mt-0.5">{ver.effectiveUntil ? fmt(ver.effectiveUntil) : 'Open-ended'}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Value columns:</span>
                  {ver.valueColumns.map(vc => (
                    <span key={vc.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      <span className="font-mono font-semibold">{vc.field}</span>
                      <span className="text-primary/50 text-[10px]">{vc.dataType}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Search bar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <IC.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Inp value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter entries…" className="pl-8 w-full" />
                </div>
                {search && (
                  <span className="text-xs text-muted-foreground shrink-0">{visibleRows.length}/{ver.rows.length} entries</span>
                )}
              </div>

              {/* Entries table */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border">
                        <th className="px-4 py-2.5 text-left">
                          <div className="text-xs font-semibold text-foreground">{ver.keyColumn.label}</div>
                          <div className="text-[10px] text-muted-foreground font-mono font-normal mt-0.5">
                            {ver.keyColumn.field} · {ver.keyColumn.dataType}
                          </div>
                        </th>
                        {ver.valueColumns.map(vc => (
                          <th key={vc.id} className="px-4 py-2.5 text-left">
                            <div className="text-xs font-semibold text-primary">{vc.label}</div>
                            <div className="text-[10px] text-muted-foreground font-mono font-normal mt-0.5">
                              {vc.field} · {vc.dataType}
                            </div>
                          </th>
                        ))}
                        <th className="px-4 py-2.5 w-12 text-xs font-semibold text-muted-foreground">On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {visibleRows.map(row => (
                        <tr key={row.id} className={cn('transition-colors hover:bg-accent/30', !row.isEnabled && 'opacity-40 bg-muted/20')}>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-sm font-semibold text-foreground bg-muted px-2 py-0.5 rounded">{row.key}</span>
                          </td>
                          {row.values.map((val, i) => (
                            <td key={i} className="px-4 py-2.5">
                              <span className="font-mono text-xs text-primary">
                                {val !== '' ? val : <span className="text-muted-foreground/40">—</span>}
                              </span>
                            </td>
                          ))}
                          <td className="px-4 py-2.5 text-center">
                            <span className={cn('inline-block w-2 h-2 rounded-full', row.isEnabled ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {visibleRows.length === 0 && (
                    <div className="text-center py-10 text-sm text-muted-foreground">
                      {search ? 'No entries match your filter' : 'No entries in this version'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a version
          </div>
        )}
      </div>
    </div>
  );
};

type ValueColDraft = { id: string; field: string; label: string; dataType: 'string' | 'number' | 'boolean' };
type RowDraft = { id: string; key: string; values: string[]; isEnabled: boolean };

interface CreateForm {
  name: string; category: string; tags: string; description: string; changeSummary: string;
  keyField: string; keyLabel: string; keyDataType: 'string' | 'number' | 'boolean';
  valueColumns: ValueColDraft[]; rows: RowDraft[]; effectiveFrom: string;
}

function emptyValueCol(): ValueColDraft { return { id: uid(), field: '', label: '', dataType: 'string' }; }
function emptyRow(n: number): RowDraft { return { id: uid(), key: '', values: Array(n).fill(''), isEnabled: true }; }

const STEPS = ['Info', 'Schema', 'Data'];

interface LookupTableCreateProps {
  onSave: (tbl: LookupTable) => void;
  onCancel: () => void;
  onHome: () => void;
  existingTable?: LookupTable;
}

export const LookupTableCreate: React.FC<LookupTableCreateProps> = ({ onSave, onCancel, onHome, existingTable }) => {
  const isNewVersion = !!existingTable;
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState(0);
  const [exitOpen, setExitOpen] = useState(false);

  const [form, setForm] = useState<CreateForm>(() => ({
    name: existingTable?.name ?? '', category: existingTable?.category ?? '',
    tags: existingTable?.tags.join(', ') ?? '', description: '', changeSummary: '',
    keyField: '', keyLabel: '', keyDataType: 'string',
    valueColumns: [emptyValueCol()], rows: [emptyRow(1)], effectiveFrom: today,
  }));

  const set = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) => setForm(f => ({ ...f, [k]: v }));

  const addValueCol = () => {
    const updated = [...form.valueColumns, emptyValueCol()];
    const rows = form.rows.map(r => ({ ...r, values: [...r.values, ''] }));
    setForm(f => ({ ...f, valueColumns: updated, rows }));
  };
  const removeValueCol = (idx: number) => {
    if (form.valueColumns.length <= 1) return;
    const updated = form.valueColumns.filter((_, i) => i !== idx);
    const rows = form.rows.map(r => ({ ...r, values: r.values.filter((_, i) => i !== idx) }));
    setForm(f => ({ ...f, valueColumns: updated, rows }));
  };
  const updateValueCol = (idx: number, k: keyof ValueColDraft, v: string) =>
    setForm(f => ({ ...f, valueColumns: f.valueColumns.map((vc, i) => i === idx ? { ...vc, [k]: v } : vc) }));

  const addRow = () => setForm(f => ({ ...f, rows: [...f.rows, emptyRow(f.valueColumns.length)] }));
  const removeRow = (idx: number) => setForm(f => ({ ...f, rows: f.rows.filter((_, i) => i !== idx) }));
  const updateRowKey = (idx: number, val: string) =>
    setForm(f => ({ ...f, rows: f.rows.map((r, i) => i === idx ? { ...r, key: val } : r) }));
  const updateRowValue = (rIdx: number, cIdx: number, val: string) =>
    setForm(f => ({ ...f, rows: f.rows.map((r, i) => i === rIdx ? { ...r, values: r.values.map((v, j) => j === cIdx ? val : v) } : r) }));
  const toggleRowEnabled = (idx: number) =>
    setForm(f => ({ ...f, rows: f.rows.map((r, i) => i === idx ? { ...r, isEnabled: !r.isEnabled } : r) }));

  const canProceed = [
    form.name.trim().length > 0 && form.category.trim().length > 0,
    form.keyField.trim().length > 0 && form.valueColumns.every(vc => vc.field.trim().length > 0),
    form.rows.length > 0 && form.effectiveFrom.length > 0,
  ];

  const handleSubmit = () => {
    const nextVer = isNewVersion ? Math.max(...existingTable!.versions.map(v => v.version)) + 1 : 1;
    const newVersion: LookupVersion = {
      id: uid(), version: nextVer, status: 'DRAFT',
      description: form.description,
      changeSummary: form.changeSummary || (isNewVersion ? `Version ${nextVer}` : 'Initial version'),
      effectiveFrom: form.effectiveFrom + 'T00:00:00', effectiveUntil: null,
      keyColumn: { field: form.keyField.trim(), label: form.keyLabel.trim() || form.keyField.trim(), dataType: form.keyDataType },
      valueColumns: form.valueColumns.map(vc => ({ id: vc.id, field: vc.field.trim(), label: vc.label.trim() || vc.field.trim(), dataType: vc.dataType })),
      rows: form.rows.map(r => ({ id: r.id, key: r.key, values: r.values, isEnabled: r.isEnabled })),
    };
    const tbl: LookupTable = isNewVersion
      ? { ...existingTable!, versions: [...existingTable!.versions, newVersion] }
      : { id: uid(), name: form.name.trim(), category: form.category.trim(), tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), createdAt: new Date().toISOString(), versions: [newVersion] };
    onSave(tbl);
  };

  const StepInfo = (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Table Name <span className="text-destructive">*</span></label>
        <Inp value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. NCB Discount Rates" disabled={isNewVersion} className={isNewVersion ? 'opacity-60' : ''} />
        {isNewVersion && <p className="text-[10px] text-muted-foreground mt-1">Name is locked when adding a new version.</p>}
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Category <span className="text-destructive">*</span></label>
        <select value={form.category} onChange={e => set('category', e.target.value)} disabled={isNewVersion}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground disabled:opacity-60">
          <option value="">Select a category…</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {!isNewVersion && (
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Tags</label>
          <Inp value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="pricing, motor, reference  (comma-separated)" />
        </div>
      )}
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="What does this lookup table map?" rows={3}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none text-foreground placeholder:text-muted-foreground" />
      </div>
      {isNewVersion && (
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Change Summary</label>
          <Inp value={form.changeSummary} onChange={e => set('changeSummary', e.target.value)} placeholder="What changed in this version?" />
        </div>
      )}
    </div>
  );

  const StepSchema = (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold text-foreground mb-1">Key Column <span className="text-destructive">*</span></p>
        <p className="text-[11px] text-muted-foreground mb-3">The unique key used to look up values.</p>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span className="flex-[2]">Field name</span><span className="flex-1">Display label</span><span className="w-28">Data type</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-3">
            <Inp value={form.keyField} onChange={e => set('keyField', e.target.value)} placeholder="e.g. state_code" className="font-mono text-xs flex-[2]" />
            <Inp value={form.keyLabel} onChange={e => set('keyLabel', e.target.value)} placeholder="e.g. State Code" className="text-xs flex-1" />
            <select value={form.keyDataType} onChange={e => set('keyDataType', e.target.value as CreateForm['keyDataType'])}
              className="w-28 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground">
              {DATA_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs font-semibold text-foreground">Value Columns <span className="text-destructive">*</span></p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Values returned when the key matches</p>
          </div>
          <Btn variant="outline" size="sm" onClick={addValueCol}><IC.Plus size={12} />Add column</Btn>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            <span className="w-5" /><span className="flex-[2]">Field name</span><span className="flex-1">Display label</span><span className="w-28">Data type</span><span className="w-4" />
          </div>
          <div className="flex flex-col divide-y divide-border/50">
            {form.valueColumns.map((vc, i) => (
              <div key={vc.id} className="flex items-center gap-2 px-3 py-2.5 group">
                <span className="w-5 text-[10px] text-muted-foreground/50 text-right shrink-0">{i + 1}</span>
                <Inp value={vc.field} onChange={e => updateValueCol(i, 'field', e.target.value)} placeholder="e.g. state_name" className="font-mono text-xs flex-[2]" />
                <Inp value={vc.label} onChange={e => updateValueCol(i, 'label', e.target.value)} placeholder="e.g. State Name" className="text-xs flex-1" />
                <select value={vc.dataType} onChange={e => updateValueCol(i, 'dataType', e.target.value)}
                  className="w-28 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground">
                  {DATA_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                </select>
                <button onClick={() => removeValueCol(i)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                  <IC.X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const StepData = (
    <div className="flex flex-col gap-4">
      <div className="max-w-xs">
        <label className="text-xs font-semibold text-foreground mb-1 block">Effective From <span className="text-destructive">*</span></label>
        <Inp type="date" value={form.effectiveFrom} onChange={e => set('effectiveFrom', e.target.value)} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-foreground">Entries</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Add key–value pairs. Each key should be unique.</p>
          </div>
          <Btn variant="outline" size="sm" onClick={addRow}><IC.Plus size={12} />Add entry</Btn>
        </div>
        <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-xs min-w-[400px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2 text-left text-foreground font-semibold min-w-[120px]">
                  {form.keyLabel || form.keyField || 'Key'}<span className="ml-1 text-muted-foreground font-normal text-[10px]">(key)</span>
                </th>
                {form.valueColumns.map((vc, i) => (
                  <th key={i} className="px-3 py-2 text-left text-primary font-semibold min-w-[120px]">{vc.label || vc.field || `Value ${i + 1}`}</th>
                ))}
                <th className="px-2 py-2 text-muted-foreground font-semibold w-10 text-center">On</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {form.rows.map((row, ri) => (
                <tr key={row.id} className={cn(!row.isEnabled && 'opacity-50 bg-muted/20')}>
                  <td className="px-2 py-1.5">
                    <input value={row.key} onChange={e => updateRowKey(ri, e.target.value)} placeholder="key"
                      className="w-full px-2 py-1 font-mono font-semibold text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/40" />
                  </td>
                  {row.values.map((val, ci) => (
                    <td key={ci} className="px-2 py-1.5">
                      <input value={val} onChange={e => updateRowValue(ri, ci, e.target.value)} placeholder="value"
                        className="w-full px-2 py-1 font-mono text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground/40" />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={() => toggleRowEnabled(ri)}
                      className={cn('w-8 h-4 rounded-full transition-colors relative block mx-auto', row.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30')}>
                      <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all', row.isEnabled ? 'left-4' : 'left-0.5')} />
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeRow(ri)} className="text-muted-foreground hover:text-destructive transition-colors"><IC.Trash size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {form.rows.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">No entries yet — click <strong>Add entry</strong> to start</div>
          )}
        </div>
      </div>
    </div>
  );

  const stepContent = [StepInfo, StepSchema, StepData];

  return (
    <div className="flex flex-col h-full">
      {/* Exit confirmation modal */}
      <Modal open={exitOpen} onClose={() => setExitOpen(false)} title="Leave without saving?" subtitle="Your changes won't be saved until you finish." width="max-w-sm">
        <div className="p-5 flex flex-col gap-3">
          <Btn onClick={() => setExitOpen(false)} className="w-full justify-center">Continue Editing</Btn>
          <Btn variant="outline" onClick={() => { handleSubmit(); setExitOpen(false); }} className="w-full justify-center">Save as Draft &amp; Close</Btn>
          <Btn variant="ghost-destructive" onClick={() => { setExitOpen(false); onCancel(); }} className="w-full justify-center">Discard &amp; Close</Btn>
        </div>
      </Modal>

      {/* Breadcrumb */}
      <div className="bg-background border-b border-border px-6 py-3 flex items-center gap-1.5 font-medium shrink-0">
        <button onClick={onHome} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Rules</button>
        <IC.ChevR size={13} className="text-muted-foreground/40" />
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Lookup</button>
        <IC.ChevR size={13} className="text-muted-foreground/40" />
        {isNewVersion && (
          <>
            <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{existingTable!.name}</button>
            <IC.ChevR size={13} className="text-muted-foreground/40" />
          </>
        )}
        <span className="text-sm font-medium text-foreground">
          {isNewVersion ? 'New Version' : 'New Lookup Table'}
        </span>
      </div>

      {/* Stepper + nav */}
      <div className="bg-background border-b border-border px-6 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setExitOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0">
            <IC.Back size={16} />
          </button>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-0">
            {STEPS.map((label, i) => (
              <React.Fragment key={label}>
                <button type="button" onClick={() => i < step && setStep(i)}
                  className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                    step === i ? 'bg-primary/10 text-primary font-medium' : i < step ? 'text-foreground hover:bg-accent' : 'text-muted-foreground hover:bg-accent')}>
                  <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    step === i ? 'bg-primary text-primary-foreground' : i < step ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground')}>
                    {i < step ? <IC.Check size={10} /> : i + 1}
                  </span>
                  {label}
                </button>
                {i < STEPS.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step > 0 && <Btn variant="secondary" onClick={() => setStep(s => s - 1)}>← Previous</Btn>}
          {step < STEPS.length - 1
            ? <Btn variant="secondary" disabled={!canProceed[step]} onClick={() => setStep(s => s + 1)}>Next →</Btn>
            : <Btn disabled={!canProceed[step]} onClick={handleSubmit}>{isNewVersion ? 'Create Version' : 'Create Table'}</Btn>}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-xl border border-border p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-0.5">
                {step === 0 && (isNewVersion ? `New Version — ${existingTable!.name}` : 'Lookup Table Info')}
                {step === 1 && 'Define Schema'}
                {step === 2 && 'Add Entries'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {step === 0 && (isNewVersion ? 'Provide metadata for this new version.' : 'Give your lookup table a name, category, and description.')}
                {step === 1 && 'Define the key column and the value columns returned on a match.'}
                {step === 2 && 'Add key–value entries and set the effective date for this version.'}
              </p>
            </div>
            {stepContent[step]}
          </div>
        </div>
      </div>
    </div>
  );
};
