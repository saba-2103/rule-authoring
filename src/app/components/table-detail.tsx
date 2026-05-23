import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  cn, uid, fmt, Btn, Inp, Sel, DSel, Field, IC, StatusBadge, Tag, Modal,
  STATUS_META, CATEGORIES, Table, TableVersion, Fact, FactField, LookupTable,
} from './shared';

/* ── CATEGORY BADGE ─────────────────────────────── */
const CATEGORY_COLORS: Record<string, string> = {
  Underwriting: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Claims:       'bg-rose-50 text-rose-700 border-rose-200',
  Pricing:      'bg-primary/5 text-primary border-primary/20',
  Compliance:   'bg-violet-50 text-violet-700 border-violet-200',
  Operations:   'bg-teal-50 text-teal-700 border-teal-200',
};
const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const cls = CATEGORY_COLORS[category] || 'bg-muted text-muted-foreground border-border';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border', cls)}>
      {category}
    </span>
  );
};

/* ── CONSTANTS ───────────────────────────────────── */
const HIT_POLICIES: { value: string; label: string; desc: string }[] = [
  { value: 'first_match',    label: 'First Match',    desc: 'Return the first row whose conditions match.' },
  { value: 'priority_order', label: 'Priority Order', desc: 'Evaluate rows top-to-bottom; return the highest-priority match.' },
  { value: 'collect_all',    label: 'Collect All',    desc: 'Return every row whose conditions match.' },
  { value: 'unique',         label: 'Unique',         desc: 'Exactly one row must match; error otherwise.' },
];

const OPERATORS = [
  'EQUALS', 'NOT_EQUALS',
  'LESS_THAN', 'LESS_THAN_OR_EQUAL',
  'GREATER_THAN', 'GREATER_THAN_OR_EQUAL',
  'IN', 'NOT_IN', 'BETWEEN', 'CONTAINS',
  'IS_NULL', 'IS_NOT_NULL',
];

const DATA_TYPES: ('string' | 'number' | 'boolean')[] = ['string', 'number', 'boolean'];

/* ── VERSION BADGE ───────────────────────────────── */
const VERSION_BADGE: Record<string, { label: string; cls: string }> = {
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
const VersionBadge: React.FC<{ status: string }> = ({ status }) => {
  const b = VERSION_BADGE[status] || VERSION_BADGE.DRAFT;
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border', b.cls)}>{b.label}</span>;
};
const IS_PENDING = (s: string) => ['PEER_REVIEW', 'BUSINESS_REVIEW', 'COMPLIANCE_REVIEW'].includes(s);

/* ── STATUS DROPDOWN ─────────────────────────────── */
const VER_STATUSES = ['ACTIVE', 'INACTIVE', 'DEPRECATED'] as const;
type VerStatus = typeof VER_STATUSES[number];

const StatusDropdown: React.FC<{ current: string; onChange: (s: VerStatus) => void }> = ({ current, onChange }) => {
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
          {VER_STATUSES.map(s => {
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

/* ── MORE MENU ───────────────────────────────────── */
const MoreMenu: React.FC<{ onEdit: () => void; onDelete: () => void }> = ({ onEdit, onDelete }) => {
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

/* ── EDIT TABLE MODAL ────────────────────────────── */
interface EditTableModalProps {
  tbl: Table;
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; category: string; tags: string[] }) => void;
}
export const EditTableModal: React.FC<EditTableModalProps> = ({ tbl, open, onClose, onSave }) => {
  const [name, setName]         = useState(tbl.name);
  const [category, setCategory] = useState(tbl.category);
  const [tags, setTags]         = useState<string[]>(tbl.tags);
  const [tagInput, setTagInput] = useState('');
  useEffect(() => {
    if (open) { setName(tbl.name); setCategory(tbl.category); setTags(tbl.tags); }
  }, [open, tbl]);
  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) { e.preventDefault(); setTags(t => [...t, tagInput.trim()]); setTagInput(''); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Edit Table" subtitle="Note: To change table logic, create a new version.">
      <div className="p-5 flex flex-col gap-4">
        <Field label="Table Name">
          <Inp value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Risk Band Matrix" />
        </Field>
        <Field label="Category">
          <Sel value={category} onChange={e => setCategory(e.target.value)}
            options={[{ value: '', label: 'Select…' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
        </Field>
        <Field label="Tags" hint="Press Enter to add">
          <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded-md bg-background min-h-[36px]">
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md font-medium">
                {t}<button type="button" onClick={() => setTags(ts => ts.filter(x => x !== t))} className="hover:text-foreground ml-0.5">×</button>
              </span>
            ))}
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
              placeholder="Add tag…" className="flex-1 text-sm outline-none min-w-[80px] placeholder:text-muted-foreground" />
          </div>
        </Field>
        <div className="flex gap-2 justify-end">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave({ name: name.trim(), category, tags })}>Save Changes</Btn>
        </div>
      </div>
    </Modal>
  );
};

/* ── RIGHT PANEL (Schema + Activity) ─────────────── */
const TableRightPanel: React.FC<{ tbl: Table; ver: TableVersion | null }> = ({ tbl, ver }) => {
  const [tab, setTab] = useState<'schema' | 'activity'>('schema');

  // Build activity from table versions
  const activity = useMemo(() => {
    const events: { label: string; sub: string; date: string; dot: string }[] = [];
    events.push({ label: 'Table created', sub: '', date: tbl.createdAt, dot: 'bg-blue-600' });
    const sorted = [...tbl.versions].sort((a, b) => a.version - b.version);
    for (const v of sorted) {
      events.push({ label: `Version ${v.version} created`, sub: v.changeSummary || 'No summary', date: v.effectiveFrom || tbl.createdAt, dot: 'bg-gray-400' });
      if (v.status !== 'DRAFT') {
        const statusLabels: Record<string, { label: string; dot: string }> = {
          ACTIVE: { label: 'activated', dot: 'bg-green-500' }, INACTIVE: { label: 'deactivated', dot: 'bg-yellow-400' },
          DEPRECATED: { label: 'deprecated', dot: 'bg-orange-400' }, APPROVED: { label: 'approved', dot: 'bg-teal-400' },
        };
        const m = statusLabels[v.status];
        if (m) events.push({ label: `Version ${v.version} ${m.label}`, sub: '', date: v.effectiveFrom || tbl.createdAt, dot: m.dot });
      }
    }
    return events.sort((a, b) => b.date.localeCompare(a.date));
  }, [tbl]);

  return (
    <div className="w-64 border-l border-border bg-muted/30 shrink-0 flex flex-col overflow-hidden">
      <div className="flex border-b border-border bg-background shrink-0">
        {(['schema', 'activity'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('flex-1 py-2.5 text-xs font-semibold tracking-wide transition-colors capitalize',
              tab === t ? 'text-primary border-b-2 border-primary bg-background' : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent')}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'schema' && (
        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
          {!ver?.table ? (
            <p className="text-xs text-muted-foreground italic text-center mt-6">Select a version to view schema</p>
          ) : (
            <>
              {/* Input columns */}
              <div className="mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Input Schema</p>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">Conditions evaluated against incoming data</p>
                {ver.table.inputs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">No input columns defined</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {ver.table.inputs.map((inp, i) => (
                      <div key={i} className="bg-card rounded-lg border border-border p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded">{inp.field}</span>
                          <span className="text-[10px] text-muted-foreground">{inp.dataType}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70">{inp.operator}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-border mb-5" />
              {/* Output columns */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Output Schema</p>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">Values set when a row matches</p>
                {ver.table.outputs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">No output columns defined</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {ver.table.outputs.map((out, i) => (
                      <div key={i} className="bg-card rounded-lg border border-border p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-green-600 bg-green-50 px-1 py-0.5 rounded">{out.field}</span>
                          <span className="text-[10px] text-muted-foreground">{out.dataType}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Legend</p>
                <div className="space-y-1.5 text-[10px] text-muted-foreground">
                  <p><span className="text-amber-500 font-medium">Input</span> — fields read as conditions</p>
                  <p><span className="text-green-500 font-medium">Output</span> — fields written on match</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'activity' && (
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
      )}
    </div>
  );
};

/* ── DETAIL PAGE ─────────────────────────────────── */
export interface TableDetailPageProps {
  tbl: Table;
  onBack: () => void;
  onHome?: () => void;
  onNewVersion: (tbl: Table) => void;
  onUpdate?: (tbl: Table) => void;
  onEditMeta?: () => void;
}

export const TableDetailPage: React.FC<TableDetailPageProps> = ({
  tbl, onBack, onHome, onNewVersion, onUpdate, onEditMeta,
}) => {
  const sortedVers = [...tbl.versions].sort((a, b) => b.version - a.version);
  const [selVer, setSelVer] = useState<TableVersion>(sortedVers[0]);
  const [search, setSearch] = useState('');
  const [tableView, setTableView] = useState<'preview' | 'code'>('preview');
  const [editVerOpen, setEditVerOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const handleStatusChange = (status: VerStatus) => {
    const updated: Table = {
      ...tbl,
      versions: tbl.versions.map(v => v.id === selVer.id ? { ...v, status } : v),
    };
    onUpdate?.(updated);
    setSelVer(sv => ({ ...sv, status }));
  };

  const handleSaveVersion = (data: { description: string; changeSummary: string; effectiveFrom: string; effectiveUntil: string }) => {
    const patch = {
      description: data.description,
      changeSummary: data.changeSummary,
      effectiveFrom: data.effectiveFrom ? data.effectiveFrom + 'T00:00:00' : selVer.effectiveFrom,
      effectiveUntil: data.effectiveUntil ? data.effectiveUntil + 'T00:00:00' : null,
    };
    const updated: Table = { ...tbl, versions: tbl.versions.map(v => v.id === selVer.id ? { ...v, ...patch } : v) };
    onUpdate?.(updated);
    setSelVer(sv => ({ ...sv, ...patch }));
    setEditVerOpen(false);
  };

  const handleDeleteVer = () => {
    const remaining = tbl.versions.filter(v => v.id !== selVer.id);
    const updated: Table = { ...tbl, versions: remaining };
    onUpdate?.(updated);
    if (remaining.length > 0) setSelVer([...remaining].sort((a, b) => b.version - a.version)[0]);
    setConfirmDel(false);
  };

  const toggleRow = (rowId: number) => {
    const updated: Table = {
      ...tbl,
      versions: tbl.versions.map(v =>
        v.id !== selVer.id ? v : { ...v, table: { ...v.table, rows: v.table.rows.map(r => r.id === rowId ? { ...r, isEnabled: !r.isEnabled } : r) } }
      ),
    };
    onUpdate?.(updated);
    setSelVer(updated.versions.find(v => v.id === selVer.id)!);
  };

  const ver = selVer;

  const visibleRows = useMemo(() => {
    if (!ver?.table) return [];
    const q = search.toLowerCase();
    if (!q) return ver.table.rows;
    return ver.table.rows.filter(row =>
      row.inputs.some(v => String(v).toLowerCase().includes(q)) ||
      row.outputs.some(v => String(v).toLowerCase().includes(q))
    );
  }, [ver, search]);

  const codePayload = ver?.table ? {
    id: tbl.id, name: tbl.name, version: ver.version,
    hitPolicy: ver.table.hitPolicy,
    inputs: ver.table.inputs,
    outputs: ver.table.outputs,
    rows: ver.table.rows,
  } : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-background border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-1.5 text-sm font-medium mb-3">
          <button onClick={onHome ?? onBack} className="text-muted-foreground hover:text-foreground transition-colors">Rules</button>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">Decisions</button>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <span className="text-foreground font-medium truncate max-w-xs">{tbl.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-foreground">{tbl.name}</h1>
              {tbl.category && <CategoryBadge category={tbl.category} />}
            </div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {tbl.tags.map(t => (
                <span key={t} className="inline-flex items-center px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md font-medium">{t}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Btn variant="outline" size="sm" onClick={onEditMeta}><IC.Edit size={13} />Edit Table</Btn>
            <Btn size="sm" onClick={() => onNewVersion(tbl)}><IC.Plus size={14} />New Version</Btn>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Versions sidebar */}
        <div className="w-56 border-r border-border bg-background flex flex-col shrink-0">
          <div className="flex border-b border-border bg-background shrink-0">
            <div className="flex-1 py-2.5 px-4 text-xs font-semibold tracking-wide text-primary border-b-2 border-primary">
              Versions ({tbl.versions.length})
            </div>
          </div>
          <div className="overflow-y-auto flex-1 py-2" style={{ scrollbarWidth: 'thin' }}>
            {sortedVers.map(v => (
              <button key={v.id} onClick={() => setSelVer(v)}
                className={cn('w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-l-2',
                  selVer?.id === v.id ? 'bg-primary/5 border-primary' : 'border-transparent hover:bg-accent')}>
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                  selVer?.id === v.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  V{v.version}
                </div>
                <div className="flex-1 min-w-0">
                  <VersionBadge status={v.status} />
                  <p className="text-xs font-medium text-foreground mt-1 truncate">{v.changeSummary || `Version ${v.version}`}</p>
                  {v.effectiveFrom && <p className="text-[10px] text-muted-foreground mt-0.5">From {fmt(v.effectiveFrom)}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Version detail */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
          <div className="max-w-3xl flex flex-col gap-5">

            {/* Version info card */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-base font-semibold text-foreground">Version {ver.version}</span>
                    {['ACTIVE', 'INACTIVE', 'DEPRECATED'].includes(ver.status)
                      ? <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Approved</span>
                      : <VersionBadge status={ver.status} />}
                    {ver.table?.hitPolicy && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                        {ver.table.hitPolicy.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">{ver.changeSummary || `Version ${ver.version}`}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ver.status === 'DRAFT' ? (
                    <Btn size="sm" variant="secondary" onClick={() => handleStatusChange('ACTIVE')}>Submit for Review</Btn>
                  ) : IS_PENDING(ver.status) ? (
                    (() => {
                      const m = STATUS_META[ver.status];
                      return (
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', m.bg, m.text)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', m.dot)} />{m.label}
                        </span>
                      );
                    })()
                  ) : (
                    <StatusDropdown current={ver.status} onChange={handleStatusChange} />
                  )}
                  <MoreMenu onEdit={() => setEditVerOpen(true)} onDelete={() => setConfirmDel(true)} />
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
                    <span className="text-xs text-muted-foreground">Effective From</span>
                    <p className="font-medium text-foreground mt-0.5">{fmt(ver.effectiveFrom)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Effective Until</span>
                    <p className="font-medium text-foreground mt-0.5">{ver.effectiveUntil ? fmt(ver.effectiveUntil) : 'Open-ended'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6">
                  <div>
                    <span className="text-xs text-muted-foreground">Active Rows</span>
                    <p className="font-medium text-foreground mt-0.5">
                      {ver.table?.rows.filter(r => r.isEnabled).length ?? 0}
                      <span className="text-muted-foreground font-normal">/{ver.table?.rows.length ?? 0}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Schema</span>
                    <p className="font-medium text-foreground mt-0.5">
                      {ver.table?.inputs.length ?? 0} in · {ver.table?.outputs.length ?? 0} out
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Search bar */}
            {ver.table && tableView === 'preview' && (
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <IC.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Inp value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter rows…" className="pl-8 w-full" />
                </div>
                {search && (
                  <span className="text-xs text-muted-foreground shrink-0">{visibleRows.length}/{ver.table.rows.length} rows</span>
                )}
              </div>
            )}

            {/* Decision table */}
            {ver.table && (
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Decision Table</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      {ver.table.inputs.length} input{ver.table.inputs.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {ver.table.outputs.length} output{ver.table.outputs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted rounded-lg p-0.5">
                      {(['preview', 'code'] as const).map(v => (
                        <button key={v} type="button" onClick={() => setTableView(v)}
                          className={cn('px-2.5 py-1 text-xs font-medium rounded-md transition-colors capitalize',
                            tableView === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                          {v}
                        </button>
                      ))}
                    </div>
                    <Btn variant="outline" size="sm" onClick={() => {}}>
                      <IC.Play size={12} />Run Table
                    </Btn>
                  </div>
                </div>

                {tableView === 'preview' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/60 border-b border-border">
                          <th className="px-3 py-2.5 text-xs font-semibold text-muted-foreground text-left w-8">#</th>
                          {ver.table.inputs.map((inp, i) => (
                            <th key={i} className="px-3 py-2.5 text-xs text-left">
                              <div className="font-semibold text-amber-700">{inp.label || inp.field}</div>
                              <div className="font-mono text-[10px] font-normal text-muted-foreground mt-0.5">{inp.field} · {inp.operator} · {inp.dataType}</div>
                            </th>
                          ))}
                          {ver.table.outputs.map((out, i) => (
                            <th key={i} className="px-3 py-2.5 text-xs text-left">
                              <div className="font-semibold text-primary">{out.label || out.field}</div>
                              <div className="font-mono text-[10px] font-normal text-muted-foreground mt-0.5">{out.field} · {out.dataType}</div>
                            </th>
                          ))}
                          <th className="px-3 py-2.5 w-12 text-xs font-semibold text-muted-foreground text-center">On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {visibleRows.map(row => (
                          <tr key={row.id} className={cn('transition-colors hover:bg-accent/30', !row.isEnabled && 'opacity-40 bg-muted/20')}>
                            <td className="px-3 py-2 text-xs text-muted-foreground text-center">{row.id}</td>
                            {row.inputs.map((inp, i) => (
                              <td key={i} className="px-3 py-2.5">
                                {inp !== '' && inp !== null
                                  ? <span className="font-mono text-xs bg-amber-50/70 text-amber-900 px-1.5 py-0.5 rounded border border-amber-100">{String(inp)}</span>
                                  : <span className="text-muted-foreground/30 text-xs font-mono">any</span>}
                              </td>
                            ))}
                            {row.outputs.map((out, i) => (
                              <td key={i} className="px-3 py-2.5">
                                <span className="font-mono text-xs font-semibold text-primary">{String(out)}</span>
                              </td>
                            ))}
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => toggleRow(row.id)}
                                className={cn('w-8 h-4 rounded-full transition-colors relative block mx-auto', row.isEnabled ? 'bg-primary' : 'bg-muted-foreground/30')}>
                                <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all', row.isEnabled ? 'left-4' : 'left-0.5')} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {ver.table.rows.length === 0 && (
                      <div className="text-center py-10 text-sm text-muted-foreground">No rows in this version</div>
                    )}
                    {ver.table.rows.length > 0 && visibleRows.length === 0 && (
                      <div className="text-center py-10 text-sm text-muted-foreground">No rows match your filter</div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-b-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
                      <span className="text-[10px] font-mono text-muted-foreground">table.json</span>
                      <button type="button"
                        onClick={() => navigator.clipboard?.writeText(JSON.stringify(codePayload, null, 2))}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                        <IC.Copy size={11} />Copy
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-foreground/80 bg-muted/30 overflow-x-auto leading-relaxed" style={{ scrollbarWidth: 'thin' }}>
                      <code>{JSON.stringify(codePayload, null, 2)}</code>
                    </pre>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right panel */}
        <TableRightPanel tbl={tbl} ver={ver} />
      </div>

      {/* Edit version modal */}
      <Modal open={editVerOpen} onClose={() => setEditVerOpen(false)} title={`Edit Version ${ver.version}`}
        subtitle="Update version metadata. Table logic can only be changed by creating a new version.">
        <EditVersionContent ver={ver} onClose={() => setEditVerOpen(false)} onSave={handleSaveVersion} />
      </Modal>

      {/* Delete version confirm */}
      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="Delete Version" width="max-w-sm">
        <div className="p-5 flex flex-col gap-4">
          <div className="p-3.5 bg-destructive/10 rounded-lg border border-destructive/20 text-sm text-destructive">
            Version {ver.version} will be soft-deleted and retained for audit compliance.
          </div>
          <div className="flex gap-2 justify-end">
            <Btn variant="outline" onClick={() => setConfirmDel(false)}>Cancel</Btn>
            <Btn variant="destructive" onClick={handleDeleteVer}>Delete Version</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ── EDIT VERSION CONTENT ────────────────────────── */
const EditVersionContent: React.FC<{
  ver: TableVersion;
  onClose: () => void;
  onSave: (data: { description: string; changeSummary: string; effectiveFrom: string; effectiveUntil: string }) => void;
}> = ({ ver, onClose, onSave }) => {
  const [description,   setDescription]   = useState(ver.description || '');
  const [changeSummary, setChangeSummary] = useState(ver.changeSummary || '');
  const [effectiveFrom, setEffectiveFrom] = useState(ver.effectiveFrom?.split('T')[0] || '');
  const [effectiveUntil, setEffectiveUntil] = useState(ver.effectiveUntil?.split('T')[0] || '');
  return (
    <div className="p-5 flex flex-col gap-4">
      <Field label="Version Name">
        <Inp value={changeSummary} onChange={e => setChangeSummary(e.target.value)} placeholder="Short version name" />
      </Field>
      <Field label="Version Note">
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          placeholder="Describe what changed in this version…"
          className="px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground w-full" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Effective From">
          <Inp type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
        </Field>
        <Field label="Effective Until" hint="Leave blank for open-ended">
          <Inp type="date" value={effectiveUntil} onChange={e => setEffectiveUntil(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2 justify-end">
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => onSave({ description, changeSummary, effectiveFrom, effectiveUntil })}>Save Changes</Btn>
      </div>
    </div>
  );
};

/* ── CREATE PAGE ─────────────────────────────────── */
type InputColDraft  = { id: string; factId: string; field: string; label: string; operator: string };
type OutputColDraft = { id: string; field: string; label: string; actionType: 'value' | 'field_ref' | 'formula' | 'lookup'; refFactId: string; refField: string; lookupTableId: string; lookupFactId: string };
type RowDraft       = { id: string; inputs: string[]; outputs: string[]; isEnabled: boolean };

interface CreateForm {
  name: string; category: string; tags: string;
  description: string; changeSummary: string;
  hitPolicy: string; effectiveFrom: string; effectiveUntil: string;
  inputs: InputColDraft[];
  outputs: OutputColDraft[];
  rows: RowDraft[];
}

function emptyInput(): InputColDraft   { return { id: uid(), factId: '', field: '', label: '', operator: 'EQUALS' }; }
function emptyOutput(): OutputColDraft { return { id: uid(), field: '', label: '', actionType: 'value', refFactId: '', refField: '', lookupTableId: '', lookupFactId: '' }; }
function emptyRow(ni: number, no: number): RowDraft { return { id: uid(), inputs: Array(ni).fill(''), outputs: Array(no).fill(''), isEnabled: true }; }

const CREATE_STEPS = ['Table Info', 'Version Info', 'Schema', 'Rows'];

/* ── HIT POLICY DROPDOWN ─────────────────────────── */
const HitPolicyDropdown: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const selected = HIT_POLICIES.find(hp => hp.value === value) ?? HIT_POLICIES[0];
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="h-9 w-full px-3 text-sm border border-border rounded-md bg-background text-left flex items-center justify-between gap-2 hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-foreground truncate">{selected.label}</span>
          <span className="text-xs text-muted-foreground truncate hidden sm:block">{selected.desc}</span>
        </div>
        <IC.ChevD size={13} className="text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-30 py-1 min-w-[260px]">
          {HIT_POLICIES.map(hp => (
            <button key={hp.value} type="button" onClick={() => { onChange(hp.value); setOpen(false); }}
              className={cn('w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition-colors hover:bg-accent',
                hp.value === value && 'bg-primary/5')}>
              <span className="text-sm font-semibold text-foreground">{hp.label}</span>
              <span className="text-[11px] text-muted-foreground">{hp.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── FACT + FIELD SELECTOR ───────────────────────── */
const FactFieldSelector: React.FC<{
  facts: Fact[];
  factFields: FactField[];
  factId: string;
  field: string;
  onFactChange: (factId: string) => void;
  onFieldChange: (path: string, label: string) => void;
}> = ({ facts, factFields, factId, field, onFactChange, onFieldChange }) => {
  const available = factFields.filter(f => f.factId === factId);
  return (
    <div className="flex items-center gap-1.5 flex-[3]">
      <DSel value={factId} onChange={v => onFactChange(v)}
        className="flex-1"
        options={[{ value: '', label: 'Select fact…' }, ...facts.map(f => ({ value: f.id, label: f.displayName }))]} />
      <DSel value={field} onChange={v => {
        const ff = factFields.find(f => f.path === v);
        onFieldChange(v, ff?.displayName ?? v);
      }}
        disabled={!factId}
        className="flex-1"
        options={[
          { value: '', label: factId ? 'Select field…' : '— choose fact first —' },
          ...available.map(f => ({ value: f.path, label: f.displayName })),
        ]} />
    </div>
  );
};

/* ── OUTPUT ACTION CELL ──────────────────────────── */
const OUTPUT_ACTIONS: { value: OutputColDraft['actionType']; label: string }[] = [
  { value: 'value',     label: 'Value' },
  { value: 'field_ref', label: 'Field Ref' },
  { value: 'formula',   label: 'Formula' },
  { value: 'lookup',    label: 'Lookup' },
];

const OutputActionCell: React.FC<{
  out: OutputColDraft;
  facts: Fact[];
  factFields: FactField[];
  lookupTables: LookupTable[];
  onUpdate: (updates: Partial<OutputColDraft>) => void;
}> = ({ out, facts, factFields, lookupTables, onUpdate }) => {
  const refFields = factFields.filter(f => f.factId === out.refFactId);
  return (
    <div className="flex items-center gap-1.5 flex-[3]">
      <DSel value={out.actionType} onChange={v => onUpdate({ actionType: v as OutputColDraft['actionType'] })}
        options={OUTPUT_ACTIONS.map(a => ({ value: a.value, label: a.label }))}
        className="w-28 shrink-0" />
      {out.actionType === 'value' && (
        <Inp value={out.field} onChange={e => onUpdate({ field: e.target.value })}
          placeholder="output field name" className="flex-1 text-xs font-mono" />
      )}
      {out.actionType === 'formula' && (
        <Inp value={out.field} onChange={e => onUpdate({ field: e.target.value })}
          placeholder="e.g. input.age * 1.1" className="flex-1 text-xs font-mono" />
      )}
      {out.actionType === 'field_ref' && (
        <>
          <DSel value={out.refFactId}
            onChange={v => onUpdate({ refFactId: v, refField: '' })}
            options={[{ value: '', label: 'Select fact…' }, ...facts.map(f => ({ value: f.id, label: f.displayName }))]}
            className="flex-1" />
          <DSel value={out.refField}
            onChange={v => onUpdate({ refField: v })}
            disabled={!out.refFactId}
            options={[
              { value: '', label: out.refFactId ? 'Select field…' : '— fact first —' },
              ...refFields.map(f => ({ value: f.path, label: f.displayName })),
            ]}
            className="flex-1" />
        </>
      )}
      {out.actionType === 'lookup' && (
        <>
          <DSel value={out.lookupTableId}
            onChange={v => onUpdate({ lookupTableId: v })}
            options={[{ value: '', label: 'Select lookup…' }, ...lookupTables.map(t => ({ value: t.id, label: t.name }))]}
            className="flex-1" />
          <DSel value={out.lookupFactId}
            onChange={v => onUpdate({ lookupFactId: v })}
            options={[{ value: '', label: 'Select input fact…' }, ...facts.map(f => ({ value: f.id, label: f.displayName }))]}
            className="flex-1" />
        </>
      )}
    </div>
  );
};

export interface TableCreatePageProps {
  onSave: (tbl: Table) => void;
  onCancel: () => void;
  onHome?: () => void;
  existingTable?: Table;
  facts?: Fact[];
  factFields?: FactField[];
  lookupTables?: LookupTable[];
}

export const TableCreatePage: React.FC<TableCreatePageProps> = ({
  onSave, onCancel, onHome, existingTable, facts = [], factFields = [], lookupTables = [],
}) => {
  const isNewVersion = !!existingTable;
  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState(0);
  const [exitOpen, setExitOpen] = useState(false);

  const lastVer = existingTable?.versions[existingTable.versions.length - 1] ?? null;

  const [form, setForm] = useState<CreateForm>({
    name:          existingTable?.name ?? '',
    category:      existingTable?.category ?? '',
    tags:          existingTable?.tags.join(', ') ?? '',
    description:   '',
    changeSummary: '',
    hitPolicy:     lastVer?.table?.hitPolicy ?? 'first_match',
    effectiveFrom: today,
    effectiveUntil: '',
    inputs:  lastVer?.table?.inputs.map(i => ({ id: uid(), factId: '', field: i.field, label: i.label, operator: i.operator })) ?? [emptyInput()],
    outputs: lastVer?.table?.outputs.map(o => ({ id: uid(), field: o.field, label: o.label, actionType: 'value' as const, refFactId: '', refField: '', lookupTableId: '', lookupFactId: '' })) ?? [emptyOutput()],
    rows: [emptyRow(lastVer?.table?.inputs.length ?? 1, lastVer?.table?.outputs.length ?? 1)],
  });

  const set = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) => setForm(f => ({ ...f, [k]: v }));

  /* Inputs */
  const addInput = () =>
    setForm(f => ({ ...f, inputs: [...f.inputs, emptyInput()], rows: f.rows.map(r => ({ ...r, inputs: [...r.inputs, ''] })) }));
  const removeInput = (idx: number) => {
    if (form.inputs.length <= 1) return;
    setForm(f => ({ ...f, inputs: f.inputs.filter((_, i) => i !== idx), rows: f.rows.map(r => ({ ...r, inputs: r.inputs.filter((_, i) => i !== idx) })) }));
  };
  const updateInput = (idx: number, k: keyof InputColDraft, v: string) =>
    setForm(f => ({ ...f, inputs: f.inputs.map((c, i) => i === idx ? { ...c, [k]: v } : c) }));

  /* Outputs */
  const addOutput = () =>
    setForm(f => ({ ...f, outputs: [...f.outputs, emptyOutput()], rows: f.rows.map(r => ({ ...r, outputs: [...r.outputs, ''] })) }));
  const removeOutput = (idx: number) => {
    if (form.outputs.length <= 1) return;
    setForm(f => ({ ...f, outputs: f.outputs.filter((_, i) => i !== idx), rows: f.rows.map(r => ({ ...r, outputs: r.outputs.filter((_, i) => i !== idx) })) }));
  };
  const updateOutput = (idx: number, updates: Partial<OutputColDraft>) =>
    setForm(f => ({ ...f, outputs: f.outputs.map((c, i) => i === idx ? { ...c, ...updates } : c) }));

  /* Rows */
  const addRow = () => setForm(f => ({ ...f, rows: [...f.rows, emptyRow(f.inputs.length, f.outputs.length)] }));
  const removeRow = (idx: number) => setForm(f => ({ ...f, rows: f.rows.filter((_, i) => i !== idx) }));
  const updateRowInput  = (ri: number, ci: number, v: string) =>
    setForm(f => ({ ...f, rows: f.rows.map((r, i) => i === ri ? { ...r, inputs:  r.inputs.map((x, j) => j === ci ? v : x) } : r) }));
  const updateRowOutput = (ri: number, ci: number, v: string) =>
    setForm(f => ({ ...f, rows: f.rows.map((r, i) => i === ri ? { ...r, outputs: r.outputs.map((x, j) => j === ci ? v : x) } : r) }));
  const toggleRowEnabled = (idx: number) =>
    setForm(f => ({ ...f, rows: f.rows.map((r, i) => i === idx ? { ...r, isEnabled: !r.isEnabled } : r) }));

  const nextVerNum = isNewVersion ? Math.max(...existingTable!.versions.map(v => v.version)) + 1 : 1;

  const canProceed = [
    form.name.trim().length > 0 && form.category.trim().length > 0,
    form.effectiveFrom.length > 0,
    form.inputs.every(i => i.field.trim().length > 0) &&
    form.outputs.every(o => {
      if (o.actionType === 'value' || o.actionType === 'formula') return o.field.trim().length > 0;
      if (o.actionType === 'field_ref') return o.refField.trim().length > 0;
      if (o.actionType === 'lookup') return o.lookupTableId.trim().length > 0;
      return true;
    }),
    true,
  ];

  const handleSubmit = () => {
    const nextVer = isNewVersion ? Math.max(...existingTable!.versions.map(v => v.version)) + 1 : 1;
    const newVersion: TableVersion = {
      id: uid(), version: nextVer, status: 'DRAFT',
      description:   form.description,
      changeSummary: form.changeSummary || (isNewVersion ? `Version ${nextVer}` : 'Initial version'),
      effectiveFrom: form.effectiveFrom + 'T00:00:00',
      effectiveUntil: form.effectiveUntil ? form.effectiveUntil + 'T00:00:00' : null,
      table: {
        hitPolicy: form.hitPolicy,
        inputs:  form.inputs.map(i => {
          const ff = factFields.find(f => f.path === i.field);
          return { field: i.field.trim(), label: i.label.trim() || ff?.displayName || i.field.trim(), operator: i.operator, dataType: (ff?.dataType ?? 'string') as 'string' | 'number' | 'boolean' };
        }),
        outputs: form.outputs.map(o => {
          if (o.actionType === 'field_ref') {
            const ff = factFields.find(f => f.path === o.refField);
            return { field: o.refField, label: o.label.trim() || ff?.displayName || o.refField, dataType: (ff?.dataType ?? 'string') as 'string' | 'number' | 'boolean' };
          }
          if (o.actionType === 'lookup') {
            const lt = lookupTables.find(t => t.id === o.lookupTableId);
            const field = lt ? `lookup.${lt.name.toLowerCase().replace(/\s+/g, '_')}` : 'lookup.result';
            return { field, label: o.label.trim() || lt?.name || 'Lookup Result', dataType: 'string' as const };
          }
          return { field: o.field.trim(), label: o.label.trim() || o.field.trim(), dataType: 'string' as const };
        }),
        rows:    form.rows.map((r, idx) => ({
          id: idx + 1, isEnabled: true,
          inputs:  r.inputs.map(v => v.trim()),
          outputs: r.outputs.map(v => v.trim()),
        })),
      },
    };
    const tbl: Table = isNewVersion
      ? { ...existingTable!, versions: [...existingTable!.versions, newVersion] }
      : {
          id: uid(), name: form.name.trim(), category: form.category.trim(),
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          createdAt: new Date().toISOString(), versions: [newVersion],
        };
    onSave(tbl);
  };

  /* ── Step 0 — Info ─────────────────────────────── */
  const StepInfo = (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Table Name <span className="text-destructive">*</span></label>
        <Inp value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Risk Band Matrix" disabled={isNewVersion} className={cn('w-full', isNewVersion && 'opacity-60')} />
        {isNewVersion && <p className="text-[10px] text-muted-foreground mt-1">Name is locked when adding a new version.</p>}
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Category <span className="text-destructive">*</span></label>
        <DSel
          value={form.category} onChange={v => set('category', v)} disabled={isNewVersion}
          options={[{ value: '', label: 'Select a category…' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
          className={cn('w-full', isNewVersion && 'opacity-60')}
        />
      </div>
      {!isNewVersion && (
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Tags</label>
          <Inp value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="pricing, motor, eligibility  (comma-separated)" className="w-full" />
        </div>
      )}
    </div>
  );

  /* ── Step 1 — Schema ───────────────────────────── */
  const colHeaderCls = 'flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wide';

  const StepSchema = (
    <div className="flex flex-col gap-6">
      {/* Input columns */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-amber-700">Input Columns <span className="text-destructive">*</span></p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Conditions evaluated against incoming data</p>
          </div>
          <Btn variant="outline" size="sm" onClick={addInput}><IC.Plus size={12} />Add input</Btn>
        </div>
        <div className="rounded-xl border border-amber-200 overflow-hidden">
          <div className={colHeaderCls}>
            <span className="w-5" />
            <span className="flex-[3]">Fact · Field</span>
            <span className="flex-1">Label</span>
            <span className="w-36">Operator</span>
            <span className="w-4" />
          </div>
          <div className="flex flex-col divide-y divide-border/50">
            {form.inputs.map((inp, i) => (
              <div key={inp.id} className="flex items-center gap-2 px-3 py-2.5 group">
                <span className="w-5 text-[10px] text-muted-foreground/50 text-right shrink-0">{i + 1}</span>
                <FactFieldSelector
                  facts={facts}
                  factFields={factFields}
                  factId={inp.factId}
                  field={inp.field}
                  onFactChange={factId => updateInput(i, 'factId', factId)}
                  onFieldChange={(path, label) => {
                    updateInput(i, 'field', path);
                    if (!inp.label) updateInput(i, 'label', label);
                  }}
                />
                <Inp value={inp.label} onChange={e => updateInput(i, 'label', e.target.value)} placeholder="e.g. Member Age" className="text-xs flex-1" />
                <Sel value={inp.operator} onChange={e => updateInput(i, 'operator', e.target.value)}
                  options={OPERATORS.map(op => ({ value: op, label: op }))}
                  className="w-36" />
                <button onClick={() => removeInput(i)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                  <IC.X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Output columns */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-primary">Output Columns <span className="text-destructive">*</span></p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Values set when a row matches</p>
          </div>
          <Btn variant="outline" size="sm" onClick={addOutput}><IC.Plus size={12} />Add output</Btn>
        </div>
        <div className="rounded-xl border border-primary/30 overflow-hidden">
          <div className={colHeaderCls}>
            <span className="w-5" />
            <span className="flex-[3]">Action · Target</span>
            <span className="flex-1">Label</span>
            <span className="w-4" />
          </div>
          <div className="flex flex-col divide-y divide-border/50">
            {form.outputs.map((out, i) => (
              <div key={out.id} className="flex items-center gap-2 px-3 py-2.5 group">
                <span className="w-5 text-[10px] text-muted-foreground/50 text-right shrink-0">{i + 1}</span>
                <OutputActionCell
                  out={out}
                  facts={facts}
                  factFields={factFields}
                  lookupTables={lookupTables}
                  onUpdate={updates => updateOutput(i, updates)}
                />
                <Inp value={out.label} onChange={e => updateOutput(i, { label: e.target.value })} placeholder="e.g. Rate Slab" className="text-xs flex-1" />
                <button onClick={() => removeOutput(i)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
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
            placeholder={isNewVersion ? 'e.g. Updated risk bands' : 'Initial version'} className="w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Version Number</label>
          <Inp value={`v${nextVerNum}`} disabled className="opacity-60 bg-muted w-full" />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-foreground mb-1 block">Hit Policy</label>
        <HitPolicyDropdown value={form.hitPolicy} onChange={v => set('hitPolicy', v)} />
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
          placeholder="Describe what this version evaluates or what changed…" rows={3}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none text-foreground placeholder:text-muted-foreground" />
      </div>
    </div>
  );

  /* ── Step 3 — Rows ─────────────────────────────── */
  const StepRows = (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-foreground">Rows</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Define input–output combinations. Leave an input cell blank to match any value.</p>
          </div>
          <Btn variant="outline" size="sm" onClick={addRow}><IC.Plus size={12} />Add row</Btn>
        </div>
        <div className="rounded-xl border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2 text-left text-muted-foreground font-semibold w-8">#</th>
                {form.inputs.map((inp, i) => (
                  <th key={i} className="px-3 py-2 text-left text-amber-700 font-semibold min-w-[110px]">
                    {inp.label || inp.field || `Input ${i + 1}`}
                  </th>
                ))}
                {form.outputs.map((out, i) => (
                  <th key={i} className="px-3 py-2 text-left text-primary font-semibold min-w-[110px]">
                    {out.label || out.field || `Output ${i + 1}`}
                  </th>
                ))}
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {form.rows.map((row, ri) => (
                <tr key={row.id}>
                  <td className="px-3 py-1.5 text-muted-foreground text-center">{ri + 1}</td>
                  {row.inputs.map((val, ci) => (
                    <td key={ci} className="px-2 py-1.5">
                      <input value={val} onChange={e => updateRowInput(ri, ci, e.target.value)} placeholder="any"
                        className="w-full px-2 py-1 font-mono text-xs border border-amber-200 rounded bg-amber-50/30 focus:outline-none focus:ring-1 focus:ring-amber-400 text-foreground placeholder:text-muted-foreground/40" />
                    </td>
                  ))}
                  {row.outputs.map((val, ci) => (
                    <td key={ci} className="px-2 py-1.5">
                      <input value={val} onChange={e => updateRowOutput(ri, ci, e.target.value)} placeholder="value"
                        className="w-full px-2 py-1 font-mono text-xs border border-primary/30 rounded bg-primary/5 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/40" />
                    </td>
                  ))}
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeRow(ri)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <IC.Trash size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {form.rows.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">
              No rows yet — click <strong>Add row</strong> to start
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const stepContent  = [StepInfo, StepVersionInfo, StepSchema, StepRows];
  const stepTitles   = isNewVersion
    ? [`New Version — ${existingTable!.name}`, 'Version Info', 'Define Schema', 'Add Rows']
    : ['Decision Table Info', 'Version Info', 'Define Schema', 'Add Rows'];
  const stepSubtitles = [
    isNewVersion
      ? 'Provide metadata for this new version.'
      : 'Give your table a name, category, and description.',
    'Set the effective dates, hit policy, and version notes for this version.',
    'Define the input conditions and output fields for each row.',
    'Add the decision rows.',
  ];

  const activeSteps       = isNewVersion ? CREATE_STEPS.slice(1) : CREATE_STEPS;
  const activeContent     = isNewVersion ? stepContent.slice(1) : stepContent;
  const activeCanProceed  = isNewVersion ? canProceed.slice(1) : canProceed;
  const activeTitles      = isNewVersion ? stepTitles.slice(1) : stepTitles;
  const activeSubtitles   = isNewVersion ? stepSubtitles.slice(1) : stepSubtitles;

  return (
    <div className="flex flex-col h-full">
      {/* Exit modal */}
      <Modal open={exitOpen} onClose={() => setExitOpen(false)} title="Leave without saving?" subtitle="Your changes won't be saved until you finish." width="max-w-sm">
        <div className="p-5 flex flex-col gap-3">
          <Btn onClick={() => setExitOpen(false)} className="w-full justify-center">Continue Editing</Btn>
          <Btn variant="outline" onClick={() => { handleSubmit(); setExitOpen(false); }} className="w-full justify-center">Save as Draft &amp; Close</Btn>
          <Btn variant="ghost-destructive" onClick={() => { setExitOpen(false); onCancel(); }} className="w-full justify-center">Discard &amp; Close</Btn>
        </div>
      </Modal>

      {/* Breadcrumb */}
      <div className="bg-background border-b border-border px-6 py-3 flex items-center gap-1.5 font-medium shrink-0">
        <button onClick={onHome ?? onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Rules</button>
        <IC.ChevR size={13} className="text-muted-foreground/40" />
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Decisions</button>
        <IC.ChevR size={13} className="text-muted-foreground/40" />
        {isNewVersion && (
          <>
            <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{existingTable!.name}</button>
            <IC.ChevR size={13} className="text-muted-foreground/40" />
          </>
        )}
        <span className="text-sm font-medium text-foreground">
          {isNewVersion ? 'New Version' : 'New Decision Table'}
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
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                    step === i
                      ? 'bg-primary/10 text-primary font-medium'
                      : i < step
                        ? 'text-foreground hover:bg-accent'
                        : 'text-muted-foreground hover:bg-accent',
                  )}>
                  <span className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    step === i
                      ? 'bg-primary text-primary-foreground'
                      : i < step
                        ? 'bg-green-500 text-white'
                        : 'bg-muted text-muted-foreground',
                  )}>
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
            : <Btn disabled={!activeCanProceed[step]} onClick={handleSubmit}>Submit for Review</Btn>
          }
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className={step <= (isNewVersion ? 0 : 1) ? 'max-w-2xl mx-auto' : 'w-full'}>
          <div className="bg-card rounded-xl border border-border p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-0.5">{activeTitles[step]}</h2>
              <p className="text-sm text-muted-foreground">{activeSubtitles[step]}</p>
            </div>
            {activeContent[step]}
          </div>
        </div>
      </div>
    </div>
  );
};
