import React, { useState, useRef, useEffect } from 'react';
import {
  cn, Btn, Inp, Sel, Field, Tag, IC, StatusBadge, Modal,
  CATEGORIES, mkBlockGroup,
  RuleContent, Rule, FactField,
} from './shared';
import { BlockBuilder, SchemaPanel, ConditionsPanel } from './block-builder';

/* ── EMPTY STATE ─────────────────────────────────── */
const emptyRuleContent = (): RuleContent => ({
  topGroups: [mkBlockGroup()],
});

/* ── RULE CREATE PAGE ────────────────────────────── */
interface RuleForm {
  name: string;
  description: string;
  category: string;
  tags: string[];
  versionName: string;
  versionNumber: number;
  effectiveFrom: string;
  effectiveUntil: string;
  changeSummary: string;
  rule: RuleContent;
}

interface RuleCreatePageProps {
  onSave: (form: RuleForm) => void;
  onCancel: () => void;
  initialRule?: Rule | null;
  factFields?: FactField[];
}

export const RuleCreatePage: React.FC<RuleCreatePageProps> = ({ onSave, onCancel, initialRule = null, factFields }) => {
  const isNewVersion = !!initialRule;
  const nextVersionNum = isNewVersion ? (initialRule!.versions.length + 1) : 1;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RuleForm>({
    name: initialRule?.name || '',
    description: '',
    category: initialRule?.category || '',
    tags: initialRule?.tags || [],
    versionName: '',
    versionNumber: nextVersionNum,
    effectiveFrom: '',
    effectiveUntil: '',
    changeSummary: isNewVersion ? '' : 'Initial version',
    rule: emptyRuleContent(),
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [exitModalOpen, setExitModalOpen] = useState(false);
  // 'custom' | version.id — tracks which previous version the logic was loaded from
  const [logicSource, setLogicSource] = useState<string>('custom');
  const [selectedVersion, setSelectedVersion] = useState<string>(
    isNewVersion ? (initialRule!.versions[initialRule!.versions.length - 1]?.id ?? 'custom') : 'custom'
  );
  const isCustom = logicSource === 'custom';
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const versionDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!versionDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(e.target as Node)) {
        setVersionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [versionDropdownOpen]);

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      setForm(f => ({ ...f, tags: [...f.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };
  const removeTag = (t: string) => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Rule name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => { if (validate()) onSave(form); };
  // Whether any meaningful content has been entered
  const isDirty = form.name.trim() !== '' || form.versionName.trim() !== '' || form.changeSummary.trim() !== (isNewVersion ? '' : 'Initial version');
  const handleBackNav = () => { if (isDirty) setExitModalOpen(true); else onCancel(); };

  const STEPS = isNewVersion
    ? [{ label: 'Version Info' }, { label: 'Rule Logic' }]
    : [{ label: 'Rule Info' }, { label: 'Version Info' }, { label: 'Rule Logic' }];

  // When creating a new version, step 0 → Version Info (was step 1), step 1 → Rule Logic (was step 2)
  const contentStep = isNewVersion ? step + 1 : step;

  return (
    <div className="flex flex-col h-full">
      {/* Exit confirmation modal */}
      <Modal open={exitModalOpen} onClose={() => setExitModalOpen(false)} title="Leave without saving?" subtitle="Your changes won't be submitted for review until you finish." width="max-w-sm">
        <div className="p-5 flex flex-col gap-3">
          <Btn onClick={() => setExitModalOpen(false)} className="w-full justify-center">Continue Editing</Btn>
          <Btn variant="outline" onClick={() => { if (validate()) { onSave(form); } setExitModalOpen(false); }} className="w-full justify-center">Save as Draft &amp; Close</Btn>
          <Btn variant="ghost-destructive" onClick={() => { setExitModalOpen(false); onCancel(); }} className="w-full justify-center">Discard &amp; Close</Btn>
        </div>
      </Modal>
      {/* breadcrumb */}
      <div className="bg-background border-b border-border px-6 py-3 flex items-center gap-1.5 shrink-0">
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Rules</button>
        <IC.ChevR size={13} className="text-muted-foreground/40" />
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Decisions</button>
        <IC.ChevR size={13} className="text-muted-foreground/40" />
        {isNewVersion && (
          <>
            <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{initialRule!.name}</button>
            <IC.ChevR size={13} className="text-muted-foreground/40" />
          </>
        )}
        <span className="text-sm font-medium text-foreground">
          {isNewVersion ? 'New Version' : 'New Rule'}
        </span>
      </div>

      {/* stepper + nav */}
      <div className="bg-background border-b border-border px-6 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Back icon */}
          <button type="button" onClick={handleBackNav}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0">
            <IC.Back size={16} />
          </button>
          <div className="w-px h-5 bg-border" />
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.label}>
                <button type="button" onClick={() => setStep(i)}
                  className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                    step === i ? 'bg-primary/10 text-primary font-medium' : i < step ? 'text-foreground hover:bg-accent' : 'text-muted-foreground hover:bg-accent')}>
                  <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    step === i ? 'bg-primary text-primary-foreground' : i < step ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground')}>
                    {i < step ? <IC.Check size={10} /> : i + 1}
                  </span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step > 0 && <Btn variant="secondary" onClick={() => setStep(s => s - 1)}>← Previous</Btn>}
          {step < STEPS.length - 1
            ? <Btn variant="secondary" onClick={() => setStep(s => s + 1)}>Next →</Btn>
            : <Btn onClick={handleSave}>Submit for Review</Btn>}
        </div>
      </div>

      {/* step content */}
      <div className={cn('flex-1 overflow-hidden', contentStep === 2 ? 'flex' : 'overflow-y-auto')}>
        {/* STEP 0: Document */}
        {contentStep === 0 && (
          <div className="p-6 overflow-y-auto w-full" style={{ scrollbarWidth: 'thin' }}>
            <div className="max-w-2xl mx-auto">
              <div className="bg-card rounded-xl border border-border p-6 flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-0.5">Rule Info</h2>
                  <p className="text-sm text-muted-foreground">The rule name is immutable after creation and serves as the unique key within this space.</p>
                </div>
                <Field label="Rule Name" required
                  hint={isNewVersion ? 'Name is locked — creating a new version of an existing rule' : 'Must be unique within this space. Cannot be changed after creation.'}>
                  <Inp value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors({}); }}
                    placeholder="e.g. Age Eligibility Check" disabled={isNewVersion}
                    className={cn(errors.name && 'border-destructive', isNewVersion && 'bg-muted')} />
                  {errors.name && <p className="text-xs text-destructive mt-0.5">{errors.name}</p>}
                </Field>
                <Field label="Description" hint="What does this rule do?">
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                    placeholder="e.g. Validates applicant age eligibility for insurance products"
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 placeholder:text-muted-foreground" />
                </Field>
                <Field label="Category">
                  <Sel value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    options={[{ value: '', label: 'Select category…' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
                </Field>
                <Field label="Tags" hint="Press Enter to add">
                  <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded-md bg-background min-h-[36px]">
                    {form.tags.map(t => <Tag key={t} label={t} onRemove={() => removeTag(t)} />)}
                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
                      placeholder={form.tags.length ? '' : 'Add tag…'}
                      className="flex-1 text-sm outline-none min-w-[80px] placeholder:text-muted-foreground focus:outline-none" />
                  </div>
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: Version Info */}
        {contentStep === 1 && (
          <div className="p-6 overflow-y-auto w-full" style={{ scrollbarWidth: 'thin' }}>
            <div className="max-w-2xl mx-auto">
              <div className="bg-card rounded-xl border border-border p-6 flex flex-col gap-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-0.5">Version Info</h2>
                  <p className="text-sm text-muted-foreground">Describes this specific version. Can be edited on DRAFT versions.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Version Name" hint="Short label for this version">
                    <Inp value={form.versionName} onChange={e => setForm(f => ({ ...f, versionName: e.target.value }))}
                      placeholder="e.g. Age gate v1" />
                  </Field>
                  <Field label="Version Number" hint="Auto-calculated">
                    <Inp value={`v${form.versionNumber}`} disabled className="bg-muted opacity-70 cursor-not-allowed" />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Effective From">
                    <Inp type="date" value={form.effectiveFrom} onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
                  </Field>
                  <Field label="Effective Until" hint="Leave blank for open-ended">
                    <Inp type="date" value={form.effectiveUntil} onChange={e => setForm(f => ({ ...f, effectiveUntil: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Change Summary" hint={isNewVersion ? 'Describe what changed in this version' : ''}>
                  <Inp value={form.changeSummary} onChange={e => setForm(f => ({ ...f, changeSummary: e.target.value }))}
                    placeholder={isNewVersion ? 'e.g. Raised minimum age from 18 to 21' : 'Initial version'} />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Rule Logic — 3-panel layout */}
        {contentStep === 2 && (
          <>
            {/* Left conditions panel */}
            <ConditionsPanel content={form.rule} />

            {/* Main rule builder */}
            <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
              <div className="max-w-3xl">
                <div className="mb-5">
                  <h2 className="text-base font-semibold text-foreground mb-0.5">Rule Logic</h2>
                  <p className="text-sm text-muted-foreground">
                    Build conditional IF / ELSE IF / ELSE blocks. Add nested blocks inside any THEN section.
                    The conditions trail on the left and schema panel on the right auto-update as you author.
                  </p>
                </div>

                {/* Load from previous version — only when creating a new version */}
                {isNewVersion && (
                  <div className="flex items-center gap-2 mb-5 p-3 bg-muted/50 border border-border rounded-lg">
                    <IC.Copy size={14} className="text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">Start from:</span>

                    {/* Rich version picker */}
                    <div ref={versionDropdownRef} className="relative flex-1 min-w-0">
                      {/* Trigger */}
                      <button
                        type="button"
                        onClick={() => setVersionDropdownOpen(o => !o)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs border border-border rounded-md bg-background text-left transition-colors hover:bg-accent cursor-pointer"
                      >
                        {isCustom ? (
                          <span className="flex-1 text-muted-foreground truncate">Custom (edited)</span>
                        ) : (() => {
                          const v = initialRule!.versions.find(ver => ver.id === selectedVersion);
                          return v ? (
                            <>
                              <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-semibold text-[10px] leading-none">
                                V{v.version}
                              </span>
                              <span className="flex-1 font-medium text-foreground truncate">
                                {v.description || v.changeSummary || `Version ${v.version}`}
                              </span>
                              <StatusBadge status={v.status} />
                            </>
                          ) : null;
                        })()}
                        <IC.ChevD size={12} className="text-muted-foreground shrink-0" />
                      </button>

                      {/* Dropdown panel */}
                      {versionDropdownOpen && (
                        <div
                          className="absolute top-full left-0 right-0 mt-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-y-auto max-h-56"
                          style={{ scrollbarWidth: 'thin' }}
                        >
                          {[...initialRule!.versions].sort((a, b) => b.version - a.version).map(v => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => { setSelectedVersion(v.id); setLogicSource(v.id); setVersionDropdownOpen(false); }}
                              className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-accent transition-colors',
                                selectedVersion === v.id && 'bg-primary/5'
                              )}
                            >
                              <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-semibold text-[10px] leading-none">
                                V{v.version}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {v.description || `Version ${v.version}`}
                                </p>
                                {v.changeSummary && (
                                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{v.changeSummary}</p>
                                )}
                              </div>
                              <StatusBadge status={v.status} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Btn
                      variant="outline"
                      onClick={() => {
                        const ver = initialRule!.versions.find(v => v.id === selectedVersion);
                        if (ver) {
                          setForm(f => ({ ...f, rule: JSON.parse(JSON.stringify(ver.rule)) }));
                          setLogicSource(selectedVersion);
                        }
                      }}
                      disabled={isCustom}
                      className="text-xs shrink-0"
                    >
                      Load
                    </Btn>
                  </div>
                )}

                <BlockBuilder
                  content={form.rule}
                  onChange={rule => {
                    setForm(f => ({ ...f, rule }));
                    // Any manual edit switches source to custom
                    if (!isCustom) setLogicSource('custom');
                  }}
                  factFields={factFields}
                />
              </div>
            </div>

            {/* Right schema panel */}
            <SchemaPanel content={form.rule} />
          </>
        )}
      </div>
    </div>
  );
};

export type { RuleForm };
