import React, { useState, useEffect } from 'react';
import {
  cn, fmt, activeVer, Btn, Inp, Sel, Modal, Field, Tag, StatusBadge, IC,
  CATEGORIES, OPERATORS, Rule, RuleVersion,
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
    <Modal open={open} onClose={onClose} title="Edit Document Metadata"
      subtitle="Only tags and category can be changed. Rule name is immutable.">
      <div className="p-5 flex flex-col gap-4">
        <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
          <strong>Note:</strong> To change rule logic, create a new version. To update version-level metadata on a DRAFT, use the version PATCH endpoint.
        </div>
        <Field label="Category">
          <Sel value={category} onChange={e => setCategory(e.target.value)}
            options={[{ value: '', label: 'Select…' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
        </Field>
        <Field label="Tags" hint="Press Enter to add">
          <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-md bg-white min-h-[36px]">
            {tags.map(t => <Tag key={t} label={t} onRemove={() => setTags(ts => ts.filter(x => x !== t))} />)}
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

/* ── RULE DETAIL PAGE ────────────────────────────── */
interface RuleDetailPageProps {
  rule: Rule;
  onBack: () => void;
  onUpdate: (rule: Rule) => void;
  onNewVersion: (rule: Rule) => void;
  onEditMeta: () => void;
}

export const RuleDetailPage: React.FC<RuleDetailPageProps> = ({ rule, onBack, onUpdate, onNewVersion, onEditMeta }) => {
  const [selVer, setSelVer] = useState<RuleVersion | null>(() => activeVer(rule) || rule.versions[0] || null);
  const [confirmDel, setConfirmDel] = useState<RuleVersion | null>(null);

  const handleActivate = (ver: RuleVersion) => {
    const updated = { ...rule, versions: rule.versions.map(v => v.version === ver.version ? { ...v, status: 'ACTIVE', activatedAt: new Date().toISOString(), activatedBy: 'alice@insure.com' } : v) };
    onUpdate(updated);
    setSelVer({ ...ver, status: 'ACTIVE', activatedAt: new Date().toISOString(), activatedBy: 'alice@insure.com' });
  };

  const handleDeactivate = (ver: RuleVersion) => {
    const updated = { ...rule, versions: rule.versions.map(v => v.version === ver.version ? { ...v, status: 'INACTIVE' } : v) };
    onUpdate(updated);
    setSelVer({ ...ver, status: 'INACTIVE' });
  };

  const handleDeleteVer = (ver: RuleVersion) => {
    const remaining = rule.versions.filter(v => v.version !== ver.version);
    onUpdate({ ...rule, versions: remaining });
    setSelVer(remaining[0] || null);
    setConfirmDel(null);
  };

  const ver = selVer;

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <IC.Back size={14} />Decisions
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-gray-900">{rule.name}</h1>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded font-mono">immutable</span>
              <span className="text-xs text-gray-400">{rule.category}</span>
            </div>
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {rule.tags.map(t => <Tag key={t} label={t} />)}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Btn variant="outline" size="sm" onClick={onEditMeta}><IC.Edit size={13} />Edit Metadata</Btn>
            <Btn size="sm" onClick={() => onNewVersion(rule)}><IC.Plus size={13} />New Version</Btn>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Versions panel */}
        <div className="w-64 border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Versions ({rule.versions.length})</p>
          </div>
          <div className="overflow-y-auto flex-1 py-2" style={{ scrollbarWidth: 'thin' }}>
            {[...rule.versions].sort((a, b) => b.version - a.version).map(v => (
              <button key={v.version} onClick={() => setSelVer(v)}
                className={cn('w-full text-left px-4 py-3 flex items-start gap-3 transition-colors border-l-2',
                  selVer?.version === v.version ? 'bg-blue-50 border-blue-500' : 'border-transparent hover:bg-gray-50')}>
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                  selVer?.version === v.version ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}>
                  v{v.version}
                </div>
                <div className="flex-1 min-w-0">
                  <StatusBadge status={v.status} />
                  <p className="text-xs text-gray-400 mt-1 truncate">{v.changeSummary || 'No summary'}</p>
                  {v.effectiveFrom && <p className="text-xs text-gray-300 mt-0.5">From {fmt(v.effectiveFrom)}</p>}
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 p-4 text-xs text-gray-400 space-y-1">
            <p className="font-medium text-gray-500 mb-2">Document</p>
            <p>ID: <span className="font-mono">{rule.id}</span></p>
            <p>Created: {fmt(rule.createdAt)}</p>
            <p>By: {rule.createdBy}</p>
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
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-semibold text-gray-900">Version {ver.version}</span>
                      <StatusBadge status={ver.status} />
                    </div>
                    <p className="text-sm text-gray-600">{ver.description || <span className="text-gray-400 italic">No description</span>}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {ver.status === 'DRAFT' && (
                      <Btn size="sm" variant="secondary" onClick={() => handleActivate(ver)}>
                        <IC.Activate size={13} />Activate
                      </Btn>
                    )}
                    {ver.status === 'ACTIVE' && (
                      <Btn size="sm" variant="outline" onClick={() => handleDeactivate(ver)}>Deactivate</Btn>
                    )}
                    {['DRAFT', 'INACTIVE', 'DEPRECATED'].includes(ver.status) && (
                      <Btn size="sm" variant="ghost" onClick={() => setConfirmDel(ver)}
                        className="hover:bg-red-50 hover:text-red-500"><IC.Trash size={13} /></Btn>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {([
                    ['Change Summary', ver.changeSummary || '—'],
                    ['Effective From', fmt(ver.effectiveFrom)],
                    ['Effective Until', ver.effectiveUntil ? fmt(ver.effectiveUntil) : 'Open-ended'],
                    ver.activatedAt ? ['Activated', fmt(ver.activatedAt)] : null,
                    ver.activatedBy ? ['Activated By', ver.activatedBy] : null,
                  ] as ([string, string] | null)[]).filter(Boolean).map(([k, v2]) => (
                    <div key={k}>
                      <span className="text-gray-400">{k}</span>
                      <p className="text-gray-700 font-medium mt-0.5">{v2}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-derived schemas */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Auto-Derived Schemas</p>
                <div className="grid grid-cols-2 gap-4">
                  <DerivedSchemaCard ver={ver} type="input" />
                  <DerivedSchemaCard ver={ver} type="output" />
                </div>
              </div>

              {/* Rule logic */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Rule Logic</p>
                <RuleLogicDisplay content={ver.rule} />
              </div>

              {/* API hint */}
              <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 border border-gray-100">
                <p className="font-semibold text-gray-600 mb-1">API Reference</p>
                <p className="font-mono text-gray-400">GET /api/v1/spaces/motor-uw/rules/{rule.id}/versions/{ver.version}</p>
                {ver.status === 'DRAFT' && (
                  <p className="font-mono text-gray-400 mt-0.5">PATCH /api/v1/spaces/motor-uw/rules/{rule.id}/versions/{ver.version} <span className="text-amber-600">(metadata only)</span></p>
                )}
                <p className="font-mono text-gray-400 mt-0.5">POST /api/v1/spaces/motor-uw/rules/{rule.id}/versions/{ver.version}/activate</p>
                <p className="font-mono text-gray-400 mt-0.5">POST /api/v1/spaces/motor-uw/rules/{rule.id}/execute</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Select a version to view details</div>
        )}
      </div>

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
