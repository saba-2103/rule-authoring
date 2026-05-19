import React, { useState } from 'react';
import {
  cn, uid, fmt, Btn, Inp, Sel, Modal, Tag, Field, IC, FactIcon,
  ROLES, Space, SpaceMember, Fact, FactField,
} from './shared';

/* ── SPACE PICKER MODAL ──────────────────────────── */
interface SpacePickerModalProps {
  open: boolean;
  spaces: Space[];
  currentSpaceId: string;
  onSelect: (space: Space) => void;
  onManage: () => void;
  onClose: () => void;
  factFields: FactField[];
}

export const SpacePickerModal: React.FC<SpacePickerModalProps> = ({ open, spaces, currentSpaceId, onSelect, onManage, onClose, factFields }) => (
  <Modal open={open} onClose={onClose} title="Switch Space" subtitle="Select a space to work in" width="max-w-sm">
    <div className="p-4 flex flex-col gap-2">
      {spaces.map(s => (
        <button key={s.id} onClick={() => onSelect(s)}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-start gap-3',
            s.id === currentSpaceId ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
          )}>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
            s.id === currentSpaceId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}>
            {s.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', s.id === currentSpaceId ? 'text-blue-700' : 'text-gray-900')}>{s.name}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{s.description}</p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-gray-300">{s.members.length} member{s.members.length !== 1 ? 's' : ''}</p>
              <div className="flex gap-1">
                <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-medium rounded-full border border-purple-100">
                  {s.enabledFactIds.length} facts
                </span>
                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-medium rounded-full border border-blue-100">
                  {factFields.filter(f => s.enabledFactIds.includes(f.factId)).length} fields
                </span>
              </div>
            </div>
          </div>
          {s.id === currentSpaceId && <IC.Check size={14} className="text-blue-600 shrink-0 mt-1" />}
        </button>
      ))}
      <div className="border-t border-gray-100 pt-2 mt-1">
        <button onClick={onManage} className="w-full px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
          <IC.Globe size={14} className="text-gray-400" /> Manage all spaces
        </button>
      </div>
    </div>
  </Modal>
);

/* ── CREATE / EDIT SPACE MODAL ───────────────────── */
interface SpaceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; identifier?: string }) => void;
  initial?: { name: string; description: string };
  title: string;
}

const SpaceFormModal: React.FC<SpaceFormModalProps> = ({ open, onClose, onSave, initial, title }) => {
  const [name, setName] = useState(initial?.name || '');
  const [identifier, setIdentifier] = useState('');
  const [desc, setDesc] = useState(initial?.description || '');
  const [err, setErr] = useState('');

  const computedIdentifier = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleSave = () => {
    if (!name.trim()) { setErr('Space name is required'); return; }
    onSave({ name: name.trim(), description: desc.trim(), identifier: identifier.trim() || computedIdentifier });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <div className="p-5 flex flex-col gap-4">
        <Field label="Space Name" required>
          <Inp value={name} onChange={e => { setName(e.target.value); setErr(''); }} placeholder="e.g. Motor Underwriting" />
          {err && <p className="text-xs text-red-500 mt-0.5">{err}</p>}
        </Field>
        <Field label="Unique Identifier" hint="Used in API references. Lowercase with hyphens.">
          <Inp value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={computedIdentifier || 'e.g. motor-underwriting'} />
        </Field>
        <Field label="Description" hint="Brief description of what this space contains.">
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            placeholder="e.g. Motor insurance underwriting and pricing rules"
            className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white resize-none focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 placeholder:text-gray-400" />
        </Field>
        <div className="flex gap-2 justify-end">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave}>{initial ? 'Save Changes' : 'Create Space'}</Btn>
        </div>
      </div>
    </Modal>
  );
};

/* ── ADD MEMBER MODAL ────────────────────────────── */
interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (member: SpaceMember) => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ open, onClose, onAdd }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('RULE_AUTHOR');
  const [err, setErr] = useState('');

  const handleAdd = () => {
    if (!email.trim()) { setErr('Email is required'); return; }
    onAdd({ userId: uid(), email: email.trim(), role, joinedAt: new Date().toISOString() });
    setEmail(''); setRole('RULE_AUTHOR');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Member" width="max-w-sm">
      <div className="p-5 flex flex-col gap-4">
        <Field label="Email" required>
          <Inp value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} placeholder="user@company.com" />
          {err && <p className="text-xs text-red-500 mt-0.5">{err}</p>}
        </Field>
        <Field label="Role">
          <Sel value={role} onChange={e => setRole(e.target.value)}
            options={ROLES.map(r => ({ value: r, label: r }))} />
        </Field>
        <div className="flex gap-2 justify-end">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleAdd}>Add Member</Btn>
        </div>
      </div>
    </Modal>
  );
};

/* ── SPACE DETAIL VIEW ───────────────────────────── */
interface SpaceDetailProps {
  space: Space;
  onBack: () => void;
  onUpdate: (space: Space) => void;
  onDelete: (space: Space) => void;
  onEnter: (space: Space) => void;
  facts: Fact[];
  factFields: FactField[];
}

const SpaceDetail: React.FC<SpaceDetailProps> = ({ space, onBack, onUpdate, onDelete, onEnter, facts, factFields }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [tab, setTab] = useState<'members' | 'facts'>('members');

  const handleEdit = (data: { name: string; description: string }) => {
    onUpdate({ ...space, ...data });
  };

  const handleAddMember = (member: SpaceMember) => {
    onUpdate({ ...space, members: [...space.members, member] });
  };

  const handleRemoveMember = (userId: string) => {
    onUpdate({ ...space, members: space.members.filter(m => m.userId !== userId) });
  };

  const handleUpdateRole = (userId: string, role: string) => {
    onUpdate({ ...space, members: space.members.map(m => m.userId === userId ? { ...m, role } : m) });
  };

  const roleBadgeColors: Record<string, string> = {
    ADMIN: 'bg-red-50 text-red-700',
    RULE_AUTHOR: 'bg-blue-50 text-blue-700',
    RULE_APPROVER: 'bg-indigo-50 text-indigo-700',
    RULE_EXECUTOR: 'bg-green-50 text-green-700',
    VIEWER: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <IC.Back size={14} /> Spaces
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {space.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{space.name}</h1>
              <p className="text-sm text-gray-500">{space.description}</p>
              <p className="text-xs text-gray-400 mt-0.5">Created {fmt(space.createdAt)} · ID: <span className="font-mono">{space.id}</span></p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Btn variant="outline" size="sm" onClick={() => setEditOpen(true)}><IC.Edit size={13} />Edit</Btn>
            <Btn size="sm" onClick={() => onEnter(space)}><IC.Flow size={13} />Open Space</Btn>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6 flex gap-0">
        {(['members', 'facts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2.5 text-sm capitalize transition-colors border-b-2',
              tab === t ? 'border-blue-500 text-blue-700 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {t === 'members' ? `Members (${space.members.length})` : `Facts & Fields (${space.enabledFactIds.length} enabled)`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="max-w-3xl flex flex-col gap-6">
          {/* Members tab */}
          {tab === 'members' && <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">Members</p>
                <p className="text-xs text-gray-400 mt-0.5">{space.members.length} member{space.members.length !== 1 ? 's' : ''}</p>
              </div>
              <Btn size="sm" variant="outline" onClick={() => setAddMemberOpen(true)}><IC.Plus size={13} />Add Member</Btn>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Member</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {space.members.map(m => (
                  <tr key={m.userId} className="hover:bg-gray-50/70 group transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                          {m.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.email}</p>
                          <p className="text-xs text-gray-400 font-mono">{m.userId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select value={m.role} onChange={e => handleUpdateRole(m.userId, e.target.value)}
                        className={cn('text-xs font-medium px-2 py-1 rounded border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer', roleBadgeColors[m.role] || 'bg-gray-100 text-gray-600')}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">{fmt(m.joinedAt)}</td>
                    <td className="px-5 py-3">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                        <Btn size="icon" variant="ghost" onClick={() => handleRemoveMember(m.userId)} className="hover:bg-red-50 hover:text-red-500" title="Remove member">
                          <IC.Trash size={13} />
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}

          {/* Facts & Fields tab */}
          {tab === 'facts' && (
            <div className="flex flex-col gap-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-blue-700">
                <IC.Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
                Enable facts to make their fields available in this space’s decisions. Disabled facts are hidden from rule builders in this space.
              </div>
              {facts.map(fact => {
                const enabled = space.enabledFactIds.includes(fact.id);
                const fieldCount = factFields.filter(f => f.factId === fact.id).length;
                const toggle = () => {
                  const next = enabled
                    ? space.enabledFactIds.filter(id => id !== fact.id)
                    : [...space.enabledFactIds, fact.id];
                  onUpdate({ ...space, enabledFactIds: next });
                };
                return (
                  <div key={fact.id}
                    className={cn('bg-white rounded-xl border p-4 flex items-start gap-4 transition-colors',
                      enabled ? 'border-blue-200 shadow-sm' : 'border-gray-200 opacity-60 hover:opacity-80')}>
                    <FactIcon name={fact.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">{fact.displayName}</p>
                        <code className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{fact.name}.*</code>
                        {enabled && <span className="text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded">ENABLED</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{fact.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{fieldCount} field{fieldCount !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={toggle}
                      className={cn('shrink-0 mt-0.5 w-10 h-5.5 rounded-full transition-colors relative flex items-center',
                        enabled ? 'bg-blue-600' : 'bg-gray-200')} style={{ width: 40, height: 22 }}>
                      <span className={cn('absolute w-4 h-4 rounded-full bg-white shadow transition-transform',
                        enabled ? 'translate-x-5' : 'translate-x-1')} style={{ transitionDuration: '150ms' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* API Reference */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-gray-600 mb-3">API Reference</p>
            <div className="space-y-1.5">
              {[
                ['GET', `/api/v1/spaces/${space.id}`],
                ['PUT', `/api/v1/spaces/${space.id}`],
                ['GET', `/api/v1/spaces/${space.id}/members`],
                ['POST', `/api/v1/spaces/${space.id}/members`],
                ['GET', `/api/v1/spaces/${space.id}/analytics`],
                ['GET', `/api/v1/spaces/${space.id}/audit-trail`],
              ].map(([method, path]) => (
                <p key={path} className="font-mono text-xs text-gray-500">
                  <span className={cn('font-bold mr-2', method === 'GET' ? 'text-green-600' : method === 'POST' ? 'text-blue-600' : 'text-amber-600')}>{method}</span>
                  {path}
                </p>
              ))}
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-white rounded-xl border border-red-100 p-5">
            <p className="text-sm font-semibold text-red-700 mb-1">Danger Zone</p>
            <p className="text-xs text-gray-500 mb-3">Soft-deleting a space makes all rules, tables, and flows inaccessible. Data is retained for 7-year audit compliance.</p>
            <Btn variant="destructive" size="sm" onClick={() => onDelete(space)}>
              <IC.Trash size={13} /> Delete Space
            </Btn>
          </div>
        </div>
      </div>

      <SpaceFormModal open={editOpen} onClose={() => setEditOpen(false)}
        onSave={handleEdit} initial={{ name: space.name, description: space.description }} title="Edit Space" />
      <AddMemberModal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} onAdd={handleAddMember} />
    </div>
  );
};

/* ── SPACES PAGE ─────────────────────────────────── */
interface SpacesPageProps {
  spaces: Space[];
  currentSpaceId: string;
  onSelectSpace: (space: Space) => void;
  onOpenSpace: (space: Space) => void;
  onCreate: (space: Space) => void;
  onUpdate: (space: Space) => void;
  onDelete: (space: Space) => void;
  facts: Fact[];
  factFields: FactField[];
}

export const SpacesPage: React.FC<SpacesPageProps> = (props) => {
  const { spaces, currentSpaceId, onSelectSpace, onOpenSpace, onCreate, onUpdate, onDelete } = props;
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);

  const handleCreate = (data: { name: string; description: string; identifier?: string }) => {
    const newSpace: Space = {
      id: data.identifier || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: data.name, description: data.description,
      createdAt: new Date().toISOString(), members: [], enabledFactIds: [],
    };
    onCreate(newSpace);
    setSelectedSpace(newSpace);
  };

  const handleDelete = (space: Space) => {
    onDelete(space);
    setSelectedSpace(null);
  };

  if (selectedSpace) {
    const current = spaces.find(s => s.id === selectedSpace.id) || selectedSpace;
    return (
      <SpaceDetail
        space={current}
        onBack={() => setSelectedSpace(null)}
        onUpdate={s => { onUpdate(s); setSelectedSpace(s); }}
        onDelete={handleDelete}
        onEnter={s => { onOpenSpace(s); setSelectedSpace(null); }}
        facts={props.facts}
        factFields={props.factFields}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Spaces</h1>
            <p className="text-sm text-gray-500">Isolated tenant partitions — each space has its own rules, tables, and flows</p>
          </div>
          <Btn onClick={() => setCreateOpen(true)}><IC.Plus size={14} />New Space</Btn>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map(s => (
              <div key={s.id}
                className={cn('bg-white rounded-xl border p-5 flex flex-col gap-3 hover:shadow-sm transition-all cursor-pointer group',
                  s.id === currentSpaceId ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-200')}
                onClick={() => setSelectedSpace(s)}>
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0',
                    s.id === currentSpaceId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600')}>
                    {s.name.charAt(0)}
                  </div>
                  {s.id === currentSpaceId ? (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded uppercase tracking-wide shrink-0">Current</span>
                  ) : (
                    <span onClick={e => e.stopPropagation()}>
                      <Btn size="sm" variant="outline" onClick={() => onSelectSpace(s)} className="text-xs">
                        <IC.Flow size={12} />Switch
                      </Btn>
                    </span>
                  )}
                </div>
                {/* Name + description */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400 font-mono truncate mt-0.5">{s.id}</p>
                  {s.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{s.description}</p>}
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[11px] font-medium rounded-full border border-purple-100">
                      {s.enabledFactIds.length} facts
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-full border border-blue-100">
                      {props.factFields.filter(f => s.enabledFactIds.includes(f.factId)).length} fields
                    </span>
                  </div>
                </div>
                {/* Footer stats + actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <IC.Users size={11} />{s.members.length} member{s.members.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-gray-400">{fmt(s.createdAt)}</span>
                  </div>
                  <IC.ChevR size={13} className="text-gray-400 group-hover:text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SpaceFormModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} title="Create Space" />
    </div>
  );
};
