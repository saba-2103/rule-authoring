import React from 'react';
import {
  cn, uid, Btn, Inp, Sel, IC,
  FACT_FIELDS, OPERATORS, ACTION_TYPES,
  Condition, WhenClause, RuleAction, ConditionalBlock, BlockGroup, RuleContent, BlockType,
  mkIfBlock, mkElseIfBlock, mkElseBlock, mkBlockGroup,
  deriveInputSchema, deriveOutputSchema,
  FactField,
} from './shared';

/* ── FACT FIELDS CONTEXT ─────────────────────────── */
type FieldOption = { value: string; label: string; dataType: string };
const FactFieldsCtx = React.createContext<FieldOption[]>(FACT_FIELDS);

/* ── CONDITION ROW ───────────────────────────────── */
interface ConditionRowProps {
  cond: Condition;
  index: number;
  matchLabel: string;
  onChange: (cond: Condition) => void;
  onRemove: () => void;
}

const ConditionRow: React.FC<ConditionRowProps> = ({ cond, index, matchLabel, onChange, onRemove }) => {
  const factFields = React.useContext(FactFieldsCtx);
  const fieldMeta = factFields.find(f => f.value === cond.field);
  const dtype = fieldMeta?.dataType || 'string';
  const ops = OPERATORS.filter(o => o.types.includes(dtype));
  const isBetween = ['BETWEEN', 'DATE_BETWEEN'].includes(cond.operator);
  const noValue = ['IS_NULL', 'IS_NOT_NULL', 'IS_EMPTY', 'IS_NOT_EMPTY'].includes(cond.operator);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground/60 w-8 text-right shrink-0 font-medium">
        {index === 0 ? '' : matchLabel.toUpperCase()}
      </span>
      <Sel value={cond.field}
        onChange={e => onChange({ ...cond, field: e.target.value, operator: 'EQUALS', value: '', secondValue: '' })}
        options={[{ value: '', label: 'Select field…' }, ...factFields]}
        className="min-w-[180px]" />
      <Sel value={cond.operator}
        onChange={e => onChange({ ...cond, operator: e.target.value, secondValue: '' })}
        options={ops.map(o => ({ value: o.value, label: o.label }))}
        className="min-w-[140px]" />
      {!noValue && (
        <Inp value={cond.value} onChange={e => onChange({ ...cond, value: e.target.value })}
          placeholder="value" className="w-24" />
      )}
      {isBetween && (
        <>
          <span className="text-xs text-gray-400">and</span>
          <Inp value={cond.secondValue || ''} onChange={e => onChange({ ...cond, secondValue: e.target.value })}
            placeholder="end" className="w-24" />
        </>
      )}
      <Btn size="icon" variant="ghost" onClick={onRemove} className="shrink-0 hover:bg-destructive/10 hover:text-destructive">
        <IC.Trash size={12} />
      </Btn>
    </div>
  );
};

/* ── ACTION ROW ──────────────────────────────────── */
interface ActionRowProps {
  action: RuleAction;
  onChange: (action: RuleAction) => void;
  onRemove: () => void;
}

const ActionRow: React.FC<ActionRowProps> = ({ action, onChange, onRemove }) => {
  const factFields = React.useContext(FactFieldsCtx);
  const isAssign = action.type === 'ASSIGN';
  const isMsg = action.type === 'ADD_MESSAGE';
  const isCompute = action.type === 'COMPUTE';
  const isMultiply = action.type === 'MULTIPLY';
  const isPct = action.type === 'APPLY_PERCENTAGE';
  const isLog = action.type === 'LOG';
  const needsField = isAssign || isCompute || isMultiply || isPct;

  return (
    <div className="flex items-start gap-2 flex-wrap">
      <Sel value={action.type}
        onChange={e => onChange({ ...action, type: e.target.value, field: '', value: '', config: {} })}
        options={ACTION_TYPES} className="min-w-[220px]" />
      {needsField && (
        <Sel value={action.field}
          onChange={e => onChange({ ...action, field: e.target.value })}
          options={[{ value: '', label: 'Target field…' }, ...factFields]}
          className="min-w-[180px]" />
      )}
      {isAssign && (
        <Inp value={action.value} onChange={e => onChange({ ...action, value: e.target.value })}
          placeholder="value" className="w-28" />
      )}
      {isCompute && (
        <Inp value={String(action.config?.formula || '')}
          onChange={e => onChange({ ...action, config: { formula: e.target.value } })}
          placeholder="formula expression" className="w-48" />
      )}
      {(isMultiply || isPct) && (
        <Inp value={String(isMultiply ? (action.config?.multiplier || '') : (action.config?.percentage || ''))}
          onChange={e => onChange({ ...action, config: isMultiply ? { multiplier: e.target.value } : { percentage: e.target.value } })}
          placeholder={isMultiply ? 'multiplier' : '%'} className="w-24" />
      )}
      {isMsg && (
        <Inp value={String(action.config?.template || '')}
          onChange={e => onChange({ ...action, config: { template: e.target.value } })}
          placeholder="Message template…" className="flex-1 min-w-[240px]" />
      )}
      {isLog && (
        <Inp value={String(action.config?.message || '')}
          onChange={e => onChange({ ...action, config: { message: e.target.value } })}
          placeholder="Log message…" className="flex-1 min-w-[240px]" />
      )}
      <Btn size="icon" variant="ghost" onClick={onRemove} className="hover:bg-destructive/10 hover:text-destructive shrink-0">
        <IC.Trash size={12} />
      </Btn>
    </div>
  );
};

/* ── WHEN SECTION ────────────────────────────────── */
interface WhenSectionProps {
  when: WhenClause;
  blockType: BlockType;
  onChange: (when: WhenClause) => void;
}

const WhenSection: React.FC<WhenSectionProps> = ({ when, blockType, onChange }) => {
  const addCond = () => onChange({
    ...when,
    conditions: [...when.conditions, { id: uid(), field: '', operator: 'EQUALS', value: '', secondValue: '' }],
  });
  const updCond = (i: number, c: Condition) => {
    const nc = [...when.conditions]; nc[i] = c;
    onChange({ ...when, conditions: nc });
  };
  const delCond = (i: number) => onChange({ ...when, conditions: when.conditions.filter((_, j) => j !== i) });

  const headerBg = blockType === 'IF' ? 'bg-primary/5 border-primary/15' : 'bg-muted/50 border-border/60';
  const headerText = blockType === 'IF' ? 'text-primary/70' : 'text-muted-foreground';
  const matchBtnActive = 'bg-primary text-primary-foreground';
  const matchBtnHover = blockType === 'IF' ? 'hover:bg-primary/10' : 'hover:bg-accent';
  const addBtnColor = blockType === 'IF' ? 'text-primary/80 hover:text-primary' : 'text-muted-foreground hover:text-foreground';

  return (
    <div>
      <div className={cn('flex items-center gap-3 pb-2 mb-3 border-b', headerBg.split(' ')[1] ? '' : '')}>
        <div className="flex items-center bg-background border border-border rounded overflow-hidden">
          {(['and', 'or'] as const).map(m => (
            <button key={m} type="button"
              onClick={() => onChange({ ...when, match: m })}
              className={cn('px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors',
                when.match === m ? matchBtnActive : `text-muted-foreground ${matchBtnHover}`)}>
              {m}
            </button>
          ))}
        </div>
        <span className={cn('text-xs', headerText)}>of these conditions are true</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {when.conditions.length === 0 && (
          <p className="text-sm text-muted-foreground/50 italic text-center py-2">No conditions — block will always execute</p>
        )}
        {when.conditions.map((c, i) => (
          <ConditionRow key={c.id} cond={c} index={i} matchLabel={when.match}
            onChange={nc => updCond(i, nc)} onRemove={() => delCond(i)} />
        ))}
        <button type="button" onClick={addCond}
          className={cn('flex items-center gap-1.5 text-xs font-medium mt-1', addBtnColor)}>
          <IC.Plus size={13} />Add Condition
        </button>
      </div>
    </div>
  );
};

/* ── THEN SECTION ────────────────────────────────── */
interface ThenSectionProps {
  then: RuleAction[];
  nested: BlockGroup[];
  depth: number;
  onChange: (then: RuleAction[]) => void;
  onNestedChange: (nested: BlockGroup[]) => void;
}

const ThenSection: React.FC<ThenSectionProps> = ({ then, nested, depth, onChange, onNestedChange }) => {
  const addAction = () => onChange([...then, { id: uid(), type: 'ASSIGN', field: '', value: '', dataType: '', config: {} }]);
  const updAction = (i: number, a: RuleAction) => { const na = [...then]; na[i] = a; onChange(na); };
  const delAction = (i: number) => onChange(then.filter((_, j) => j !== i));

  const addNestedGroup = () => onNestedChange([...nested, mkBlockGroup()]);
  const updNestedGroup = (i: number, g: BlockGroup) => { const ng = [...nested]; ng[i] = g; onNestedChange(ng); };
  const delNestedGroup = (i: number) => onNestedChange(nested.filter((_, j) => j !== i));

  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {then.length === 0 && nested.length === 0 && (
          <p className="text-sm text-muted-foreground/50 italic text-center py-2">No actions defined</p>
        )}
        {then.map((a, i) => (
          <ActionRow key={a.id} action={a} onChange={na => updAction(i, na)} onRemove={() => delAction(i)} />
        ))}
        <button type="button" onClick={addAction}
          className="flex items-center gap-1.5 text-xs font-medium text-primary/70 hover:text-primary mt-1">
          <IC.Plus size={13} />Add Action
        </button>
      </div>

      {/* Nested block groups */}
      {depth < 3 && (
        <div className="mt-4">
          {nested.map((g, i) => (
            <div key={g.id} className="mt-3">
              <BlockGroupComponent
                group={g}
                onChange={ng => updNestedGroup(i, ng)}
                onRemove={() => delNestedGroup(i)}
                depth={depth + 1}
                canRemove
              />
            </div>
          ))}
          <button type="button" onClick={addNestedGroup}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mt-3 border border-dashed border-border rounded-md px-2.5 py-1.5 hover:bg-accent transition-colors">
            <IC.Plus size={12} />Add Nested IF Block
          </button>
        </div>
      )}
    </div>
  );
};

/* ── SINGLE BLOCK ────────────────────────────────── */
interface BlockComponentProps {
  block: ConditionalBlock;
  onChange: (block: ConditionalBlock) => void;
  onRemove: () => void;
  depth: number;
  canRemove: boolean;
  isOnly: boolean;
}

const blockColors = {
  IF: {
    border: 'border-primary/20',
    header: 'bg-primary/5 border-primary/15',
    label: 'text-primary/70',
    badge: 'bg-primary/10 text-primary',
  },
  ELSE_IF: {
    border: 'border-amber-100',
    header: 'bg-amber-50/60 border-amber-100/70',
    label: 'text-amber-600/80',
    badge: 'bg-amber-50 text-amber-600',
  },
  ELSE: {
    border: 'border-border',
    header: 'bg-muted/30 border-border/50',
    label: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
  },
};

const BlockComponent: React.FC<BlockComponentProps> = ({ block, onChange, onRemove, depth, canRemove, isOnly }) => {
  const isElse = block.type === 'ELSE';
  const colors = blockColors[block.type];

  return (
    <div className={cn('rounded-lg border overflow-hidden', colors.border)}>
      {/* Block header */}
      <div className={cn('px-4 py-2.5 border-b flex items-center gap-3', colors.header)}>
        <span className={cn('px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider', colors.badge)}>
          {block.type.replace('_', ' ')}
        </span>
        {!isElse && (
          <span className={cn('text-xs', colors.label)}>conditions</span>
        )}
        {isElse && (
          <span className="text-xs text-gray-500">— fallback actions (no conditions)</span>
        )}
        <div className="ml-auto flex gap-1">
          {canRemove && !isOnly && (
            <button type="button" onClick={onRemove}
              className="p-1 rounded text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Remove this block">
              <IC.Trash size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* WHEN section (not for ELSE) */}
        {!isElse && (
          <div>
          <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-2', colors.label)}>WHEN</p>
            <WhenSection
              when={block.when}
              blockType={block.type}
              onChange={when => onChange({ ...block, when })}
            />
          </div>
        )}

        {/* THEN section */}
        <div>
          <p className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider mb-2">THEN</p>
          <ThenSection
            then={block.then}
            nested={block.nested}
            depth={depth}
            onChange={then => onChange({ ...block, then })}
            onNestedChange={nested => onChange({ ...block, nested })}
          />
        </div>
      </div>
    </div>
  );
};

/* ── BLOCK GROUP ─────────────────────────────────── */
interface BlockGroupProps {
  group: BlockGroup;
  onChange: (group: BlockGroup) => void;
  onRemove: () => void;
  depth: number;
  canRemove: boolean;
}

const BlockGroupComponent: React.FC<BlockGroupProps> = ({ group, onChange, onRemove, depth, canRemove }) => {
  const hasElse = group.blocks.some(b => b.type === 'ELSE');
  const elseIfCount = group.blocks.filter(b => b.type === 'ELSE_IF').length;

  const addElseIf = () => {
    const withoutElse = group.blocks.filter(b => b.type !== 'ELSE');
    const elseBlock = group.blocks.find(b => b.type === 'ELSE');
    onChange({
      ...group,
      blocks: [...withoutElse, mkElseIfBlock(), ...(elseBlock ? [elseBlock] : [])],
    });
  };

  const addElse = () => onChange({ ...group, blocks: [...group.blocks, mkElseBlock()] });

  const updBlock = (i: number, b: ConditionalBlock) => {
    const nb = [...group.blocks]; nb[i] = b;
    onChange({ ...group, blocks: nb });
  };

  const delBlock = (i: number) => {
    if (group.blocks.length <= 1) return;
    onChange({ ...group, blocks: group.blocks.filter((_, j) => j !== i) });
  };

  const depthIndicator = depth > 0 ? (
    <div className="flex items-center gap-1.5 mb-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold">Nested Block</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  ) : null;

  return (
    <div className={cn('rounded-xl', depth > 0 ? 'border border-dashed border-border/60 p-3' : '')}>
      {depthIndicator}
      <div className="flex flex-col gap-2">
        {group.blocks.map((block, i) => (
          <BlockComponent
            key={block.id}
            block={block}
            onChange={b => updBlock(i, b)}
            onRemove={() => delBlock(i)}
            depth={depth}
            canRemove={group.blocks.length > 1}
            isOnly={group.blocks.length === 1}
          />
        ))}
      </div>

      {/* Add else-if / else */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <button type="button" onClick={addElseIf}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 border border-dashed border-border rounded-md hover:bg-accent transition-colors">
          <IC.Plus size={12} />ELSE IF
        </button>
        {!hasElse && (
          <button type="button" onClick={addElse}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/70 hover:text-foreground px-2.5 py-1.5 border border-dashed border-border/60 rounded-md hover:bg-accent transition-colors">
            <IC.Plus size={12} />ELSE
          </button>
        )}
        {(elseIfCount > 0 || hasElse) && (
          <span className="text-xs text-muted-foreground/60">
            {elseIfCount > 0 && `${elseIfCount} ELSE IF`}
            {elseIfCount > 0 && hasElse && ' · '}
            {hasElse && 'ELSE'}
          </span>
        )}
        {canRemove && depth > 0 && (
          <button type="button" onClick={onRemove}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-destructive px-2 py-1 rounded hover:bg-destructive/10 transition-colors">
            <IC.Trash size={11} />Remove block
          </button>
        )}
      </div>
    </div>
  );
};

/* ── BLOCK BUILDER (TOP LEVEL) ───────────────────── */
interface BlockBuilderProps {
  content: RuleContent;
  onChange: (content: RuleContent) => void;
  factFields?: FactField[];
}

export const BlockBuilder: React.FC<BlockBuilderProps> = ({ content, onChange, factFields }) => {
  const fieldOptions: FieldOption[] = factFields && factFields.length > 0
    ? factFields.map(f => ({ value: f.path, label: f.displayName, dataType: f.dataType }))
    : FACT_FIELDS;
  const addTopGroup = () => onChange({ ...content, blocks: [...content.blocks, mkBlockGroup()] });

  const updTopGroup = (i: number, g: BlockGroup) => {
    const ng = [...content.blocks]; ng[i] = g;
    onChange({ ...content, blocks: ng });
  };

  const delTopGroup = (i: number) => onChange({ ...content, blocks: content.blocks.filter((_, j) => j !== i) });

  return (
    <FactFieldsCtx.Provider value={fieldOptions}>
      <div className="flex flex-col gap-5">
        {content.blocks.map((group, i) => (
          <div key={group.id}>
            {i > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground/60 uppercase tracking-wider font-semibold px-2">Sequential Block {i + 1}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <BlockGroupComponent
              group={group}
              onChange={g => updTopGroup(i, g)}
              onRemove={() => delTopGroup(i)}
              depth={0}
              canRemove={content.blocks.length > 1}
            />
          </div>
        ))}
        <button type="button" onClick={addTopGroup}
          className="flex items-center gap-2 text-sm font-medium text-primary/70 hover:text-primary px-4 py-3 border-2 border-dashed border-primary/20 rounded-xl hover:bg-primary/5 transition-colors justify-center">
          <IC.Plus size={15} />Add Sequential IF Block
        </button>
      </div>
    </FactFieldsCtx.Provider>
  );
};

/* ── SCHEMA PANEL ────────────────────────────────── */
interface SchemaPanelProps {
  content: RuleContent;
}

export const SchemaPanel: React.FC<SchemaPanelProps> = ({ content }) => {
  const inputSchema = deriveInputSchema(content);
  const outputSchema = deriveOutputSchema(content);

  return (
    <div className="w-60 border-l border-border bg-background shrink-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div className="p-4 sticky top-0 bg-background border-b border-border z-10">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">What this rule reads &amp; writes</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Auto-detected from your logic</p>
      </div>

      <div className="p-4">
        {/* Input Schema */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-primary/50 shrink-0" />
            <p className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">Needs to know</p>
          </div>
          {inputSchema.facts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-3 text-center">
              <p className="text-[10px] text-muted-foreground leading-relaxed">Fields used in your conditions will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {inputSchema.facts.map(fact => (
                <div key={fact.factType} className="bg-background rounded-lg border border-border p-2.5">
                  <p className="text-[10px] font-bold text-foreground/70 mb-1.5">{fact.factType}</p>
                  {fact.fields.map(field => (
                    <div key={field.name} className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[10px] text-primary/80 bg-primary/8 px-1 py-0.5 rounded">{field.name}</span>
                      <span className="text-[10px] text-muted-foreground">{field.dataType}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border mb-5" />

        {/* Output Schema */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400/70 shrink-0" />
            <p className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider">Produces</p>
          </div>
          {outputSchema.facts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-3 text-center">
              <p className="text-[10px] text-muted-foreground leading-relaxed">Fields set in your actions will appear here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {outputSchema.facts.map(fact => (
                <div key={fact.factType} className="bg-background rounded-lg border border-border p-2.5">
                  <p className="text-[10px] font-bold text-foreground/70 mb-1.5">{fact.factType}</p>
                  {fact.fields.map(field => (
                    <div key={field.name} className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[10px] text-emerald-700/80 bg-emerald-50/60 px-1 py-0.5 rounded">{field.name}</span>
                      <span className="text-[10px] text-muted-foreground">{field.dataType}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Legend</p>
          <div className="space-y-1.5 text-[10px] text-muted-foreground">
            <p><span className="text-primary/80 font-medium">Needs to know</span> — data this rule checks</p>
            <p><span className="text-emerald-600/80 font-medium">Produces</span> — values this rule sets or calculates</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── CONDITIONS PANEL ────────────────────────────── */
interface ConditionsPanelProps {
  content: RuleContent;
}

const condLabel = (cond: Condition): string => {
  const op = OPERATORS.find(o => o.value === cond.operator)?.label || cond.operator;
  // Humanise field: take last segment of dot path and convert camelCase to words
  const fieldName = cond.field
    ? cond.field.split('.').pop()!.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()
    : 'field';
  if (['IS_NULL', 'IS_EMPTY'].includes(cond.operator)) return `${fieldName} is not provided`;
  if (['IS_NOT_NULL', 'IS_NOT_EMPTY'].includes(cond.operator)) return `${fieldName} is provided`;
  if (cond.operator === 'BETWEEN' || cond.operator === 'DATE_BETWEEN')
    return `${fieldName} is between ${cond.value} and ${cond.secondValue}`;
  const opMap: Record<string, string> = {
    EQUALS: 'is', NOT_EQUALS: 'is not', GREATER_THAN: 'is more than',
    LESS_THAN: 'is less than', GREATER_THAN_OR_EQUAL: 'is at least',
    LESS_THAN_OR_EQUAL: 'is at most', CONTAINS: 'contains', IN: 'is one of',
  };
  const friendlyOp = opMap[cond.operator] || op.toLowerCase();
  return `${fieldName} ${friendlyOp}${cond.value ? ` ${cond.value}` : ''}`;
};

const actionLabel = (a: RuleAction): string => {
  const fieldName = a.field
    ? a.field.split('.').pop()!.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()
    : '';
  switch (a.type) {
    case 'ASSIGN': return `Set ${fieldName}${a.value ? ` to "${a.value}"` : ''}`;
    case 'COMPUTE': return `Calculate ${fieldName}`;
    case 'MULTIPLY': return `Multiply ${fieldName}`;
    case 'APPLY_PERCENTAGE': return `Apply % to ${fieldName}`;
    case 'LOOKUP': return `Look up ${fieldName}`;
    case 'ADD_MESSAGE': return `Send message${a.config?.template ? `: "${String(a.config.template).slice(0, 40)}${String(a.config.template).length > 40 ? '…' : ''}"` : ''}`;
    case 'LOG': return `Log: ${a.config?.message ? String(a.config.message).slice(0, 40) : ''}`;
    default: return `${a.type}${fieldName ? ` ${fieldName}` : ''}`;
  }
};

const blockTypeLabel: Record<BlockType, string> = {
  IF: 'When',
  ELSE_IF: 'Or when',
  ELSE: 'Otherwise',
};

const blockTypeStyle: Record<BlockType, string> = {
  IF:      'bg-primary/10 text-primary',
  ELSE_IF: 'bg-amber-50/80 text-amber-600',
  ELSE:    'bg-muted text-muted-foreground',
};

const CondTree: React.FC<{ blocks: ConditionalBlock[]; depth?: number }> = ({ blocks, depth = 0 }) => (
  <div className={cn('flex flex-col gap-2', depth > 0 && 'ml-3 pl-2 border-l-2 border-border/60 mt-1')}>
    {blocks.map(block => (
      <div key={block.id}>
        {/* Block type badge */}
        <span className={cn('inline-block text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mb-1', blockTypeStyle[block.type])}>
          {blockTypeLabel[block.type]}
        </span>

        {/* Conditions */}
        {block.type !== 'ELSE' && (
          <div className="ml-0.5 mb-1">
            {block.when.conditions.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/50 ml-1 italic">always applies</p>
            ) : (
              <>
                <p className="text-[10px] text-muted-foreground mb-0.5">
                  {block.when.match === 'and' ? 'All must be true:' : 'Any one is true:'}
                </p>
                {block.when.conditions.map(c => (
                  <div key={c.id} className="flex items-start gap-1 ml-1 mb-0.5">
                    <span className="text-muted-foreground/50 shrink-0 mt-0.5">·</span>
                    <span className="text-[10px] text-foreground/80 break-all leading-snug">{condLabel(c)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Actions */}
        {block.then.length > 0 && (
          <div className="ml-1 mb-1">
            {block.then.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-start gap-1 mb-0.5">
                <span className="text-primary/50 shrink-0 mt-0.5">→</span>
                <span className="text-[10px] text-primary/80 break-all leading-snug">{actionLabel(a)}</span>
              </div>
            ))}
            {block.then.length > 4 && (
              <p className="text-[10px] text-muted-foreground ml-2">+{block.then.length - 4} more actions</p>
            )}
          </div>
        )}

        {/* Nested blocks */}
        {block.nested.length > 0 && block.nested.map(ng => (
          <CondTree key={ng.id} blocks={ng.blocks} depth={(depth || 0) + 1} />
        ))}
      </div>
    ))}
  </div>
);

export const ConditionsPanel: React.FC<ConditionsPanelProps> = ({ content }) => {
  const isEmpty = content.blocks.every(g =>
    g.blocks.every(b => b.when.conditions.length === 0 && b.then.length === 0 && b.nested.length === 0)
  );

  return (
    <div className="w-56 border-r border-border bg-background shrink-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
      <div className="px-4 py-3 sticky top-0 bg-background border-b border-border z-10">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rule Summary</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">How this rule will behave</p>
      </div>
      <div className="p-3">
        {isEmpty ? (
          <div className="rounded-lg border border-dashed border-border/60 p-3 text-center mt-1">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Start adding conditions and actions to see a plain-language summary here
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {content.blocks.map((group, gi) => (
              <div key={group.id}>
                {gi > 0 && (
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-semibold mb-2 mt-1">
                    Block {gi + 1}
                  </p>
                )}
                <CondTree blocks={group.blocks} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── RULE LOGIC DISPLAY (read-only) ──────────────── */
interface RuleLogicDisplayProps {
  content: RuleContent;
}

export const RuleLogicDisplay: React.FC<RuleLogicDisplayProps> = ({ content }) => {
  const renderBlock = (block: ConditionalBlock, depth: number = 0) => {
    const isElse = block.type === 'ELSE';
    const colors = blockColors[block.type];

    return (
      <div key={block.id} className={cn('rounded-lg border overflow-hidden mb-2', colors.border)}>
        <div className={cn('px-3 py-2 border-b flex items-center gap-2', colors.header)}>
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider', colors.badge)}>
            {block.type.replace('_', ' ')}
          </span>
          {!isElse && (
            <span className={cn('text-xs font-semibold uppercase', colors.label)}>{block.when.match}</span>
          )}
        </div>
        <div className="p-3">
          {!isElse && block.when.conditions.length > 0 && (
            <div className="mb-3">
              {block.when.conditions.map((c, i) => (
                <div key={c.id} className="flex items-center gap-1.5 text-xs mb-1 flex-wrap pl-2">
                  {i > 0 && <span className="text-gray-400 text-[10px] uppercase font-medium w-6">{block.when.match}</span>}
                  <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{c.field}</span>
                  <span className="text-gray-500">{OPERATORS.find(o => o.value === c.operator)?.label || c.operator}</span>
                  {c.value && <span className="font-mono text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{c.value}{c.secondValue ? ` … ${c.secondValue}` : ''}</span>}
                </div>
              ))}
            </div>
          )}
          {!isElse && block.when.conditions.length === 0 && (
            <p className="text-xs text-gray-400 italic mb-2 pl-2">Always executes</p>
          )}
          {block.then.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">THEN</p>
              {block.then.map((a, i) => (
                <div key={a.id} className="flex items-center gap-1.5 text-xs mb-1 pl-2 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono font-medium">{a.type}</span>
                  {a.field && <><span className="text-gray-400">→</span><span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{a.field}</span></>}
                  {a.value && <><span className="text-gray-400">=</span><span className="font-mono text-green-700 bg-green-50 px-1.5 py-0.5 rounded">{String(a.value)}</span></>}
                  {(a.config as Record<string, unknown>)?.template && <span className="text-gray-600 italic">"{String((a.config as Record<string, unknown>).template)}"</span>}
                  {(a.config as Record<string, unknown>)?.formula && <span className="font-mono text-purple-600">{String((a.config as Record<string, unknown>).formula)}</span>}
                  {(a.config as Record<string, unknown>)?.percentage != null && <span className="text-gray-500">{String((a.config as Record<string, unknown>).percentage)}%</span>}
                </div>
              ))}
            </div>
          )}
          {block.nested.map(ng => (
            <div key={ng.id} className="mt-3 ml-2 border-l-2 border-gray-200 pl-3">
              {ng.blocks.map(b => renderBlock(b, depth + 1))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {content.blocks.map((group, gi) => (
        <div key={group.id}>
          {gi > 0 && <div className="flex items-center gap-2 my-3"><div className="h-px flex-1 bg-gray-200" /><span className="text-[10px] text-gray-400 uppercase tracking-wider">Sequential</span><div className="h-px flex-1 bg-gray-200" /></div>}
          {group.blocks.map(block => renderBlock(block))}
        </div>
      ))}
    </div>
  );
};
