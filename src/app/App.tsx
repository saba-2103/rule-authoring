import React, { useState, useCallback } from 'react';
import {
  uid, PrimarySidebar, SecondarySidebar, Toast,
  SEED_SPACES, SEED_RULES, SEED_TABLES, SEED_FLOWS, SEED_FACTS, SEED_FACT_FIELDS,
  Space, Rule, Table, Flow, Fact, FactField,
} from './components/shared';
import { SpacesPage, SpacePickerModal } from './components/spaces';
import { DecisionsPage } from './components/decisions-list';
import { RuleDetailPage, EditMetaModal, DeleteRuleModal } from './components/rule-detail';
import { RuleCreatePage, RuleForm } from './components/rule-create';
import { TableDetailPage } from './components/table-detail';
import { FlowDetailPage } from './components/flow-detail';
import { FieldsPage } from './components/fields';

type Page =
  | 'decisions'
  | 'rule-detail'
  | 'rule-create'
  | 'rule-new-version'
  | 'table-detail'
  | 'flow-detail'
  | 'spaces'
  | 'fields';

export default function App() {
  /* ── STATE ─────────────────────────────────────── */
  const [primaryNav, setPrimaryNav] = useState('rules');
  const [secondaryNav, setSecondaryNav] = useState('decisions');
  const [spaces, setSpaces] = useState<Space[]>(SEED_SPACES);
  const [currentSpaceId, setCurrentSpaceId] = useState(SEED_SPACES[0].id);
  const [rules, setRules] = useState<Rule[]>(SEED_RULES);
  const [tables] = useState<Table[]>(SEED_TABLES);
  const [flows] = useState<Flow[]>(SEED_FLOWS);
  const [facts, setFacts] = useState<Fact[]>(SEED_FACTS);
  const [factFields, setFactFields] = useState<FactField[]>(SEED_FACT_FIELDS);
  const [page, setPage] = useState<Page>('decisions');
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [editMetaOpen, setEditMetaOpen] = useState(false);
  const [deleteRule, setDeleteRule] = useState<Rule | null>(null);
  const [spacePickerOpen, setSpacePickerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const currentSpace = spaces.find(s => s.id === currentSpaceId) || spaces[0];

  const showToast = useCallback((msg: string) => setToast(msg), []);

  /* ── NAVIGATION ────────────────────────────────── */
  const handleSecNav = (key: string) => {
    setSecondaryNav(key);
    if (key === 'decisions') { setPage('decisions'); setSelectedRule(null); }
    else if (key === 'spaces') setPage('spaces');
    else if (key === 'fields' || key === 'facts') setPage('fields');
  };

  const handleBack = () => {
    setPage('decisions');
    setSelectedRule(null);
    setSelectedTable(null);
    setSelectedFlow(null);
  };

  /* ── RULE HANDLERS ─────────────────────────────── */
  const handleViewRule = (rule: Rule, version?: number) => { setSelectedRule(rule); setSelectedVersion(version); setPage('rule-detail'); };
  const handleCreateRule = () => setPage('rule-create');
  const handleEditRule = (rule: Rule) => { setSelectedRule(rule); setSelectedVersion(undefined); setPage('rule-detail'); };
  const handleDeleteRuleRequest = (rule: Rule) => setDeleteRule(rule);
  const handleViewTable = (tbl: Table) => { setSelectedTable(tbl); setPage('table-detail'); };
  const handleViewFlow = (flow: Flow) => { setSelectedFlow(flow); setPage('flow-detail'); };

  const handleSaveRule = (form: RuleForm) => {
    const newRule: Rule = {
      id: 'r' + uid(),
      name: form.name,
      category: form.category,
      tags: form.tags,
      createdAt: new Date().toISOString(),
      createdBy: 'alice@insure.com',
      versions: [{
        id: uid(), version: 1, status: 'DRAFT',
        description: form.description,
        changeSummary: form.changeSummary,
        effectiveFrom: form.effectiveFrom,
        effectiveUntil: form.effectiveUntil || null,
        activatedAt: null, activatedBy: null,
        rule: form.rule,
      }],
    };
    setRules(rs => [...rs, newRule]);
    setPage('decisions');
    showToast(`Rule "${form.name}" created as Draft`);
  };

  const handleSaveNewVersion = (existingRule: Rule, form: RuleForm) => {
    const nextVer = Math.max(...existingRule.versions.map(v => v.version)) + 1;
    const newVer = {
      id: uid(), version: nextVer, status: 'DRAFT',
      description: form.description,
      changeSummary: form.changeSummary,
      effectiveFrom: form.effectiveFrom,
      effectiveUntil: form.effectiveUntil || null,
      activatedAt: null, activatedBy: null,
      rule: form.rule,
    };
    const updated = { ...existingRule, versions: [...existingRule.versions, newVer] };
    setRules(rs => rs.map(r => r.id === existingRule.id ? updated : r));
    setSelectedRule(updated);
    setPage('rule-detail');
    showToast(`Version ${nextVer} created as Draft`);
  };

  const handleUpdateRule = (updatedRule: Rule) => {
    setRules(rs => rs.map(r => r.id === updatedRule.id ? updatedRule : r));
    setSelectedRule(updatedRule);
  };

  const handleEditMeta = ({ tags, category }: { tags: string[]; category: string }) => {
    if (!selectedRule) return;
    const updated = { ...selectedRule, tags, category };
    setRules(rs => rs.map(r => r.id === selectedRule.id ? updated : r));
    setSelectedRule(updated);
    setEditMetaOpen(false);
    showToast('Metadata updated');
  };

  const handleConfirmDelete = () => {
    if (!deleteRule) return;
    setRules(rs => rs.filter(r => r.id !== deleteRule.id));
    if (selectedRule?.id === deleteRule.id) { setPage('decisions'); setSelectedRule(null); }
    showToast(`Rule "${deleteRule.name}" deleted`);
    setDeleteRule(null);
  };

  /* ── FACT / FIELD HANDLERS ──────────────────────── */
  const handleCreateFact = (data: { name: string; displayName: string; description: string }) => {
    const newFact: Fact = { id: 'f-' + uid(), ...data, createdAt: new Date().toISOString(), createdBy: 'alice@insure.com' };
    setFacts(fs => [...fs, newFact]);
    showToast(`Fact "${newFact.displayName}" created`);
  };
  const handleUpdateFact = (fact: Fact) => { setFacts(fs => fs.map(f => f.id === fact.id ? fact : f)); showToast('Fact updated'); };
  const handleDeleteFact = (factId: string) => {
    setFacts(fs => fs.filter(f => f.id !== factId));
    setFactFields(ffs => ffs.filter(f => f.factId !== factId));
    showToast('Fact deleted');
  };
  const handleCreateField = (data: Omit<FactField, 'id' | 'createdAt' | 'createdBy' | 'path'>) => {
    const fact = facts.find(f => f.id === data.factId)!;
    const newField: FactField = { id: 'ff-' + uid(), ...data, path: `${fact.name}.${data.name}`, createdAt: new Date().toISOString(), createdBy: 'alice@insure.com' };
    setFactFields(ffs => [...ffs, newField]);
    showToast(`Field "${newField.path}" created`);
  };
  const handleUpdateField = (field: FactField) => { setFactFields(ffs => ffs.map(f => f.id === field.id ? field : f)); showToast('Field updated'); };
  const handleDeleteField = (fieldId: string) => { setFactFields(ffs => ffs.filter(f => f.id !== fieldId)); showToast('Field deleted'); };

  /* space-scoped fact fields for the current space */
  const spaceFactFields = factFields.filter(f => currentSpace.enabledFactIds.includes(f.factId));

  /* ── SPACE HANDLERS ────────────────────────────── */
  const handleSelectSpace = (space: Space) => {
    setCurrentSpaceId(space.id);
    setSpacePickerOpen(false);
    setPage('decisions');
    setSecondaryNav('decisions');
    showToast(`Switched to ${space.name}`);
  };

  const handleCreateSpace = (space: Space) => {
    setSpaces(ss => [...ss, space]);
    showToast(`Space "${space.name}" created`);
  };

  const handleUpdateSpace = (space: Space) => {
    setSpaces(ss => ss.map(s => s.id === space.id ? space : s));
  };

  const handleDeleteSpace = (space: Space) => {
    setSpaces(ss => ss.filter(s => s.id !== space.id));
    if (currentSpaceId === space.id && spaces.length > 1) {
      const remaining = spaces.filter(s => s.id !== space.id);
      setCurrentSpaceId(remaining[0].id);
    }
    showToast(`Space "${space.name}" deleted`);
  };

  /* ── RENDER ────────────────────────────────────── */
  return (
      <div className="h-screen flex overflow-hidden bg-background" style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        input[type=checkbox] { accent-color: #2563EB; }
        input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
      `}</style>

      <PrimarySidebar active={primaryNav} onSelect={setPrimaryNav} />

      <SecondarySidebar
        active={secondaryNav}
        onSelect={handleSecNav}
        space={currentSpace}
        onSpaceClick={() => setSpacePickerOpen(true)}
      />

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Spaces Page */}
        {page === 'spaces' && (
          <SpacesPage
            spaces={spaces}
            currentSpaceId={currentSpaceId}
            onSelectSpace={s => { setCurrentSpaceId(s.id); showToast(`Switched to ${s.name}`); }}
            onOpenSpace={s => { handleSelectSpace(s); setSecondaryNav('decisions'); }}
            onCreate={handleCreateSpace}
            onUpdate={handleUpdateSpace}
            onDelete={handleDeleteSpace}
            facts={facts}
            factFields={factFields}
          />
        )}

        {/* Fields & Facts Page */}
        {page === 'fields' && (
          <FieldsPage
            facts={facts}
            factFields={factFields}
            spaces={spaces}
            onCreateFact={handleCreateFact}
            onUpdateFact={handleUpdateFact}
            onDeleteFact={handleDeleteFact}
            onCreateField={handleCreateField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            initialTab={secondaryNav === 'facts' ? 'facts' : 'facts'}
          />
        )}

        {/* Decisions List */}
        {page === 'decisions' && (
          <DecisionsPage
            rules={rules} tables={tables} flows={flows}
            onViewRule={handleViewRule}
            onCreateRule={handleCreateRule}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRuleRequest}
            onViewTable={handleViewTable}
            onViewFlow={handleViewFlow}
          />
        )}

        {/* Rule Detail */}
        {page === 'rule-detail' && selectedRule && (
          <RuleDetailPage
            rule={selectedRule}
            onBack={handleBack}
            onUpdate={handleUpdateRule}
            onNewVersion={r => { setSelectedRule(r); setPage('rule-new-version'); }}
            onEditMeta={() => setEditMetaOpen(true)}
            initialVersion={selectedVersion}
          />
        )}

        {/* Rule Create */}
        {page === 'rule-create' && (
          <RuleCreatePage onSave={handleSaveRule} onCancel={handleBack} factFields={spaceFactFields} />
        )}

        {/* Rule New Version */}
        {page === 'rule-new-version' && selectedRule && (
          <RuleCreatePage
            initialRule={selectedRule}
            onSave={form => handleSaveNewVersion(selectedRule, form)}
            onCancel={() => setPage('rule-detail')}
            factFields={spaceFactFields}
          />
        )}

        {/* Table Detail */}
        {page === 'table-detail' && selectedTable && (
          <TableDetailPage tbl={selectedTable} onBack={handleBack} />
        )}

        {/* Flow Detail */}
        {page === 'flow-detail' && selectedFlow && (
          <FlowDetailPage flow={selectedFlow} onBack={handleBack} />
        )}
      </main>

      {/* Modals */}
      <SpacePickerModal
        open={spacePickerOpen}
        spaces={spaces}
        currentSpaceId={currentSpaceId}
        onSelect={s => { setCurrentSpaceId(s.id); showToast(`Switched to ${s.name}`); }}
        onManage={() => { setSpacePickerOpen(false); setPage('spaces'); setSecondaryNav('spaces'); }}
        onClose={() => setSpacePickerOpen(false)}
        factFields={factFields}
      />

      {selectedRule && (
        <EditMetaModal
          rule={selectedRule}
          open={editMetaOpen}
          onClose={() => setEditMetaOpen(false)}
          onSave={handleEditMeta}
        />
      )}

      <DeleteRuleModal
        rule={deleteRule}
        open={!!deleteRule}
        onClose={() => setDeleteRule(null)}
        onConfirm={handleConfirmDelete}
      />

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
