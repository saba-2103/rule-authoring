import React, { useState } from 'react';
import {
  cn, uid, fmt, Btn, Inp, Modal, Tag, Field, IC,
  ROLES, Space, SpaceMember, Fact, FactField,
} from './shared';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from './ui/dropdown-menu';

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
        <button key={s.id} onClick={() => { onSelect(s); }}
          className={cn(
            'w-full text-left px-4 py-3 rounded-lg border transition-colors flex items-start gap-3',
            s.id === currentSpaceId ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-accent'
          )}>
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
            s.id === currentSpaceId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            {s.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium', s.id === currentSpaceId ? 'text-primary' : 'text-foreground')}>{s.name}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{s.description}</p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-xs text-muted-foreground/60">{s.members.length} member{s.members.length !== 1 ? 's' : ''}</p>
              <div className="flex gap-1">
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full border border-primary/20">
                  {s.enabledFactIds.length} facts
                </span>
                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded-full border border-primary/20">
                  {factFields.filter(f => s.enabledFactIds.includes(f.factId)).length} fields
                </span>
              </div>
            </div>
          </div>
          {s.id === currentSpaceId && <IC.Check size={14} className="text-primary shrink-0 mt-1" />}
        </button>
      ))}
      <div className="border-t border-gray-100 pt-2 mt-1">
        <button onClick={onManage} className="w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center justify-center gap-2">
          <IC.Globe size={14} className="text-muted-foreground" /> Manage all spaces
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
          {err && <p className="text-xs text-destructive mt-0.5">{err}</p>}
        </Field>
        <Field label="Unique Identifier" hint="Used in API references. Lowercase with hyphens.">
          <Inp value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder={computedIdentifier || 'e.g. motor-underwriting'} />
        </Field>
        <Field label="Description" hint="Brief description of what this space contains.">
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
            placeholder="e.g. Motor insurance underwriting and pricing rules"
            className="px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground resize-none focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 placeholder:text-muted-foreground" />
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
  editMember?: SpaceMember;
  onUpdateRole?: (userId: string, role: string) => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ open, onClose, onAdd, editMember, onUpdateRole }) => {
  const isEdit = !!editMember;
  const [email, setEmail] = useState(editMember?.email || '');
  const [role, setRole] = useState(editMember?.role || 'RULE_AUTHOR');
  const [err, setErr] = useState('');

  React.useEffect(() => {
    if (open) {
      setEmail(editMember?.email || '');
      setRole(editMember?.role || 'RULE_AUTHOR');
      setErr('');
    }
  }, [open, editMember]);

  const handleSave = () => {
    if (!isEdit && !email.trim()) { setErr('Email is required'); return; }
    if (isEdit) {
      onUpdateRole?.(editMember!.userId, role);
    } else {
      onAdd({ userId: uid(), email: email.trim(), role, joinedAt: new Date().toISOString() });
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Member' : 'Add Member'} width="max-w-sm">
      <div className="p-5 flex flex-col gap-4">
        <Field label="Email" required={!isEdit}>
          <Inp value={email}
            onChange={e => { if (!isEdit) { setEmail(e.target.value); setErr(''); } }}
            placeholder="user@company.com"
            disabled={isEdit}
            className={isEdit ? 'opacity-60 cursor-not-allowed' : ''} />
          {err && <p className="text-xs text-destructive mt-0.5">{err}</p>}
        </Field>
        <Field label="Role">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <div className="flex gap-2 justify-end">
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSave}>{isEdit ? 'Save Changes' : 'Add Member'}</Btn>
        </div>
      </div>
    </Modal>
  );
};

/* ── SPACE DETAIL VIEW ───────────────────────────── */
interface SpaceDetailProps {
  space: Space;
  isCurrentSpace: boolean;
  onBack: () => void;
  onUpdate: (space: Space) => void;
  onDelete: (space: Space) => void;
  onSwitchSpace: (space: Space) => void;
  facts: Fact[];
  factFields: FactField[];
}

const SpaceDetail: React.FC<SpaceDetailProps> = ({
  space, isCurrentSpace, onBack, onUpdate, onDelete, onSwitchSpace, facts, factFields,
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<SpaceMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<SpaceMember | null>(null);
  const [tab, setTab] = useState<'settings' | 'members' | 'facts'>('settings');
  const [expandedFacts, setExpandedFacts] = useState<Set<string>>(new Set());

  const toggleFactExpand = (id: string) => setExpandedFacts(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

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
    RULE_AUTHOR: 'bg-primary/5 text-primary',
    RULE_APPROVER: 'bg-indigo-50 text-indigo-700',
    RULE_EXECUTOR: 'bg-green-50 text-green-700',
    VIEWER: 'bg-muted text-muted-foreground',
  };

  const enabledFieldCount = factFields.filter(f => space.enabledFactIds.includes(f.factId)).length;

  const TABS = [
    { key: 'settings' as const, label: 'Settings' },
    { key: 'members' as const, label: `Members (${space.members.length})` },
    { key: 'facts' as const, label: `Facts & Fields (${space.enabledFactIds.length} enabled)` },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-background border-b border-border px-6 py-4 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm mb-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">Rules</button>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">Spaces</button>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <span className="text-foreground font-medium truncate max-w-xs">{space.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-foreground">{space.name}</h1>
              {isCurrentSpace && (
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded uppercase tracking-wide">Current</span>
              )}
            </div>
            {space.description && <p className="text-sm text-muted-foreground mt-0.5">{space.description}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <Btn variant="outline" size="sm" onClick={() => setEditOpen(true)}><IC.Edit size={13} />Edit</Btn>
            {!isCurrentSpace && (
              <Btn size="sm" onClick={() => onSwitchSpace(space)}><IC.Flow size={13} />Switch</Btn>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-background border-b border-border px-6 flex gap-0 shrink-0">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('px-4 py-2.5 text-sm transition-colors border-b-2',
              tab === t.key ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-5">

          {/* Settings tab */}
          {tab === 'settings' && (
            <>
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Space Info</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Space ID</span>
                    <p className="font-mono text-sm text-foreground font-medium mt-0.5 truncate">{space.id}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Created On</span>
                    <p className="text-foreground font-medium mt-0.5">{fmt(space.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Members</span>
                    <p className="text-foreground font-medium mt-0.5">{space.members.length} member{space.members.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Last Updated</span>
                    <p className="text-foreground font-medium mt-0.5">{fmt(space.createdAt)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Facts Enabled</span>
                    <p className="text-foreground font-medium mt-0.5">{space.enabledFactIds.length} of {facts.length}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Fields Available</span>
                    <p className="text-foreground font-medium mt-0.5">{enabledFieldCount} field{enabledFieldCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border border-destructive/20 p-5">
                <p className="text-sm font-semibold text-destructive mb-1">Danger Zone</p>
                <p className="text-xs text-muted-foreground mb-3">Soft-deleting a space makes all rules, tables, and flows inaccessible. Data is retained for 7-year audit compliance.</p>
                <Btn variant="destructive" size="sm" onClick={() => onDelete(space)}>
                  <IC.Trash size={13} /> Delete Space
                </Btn>
              </div>
            </>
          )}

          {/* Members tab */}
          {tab === 'members' && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div>
                  <p className="text-sm font-semibold text-foreground">Members</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{space.members.length} member{space.members.length !== 1 ? 's' : ''}</p>
                </div>
                <Btn size="sm" variant="outline" onClick={() => setAddMemberOpen(true)}><IC.Plus size={13} />Add Member</Btn>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Member</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Joined</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {space.members.map(m => (
                    <tr key={m.userId} className="hover:bg-accent/50 group transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {m.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{m.email}</p>
                            <p className="text-xs text-muted-foreground font-mono">{m.userId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded', roleBadgeColors[m.role] || 'bg-muted text-muted-foreground')}>
                          {m.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{fmt(m.joinedAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Btn size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                <IC.MoreVert size={14} />
                              </Btn>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingMember(m)}>
                                <IC.Edit size={13} className="mr-2" /> Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDeletingMember(m)} className="text-destructive focus:text-destructive">
                                <IC.Trash size={13} className="mr-2" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Facts & Fields tab */}
          {tab === 'facts' && (
            <div className="flex flex-col gap-3">
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-start gap-2.5 text-sm text-primary">
                <IC.Info size={14} className="shrink-0 mt-0.5 text-primary/70" />
                Enable facts to make their fields available in this space. Disabled facts are hidden from rule builders in this space.
              </div>
              {facts.map(fact => {
                const enabled = space.enabledFactIds.includes(fact.id);
                const fieldList = factFields.filter(f => f.factId === fact.id);
                const isExpanded = expandedFacts.has(fact.id);
                const toggle = () => {
                  const next = enabled
                    ? space.enabledFactIds.filter(id => id !== fact.id)
                    : [...space.enabledFactIds, fact.id];
                  onUpdate({ ...space, enabledFactIds: next });
                };
                return (
                  <div key={fact.id}
                    className={cn('bg-card rounded-xl border transition-colors overflow-hidden',
                      enabled ? 'border-primary/30 shadow-sm' : 'border-border')}>
                    <div
                      className={cn('flex items-center gap-3 p-4 cursor-pointer select-none', !enabled && 'opacity-60')}
                      onClick={() => toggleFactExpand(fact.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{fact.displayName}</p>
                          <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{fact.name}.*</code>
                          {enabled && (
                            <span className="text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded">ENABLED</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{fact.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{fieldList.length} field{fieldList.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span onClick={e => { e.stopPropagation(); toggle(); }}
                          className={cn('rounded-full transition-colors relative flex items-center cursor-pointer shrink-0',
                            enabled ? 'bg-primary' : 'bg-muted-foreground/30')}
                          style={{ width: 40, height: 22 }}>
                          <span className={cn('absolute w-4 h-4 rounded-full bg-white shadow transition-transform',
                            enabled ? 'translate-x-5' : 'translate-x-1')}
                            style={{ transitionDuration: '150ms' }} />
                        </span>
                        <IC.ChevD size={13} className={cn('text-muted-foreground transition-transform duration-150', isExpanded && 'rotate-180')} />
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border">
                        {fieldList.length === 0 ? (
                          <p className="px-4 py-3 text-xs text-muted-foreground italic">No fields defined for this fact.</p>
                        ) : (
                          <table className="w-full">
                            <thead>
                              <tr className="bg-muted">
                                <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Path</th>
                                <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Field Name</th>
                                <th className="text-left px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {fieldList.map(f => (
                                <tr key={f.id} className="hover:bg-accent/30">
                                  <td className="px-4 py-2"><code className="font-mono text-[11px] text-primary">{f.path}</code></td>
                                  <td className="px-4 py-2 text-xs text-foreground">{f.displayName}</td>
                                  <td className="px-4 py-2 text-xs text-muted-foreground">{f.dataType}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      <SpaceFormModal open={editOpen} onClose={() => setEditOpen(false)}
        onSave={handleEdit} initial={{ name: space.name, description: space.description }} title="Edit Space" />
      <AddMemberModal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} onAdd={handleAddMember} />
      <AddMemberModal
        open={!!editingMember}
        onClose={() => setEditingMember(null)}
        onAdd={handleAddMember}
        editMember={editingMember ?? undefined}
        onUpdateRole={(userId, role) => { handleUpdateRole(userId, role); setEditingMember(null); }}
      />
      {/* Confirm remove member */}
      <Modal open={!!deletingMember} onClose={() => setDeletingMember(null)} title="Remove Member" width="max-w-sm">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-semibold text-foreground">{deletingMember?.email}</span> from this space? They will lose access immediately.
          </p>
          <div className="flex gap-2 justify-end">
            <Btn variant="outline" onClick={() => setDeletingMember(null)}>Cancel</Btn>
            <Btn variant="destructive" onClick={() => { handleRemoveMember(deletingMember!.userId); setDeletingMember(null); }}>Remove</Btn>
          </div>
        </div>
      </Modal>
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
        isCurrentSpace={current.id === currentSpaceId}
        onBack={() => setSelectedSpace(null)}
        onUpdate={s => { onUpdate(s); setSelectedSpace(s); }}
        onDelete={handleDelete}
        onSwitchSpace={s => { onSelectSpace(s); }}
        facts={props.facts}
        factFields={props.factFields}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-background border-b border-border px-6 py-4">
        <div className="flex items-center gap-1.5 text-sm mb-3">
          <span className="text-muted-foreground">Rules</span>
          <IC.ChevR size={13} className="text-muted-foreground/40" />
          <span className="text-foreground font-medium">Spaces</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Spaces</h1>
            <p className="text-sm text-muted-foreground">Isolated tenant partitions — each space has its own rules, tables, and flows</p>
          </div>
          <Btn onClick={() => setCreateOpen(true)}><IC.Plus size={14} />New Space</Btn>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
        <div className="max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map(s => (
              <div key={s.id}
                className={cn('bg-card rounded-xl border p-5 flex flex-col gap-3 hover:shadow-sm transition-all cursor-pointer group',
                  s.id === currentSpaceId ? 'border-primary/30 ring-1 ring-primary/20' : 'border-border')}
                onClick={() => setSelectedSpace(s)}>
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0',
                    s.id === currentSpaceId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                    {s.name.charAt(0)}
                  </div>
                  {s.id === currentSpaceId ? (
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded uppercase tracking-wide shrink-0">Current</span>
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
                  <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{s.id}</p>
                  {s.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{s.description}</p>}
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium rounded-full border border-primary/20">
                      {s.enabledFactIds.length} facts
                    </span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium rounded-full border border-primary/20">
                      {props.factFields.filter(f => s.enabledFactIds.includes(f.factId)).length} fields
                    </span>
                  </div>
                </div>
                {/* Footer stats + actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <IC.Users size={11} />{s.members.length} member{s.members.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">{fmt(s.createdAt)}</span>
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
