import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  cn, uid, fmt, Btn, Inp, Sel, Modal, Field, IC, SearchBanner,
  Fact, FactField, DataType, Space,
} from './shared';

/* ── DATA TYPE CONFIG ────────────────────────────── */
const DATA_TYPE_OPTIONS: { value: DataType; label: string; color: string }[] = [
  { value: 'string',  label: 'String',  color: 'bg-blue-50 text-blue-700 border-blue-200' },
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
          {errors.displayName && <p className="text-xs text-red-500 mt-0.5">{errors.displayName}</p>}
        </Field>
        <Field label="Identifier" required hint="Auto-generated camelCase key used as the dot-path prefix in rule conditions.">
          <Inp value={name} disabled className="opacity-50 cursor-not-allowed" placeholder="e.g. policyInfo" />
          {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="Brief description of this fact namespace…"
            className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white resize-none focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 placeholder:text-gray-400 w-full" />
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
            <Sel value={factId} onChange={e => { setFactId(e.target.value); setErrors(x => ({ ...x, factId: '' })); }}
              options={[{ value: '', label: 'Select fact…' }, ...facts.map(f => ({ value: f.id, label: f.displayName + ' (' + f.name + ')' }))]}
              disabled={!!initial} className={!!initial ? 'opacity-50' : ''} />
            {errors.factId && <p className="text-xs text-red-500 mt-0.5">{errors.factId}</p>}
          </Field>
          <Field label="Data Type" required>
            <Sel value={dataType} onChange={e => setDataType(e.target.value as DataType)}
              options={DATA_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
          </Field>
        </div>
        <Field label="Field Name" required>
          <Inp value={displayName} onChange={e => {
            setDisplayName(e.target.value);
            if (!initial) setName(toIdentifier(e.target.value));
            setErrors(x => ({ ...x, displayName: '' }));
          }} placeholder="e.g. Vehicle Type" />
          {errors.displayName && <p className="text-xs text-red-500 mt-0.5">{errors.displayName}</p>}
        </Field>
        <Field label="Identifier" required hint="Auto-generated camelCase key used in rule paths.">
          <Inp value={name} disabled className="opacity-50 cursor-not-allowed" placeholder="e.g. vehicleType" />
          {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
        </Field>
        {selectedFact && name && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-gray-400">Rule path preview:</span>
            <code className="text-xs font-mono font-semibold text-blue-700">{previewPath}</code>
          </div>
        )}
        <Field label="Description">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            placeholder="What this field represents…"
            className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white resize-none focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 placeholder:text-gray-400 w-full" />
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
      <p className="text-sm text-gray-600">{body}</p>
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
}

export const FieldsPage: React.FC<FieldsPageProps> = ({
  facts, factFields, spaces,
  onCreateFact, onUpdateFact, onDeleteFact,
  onCreateField, onUpdateField, onDeleteField,
  initialTab = 'facts',
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
    <span className="ml-1 inline-flex flex-col" style={{ lineHeight: 0 }}>
      <IC.ChevU size={8} className={sortKey === col && sortDir === 'asc' ? 'text-blue-600' : 'text-gray-300'} />
      <IC.ChevD size={8} className={sortKey === col && sortDir === 'desc' ? 'text-blue-600' : 'text-gray-300'} />
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
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Fields &amp; Facts</h1>
            <p className="text-sm text-gray-500">{facts.length} facts · {factFields.length} fields · global across all spaces</p>
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
                tab === t ? 'border-blue-500 text-blue-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t === 'facts' ? `Facts (${facts.length})` : `All Fields (${factFields.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── FACTS TAB ── */}
      {tab === 'facts' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Facts list (left) */}
          <div className="w-72 border-r border-gray-200 bg-white flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <IC.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <Inp value={factSearch} onChange={e => setFactSearch(e.target.value)} placeholder="Search facts…" className="pl-8 w-full" />
              </div>
            </div>
            {factSearch.trim() && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 border-b border-blue-100 text-xs shrink-0">
                <span className="text-gray-600">Results for <span className="font-semibold text-gray-900">"{factSearch}"</span></span>
                <span className="text-gray-500 font-medium">{facts.filter(f => f.displayName.toLowerCase().includes(factSearch.toLowerCase()) || f.name.toLowerCase().includes(factSearch.toLowerCase())).length}</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {facts.filter(f => !factSearch || f.displayName.toLowerCase().includes(factSearch.toLowerCase()) || f.name.toLowerCase().includes(factSearch.toLowerCase())).map(f => {
                const fieldCount = factFields.filter(ff => ff.factId === f.id).length;
                return (
                  <button key={f.id} onClick={() => handleSelectFact(f.id)}
                    className={cn('w-full text-left px-4 py-3 flex items-center gap-2 transition-colors border-l-2',
                      selectedFactId === f.id ? 'bg-blue-50 border-blue-500' : 'border-transparent hover:bg-gray-50')}>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', selectedFactId === f.id ? 'text-blue-700' : 'text-gray-800')}>{f.displayName}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5 font-normal">{f.description || f.name}</p>
                    </div>
                    <span className={cn('shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap',
                      selectedFactId === f.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')}>
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
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">{selectedFact.displayName}</h2>
                      <code className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{selectedFact.name}.*</code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Btn size="sm" variant="secondary" onClick={() => { setEditField(undefined); setFieldFormOpen(true); }}>
                        <IC.Plus size={13} />Add Field
                      </Btn>
                      <div className="relative" ref={moreRef}>
                        <Btn size="icon" variant="ghost" onClick={() => setMoreOpen(o => !o)} title="More">
                          <IC.MoreVert size={14} className="text-gray-500" />
                        </Btn>
                        {moreOpen && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                            <button onClick={() => { setEditFact(selectedFact); setFactFormOpen(true); setMoreOpen(false); }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                              <IC.Edit size={13} className="text-gray-400" />Edit Fact
                            </button>
                            <button onClick={() => { setDeleteFact(selectedFact); setMoreOpen(false); }}
                              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                              <IC.Trash size={13} className="text-red-400" />Delete Fact
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedFact.description && <p className="text-sm text-gray-500 mb-4">{selectedFact.description}</p>}
                  {/* Meta info row */}
                  <div className="grid grid-cols-3 gap-x-6 pt-3">
                    <div>
                      <span className="text-xs text-gray-400">Fields</span>
                      <p className="text-sm text-gray-700 font-medium mt-0.5">{fieldsForFact.length}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Created By</span>
                      <p className="text-sm text-gray-700 font-medium mt-0.5 truncate">{selectedFact.createdBy}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Created On</span>
                      <p className="text-sm text-gray-700 font-medium mt-0.5">{fmt(selectedFact.createdAt)}</p>
                    </div>
                  </div>
                  {/* Spaces added to */}
                  {(() => {
                    const enabledIn = spaces.filter(sp => sp.enabledFactIds.includes(selectedFact.id));
                    return enabledIn.length > 0 ? (
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-2">Spaces added to:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {enabledIn.map(sp => (
                            <span key={sp.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">{sp.name}</span>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Fields search + filter */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <IC.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Inp value={factDetailSearch} onChange={e => setFactDetailSearch(e.target.value)} placeholder="Search fields…" className="pl-8 w-full" />
                  </div>
                  <Sel value={factDetailTypeFilter} onChange={e => setFactDetailTypeFilter(e.target.value as DataType | '')}
                    options={[{ value: '', label: 'All types' }, ...DATA_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))]} />
                </div>

                {/* Fields table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {factDetailSearch.trim() && (
                    <div className="flex items-center justify-between px-5 py-2 bg-blue-50 border-b border-blue-100 text-xs">
                      <span className="text-gray-600">Results for <span className="font-semibold text-gray-900">"{factDetailSearch}"</span></span>
                      <span className="text-gray-500 font-medium">
                        {fieldsForFact.filter(f =>
                          (f.path.toLowerCase().includes(factDetailSearch.toLowerCase()) || f.displayName.toLowerCase().includes(factDetailSearch.toLowerCase())) &&
                          (!factDetailTypeFilter || f.dataType === factDetailTypeFilter)
                        ).length} fields
                      </span>
                    </div>
                  )}
                  {fieldsForFact.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-gray-400">No fields defined yet.</p>
                      <Btn size="sm" variant="secondary" className="mt-3" onClick={() => { setEditField(undefined); setFieldFormOpen(true); }}>
                        <IC.Plus size={13} />Add first field
                      </Btn>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Path</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Field Name</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                          <th className="px-5 py-2.5 w-16" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {fieldsForFact
                          .filter(f =>
                            (!factDetailSearch || f.path.toLowerCase().includes(factDetailSearch.toLowerCase()) || f.displayName.toLowerCase().includes(factDetailSearch.toLowerCase())) &&
                            (!factDetailTypeFilter || f.dataType === factDetailTypeFilter)
                          )
                          .map(f => (
                          <tr key={f.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="px-5 py-3">
                              <code className="text-xs font-mono font-semibold text-gray-900">{f.path}</code>
                            </td>
                            <td className="px-5 py-3 text-sm text-gray-700">{f.displayName}</td>
                            <td className="px-5 py-3"><DataTypeBadge type={f.dataType} /></td>
                            <td className="px-5 py-3 text-xs text-gray-400 max-w-[220px] truncate">{f.description}</td>
                            <td className="px-5 py-3">
                              <div className="flex justify-end gap-0.5">
                                <Btn size="icon" variant="ghost" onClick={() => { setEditField(f); setFieldFormOpen(true); }} title="Edit">
                                  <IC.Edit size={13} className="text-gray-500" />
                                </Btn>
                                <Btn size="icon" variant="ghost" onClick={() => setDeleteField(f)} className="hover:bg-red-50" title="Delete">
                                  <IC.Trash size={13} className="text-red-400" />
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
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p className="text-sm">Select a fact to view its fields</p>
            </div>
          )}
        </div>
      )}

      {/* ── FIELDS TAB ── */}
      {tab === 'fields' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Filters */}
          <div className="bg-white border-b border-gray-100 px-6 py-2.5 flex items-center gap-3 shrink-0">
            <div className="relative max-w-xs flex-1">
              <IC.Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Inp value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by path or name…" className="pl-8 w-full" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Sel value={factFilter} onChange={e => setFactFilter(e.target.value)}
                options={[{ value: '', label: 'All facts' }, ...facts.map(f => ({ value: f.id, label: f.displayName }))]} />
              <Sel value={typeFilter} onChange={e => setTypeFilter(e.target.value as DataType | '')}
                options={[{ value: '', label: 'All types' }, ...DATA_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label }))]} />
            </div>
          </div>

          <SearchBanner query={search} count={allFilteredFields.length} label="field" />
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mx-6 my-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {([['path','Path'],['displayName','Field Name'],['factId','Fact'],['dataType','Type']] as const).map(([col, label]) => (
                      <th key={col} onClick={() => toggleSort(col)}
                        className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700">
                        <span className="inline-flex items-center gap-0.5">{label}<SortIcon col={col} /></span>
                      </th>
                    ))}
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                    <th className="px-5 py-2.5 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allFilteredFields.map(f => {
                    const fact = facts.find(fc => fc.id === f.factId);
                    return (
                      <tr key={f.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <code className="text-xs font-mono font-semibold text-gray-900">{f.path}</code>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700">{f.displayName}</td>
                        <td className="px-5 py-3">
                          {fact && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{fact.displayName}</span>
                          )}
                        </td>
                        <td className="px-5 py-3"><DataTypeBadge type={f.dataType} /></td>
                        <td className="px-5 py-3 text-xs text-gray-400 max-w-[200px] truncate">{f.description}</td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-0.5">
                            <Btn size="icon" variant="ghost" onClick={() => { setEditField(f); setFieldFormOpen(true); }} title="Edit">
                              <IC.Edit size={13} className="text-gray-500" />
                            </Btn>
                            <Btn size="icon" variant="ghost" onClick={() => setDeleteField(f)} className="hover:bg-red-50" title="Delete">
                              <IC.Trash size={13} className="text-red-400" />
                            </Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {allFilteredFields.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400 italic">No fields match the current filters.</td>
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
