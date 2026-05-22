import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  cn, uid, fmt, Btn, Inp, Modal, Field, IC, SearchBanner,
  Fact, FactField, DataType, Space,
} from './shared';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';

/* ── DATA TYPE CONFIG ────────────────────────────── */
const DATA_TYPE_OPTIONS: { value: DataType; label: string; color: string }[] = [
  { value: 'string',  label: 'String',  color: 'bg-primary/5 text-primary border-primary/20' },
  { value: 'number',  label: 'Number',  color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { value: 'boolean', label: 'Boolean', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'date',    label: 'Date',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'list',    label: 'List',    color: 'bg-teal-50 text-teal-700 border-teal-200' },
];

const DataTypeBadge: React.FC<{ type: DataType }> = ({ type }) => {
  const cfg = DATA_TYPE_OPTIONS.find(o => o.value === type) || DATA_TYPE_OPTIONS[0];
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border', cfg.color)}>
      {cfg.label}
    </span>
  );
};

/* ── FACT FORM MODAL ─────────────────────────────── */
interface FactFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; displayName: string; description: string }) => void;
  initial?: Fact;
  existing: Fact[];
}

const FactFormModal: React.FC<FactFormModalProps> = ({ open, onClose, onSave, initial, existing }) => {
  const [displayName, setDisplayName] = useState(initial?.displayName || '');
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toIdentifier = (val: string) => {
    const words = val.trim().split(/\s+/);
    return words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('').replace(/[^a-zA-Z0-9]/g, '');
  };

  React.useEffect(() => {
    if (open) {
      setDisplayName(initial?.displayName || '');
      setName(initial?.name || '');
      setDescription(initial?.description || '');
      setErrors({});
    }
  }, [open, initial]);

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = 'Fact name is required';
    if (!name.trim()) e.name = 'Identifier is required';
    else if (!/^[a-z][a-zA-Z0-9]*$/.test(name.trim())) e.name = 'Must be camelCase, no spaces or special chars (e.g. policy, claimInfo)';
    else if (!initial && existing.some(f => f.name === name.trim())) e.name = 'A fact with this identifier already exists';
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ name: name.trim(), displayName: displayName.trim(), description: description.trim() });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Fact' : 'New Fact'} width="max-w-md">
      <div className="p-5 flex flex-col gap-4">
        <Field label="Fact Name" required>
          <Inp value={displayName} onChange={e => {
            setDisplayName(e.target.value);
            if (!initial) setName(toIdentifier(e.target.value));
            setErrors(x => ({ ...x, displayName: '' }));
          }} placeholder="e.g. Policy Info" />
          {errors.displayName && <p className="text-xs text-destructive mt-0.5">{errors.displayName}</p>}
        </Field>
        <Field label="Identifier" required hint="Auto-generated camelCase key used as the dot-path prefix in rule conditions.">
          <Inp value={name} disabled className="opacity-50 cursor-not-allowed" placeholder="e.g. policyInfo" />
          {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name}</p>}
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="Brief description of this fact namespace…"
            className="px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 placeholder:text-muted-foreground w-full" />
        </Field>
        <div className="flex gap-2 justify-end">
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave}>{initial ? 'Save Changes' : 'Create Fact'}</Btn>
        </div>
      </div>
    </Modal>
  );
};

/* ── FIELD FORM MODAL ────────────────────────────── */
interface FieldFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<FactField, 'id' | 'createdAt' | 'createdBy' | 'path'>) => void;
  initial?: FactField;
  facts: Fact[];
  defaultFactId?: string;
  existingPaths: string[];
}

const FieldFormModal: React.FC<FieldFormModalProps> = ({ open, onClose, onSave, initial, facts, defaultFactId, existingPaths }) => {
  const [factId, setFactId] = useState(initial?.factId || defaultFactId || '');
  const [displayName, setDisplayName] = useState(initial?.displayName || '');
  const [name, setName] = useState(initial?.name || '');
  const [dataType, setDataType] = useState<DataType>(initial?.dataType || 'string');
  const [description, setDescription] = useState(initial?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toIdentifier = (val: string) => {
    const words = val.trim().split(/\s+/);
    return words.map((w, i) => i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('').replace(/[^a-zA-Z0-9]/g, '');
  };

  React.useEffect(() => {
    if (open) {
      setFactId(initial?.factId || defaultFactId || '');
      setDisplayName(initial?.displayName || '');
      setName(initial?.name || '');
      setDataType(initial?.dataType || 'string');
      setDescription(initial?.description || '');
      setErrors({});
    }
  }, [open, initial, defaultFactId]);

  const selectedFact = facts.find(f => f.id === factId);
  const previewPath = selectedFact ? `${selectedFact.name}.${name}` : name;

  const handleSave = () => {
    const e: Record<string, string> = {};
    if (!factId) e.factId = 'Select a fact';
    if (!displayName.trim()) e.displayName = 'Field name is required';
    if (!name.trim()) e.name = 'Identifier is required';
    else if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(name.trim())) e.name = 'Must be camelCase, no spaces (e.g. vehicleType)';
    else if (!initial && existingPaths.includes(previewPath)) e.name = 'A field with this path already exists';
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ factId, name: name.trim(), displayName: displayName.trim(), dataType, description: description.trim(), isOutput: false });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit Field' : 'New Field'} width="max-w-lg">
      <div className="p-5 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fact (Identifier)" required>
            <Select value={factId || '_none'} onValueChange={v => { if (!initial) { setFactId(v === '_none' ? '' : v); setErrors(x => ({ ...x, factId: '' })); } }} disabled={!!initial}>
              <SelectTrigger size="sm" className={cn('w-full', !!initial && 'opacity-50 cursor-not-allowed')}>
                <SelectValue placeholder="Select fact…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Select fact…</SelectItem>
                {facts.map(f => <SelectItem key={f.id} value={f.id}>{f.displayName} ({f.name})</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.factId && <p className="text-xs text-destructive mt-0.5">{errors.factId}</p>}
          </Field>
          <Field label="Data Type" required>
            <Select value={dataType} onValueChange={v => setDataType(v as DataType)}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Field Name" required>
          <Inp value={displayName} onChange={e => {
            setDisplayName(e.target.value);
            if (!initial) setName(toIdentifier(e.target.value));
            setErrors(x => ({ ...x, displayName: '' }));
          }} placeholder="e.g. Vehicle Type" />
          {errors.displayName && <p className="text-xs text-destructive mt-0.5">{errors.displayName}</p>}
        </Field>
        <Field label="Identifier" required hint="Auto-generated camelCase key used in rule paths.">
          <Inp value={name} disabled className="opacity-50 cursor-not-allowed" placeholder="e.g. vehicleType" />
          {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name}</p>}
        </Field>
        {selectedFact && name && (
          <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rule path preview:</span>
            <code className="text-xs font-mono font-semibold text-primary">{previewPath}</code>
          </div>
        )}
        <Field label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            placeholder="What this field represents…"
            className="px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 placeholder:text-muted-foreground w-full" />
        </Field>
        <div className="flex gap-2 justify-end">
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave}>{initial ? 'Save Changes' : 'Create Field'}</Btn>
        </div>
      </div>
    </Modal>
  );
};

/* ── CONFIRM DELETE MODAL ────────────────────────── */
const ConfirmDeleteModal: React.FC<{
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; body: string;
}> = ({ open, onClose, onConfirm, title, body }) => (
  <Modal open={open} onClose={onClose} title={title} width="max-w-sm">
    <div className="p-5 flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{body}</p>
      <div className="flex gap-2 justify-end">
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn variant="destructive" onClick={() => { onConfirm(); onClose(); }}>Delete</Btn>
      </div>
    </div>
  </Modal>
);

/* ── FIELDS & FACTS PAGE ─────────────────────────── */
export interface FieldsPageProps {
  facts: Fact[];
  factFields: FactField[];
  spaces: Space[];
  onCreateFact: (data: { name: string; displayName: string; description: string }) => void;
  onUpdateFact: (fact: Fact) => void;
  onDeleteFact: (factId: string) => void;
  onCreateField: (data: Omit<FactField, 'id' | 'createdAt' | 'createdBy' | 'path'>) => void;
  onUpdateField: (field: FactField) => void;
  onDeleteField: (fieldId: string) => void;
  initialTab?: 'facts' | 'fields';
  onHome?: () => void;
}

export const FieldsPage: React.FC<FieldsPageProps> = ({
  facts, factFields, spaces,
  onCreateFact, onUpdateFact, onDeleteFact,
  onCreateField, onUpdateField, onDeleteField,
  initialTab = 'facts',
  onHome,
}) => {
  const [tab, setTab] = useState<'facts' | 'fields'>(initialTab);
  const [selectedFactId, setSelectedFactId] = useState<string | null>(facts[0]?.id || null);
  const [factSearch, setFactSearch] = useState('');
  const [search, setSearch] = useState('');
  const [factDetailSearch, setFactDetailSearch] = useState('');
  const [factDetailTypeFilter, setFactDetailTypeFilter] = useState<DataType | ''>('');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [typeFilter, setTypeFilter] = useState<DataType | ''>('');
  const [factFilter, setFactFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<'path' | 'displayName' | 'factId' | 'dataType'>('path');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  /* Fact modals */
  const [factFormOpen, setFactFormOpen] = useState(false);
  const [editFact, setEditFact] = useState<Fact | undefined>(undefined);
  const [deleteFact, setDeleteFact] = useState<Fact | null>(null);

  /* Field modals */
  const [fieldFormOpen, setFieldFormOpen] = useState(false);
  const [editField, setEditField] = useState<FactField | undefined>(undefined);
  const [deleteField, setDeleteField] = useState<FactField | null>(null);

  const selectedFact = facts.find(f => f.id === selectedFactId) || null;
  const fieldsForFact = useMemo(() =>
    factFields.filter(f => f.factId === selectedFactId),
    [factFields, selectedFactId]);

  // Reset fact-detail filters when switching facts
  const handleSelectFact = (id: string) => { setSelectedFactId(id); setFactDetailSearch(''); setFactDetailTypeFilter(''); setMoreOpen(false); };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon: React.FC<{ col: typeof sortKey }> = ({ col }) => (
    <span className="ml-1 inline-flex flex-col items-center" style={{ lineHeight: 0 }}>
      <IC.ChevU size={9} className={sortKey === col && sortDir === 'asc' ? 'text-primary' : 'text-muted-foreground/25'} />
      <IC.ChevD size={9} className={sortKey === col && sortDir === 'desc' ? 'text-primary' : 'text-muted-foreground/25'} />
    </span>
  );

  const allFilteredFields = useMemo(() => {
    let list = factFields;
    if (search) list = list.filter(f => f.path.toLowerCase().includes(search.toLowerCase()) || f.displayName.toLowerCase().includes(search.toLowerCase()));
    if (typeFilter) list = list.filter(f => f.dataType === typeFilter);
    if (factFilter) list = list.filter(f => f.factId === factFilter);
    list = [...list].sort((a, b) => {
      const av = sortKey === 'factId' ? (facts.find(fc => fc.id === a.factId)?.displayName || '') : a[sortKey];
      const bv = sortKey === 'factId' ? (facts.find(fc => fc.id === b.factId)?.displayName || '') : b[sortKey];
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [factFields, search, typeFilter, factFilter, sortKey, sortDir, facts]);

  const existingPaths = factFields.map(f => f.path);

  const handleDeleteFact = () => {
    if (!deleteFact) return;
    onDeleteFact(deleteFact.id);
    if (selectedFactId === deleteFact.id) setSelectedFactId(facts.find(f => f.id !== deleteFact.id)?.id || null);
    setDeleteFact(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-background border-b border-border px-6 py-4 shrink-0">
        <div className="flex items-center gap-1.5 text-sm font-medium mb-3">
          <button onClick={onHome} className="text-muted-foreground hover:text-foreground transition-colors">Rules</button>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <span className="text-foreground font-medium">Fields &amp; Facts</span>
        </div>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Fields &amp; Facts</h1>
            <p className="text-sm text-muted-foreground">{facts.length} facts · {factFields.length} fields · global across all spaces</p>
          </div>
          <div className="flex gap-2">
            {tab === 'facts' && (
              <Btn onClick={() => { setEditFact(undefined); setFactFormOpen(true); }}>
                <IC.Plus size={13} />New Fact
              </Btn>
            )}
            {tab === 'fields' && (
              <Btn onClick={() => { setEditField(undefined); setFieldFormOpen(true); }}>
                <IC.Plus size={14} />New Field
              </Btn>
            )}
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 -mb-4 mt-3">
          {(['facts', 'fields'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2 text-sm capitalize transition-colors border-b-2',
                tab === t ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t === 'facts' ? `Facts (${facts.length})` : `All Fields (${factFields.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── FACTS TAB ── */}
      {tab === 'facts' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Facts list (left) */}
          <div className="w-72 border-r border-border bg-background flex flex-col shrink-0">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <IC.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Inp value={factSearch} onChange={e => setFactSearch(e.target.value)} placeholder="Search facts…" className="pl-8 w-full" />
              </div>
            </div>
            {factSearch.trim() && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-primary/5 border-b border-primary/10 text-xs shrink-0">
                <span className="text-muted-foreground">Results for <span className="font-semibold text-foreground">"{factSearch}"</span></span>
                <span className="text-muted-foreground font-medium">{facts.filter(f => f.displayName.toLowerCase().includes(factSearch.toLowerCase()) || f.name.toLowerCase().includes(factSearch.toLowerCase())).length}</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {facts.filter(f => !factSearch || f.displayName.toLowerCase().includes(factSearch.toLowerCase()) || f.name.toLowerCase().includes(factSearch.toLowerCase())).map(f => {
                const fieldCount = factFields.filter(ff => ff.factId === f.id).length;
                return (
                  <button key={f.id} onClick={() => handleSelectFact(f.id)}
                    className={cn('w-full text-left px-4 py-3 flex items-center gap-2 transition-colors border-l-2',
                      selectedFactId === f.id ? 'bg-primary/5 border-primary' : 'border-transparent hover:bg-accent')}>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', selectedFactId === f.id ? 'text-primary' : 'text-foreground')}>{f.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5 font-normal">{f.description || f.name}</p>
                    </div>
                    <span className={cn('shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap',
                      selectedFactId === f.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                      {fieldCount} fields
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fact detail (right) */}
          {selectedFact ? (
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex flex-col gap-5">
                {/* Fact info card */}
                <div className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">{selectedFact.displayName}</h2>
                      <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{selectedFact.name}.*</code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Btn size="sm" variant="secondary" onClick={() => { setEditField(undefined); setFieldFormOpen(true); }}>
                        <IC.Plus size={13} />Add Field
                      </Btn>
                      <div className="relative" ref={moreRef}>
                        <Btn size="icon" variant="ghost" onClick={() => setMoreOpen(o => !o)} title="More">
                          <IC.MoreVert size={14} className="text-muted-foreground" />
                        </Btn>
                        {moreOpen && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-lg shadow-lg z-20 py-1">
                            <button onClick={() => { setEditFact(selectedFact); setFactFormOpen(true); setMoreOpen(false); }}
                              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2">
                              <IC.Edit size={13} className="text-muted-foreground" />Edit Fact
                            </button>
                            <button onClick={() => { setDeleteFact(selectedFact); setMoreOpen(false); }}
                              className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2">
                              <IC.Trash size={13} className="text-destructive/70" />Delete Fact
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedFact.description && <p className="text-sm text-muted-foreground mb-4">{selectedFact.description}</p>}
                  {/* Meta info row */}
                  <div className="grid grid-cols-3 gap-x-6 pt-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Fields</span>
                      <p className="text-sm text-foreground font-medium mt-0.5">{fieldsForFact.length}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Created By</span>
                      <p className="text-sm text-foreground font-medium mt-0.5 truncate">{selectedFact.createdBy}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Created On</span>
                      <p className="text-sm text-foreground font-medium mt-0.5">{fmt(selectedFact.createdAt)}</p>
                    </div>
                  </div>
                  {/* Spaces added to */}
                  {(() => {
                    const enabledIn = spaces.filter(sp => sp.enabledFactIds.includes(selectedFact.id));
                    return enabledIn.length > 0 ? (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Spaces added to:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {enabledIn.map(sp => (
                            <span key={sp.id} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">{sp.name}</span>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Fields search + filter */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <IC.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Inp value={factDetailSearch} onChange={e => setFactDetailSearch(e.target.value)} placeholder="Search fields…" className="pl-8 w-full" />
                  </div>
                  <Select value={factDetailTypeFilter || '_all'} onValueChange={v => setFactDetailTypeFilter(v === '_all' ? '' : v as DataType)}>
                    <SelectTrigger size="sm" className="w-36">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All types</SelectItem>
                      {DATA_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fields table */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {factDetailSearch.trim() && (
                    <div className="flex items-center justify-between px-5 py-2 bg-primary/5 border-b border-primary/10 text-xs">
                      <span className="text-muted-foreground">Results for <span className="font-semibold text-foreground">"{factDetailSearch}"</span></span>
                      <span className="text-muted-foreground font-medium">
                        {fieldsForFact.filter(f =>
                          (f.path.toLowerCase().includes(factDetailSearch.toLowerCase()) || f.displayName.toLowerCase().includes(factDetailSearch.toLowerCase())) &&
                          (!factDetailTypeFilter || f.dataType === factDetailTypeFilter)
                        ).length} fields
                      </span>
                    </div>
                  )}
                  {fieldsForFact.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-muted-foreground">No fields defined yet.</p>
                      <Btn size="sm" variant="secondary" className="mt-3" onClick={() => { setEditField(undefined); setFieldFormOpen(true); }}>
                        <IC.Plus size={13} />Add first field
                      </Btn>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Path</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Field Name</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                          <th className="px-5 py-2.5 w-16" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {fieldsForFact
                          .filter(f =>
                            (!factDetailSearch || f.path.toLowerCase().includes(factDetailSearch.toLowerCase()) || f.displayName.toLowerCase().includes(factDetailSearch.toLowerCase())) &&
                            (!factDetailTypeFilter || f.dataType === factDetailTypeFilter)
                          )
                          .map(f => (
                          <tr key={f.id} className="hover:bg-accent/50 transition-colors">
                            <td className="px-5 py-3">
                              <code className="text-xs font-mono font-semibold text-foreground">{f.path}</code>
                            </td>
                            <td className="px-5 py-3 text-sm text-foreground">{f.displayName}</td>
                            <td className="px-5 py-3"><DataTypeBadge type={f.dataType} /></td>
                            <td className="px-5 py-3 text-xs text-muted-foreground max-w-[220px] truncate">{f.description}</td>
                            <td className="px-5 py-3">
                              <div className="flex justify-end gap-0.5">
                                <Btn size="icon" variant="ghost" onClick={() => { setEditField(f); setFieldFormOpen(true); }} title="Edit">
                                  <IC.Edit size={13} className="text-muted-foreground" />
                                </Btn>
                                <Btn size="icon" variant="ghost" onClick={() => setDeleteField(f)} className="hover:bg-destructive/10" title="Delete">
                                  <IC.Trash size={13} className="text-destructive/70" />
                                </Btn>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Select a fact to view its fields</p>
            </div>
          )}
        </div>
      )}

      {/* ── FIELDS TAB ── */}
      {tab === 'fields' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Filters */}
          <div className="bg-background border-b border-border px-6 py-2.5 flex items-center gap-3 shrink-0">
            <div className="relative max-w-xs flex-1">
              <IC.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Inp value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by path or name…" className="pl-8 w-full" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Select value={factFilter || '_all'} onValueChange={v => setFactFilter(v === '_all' ? '' : v)}>
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue placeholder="All facts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All facts</SelectItem>
                  {facts.map(f => <SelectItem key={f.id} value={f.id}>{f.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter || '_all'} onValueChange={v => setTypeFilter(v === '_all' ? '' : v as DataType)}>
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All types</SelectItem>
                  {DATA_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SearchBanner query={search} count={allFilteredFields.length} label="field" />
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <div className="bg-card rounded-xl border border-border overflow-hidden mx-6 my-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    {([['path','Path'],['displayName','Field Name'],['factId','Fact'],['dataType','Type']] as const).map(([col, label]) => (
                      <th key={col} onClick={() => toggleSort(col)}
                        className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground">
                        <span className="inline-flex items-center gap-0.5">{label}<SortIcon col={col} /></span>
                      </th>
                    ))}
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                    <th className="px-5 py-2.5 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {allFilteredFields.map(f => {
                    const fact = facts.find(fc => fc.id === f.factId);
                    return (
                      <tr key={f.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-5 py-3">
                          <code className="text-xs font-mono font-semibold text-foreground">{f.path}</code>
                        </td>
                        <td className="px-5 py-3 text-sm text-foreground">{f.displayName}</td>
                        <td className="px-5 py-3">
                          {fact && (
                            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">{fact.displayName}</span>
                          )}
                        </td>
                        <td className="px-5 py-3"><DataTypeBadge type={f.dataType} /></td>
                        <td className="px-5 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{f.description}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-0.5">
                            <Btn size="icon" variant="ghost" onClick={() => { setEditField(f); setFieldFormOpen(true); }} title="Edit">
                              <IC.Edit size={13} className="text-muted-foreground" />
                            </Btn>
                            <Btn size="icon" variant="ghost" onClick={() => setDeleteField(f)} className="hover:bg-destructive/10" title="Delete">
                              <IC.Trash size={13} className="text-destructive/70" />
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {allFilteredFields.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground italic">No fields match the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <FactFormModal
        open={factFormOpen} onClose={() => { setFactFormOpen(false); setEditFact(undefined); }}
        onSave={d => {
          if (editFact) {
            onUpdateFact({ ...editFact, ...d });
          } else {
            onCreateFact(d);
          }
        }}
        initial={editFact} existing={facts}
      />

      <FieldFormModal
        open={fieldFormOpen} onClose={() => { setFieldFormOpen(false); setEditField(undefined); }}
        onSave={d => {
          if (editField) {
            const fact = facts.find(f => f.id === d.factId)!;
            onUpdateField({ ...editField, ...d, path: `${fact.name}.${d.name}` });
          } else {
            onCreateField(d);
          }
        }}
        initial={editField} facts={facts} defaultFactId={tab === 'facts' ? selectedFactId || undefined : undefined}
        existingPaths={existingPaths}
      />

      <ConfirmDeleteModal
        open={!!deleteFact} onClose={() => setDeleteFact(null)} onConfirm={handleDeleteFact}
        title="Delete Fact"
        body={`Delete "${deleteFact?.displayName}"? This will also delete all ${factFields.filter(f => f.factId === deleteFact?.id).length} fields in this fact. This action cannot be undone.`}
      />

      <ConfirmDeleteModal
        open={!!deleteField} onClose={() => setDeleteField(null)}
        onConfirm={() => { if (deleteField) onDeleteField(deleteField.id); }}
        title="Delete Field"
        body={`Delete field "${deleteField?.path}"? Any rules referencing this path may break. This action cannot be undone.`}
      />
    </div>
  );
};
