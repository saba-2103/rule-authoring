import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  cn, uid, fmt, activeVer,
  Btn, Inp, Sel, DSel, IC, StatusBadge, Tag, Modal, SearchBanner, STATUS_META,
  LookupTable, LookupVersion, LookupValueColumn, FactField,
} from './shared';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from './ui/dropdown-menu';

const DATA_TYPES: ('string' | 'number' | 'boolean')[] = ['string', 'number', 'boolean'];
const CATEGORIES = ['Pricing', 'Claims', 'Underwriting', 'Compliance', 'Fraud', 'Operations', 'Other'];

const LOOKUP_CATEGORY_COLORS: Record<string, string> = {
  Underwriting: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Claims:       'bg-rose-50 text-rose-700 border-rose-200',
  Pricing:      'bg-primary/5 text-primary border-primary/20',
  Compliance:   'bg-violet-50 text-violet-700 border-violet-200',
  Operations:   'bg-teal-50 text-teal-700 border-teal-200',
};
const LookupCategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const cls = LOOKUP_CATEGORY_COLORS[category] || 'bg-muted text-muted-foreground border-border';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border', cls)}>
      {category}
    </span>
  );
};

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
          <div className="flex items-center gap-2">
            <Btn variant="secondary"><IC.Upload size={14} />Import</Btn>
            <Btn onClick={onCreateNew}><IC.Plus size={14} />New Lookup Table</Btn>
          </div>
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

/* ── LOOKUP VERSION BADGE ────────────────────────── */
const LKP_VERSION_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT:             { label: 'Draft',            cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  PEER_REVIEW:       { label: 'Pending Approval', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  BUSINESS_REVIEW:   { label: 'Pending Approval', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLIANCE_REVIEW: { label: 'Pending Approval', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  APPROVED:          { label: 'Approved',         cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  ACTIVE:            { label: 'Active',           cls: 'bg-green-50 text-green-700 border-green-200' },
  INACTIVE:          { label: 'Inactive',         cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  DEPRECATED:        { label: 'Deprecated',       cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  ARCHIVE:           { label: 'Archived',         cls: 'bg-red-50 text-red-400 border-red-200' },
};
const LookupVersionBadge: React.FC<{ status: string }> = ({ status }) => {
  const b = LKP_VERSION_BADGE[status] || LKP_VERSION_BADGE.DRAFT;
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border', b.cls)}>{b.label}</span>;
};
const IS_LKP_PENDING = (s: string) => ['PEER_REVIEW', 'BUSINESS_REVIEW', 'COMPLIANCE_REVIEW'].includes(s);
const LKP_VER_STATUSES = ['ACTIVE', 'INACTIVE', 'DEPRECATED'] as const;
type LkpVerStatus = typeof LKP_VER_STATUSES[number];

/* ── LOOKUP STATUS DROPDOWN ──────────────────────── */
const LookupStatusDropdown: React.FC<{ current: string; onChange: (s: LkpVerStatus) => void }> = ({ current, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const meta = STATUS_META[current] || STATUS_META.DRAFT;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors', meta.bg, meta.text, 'border-transparent hover:opacity-80')}>
        <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
        {meta.label}
        <IC.ChevD size={11} className="opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-30 min-w-[160px] py-1">
          {LKP_VER_STATUSES.map(s => {
            const m = STATUS_META[s];
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                className={cn('w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition-colors', current === s ? 'bg-accent font-semibold' : 'hover:bg-accent', m.text)}>
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', m.dot)} />
                {m.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── LOOKUP MORE MENU ────────────────────────────── */
const LookupMoreMenu: React.FC<{ onEdit: () => void; onDelete: () => void }> = ({ onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <Btn size="icon" variant="ghost" onClick={() => setOpen(o => !o)} title="More options">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" />
        </svg>
      </Btn>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-30 min-w-[150px] py-1">
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors">
            <IC.Edit size={13} />Edit version
          </button>
          <button onClick={() => { onDelete(); setOpen(false); }} className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors">
            <IC.Trash size={13} />Delete
          </button>
        </div>
      )}
    </div>
  );
};

/* ── EDIT LOOKUP TABLE MODAL ─────────────────────── */
export interface EditLookupTableModalProps {
  tbl: LookupTable;
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; category: string; tags: string[] }) => void;
}
export const EditLookupTableModal: React.FC<EditLookupTableModalProps> = ({ tbl, open, onClose, onSave }) => {
  const [name, setName]         = useState(tbl.name);
  const [category, setCategory] = useState(tbl.category);
  const [tags, setTags]         = useState<string[]>(tbl.tags);
  const [tagInput, setTagInput] = useState('');
  useEffect(() => {
    if (open) { setName(tbl.name); setCategory(tbl.category); setTags(tbl.tags); setTagInput(''); }
  }, [open, tbl]);
  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); setTags(t => [...t, tagInput.trim()]); setTagInput(''); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Edit Table" subtitle="Metadata only — to change schema or data, create a new version.">
      <div className="p-5 flex flex-col gap-4">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Table Name</label>
          <Inp value={name} onChange={e => setName(e.target.value)} placeholder="e.g. NCB Discount Rates" className="w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Category</label>
          <Sel value={category} onChange={e => setCategory(e.target.value)}
            options={[{ value: '', label: 'Select…' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} className="w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">
            Tags <span className="text-muted-foreground font-normal text-[10px]">Press Enter to add</span>
          </label>
          <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded-md bg-background min-h-[36px]">
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md font-medium">
                {t}<button type="button" onClick={() => setTags(ts => ts.filter(x => x !== t))} className="hover:text-foreground ml-0.5">×</button>
              </span>
            ))}
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
              placeholder="Add tag…" className="flex-1 text-sm outline-none min-w-[80px] placeholder:text-muted-foreground" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave({ name: name.trim(), category, tags })}>Save Changes</Btn>
        </div>
      </div>
    </Modal>
  );
};

/* ── LOOKUP TABLE DETAIL ─────────────────────────── */
interface LookupTableDetailProps {
  tbl: LookupTable;
  onBack: () => void;
  onHome: () => void;
  onNewVersion: (tbl: LookupTable) => void;
  onUpdate?: (tbl: LookupTable) => void;
  onEditMeta?: () => void;
}

export const LookupTableDetail: React.FC<LookupTableDetailProps> = ({ tbl, onBack, onHome, onNewVersion, onUpdate, onEditMeta }) => {
  const sortedVers = [...tbl.versions].sort((a, b) => b.version - a.version);
  const [selVer, setSelVer] = useState(sortedVers[0] ?? null);
  const ver = selVer;
  const [search, setSearch] = useState('');
  const [editVerOpen, setEditVerOpen]     = useState(false);
  const [confirmDelVer, setConfirmDelVer] = useState(false);
  const [editVerForm, setEditVerForm]     = useState({ description: '', changeSummary: '' });

  const handleStatusChange = (newStatus: LkpVerStatus) => {
    if (!ver || !onUpdate) return;
    const updatedVer = { ...ver, status: newStatus };
    const updatedTbl = { ...tbl, versions: tbl.versions.map(v => v.id === ver.id ? updatedVer : v) };
    onUpdate(updatedTbl);
    setSelVer(updatedVer);
  };

  const activity = useMemo(() => {
    const events: { label: string; sub: string; date: string; dot: string }[] = [];
    events.push({ label: 'Table created', sub: '', date: tbl.createdAt, dot: 'bg-blue-600' });
    const sorted = [...tbl.versions].sort((a, b) => a.version - b.version);
    for (const v of sorted) {
      events.push({ label: `Version ${v.version} created`, sub: v.changeSummary || 'No summary', date: v.effectiveFrom || tbl.createdAt, dot: 'bg-gray-400' });
      if (v.status !== 'DRAFT') {
        const statusLabels: Record<string, { label: string; dot: string }> = {
          ACTIVE:     { label: 'activated',   dot: 'bg-green-500' },
          INACTIVE:   { label: 'deactivated', dot: 'bg-yellow-400' },
          DEPRECATED: { label: 'deprecated',  dot: 'bg-orange-400' },
          APPROVED:   { label: 'approved',    dot: 'bg-teal-400' },
        };
        const m = statusLabels[v.status];
        if (m) events.push({ label: `Version ${v.version} ${m.label}`, sub: '', date: v.effectiveFrom || tbl.createdAt, dot: m.dot });
      }
    }
    return events.sort((a, b) => b.date.localeCompare(a.date));
  }, [tbl]);

  const visibleRows = useMemo(() => {
    if (!ver) return [];
    const q = search.toLowerCase();
    if (!q) return ver.rows;
    return ver.rows.filter(r => r.key.toLowerCase().includes(q) || r.values.some(v => v.toLowerCase().includes(q)));
  }, [ver, search]);

  return (
    <div className="flex flex-col h-full">
      {/* Edit version modal */}
      <Modal open={editVerOpen} onClose={() => setEditVerOpen(false)} title="Edit Version" subtitle="Update version metadata.">
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Change Summary</label>
            <Inp value={editVerForm.changeSummary} onChange={e => setEditVerForm(f => ({ ...f, changeSummary: e.target.value }))} placeholder="What changed?" className="w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Version Note</label>
            <textarea value={editVerForm.description} onChange={e => setEditVerForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Optional notes…"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none text-foreground placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-2 justify-end">
            <Btn variant="outline" onClick={() => setEditVerOpen(false)}>Cancel</Btn>
            <Btn onClick={() => {
              if (!ver || !onUpdate) return;
              const updatedVer = { ...ver, description: editVerForm.description, changeSummary: editVerForm.changeSummary };
              const updatedTbl = { ...tbl, versions: tbl.versions.map(v => v.id === ver.id ? updatedVer : v) };
              onUpdate(updatedTbl); setSelVer(updatedVer); setEditVerOpen(false);
            }}>Save</Btn>
          </div>
        </div>
      </Modal>

      {/* Delete version confirm */}
      <Modal open={confirmDelVer} onClose={() => setConfirmDelVer(false)} title="Delete version?" subtitle="This cannot be undone." width="max-w-sm">
        <div className="p-5 flex flex-col gap-3">
          <Btn variant="ghost-destructive" className="w-full justify-center" onClick={() => {
            if (!ver || !onUpdate) return;
            const remaining = tbl.versions.filter(v => v.id !== ver.id);
            const updatedTbl = { ...tbl, versions: remaining };
            onUpdate(updatedTbl);
            setSelVer(remaining.length > 0 ? [...remaining].sort((a, b) => b.version - a.version)[0] : null);
            setConfirmDelVer(false);
          }}>Delete Version {ver?.version}</Btn>
          <Btn variant="outline" className="w-full justify-center" onClick={() => setConfirmDelVer(false)}>Cancel</Btn>
        </div>
      </Modal>

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-foreground">{tbl.name}</h1>
              {tbl.category && <LookupCategoryBadge category={tbl.category} />}
            </div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {tbl.tags.map(t => (
                <span key={t} className="inline-flex items-center px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md font-medium">{t}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onEditMeta && <Btn size="sm" variant="secondary" onClick={onEditMeta}><IC.Edit size={14} />Edit Table</Btn>}
            <Btn size="sm" onClick={() => onNewVersion(tbl)}><IC.Plus size={14} />New Version</Btn>
          </div>
        </div>
      </div>

      {/* Body: versions sidebar + main + activity panel */}
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
                  <LookupVersionBadge status={v.status} />
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
        <div className="flex-1 overflow-hidden flex flex-col">
          {ver ? (
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex flex-col gap-5">

                {/* Meta card */}
                <div className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-base font-semibold text-foreground">Version {ver.version}</span>
                        {['ACTIVE', 'INACTIVE', 'DEPRECATED'].includes(ver.status)
                          ? <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Approved</span>
                          : <LookupVersionBadge status={ver.status} />}
                      </div>
                      <p className="text-sm font-medium text-foreground">{ver.changeSummary || `Version ${ver.version}`}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {ver.status === 'DRAFT' ? (
                        <Btn size="sm" variant="secondary" onClick={() => handleStatusChange('ACTIVE')}>Submit for Review</Btn>
                      ) : IS_LKP_PENDING(ver.status) ? (
                        (() => {
                          const m = STATUS_META[ver.status];
                          return (
                            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', m.bg, m.text)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', m.dot)} />{m.label}
                            </span>
                          );
                        })()
                      ) : (
                        <LookupStatusDropdown current={ver.status} onChange={handleStatusChange} />
                      )}
                      <LookupMoreMenu
                        onEdit={() => { setEditVerForm({ description: ver.description || '', changeSummary: ver.changeSummary || '' }); setEditVerOpen(true); }}
                        onDelete={() => setConfirmDelVer(true)}
                      />
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

        {/* Right activity panel */}
        <div className="w-64 border-l border-border bg-muted/30 shrink-0 flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-background shrink-0">
            <span className="text-xs font-semibold text-primary tracking-wide">Activity</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
            <div className="relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
              <div className="flex flex-col gap-0">
                {activity.map((ev, i) => (
                  <div key={i} className="flex gap-3 pb-5 relative">
                    <div className={cn('w-3.5 h-3.5 rounded-full border-2 border-white shrink-0 mt-0.5 z-10', ev.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 leading-snug">{ev.label}</p>
                      {ev.sub && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{ev.sub}</p>}
                      <p className="text-[10px] text-gray-300 mt-0.5">{fmt(ev.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

type ValueColDraft = { id: string; field: string; label: string; dataType: 'string' | 'number' | 'boolean' };
type RowDraft = { id: string; key: string; values: string[]; isEnabled: boolean };

interface CreateForm {
  name: string; category: string; tags: string; description: string; changeSummary: string;
  keyField: string; keyLabel: string; keyDataType: 'string' | 'number' | 'boolean';
  valueColumns: ValueColDraft[]; rows: RowDraft[]; effectiveFrom: string; effectiveUntil: string;
}

function emptyValueCol(): ValueColDraft { return { id: uid(), field: '', label: '', dataType: 'string' }; }
function emptyRow(n: number): RowDraft { return { id: uid(), key: '', values: Array(n).fill(''), isEnabled: true }; }

const STEPS = ['Table Info', 'Version Info', 'Schema', 'Data'];

/* ── FIELD PICKER ────────────────────────────────── */
type FieldSuggestion = { name: string; displayName: string; dataType: string; path: string };
const FieldPicker: React.FC<{
  fields: FieldSuggestion[];
  value: string;
  onSelect: (name: string, dataType?: string, displayName?: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ fields, value, onSelect, placeholder, className }) => {
  const [query, setQuery] = useState(value);
  const [open, setOpen]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = query
    ? fields.filter(f => f.name.toLowerCase().includes(query.toLowerCase()) || f.displayName.toLowerCase().includes(query.toLowerCase()))
    : fields;
  const showCustom = query.trim().length > 0 && !fields.find(f => f.name === query.trim());
  return (
    <div className={cn('relative', className)} ref={ref}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onSelect(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="h-8 w-full pl-3 pr-7 font-mono text-xs border border-border rounded-md bg-background placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-colors"
      />
      <button type="button" onClick={() => setOpen(o => !o)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        <IC.ChevD size={11} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-30 overflow-hidden min-w-[220px]">
          {filtered.length > 0 && (
            <div className="max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              <p className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 bg-muted/40">Existing fields</p>
              {filtered.map(f => (
                <button key={f.path} type="button"
                  onClick={() => { onSelect(f.name, f.dataType, f.displayName); setQuery(f.name); setOpen(false); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors">
                  <span className="font-mono text-foreground flex-1 truncate">{f.name}</span>
                  <span className="text-muted-foreground truncate max-w-[100px] text-[10px]">{f.displayName}</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">{f.dataType}</span>
                </button>
              ))}
            </div>
          )}
          {fields.length === 0 && !showCustom && (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">No fields available. Type a custom name.</p>
          )}
          {filtered.length === 0 && fields.length > 0 && !showCustom && (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">No matches — type to add custom.</p>
          )}
          {showCustom && (
            <button type="button" onClick={() => { onSelect(query.trim()); setQuery(query.trim()); setOpen(false); }}
              className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-accent border-t border-border/50 transition-colors">
              <IC.Plus size={12} className="text-primary shrink-0" />
              <span className="text-foreground">Custom: <span className="font-mono font-semibold">{query.trim()}</span></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface LookupTableCreateProps {
  onSave: (tbl: LookupTable) => void;
  onCancel: () => void;
  onHome: () => void;
  existingTable?: LookupTable;
  factFields?: FactField[];
}

export const LookupTableCreate: React.FC<LookupTableCreateProps> = ({ onSave, onCancel, onHome, existingTable, factFields = [] }) => {
  const isNewVersion = !!existingTable;
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState(0);
  const [exitOpen, setExitOpen] = useState(false);

  const [form, setForm] = useState<CreateForm>(() => ({
    name: existingTable?.name ?? '', category: existingTable?.category ?? '',
    tags: existingTable?.tags.join(', ') ?? '', description: '', changeSummary: '',
    keyField: '', keyLabel: '', keyDataType: 'string',
    valueColumns: [emptyValueCol()], rows: [emptyRow(1)], effectiveFrom: today, effectiveUntil: '',
  }));

  const set = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) => setForm(f => ({ ...f, [k]: v }));
  const fieldSuggestions: FieldSuggestion[] = [...factFields]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(f => ({ name: f.name, displayName: f.displayName, dataType: f.dataType, path: f.path }));

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

  const nextVerNum = isNewVersion ? Math.max(...existingTable!.versions.map(v => v.version)) + 1 : 1;

  const canProceed = [
    form.name.trim().length > 0 && form.category.trim().length > 0,
    form.effectiveFrom.length > 0,
    form.keyField.trim().length > 0 && form.valueColumns.every(vc => vc.field.trim().length > 0),
    true,
  ];

  const handleSubmit = () => {
    const nextVer = isNewVersion ? Math.max(...existingTable!.versions.map(v => v.version)) + 1 : 1;
    const newVersion: LookupVersion = {
      id: uid(), version: nextVer, status: 'DRAFT',
      description: form.description,
      changeSummary: form.changeSummary || (isNewVersion ? `Version ${nextVer}` : 'Initial version'),
      effectiveFrom: form.effectiveFrom + 'T00:00:00', effectiveUntil: form.effectiveUntil ? form.effectiveUntil + 'T00:00:00' : null,
      keyColumn: { field: form.keyField.trim(), label: form.keyLabel.trim() || form.keyField.trim(), dataType: form.keyDataType },
      valueColumns: form.valueColumns.map(vc => ({ id: vc.id, field: vc.field.trim(), label: vc.label.trim() || vc.field.trim(), dataType: vc.dataType })),
      rows: form.rows.map(r => ({ id: r.id, key: r.key, values: r.values, isEnabled: true })),
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
        <Inp value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. NCB Discount Rates" disabled={isNewVersion} className={cn('w-full', isNewVersion && 'opacity-60')} />
        {isNewVersion && <p className="text-[10px] text-muted-foreground mt-1">Name is locked when adding a new version.</p>}
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Category <span className="text-destructive">*</span></label>
        <DSel value={form.category} onChange={v => set('category', v)} disabled={isNewVersion}
          className="w-full"
          options={[{ value: '', label: 'Select a category…' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
      </div>
      {!isNewVersion && (
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Tags</label>
          <Inp value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="pricing, motor, reference  (comma-separated)" className="w-full" />
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
        <div className="rounded-xl border border-border">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wide rounded-t-xl">
            <span className="flex-[2]">Field name</span><span className="flex-1">Display label</span><span className="w-28">Data type</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-3">
            <FieldPicker
              fields={fieldSuggestions}
              value={form.keyField}
              onSelect={(name, dataType, displayName) => {
                set('keyField', name);
                if (dataType && (DATA_TYPES as string[]).includes(dataType)) set('keyDataType', dataType as CreateForm['keyDataType']);
                if (displayName) set('keyLabel', displayName);
                else if (!form.keyLabel) set('keyLabel', name);
              }}
              placeholder="e.g. state_code"
              className="flex-[2]"
            />
            <Inp value={form.keyLabel} onChange={e => set('keyLabel', e.target.value)} placeholder="e.g. State Code" className="text-xs flex-1" />
            <DSel value={form.keyDataType} onChange={v => set('keyDataType', v as CreateForm['keyDataType'])}
              options={DATA_TYPES.map(dt => ({ value: dt, label: dt }))}
              disabled
              className="w-28 opacity-60" />
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
        <div className="rounded-xl border border-border">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wide rounded-t-xl">
            <span className="w-5" /><span className="flex-[2]">Field name</span><span className="flex-1">Display label</span><span className="w-28">Data type</span><span className="w-4" />
          </div>
          <div className="flex flex-col divide-y divide-border/50">
            {form.valueColumns.map((vc, i) => (
              <div key={vc.id} className="flex items-center gap-2 px-3 py-2.5 group">
                <span className="w-5 text-[10px] text-muted-foreground/50 text-right shrink-0">{i + 1}</span>
                <FieldPicker
                  fields={fieldSuggestions}
                  value={vc.field}
                  onSelect={(name, dataType, displayName) => {
                    updateValueCol(i, 'field', name);
                    if (dataType && (DATA_TYPES as string[]).includes(dataType)) updateValueCol(i, 'dataType', dataType);
                    if (displayName) updateValueCol(i, 'label', displayName);
                    else if (!vc.label) updateValueCol(i, 'label', name);
                  }}
                  placeholder="e.g. state_name"
                  className="flex-[2]"
                />
                <Inp value={vc.label} onChange={e => updateValueCol(i, 'label', e.target.value)} placeholder="e.g. State Name" className="text-xs flex-1" />
                <DSel value={vc.dataType} onChange={v => updateValueCol(i, 'dataType', v)}
                  options={DATA_TYPES.map(dt => ({ value: dt, label: dt }))}
                  disabled
                  className="w-28 opacity-60" />
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

  /* ── Step 2 — Version Info ───────────────────────── */
  const StepVersionInfo = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Version Name</label>
          <Inp value={form.changeSummary} onChange={e => set('changeSummary', e.target.value)}
            placeholder={isNewVersion ? 'e.g. Added new state codes' : 'Initial version'} className="w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Version Number</label>
          <Inp value={`v${nextVerNum}`} disabled className="opacity-60 bg-muted w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Effective From <span className="text-destructive">*</span></label>
          <Inp type="date" value={form.effectiveFrom} onChange={e => set('effectiveFrom', e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Effective Until <span className="text-muted-foreground font-normal text-[10px]">(optional)</span></label>
          <Inp type="date" value={form.effectiveUntil} onChange={e => set('effectiveUntil', e.target.value)} className="w-full" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Version Note</label>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Describe what this version maps or what changed…" rows={3}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none text-foreground placeholder:text-muted-foreground" />
      </div>
    </div>
  );

  const StepData = (
    <div className="flex flex-col gap-4">
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
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {form.rows.map((row, ri) => (
                <tr key={row.id}>
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

  const stepContent = [StepInfo, StepVersionInfo, StepSchema, StepData];

  const stepTitles = isNewVersion
    ? ['Version Info', 'Define Schema', 'Add Entries']
    : ['Lookup Table Info', 'Version Info', 'Define Schema', 'Add Entries'];
  const stepSubtitles = isNewVersion
    ? ['Set the effective dates and version notes for this version.', 'Define the key column and the value columns returned on a match.', 'Add key–value entries for this version.']
    : ['Give your lookup table a name, category, and description.', 'Set the effective dates and version notes for this version.', 'Define the key column and the value columns returned on a match.', 'Add key–value entries for this version.'];

  const activeSteps      = isNewVersion ? STEPS.slice(1) : STEPS;
  const activeContent    = isNewVersion ? stepContent.slice(1) : stepContent;
  const activeCanProceed = isNewVersion ? canProceed.slice(1) : canProceed;

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
            {activeSteps.map((label, i) => (
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
                {i < activeSteps.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step > 0 && <Btn variant="secondary" onClick={() => setStep(s => s - 1)}>← Previous</Btn>}
          {step < activeSteps.length - 1
            ? <Btn variant="secondary" disabled={!activeCanProceed[step]} onClick={() => setStep(s => s + 1)}>Next →</Btn>
            : <Btn disabled={!activeCanProceed[step]} onClick={handleSubmit}>Submit for Review</Btn>}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className={step <= (isNewVersion ? 0 : 1) ? 'max-w-2xl mx-auto' : 'w-full'}>
          <div className="bg-card rounded-xl border border-border p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-0.5">
                {stepTitles[step]}
              </h2>
              <p className="text-sm text-muted-foreground">
                {stepSubtitles[step]}
              </p>
            </div>
            {activeContent[step]}
          </div>
        </div>
      </div>
    </div>
  );
};
