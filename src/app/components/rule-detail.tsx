import React, { useState, useEffect, useRef } from 'react';
import {
  cn, fmt, activeVer, Btn, Inp, Sel, Modal, Field, Tag, StatusBadge, IC,
  STATUS_META, CATEGORIES, Rule, RuleVersion,
  deriveInputSchema, deriveOutputSchema,
} from './shared';
import { RuleLogicDisplay } from './block-builder';

/* ── EDIT METADATA MODAL ─────────────────────────── */
interface EditMetaModalProps {
  rule: Rule;
  open: boolean;
  onClose: () => void;
  onSave: (data: { tags: string[]; category: string }) => void;
}

export const EditMetaModal: React.FC<EditMetaModalProps> = ({ rule, open, onClose, onSave }) => {
  const [tags, setTags] = useState<string[]>(rule?.tags || []);
  const [category, setCategory] = useState(rule?.category || '');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (open) { setTags(rule.tags); setCategory(rule.category); }
  }, [open, rule]);

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      setTags(t => [...t, tagInput.trim()]);
      setTagInput('');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Rule"
      subtitle="Note: To change rule logic, create a new version.">
      <div className="p-5 flex flex-col gap-4">
        <Field label="Rule Name">
          <Inp value={rule.name} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" />
        </Field>
        <Field label="Category">
          <Sel value={category} onChange={e => setCategory(e.target.value)}
            options={[{ value: '', label: 'Select…' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
        </Field>
        <Field label="Tags" hint="Press Enter to add">
          <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-md bg-white min-h-[36px]">
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                {t}
                <button type="button" onClick={() => setTags(ts => ts.filter(x => x !== t))} className="hover:text-gray-900 ml-0.5">×</button>
              </span>
            ))}
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
              placeholder="Add tag…" className="flex-1 text-sm outline-none min-w-[80px] placeholder:text-gray-400" />
          </div>
        </Field>
        <div className="flex gap-2 justify-end">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave({ tags, category })}>Save Changes</Btn>
        </div>
      </div>
    </Modal>
  );
};

/* ── DELETE RULE MODAL ───────────────────────────── */
interface DeleteRuleModalProps {
  rule: Rule | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteRuleModal: React.FC<DeleteRuleModalProps> = ({ rule, open, onClose, onConfirm }) => (
  <Modal open={open} onClose={onClose} title="Delete Rule" width="max-w-sm">
    <div className="p-5 flex flex-col gap-4">
      <div className="p-3.5 bg-red-50 rounded-lg border border-red-100 text-sm text-red-700">
        Soft-deleting <strong>{rule?.name}</strong> will make it inaccessible. All {rule?.versions?.length || 0} version(s) are retained for 7-year audit compliance.
        Use <code className="font-mono text-xs bg-red-100 px-1 rounded">?hard=true</code> for permanent deletion.
      </div>
      <div className="flex gap-2 justify-end">
        <Btn variant="outline" onClick={onClose}>Cancel</Btn>
        <Btn variant="destructive" onClick={onConfirm}>Delete Rule</Btn>
      </div>
    </div>
  </Modal>
);

/* ── DERIVED SCHEMA DISPLAY ──────────────────────── */
const DerivedSchemaCard: React.FC<{ ver: RuleVersion; type: 'input' | 'output' }> = ({ ver, type }) => {
  const schema = type === 'input' ? deriveInputSchema(ver.rule) : deriveOutputSchema(ver.rule);
  const dotColor = type === 'input' ? 'bg-amber-400' : 'bg-green-400';
  const fieldColor = type === 'input' ? 'text-blue-600 bg-blue-50' : 'text-green-600 bg-green-50';
  const title = type === 'input' ? 'Input Schema' : 'Output Schema';
  const hint = type === 'input' ? 'Derived from WHEN conditions' : 'Derived from THEN actions';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-2 h-2 rounded-full shrink-0', dotColor)} />
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-[10px] text-gray-400">{hint}</p>
        </div>
      </div>
      {schema.facts.length === 0 ? (
        <p className="text-xs text-gray-400 italic text-center py-3">No {type === 'input' ? 'conditions' : 'write actions'} defined</p>
      ) : (
        schema.facts.map((f, i) => (
          <div key={i} className="mb-3">
            <p className="text-xs font-semibold text-gray-700 mb-1.5">{f.factType}</p>
            {f.fields.map(fl => (
              <div key={fl.name} className="flex items-center gap-2 text-xs mb-1 pl-2">
                <span className={cn('font-mono px-1 py-0.5 rounded', fieldColor)}>{fl.name}</span>
                <span className="text-gray-300">:</span>
                <span className="text-gray-500">{fl.dataType}</span>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

/* ── EDIT VERSION MODAL ─────────────────────────── */
interface EditVersionModalProps {
  ver: RuleVersion | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: { description: string; changeSummary: string; effectiveFrom: string; effectiveUntil: string }) => void;
}

const EditVersionModal: React.FC<EditVersionModalProps> = ({ ver, open, onClose, onSave }) => {
  const [description, setDescription] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveUntil, setEffectiveUntil] = useState('');

  useEffect(() => {
    if (open && ver) {
      setDescription(ver.description || '');
      setChangeSummary(ver.changeSummary || '');
      setEffectiveFrom(ver.effectiveFrom ? ver.effectiveFrom.split('T')[0] : '');
      setEffectiveUntil(ver.effectiveUntil ? ver.effectiveUntil.split('T')[0] : '');
    }
  }, [open, ver]);

  if (!ver) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Edit Version ${ver.version}`}
      subtitle="Update version metadata. Rule logic can only be changed by creating a new version.">
      <div className="p-5 flex flex-col gap-4">
        <Field label="Version Name">
          <Inp value={changeSummary} onChange={e => setChangeSummary(e.target.value)} placeholder="Short version name e.g. Initial Release" />
        </Field>
        <Field label="Version Note">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            placeholder="Describe what this version does…"
            className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white resize-none focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 placeholder:text-gray-400 w-full" />
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
    </Modal>
  );
};

/* ── VERSION STATUS BADGE ───────────────────────────── */
const VERSION_BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT:             { label: 'Draft',           cls: 'bg-slate-100 text-slate-600 border-slate-200' },
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
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border', b.cls)}>
      {b.label}
    </span>
  );
};

const IS_PENDING = (s: string) => ['PEER_REVIEW', 'BUSINESS_REVIEW', 'COMPLIANCE_REVIEW'].includes(s);

/* ── STATUS DROPDOWN ─────────────────────────────── */
const VERSION_STATUSES = ['ACTIVE', 'INACTIVE', 'DEPRECATED'] as const;
type VersionStatus = typeof VERSION_STATUSES[number];

const StatusDropdown: React.FC<{ current: string; onChange: (s: VersionStatus) => void }> = ({ current, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const meta = STATUS_META[current] || STATUS_META.DRAFT;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
          meta.bg, meta.text, 'border-transparent hover:opacity-80',
        )}>
        <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
        {meta.label}
        <IC.ChevD size={11} className="opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[160px] py-1">
          {VERSION_STATUSES.map(s => {
            const m = STATUS_META[s];
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                className={cn(
                  'w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition-colors',
                  current === s ? 'bg-gray-50 font-semibold' : 'hover:bg-gray-50',
                  m.text,
                )}>
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
const MoreMenu: React.FC<{
  ver: RuleVersion;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}> = ({ ver, onEdit, onDuplicate, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { label: 'Edit version', icon: <IC.Edit size={13} />, action: onEdit },
    { label: 'Duplicate', icon: <IC.Copy size={13} />, action: onDuplicate },
    { label: 'Delete', icon: <IC.Trash size={13} />, action: onDelete, danger: true },
  ];

  return (
    <div className="relative" ref={ref}>
      <Btn size="icon" variant="ghost" onClick={() => setOpen(o => !o)} title="More options">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="19" r="1" fill="currentColor" />
        </svg>
      </Btn>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[160px] py-1">
          {items.map(item => (
            <button key={item.label} onClick={() => { item.action(); setOpen(false); }}
              className={cn(
                'w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs transition-colors',
                item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50',
              )}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── CATEGORY BADGE ──────────────────────────────── */
const CATEGORY_COLORS: Record<string, string> = {
  Underwriting: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Claims:       'bg-rose-50 text-rose-700 border-rose-200',
  Pricing:      'bg-blue-50 text-blue-700 border-blue-200',
  Compliance:   'bg-violet-50 text-violet-700 border-violet-200',
  Operations:   'bg-teal-50 text-teal-700 border-teal-200',
};
const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const cls = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border', cls)}>
      {category}
    </span>
  );
};

/* ── ACTIVITY TIMELINE ───────────────────────────── */
interface ActivityEvent {
  label: string;
  sub: string;
  date: string;
  dot: string;
}

const STATUS_EVENT: Record<string, { label: string; dot: string }> = {
  ACTIVE:            { label: 'Version activated',          dot: 'bg-green-500' },
  INACTIVE:          { label: 'Version deactivated',        dot: 'bg-yellow-400' },
  DEPRECATED:        { label: 'Version deprecated',         dot: 'bg-orange-400' },
  PEER_REVIEW:       { label: 'Submitted for Peer Review',  dot: 'bg-blue-400' },
  BUSINESS_REVIEW:   { label: 'Submitted for Business Review', dot: 'bg-indigo-400' },
  COMPLIANCE_REVIEW: { label: 'Submitted for Compliance Review', dot: 'bg-violet-400' },
  APPROVED:          { label: 'Version approved',           dot: 'bg-teal-400' },
  DRAFT:             { label: 'Draft version created',      dot: 'bg-slate-400' },
};

function buildActivity(rule: Rule): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  events.push({
    label: 'Rule created',
    sub: `by ${rule.createdBy}`,
    date: rule.createdAt,
    dot: 'bg-blue-600',
  });

  const sorted = [...rule.versions].sort((a, b) => a.version - b.version);
  for (const v of sorted) {
    events.push({
      label: `Version ${v.version} created`,
      sub: v.changeSummary || 'No summary',
      date: v.effectiveFrom || rule.createdAt,
      dot: 'bg-gray-400',
    });
    if (v.activatedAt) {
      events.push({
        label: `Version ${v.version} activated`,
        sub: v.activatedBy ? `by ${v.activatedBy}` : '',
        date: v.activatedAt,
        dot: 'bg-green-500',
      });
    } else if (v.status !== 'DRAFT') {
      const meta = STATUS_EVENT[v.status];
      if (meta) {
        events.push({
          label: `Version ${v.version} — ${meta.label}`,
          sub: '',
          date: v.effectiveFrom || rule.createdAt,
          dot: meta.dot,
        });
      }
    }
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}

/* ── RIGHT PANEL (Schema + Activity tabs) ────────── */
const RightPanel: React.FC<{ rule: Rule; ver: RuleVersion | null }> = ({ rule, ver }) => {
  const [tab, setTab] = useState<'schema' | 'activity'>('schema');
  const activity = buildActivity(rule);
  const inputSchema  = ver ? deriveInputSchema(ver.rule)  : null;
  const outputSchema = ver ? deriveOutputSchema(ver.rule) : null;

  return (
    <div className="w-64 border-l border-gray-200 bg-gray-50 shrink-0 flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-white shrink-0">
        {(['schema', 'activity'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2.5 text-xs font-semibold tracking-wide transition-colors capitalize',
              tab === t
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-400 hover:text-gray-600 border-b-2 border-transparent',
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* Schema tab */}
      {tab === 'schema' && (
        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
          {!ver ? (
            <p className="text-xs text-gray-400 italic text-center mt-6">Select a version to view schema</p>
          ) : (
            <>
              {/* Input Schema */}
              <div className="mb-5">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Input Schema</p>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">Derived from WHEN conditions</p>
                {inputSchema!.facts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center">
                    <p className="text-[10px] text-gray-400">No conditions defined</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {inputSchema!.facts.map(fact => (
                      <div key={fact.factType} className="bg-white rounded-lg border border-gray-200 p-2.5">
                        <p className="text-[10px] font-bold text-gray-700 mb-1.5">{fact.factType}</p>
                        {fact.fields.map(field => (
                          <div key={field.name} className="flex items-center gap-1.5 mb-1">
                            <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{field.name}</span>
                            <span className="text-[10px] text-gray-400">{field.dataType}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 mb-5" />

              {/* Output Schema */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                  <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Output Schema</p>
                </div>
                <p className="text-[10px] text-gray-400 mb-2">Derived from THEN actions</p>
                {outputSchema!.facts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center">
                    <p className="text-[10px] text-gray-400">No write actions defined</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {outputSchema!.facts.map(fact => (
                      <div key={fact.factType} className="bg-white rounded-lg border border-gray-200 p-2.5">
                        <p className="text-[10px] font-bold text-gray-700 mb-1.5">{fact.factType}</p>
                        {fact.fields.map(field => (
                          <div key={field.name} className="flex items-center gap-1.5 mb-1">
                            <span className="font-mono text-[10px] text-green-600 bg-green-50 px-1 py-0.5 rounded">{field.name}</span>
                            <span className="text-[10px] text-gray-400">{field.dataType}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="mt-5 pt-4 border-t border-gray-200">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Legend</p>
                <div className="space-y-1.5 text-[10px] text-gray-400">
                  <p><span className="text-amber-500 font-medium">Input</span> — fields read in WHEN conditions</p>
                  <p><span className="text-green-500 font-medium">Output</span> — fields written by actions</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Activity tab */}
      {tab === 'activity' && (
        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
          <div className="relative">
            {/* vertical line */}
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

/* ── RULE DETAIL PAGE ────────────────────────────── */
interface RuleDetailPageProps {
  rule: Rule;
  onBack: () => void;
  onUpdate: (rule: Rule) => void;
  onNewVersion: (rule: Rule) => void;
  onEditMeta: () => void;
  initialVersion?: number;
}

export const RuleDetailPage: React.FC<RuleDetailPageProps> = ({ rule, onBack, onUpdate, onNewVersion, onEditMeta, initialVersion }) => {
  const [selVer, setSelVer] = useState<RuleVersion | null>(() => {
    if (initialVersion != null) return rule.versions.find(v => v.version === initialVersion) ?? null;
    return activeVer(rule) || rule.versions[0] || null;
  });
  const [confirmDel, setConfirmDel] = useState<RuleVersion | null>(null);
  const [editVerOpen, setEditVerOpen] = useState(false);

  const handleStatusChange = (ver: RuleVersion, status: VersionStatus) => {
    const patch: Partial<RuleVersion> = { status };
    if (status === 'ACTIVE') {
      patch.activatedAt = new Date().toISOString();
      patch.activatedBy = 'alice@insure.com';
    }
    const updated = { ...rule, versions: rule.versions.map(v => v.version === ver.version ? { ...v, ...patch } : v) };
    onUpdate(updated);
    setSelVer(prev => prev?.version === ver.version ? { ...prev, ...patch } : prev);
  };

  const handleDeleteVer = (ver: RuleVersion) => {
    const remaining = rule.versions.filter(v => v.version !== ver.version);
    onUpdate({ ...rule, versions: remaining });
    setSelVer(remaining[0] || null);
    setConfirmDel(null);
  };

  const handleDuplicate = (ver: RuleVersion) => {
    onNewVersion({ ...rule });
  };

  const handleSaveVersion = (ver: RuleVersion, data: { description: string; changeSummary: string; effectiveFrom: string; effectiveUntil: string }) => {
    const patch = {
      description: data.description,
      changeSummary: data.changeSummary,
      effectiveFrom: data.effectiveFrom ? data.effectiveFrom + 'T00:00:00' : ver.effectiveFrom,
      effectiveUntil: data.effectiveUntil ? data.effectiveUntil + 'T00:00:00' : null,
    };
    const updated = { ...rule, versions: rule.versions.map(v => v.version === ver.version ? { ...v, ...patch } : v) };
    onUpdate(updated);
    setSelVer(prev => prev?.version === ver.version ? { ...prev, ...patch } : prev);
    setEditVerOpen(false);
  };

  const ver = selVer;

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm mb-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700 transition-colors">Decisions</button>
          <IC.ChevR size={13} className="text-gray-300" />
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700 transition-colors">Rules</button>
          <IC.ChevR size={13} className="text-gray-300" />
          <span className="text-gray-800 font-medium truncate max-w-xs">{rule.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-gray-900">{rule.name}</h1>
              {rule.category && <CategoryBadge category={rule.category} />}
            </div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {rule.tags.map(t => (
                <span key={t} className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Btn variant="outline" size="sm" onClick={onEditMeta}><IC.Edit size={13} />Edit Rule</Btn>
            <Btn size="sm" onClick={() => onNewVersion(rule)}><IC.Plus size={13} />New Version</Btn>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Versions panel */}
        <div className="w-56 border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="flex border-b border-gray-200 bg-white shrink-0">
            <div className="flex-1 py-2.5 px-4 text-xs font-semibold tracking-wide text-blue-600 border-b-2 border-blue-600 bg-white">
              Versions ({rule.versions.length})
            </div>
          </div>
          <div className="overflow-y-auto flex-1 py-2" style={{ scrollbarWidth: 'thin' }}>
            {[...rule.versions].sort((a, b) => b.version - a.version).map(v => (
              <button key={v.version} onClick={() => setSelVer(v)}
                className={cn('w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-l-2',
                  selVer?.version === v.version ? 'bg-blue-50 border-blue-500' : 'border-transparent hover:bg-gray-50')}>
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                  selVer?.version === v.version ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}>
                  V{v.version}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <VersionBadge status={v.status} />
                  </div>
                  <p className="text-xs font-medium text-gray-700 mt-1 truncate">{v.changeSummary || `Version ${v.version}`}</p>
                  {v.effectiveFrom && <p className="text-[10px] text-gray-400 mt-0.5">From {fmt(v.effectiveFrom)}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Version detail */}
        {ver ? (
          <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
            <div className="max-w-3xl flex flex-col gap-5">
              {/* Version header */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-base font-semibold text-gray-900">Version {ver.version}</span>
                      {['ACTIVE', 'INACTIVE', 'DEPRECATED'].includes(ver.status)
                        ? <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">Approved</span>
                        : <VersionBadge status={ver.status} />}
                    </div>
                    <p className="text-sm font-medium text-gray-700">{ver.changeSummary || `Version ${ver.version}`}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ver.status === 'DRAFT' ? (
                      <Btn size="sm" variant="secondary" onClick={() => handleStatusChange(ver, 'ACTIVE')}>
                        Submit for Review
                      </Btn>
                    ) : IS_PENDING(ver.status) ? (
                      (() => {
                        const m = STATUS_META[ver.status];
                        return (
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold', m.bg, m.text)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', m.dot)} />
                            {m.label}
                          </span>
                        );
                      })()
                    ) : (
                      <StatusDropdown
                        current={ver.status}
                        onChange={s => handleStatusChange(ver, s)}
                      />
                    )}
                    <MoreMenu
                      ver={ver}
                      onEdit={() => setEditVerOpen(true)}
                      onDuplicate={() => handleDuplicate(ver)}
                      onDelete={() => setConfirmDel(ver)}
                    />
                  </div>
                </div>
                {/* Version Note — full width */}
                {ver.description && (
                  <div className="mb-4">
                    <span className="text-xs text-gray-400">Version Note</span>
                    <p className="text-sm text-gray-700 mt-0.5">{ver.description}</p>
                  </div>
                )}
                {/* Metadata grid */}
                <div className="flex flex-col gap-3 text-sm">
                  <div className="grid grid-cols-2 gap-x-6">
                    <div>
                      <span className="text-xs text-gray-400">Effective From</span>
                      <p className="text-gray-700 font-medium mt-0.5">{fmt(ver.effectiveFrom)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Effective Until</span>
                      <p className="text-gray-700 font-medium mt-0.5">{ver.effectiveUntil ? fmt(ver.effectiveUntil) : 'Open-ended'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6">
                    <div>
                      <span className="text-xs text-gray-400">Created By</span>
                      <p className="text-gray-700 font-medium mt-0.5">{rule.createdBy}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400">Created On</span>
                      <p className="text-gray-700 font-medium mt-0.5">{fmt(ver.effectiveFrom || rule.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rule logic */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Rule Logic</p>
                <RuleLogicDisplay content={ver.rule} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Select a version to view details</div>
        )}

        {/* Right panel: Schema + Activity tabs */}
        <RightPanel rule={rule} ver={ver} />
      </div>

      {/* Edit version modal */}
      <EditVersionModal
        ver={selVer}
        open={editVerOpen}
        onClose={() => setEditVerOpen(false)}
        onSave={data => selVer && handleSaveVersion(selVer, data)}
      />

      {/* Delete version confirm */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Delete Version" width="max-w-sm">
        <div className="p-5 flex flex-col gap-4">
          <div className="p-3.5 bg-red-50 rounded-lg border border-red-100 text-sm text-red-700">
            Version {confirmDel?.version} will be soft-deleted and retained for audit compliance. You can restore it later.
          </div>
          <div className="flex gap-2 justify-end">
            <Btn variant="outline" onClick={() => setConfirmDel(null)}>Cancel</Btn>
            <Btn variant="destructive" onClick={() => confirmDel && handleDeleteVer(confirmDel)}>Delete Version</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
};
