import React, { useEffect } from 'react';
import {
  LayoutDashboard, Binary, TextSearch, Stamp,
  ChartNoAxesCombined, SquareActivity,
  Box, CloudCog, Rows3,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from './ui/sidebar';

/* ── HELPERS ─────────────────────────────────────── */
export const cn = (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' ');
export const uid = () => Math.random().toString(36).slice(2, 9);
export const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const activeVer = <T extends { status: string; version: number }>(doc: { versions: T[] }): T | null =>
  doc.versions.find(v => v.status === 'ACTIVE') || doc.versions[doc.versions.length - 1] || null;

/* ── TYPES ───────────────────────────────────────── */
export interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
  secondValue: string;
  dataType: string;
}

export interface WhenClause {
  match: 'and' | 'or';
  conditions: Condition[];
  groups: WhenClause[];
}

export interface RuleAction {
  id: string;
  type: string;
  field: string;
  value: string;
  dataType: string;
  config: Record<string, unknown>;
}

export type BlockType = 'IF' | 'ELSE_IF' | 'ELSE';

export interface ConditionalBlock {
  id: string;
  type: BlockType;
  when: WhenClause;
  then: RuleAction[];
  nested: BlockGroup[];
}

export interface BlockGroup {
  id: string;
  blocks: ConditionalBlock[];
}

export interface RuleContent {
  blocks: BlockGroup[];
}

export interface DerivedSchema {
  facts: { factType: string; fields: { name: string; dataType: string }[] }[];
}

export interface RuleVersion {
  id: string;
  version: number;
  status: string;
  description: string;
  changeSummary: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  activatedAt: string | null;
  activatedBy: string | null;
  rule: RuleContent;
}

export interface Rule {
  id: string;
  spaceId?: string;
  name: string;
  category: string;
  tags: string[];
  createdAt: string;
  createdBy: string;
  versions: RuleVersion[];
}

export interface TableVersion {
  id: string;
  version: number;
  status: string;
  description: string;
  changeSummary: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  table: {
    hitPolicy: string;
    inputs: { field: string; operator: string; dataType: string; label: string }[];
    outputs: { field: string; dataType: string; label: string }[];
    rows: { id: number; isEnabled: boolean; inputs: (string | number)[]; outputs: (string | number)[] }[];
  };
}

export interface Table {
  id: string;
  spaceId?: string;
  name: string;
  category: string;
  tags: string[];
  createdAt: string;
  versions: TableVersion[];
}

export interface FlowVersion {
  id: string;
  version: number;
  status: string;
  description: string;
  changeSummary: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  flow: {
    mergeStrategy: string;
    nodes: { id: number; type: string; name: string; config?: { ruleRef?: string; tableRef?: string } }[];
    edges: { id: number; source: number; target: number }[];
  };
}

export interface Flow {
  id: string;
  spaceId?: string;
  name: string;
  category: string;
  tags: string[];
  stopOnError: boolean;
  createdAt: string;
  versions: FlowVersion[];
}

/* ── LOOKUP TABLE TYPES ──────────────────────────── */
export interface LookupValueColumn {
  id: string;
  field: string;     // machine name, e.g. "state_name"
  label: string;     // display label, e.g. "State Name"
  dataType: 'string' | 'number' | 'boolean';
}

export interface LookupRow {
  id: string;
  key: string;       // the lookup key value
  values: string[];  // one value per valueColumn
  isEnabled: boolean;
}

export interface LookupVersion {
  id: string;
  version: number;
  status: string;
  description: string;
  changeSummary: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  keyColumn: { field: string; label: string; dataType: string };
  valueColumns: LookupValueColumn[];
  rows: LookupRow[];
}

export interface LookupTable {
  id: string;
  spaceId?: string;
  name: string;
  category: string;
  tags: string[];
  createdAt: string;
  versions: LookupVersion[];
}

export interface SpaceMember {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  members: SpaceMember[];
  enabledFactIds: string[];
}

export type DataType = 'string' | 'number' | 'boolean' | 'date' | 'list';

export interface Fact {
  id: string;
  name: string;        // namespace key used in rule paths, e.g. "policy"
  displayName: string; // human-readable, e.g. "Policy"
  description: string;
  createdAt: string;
  createdBy: string;
}

export interface FactField {
  id: string;
  factId: string;      // references Fact.id
  name: string;        // attribute name, e.g. "vehicleType"
  path: string;        // full dot-path, e.g. "policy.vehicleType"
  displayName: string; // human-readable, e.g. "Vehicle Type"
  dataType: DataType;
  description: string;
  isOutput: boolean;   // true = written by rules; false = read as input
  createdAt: string;
  createdBy: string;
}

/* ── CONSTANTS ───────────────────────────────────── */
export const FACT_FIELDS = [
  { label: 'ApplicantInfo.age', value: 'ApplicantInfo.age', dataType: 'number' },
  { label: 'ApplicantInfo.annualIncome', value: 'ApplicantInfo.annualIncome', dataType: 'number' },
  { label: 'ApplicantInfo.productCode', value: 'ApplicantInfo.productCode', dataType: 'string' },
  { label: 'ApplicantInfo.dateOfBirth', value: 'ApplicantInfo.dateOfBirth', dataType: 'date' },
  { label: 'ApplicantInfo.eligible', value: 'ApplicantInfo.eligible', dataType: 'boolean' },
  { label: 'ApplicantInfo.premiumRate', value: 'ApplicantInfo.premiumRate', dataType: 'number' },
  { label: 'ApplicantInfo.riskScore', value: 'ApplicantInfo.riskScore', dataType: 'number' },
  { label: 'ApplicantInfo.sumAssured', value: 'ApplicantInfo.sumAssured', dataType: 'number' },
  { label: 'VehicleInfo.make', value: 'VehicleInfo.make', dataType: 'string' },
  { label: 'VehicleInfo.year', value: 'VehicleInfo.year', dataType: 'number' },
  { label: 'VehicleInfo.cubicCapacity', value: 'VehicleInfo.cubicCapacity', dataType: 'number' },
  { label: 'ClaimInfo.claimCount', value: 'ClaimInfo.claimCount', dataType: 'number' },
];

export const OPERATORS = [
  { value: 'EQUALS', label: 'equals', types: ['number', 'string', 'boolean', 'date'] },
  { value: 'NOT_EQUALS', label: 'does not equal', types: ['number', 'string', 'boolean', 'date'] },
  { value: 'GREATER_THAN', label: 'is greater than', types: ['number'] },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'is ≥', types: ['number'] },
  { value: 'LESS_THAN', label: 'is less than', types: ['number'] },
  { value: 'LESS_THAN_OR_EQUAL', label: 'is ≤', types: ['number'] },
  { value: 'BETWEEN', label: 'is between', types: ['number', 'date'] },
  { value: 'CONTAINS', label: 'contains', types: ['string'] },
  { value: 'STARTS_WITH', label: 'starts with', types: ['string'] },
  { value: 'ENDS_WITH', label: 'ends with', types: ['string'] },
  { value: 'IN', label: 'is one of', types: ['string', 'number'] },
  { value: 'NOT_IN', label: 'is not one of', types: ['string', 'number'] },
  { value: 'IS_NULL', label: 'is null', types: ['number', 'string', 'boolean', 'date'] },
  { value: 'IS_NOT_NULL', label: 'is not null', types: ['number', 'string', 'boolean', 'date'] },
  { value: 'DATE_BEFORE', label: 'is before', types: ['date'] },
  { value: 'DATE_AFTER', label: 'is after', types: ['date'] },
  { value: 'DATE_BETWEEN', label: 'is between (dates)', types: ['date'] },
  { value: 'MATCHES_PATTERN', label: 'matches pattern', types: ['string'] },
];

export const ACTION_TYPES = [
  { value: 'ASSIGN', label: 'ASSIGN — Set field value' },
  { value: 'COMPUTE', label: 'COMPUTE — Evaluate formula' },
  { value: 'MULTIPLY', label: 'MULTIPLY — Multiply field' },
  { value: 'APPLY_PERCENTAGE', label: 'APPLY_PERCENTAGE — Apply %' },
  { value: 'ADD_MESSAGE', label: 'ADD_MESSAGE — Append message' },
  { value: 'ADD_TO_LIST', label: 'ADD_TO_LIST — Append to list' },
  { value: 'SUM_LIST', label: 'SUM_LIST — Sum list field' },
  { value: 'LOOKUP', label: 'LOOKUP — Fetch from table' },
  { value: 'CREATE_TASK', label: 'CREATE_TASK — Emit task' },
  { value: 'LOG', label: 'LOG — Debug log' },
];

export const STATUS_META: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  PEER_REVIEW: { label: 'Peer Review', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  BUSINESS_REVIEW: { label: 'Business Review', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  COMPLIANCE_REVIEW: { label: 'Compliance Review', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
  APPROVED: { label: 'Approved', bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-400' },
  ACTIVE: { label: 'Active', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  INACTIVE: { label: 'Inactive', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  DEPRECATED: { label: 'Deprecated', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  ARCHIVE: { label: 'Archive', bg: 'bg-red-50', text: 'text-red-400', dot: 'bg-red-300' },
};

export const CATEGORIES = ['Underwriting', 'Claims', 'Pricing', 'Compliance', 'Operations'];
export const ROLES = ['ADMIN', 'RULE_AUTHOR', 'RULE_APPROVER', 'RULE_EXECUTOR', 'VIEWER'];

/* ── BLOCK FACTORY HELPERS ───────────────────────── */
export const mkIfBlock = (): ConditionalBlock => ({
  id: uid(), type: 'IF',
  when: { match: 'and', conditions: [], groups: [] },
  then: [], nested: [],
});
export const mkElseIfBlock = (): ConditionalBlock => ({
  id: uid(), type: 'ELSE_IF',
  when: { match: 'and', conditions: [], groups: [] },
  then: [], nested: [],
});
export const mkElseBlock = (): ConditionalBlock => ({
  id: uid(), type: 'ELSE',
  when: { match: 'and', conditions: [], groups: [] },
  then: [], nested: [],
});
export const mkBlockGroup = (): BlockGroup => ({ id: uid(), blocks: [mkIfBlock()] });

const mkBlockRule = (when: Omit<WhenClause, 'groups'> & { groups?: WhenClause[] }, then: RuleAction[]): RuleContent => ({
  blocks: [{ id: uid(), blocks: [{ id: uid(), type: 'IF', when: { groups: [], ...when }, then, nested: [] }] }],
});

/* ── SCHEMA DERIVATION ───────────────────────────── */
const WRITE_TYPES = ['ASSIGN', 'COMPUTE', 'MULTIPLY', 'APPLY_PERCENTAGE'];

function walkGroupForInput(group: BlockGroup, fields: Map<string, { factType: string; name: string; dataType: string }>) {
  for (const block of group.blocks) {
    if (block.type !== 'ELSE') {
      for (const cond of block.when.conditions) {
        if (cond.field) {
          const parts = cond.field.split('.');
          if (parts.length >= 2) {
            const meta = FACT_FIELDS.find(f => f.value === cond.field);
            fields.set(cond.field, { factType: parts[0], name: parts.slice(1).join('.'), dataType: meta?.dataType || 'string' });
          }
        }
      }
    }
    for (const ng of block.nested) walkGroupForInput(ng, fields);
  }
}

function walkGroupForOutput(group: BlockGroup, fields: Map<string, { factType: string; name: string; dataType: string }>) {
  for (const block of group.blocks) {
    for (const action of block.then) {
      if (WRITE_TYPES.includes(action.type) && action.field) {
        const parts = action.field.split('.');
        if (parts.length >= 2) {
          const meta = FACT_FIELDS.find(f => f.value === action.field);
          fields.set(action.field, { factType: parts[0], name: parts.slice(1).join('.'), dataType: meta?.dataType || 'string' });
        }
      }
    }
    for (const ng of block.nested) walkGroupForOutput(ng, fields);
  }
}

function groupByFact(fields: Map<string, { factType: string; name: string; dataType: string }>): DerivedSchema {
  const byFact = new Map<string, { name: string; dataType: string }[]>();
  for (const { factType, name, dataType } of fields.values()) {
    if (!byFact.has(factType)) byFact.set(factType, []);
    byFact.get(factType)!.push({ name, dataType });
  }
  return { facts: Array.from(byFact.entries()).map(([factType, flds]) => ({ factType, fields: flds })) };
}

export function deriveInputSchema(content: RuleContent): DerivedSchema {
  const fields = new Map<string, { factType: string; name: string; dataType: string }>();
  for (const g of content.blocks) walkGroupForInput(g, fields);
  return groupByFact(fields);
}

export function deriveOutputSchema(content: RuleContent): DerivedSchema {
  const fields = new Map<string, { factType: string; name: string; dataType: string }>();
  for (const g of content.blocks) walkGroupForOutput(g, fields);
  return groupByFact(fields);
}

/* ── SEED DATA ───────────────────────────────────── */
export const SEED_SPACES: Space[] = [
  {
    id: 'default-space', name: 'Default Space', description: 'GTL underwriting rules — eligibility, NML, medical validity, SA increase, grandfathering, NRI, MQ and LOA',
    createdAt: '2026-01-01T00:00:00',
    members: [
      { userId: 'u1', email: 'alice@insure.com', role: 'ADMIN', joinedAt: '2026-01-01T00:00:00' },
    ],
    enabledFactIds: [
      'f-action', 'f-approval', 'f-authority', 'f-bank', 'f-base', 'f-billing', 'f-broker',
      'f-census', 'f-claim', 'f-compliance', 'f-composition', 'f-data', 'f-docs',
      'f-endorsement', 'f-floatReceipt', 'f-floatTransfer', 'f-irdai', 'f-kyc', 'f-lfq',
      'f-loan', 'f-medical', 'f-member', 'f-mph', 'f-override', 'f-plan', 'f-policy',
      'f-product', 'f-promo', 'f-quote', 'f-rateCard', 'f-rating', 'f-refund', 'f-request',
      'f-revival', 'f-rider', 'f-scheme', 'f-settlement', 'f-sig', 'f-tax', 'f-termination',
      'f-ulip', 'f-uw',
    ],
  },
  {
    id: 'motor-uw', name: 'AXA Motor Insurance', description: 'Motor insurance underwriting and pricing rules',
    createdAt: '2025-01-01T00:00:00',
    members: [
      { userId: 'u1', email: 'alice@insure.com', role: 'ADMIN', joinedAt: '2025-01-01T00:00:00' },
      { userId: 'u2', email: 'bob@insure.com', role: 'RULE_APPROVER', joinedAt: '2025-01-05T00:00:00' },
      { userId: 'u3', email: 'carol@insure.com', role: 'RULE_AUTHOR', joinedAt: '2025-02-01T00:00:00' },
    ],
    enabledFactIds: ['f-policy', 'f-driver', 'f-pricing'],
  },
  {
    id: 'demo', name: 'Empty', description: 'Sandbox space for demonstrations and onboarding',
    createdAt: '2026-01-01T00:00:00',
    members: [
      { userId: 'u1', email: 'alice@insure.com', role: 'ADMIN', joinedAt: '2026-01-01T00:00:00' },
    ],
    enabledFactIds: [],
  },
];

export const SEED_FACTS: Fact[] = [
  { id: 'f-policy',      name: 'policy',      displayName: 'Policy',       description: 'Core policy details including status, dates, coverage type, and lapse information.',        createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-claim',       name: 'claim',        displayName: 'Claim',        description: 'Claim submission details including benefit codes, treatment dates, and decision outputs.',    createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-driver',      name: 'driver',       displayName: 'Driver',       description: 'Driver profile used for motor underwriting — age, telematics, and licence details.',         createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-applicant',   name: 'applicant',    displayName: 'Applicant',    description: 'Applicant health and personal details used in life and health underwriting.',               createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-rider',       name: 'rider',        displayName: 'Rider',        description: 'Rider eligibility and premium output fields for add-on benefits (CI, waiver, etc.).',       createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-pricing',     name: 'pricing',      displayName: 'Pricing',      description: 'Computed pricing outputs: base premium, loadings, NCB discounts, and EV flags.',            createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-fraud',       name: 'fraud',        displayName: 'Fraud',        description: 'Fraud detection scoring, signal aggregation, and bureau score integration.',                createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-renewal',     name: 'renewal',      displayName: 'Renewal',      description: 'Renewal processing context: claim history aggregates, tier progression, and NCB awards.',   createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-provider',    name: 'provider',     displayName: 'Provider',     description: 'Healthcare provider network tier and empanelment classification.',                          createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-adjudication',name: 'adjudication', displayName: 'Adjudication', description: 'Claims adjudication decision outputs: STP pass/fail, approval thresholds, ML confidence.',  createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  /* GTL / Group Life domain */
  { id: 'f-member',        name: 'member',        displayName: 'Member',               description: 'Group scheme member profile: eligibility, demographics, life class, hazard, and UW outputs.',  createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-scheme',        name: 'scheme',        displayName: 'Scheme',               description: 'Group insurance scheme configuration: product code, type, segment, FCL, and setup context.',    createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-rating',        name: 'rating',        displayName: 'Rating',               description: 'GTL/group premium rating outputs: base rate, per-mille, loadings, discounts, and GST.',         createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-uw',            name: 'uw',            displayName: 'Underwriting',         description: 'Underwriting decision context: action, disposition, medical validity, rate-up, and status.',    createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-census',        name: 'census',        displayName: 'Census',               description: 'Employee census data quality and validation: headcount, DQ band, STP band, and outcomes.',      createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-docs',          name: 'docs',          displayName: 'Documents',            description: 'Document verification context: type, OCR confidence, precedence, source, and gate outcome.',    createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-kyc',           name: 'kyc',           displayName: 'KYC',                  description: 'Know-Your-Customer verification: entity type, PAN, CIN, PEP, signatory, and outcome.',          createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-approval',      name: 'approval',      displayName: 'Approval',             description: 'Approval workflow state: status, action, two-officer check, and final outcome.',                 createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-product',       name: 'product',       displayName: 'Product',              description: 'Product configuration rules: line of business, variant, premium type, tax, and limits.',         createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-sig',           name: 'sig',           displayName: 'Signature',            description: 'Digital and wet signature verification: mode, validity, authority, and outcome.',                createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-bank',          name: 'bank',          displayName: 'Bank',                 description: 'Bank account verification: penny drop, fuzzy score match, and verification outcome.',            createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-override',      name: 'override',      displayName: 'Override',             description: 'Underwriting or rate override: deviation percentage, reason, action, and status.',               createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-tax',           name: 'tax',           displayName: 'Tax',                  description: 'Tax computation context: GST treatment, HSN code, stamp duty, and rate.',                        createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-billing',       name: 'billing',       displayName: 'Billing',              description: 'Billing and payment context: frequency and processing outcome.',                                  createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-plan',          name: 'plan',          displayName: 'Plan',                 description: 'Plan configuration within a scheme: sum-assured type and structure.',                            createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-quote',         name: 'quote',         displayName: 'Quote',                description: 'Quotation context: type (new business, renewal, endorsement).',                                  createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-base',          name: 'base',          displayName: 'Base Plan',            description: 'Base plan configuration: joint-life capability and policy term.',                                createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-broker',        name: 'broker',        displayName: 'Broker',               description: 'Broker context: tier classification and package submission flag.',                               createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-promo',         name: 'promo',         displayName: 'Promotion',            description: 'Promotional campaign context: Q4 active flag and campaign eligibility.',                         createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-rateCard',      name: 'rateCard',      displayName: 'Rate Card',            description: 'Rate card validation: insurer profile match and effective date window.',                         createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-refund',        name: 'refund',        displayName: 'Refund',               description: 'Refund processing context: computed refund amount for cancellations.',                           createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-request',       name: 'request',       displayName: 'Request',              description: 'Policy request context: policy loan flag and processing outcome.',                               createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-revival',       name: 'revival',       displayName: 'Revival',              description: 'Policy revival context: interest rate applicable for lapsed policy reinstatement.',              createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-endorsement',   name: 'endorsement',   displayName: 'Endorsement',          description: 'Mid-term policy endorsement: type and premium adjustment.',                                       createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-ulip',          name: 'ulip',          displayName: 'ULIP',                 description: 'Unit-linked insurance plan switch context: count, amount, and switch outcome.',                  createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-composition',   name: 'composition',   displayName: 'Composition',          description: 'Group scheme composition validation: scheme-type mix and outcome.',                              createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-compliance',    name: 'compliance',    displayName: 'Compliance',           description: 'Regulatory compliance checks: IRDAI Sec 38/39 nomination and assignment compliance.',           createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-lfq',           name: 'lfq',           displayName: 'Life Questionnaire',   description: 'Life full questionnaire context: adverse medical history flag.',                                 createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-loan',          name: 'loan',          displayName: 'Loan',                 description: 'Loan context for borrower group schemes: foreclosure status.',                                    createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-medical',       name: 'medical',       displayName: 'Medical',              description: 'Medical evidence context: previous medical and test validity flags.',                             createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-data',          name: 'data',          displayName: 'Data',                 description: 'Data processing context: PII field flag and storage outcome.',                                   createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-authority',     name: 'authority',     displayName: 'Authority',            description: 'Delegated authority limits: maximum rate deviation percentage.',                                 createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-irdai',         name: 'irdai',         displayName: 'IRDAI',                description: 'IRDAI regulatory context: rate floor applicable to the product.',                               createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-floatReceipt',  name: 'floatReceipt',  displayName: 'Float Receipt',        description: 'Float receipt reconciliation: variance tolerance breach and outcome.',                           createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-floatTransfer', name: 'floatTransfer', displayName: 'Float Transfer',       description: 'Inter-entity float transfer: cross-entity validity, UTR, and outcome.',                        createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-mph',           name: 'mph',           displayName: 'Master Policy Holder', description: 'Master policy holder classification: corporate and RBI-regulated flags.',                       createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-action',        name: 'action',        displayName: 'Action',               description: 'Trigger/action context passed to rule evaluation.',                                              createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-termination',   name: 'termination',   displayName: 'Termination',          description: 'Policy termination context: initiator, notice days, and outcome.',                              createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
  { id: 'f-settlement',    name: 'settlement',    displayName: 'Settlement',           description: 'Claims settlement context: bank rejection flag and settlement outcome.',                         createdAt: '2025-01-01T00:00:00', createdBy: 'system' },
];

const ff = (id: string, factId: string, name: string, displayName: string, dataType: DataType, description: string, isOutput: boolean): FactField => ({
  id, factId, name, path: `${SEED_FACTS.find(f => f.id === factId)!.name}.${name}`, displayName, dataType, description, isOutput,
  createdAt: '2025-01-01T00:00:00', createdBy: 'system',
});

export const SEED_FACT_FIELDS: FactField[] = [
  /* policy */
  ff('ff-pol-01','f-policy','vehicleType',               'Vehicle Type',                         'string', 'Type of vehicle (e.g. SEDAN, SUV, MOTORCYCLE, TRUCK).',                          false),
  ff('ff-pol-02','f-policy','region',                    'Region',                               'string', 'Geographic region of policy registration for territory pricing.',                  false),
  ff('ff-pol-03','f-policy','vehicleAge',                'Vehicle Age',                          'number', 'Age of vehicle in years at policy inception.',                                    false),
  ff('ff-pol-04','f-policy','pincode',                   'Pincode',                              'string', 'Policyholder postcode used for dynamic region derivation.',                        false),
  ff('ff-pol-05','f-policy','status',                    'Status',                               'string', 'Current policy status: ACTIVE, LAPSED, CANCELLED, EXPIRED.',                     false),
  ff('ff-pol-06','f-policy','claimHistory',              'Claim History',                        'list',   'List of historical claim objects for aggregation rules.',                         false),
  ff('ff-pol-07','f-policy','claimFreeYears',            'Claim-Free Years',                     'number', 'Consecutive years without a claim. Used for NCB calculation.',                   false),
  ff('ff-pol-08','f-policy','tenure',                    'Tenure (Years)',                       'number', 'Total years the policy has been continuously held.',                              false),
  ff('ff-pol-09','f-policy','continuousCoverageMonths',  'Continuous Coverage (Months)',         'number', 'Uninterrupted months of coverage. Used for waiting period checks.',               false),
  ff('ff-pol-10','f-policy','hasLapseInLast24Months',    'Has Lapse in Last 24 Months',          'boolean','Whether a coverage lapse occurred in the last 24 months.',                       false),
  ff('ff-pol-11','f-policy','inceptionDate',             'Inception Date',                       'date',   'Policy start date.',                                                              false),
  ff('ff-pol-12','f-policy','expiryDate',                'Expiry Date',                          'date',   'Policy end/renewal date.',                                                        false),
  ff('ff-pol-13','f-policy','lapseGapDays',              'Lapse Gap (Days)',                     'number', 'Number of days between lapse and reinstatement.',                                false),
  ff('ff-pol-14','f-policy','reinstatementDate',         'Reinstatement Date',                   'date',   'Date the policy was reinstated after lapse.',                                    false),
  ff('ff-pol-15','f-policy','preExistingDeclared',       'Pre-Existing Declared',                'boolean','Whether a pre-existing condition was declared at inception.',                    false),
  ff('ff-pol-16','f-policy','policyType',                'Policy Type',                          'string', 'Policy variant: INDIVIDUAL, GROUP, FLOATER.',                                    false),
  ff('ff-pol-17','f-policy','currentTier',               'Current Loyalty Tier',                 'string', 'Current tier in the loyalty/renewal tier ladder.',                               false),
  ff('ff-pol-18','f-policy','isPortability',             'Is Portability',                       'boolean','Whether the policy was ported from another insurer.',                            false),
  ff('ff-pol-19','f-policy','requiresReinstatementDeclaration', 'Requires Reinstatement Declaration', 'boolean', 'Output flag: triggers pre-issuance health declaration after long lapse.', true),
  /* claim */
  ff('ff-clm-01','f-claim','benefitCode',                'Benefit Code',                         'string', 'Benefit code identifying the claim type (e.g. MATERNITY, IPD, OPD).',            false),
  ff('ff-clm-02','f-claim','treatmentDate',              'Treatment Date',                       'date',   'Date of treatment / hospitalisation.',                                            false),
  ff('ff-clm-03','f-claim','eligible',                   'Eligible',                             'boolean','Output: whether the claim is eligible for reimbursement.',                       true),
  ff('ff-clm-04','f-claim','rejectionReasons',           'Rejection Reasons',                    'list',   'Output list of rejection reason codes.',                                          true),
  ff('ff-clm-05','f-claim','providerId',                 'Provider ID',                          'string', 'Unique identifier of the healthcare provider submitting the claim.',              false),
  ff('ff-clm-06','f-claim','preAuthRef',                 'Pre-Auth Reference',                   'string', 'Pre-authorisation reference number for inpatient claims.',                       false),
  ff('ff-clm-07','f-claim','payableAmount',              'Payable Amount',                       'number', 'Computed payable amount after co-pay and deductions.',                           false),
  ff('ff-clm-08','f-claim','decisionLane',               'Decision Lane',                        'string', 'Output: routing lane — AUTO_APPROVE, REVIEW, SOFT_REVIEW, AUTO_DECLINE.',       true),
  ff('ff-clm-09','f-claim','reviewFlags',                'Review Flags',                         'list',   'Output list of flags for manual review processing.',                             true),
  ff('ff-clm-10','f-claim','claimType',                  'Claim Type',                           'string', 'Claim category: INPATIENT, OUTPATIENT, DAYCARE, EMERGENCY.',                    false),
  ff('ff-clm-11','f-claim','preAuthVerified',            'Pre-Auth Verified',                    'boolean','Output: whether pre-auth reference has been validated.',                         true),
  ff('ff-clm-12','f-claim','deductibleRemaining',        'Deductible Remaining',                 'number', 'Remaining deductible balance for the policy year.',                              false),
  /* driver */
  ff('ff-drv-01','f-driver','age',                       'Age',                                  'number', 'Driver age in years at policy inception.',                                        false),
  ff('ff-drv-02','f-driver','telematicsScore',           'Telematics Score',                     'number', 'Telematics safety score (0–100). Higher is safer.',                              false),
  ff('ff-drv-03','f-driver','licenceYears',              'Licence Years',                        'number', 'Number of years the driver has held a valid licence.',                           false),
  ff('ff-drv-04','f-driver','convictions',               'Convictions',                          'number', 'Number of driving convictions in the last 5 years.',                             false),
  /* applicant */
  ff('ff-app-01','f-applicant','age',                    'Age',                                  'number', 'Applicant age in years.',                                                         false),
  ff('ff-app-02','f-applicant','dateOfBirth',            'Date of Birth',                        'date',   'Applicant date of birth.',                                                        false),
  ff('ff-app-03','f-applicant','annualIncome',           'Annual Income',                        'number', 'Applicant gross annual income.',                                                  false),
  ff('ff-app-04','f-applicant','sumAssured',             'Sum Assured',                          'number', 'Requested sum assured amount.',                                                   false),
  ff('ff-app-05','f-applicant','productCode',            'Product Code',                         'string', 'Insurance product code selected by the applicant.',                              false),
  ff('ff-app-06','f-applicant','hba1c',                  'HbA1c Level',                          'number', 'Glycated haemoglobin level. Used for diabetic eligibility checks.',              false),
  ff('ff-app-07','f-applicant','bmi',                    'BMI',                                  'number', 'Body Mass Index.',                                                                false),
  ff('ff-app-08','f-applicant','smokingStatus',          'Smoking Status',                       'string', 'Smoking status: CURRENT_SMOKER, RECENT_QUITTER, NON_SMOKER, NRT_USER.',         false),
  ff('ff-app-09','f-applicant','smokeFreeYears',         'Smoke-Free Years',                     'number', 'Years since the applicant stopped smoking.',                                     false),
  ff('ff-app-10','f-applicant','preExistingConditions',  'Pre-Existing Conditions',              'list',   'List of declared pre-existing condition codes.',                                  false),
  ff('ff-app-11','f-applicant','telehealthAssessmentCompleted', 'Telehealth Assessment Completed','boolean','Whether a telehealth medical assessment has been completed.',                  false),
  ff('ff-app-12','f-applicant','eligible',               'Eligible',                             'boolean','Output: overall applicant eligibility decision.',                                true),
  ff('ff-app-13','f-applicant','premiumRate',            'Premium Rate',                         'number', 'Output: computed premium rate.',                                                  true),
  ff('ff-app-14','f-applicant','riskScore',              'Risk Score',                           'number', 'Output: overall applicant risk score.',                                           true),
  /* rider */
  ff('ff-rid-01','f-rider','ciEligible',                 'CI Eligible',                          'boolean','Output: whether the critical illness rider is approved.',                        true),
  ff('ff-rid-02','f-rider','ciBasePremium',              'CI Base Premium',                      'number', 'Output: CI rider base premium.',                                                  true),
  ff('ff-rid-03','f-rider','waitingPeriodMonths',        'Waiting Period (Months)',              'number', 'Output: applicable waiting period for the rider.',                               true),
  ff('ff-rid-04','f-rider','loadingReasons',             'Loading Reasons',                      'list',   'Output: list of loading reason codes applied to the rider.',                     true),
  ff('ff-rid-05','f-rider','assessmentType',             'Assessment Type',                      'string', 'Output: how the applicant was assessed — IN_PERSON, TELEHEALTH.',                true),
  /* pricing */
  ff('ff-prc-01','f-pricing','basePremium',              'Base Premium',                         'number', 'Computed base premium before loadings and discounts.',                           true),
  ff('ff-prc-02','f-pricing','ncbDiscountPct',           'NCB Discount %',                       'number', 'No-claims bonus discount percentage.',                                            true),
  ff('ff-prc-03','f-pricing','ncbCapped',                'NCB Capped',                           'boolean','Whether the NCB discount has been capped at the regulatory maximum.',            true),
  ff('ff-prc-04','f-pricing','ncbBand',                  'NCB Band',                             'string', 'NCB tier band label.',                                                            true),
  ff('ff-prc-05','f-pricing','evBandApplied',            'EV Band Applied',                      'boolean','Whether the EV classification flag has been set.',                               true),
  ff('ff-prc-06','f-pricing','youngDriverLoading',       'Young Driver Loading',                 'number', 'Computed young driver surcharge as a decimal (e.g. 0.15).',                     true),
  ff('ff-prc-07','f-pricing','loadingReasons',           'Loading Reasons',                      'list',   'List of loading reason codes applied to the premium.',                           true),
  /* fraud */
  ff('ff-frd-01','f-fraud','detections',                 'Detections',                           'list',   'List of fraud signal objects with points values.',                               false),
  ff('ff-frd-02','f-fraud','totalScore',                 'Total Score',                          'number', 'Output: aggregated fraud score.',                                                  true),
  ff('ff-frd-03','f-fraud','signalCount',                'Signal Count',                         'number', 'Output: number of fraud signals detected.',                                       true),
  ff('ff-frd-04','f-fraud','bureauScore',                'Bureau Score',                         'number', 'Third-party fraud bureau score (0–100).',                                        false),
  ff('ff-frd-05','f-fraud','mlScore',                    'ML Score',                             'number', 'ML model fraud probability score (0–1).',                                        false),
  ff('ff-frd-06','f-fraud','internalScore',              'Internal Score',                       'number', 'Output: internal rule-based fraud score component.',                             true),
  ff('ff-frd-07','f-fraud','ruleScore',                  'Rule Score',                           'number', 'Output: rule-based component of hybrid scoring.',                                true),
  /* renewal */
  ff('ff-rnw-01','f-renewal','triggerType',              'Trigger Type',                         'string', 'Event that triggered renewal processing: ANNUAL_RENEWAL, MID_TERM.',             false),
  ff('ff-rnw-02','f-renewal','claimCountLast3Years',     'Claim Count (Last 3 Years)',           'number', 'Output: aggregated claim count over rolling 3-year window.',                     true),
  ff('ff-rnw-03','f-renewal','gracePeriodExpired',       'Grace Period Expired',                 'boolean','Whether the renewal grace period has passed.',                                   false),
  ff('ff-rnw-04','f-renewal','nextTier',                 'Next Loyalty Tier',                    'string', 'Output: upgraded loyalty tier for zero-claim renewal.',                          true),
  ff('ff-rnw-05','f-renewal','ncbDiscountPct',           'NCB Discount %',                       'number', 'Output: NCB discount awarded at renewal.',                                        true),
  ff('ff-rnw-06','f-renewal','consecutiveZeroClaimYears','Consecutive Zero-Claim Years',         'number', 'Years of consecutive claim-free renewal.',                                       false),
  ff('ff-rnw-07','f-renewal','cashbackAmount',           'Cashback Amount',                      'number', 'Output: cashback reward for zero-claim milestone.',                               true),
  ff('ff-rnw-08','f-renewal','basePremium',              'Base Premium at Renewal',              'number', 'Base premium value used for loading calculations at renewal.',                   false),
  ff('ff-rnw-09','f-renewal','restrictedNetworkRequired','Restricted Network Required',          'boolean','Output: whether restricted provider network applies at renewal.',                true),
  ff('ff-rnw-10','f-renewal','loadingPct',               'Loading %',                            'number', 'Output: computed high-claim loading percentage.',                                true),
  ff('ff-rnw-11','f-renewal','chronicConditionClaimCount','Chronic Condition Claim Count',       'number', 'Claims attributed to declared chronic conditions — excluded from loading calc.', false),
  /* provider */
  ff('ff-prv-01','f-provider','networkTier',             'Network Tier',                         'string', 'Output: IN_NETWORK, OUT_OF_NETWORK, or GAP.',                                    true),
  ff('ff-prv-02','f-provider','empanelmentStatus',       'Empanelment Status',                   'string', 'Real-time empanelment status: ACTIVE, SUSPENDED, DELISTED.',                    false),
  ff('ff-prv-03','f-provider','empanelmentVerified',     'Empanelment Verified',                 'boolean','Output: whether empanelment was validated via API.',                              true),
  ff('ff-prv-04','f-provider','hospitalTier',            'Hospital Tier',                        'number', 'Provider tier (1=premium, 2=standard, 3=basic) for approval limits.',           false),
  ff('ff-prv-05','f-provider','gapReimbursementPct',     'GAP Reimbursement %',                  'number', 'Output: reimbursement percentage for GAP network providers.',                    true),
  /* adjudication */
  ff('ff-adj-01','f-adjudication','stpPassed',           'STP Passed',                           'boolean','Output: whether the claim passed the straight-through processing gate.',         true),
  ff('ff-adj-02','f-adjudication','approvalLimit',       'Approval Limit',                       'number', 'Output: maximum auto-approval amount based on provider tier.',                   true),
  ff('ff-adj-03','f-adjudication','mlConfidence',        'ML Confidence',                        'number', 'ML model confidence score (0–1) for auto-approval eligibility.',                false),
  /* policy — GTL additions */
  ff('ff-pol-20','f-policy','outcome',                   'Outcome',                              'string', 'Output: overall policy processing outcome.',                                      true),
  ff('ff-pol-21','f-policy','jurisdiction',              'Jurisdiction',                         'string', 'Policy jurisdiction for regulatory and stamp duty routing.',                      false),
  ff('ff-pol-22','f-policy','clause',                    'Clause',                               'string', 'Special clause attached to the policy (e.g. WAP, SUICIDE_EXCLUSION).',           false),
  ff('ff-pol-23','f-policy','clausePack',                'Clause Pack',                          'string', 'Bundled clause pack applied to the policy.',                                      false),
  ff('ff-pol-24','f-policy','rcd',                       'Risk Commencement Date',               'date',   'Date from which risk cover is effective.',                                        false),
  ff('ff-pol-25','f-policy','nominationOrAssignment',    'Nomination / Assignment',              'string', 'Whether policy has a valid nomination or assignment on record.',                  false),
  ff('ff-pol-26','f-policy','hardPreIssuePass',          'Hard Pre-Issue Pass',                  'boolean','Output: whether all hard pre-issue checks have been satisfied.',                  true),
  ff('ff-pol-27','f-policy','freeLookCancellation',      'Free Look Cancellation',               'boolean','Whether a free-look period cancellation has been initiated.',                    false),
  ff('ff-pol-28','f-policy','freeLookOutcome',           'Free Look Outcome',                    'string', 'Output: decision of the free-look cancellation request.',                        true),
  ff('ff-pol-29','f-policy','cancellationRequested',     'Cancellation Requested',               'boolean','Whether a policy cancellation has been requested.',                              false),
  ff('ff-pol-30','f-policy','revivalRequested',          'Revival Requested',                    'boolean','Whether a policy revival has been requested.',                                   false),
  ff('ff-pol-31','f-policy','lenderEntity',              'Lender Entity',                        'string', 'Lending institution for borrower group schemes.',                                false),
  ff('ff-pol-32','f-policy','loanClosureOption',         'Loan Closure Option',                  'string', 'How outstanding loan is handled on policy termination.',                         false),
  /* claim — GTL additions */
  ff('ff-clm-13','f-claim','outcome',                    'Outcome',                              'string', 'Output: overall claim processing outcome.',                                       true),
  ff('ff-clm-14','f-claim','causeOfDeath',               'Cause of Death',                       'string', 'Cause of death code for life/group life death claims.',                          false),
  ff('ff-clm-15','f-claim','survivalDays',               'Survival Days',                        'number', 'Days survived after diagnosis — used for CI/ADB checks.',                       false),
  ff('ff-clm-16','f-claim','daysSinceCoverStart',        'Days Since Cover Start',               'number', 'Days elapsed since the cover commencement date.',                               false),
  ff('ff-clm-17','f-claim','monthsSinceCoverStart',      'Months Since Cover Start',             'number', 'Months elapsed since cover start — used for waiting period checks.',            false),
  ff('ff-clm-18','f-claim','daysSinceDisability',        'Days Since Disability',                'number', 'Days elapsed since onset of disability — used for TPD/WOP triggers.',           false),
  ff('ff-clm-19','f-claim','hospitalisationDays',        'Hospitalisation Days',                 'number', 'Inpatient hospitalisation days for hospital cash claims.',                       false),
  ff('ff-clm-20','f-claim','payeePriority',              'Payee Priority',                       'string', 'Output: determined payee priority order for settlement.',                        true),
  ff('ff-clm-21','f-claim','nomineeKycPending',          'Nominee KYC Pending',                  'boolean','Output: whether nominee KYC is outstanding before settlement.',                  true),
  ff('ff-clm-22','f-claim','beneficiaryKycPending',      'Beneficiary KYC Pending',              'boolean','Output: whether beneficiary KYC is outstanding before settlement.',              true),
  ff('ff-clm-23','f-claim','adbExclusionWaived',         'ADB Exclusion Waived',                 'boolean','Output: whether the ADB exclusion has been waived by UW decision.',              true),
  /* rider — GTL additions */
  ff('ff-rid-06','f-rider','type',                       'Rider Type',                           'string', 'Rider type code (e.g. ADB, CI, WOP, HOSPI_CASH, TPD).',                         false),
  ff('ff-rid-07','f-rider','termYears',                  'Rider Term (Years)',                   'number', 'Policy term for the rider in years.',                                             false),
  ff('ff-rid-08','f-rider','jointLife',                  'Joint Life',                           'boolean','Whether the rider covers both lives on a joint-life policy.',                    false),
  ff('ff-rid-09','f-rider','adbCap',                     'ADB Cap',                              'number', 'Output: maximum sum assured cap applied to the ADB rider.',                      true),
  ff('ff-rid-10','f-rider','hospiCashConfig',            'Hospi Cash Config',                    'string', 'Hospital cash daily benefit configuration string.',                              false),
  ff('ff-rid-11','f-rider','outcome',                    'Outcome',                              'string', 'Output: overall rider eligibility/rating outcome.',                               true),
  /* member */
  ff('ff-mbr-01','f-member','age',                       'Age',                                  'number', 'Member age in years at scheme commencement or mid-year join date.',               false),
  ff('ff-mbr-02','f-member','gender',                    'Gender',                               'string', 'Member gender: MALE, FEMALE, OTHER.',                                             false),
  ff('ff-mbr-03','f-member','dateOfJoiningScheme',       'Date of Joining Scheme',               'date',   'Date the member joined the group scheme.',                                        false),
  ff('ff-mbr-04','f-member','occupation',                'Occupation',                           'string', 'Member occupational category code.',                                              false),
  ff('ff-mbr-05','f-member','memberType',                'Member Type',                          'string', 'Type classification: EMPLOYEE, BORROWER, DEPOSITOR, MEMBER.',                   false),
  ff('ff-mbr-06','f-member','memberClass',               'Member Class',                         'string', 'Sub-class of member within the scheme (e.g. EXECUTIVE, STAFF).',                false),
  ff('ff-mbr-07','f-member','sa',                        'Sum Assured (Short)',                  'number', 'Member-level sum assured (short form).',                                          false),
  ff('ff-mbr-08','f-member','sumAssured',                'Sum Assured',                          'number', 'Member-level sum assured.',                                                       false),
  ff('ff-mbr-09','f-member','salary',                    'Salary',                               'number', 'Annual salary used for SI formula validation.',                                   false),
  ff('ff-mbr-10','f-member','loanOutstanding',           'Loan Outstanding',                     'number', 'Outstanding loan principal for borrower group members.',                         false),
  ff('ff-mbr-11','f-member','loaType',                   'LOA Type',                             'string', 'Leave-of-absence type: MATERNITY, SABBATICAL, UNPAID.',                         false),
  ff('ff-mbr-12','f-member','loaDurationMonths',         'LOA Duration (Months)',                'number', 'Duration of leave of absence in months.',                                        false),
  ff('ff-mbr-13','f-member','midYearIncreaseCount',      'Mid-Year Increase Count',              'number', 'Number of mid-year sum assured increases in the policy year.',                   false),
  ff('ff-mbr-14','f-member','munichRePreviouslySeen',    'Munich Re Previously Seen',            'boolean','Whether Munich Re has previously assessed this member.',                         false),
  ff('ff-mbr-15','f-member','tpdTrigger',                'TPD Trigger',                          'string', 'Triggering event type for Total Permanent Disability claim.',                   false),
  ff('ff-mbr-16','f-member','returningFromSabbatical',   'Returning From Sabbatical',            'boolean','Whether the member is returning from an approved sabbatical.',                  false),
  ff('ff-mbr-17','f-member','hasDisclosedPed',           'Has Disclosed PED',                    'boolean','Whether the member disclosed a pre-existing disease at enrolment.',             false),
  ff('ff-mbr-18','f-member','ped',                       'Pre-Existing Disease',                 'string', 'Pre-existing disease code declared by the member.',                              false),
  ff('ff-mbr-19','f-member','ageBand',                   'Age Band',                             'string', 'Output: computed age band used for mortality rating.',                            true),
  ff('ff-mbr-20','f-member','fcl',                       'Free Cover Limit',                     'number', 'Output: applicable free cover limit for this member.',                            true),
  ff('ff-mbr-21','f-member','lifeClass',                 'Life Class',                           'string', 'Output: UW life class assigned (STANDARD, RATED, EXCLUDED).',                   true),
  ff('ff-mbr-22','f-member','hazardClass',               'Hazard Class',                         'string', 'Output: occupational hazard class assigned to the member.',                      true),
  ff('ff-mbr-23','f-member','hazardousOccupation',       'Hazardous Occupation',                 'boolean','Output: whether member occupation is classified as hazardous.',                  true),
  ff('ff-mbr-24','f-member','ageInRange',                'Age In Range',                         'boolean','Output: whether member age falls within the scheme age limits.',                 true),
  ff('ff-mbr-25','f-member','ageExceedsFclCutoff',       'Age Exceeds FCL Cutoff',               'boolean','Output: whether member age exceeds the free cover limit cutoff.',               true),
  ff('ff-mbr-26','f-member','saAboveFcl',                'SA Above FCL',                         'boolean','Output: whether the member sum assured exceeds the free cover limit.',           true),
  ff('ff-mbr-27','f-member','saLteFcl',                  'SA ≤ FCL',                             'boolean','Output: whether the member sum assured is within the free cover limit.',         true),
  ff('ff-mbr-28','f-member','coverAboveFcl',             'Cover Above FCL',                      'boolean','Output: whether cover amount is above the FCL threshold.',                       true),
  ff('ff-mbr-29','f-member','crossesFclCutoffAtRenewal', 'Crosses FCL Cutoff At Renewal',        'boolean','Output: whether member will exceed FCL cutoff age at renewal.',                 true),
  ff('ff-mbr-30','f-member','loanOutstandingInBounds',   'Loan Outstanding In Bounds',           'boolean','Output: whether loan outstanding is within allowed SA bounds.',                  true),
  ff('ff-mbr-31','f-member','loanTermInBounds',          'Loan Term In Bounds',                  'boolean','Output: whether loan term is within the allowed range.',                         true),
  ff('ff-mbr-32','f-member','eligibilityStatus',         'Eligibility Status',                   'string', 'Output: member eligibility decision: ELIGIBLE, INELIGIBLE, REFER.',             true),
  ff('ff-mbr-33','f-member','highRiskCondition',         'High Risk Condition',                  'boolean','Output: whether a high-risk medical condition was identified.',                  true),
  ff('ff-mbr-34','f-member','dobValid',                  'Date of Birth Valid',                  'boolean','Output: whether the declared date of birth has been validated.',                 true),
  ff('ff-mbr-35','f-member','idUniqueInDraft',           'ID Unique In Draft',                   'boolean','Output: whether the member ID is unique within the draft census.',               true),
  ff('ff-mbr-36','f-member','duplicateInMph',            'Duplicate In MPH',                     'boolean','Output: whether a duplicate entry exists in the master policy holder list.',     true),
  ff('ff-mbr-37','f-member','requiredFieldsMissing',     'Required Fields Missing',              'boolean','Output: whether any mandatory member fields are absent.',                        true),
  ff('ff-mbr-38','f-member','siFormulaViolation',        'SI Formula Violation',                 'boolean','Output: whether the sum insured formula rule has been breached.',                true),
  ff('ff-mbr-39','f-member','salaryConsistencyMismatch', 'Salary Consistency Mismatch',          'boolean','Output: whether declared salary is inconsistent with grade band.',               true),
  ff('ff-mbr-40','f-member','borrowerLoanFieldsMissing', 'Borrower Loan Fields Missing',         'boolean','Output: whether required loan fields are absent for borrower members.',          true),
  ff('ff-mbr-41','f-member','nriOrFn',                   'NRI or Foreign National (Short)',       'boolean','Output: whether member is a non-resident Indian or foreign national.',           true),
  ff('ff-mbr-42','f-member','nriOrForeignNational',      'NRI or Foreign National',              'boolean','Output: whether member is a non-resident Indian or foreign national (full).',    true),
  ff('ff-mbr-43','f-member','countryClassification',     'Country Classification',               'string', 'Output: country risk tier — INDIA, STANDARD, RESTRICTED, DECLINE.',             true),
  ff('ff-mbr-44','f-member','countryOnDeclineList',      'Country On Decline List',              'boolean','Output: whether the member country is on the IRDAI decline list.',              true),
  ff('ff-mbr-45','f-member','pepMatch',                  'PEP Match',                            'boolean','Output: whether the member matched a Politically Exposed Person record.',       true),
  ff('ff-mbr-46','f-member','grandfatherFlag',           'Grandfather Flag',                     'boolean','Output: whether grandfathering applies for this member.',                        true),
  ff('ff-mbr-47','f-member','outcome',                   'Outcome',                              'string', 'Output: overall member UW/eligibility outcome.',                                  true),
  ff('ff-mbr-48','f-member','warning',                   'Warning',                              'string', 'Output: warning message for soft-fail member conditions.',                       true),
  ff('ff-mbr-49','f-member','ageAtDeath',                'Age At Death',                         'number', 'Member age at the time of death — used in death claim processing.',             false),
  /* scheme */
  ff('ff-sch-01','f-scheme','productCode',               'Product Code',                         'string', 'Insurance product code for the group scheme.',                                   false),
  ff('ff-sch-02','f-scheme','schemeType',                'Scheme Type',                          'string', 'Scheme type: GTL, GPA, GMED, GHLI, GHLA.',                                      false),
  ff('ff-sch-03','f-scheme','segment',                   'Segment',                              'string', 'Market segment: SME, CORPORATE, BANCASSURANCE, AFFINITY.',                      false),
  ff('ff-sch-04','f-scheme','effectiveDate',             'Effective Date',                       'date',   'Date from which scheme terms take effect.',                                      false),
  ff('ff-sch-05','f-scheme','isGrandfathered',           'Is Grandfathered',                     'boolean','Whether the scheme has grandfathering provisions for existing members.',         false),
  ff('ff-sch-06','f-scheme','isMultiPartner',            'Is Multi-Partner',                     'boolean','Whether the scheme involves multiple partner entities.',                          false),
  ff('ff-sch-07','f-scheme','participationRule',         'Participation Rule',                   'string', 'Minimum participation requirement: ALL_EMPLOYEES, VOLUNTARY.',                  false),
  ff('ff-sch-08','f-scheme','template',                  'Template',                             'string', 'Scheme configuration template code.',                                            false),
  ff('ff-sch-09','f-scheme','setupTrigger',              'Setup Trigger',                        'string', 'Event that triggered scheme setup: NEW_BUSINESS, RENEWAL, TAKEOVER.',           false),
  ff('ff-sch-10','f-scheme','strategicAccount',          'Strategic Account',                    'boolean','Whether the scheme is designated as a strategic account.',                       false),
  ff('ff-sch-11','f-scheme','wellnessCertified',         'Wellness Certified',                   'boolean','Whether the employer holds an accredited wellness certification.',               false),
  ff('ff-sch-12','f-scheme','hazardBand',                'Hazard Band',                          'string', 'Output: overall scheme hazard band derived from occupational mix.',               true),
  ff('ff-sch-13','f-scheme','fclCutoffAgeOutOfRange',    'FCL Cutoff Age Out of Range',          'boolean','Output: whether the FCL cutoff age is outside allowed bounds.',                  true),
  ff('ff-sch-14','f-scheme','fclNotConfiguredMultiDim',  'FCL Not Configured (Multi-Dim)',       'boolean','Output: whether FCL is not configured for multi-dimension schemes.',             true),
  /* rating */
  ff('ff-rat-01','f-rating','baseRate',                  'Base Rate',                            'number', 'Output: base mortality/morbidity rate per mille.',                               true),
  ff('ff-rat-02','f-rating','purePremium',               'Pure Premium',                         'number', 'Output: pure risk premium before loadings and discounts.',                       true),
  ff('ff-rat-03','f-rating','annualPremium',             'Annual Premium',                       'number', 'Output: final annual premium including all adjustments.',                        true),
  ff('ff-rat-04','f-rating','commercialPremium',         'Commercial Premium',                   'number', 'Output: commercially adjusted premium after broker and strategic discounts.',    true),
  ff('ff-rat-05','f-rating','effectivePerMille',         'Effective Per Mille',                  'number', 'Output: effective rate per 1000 of sum assured.',                                true),
  ff('ff-rat-06','f-rating','gst',                       'GST',                                  'number', 'Output: GST amount applied to the premium.',                                      true),
  ff('ff-rat-07','f-rating','load',                      'Load',                                 'number', 'Output: total loading percentage applied.',                                       true),
  ff('ff-rat-08','f-rating','seniorLoad',                'Senior Load',                          'number', 'Output: loading for senior age band members.',                                    true),
  ff('ff-rat-09','f-rating','hazardMixLoad',             'Hazard Mix Load',                      'number', 'Output: loading for occupational hazard mix.',                                    true),
  ff('ff-rat-10','f-rating','concentrationLoad',         'Concentration Load',                   'number', 'Output: loading for geographic or industry concentration risk.',                 true),
  ff('ff-rat-11','f-rating','dqLoad',                    'DQ Load',                              'number', 'Output: data quality loading applied due to census DQ band.',                    true),
  ff('ff-rat-12','f-rating','smokerLoad',                'Smoker Load',                          'number', 'Output: loading for smoker members.',                                             true),
  ff('ff-rat-13','f-rating','emrPct',                    'EMR %',                                'number', 'Output: experience modification rate percentage.',                               true),
  ff('ff-rat-14','f-rating','emrReasonCode',             'EMR Reason Code',                      'string', 'Output: reason code explaining the EMR adjustment.',                             true),
  ff('ff-rat-15','f-rating','ageSetBack',                'Age Set-Back',                         'number', 'Output: age set-back years applied to female lives.',                             true),
  ff('ff-rat-16','f-rating','genderForRating',           'Gender For Rating',                    'string', 'Output: gender used for rating after age set-back application.',                 true),
  ff('ff-rat-17','f-rating','minRatedAge',               'Minimum Rated Age',                    'number', 'Output: minimum age used for rating calculations.',                               true),
  ff('ff-rat-18','f-rating','rateSlab',                  'Rate Slab',                            'string', 'Output: rate slab code applied to the scheme.',                                   true),
  ff('ff-rat-19','f-rating','slabKey',                   'Slab Key',                             'string', 'Output: composite key used to look up the rate slab.',                           true),
  ff('ff-rat-20','f-rating','modalLoad',                 'Modal Load',                           'number', 'Output: loading for non-annual payment frequency.',                               true),
  ff('ff-rat-21','f-rating','brokerDiscount',            'Broker Discount',                      'number', 'Output: discount percentage applied for broker tier.',                            true),
  ff('ff-rat-22','f-rating','jointLifeDiscount',         'Joint Life Discount',                  'number', 'Output: discount for joint-life policy structure.',                               true),
  ff('ff-rat-23','f-rating','planMatchDiscount',         'Plan Match Discount',                  'number', 'Output: discount for plan design matching standard template.',                    true),
  ff('ff-rat-24','f-rating','riderDiscount',             'Rider Discount',                       'number', 'Output: discount applied for bundled rider purchase.',                            true),
  ff('ff-rat-25','f-rating','wellnessDiscount',          'Wellness Discount',                    'number', 'Output: discount for wellness-certified employers.',                               true),
  ff('ff-rat-26','f-rating','strategicRebate',           'Strategic Rebate',                     'number', 'Output: strategic account rebate percentage.',                                    true),
  ff('ff-rat-27','f-rating','discountHint',              'Discount Hint',                        'string', 'Output: hint code for the primary discount driver applied.',                     true),
  ff('ff-rat-28','f-rating','status',                    'Status',                               'string', 'Output: rating engine status: RATED, REFER, DECLINE.',                           true),
  ff('ff-rat-29','f-rating','outcome',                   'Outcome',                              'string', 'Output: overall rating outcome.',                                                  true),
  /* underwriting */
  ff('ff-uww-01','f-uw','outcome',                       'Outcome',                              'string', 'Output: overall UW decision: ACCEPT, REFER, DECLINE, RATED.',                   true),
  ff('ff-uww-02','f-uw','status',                        'Status',                               'string', 'Output: current UW status in the workflow.',                                      true),
  ff('ff-uww-03','f-uw','action',                        'Action',                               'string', 'Output: UW action to take: APPROVE, REFER_MEDICAL, LOAD, EXCLUDE.',              true),
  ff('ff-uww-04','f-uw','band',                          'Band',                                 'string', 'Output: UW risk band assigned.',                                                   true),
  ff('ff-uww-05','f-uw','finalDisposition',              'Final Disposition',                    'string', 'Output: final UW disposition after all checks.',                                  true),
  ff('ff-uww-06','f-uw','increaseDisposition',           'Increase Disposition',                 'string', 'Output: disposition for mid-year sum assured increase requests.',                 true),
  ff('ff-uww-07','f-uw','inProgress',                    'In Progress',                          'boolean','Output: whether UW assessment is still in progress.',                             true),
  ff('ff-uww-08','f-uw','rateUpApplies',                 'Rate Up Applies',                      'boolean','Output: whether a rate-up loading has been applied.',                             true),
  ff('ff-uww-09','f-uw','medValidity',                   'Medical Evidence Validity',            'date',   'Output: date until which medical evidence remains valid.',                        true),
  ff('ff-uww-10','f-uw','fclCap',                        'FCL Cap',                              'number', 'Output: the effective free cover limit cap for this member.',                     true),
  ff('ff-uww-11','f-uw','premiumBase',                   'Premium Base',                         'number', 'Output: base premium amount before UW adjustments.',                              true),
  ff('ff-uww-12','f-uw','premiumCalc',                   'Premium Calculated',                   'number', 'Output: final calculated premium after all UW adjustments.',                     true),
  ff('ff-uww-13','f-uw','reasonCode',                    'Reason Code',                          'string', 'Output: primary reason code for the UW decision.',                               true),
  ff('ff-uww-14','f-uw','inforceRule',                   'Inforce Rule',                         'string', 'Output: name of the inforce/continuity rule applied.',                           true),
  /* census */
  ff('ff-cen-01','f-census','headcount',                 'Headcount',                            'number', 'Total employee count submitted in the census.',                                   false),
  ff('ff-cen-02','f-census','membersCount',              'Members Count',                        'number', 'Number of members in the census after deduplication.',                           false),
  ff('ff-cen-03','f-census','plansCount',                'Plans Count',                          'number', 'Number of distinct plans configured in the census.',                              false),
  ff('ff-cen-04','f-census','tracking',                  'Tracking',                             'string', 'Census submission tracking reference.',                                           false),
  ff('ff-cen-05','f-census','dqBand',                    'DQ Band',                              'string', 'Output: data quality band: A, B, C, D.',                                          true),
  ff('ff-cen-06','f-census','stpBand',                   'STP Band',                             'string', 'Output: straight-through processing eligibility band.',                           true),
  ff('ff-cen-07','f-census','requiredHeadersMissing',    'Required Headers Missing',             'boolean','Output: whether mandatory column headers are absent from the census file.',      true),
  ff('ff-cen-08','f-census','duplicateOnKey',            'Duplicate On Key',                     'boolean','Output: whether duplicate records exist on the unique key.',                      true),
  ff('ff-cen-09','f-census','allEmployeesIncluded',      'All Employees Included',               'boolean','Output: whether the census includes all active employees.',                       true),
  ff('ff-cen-10','f-census','employerEmployeeMixValid',  'Employer-Employee Mix Valid',          'boolean','Output: whether employer and employee data ratio is valid.',                      true),
  ff('ff-cen-11','f-census','outcome',                   'Outcome',                              'string', 'Output: overall census validation outcome.',                                       true),
  /* docs */
  ff('ff-doc-01','f-docs','documentType',                'Document Type',                        'string', 'Document type code (e.g. POLICY_SCHEDULE, CENSUS, KYC_PAN).',                   false),
  ff('ff-doc-02','f-docs','uploadSource',                'Upload Source',                        'string', 'Channel through which document was uploaded: PORTAL, EMAIL, API.',               false),
  ff('ff-doc-03','f-docs','ocrConfidence',               'OCR Confidence',                       'number', 'OCR engine confidence score (0–1) for extracted data accuracy.',                 false),
  ff('ff-doc-04','f-docs','required',                    'Required',                             'boolean','Output: whether this document is required for the current stage.',                true),
  ff('ff-doc-05','f-docs','precedence',                  'Precedence',                           'string', 'Output: document precedence/priority for the verification flow.',                 true),
  ff('ff-doc-06','f-docs','multipleSourcesForDoc',       'Multiple Sources For Doc',             'boolean','Output: whether the same document type exists from multiple sources.',            true),
  ff('ff-doc-07','f-docs','allMandatoryVerifiedOrWaived','All Mandatory Verified or Waived',     'boolean','Output: whether all mandatory documents are verified or explicitly waived.',      true),
  ff('ff-doc-08','f-docs','outcome',                     'Outcome',                              'string', 'Output: overall document gate outcome.',                                           true),
  /* kyc */
  ff('ff-kyc-01','f-kyc','entityType',                   'Entity Type',                          'string', 'KYC entity type: INDIVIDUAL, COMPANY, TRUST, PARTNERSHIP.',                     false),
  ff('ff-kyc-02','f-kyc','panPresent',                   'PAN Present',                          'boolean','Whether PAN document has been submitted.',                                        false),
  ff('ff-kyc-03','f-kyc','boCertificatePresent',         'BO Certificate Present',               'boolean','Whether Beneficial Ownership certificate has been submitted.',                   false),
  ff('ff-kyc-04','f-kyc','panFormatValid',               'PAN Format Valid',                     'boolean','Output: whether the PAN number format is valid.',                                 true),
  ff('ff-kyc-05','f-kyc','cinValidated',                 'CIN Validated',                        'boolean','Output: whether the Corporate Identification Number has been validated.',         true),
  ff('ff-kyc-06','f-kyc','pepMatch',                     'PEP Match',                            'boolean','Output: whether a Politically Exposed Person match was found.',                   true),
  ff('ff-kyc-07','f-kyc','newSignatoryKycMissing',       'New Signatory KYC Missing',            'boolean','Output: whether KYC documents for a new signatory are missing.',                 true),
  ff('ff-kyc-08','f-kyc','outcome',                      'Outcome',                              'string', 'Output: overall KYC verification outcome.',                                       true),
  /* approval */
  ff('ff-apr-01','f-approval','originatorId',            'Originator ID',                        'string', 'User ID of the person who originated the approval request.',                    false),
  ff('ff-apr-02','f-approval','approverId',              'Approver ID',                          'string', 'User ID of the assigned approver.',                                               false),
  ff('ff-apr-03','f-approval','twoOfficerId',            'Two-Officer ID',                       'string', 'Output: second officer ID required for dual-control approvals.',                  true),
  ff('ff-apr-04','f-approval','state',                   'State',                                'string', 'Output: current state in the approval workflow.',                                  true),
  ff('ff-apr-05','f-approval','status',                  'Status',                               'string', 'Output: approval status: PENDING, APPROVED, REJECTED, ESCALATED.',               true),
  ff('ff-apr-06','f-approval','action',                  'Action',                               'string', 'Output: approval action to execute.',                                             true),
  ff('ff-apr-07','f-approval','reasonCode',              'Reason Code',                          'string', 'Output: reason code for the approval decision.',                                  true),
  ff('ff-apr-08','f-approval','duplicateScopeExists',    'Duplicate Scope Exists',               'boolean','Output: whether a duplicate approval scope is already in flight.',               true),
  ff('ff-apr-09','f-approval','outcome',                 'Outcome',                              'string', 'Output: overall approval outcome.',                                               true),
  /* product */
  ff('ff-prd-01','f-product','lineOfBusiness',           'Line of Business',                     'string', 'Product line: GTL, GPA, GMED, GHLI, ULIP, TERM.',                               false),
  ff('ff-prd-02','f-product','variant',                  'Variant',                              'string', 'Product variant or sub-type code.',                                               false),
  ff('ff-prd-03','f-product','schemeType',               'Scheme Type',                          'string', 'Allowed scheme types for this product.',                                          false),
  ff('ff-prd-04','f-product','premiumType',              'Premium Type',                         'string', 'Premium structure: ANNUAL, SINGLE, LIMITED_PAY.',                                 false),
  ff('ff-prd-05','f-product','minGroupSize',             'Minimum Group Size',                   'number', 'Minimum number of lives required for group eligibility.',                         false),
  ff('ff-prd-06','f-product','nonMedicalAgeCap',         'Non-Medical Age Cap',                  'number', 'Maximum age for non-medical underwriting.',                                       false),
  ff('ff-prd-07','f-product','smokerDifferentiation',    'Smoker Differentiation',               'boolean','Whether the product differentiates premium by smoking status.',                  false),
  ff('ff-prd-08','f-product','jointLife',                'Joint Life',                           'boolean','Whether the product supports joint-life policies.',                               false),
  ff('ff-prd-09','f-product','taxBenefit',               'Tax Benefit',                          'string', 'Tax benefit section code applicable to the product.',                            false),
  ff('ff-prd-10','f-product','gstException',             'GST Exception',                        'boolean','Whether the product has a GST exemption.',                                        false),
  ff('ff-prd-11','f-product','micro',                    'Micro',                                'boolean','Whether this is a micro-insurance product.',                                      false),
  ff('ff-prd-12','f-product','maxSwitchesPerYear',       'Max Switches Per Year',                'number', 'Maximum ULIP fund switches allowed per policy year.',                            false),
  ff('ff-prd-13','f-product','minSwitchAmount',          'Minimum Switch Amount',                'number', 'Minimum amount per ULIP fund switch.',                                            false),
  ff('ff-prd-14','f-product','minPremiumFloor',          'Minimum Premium Floor',                'number', 'Minimum allowable premium for this product.',                                     false),
  /* signature */
  ff('ff-sig-01','f-sig','signatureMode',                'Signature Mode',                       'string', 'Mode of signature: WET, DIGITAL, AADHAAR_ESIGN.',                               false),
  ff('ff-sig-02','f-sig','signedOn',                     'Signed On',                            'date',   'Date on which the document was signed.',                                          false),
  ff('ff-sig-03','f-sig','wetSigPresent',                'Wet Signature Present',                'boolean','Whether a physical wet signature is present on the document.',                   false),
  ff('ff-sig-04','f-sig','signatoryValid',               'Signatory Valid',                      'boolean','Output: whether the signatory is authorised to sign.',                            true),
  ff('ff-sig-05','f-sig','signatoryAuthorityExpired',    'Signatory Authority Expired',          'boolean','Output: whether the signatory authorisation has expired.',                        true),
  ff('ff-sig-06','f-sig','outcome',                      'Outcome',                              'string', 'Output: signature verification outcome.',                                          true),
  /* bank */
  ff('ff-bnk-01','f-bank','pennyDropFuzzyScore',         'Penny Drop Fuzzy Score',               'number', 'Fuzzy match score between penny drop response name and KYC name.',               false),
  ff('ff-bnk-02','f-bank','verifyOutcome',               'Verify Outcome',                       'string', 'Output: bank account verification result: VERIFIED, FAILED, MISMATCH.',          true),
  ff('ff-bnk-03','f-bank','outcome',                     'Outcome',                              'string', 'Output: overall bank verification outcome.',                                       true),
  /* override */
  ff('ff-ovr-01','f-override','rateDeviationPct',        'Rate Deviation %',                     'number', 'Requested rate deviation as a percentage.',                                       false),
  ff('ff-ovr-02','f-override','action',                  'Action',                               'string', 'Override action type: APPROVE, REJECT, ESCALATE.',                               false),
  ff('ff-ovr-03','f-override','reasonCode',              'Reason Code',                          'string', 'Reason code justifying the override request.',                                    false),
  ff('ff-ovr-04','f-override','status',                  'Status',                               'string', 'Output: current override status.',                                                 true),
  /* tax */
  ff('ff-tax-01','f-tax','gstTreatment',                 'GST Treatment',                        'string', 'Output: GST treatment applied: STANDARD, EXEMPT, REVERSE_CHARGE.',               true),
  ff('ff-tax-02','f-tax','hsnCode',                      'HSN Code',                             'string', 'Output: Harmonised System of Nomenclature code for the insurance product.',      true),
  ff('ff-tax-03','f-tax','stampDuty',                    'Stamp Duty',                           'number', 'Output: computed stamp duty amount.',                                              true),
  ff('ff-tax-04','f-tax','stampDutyRate',                'Stamp Duty Rate',                      'number', 'Output: stamp duty rate applicable by jurisdiction.',                             true),
  /* billing */
  ff('ff-bil-01','f-billing','frequency',                'Frequency',                            'string', 'Billing frequency: ANNUAL, SEMI_ANNUAL, QUARTERLY, MONTHLY.',                   false),
  ff('ff-bil-02','f-billing','outcome',                  'Outcome',                              'string', 'Output: billing processing outcome.',                                              true),
  /* plan */
  ff('ff-pln-01','f-plan','saType',                      'SA Type',                              'string', 'Sum assured type: FLAT, MULTIPLE_OF_SALARY, LOAN_OUTSTANDING.',                 false),
  /* quote */
  ff('ff-qut-01','f-quote','type',                       'Type',                                 'string', 'Quote type: NEW_BUSINESS, RENEWAL, ENDORSEMENT, REINSTATEMENT.',                 false),
  /* base plan */
  ff('ff-bas-01','f-base','termYears',                   'Term (Years)',                         'number', 'Base plan policy term in years.',                                                  false),
  ff('ff-bas-02','f-base','jointLifeCapable',            'Joint Life Capable',                   'boolean','Whether the base plan supports a joint-life structure.',                          false),
  /* broker */
  ff('ff-brk-01','f-broker','tier',                      'Tier',                                 'string', 'Broker tier classification: PLATINUM, GOLD, SILVER, DIRECT.',                   false),
  ff('ff-brk-02','f-broker','packageSubmission',         'Package Submission',                   'boolean','Whether the broker submitted a package deal for volume discount.',               false),
  /* promo */
  ff('ff-prm-01','f-promo','q4Active',                   'Q4 Active',                            'boolean','Whether the Q4 promotional campaign is active for this scheme.',                 false),
  /* rate card */
  ff('ff-rct-01','f-rateCard','insurerMatchesProfile',   'Insurer Matches Profile',              'boolean','Output: whether the selected insurer matches the scheme risk profile.',           true),
  ff('ff-rct-02','f-rateCard','windowViolatesEffectiveDate','Window Violates Effective Date',    'boolean','Output: whether the rate card window conflicts with the effective date.',         true),
  /* refund */
  ff('ff-rfd-01','f-refund','amount',                    'Amount',                               'number', 'Output: computed refund amount for policy cancellation.',                         true),
  /* request */
  ff('ff-req-01','f-request','policyLoan',               'Policy Loan',                          'boolean','Whether the request includes a policy loan component.',                           false),
  ff('ff-req-02','f-request','outcome',                  'Outcome',                              'string', 'Output: overall request processing outcome.',                                      true),
  /* revival */
  ff('ff-rvv-01','f-revival','interestRate',             'Interest Rate',                        'number', 'Output: interest rate applicable on arrears for policy revival.',                  true),
  /* endorsement */
  ff('ff-end-01','f-endorsement','type',                 'Type',                                 'string', 'Endorsement type: ADD_MEMBER, REMOVE_MEMBER, SA_CHANGE, RIDER_ADD.',             false),
  ff('ff-end-02','f-endorsement','premiumAdjustment',    'Premium Adjustment',                   'number', 'Output: premium adjustment amount for the endorsement.',                          true),
  /* ulip */
  ff('ff-ulp-01','f-ulip','annualSwitchCount',           'Annual Switch Count',                  'number', 'Number of fund switches executed in the current policy year.',                   false),
  ff('ff-ulp-02','f-ulip','switchAmount',                'Switch Amount',                        'number', 'Amount being switched between ULIP funds.',                                       false),
  ff('ff-ulp-03','f-ulip','switchOutcome',               'Switch Outcome',                       'string', 'Output: ULIP fund switch decision: ALLOWED, REJECTED.',                           true),
  /* composition */
  ff('ff-cmp-01','f-composition','schemeTypeMix',        'Scheme Type Mix',                      'string', 'Mix of scheme types in a multi-part group arrangement.',                         false),
  ff('ff-cmp-02','f-composition','outcome',              'Outcome',                              'string', 'Output: composition validation outcome.',                                          true),
  /* compliance */
  ff('ff-cpl-01','f-compliance','sec38_39',              'Sec 38 / 39 Compliance',               'string', 'Output: IRDAI Section 38/39 nomination/assignment compliance status.',            true),
  /* life questionnaire */
  ff('ff-lfq-01','f-lfq','adversityNoted',               'Adversity Noted',                      'boolean','Output: whether an adverse medical history was noted in the LFQ.',               true),
  /* loan */
  ff('ff-lon-01','f-loan','foreclosed',                  'Foreclosed',                           'boolean','Whether the underlying loan has been foreclosed.',                               false),
  /* medical */
  ff('ff-med-01','f-medical','previousMedicalsValid',    'Previous Medicals Valid',              'boolean','Output: whether previously submitted medical evidence remains valid.',             true),
  ff('ff-med-02','f-medical','previousTestValid',        'Previous Test Valid',                  'boolean','Output: whether a specific prior medical test is still within validity.',         true),
  /* data */
  ff('ff-dat-01','f-data','piiField',                    'PII Field',                            'boolean','Whether the data field contains personally identifiable information.',            false),
  ff('ff-dat-02','f-data','storageOutcome',              'Storage Outcome',                      'string', 'Output: data storage/masking processing outcome.',                                true),
  /* authority */
  ff('ff-aut-01','f-authority','maxRateDeviationPct',    'Max Rate Deviation %',                 'number', 'Maximum rate deviation percentage permitted under delegated authority.',          false),
  /* irdai */
  ff('ff-ird-01','f-irdai','rateFloor',                  'Rate Floor',                           'number', 'IRDAI minimum rate floor for the product.',                                       false),
  /* float receipt */
  ff('ff-flr-01','f-floatReceipt','varianceExceedsTolerance','Variance Exceeds Tolerance',       'boolean','Output: whether float receipt variance exceeds the allowed tolerance.',          true),
  ff('ff-flr-02','f-floatReceipt','outcome',             'Outcome',                              'string', 'Output: float receipt reconciliation outcome.',                                    true),
  /* float transfer */
  ff('ff-flt-01','f-floatTransfer','utr',                'UTR',                                  'string', 'Unique Transaction Reference for the float transfer.',                            false),
  ff('ff-flt-02','f-floatTransfer','crossLegalEntityValid','Cross Legal Entity Valid',           'boolean','Output: whether the inter-entity float transfer is structurally valid.',          true),
  ff('ff-flt-03','f-floatTransfer','outcome',            'Outcome',                              'string', 'Output: float transfer processing outcome.',                                       true),
  /* master policy holder */
  ff('ff-mph-01','f-mph','corporate',                    'Corporate',                            'boolean','Whether the master policy holder is a corporate entity.',                         false),
  ff('ff-mph-02','f-mph','rbiRegulated',                 'RBI Regulated',                        'boolean','Whether the master policy holder is an RBI-regulated entity.',                   false),
  /* action */
  ff('ff-act-01','f-action','type',                      'Type',                                 'string', 'Action/trigger type passed to the rule engine for context.',                     false),
  /* termination */
  ff('ff-trm-01','f-termination','initiatedBy',          'Initiated By',                         'string', 'Who initiated the termination: POLICYHOLDER, INSURER, REGULATOR.',              false),
  ff('ff-trm-02','f-termination','noticeDays',           'Notice Days',                          'number', 'Number of days notice given before termination effective date.',                  false),
  ff('ff-trm-03','f-termination','outcome',              'Outcome',                              'string', 'Output: termination processing outcome.',                                          true),
  /* settlement */
  ff('ff-stl-01','f-settlement','bankRejected',          'Bank Rejected',                        'boolean','Whether the settlement payment was rejected by the bank.',                       false),
  ff('ff-stl-02','f-settlement','outcome',               'Outcome',                              'string', 'Output: claims settlement outcome.',                                               true),
];

const mkVer = (
  version: number, status: string, desc: string, summary: string, from: string, rule: RuleContent,
  activatedAt?: string,
): RuleVersion => ({
  id: uid(), version, status, description: desc, changeSummary: summary,
  effectiveFrom: from, effectiveUntil: null,
  activatedAt: status === 'ACTIVE' ? (activatedAt || '2025-06-01T09:00:00') : null,
  activatedBy: status === 'ACTIVE' ? 'alice@insure.com' : null,
  rule,
});

// ── local seed helpers (not exported) ──────────────
const _c = (field: string, op: string, val = '', val2 = ''): Condition => ({ id: uid(), field, operator: op, value: val, secondValue: val2, dataType: '' });
const _a = (type: string, field: string, val = '', cfg: Record<string, unknown> = {}): RuleAction => ({ id: uid(), type, field, value: val, dataType: '', config: cfg });

export const SEED_RULES: Rule[] = [
  /* ── UC-A · Motor Pricing ─────────────────────── */
  {
    id: 'r-mbpl', name: 'Motor Base Premium Lookup', category: 'Pricing',
    tags: ['motor', 'premium', 'lookup'], createdAt: '2024-10-05T08:00:00', createdBy: 'alice@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Basic vehicleType-only premium lookup. Region dimension not yet included.',
        'Initial Release', '2025-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.vehicleType', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'pricing.basePremium', 'motor_base_premium_table', { key: 'policy.vehicleType' }),
        ])),
      mkVer(2, 'INACTIVE',
        'Added region as a secondary lookup key for geographic pricing variation.',
        'Region Factor Added', '2025-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.vehicleType', 'IS_NOT_NULL'), _c('policy.region', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'pricing.basePremium', 'motor_base_premium_table', { compositeKey: 'policy.vehicleType|policy.region' }),
        ])),
      mkVer(3, 'INACTIVE',
        'Introduced vehicle age as a third lookup dimension. Removed after actuarial review found it redundant.',
        'Vehicle Age Dimension Pilot', '2025-05-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.vehicleType', 'IS_NOT_NULL'), _c('policy.vehicleAge', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'pricing.basePremium', 'motor_base_premium_table', { compositeKey: 'policy.vehicleType|policy.region|policy.vehicleAge' }),
        ])),
      mkVer(4, 'ACTIVE',
        'Stable two-dimension lookup. Adds EV classification flag for downstream discount application.',
        'EV Classification & Stable Composite Key', '2025-09-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.vehicleType', 'IS_NOT_NULL'), _c('policy.region', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'pricing.basePremium', 'motor_base_premium_table', { compositeKey: 'policy.vehicleType|policy.region' }),
          _a('ASSIGN', 'pricing.evBandApplied', 'false'),
          _a('ADD_MESSAGE', '', '', { template: 'Base premium {{pricing.basePremium}} for {{policy.vehicleType}} / {{policy.region}}.' }),
        ]), '2025-09-15T09:00:00'),
      mkVer(5, 'PEER_REVIEW',
        'Proposed: align premium bands to Q3 2025 actuarial model with new SUV and EV sub-bands.',
        'Premium Band Restructure — Q3 Actuarial Review', '2025-12-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.vehicleType', 'IS_NOT_NULL'), _c('policy.region', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'pricing.basePremium', 'motor_base_premium_table_v2', { compositeKey: 'policy.vehicleType|policy.region' }),
        ])),
      mkVer(6, 'DRAFT',
        'Draft: auto-derive region from policy.pincode before lookup, removing manual region entry dependency.',
        'Dynamic Region Derivation from Pincode', '2026-02-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.vehicleType', 'IS_NOT_NULL'), _c('policy.pincode', 'IS_NOT_NULL')] }, [
          _a('COMPUTE', 'policy.region', 'PINCODE_REGION_MAP[policy.pincode]'),
          _a('LOOKUP', 'pricing.basePremium', 'motor_base_premium_table', { compositeKey: 'policy.vehicleType|policy.region' }),
        ])),
    ],
  },
  {
    id: 'r-mncbl', name: 'Motor NCB Rate Lookup', category: 'Pricing',
    tags: ['motor', 'ncb', 'lookup'], createdAt: '2024-10-05T08:00:00', createdBy: 'alice@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Basic NCB lookup using claimFreeYears only. No cap enforcement.',
        'Initial Release', '2025-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.claimFreeYears', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'pricing.ncbDiscountPct', 'motor_ncb_rate_table', { key: 'policy.claimFreeYears' }),
        ])),
      mkVer(2, 'INACTIVE',
        'Added 50% cap enforcement on NCB discount to prevent over-discounting on long-tenure policies.',
        'Bonus Cap Enforcement at 50%', '2025-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.claimFreeYears', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'pricing.ncbDiscountPct', 'motor_ncb_rate_table', { key: 'policy.claimFreeYears' }),
          _a('ASSIGN', 'pricing.ncbCapped', 'false'),
        ])),
      mkVer(3, 'INACTIVE',
        'Switched to tiered NCB table with loyalty bonus for policies > 5 years.',
        'Tiered Discount with Loyalty Bonus', '2025-06-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.claimFreeYears', 'IS_NOT_NULL'), _c('policy.tenure', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'pricing.ncbDiscountPct', 'motor_ncb_tiered_table', { compositeKey: 'policy.claimFreeYears|policy.tenure' }),
        ])),
      mkVer(4, 'ACTIVE',
        'Stable tiered NCB lookup with loyalty bonus and 50% regulatory cap. Writes ncbDiscountPct and ncbBand.',
        'Stable Tiered NCB with Regulatory Cap', '2025-09-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.claimFreeYears', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'pricing.ncbDiscountPct', 'motor_ncb_rate_table', { key: 'policy.claimFreeYears' }),
          _a('ADD_MESSAGE', '', '', { template: 'NCB discount {{pricing.ncbDiscountPct}}% for {{policy.claimFreeYears}} claim-free years.' }),
        ]), '2025-09-10T11:00:00'),
      mkVer(5, 'COMPLIANCE_REVIEW',
        'Proposed: align NCB schedule to IRDAI 2025 circular with revised maximum discount bands.',
        'IRDAI 2025 NCB Schedule Alignment', '2025-12-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.claimFreeYears', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'pricing.ncbDiscountPct', 'motor_ncb_irdai_2025_table', { key: 'policy.claimFreeYears' }),
        ])),
      mkVer(6, 'DRAFT',
        'Draft: use rolling 5-year claim history instead of consecutive claim-free years for more accurate NCB.',
        'Rolling 5-Year Claim History Window', '2026-02-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.claimHistoryYears', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'pricing.ncbDiscountPct', 'motor_ncb_rolling_table', { key: 'policy.claimHistoryYears' }),
        ])),
    ],
  },
  {
    id: 'r-mydl', name: 'Motor Young Driver Surcharge', category: 'Pricing',
    tags: ['motor', 'loading', 'young-driver'], createdAt: '2024-10-05T08:00:00', createdBy: 'alice@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Flat 15% surcharge for all drivers under 25. No telematics or exception handling.',
        'Initial Release', '2025-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('driver.age', 'LESS_THAN', '25')] }, [
          _a('APPLY_PERCENTAGE', 'pricing.basePremium', '15', { mode: 'surcharge' }),
        ])),
      mkVer(2, 'INACTIVE',
        'Lowered age threshold to 23 after actuarial data showed higher risk persists to age 23.',
        'Threshold Adjusted to Under-23', '2025-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('driver.age', 'LESS_THAN', '23'), _c('pricing.basePremium', 'IS_NOT_NULL')] }, [
          _a('APPLY_PERCENTAGE', 'pricing.basePremium', '15', { mode: 'surcharge' }),
          _a('ADD_TO_LIST', 'pricing.loadingReasons', 'YOUNG_DRIVER_SURCHARGE_15PCT'),
        ])),
      mkVer(3, 'INACTIVE',
        'Added telematics override: exempt drivers under 25 if telematics safety score exceeds 80.',
        'Telematics Score Exemption', '2025-05-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('driver.age', 'LESS_THAN', '25'), _c('driver.telematicsScore', 'LESS_THAN_OR_EQUAL', '80')] }, [
          _a('APPLY_PERCENTAGE', 'pricing.basePremium', '15', { mode: 'surcharge' }),
          _a('ADD_TO_LIST', 'pricing.loadingReasons', 'YOUNG_DRIVER_SURCHARGE_15PCT'),
        ])),
      mkVer(4, 'ACTIVE',
        'Stable 15% surcharge for drivers under 25 with full audit trail and base premium validation.',
        'Standard Surcharge with Audit Trail', '2025-08-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('driver.age', 'LESS_THAN', '25'), _c('pricing.basePremium', 'IS_NOT_NULL')] }, [
          _a('APPLY_PERCENTAGE', 'pricing.basePremium', '15', { mode: 'surcharge' }),
          _a('ADD_TO_LIST', 'pricing.loadingReasons', 'YOUNG_DRIVER_SURCHARGE_15PCT'),
          _a('ADD_MESSAGE', '', '', { template: 'Young driver surcharge 15% applied. Driver age: {{driver.age}}.' }),
        ]), '2025-08-12T10:00:00'),
      mkVer(5, 'APPROVED',
        'Graduated loading: 20% for under-21, 10% for 21-24. Approved by pricing committee.',
        'Graduated Loading by Age Band', '2025-11-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('driver.age', 'LESS_THAN', '25'), _c('pricing.basePremium', 'IS_NOT_NULL')] }, [
          _a('APPLY_PERCENTAGE', 'pricing.basePremium', '20', { mode: 'surcharge' }),
          _a('ADD_TO_LIST', 'pricing.loadingReasons', 'YOUNG_DRIVER_SURCHARGE_GRADUATED'),
        ])),
      mkVer(6, 'PEER_REVIEW',
        'Proposed: integrate telematics score as a loading modifier — high-score drivers get reduced surcharge.',
        'Enhanced Telematics Integration', '2026-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('driver.age', 'LESS_THAN', '25'), _c('driver.telematicsScore', 'IS_NOT_NULL')] }, [
          _a('COMPUTE', 'pricing.youngDriverLoading', '(driver.telematicsScore > 80) ? 0.05 : 0.15'),
          _a('APPLY_PERCENTAGE', 'pricing.basePremium', 'pricing.youngDriverLoading', { mode: 'surcharge' }),
        ])),
      mkVer(7, 'DRAFT',
        'Draft: split 25% for under-19 and 10% for 19-24 to better reflect risk data from 2025 actuarial study.',
        'Age Band Pilot — Under-19 vs 19-24 Split', '2026-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('driver.age', 'LESS_THAN', '25'), _c('pricing.basePremium', 'IS_NOT_NULL')] }, [
          _a('APPLY_PERCENTAGE', 'pricing.basePremium', '25', { mode: 'surcharge' }),
        ])),
    ],
  },

  /* ── UC-B · Maternity Waiting Period ─────────── */
  {
    id: 'r-hmwp', name: 'Maternity Waiting Period Check', category: 'Compliance',
    tags: ['health', 'maternity', 'eligibility', 'blocker'], createdAt: '2024-11-01T08:00:00', createdBy: 'carol@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Blocks maternity claims with < 24 months continuous coverage. Missing lapse check — superseded by v2.',
        'Initial version', '2025-02-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('claim.benefitCode', 'EQUALS', 'MATERNITY'), _c('policy.continuousCoverageMonths', 'LESS_THAN', '24')] }, [
          _a('ASSIGN', 'claim.eligible', 'false'),
          _a('ADD_TO_LIST', 'claim.rejectionReasons', 'MATERNITY_WAITING_PERIOD_NOT_SERVED'),
        ])),
      mkVer(2, 'INACTIVE',
        'Blocks maternity claims with < 24 months continuous coverage or a lapse in the last 24 months. Validates treatment date falls within the active policy window.',
        'Lapse Check & DATE_BETWEEN Validation', '2025-06-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('claim.benefitCode', 'EQUALS', 'MATERNITY'),
          _c('policy.continuousCoverageMonths', 'LESS_THAN', '24'),
          _c('policy.hasLapseInLast24Months', 'EQUALS', 'true'),
          _c('claim.treatmentDate', 'DATE_BETWEEN', 'policy.inceptionDate', 'policy.expiryDate'),
        ]}, [
          _a('ASSIGN', 'claim.eligible', 'false'),
          _a('ADD_TO_LIST', 'claim.rejectionReasons', 'MATERNITY_WAITING_PERIOD_NOT_SERVED'),
          _a('ADD_MESSAGE', '', '', { template: 'Maternity requires 24 months continuous coverage. Current: {{policy.continuousCoverageMonths}}.' }),
        ])),
      mkVer(3, 'ACTIVE',
        'Added strict treatment-date range check and improved rejection message with lapse details.',
        'Strict Policy Window & Improved Messaging', '2025-09-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('claim.benefitCode', 'EQUALS', 'MATERNITY'),
          _c('policy.continuousCoverageMonths', 'LESS_THAN', '24'),
          _c('claim.treatmentDate', 'DATE_BETWEEN', 'policy.inceptionDate', 'policy.expiryDate'),
        ]}, [
          _a('ASSIGN', 'claim.eligible', 'false'),
          _a('ADD_TO_LIST', 'claim.rejectionReasons', 'MATERNITY_WAITING_PERIOD_NOT_SERVED'),
          _a('ADD_MESSAGE', '', '', { template: 'Maternity waiting period not served. Coverage: {{policy.continuousCoverageMonths}} months.' }),
        ]), '2025-09-05T09:00:00'),
      mkVer(4, 'COMPLIANCE_REVIEW',
        'Proposed: align waiting period rules to IRDAI 2025 circular — reduce threshold to 18 months for portability cases.',
        'IRDAI 2025 Portability Threshold Reduction', '2025-12-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('claim.benefitCode', 'EQUALS', 'MATERNITY'),
          _c('policy.continuousCoverageMonths', 'LESS_THAN', '18'),
          _c('policy.isPortability', 'EQUALS', 'false'),
        ]}, [
          _a('ASSIGN', 'claim.eligible', 'false'),
          _a('ADD_TO_LIST', 'claim.rejectionReasons', 'MATERNITY_WAITING_PERIOD_NOT_SERVED'),
        ])),
      mkVer(5, 'PEER_REVIEW',
        'Proposed: add pre-existing condition exclusion branch — reject maternity claims if pre-existing condition declared at inception.',
        'Pre-Existing Condition Exclusion Branch', '2026-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('claim.benefitCode', 'EQUALS', 'MATERNITY'),
          _c('policy.preExistingDeclared', 'EQUALS', 'true'),
        ]}, [
          _a('ASSIGN', 'claim.eligible', 'false'),
          _a('ADD_TO_LIST', 'claim.rejectionReasons', 'PRE_EXISTING_MATERNITY_EXCLUSION'),
        ])),
      mkVer(6, 'DRAFT',
        'Draft: pilot 12-month waiting period for employer group policies as per proposed group health guidelines.',
        '12-Month Waiting Period — Group Policy Pilot', '2026-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('claim.benefitCode', 'EQUALS', 'MATERNITY'),
          _c('policy.policyType', 'EQUALS', 'GROUP'),
          _c('policy.continuousCoverageMonths', 'LESS_THAN', '12'),
        ]}, [
          _a('ASSIGN', 'claim.eligible', 'false'),
        ])),
    ],
  },
  {
    id: 'r-hmwr', name: 'Maternity Coverage Reset on Lapse', category: 'Compliance',
    tags: ['health', 'maternity', 'lapse', 'reset'], createdAt: '2024-11-01T08:00:00', createdBy: 'carol@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Resets coverage clock when lapse gap exceeds 30 days. No partial lapse detection.',
        'Initial Release', '2025-02-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.lapseGapDays', 'GREATER_THAN', '30'), _c('policy.reinstatementDate', 'IS_NOT_NULL')] }, [
          _a('ASSIGN', 'policy.hasLapseInLast24Months', 'true'),
          _a('ASSIGN', 'policy.continuousCoverageMonths', '0'),
        ])),
      mkVer(2, 'INACTIVE',
        'Added partial lapse detection for gaps between 15-30 days — applies partial coverage reduction instead of full reset.',
        'Partial Lapse Handling (15-30 Days)', '2025-04-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.lapseGapDays', 'GREATER_THAN', '15'), _c('policy.reinstatementDate', 'IS_NOT_NULL')] }, [
          _a('ASSIGN', 'policy.hasLapseInLast24Months', 'true'),
          _a('ASSIGN', 'policy.continuousCoverageMonths', '0'),
          _a('ADD_MESSAGE', '', '', { template: 'Coverage clock reset. Gap: {{policy.lapseGapDays}} days.' }),
        ])),
      mkVer(3, 'INACTIVE',
        'Added 7-day grace period: lapses under 7 days do not trigger a reset. Approved by compliance team.',
        'Grace Period Exception (Under 7 Days)', '2025-07-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.lapseGapDays', 'GREATER_THAN', '7'), _c('policy.reinstatementDate', 'IS_NOT_NULL')] }, [
          _a('ASSIGN', 'policy.hasLapseInLast24Months', 'true'),
          _a('ASSIGN', 'policy.continuousCoverageMonths', '0'),
        ])),
      mkVer(4, 'ACTIVE',
        'Stable version with 30-day lapse threshold, full audit message, and reinstatement date validation.',
        'Stable 30-Day Threshold with Full Audit', '2025-10-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.lapseGapDays', 'GREATER_THAN', '30'), _c('policy.reinstatementDate', 'IS_NOT_NULL')] }, [
          _a('ASSIGN', 'policy.hasLapseInLast24Months', 'true'),
          _a('ASSIGN', 'policy.continuousCoverageMonths', '0'),
          _a('ADD_MESSAGE', '', '', { template: 'Coverage clock reset. Lapse gap: {{policy.lapseGapDays}} days. Reinstated: {{policy.reinstatementDate}}.' }),
        ]), '2025-10-08T09:00:00'),
      mkVer(5, 'BUSINESS_REVIEW',
        'Proposed: increase lapse threshold to 45 days and flag reinstatement cases for manual underwriting review.',
        'Extended 45-Day Threshold & UW Review Flag', '2025-12-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.lapseGapDays', 'GREATER_THAN', '45'), _c('policy.reinstatementDate', 'IS_NOT_NULL')] }, [
          _a('ASSIGN', 'policy.hasLapseInLast24Months', 'true'),
          _a('ASSIGN', 'policy.continuousCoverageMonths', '0'),
          _a('ADD_TO_LIST', 'policy.reviewFlags', 'REINSTATEMENT_UW_REVIEW'),
        ])),
      mkVer(6, 'DRAFT',
        'Draft: automated reinstatement flag to trigger a pre-issuance health declaration for lapse gap > 60 days.',
        'Automated Reinstatement Health Declaration Trigger', '2026-02-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.lapseGapDays', 'GREATER_THAN', '60')] }, [
          _a('ASSIGN', 'policy.requiresReinstatementDeclaration', 'true'),
          _a('ASSIGN', 'policy.continuousCoverageMonths', '0'),
        ])),
    ],
  },

  /* ── UC-C · Critical Illness Rider ───────────── */
  {
    id: 'r-ciree', name: 'CI Rider Eligibility Check', category: 'Underwriting',
    tags: ['ci-rider', 'eligibility', 'bmi', 'diabetic'], createdAt: '2024-12-01T08:00:00', createdBy: 'alice@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Basic CI rider eligibility: age 18–60, no pre-existing conditions, BMI < 32. No exception handling.',
        'Initial version', '2025-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('applicant.age', 'BETWEEN', '18', '60'), _c('applicant.preExistingConditions', 'IS_NULL'), _c('applicant.bmi', 'LESS_THAN', '32')] }, [
          _a('ASSIGN', 'rider.ciEligible', 'true'),
        ])),
      mkVer(2, 'ACTIVE',
        'CI rider eligibility with BMI exception (32–35, UW score > 85) and diabetic exception (HbA1c < 7, no complications).',
        'Added borderline BMI and diabetic OR exception branches', '2025-04-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('applicant.age', 'BETWEEN', '18', '60'), _c('applicant.preExistingConditions', 'IS_NULL'), _c('applicant.bmi', 'LESS_THAN', '32')] }, [
          _a('ASSIGN', 'rider.ciEligible', 'true'),
          _a('ADD_MESSAGE', '', '', { template: 'CI rider approved. Age: {{applicant.age}}, BMI: {{applicant.bmi}}.' }),
        ]), '2025-04-11T09:30:00'),
      mkVer(3, 'INACTIVE',
        'Proposed: raise HbA1c threshold to < 7.5 for well-controlled diabetics per medical advisory board.',
        'HbA1c Threshold Relaxation Proposal', '2025-11-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('applicant.age', 'BETWEEN', '18', '60'), _c('applicant.hba1c', 'LESS_THAN', '7.5')] }, [
          _a('ASSIGN', 'rider.ciEligible', 'true'),
        ])),
      mkVer(4, 'ACTIVE',
        'Approved HbA1c relaxation to 7.5 along with controlled hypertension exception (BP < 140/90, on stable medication).',
        'HbA1c 7.5 & Hypertension Exception', '2025-12-15T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('applicant.age', 'BETWEEN', '18', '60'),
          _c('applicant.hba1c', 'LESS_THAN', '7.5'),
          _c('applicant.bmi', 'LESS_THAN', '35'),
        ]}, [
          _a('ASSIGN', 'rider.ciEligible', 'true'),
          _a('ADD_MESSAGE', '', '', { template: 'CI rider approved with exceptions. HbA1c: {{applicant.hba1c}}, BMI: {{applicant.bmi}}.' }),
        ]), '2025-12-20T09:00:00'),
      mkVer(5, 'COMPLIANCE_REVIEW',
        'Proposed: align eligibility criteria to Mental Health Parity Act — mental health conditions must not disqualify CI rider.',
        'Mental Health Parity Compliance Update', '2026-01-15T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('applicant.age', 'BETWEEN', '18', '60'),
          _c('applicant.preExistingConditions', 'NOT_IN', 'CANCER,CARDIAC_ARREST,STROKE'),
        ]}, [
          _a('ASSIGN', 'rider.ciEligible', 'true'),
        ])),
      mkVer(6, 'PEER_REVIEW',
        'Proposed: allow remote health assessment via telehealth platform as an alternative to in-person medical exam.',
        'Remote Health Assessment Integration', '2026-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('applicant.age', 'BETWEEN', '18', '60'),
          _c('applicant.telehealthAssessmentCompleted', 'EQUALS', 'true'),
        ]}, [
          _a('ASSIGN', 'rider.ciEligible', 'true'),
          _a('ASSIGN', 'rider.assessmentType', 'TELEHEALTH'),
        ])),
      mkVer(7, 'DRAFT',
        'Draft: introduce a CI rider for 60-70 age band at a loading of 50% on standard premium.',
        'Extended Age Band 60-70 with Loading', '2026-05-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('applicant.age', 'BETWEEN', '60', '70'), _c('applicant.preExistingConditions', 'IS_NULL')] }, [
          _a('ASSIGN', 'rider.ciEligible', 'true'),
          _a('APPLY_PERCENTAGE', 'rider.ciBasePremium', '50', { mode: 'loading' }),
        ])),
    ],
  },
  {
    id: 'r-cisl', name: 'CI Rider Smoker Loading', category: 'Underwriting',
    tags: ['ci-rider', 'loading', 'smoker'], createdAt: '2024-12-01T08:00:00', createdBy: 'alice@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Flat 25% surcharge and doubled waiting period for all smoker profiles. No differentiation by recency.',
        'Initial Release', '2025-04-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('applicant.smokingStatus', 'IN', 'CURRENT_SMOKER,RECENT_QUITTER'), _c('rider.ciEligible', 'EQUALS', 'true')] }, [
          _a('APPLY_PERCENTAGE', 'rider.ciBasePremium', '25', { mode: 'surcharge' }),
          _a('MULTIPLY', 'rider.waitingPeriodMonths', '2'),
        ])),
      mkVer(2, 'INACTIVE',
        'Applies 25% surcharge and doubles waiting period with full audit trail and loading reason tracking.',
        'Audit Trail & Loading Reason Added', '2025-06-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('applicant.smokingStatus', 'IN', 'CURRENT_SMOKER,RECENT_QUITTER'), _c('rider.ciEligible', 'EQUALS', 'true')] }, [
          _a('APPLY_PERCENTAGE', 'rider.ciBasePremium', '25', { mode: 'surcharge' }),
          _a('MULTIPLY', 'rider.waitingPeriodMonths', '2'),
          _a('ADD_TO_LIST', 'rider.loadingReasons', 'SMOKER_LOADING_25PCT'),
          _a('ADD_MESSAGE', '', '', { template: '25% smoker loading. Waiting period doubled. Status: {{applicant.smokingStatus}}.' }),
        ])),
      mkVer(3, 'ACTIVE',
        'Differential loading: 30% for current smokers, 15% for recent quitters (quit within 12 months).',
        'Differential Loading by Smoking Recency', '2025-09-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('applicant.smokingStatus', 'IN', 'CURRENT_SMOKER,RECENT_QUITTER'), _c('rider.ciEligible', 'EQUALS', 'true')] }, [
          _a('APPLY_PERCENTAGE', 'rider.ciBasePremium', '30', { mode: 'surcharge' }),
          _a('MULTIPLY', 'rider.waitingPeriodMonths', '2'),
          _a('ADD_TO_LIST', 'rider.loadingReasons', 'SMOKER_LOADING_DIFFERENTIAL'),
          _a('ADD_MESSAGE', '', '', { template: 'Smoker loading applied. Status: {{applicant.smokingStatus}}.' }),
        ]), '2025-09-18T10:00:00'),
      mkVer(4, 'INACTIVE',
        'Draft: differential loading per updated actuarial tables.',
        'Differential Loading Rate by Smoking Recency', '2025-12-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('applicant.smokingStatus', 'IN', 'CURRENT_SMOKER,RECENT_QUITTER'), _c('rider.ciEligible', 'EQUALS', 'true')] }, [
          _a('APPLY_PERCENTAGE', 'rider.ciBasePremium', '30', { mode: 'surcharge' }),
        ])),
      mkVer(5, 'APPROVED',
        'Reduce loading by 10% for ex-smokers who have been smoke-free for 2+ years with verified cessation records.',
        'Ex-Smoker Cessation Discount', '2026-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('applicant.smokingStatus', 'EQUALS', 'RECENT_QUITTER'), _c('applicant.smokeFreeYears', 'GREATER_THAN_OR_EQUAL', '2')] }, [
          _a('APPLY_PERCENTAGE', 'rider.ciBasePremium', '15', { mode: 'surcharge' }),
          _a('ADD_TO_LIST', 'rider.loadingReasons', 'SMOKER_LOADING_REDUCED_CESSATION'),
        ])),
      mkVer(6, 'DRAFT',
        'Draft: classify nicotine replacement products (vaping, patches) separately with a 10% loading tier.',
        'Nicotine Product Classification Tier', '2026-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('applicant.smokingStatus', 'EQUALS', 'NRT_USER')] }, [
          _a('APPLY_PERCENTAGE', 'rider.ciBasePremium', '10', { mode: 'surcharge' }),
          _a('ADD_TO_LIST', 'rider.loadingReasons', 'NRT_LOADING_10PCT'),
        ])),
    ],
  },

  /* ── UC-D · Claims Fraud Detection ───────────── */
  {
    id: 'r-cfsa', name: 'Fraud Score Aggregator', category: 'Claims',
    tags: ['fraud', 'aggregation', 'scoring'], createdAt: '2025-01-10T08:00:00', createdBy: 'bob@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Basic SUM_LIST aggregation of fraud detection points. No normalization or weighting.',
        'Initial Release', '2025-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.detections', 'IS_NOT_NULL')] }, [
          _a('SUM_LIST', 'fraud.totalScore', 'fraud.detections', { itemField: 'points' }),
        ])),
      mkVer(2, 'INACTIVE',
        'Added debug LOG action and basic null guard for fraud.detections.',
        'Debug Logging & Null Guard', '2025-05-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.detections', 'IS_NOT_NULL')] }, [
          _a('SUM_LIST', 'fraud.totalScore', 'fraud.detections', { itemField: 'points' }),
          _a('LOG', '', '', { message: 'Fraud score: {{fraud.totalScore}}' }),
        ])),
      mkVer(3, 'INACTIVE',
        'Added signal count alongside total score for downstream reporting.',
        'Signal Count Added to Output', '2025-07-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.detections', 'IS_NOT_NULL')] }, [
          _a('SUM_LIST', 'fraud.totalScore', 'fraud.detections', { itemField: 'points' }),
          _a('ASSIGN', 'fraud.signalCount', 'fraud.detections.length'),
          _a('LOG', '', '', { message: 'Fraud score: {{fraud.totalScore}}, signals: {{fraud.signalCount}}' }),
        ])),
      mkVer(4, 'ACTIVE',
        'Sums fraud detection points from fraud.detections into fraud.totalScore. Must run after the fraud signal table.',
        'Stable Aggregation with Signal Count', '2025-10-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.detections', 'IS_NOT_NULL')] }, [
          _a('SUM_LIST', 'fraud.totalScore', 'fraud.detections', { itemField: 'points' }),
          _a('LOG', '', '', { message: 'Fraud score computed: {{fraud.totalScore}}' }),
        ]), '2025-10-12T10:00:00'),
      mkVer(5, 'COMPLIANCE_REVIEW',
        'Proposed: integrate third-party fraud bureau score as an additional input alongside internal signal score.',
        'Third-Party Bureau Score Integration', '2025-12-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.detections', 'IS_NOT_NULL'), _c('fraud.bureauScore', 'IS_NOT_NULL')] }, [
          _a('SUM_LIST', 'fraud.internalScore', 'fraud.detections', { itemField: 'points' }),
          _a('COMPUTE', 'fraud.totalScore', 'fraud.internalScore * 0.7 + fraud.bureauScore * 0.3'),
        ])),
      mkVer(6, 'DRAFT',
        'Draft: hybrid ML + rule-based scoring — ML model score blended with rule signals using configurable weights.',
        'ML Score Hybrid Aggregation', '2026-02-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.detections', 'IS_NOT_NULL'), _c('fraud.mlScore', 'IS_NOT_NULL')] }, [
          _a('SUM_LIST', 'fraud.ruleScore', 'fraud.detections', { itemField: 'points' }),
          _a('COMPUTE', 'fraud.totalScore', 'fraud.ruleScore * 0.6 + fraud.mlScore * 0.4'),
        ])),
    ],
  },
  {
    id: 'r-cfe', name: 'Fraud Score Escalation', category: 'Claims',
    tags: ['fraud', 'escalation', 'review'], createdAt: '2025-01-10T08:00:00', createdBy: 'bob@insure.com',
    versions: [
      mkVer(1, 'DEPRECATED',
        'Threshold of 40 points caused too many false positives — deprecated after recalibration.',
        'Initial version — threshold 40', '2025-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.totalScore', 'GREATER_THAN_OR_EQUAL', '40')] }, [
          _a('ASSIGN', 'claim.decisionLane', 'REVIEW'),
        ])),
      mkVer(2, 'INACTIVE',
        'Escalates claim to REVIEW and creates a FRAUD_INVESTIGATION task when fraud score ≥ 50.',
        'Threshold Raised to 50 — False Positive Fix', '2025-06-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.totalScore', 'GREATER_THAN_OR_EQUAL', '50')] }, [
          _a('ASSIGN', 'claim.decisionLane', 'REVIEW'),
          _a('CREATE_TASK', '', 'FRAUD_INVESTIGATION', { includeFields: ['claim.id', 'fraud.totalScore', 'fraud.detections'] }),
          _a('ADD_MESSAGE', '', '', { template: 'Claim escalated. Fraud score: {{fraud.totalScore}}.' }),
        ])),
      mkVer(3, 'ACTIVE',
        'Stable escalation at score ≥ 50 with FRAUD_INVESTIGATION task and full signal payload.',
        'Stable Escalation with Full Signal Payload', '2025-09-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.totalScore', 'GREATER_THAN_OR_EQUAL', '50')] }, [
          _a('ASSIGN', 'claim.decisionLane', 'REVIEW'),
          _a('CREATE_TASK', '', 'FRAUD_INVESTIGATION', { includeFields: ['claim.id', 'fraud.totalScore', 'fraud.detections'] }),
          _a('ADD_MESSAGE', '', '', { template: 'Claim escalated. Fraud score: {{fraud.totalScore}}. Signals: {{fraud.detections}}.' }),
        ]), '2025-09-08T10:00:00'),
      mkVer(4, 'APPROVED',
        'Approved: tiered escalation — score 50-69 routes to SOFT_REVIEW, score 70+ routes to HARD_REVIEW with immediate block.',
        'Tiered Escalation — Soft vs Hard Review', '2025-11-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.totalScore', 'GREATER_THAN_OR_EQUAL', '50')] }, [
          _a('ASSIGN', 'claim.decisionLane', 'REVIEW'),
          _a('CREATE_TASK', '', 'FRAUD_INVESTIGATION', { includeFields: ['claim.id', 'fraud.totalScore'] }),
        ])),
      mkVer(5, 'PEER_REVIEW',
        'Proposed: add a soft-block lane for scores 40-49 — claim proceeds but triggers enhanced document verification.',
        'Soft Block Lane for Score 40-49', '2026-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.totalScore', 'GREATER_THAN_OR_EQUAL', '40')] }, [
          _a('ASSIGN', 'claim.decisionLane', 'SOFT_REVIEW'),
          _a('ADD_TO_LIST', 'claim.reviewFlags', 'ENHANCED_DOCUMENT_VERIFICATION'),
        ])),
      mkVer(6, 'DRAFT',
        'Draft: auto-decline claims with fraud score ≥ 90 without human review, subject to regulatory approval.',
        'Auto-Decline for Score ≥ 90', '2026-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.totalScore', 'GREATER_THAN_OR_EQUAL', '90')] }, [
          _a('ASSIGN', 'claim.decisionLane', 'AUTO_DECLINE'),
          _a('ADD_MESSAGE', '', '', { template: 'Claim auto-declined. Fraud score: {{fraud.totalScore}}.' }),
        ])),
    ],
  },

  /* ── UC-E · Renewal Loyalty ───────────────────── */
  {
    id: 'r-racc', name: 'Renewal Claim Count Aggregation', category: 'Operations',
    tags: ['renewal', 'aggregation', 'claims'], createdAt: '2025-02-01T08:00:00', createdBy: 'alice@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Aggregates claim count for the last 3 years on ANNUAL_RENEWAL trigger. No mid-term support.',
        'Initial Release', '2025-04-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.triggerType', 'EQUALS', 'ANNUAL_RENEWAL'), _c('policy.claimHistory', 'IS_NOT_NULL')] }, [
          _a('SUM_LIST', 'renewal.claimCountLast3Years', 'policy.claimHistory', { itemField: 'countInPeriod' }),
        ])),
      mkVer(2, 'INACTIVE',
        'Added MID_TERM trigger support and debug LOG action.',
        'Mid-Term Trigger Support & Logging', '2025-06-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.claimHistory', 'IS_NOT_NULL')] }, [
          _a('SUM_LIST', 'renewal.claimCountLast3Years', 'policy.claimHistory', { itemField: 'countInPeriod' }),
          _a('LOG', '', '', { message: 'Renewal claim count: {{renewal.claimCountLast3Years}}' }),
        ])),
      mkVer(3, 'INACTIVE',
        'Switched from calendar-year counting to a rolling 36-month window for consistency across renewal dates.',
        'Rolling 36-Month Window', '2025-08-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.triggerType', 'EQUALS', 'ANNUAL_RENEWAL'), _c('policy.claimHistory', 'IS_NOT_NULL')] }, [
          _a('SUM_LIST', 'renewal.claimCountLast3Years', 'policy.claimHistory', { itemField: 'countInPeriod' }),
          _a('ASSIGN', 'renewal.windowType', 'ROLLING_36_MONTH'),
        ])),
      mkVer(4, 'ACTIVE',
        'Stable rolling 3-year aggregation with trigger validation and downstream feed for upgrade and loading rules.',
        'Stable Rolling 3-Year Aggregation', '2025-10-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.triggerType', 'EQUALS', 'ANNUAL_RENEWAL'), _c('policy.claimHistory', 'IS_NOT_NULL')] }, [
          _a('SUM_LIST', 'renewal.claimCountLast3Years', 'policy.claimHistory', { itemField: 'countInPeriod' }),
          _a('LOG', '', '', { message: 'Renewal claim count: {{renewal.claimCountLast3Years}}' }),
        ]), '2025-10-07T09:00:00'),
      mkVer(5, 'PEER_REVIEW',
        'Proposed: weight claims by severity amount — minor claims (< ₹10k) count as 0.5, major claims count as 2.',
        'Claim Severity Weighting', '2025-12-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.triggerType', 'EQUALS', 'ANNUAL_RENEWAL'), _c('policy.claimHistory', 'IS_NOT_NULL')] }, [
          _a('COMPUTE', 'renewal.claimCountLast3Years', 'SUM(policy.claimHistory.map(c => c.amount < 10000 ? 0.5 : c.amount > 50000 ? 2 : 1))'),
        ])),
      mkVer(6, 'DRAFT',
        'Draft: separate claim counts by sub-category (OPD, IPD, Critical) for more granular renewal decisioning.',
        'Sub-Category Claim Count Split', '2026-02-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.triggerType', 'EQUALS', 'ANNUAL_RENEWAL'), _c('policy.claimHistory', 'IS_NOT_NULL')] }, [
          _a('SUM_LIST', 'renewal.ipdClaimCount', 'policy.claimHistory', { itemField: 'countInPeriod', filter: 'claimType=IPD' }),
          _a('SUM_LIST', 'renewal.opdClaimCount', 'policy.claimHistory', { itemField: 'countInPeriod', filter: 'claimType=OPD' }),
        ])),
    ],
  },
  {
    id: 'r-rauzc', name: 'Renewal Zero-Claim Auto-Upgrade', category: 'Operations',
    tags: ['renewal', 'upgrade', 'ncb', 'loyalty'], createdAt: '2025-02-01T08:00:00', createdBy: 'alice@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Upgrades policy tier and awards 50% NCB for zero claims. No grace period check.',
        'Initial Release', '2025-04-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'EQUALS', '0')] }, [
          _a('LOOKUP', 'renewal.nextTier', 'renewal_tier_progression_table', { key: 'policy.currentTier' }),
          _a('ASSIGN', 'renewal.ncbDiscountPct', '50'),
        ])),
      mkVer(2, 'INACTIVE',
        'Added grace period check — upgrade only applies if grace period has not expired.',
        'Grace Period Validation Added', '2025-06-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'EQUALS', '0'), _c('renewal.gracePeriodExpired', 'EQUALS', 'false')] }, [
          _a('LOOKUP', 'renewal.nextTier', 'renewal_tier_progression_table', { key: 'policy.currentTier' }),
          _a('ASSIGN', 'renewal.ncbDiscountPct', '50'),
        ])),
      mkVer(3, 'ACTIVE',
        'Upgrades policy tier and awards 50% NCB when claimCountLast3Years = 0 and grace period is active.',
        'Stable Loyalty Tier Upgrade with 50% NCB', '2025-09-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'EQUALS', '0'), _c('renewal.gracePeriodExpired', 'EQUALS', 'false')] }, [
          _a('LOOKUP', 'renewal.nextTier', 'renewal_tier_progression_table', { key: 'policy.currentTier' }),
          _a('ASSIGN', 'renewal.ncbDiscountPct', '50'),
          _a('ADD_MESSAGE', '', '', { template: 'Zero claims in 3 years. Tier upgraded. NCB: 50%.' }),
        ]), '2025-09-09T11:00:00'),
      mkVer(4, 'APPROVED',
        'Approved: add a ₹500 cashback reward credited to wallet for members achieving zero-claim renewal milestone.',
        'Zero-Claim Cashback Reward Integration', '2025-11-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'EQUALS', '0'), _c('renewal.gracePeriodExpired', 'EQUALS', 'false')] }, [
          _a('LOOKUP', 'renewal.nextTier', 'renewal_tier_progression_table', { key: 'policy.currentTier' }),
          _a('ASSIGN', 'renewal.ncbDiscountPct', '50'),
          _a('ASSIGN', 'renewal.cashbackAmount', '500'),
        ])),
      mkVer(5, 'PEER_REVIEW',
        'Proposed: compounding NCB for 3 consecutive zero-claim years — award an additional 5% compound NCB.',
        'Compounding Multi-Year Zero-Claim Bonus', '2026-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'EQUALS', '0'), _c('renewal.consecutiveZeroClaimYears', 'GREATER_THAN_OR_EQUAL', '3')] }, [
          _a('ASSIGN', 'renewal.ncbDiscountPct', '55'),
          _a('ADD_MESSAGE', '', '', { template: 'Compounding NCB awarded. Consecutive zero-claim years: {{renewal.consecutiveZeroClaimYears}}.' }),
        ])),
      mkVer(6, 'DRAFT',
        'Draft: auto-enroll zero-claim members into a premium wellness program with subsidised health checkups.',
        'Wellness Program Auto-Enrolment for Zero-Claim', '2026-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'EQUALS', '0')] }, [
          _a('ASSIGN', 'renewal.wellnessProgramEligible', 'true'),
          _a('ADD_TO_LIST', 'renewal.benefits', 'WELLNESS_CHECKUP_SUBSIDY'),
        ])),
    ],
  },
  {
    id: 'r-rlhc', name: 'Renewal High-Claim Premium Loading', category: 'Operations',
    tags: ['renewal', 'loading', 'high-claim'], createdAt: '2025-02-01T08:00:00', createdBy: 'alice@insure.com',
    versions: [
      mkVer(1, 'ACTIVE',
        'Applies 20% premium loading and restricts provider network when claims in last 3 years exceed 2.',
        'Initial version', '2025-04-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'GREATER_THAN', '2')] }, [
          _a('APPLY_PERCENTAGE', 'renewal.basePremium', '20', { mode: 'loading' }),
          _a('ASSIGN', 'renewal.restrictedNetworkRequired', 'true'),
          _a('ADD_TO_LIST', 'renewal.reviewFlags', 'HIGH_CLAIM_RENEWAL_REVIEW'),
          _a('ADD_MESSAGE', '', '', { template: '20% loading applied. Claims last 3 years: {{renewal.claimCountLast3Years}}.' }),
        ]), '2025-04-14T13:30:00'),
      mkVer(2, 'INACTIVE',
        'Proposed: increase loading to 25% and require telephonic underwriting for members with > 4 claims.',
        'Loading Increase Proposal — 25% & Telephonic UW', '2025-12-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'GREATER_THAN', '2')] }, [
          _a('APPLY_PERCENTAGE', 'renewal.basePremium', '25', { mode: 'loading' }),
        ])),
      mkVer(3, 'ACTIVE',
        'Stable 20% loading with network restriction and high-claim review flag for claims count > 2.',
        'Stable 20% Loading with Network Restriction', '2026-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'GREATER_THAN', '2')] }, [
          _a('APPLY_PERCENTAGE', 'renewal.basePremium', '20', { mode: 'loading' }),
          _a('ASSIGN', 'renewal.restrictedNetworkRequired', 'true'),
          _a('ADD_TO_LIST', 'renewal.reviewFlags', 'HIGH_CLAIM_RENEWAL_REVIEW'),
          _a('ADD_MESSAGE', '', '', { template: '20% loading applied. Claims last 3 years: {{renewal.claimCountLast3Years}}.' }),
        ]), '2026-01-10T13:00:00'),
      mkVer(4, 'APPROVED',
        'Approved: explicit network restriction notification message added for member communication.',
        'Network Restriction Messaging Clarification', '2026-02-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'GREATER_THAN', '2')] }, [
          _a('APPLY_PERCENTAGE', 'renewal.basePremium', '20', { mode: 'loading' }),
          _a('ASSIGN', 'renewal.restrictedNetworkRequired', 'true'),
          _a('ADD_MESSAGE', '', '', { template: 'Your renewal premium includes a 20% loading. Restricted network applies.' }),
        ])),
      mkVer(5, 'COMPLIANCE_REVIEW',
        'Proposed: enforce regulatory cap — premium loading must not exceed 50% of base premium per IRDAI guidelines.',
        'Regulatory Loading Cap Enforcement', '2026-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'GREATER_THAN', '2')] }, [
          _a('APPLY_PERCENTAGE', 'renewal.basePremium', '20', { mode: 'loading' }),
          _a('ASSIGN', 'renewal.loadingCapApplied', 'true'),
        ])),
      mkVer(6, 'PEER_REVIEW',
        'Proposed: graduated loading — 20% for 3 claims, 30% for 4 claims, 40% for 5+ claims.',
        'Graduated Loading by Claim Count', '2026-04-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'GREATER_THAN', '2')] }, [
          _a('COMPUTE', 'renewal.loadingPct', 'renewal.claimCountLast3Years >= 5 ? 40 : renewal.claimCountLast3Years === 4 ? 30 : 20'),
          _a('APPLY_PERCENTAGE', 'renewal.basePremium', 'renewal.loadingPct', { mode: 'loading' }),
        ])),
      mkVer(7, 'DRAFT',
        'Draft: exclude claims arising from declared chronic conditions from the 3-year count to reduce adverse selection.',
        'Chronic Condition Claims Carve-Out', '2026-05-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('renewal.claimCountLast3Years', 'GREATER_THAN', '2')] }, [
          _a('COMPUTE', 'renewal.adjustedClaimCount', 'renewal.claimCountLast3Years - renewal.chronicConditionClaimCount'),
          _a('APPLY_PERCENTAGE', 'renewal.basePremium', '20', { mode: 'loading' }),
        ])),
    ],
  },

  /* ── UC-F · Claims STP ────────────────────────── */
  {
    id: 'r-cpeg', name: 'Claims Policy Eligibility Gate', category: 'Claims',
    tags: ['stp', 'eligibility', 'gate', 'hard-stop'], createdAt: '2025-03-01T08:00:00', createdBy: 'bob@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Basic policy status check only. Benefit code and treatment date validation absent.',
        'Initial Release', '2025-05-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.status', 'EQUALS', 'ACTIVE')] }, [
          _a('ASSIGN', 'claim.eligible', 'true'),
        ])),
      mkVer(2, 'INACTIVE',
        'Added benefit code presence check as a hard-stop condition.',
        'Benefit Code Presence Validation', '2025-06-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.status', 'EQUALS', 'ACTIVE'), _c('claim.benefitCode', 'IS_NOT_NULL')] }, [
          _a('ASSIGN', 'claim.eligible', 'true'),
        ])),
      mkVer(3, 'INACTIVE',
        'Added whitelist validation — benefit code must be in the approved benefit catalogue.',
        'Benefit Code Whitelist Check', '2025-07-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('policy.status', 'EQUALS', 'ACTIVE'), _c('claim.benefitCode', 'IS_NOT_NULL'), _c('claim.benefitCode', 'IN', 'APPROVED_BENEFIT_CODES')] }, [
          _a('ASSIGN', 'claim.eligible', 'true'),
        ])),
      mkVer(4, 'ACTIVE',
        'Hard-stop gate. Verifies policy is ACTIVE, benefit code is present, and treatment date is within the policy window.',
        'Full Eligibility Gate with Policy Window Check', '2025-09-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('policy.status', 'EQUALS', 'ACTIVE'),
          _c('claim.benefitCode', 'IS_NOT_NULL'),
          _c('claim.treatmentDate', 'DATE_BETWEEN', 'policy.inceptionDate', 'policy.expiryDate'),
        ]}, [
          _a('ASSIGN', 'claim.eligible', 'true'),
          _a('ADD_MESSAGE', '', '', { template: 'Policy eligibility confirmed for {{claim.benefitCode}}.' }),
        ]), '2025-09-06T09:00:00'),
      mkVer(5, 'PEER_REVIEW',
        'Proposed: add hospitalisation pre-authorisation check — inpatient claims must have a valid pre-auth reference.',
        'Hospitalisation Pre-Auth Validation', '2025-12-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('policy.status', 'EQUALS', 'ACTIVE'),
          _c('claim.benefitCode', 'IS_NOT_NULL'),
          _c('claim.preAuthRef', 'IS_NOT_NULL'),
        ]}, [
          _a('ASSIGN', 'claim.eligible', 'true'),
          _a('ASSIGN', 'claim.preAuthVerified', 'true'),
        ])),
      mkVer(6, 'DRAFT',
        'Draft: real-time policy status API call to validate policy is active at time of claim submission, not just at inception.',
        'Real-Time Policy Status API Check', '2026-02-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('policy.realtimeStatus', 'EQUALS', 'ACTIVE'),
          _c('claim.benefitCode', 'IS_NOT_NULL'),
        ]}, [
          _a('ASSIGN', 'claim.eligible', 'true'),
        ])),
    ],
  },
  {
    id: 'r-cpnc', name: 'Claims Provider Network Classification', category: 'Claims',
    tags: ['stp', 'provider', 'network'], createdAt: '2025-03-01T08:00:00', createdBy: 'bob@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Binary IN/OUT classification using providerId lookup. GAP tier not yet supported.',
        'Initial Release', '2025-05-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('claim.providerId', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'provider.networkTier', 'provider_network_tier_table', { key: 'claim.providerId' }),
        ])),
      mkVer(2, 'INACTIVE',
        'Added GAP tier handling — providers in the GAP network get partial reimbursement at 70%.',
        'GAP Network Tier Added', '2025-06-15T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('claim.providerId', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'provider.networkTier', 'provider_network_tier_table', { key: 'claim.providerId' }),
          _a('ASSIGN', 'provider.gapReimbursementPct', '70'),
        ])),
      mkVer(3, 'INACTIVE',
        'Refactored to three-tier classification with tiered co-pay rates per network tier.',
        'Three-Tier Classification with Co-Pay Rates', '2025-08-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('claim.providerId', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'provider.networkTier', 'provider_network_tier_table', { key: 'claim.providerId' }),
          _a('ADD_MESSAGE', '', '', { template: 'Provider {{claim.providerId}} classified as {{provider.networkTier}}.' }),
        ])),
      mkVer(4, 'ACTIVE',
        'Classifies provider as IN_NETWORK, OUT_OF_NETWORK, or GAP using claim.providerId. Result drives the STP decision gate.',
        'Stable Three-Tier Classification', '2025-10-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('claim.providerId', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'provider.networkTier', 'provider_network_tier_table', { key: 'claim.providerId' }),
          _a('ADD_MESSAGE', '', '', { template: 'Provider {{claim.providerId}} classified as {{provider.networkTier}}.' }),
        ]), '2025-10-08T14:00:00'),
      mkVer(5, 'APPROVED',
        'Approved: real-time empanelment status check via provider API to catch recently de-empanelled providers.',
        'Real-Time Empanelment Status Validation', '2026-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('claim.providerId', 'IS_NOT_NULL'), _c('provider.empanelmentStatus', 'EQUALS', 'ACTIVE')] }, [
          _a('LOOKUP', 'provider.networkTier', 'provider_network_tier_table', { key: 'claim.providerId' }),
          _a('ASSIGN', 'provider.empanelmentVerified', 'true'),
        ])),
      mkVer(6, 'DRAFT',
        'Draft: geo-based network tier assignment using claim location when providerId lookup returns no match.',
        'Geo-Based Fallback Classification', '2026-03-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('claim.providerId', 'IS_NOT_NULL')] }, [
          _a('LOOKUP', 'provider.networkTier', 'provider_network_tier_table', { key: 'claim.providerId' }),
          _a('COMPUTE', 'provider.geoTier', 'GEO_NETWORK_MAP[claim.location]'),
        ])),
    ],
  },
  {
    id: 'r-csdg', name: 'Claims STP Decision Gate', category: 'Claims',
    tags: ['stp', 'auto-approve', 'gate'], createdAt: '2025-03-01T08:00:00', createdBy: 'bob@insure.com',
    versions: [
      mkVer(1, 'INACTIVE',
        'Auto-approves when fraud score = 0 and provider is IN_NETWORK. Missing deductible check — superseded by v2.',
        'Initial version — missing deductible check', '2025-05-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [_c('fraud.totalScore', 'EQUALS', '0'), _c('provider.networkTier', 'EQUALS', 'IN_NETWORK')] }, [
          _a('ASSIGN', 'adjudication.stpPassed', 'true'),
        ])),
      mkVer(2, 'INACTIVE',
        'Auto-approves claims when fraud score = 0, provider is IN_NETWORK, and deductible remaining ≥ 0. Failures route to manual review.',
        'Deductible Check Added — Zero-Deductible Bypass Fixed', '2025-08-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('fraud.totalScore', 'EQUALS', '0'),
          _c('provider.networkTier', 'EQUALS', 'IN_NETWORK'),
          _c('claim.deductibleRemaining', 'GREATER_THAN_OR_EQUAL', '0'),
        ]}, [
          _a('ASSIGN', 'adjudication.stpPassed', 'true'),
          _a('ASSIGN', 'claim.decisionLane', 'AUTO_APPROVE'),
          _a('ADD_MESSAGE', '', '', { template: 'Claim auto-approved via STP. Payable: {{claim.payableAmount}}.' }),
        ])),
      mkVer(3, 'ACTIVE',
        'Stable STP gate: fraud = 0, IN_NETWORK, deductible ≥ 0. Includes co-pay deduction before approval.',
        'Co-Pay Deduction Before Auto-Approval', '2025-10-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('fraud.totalScore', 'EQUALS', '0'),
          _c('provider.networkTier', 'EQUALS', 'IN_NETWORK'),
          _c('claim.deductibleRemaining', 'GREATER_THAN_OR_EQUAL', '0'),
        ]}, [
          _a('ASSIGN', 'adjudication.stpPassed', 'true'),
          _a('ASSIGN', 'claim.decisionLane', 'AUTO_APPROVE'),
          _a('ADD_MESSAGE', '', '', { template: 'Claim auto-approved via STP. Payable: {{claim.payableAmount}}.' }),
        ]), '2025-10-15T10:00:00'),
      mkVer(4, 'COMPLIANCE_REVIEW',
        'Proposed: cap STP auto-approval at ₹1,00,000 per claim — higher value claims must go to manual review per IRDAI.',
        'Regulatory Auto-Approval Limit ₹1L', '2025-12-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('fraud.totalScore', 'EQUALS', '0'),
          _c('provider.networkTier', 'EQUALS', 'IN_NETWORK'),
          _c('claim.payableAmount', 'LESS_THAN_OR_EQUAL', '100000'),
        ]}, [
          _a('ASSIGN', 'adjudication.stpPassed', 'true'),
          _a('ASSIGN', 'claim.decisionLane', 'AUTO_APPROVE'),
        ])),
      mkVer(5, 'PEER_REVIEW',
        'Proposed: weight STP eligibility by provider tier — Tier 1 hospitals get higher auto-approval limit.',
        'Provider Tier-Weighted Approval Limit', '2026-01-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('fraud.totalScore', 'EQUALS', '0'),
          _c('provider.networkTier', 'EQUALS', 'IN_NETWORK'),
          _c('provider.hospitalTier', 'IS_NOT_NULL'),
        ]}, [
          _a('ASSIGN', 'adjudication.stpPassed', 'true'),
          _a('COMPUTE', 'adjudication.approvalLimit', 'provider.hospitalTier === 1 ? 200000 : 100000'),
        ])),
      mkVer(6, 'BUSINESS_REVIEW',
        'Proposed: separate STP paths for IP and OP claims — outpatient claims have a simplified gate.',
        'Claim Type Split — IP vs OP STP Paths', '2026-02-15T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('fraud.totalScore', 'EQUALS', '0'),
          _c('claim.claimType', 'EQUALS', 'OUTPATIENT'),
        ]}, [
          _a('ASSIGN', 'adjudication.stpPassed', 'true'),
          _a('ASSIGN', 'claim.decisionLane', 'AUTO_APPROVE'),
        ])),
      mkVer(7, 'DRAFT',
        'Draft: use ML model confidence score as an additional signal — auto-approve when ML confidence ≥ 0.95.',
        'ML-Assisted Auto-Approval Signal', '2026-04-01T00:00:00',
        mkBlockRule({ match: 'and', conditions: [
          _c('fraud.totalScore', 'EQUALS', '0'),
          _c('adjudication.mlConfidence', 'GREATER_THAN_OR_EQUAL', '0.95'),
        ]}, [
          _a('ASSIGN', 'adjudication.stpPassed', 'true'),
          _a('ASSIGN', 'claim.decisionLane', 'AUTO_APPROVE'),
        ])),
    ],
  },
];

/* ── GTL UW NON-DMN RULES (A1) ───────────────────── */
export const SEED_GTL_RULES: Rule[] = [
  /* ── UW Eligibility ──────────────────────────── */
  {
    id: 'gtl-elig-001', name: 'FCL Cutoff Age Setup', category: 'Eligibility',
    tags: ['gtl', 'eligibility', 'fcl', 'scheme-setup'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Capture FCL_Cutoff_Age per scheme (mandatory) on scheme setup.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.setupTrigger', 'IS_NOT_NULL')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:FCL_CUTOFF_AGE'),
      ]))],
  },
  {
    id: 'gtl-elig-002', name: 'FCL Cutoff Age Range Validation', category: 'Eligibility',
    tags: ['gtl', 'eligibility', 'fcl', 'validation'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject if FCL_Cutoff_Age is outside the range [Min_Age, Cease_Age].', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.fclCutoffAgeOutOfRange', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.outcome', 'FAIL:FCL_CUTOFF_OUT_OF_RANGE'),
      ]))],
  },
  {
    id: 'gtl-elig-003', name: 'Age > 65 FCL Hard Cap', category: 'Eligibility',
    tags: ['gtl', 'eligibility', 'age', 'hard-cap'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Force FCL = 0 and route to UW queue when member age exceeds 65.', 'Initial Release — DRF Anhira #15', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.age', 'GREATER_THAN', '65')] }, [
        _a('ASSIGN', 'uw.fclCap', '0'),
        _a('ASSIGN', 'uw.outcome', 'REFER_UW:AGE_GT_65'),
      ]))],
  },
  {
    id: 'gtl-elig-004', name: 'Age > FCL Cutoff Age UW Referral', category: 'Eligibility',
    tags: ['gtl', 'eligibility', 'age', 'fcl-cutoff'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Set FCL = 0 and queue for UW when member age exceeds FCL_Cutoff_Age but is ≤ 65.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.ageExceedsFclCutoff', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.fclCap', '0'),
        _a('ASSIGN', 'uw.outcome', 'REFER_UW:AGE_GT_FCL_CUTOFF'),
      ]))],
  },
  {
    id: 'gtl-elig-005', name: 'Renewal Age Crossing FCL Cutoff', category: 'Eligibility',
    tags: ['gtl', 'eligibility', 'renewal', 'fcl-cutoff'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Auto-move member to FCL = 0 when they cross FCL_Cutoff_Age at renewal.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.crossesFclCutoffAtRenewal', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.fclCap', '0'),
        _a('ASSIGN', 'uw.outcome', 'CAP_FCL:0;REFER_UW:RENEWAL_AGE_CROSSING'),
      ]))],
  },
  {
    id: 'gtl-elig-006', name: 'Duplicate LA Under Same Master Policy', category: 'Eligibility',
    tags: ['gtl', 'eligibility', 'duplicate', 'la'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject if the same Life Assured appears twice under the same Master Policy.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.duplicateInMph', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.outcome', 'BLOCK:LA_DUPLICATE_IN_MPH'),
      ]))],
  },
  {
    id: 'gtl-elig-007', name: 'Multi-Dimensional FCL Setup Required', category: 'Eligibility',
    tags: ['gtl', 'eligibility', 'fcl', 'multi-dim'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Require FCL configured per location, benefit, and risk category when not universally set.', 'Initial Release — DRF Anhira #10', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.fclNotConfiguredMultiDim', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:FCL_PER_LOCATION_BENEFIT_RISK'),
      ]))],
  },
  {
    id: 'gtl-elig-008', name: 'Multi-Partner FCL Per Partner Required', category: 'Eligibility',
    tags: ['gtl', 'eligibility', 'fcl', 'multi-partner'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Each partner in a multi-partner Master Policy must have their own FCL; no shared FCL.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.isMultiPartner', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:FCL_PER_PARTNER'),
      ]))],
  },

  /* ── UW NML ──────────────────────────────────── */
  {
    id: 'gtl-nml-001', name: 'NML Collapses with FCL (GTL)', category: 'NML',
    tags: ['gtl', 'nml', 'fcl', 'product'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'For GTL product, NML equals FCL — no separate medical or non-medical limits apply.', 'Initial Release — DRF Anhira #15', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.productCode', 'EQUALS', 'GTL'), _c('member.saLteFcl', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:NML_EQ_FCL'),
      ]))],
  },
  {
    id: 'gtl-nml-002', name: 'LFQ Not Required Below FCL', category: 'NML',
    tags: ['gtl', 'nml', 'lfq', 'fcl'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Life Financial Questionnaire is not required when SA is at or below the FCL threshold.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.sa', 'LESS_THAN_OR_EQUAL', 'FCL')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:LFQ_NOT_REQUIRED_BELOW_FCL'),
      ]))],
  },

  /* ── UW Medical Validity ─────────────────────── */
  {
    id: 'gtl-medval-001', name: 'Standard Medical Validity — 1 Year', category: 'Medical Validity',
    tags: ['gtl', 'medical', 'validity', 'standard'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Medical records for standard lives are valid for 1 year from the test date.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.lifeClass', 'EQUALS', 'STANDARD')] }, [
        _a('ASSIGN', 'uw.medValidity', 'REQUIRE:MED_VALIDITY_1Y'),
      ]))],
  },
  {
    id: 'gtl-medval-002', name: 'Sub-Standard Medical Validity — Per Test Master', category: 'Medical Validity',
    tags: ['gtl', 'medical', 'validity', 'sub-standard'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Medical record validity for sub-standard lives is governed by the Test Master schedule.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.lifeClass', 'EQUALS', 'SUB_STANDARD')] }, [
        _a('ASSIGN', 'uw.medValidity', 'REQUIRE:MED_VALIDITY_PER_TEST'),
      ]))],
  },
  {
    id: 'gtl-medval-003', name: 'Waive Re-Triggered Medical Test If Still Valid', category: 'Medical Validity',
    tags: ['gtl', 'medical', 'waiver', 'carry-forward'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Waive the same medical test if the previous result is still within its validity window.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('medical.previousTestValid', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.action', 'WAIVE:MED_TEST_VALID'),
      ]))],
  },
  {
    id: 'gtl-medval-004', name: 'Age-Based Medical Carry-Forward Guidelines', category: 'Medical Validity',
    tags: ['gtl', 'medical', 'carry-forward', 'age'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'DRAFT', 'Apply carry-forward guidelines when member age ≤ 60 (or 65 per retirement age). Exact table pending RI confirmation.', 'Initial Release — DRF Anhira (pending RI)', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.age', 'LESS_THAN_OR_EQUAL', '65')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:CARRY_FORWARD_GUIDELINES'),
      ]))],
  },
  {
    id: 'gtl-medval-005', name: 'Grandfathering Carry-Forward (Munich Re)', category: 'Medical Validity',
    tags: ['gtl', 'medical', 'grandfathering', 'munich-re'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply carry-forward standards for standard and sub-standard lives previously seen by Munich Re under grandfathering.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.munichRePreviouslySeen', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:GF_CARRY_FORWARD'),
      ]))],
  },
  {
    id: 'gtl-medval-006', name: 'Fresh Grandfathering Munich Re Referral', category: 'Medical Validity',
    tags: ['gtl', 'medical', 'grandfathering', 'munich-re', 'referral'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Refer to Munich Re for fresh grandfathered scheme where lives have cover above FCL and were not previously seen.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.isGrandfathered', 'EQUALS', 'true'), _c('member.coverAboveFcl', 'EQUALS', 'true'), _c('member.munichRePreviouslySeen', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'uw.outcome', 'REFER_FAC:GF_MUNICH_RE'),
      ]))],
  },

  /* ── UW SA Increase — Mid-Year & Premium ─────── */
  {
    id: 'gtl-sainc-301', name: 'Max 2 SA Increases Per Policy Year', category: 'SA Inc (Mid-Year)',
    tags: ['gtl', 'sa-increase', 'mid-year', 'cap'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'A member may not request more than 2 mid-year SA increases within the same policy year.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.midYearIncreaseCount', 'GREATER_THAN_OR_EQUAL', '2')] }, [
        _a('ASSIGN', 'uw.outcome', 'BLOCK:MAX_2_INCREASES_PER_YEAR'),
      ]))],
  },
  {
    id: 'gtl-sainc-303', name: 'Waive Fresh Medicals — Previous Medicals Valid', category: 'SA Inc (Mid-Year)',
    tags: ['gtl', 'sa-increase', 'mid-year', 'medical-waiver'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Waive fresh medical requirements for mid-year SA increase if previous medicals are still within validity.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('medical.previousMedicalsValid', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.action', 'WAIVE:PREV_MED_VALID'),
      ]))],
  },
  {
    id: 'gtl-sainc-304', name: 'Permanent SA Increase Lock on Decline or Postpone', category: 'SA Inc (Mid-Year)',
    tags: ['gtl', 'sa-increase', 'permanent-lock', 'decline'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Permanently lock the member from future SA increases if any increase request is declined or postponed.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.increaseDisposition', 'IN', 'DECLINED,POSTPONED')] }, [
        _a('ASSIGN', 'uw.action', 'BLOCK:PERMANENT_SA_INCREASE_LOCK'),
      ]))],
  },
  {
    id: 'gtl-sainc-401', name: 'Inforce SA = Last Inforce SA During UW', category: 'SA Inc (Premium)',
    tags: ['gtl', 'sa-increase', 'premium', 'inforce'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'While UW is in progress for SA > FCL, the inforce SA remains the last confirmed inforce SA.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.inProgress', 'EQUALS', 'true'), _c('member.saAboveFcl', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.inforceRule', 'REQUIRE:INFORCE_EQ_LAST_SA'),
      ]))],
  },
  {
    id: 'gtl-sainc-402', name: 'Inforce SA = New SA on Standard or Rated-Up Decision', category: 'SA Inc (Premium)',
    tags: ['gtl', 'sa-increase', 'premium', 'inforce', 'approved'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Set inforce SA to the new requested SA when the final UW disposition is STANDARD or RATED_UP.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.finalDisposition', 'IN', 'STANDARD,RATED_UP')] }, [
        _a('ASSIGN', 'uw.inforceRule', 'REQUIRE:INFORCE_EQ_NEW_SA'),
      ]))],
  },
  {
    id: 'gtl-sainc-403', name: 'Inforce SA = Last SA on Decline or Postpone', category: 'SA Inc (Premium)',
    tags: ['gtl', 'sa-increase', 'premium', 'inforce', 'declined'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Revert inforce SA to the last confirmed inforce SA when disposition is DECLINED or POSTPONED.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.finalDisposition', 'IN', 'DECLINED,POSTPONED')] }, [
        _a('ASSIGN', 'uw.inforceRule', 'REQUIRE:INFORCE_EQ_LAST_SA'),
      ]))],
  },
  {
    id: 'gtl-sainc-404', name: 'Rate-Up Premium on SA Delta', category: 'SA Inc (Premium)',
    tags: ['gtl', 'sa-increase', 'rate-up', 'premium-delta'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'When disposition is RATED_UP, premium loading applies only on the delta (New SA − Last Inforce SA).', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.finalDisposition', 'EQUALS', 'RATED_UP')] }, [
        _a('ASSIGN', 'uw.premiumBase', 'REQUIRE:RATE_UP_ON_DELTA'),
      ]))],
  },
  {
    id: 'gtl-sainc-405', name: 'Pro-Rate Rate-Up from Decision Date to PTD', category: 'SA Inc (Premium)',
    tags: ['gtl', 'sa-increase', 'rate-up', 'pro-rate'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Pro-rate the rate-up premium from the Current Decision Date through to the Paid-To-Date.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.rateUpApplies', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.premiumCalc', 'REQUIRE:PRO_RATE_DEC_DATE_TO_PTD'),
      ]))],
  },

  /* ── UW Grandfathering, NRI & MQ ─────────────── */
  {
    id: 'gtl-gf-001', name: 'Grandfathering UW Queue', category: 'Grandfathering',
    tags: ['gtl', 'grandfathering', 'uw-queue'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Push member to UW queue when the grandfathering flag is set.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.grandfatherFlag', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.outcome', 'REFER_UW:GRANDFATHERING'),
      ]))],
  },
  {
    id: 'gtl-gf-003', name: 'GF Munich Re Referral — New Life', category: 'Grandfathering',
    tags: ['gtl', 'grandfathering', 'munich-re', 'new-life'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Refer to Munich Re when cover exceeds FCL and the life has not previously been seen by Munich Re under the grandfathering route.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.coverAboveFcl', 'EQUALS', 'true'), _c('member.munichRePreviouslySeen', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'uw.outcome', 'REFER_FAC:GF_MUNICH_NEW'),
      ]))],
  },
  {
    id: 'gtl-gf-006', name: 'GF Carry-Forward from Munich Re', category: 'Grandfathering',
    tags: ['gtl', 'grandfathering', 'carry-forward', 'munich-re'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply Munich Re carry-forward guidelines for lives previously assessed under the grandfathering route.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.munichRePreviouslySeen', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:GF_CARRY_FORWARD'),
      ]))],
  },
  {
    id: 'gtl-nri-001', name: 'NRI Route to UW', category: 'NRI',
    tags: ['gtl', 'nri', 'uw-queue'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Route member to UW queue when NRI or foreign national flag is set.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.nriOrFn', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.outcome', 'REFER_UW:NRI'),
      ]))],
  },
  {
    id: 'gtl-nri-002', name: 'NRI Decline Country Upfront Rejection', category: 'NRI',
    tags: ['gtl', 'nri', 'decline', 'country'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Upfront reject the application if the NRI member\'s country of residence is on the decline list (managed separately).', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.nriOrFn', 'EQUALS', 'true'), _c('member.countryOnDeclineList', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.outcome', 'DECLINE:NRI_DECLINE_COUNTRY'),
      ]))],
  },
  {
    id: 'gtl-nri-003', name: 'NRI Unknown Country Referral', category: 'NRI',
    tags: ['gtl', 'nri', 'country', 'unknown'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'DRAFT', 'Refer to UW when the member country is not on the approve or decline list. Exact country classification TBD.', 'Initial Release — DRF Anhira (TBD)', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.nriOrFn', 'EQUALS', 'true'), _c('member.countryClassification', 'EQUALS', 'UNKNOWN')] }, [
        _a('ASSIGN', 'uw.outcome', 'REFER_UW:NRI_COUNTRY_UNKNOWN'),
      ]))],
  },
  {
    id: 'gtl-mq-001', name: 'GTL Product — LFQ Only, No MQ', category: 'MQ/LFQ',
    tags: ['gtl', 'mq', 'lfq', 'product-config'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'For GTL product, only Life Financial Questionnaire is used; Medical Questionnaire is not applicable.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.productCode', 'EQUALS', 'GTL')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:LFQ_ONLY'),
      ]))],
  },
  {
    id: 'gtl-mq-002', name: 'LFQ Adverse Findings — Grid Medicals Required', category: 'MQ/LFQ',
    tags: ['gtl', 'mq', 'lfq', 'adverse', 'medical-grid'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'When LFQ reveals adverse findings, route to UW and require full medical grid assessment.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('lfq.adversityNoted', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.outcome', 'REFER_UW:LFQ_ADV'),
        _a('ASSIGN', 'uw.action', 'REQUIRE:MEDICAL_GRID'),
      ]))],
  },

  /* ── UW Leave of Absence ─────────────────────── */
  {
    id: 'gtl-loa-001', name: 'Medical LWP — Cover Till End of Term, No Renewal', category: 'LOA',
    tags: ['gtl', 'loa', 'medical', 'lwp', 'no-renewal'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Member on Leave Without Pay for medical reasons retains cover until end of policy term but is not eligible for renewal.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.loaType', 'EQUALS', 'MEDICAL_LWP')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:NO_RENEWAL_MEDICAL_LWP'),
      ]))],
  },
  {
    id: 'gtl-loa-002', name: 'Maternity LOA ≤ 6 Months — Government Regulation Cover', category: 'LOA',
    tags: ['gtl', 'loa', 'maternity', 'government'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Member on maternity leave of up to 6 months is covered per government regulation with no additional requirements.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.loaType', 'EQUALS', 'MATERNITY'), _c('member.loaDurationMonths', 'LESS_THAN_OR_EQUAL', '6')] }, [
        _a('ASSIGN', 'uw.outcome', 'PASS:MATERNITY_LE_6M'),
      ]))],
  },
  {
    id: 'gtl-loa-003', name: 'Maternity LOA 6–12 Months — Sabbatical Permitted', category: 'LOA',
    tags: ['gtl', 'loa', 'maternity', 'sabbatical'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Member on maternity leave between 6 and 12 months is treated as sabbatical and permitted coverage.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.loaType', 'EQUALS', 'MATERNITY'), _c('member.loaDurationMonths', 'GREATER_THAN', '6'), _c('member.loaDurationMonths', 'LESS_THAN_OR_EQUAL', '12')] }, [
        _a('ASSIGN', 'uw.outcome', 'PASS:MATERNITY_SABBATICAL'),
      ]))],
  },
  {
    id: 'gtl-loa-004', name: 'Maternity LOA > 12 Months — Fresh MQ and Grid', category: 'LOA',
    tags: ['gtl', 'loa', 'maternity', 'fresh-mq', 'medical-grid'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Require fresh LFQ and grid medicals (if above FCL) when member returns from maternity leave exceeding 12 months.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.loaType', 'EQUALS', 'MATERNITY'), _c('member.loaDurationMonths', 'GREATER_THAN', '12')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:FRESH_MQ'),
        _a('ASSIGN', 'uw.action', 'REQUIRE:GRID_IF_ABOVE_FCL'),
      ]))],
  },
  {
    id: 'gtl-loa-005', name: 'Non-Medical Sabbatical — Max 6 Months, No Renewal', category: 'LOA',
    tags: ['gtl', 'loa', 'sabbatical', 'cap'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Non-medical, non-maternity sabbatical is capped at 6 months of coverage with no renewal permitted.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.loaType', 'EQUALS', 'SABBATICAL_NON_MEDICAL')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:SABBATICAL_CAP_6M'),
      ]))],
  },
  {
    id: 'gtl-loa-006', name: 'Return from Sabbatical — Fresh MQ and Medical Grid', category: 'LOA',
    tags: ['gtl', 'loa', 'sabbatical', 'return', 'fresh-mq', 'medical-grid'], createdAt: '2026-06-01T00:00:00', createdBy: 'uw-head@anhira.com',
    versions: [mkVer(1, 'ACTIVE', 'Require fresh LFQ and medical grid assessment when member returns from any non-medical/non-maternity sabbatical.', 'Initial Release — DRF Anhira', '2026-06-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.returningFromSabbatical', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:FRESH_MQ'),
        _a('ASSIGN', 'uw.action', 'REQUIRE:MEDICAL_GRID'),
      ]))],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// A2 · GTL Rating Engine — Non-DMN Rules (32 rules)
// ─────────────────────────────────────────────────────────────────────────────
export const SEED_A2_RULES: Rule[] = [
  // ── RATE_Selection_Residual ──
  {
    id: 'rate-sel-004', name: 'Rate Card Out of Window', category: 'Rate Card Selection',
    tags: ['gtl', 'rating', 'rate-card'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block when rate card effective window violates quote date.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rateCard.windowViolatesEffectiveDate', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'rating.outcome', 'FAIL:RATE_CARD_OUT_OF_WINDOW'),
      ]))],
  },
  {
    id: 'rate-sel-005', name: 'Insurer Profile Mismatch', category: 'Rate Card Selection',
    tags: ['gtl', 'rating', 'rate-card'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject when rate card insurer does not match product profile.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rateCard.insurerMatchesProfile', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'rating.outcome', 'FAIL:INSURER_PROFILE_MISMATCH'),
      ]))],
  },
  {
    id: 'rate-sel-006', name: 'MSME Segment Band Hint', category: 'Rate Card Selection',
    tags: ['gtl', 'rating', 'segment'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Emit MSME band discount hint for MSME or Startup segments.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.segment', 'IN', 'MSME,STARTUP')] }, [
        _a('ASSIGN', 'rating.discountHint', 'DISCOUNT_HINT:MSME_BAND'),
      ]))],
  },
  {
    id: 'rate-sel-007', name: 'Mid-Market Volume Discount Hint', category: 'Rate Card Selection',
    tags: ['gtl', 'rating', 'segment'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Emit volume standard 2026 discount hint for mid-market segment.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.segment', 'EQUALS', 'MID_MARKET')] }, [
        _a('ASSIGN', 'rating.discountHint', 'DISCOUNT_HINT:VOL_STANDARD_2026'),
      ]))],
  },
  {
    id: 'rate-sel-008', name: 'Large Corporate Band Hint', category: 'Rate Card Selection',
    tags: ['gtl', 'rating', 'segment'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Emit large corporate discount hint for large corporate segment.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.segment', 'EQUALS', 'LARGE_CORPORATE')] }, [
        _a('ASSIGN', 'rating.discountHint', 'DISCOUNT_HINT:LARGE_CORP'),
      ]))],
  },
  {
    id: 'rate-sel-009', name: 'Takeover A/E Renewal Discount', category: 'Rate Card Selection',
    tags: ['gtl', 'rating', 'takeover'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Emit A/E renewal discount hint for takeover quotes.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('quote.type', 'EQUALS', 'TAKEOVER')] }, [
        _a('ASSIGN', 'rating.discountHint', 'DISCOUNT_HINT:AE_RENEWAL_2026'),
      ]))],
  },
  {
    id: 'rate-sel-010', name: 'High/Extreme Hazard Mix Load', category: 'Rate Card Selection',
    tags: ['gtl', 'rating', 'hazard'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply hazard mix load when scheme has HIGH or EXTREME hazard class.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.hazardBand', 'IN', 'HIGH,EXTREME')] }, [
        _a('ASSIGN', 'rating.load', 'LOAD:HAZARD_MIX_LOAD_2026'),
      ]))],
  },
  // ── RATE_Discounts_Special ──
  {
    id: 'disc-brk-001', name: 'Broker Negotiation Discount 3%', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'broker'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply 3% broker negotiation discount when broker tier is STANDARD.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('broker.tier', 'EQUALS', 'STANDARD')] }, [
        _a('ASSIGN', 'rating.brokerDiscount', 'DISCOUNT:BROKER_NEG_3PCT'),
      ]))],
  },
  {
    id: 'disc-brk-002', name: 'Broker Negotiation Discount 5%', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'broker'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply 5% broker negotiation discount when broker tier is PREFERRED.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('broker.tier', 'EQUALS', 'PREFERRED')] }, [
        _a('ASSIGN', 'rating.brokerDiscount', 'DISCOUNT:BROKER_NEG_5PCT'),
      ]))],
  },
  {
    id: 'disc-brk-003', name: 'Broker Volume Package Discount', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'broker'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply volume package discount when broker submits multi-scheme package.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('broker.packageSubmission', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'rating.brokerDiscount', 'DISCOUNT:BROKER_VOL_PACKAGE'),
      ]))],
  },
  {
    id: 'disc-strat-001', name: 'Strategic Rebate Flat INR', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'strategic'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply strategic flat INR rebate for designated strategic accounts.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.strategicAccount', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'rating.strategicRebate', 'DISCOUNT:STRATEGIC_FLAT_INR'),
      ]))],
  },
  {
    id: 'disc-modal-001', name: 'Q4 Modal Promo Monthly Load Waived', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'modal'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Waive monthly modal load during Q4 promotional period.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('billing.frequency', 'EQUALS', 'MONTHLY'), _c('promo.q4Active', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'rating.modalLoad', 'DISCOUNT:MODAL_LOAD_ZERO'),
      ]))],
  },
  {
    id: 'disc-ci-001', name: 'CI Rider LIC Variant Discount', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'ci-rider'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply CI rider discount for LIC variant product codes.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_CRITICAL_ILLNESS'), _c('product.variant', 'EQUALS', 'LIC')] }, [
        _a('ASSIGN', 'rating.riderDiscount', 'DISCOUNT:CI_LIC_VARIANT'),
      ]))],
  },
  {
    id: 'disc-ci-002', name: 'CI Rider HDFC Variant Discount', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'ci-rider'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply CI rider discount for HDFC variant product codes.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_CRITICAL_ILLNESS'), _c('product.variant', 'EQUALS', 'HDFC')] }, [
        _a('ASSIGN', 'rating.riderDiscount', 'DISCOUNT:CI_HDFC_VARIANT'),
      ]))],
  },
  {
    id: 'disc-ci-003', name: 'CI Rider ICICI Variant Discount', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'ci-rider'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply CI rider discount for ICICI variant product codes.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_CRITICAL_ILLNESS'), _c('product.variant', 'EQUALS', 'ICICI')] }, [
        _a('ASSIGN', 'rating.riderDiscount', 'DISCOUNT:CI_ICICI_VARIANT'),
      ]))],
  },
  {
    id: 'disc-senior-001', name: 'Senior Cohort Load Age 56–60', category: 'Discounts',
    tags: ['gtl', 'rating', 'load', 'senior'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply age-band load for senior cohort aged 56–60.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.ageBand', 'EQUALS', 'AB_56_60')] }, [
        _a('ASSIGN', 'rating.seniorLoad', 'LOAD:SENIOR_AB_56_60'),
      ]))],
  },
  {
    id: 'disc-senior-002', name: 'Senior Cohort Load Age 61–65', category: 'Discounts',
    tags: ['gtl', 'rating', 'load', 'senior'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply age-band load for senior cohort aged 61–65.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.ageBand', 'EQUALS', 'AB_61_65')] }, [
        _a('ASSIGN', 'rating.seniorLoad', 'LOAD:SENIOR_AB_61_65'),
      ]))],
  },
  {
    id: 'disc-senior-003', name: 'Senior Cohort Load Age 66–70', category: 'Discounts',
    tags: ['gtl', 'rating', 'load', 'senior'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply age-band load for senior cohort aged 66–70.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.ageBand', 'EQUALS', 'AB_66_70')] }, [
        _a('ASSIGN', 'rating.seniorLoad', 'LOAD:SENIOR_AB_66_70'),
      ]))],
  },
  {
    id: 'disc-well-001', name: 'Wellness Programme Discount', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'wellness'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply wellness discount when scheme has certified wellness programme.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.wellnessCertified', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'rating.wellnessDiscount', 'DISCOUNT:WELLNESS_PROG'),
      ]))],
  },
  {
    id: 'disc-plan-match-001', name: 'Plan Match Discount AB 41–45', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'plan-match'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply plan-match discount for age band 41–45.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.ageBand', 'EQUALS', 'AB_41_45')] }, [
        _a('ASSIGN', 'rating.planMatchDiscount', 'DISCOUNT:PLAN_MATCH_AB_41_45'),
      ]))],
  },
  {
    id: 'disc-plan-match-002', name: 'Plan Match Discount AB 46–50', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'plan-match'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply plan-match discount for age band 46–50.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.ageBand', 'EQUALS', 'AB_46_50')] }, [
        _a('ASSIGN', 'rating.planMatchDiscount', 'DISCOUNT:PLAN_MATCH_AB_46_50'),
      ]))],
  },
  {
    id: 'disc-plan-match-003', name: 'Plan Match Female Class I AB 41–45', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'plan-match'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply female class-I plan-match discount for age band 41–45.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.gender', 'EQUALS', 'FEMALE'), _c('member.hazardClass', 'EQUALS', 'CLASS_I'), _c('member.ageBand', 'EQUALS', 'AB_41_45')] }, [
        _a('ASSIGN', 'rating.planMatchDiscount', 'DISCOUNT:PLAN_MATCH_F_CI_AB_41_45'),
      ]))],
  },
  {
    id: 'disc-plan-match-004', name: 'Plan Match Female Class I AB 46–50', category: 'Discounts',
    tags: ['gtl', 'rating', 'discount', 'plan-match'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply female class-I plan-match discount for age band 46–50.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.gender', 'EQUALS', 'FEMALE'), _c('member.hazardClass', 'EQUALS', 'CLASS_I'), _c('member.ageBand', 'EQUALS', 'AB_46_50')] }, [
        _a('ASSIGN', 'rating.planMatchDiscount', 'DISCOUNT:PLAN_MATCH_F_CI_AB_46_50'),
      ]))],
  },
  // ── RATE_Formula ──
  {
    id: 'rate-form-001', name: 'Effective Per Mille Formula', category: 'Rating Formula',
    tags: ['gtl', 'rating', 'formula'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Compute effective per mille = base rate × age factor × hazard factor.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rating.baseRate', 'IS_NOT_NULL', '')] }, [
        _a('ASSIGN', 'rating.effectivePerMille', 'COMPUTE:EPM_FORMULA'),
      ]))],
  },
  {
    id: 'rate-form-002', name: 'Pure Premium Formula', category: 'Rating Formula',
    tags: ['gtl', 'rating', 'formula'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Compute pure premium = (SA × EPM) / 1000.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rating.effectivePerMille', 'IS_NOT_NULL', '')] }, [
        _a('ASSIGN', 'rating.purePremium', 'COMPUTE:PURE_PREMIUM_FORMULA'),
      ]))],
  },
  {
    id: 'rate-form-003', name: 'Commercial Gross-Up Formula', category: 'Rating Formula',
    tags: ['gtl', 'rating', 'formula'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Compute commercial premium = pure premium × (1 + expense loading + profit margin).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rating.purePremium', 'IS_NOT_NULL', '')] }, [
        _a('ASSIGN', 'rating.commercialPremium', 'COMPUTE:COMMERCIAL_GROSS_UP'),
      ]))],
  },
  {
    id: 'rate-form-008', name: 'Concentration Load', category: 'Rating Formula',
    tags: ['gtl', 'rating', 'formula', 'load'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply concentration load when single age band > 30% of scheme.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.maxAgeBandConcentration', 'GREATER_THAN', '0.30')] }, [
        _a('ASSIGN', 'rating.concentrationLoad', 'LOAD:CONCENTRATION'),
      ]))],
  },
  {
    id: 'rate-form-009', name: 'High Hazard Mix Load', category: 'Rating Formula',
    tags: ['gtl', 'rating', 'formula', 'load'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply high hazard mix load when >20% of lives in CLASS_III+.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.highHazardMixPct', 'GREATER_THAN', '0.20')] }, [
        _a('ASSIGN', 'rating.hazardMixLoad', 'LOAD:HIGH_HAZARD_MIX'),
      ]))],
  },
  {
    id: 'rate-form-010', name: 'Data Quality Loading', category: 'Rating Formula',
    tags: ['gtl', 'rating', 'formula', 'load'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply DQ loading when census data quality band is BRONZE.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('census.dqBand', 'EQUALS', 'BRONZE')] }, [
        _a('ASSIGN', 'rating.dqLoad', 'LOAD:DATA_QUALITY'),
      ]))],
  },
  {
    id: 'rate-form-011', name: 'Minimum Premium Floor', category: 'Rating Formula',
    tags: ['gtl', 'rating', 'formula'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Enforce minimum annual premium floor per product schedule.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rating.annualPremium', 'LESS_THAN', 'product.minPremiumFloor')] }, [
        _a('ASSIGN', 'rating.annualPremium', 'OVERRIDE:MIN_PREMIUM_FLOOR'),
      ]))],
  },
  {
    id: 'rate-form-012', name: 'GST 18%', category: 'Rating Formula',
    tags: ['gtl', 'rating', 'tax', 'gst'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply 18% GST on commercial premium.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rating.commercialPremium', 'IS_NOT_NULL', '')] }, [
        _a('ASSIGN', 'rating.gst', 'COMPUTE:GST_18PCT'),
      ]))],
  },
  {
    id: 'rate-form-013', name: 'IRDAI Rate Floor Check', category: 'Rating Formula',
    tags: ['gtl', 'rating', 'formula', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'DRAFT', 'Block when commercial premium is below IRDAI mandated rate floor.', 'Draft', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rating.commercialPremium', 'LESS_THAN', 'irdai.rateFloor')] }, [
        _a('ASSIGN', 'rating.outcome', 'FAIL:IRDAI_RATE_FLOOR'),
      ]))],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// A3 · GTL Quote Decisioning — Non-DMN Rules (16 rules)
// ─────────────────────────────────────────────────────────────────────────────
export const SEED_A3_RULES: Rule[] = [
  // ── Premium_Formulas ──
  {
    id: 'pmt-005', name: 'Rate Slab Lookup', category: 'Premium Formula',
    tags: ['gtl', 'premium', 'formula'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Look up rate slab from rate table based on age band, hazard class, and scheme type.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rating.slabKey', 'IS_NOT_NULL', '')] }, [
        _a('ASSIGN', 'rating.rateSlab', 'COMPUTE:RATE_SLAB_LOOKUP'),
      ]))],
  },
  {
    id: 'pmt-006', name: 'Salary-Multiple SA Derivation', category: 'Premium Formula',
    tags: ['gtl', 'premium', 'sa', 'formula'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Derive sum assured = salary × plan multiple for salary-linked plans.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('plan.saType', 'EQUALS', 'SALARY_MULTIPLE')] }, [
        _a('ASSIGN', 'member.sumAssured', 'COMPUTE:SALARY_MULTIPLE_SA'),
      ]))],
  },
  {
    id: 'pmt-007', name: 'Loan-Outstanding SA Derivation', category: 'Premium Formula',
    tags: ['gtl', 'premium', 'sa', 'formula', 'credit-life'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Derive sum assured from loan outstanding for credit-life plans.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('plan.saType', 'EQUALS', 'LOAN_OUTSTANDING')] }, [
        _a('ASSIGN', 'member.sumAssured', 'COMPUTE:LOAN_OUTSTANDING_SA'),
      ]))],
  },
  {
    id: 'pmt-008', name: 'Free-Look Refund Formula', category: 'Premium Formula',
    tags: ['gtl', 'premium', 'formula', 'refund'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Compute free-look refund = total_premium - stamp_duty_retained - medical_cost_retained; refund >= 0.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('policy.freeLookCancellation', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'refund.amount', 'COMPUTE:FREE_LOOK_REFUND_FORMULA'),
      ]))],
  },
  {
    id: 'pmt-009', name: 'Pro-Rata Add/Delete Formula', category: 'Premium Formula',
    tags: ['gtl', 'premium', 'formula', 'pro-rata'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Compute pro-rata premium adjustment for mid-term member add or delete.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('endorsement.type', 'IN', 'ADD_MEMBER,DELETE_MEMBER')] }, [
        _a('ASSIGN', 'endorsement.premiumAdjustment', 'COMPUTE:PRO_RATA_ADD_DELETE'),
      ]))],
  },
  // ── Tax_HSN_StampDuty ──
  {
    id: 'tax-jur-005', name: 'HSN 9971 Life Insurance', category: 'Tax & Stamp Duty',
    tags: ['gtl', 'tax', 'hsn', 'gst'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply HSN code 9971 for life insurance products.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('product.lineOfBusiness', 'EQUALS', 'LIFE')] }, [
        _a('ASSIGN', 'tax.hsnCode', 'ASSIGN:HSN_9971'),
      ]))],
  },
  {
    id: 'tax-jur-006', name: 'Per-Product GST Treatment Override', category: 'Tax & Stamp Duty',
    tags: ['gtl', 'tax', 'gst'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Override GST treatment when product has a registered GST exception.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('product.gstException', 'IS_NOT_NULL', '')] }, [
        _a('ASSIGN', 'tax.gstTreatment', 'OVERRIDE:PRODUCT_GST_EXCEPTION'),
      ]))],
  },
  {
    id: 'tax-jur-007', name: 'Stamp Duty Formula', category: 'Tax & Stamp Duty',
    tags: ['gtl', 'tax', 'stamp-duty'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Compute stamp duty = premium × state stamp duty rate.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('policy.jurisdiction', 'IS_NOT_NULL', '')] }, [
        _a('ASSIGN', 'tax.stampDuty', 'COMPUTE:STAMP_DUTY_FORMULA'),
      ]))],
  },
  {
    id: 'tax-jur-009', name: 'Micro GTL Stamp Duty 0.02%', category: 'Tax & Stamp Duty',
    tags: ['gtl', 'tax', 'stamp-duty', 'micro'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply flat 0.02% stamp duty rate for micro GTL products.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('product.micro', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'tax.stampDutyRate', 'ASSIGN:MICRO_STAMP_DUTY_0_02PCT'),
      ]))],
  },
  // ── Override_Authority ──
  {
    id: 'ovr-auth-001', name: 'Rate Override Approval Required', category: 'Override Authority',
    tags: ['gtl', 'override', 'authority'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require approval when rate override exceeds authorised band.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('override.rateDeviationPct', 'GREATER_THAN', 'authority.maxRateDeviationPct')] }, [
        _a('ASSIGN', 'override.status', 'REQUIRE:RATE_OVERRIDE_APPROVAL'),
      ]))],
  },
  {
    id: 'ovr-auth-002', name: 'UW Manager Two-Officer Approval', category: 'Override Authority',
    tags: ['gtl', 'override', 'uw', 'sod'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require two-officer approval for UW Manager or RI Referral band decisions.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.band', 'IN', 'UW_MANAGER,RI_REFERRAL'), _c('approval.twoOfficerId', 'IS_NULL', '')] }, [
        _a('ASSIGN', 'approval.status', 'REQUIRE:TWO_OFFICER'),
      ]))],
  },
  {
    id: 'ovr-auth-003', name: 'Override Approve Valid Reason', category: 'Override Authority',
    tags: ['gtl', 'override', 'authority', 'reason-code'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject override approve when reason code is not in allowed set.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('override.action', 'EQUALS', 'APPROVE'), _c('override.reasonCode', 'NOT_IN', 'STRATEGIC_RELATIONSHIP,REGULATORY_EXCEPTION')] }, [
        _a('ASSIGN', 'override.status', 'BLOCK:INVALID_OVERRIDE_REASON'),
      ]))],
  },
  {
    id: 'ovr-auth-004', name: 'Override Reject Valid Reason', category: 'Override Authority',
    tags: ['gtl', 'override', 'authority', 'reason-code'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject override reject when reason code is not OUTSIDE_APPETITE.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('override.action', 'EQUALS', 'REJECT'), _c('override.reasonCode', 'NOT_EQUALS', 'OUTSIDE_APPETITE')] }, [
        _a('ASSIGN', 'override.status', 'BLOCK:INVALID_REJECT_REASON'),
      ]))],
  },
  {
    id: 'ovr-auth-005', name: 'UW Decline Valid Reasons', category: 'Override Authority',
    tags: ['gtl', 'override', 'uw', 'reason-code'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject UW decline when reason code is not in allowed decline set.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.action', 'EQUALS', 'DECLINE'), _c('uw.reasonCode', 'NOT_IN', 'MEDICAL_HIGH_RISK,OCCUPATION_HAZARDOUS,SANCTIONS_OR_UAPA_MATCH,NRI_DECLINE_COUNTRY')] }, [
        _a('ASSIGN', 'uw.status', 'BLOCK:INVALID_DECLINE_REASON'),
      ]))],
  },
  {
    id: 'ovr-auth-006', name: 'UW Postpone Valid Reason', category: 'Override Authority',
    tags: ['gtl', 'override', 'uw', 'reason-code'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject UW postpone when reason code is not in allowed postpone set.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.action', 'EQUALS', 'POSTPONE'), _c('uw.reasonCode', 'NOT_IN', 'PED_TREATMENT_ONGOING,AWAITING_RI_RESPONSE')] }, [
        _a('ASSIGN', 'uw.status', 'BLOCK:INVALID_POSTPONE_REASON'),
      ]))],
  },
  {
    id: 'ovr-auth-007', name: 'EMR 50–75% Reason Required', category: 'Override Authority',
    tags: ['gtl', 'override', 'emr', 'reason-code'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require reason code when applying EMR load between 50% and 75%.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rating.emrPct', 'GREATER_THAN_OR_EQUAL', '50'), _c('rating.emrPct', 'LESS_THAN_OR_EQUAL', '75'), _c('rating.emrReasonCode', 'IS_NULL', '')] }, [
        _a('ASSIGN', 'rating.status', 'REQUIRE:EMR_REASON_CODE'),
      ]))],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// A4 · GTL Product — Non-DMN Rules (42 rules)
// ─────────────────────────────────────────────────────────────────────────────
export const SEED_A4_RULES: Rule[] = [
  // ── PROD_Gender_Suicide_Revival ──
  {
    id: 'prod-val-030', name: 'Female Age Set-Back 3 Years', category: 'Product Validation',
    tags: ['gtl', 'product', 'gender', 'rating'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply 3-year age set-back for female lives in mortality rating.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.gender', 'EQUALS', 'FEMALE')] }, [
        _a('ASSIGN', 'rating.ageSetBack', 'ASSIGN:FEMALE_AGE_SETBACK_3YR'),
      ]))],
  },
  {
    id: 'prod-val-031', name: 'Female Age Floor Credit Life', category: 'Product Validation',
    tags: ['gtl', 'product', 'gender', 'credit-life'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Enforce minimum rated age floor for female credit-life members after set-back.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.gender', 'EQUALS', 'FEMALE'), _c('product.schemeType', 'EQUALS', 'LENDER_BORROWER')] }, [
        _a('ASSIGN', 'rating.minRatedAge', 'ASSIGN:FEMALE_CREDIT_LIFE_AGE_FLOOR'),
      ]))],
  },
  {
    id: 'prod-val-032', name: 'Transgender Use Male Rates', category: 'Product Validation',
    tags: ['gtl', 'product', 'gender'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Use male mortality rates for transgender members per product rule.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.gender', 'IN', 'TRANSGENDER,OTHER')] }, [
        _a('ASSIGN', 'rating.genderForRating', 'ASSIGN:USE_MALE_RATES'),
      ]))],
  },
  {
    id: 'prod-val-033', name: 'Uni-Smoker Premium', category: 'Product Validation',
    tags: ['gtl', 'product', 'smoker'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply unified smoker/non-smoker rate (no differentiation) for group business.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('product.smokerDifferentiation', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'rating.smokerLoad', 'ASSIGN:UNI_SMOKER_RATE'),
      ]))],
  },
  {
    id: 'prod-val-034', name: 'Joint Life 3.5% Discount Credit Life', category: 'Product Validation',
    tags: ['gtl', 'product', 'joint-life', 'discount'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply 3.5% discount for joint life covers on credit life products.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('product.jointLife', 'EQUALS', 'true'), _c('product.schemeType', 'EQUALS', 'LENDER_BORROWER')] }, [
        _a('ASSIGN', 'rating.jointLifeDiscount', 'DISCOUNT:JOINT_LIFE_3_5PCT_CREDIT'),
      ]))],
  },
  {
    id: 'prod-val-035', name: 'Joint Life 2.5% Discount Loan Secure', category: 'Product Validation',
    tags: ['gtl', 'product', 'joint-life', 'discount'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply 2.5% discount for joint life covers on loan secure products.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('product.jointLife', 'EQUALS', 'true'), _c('productCode', 'EQUALS', 'GTL_LOAN_SECURE')] }, [
        _a('ASSIGN', 'rating.jointLifeDiscount', 'DISCOUNT:JOINT_LIFE_2_5PCT_LOAN_SECURE'),
      ]))],
  },
  {
    id: 'prod-val-040', name: 'Suicide 80% Rule', category: 'Product Validation',
    tags: ['gtl', 'product', 'suicide', 'claims'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Pay 80% of premiums or surrender value (whichever is higher) on suicide within 12 months.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('claim.causeOfDeath', 'EQUALS', 'SUICIDE'), _c('claim.monthsSinceCoverStart', 'LESS_THAN_OR_EQUAL', '12')] }, [
        _a('ASSIGN', 'claim.outcome', 'REQUIRE:SUICIDE_RULE'),
      ]))],
  },
  {
    id: 'prod-val-041', name: 'Suicide Waiver Employer Standard', category: 'Product Validation',
    tags: ['gtl', 'product', 'suicide', 'waiver'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Waive suicide exclusion for GTL Employer Standard product variant.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('productCode', 'IN', 'GTL_EMPLOYER_STANDARD,GTL_EMPLOYER_FLEX'), _c('claim.causeOfDeath', 'EQUALS', 'SUICIDE')] }, [
        _a('ASSIGN', 'claim.suicideExclusionWaived', 'WAIVE:SUICIDE_EXCLUSION_EMPLOYER_STANDARD'),
      ]))],
  },
  {
    id: 'prod-val-045', name: 'Revival Rate G-Sec + 50bps', category: 'Product Validation',
    tags: ['gtl', 'product', 'revival', 'rate'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply revival interest rate = current G-Sec rate + 50 basis points.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('policy.revivalRequested', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'revival.interestRate', 'COMPUTE:GSEC_PLUS_50BPS'),
      ]))],
  },
  {
    id: 'prod-val-046', name: 'Tax 80C and 10(10D) Eligibility', category: 'Product Validation',
    tags: ['gtl', 'product', 'tax', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Confirm product eligibility for tax benefits under Sections 80C and 10(10D).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('product.lineOfBusiness', 'EQUALS', 'LIFE')] }, [
        _a('ASSIGN', 'product.taxBenefit', 'ASSIGN:SEC_80C_10_10D_ELIGIBLE'),
      ]))],
  },
  {
    id: 'prod-val-049', name: 'No Policy Loan', category: 'Product Validation',
    tags: ['gtl', 'product', 'policy-loan'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block policy loan facility — not applicable for group term life.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('request.policyLoan', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'request.outcome', 'BLOCK:POLICY_LOAN_NOT_APPLICABLE'),
      ]))],
  },
  {
    id: 'prod-val-050', name: 'S38/S39 Compliance', category: 'Product Validation',
    tags: ['gtl', 'product', 'compliance', 'assignment'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Enforce Section 38/39 compliance for nomination and assignment.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('policy.nominationOrAssignment', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'compliance.sec38_39', 'REQUIRE:SEC38_39_COMPLIANCE'),
      ]))],
  },
  {
    id: 'prod-val-051', name: 'ULIP Switch Minimum', category: 'Product Validation',
    tags: ['gtl', 'product', 'ulip'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block ULIP fund switch when switch amount is below minimum threshold.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('ulip.switchAmount', 'LESS_THAN', 'product.minSwitchAmount')] }, [
        _a('ASSIGN', 'ulip.switchOutcome', 'BLOCK:ULIP_SWITCH_BELOW_MINIMUM'),
      ]))],
  },
  {
    id: 'prod-val-052', name: 'ULIP Switch Maximum', category: 'Product Validation',
    tags: ['gtl', 'product', 'ulip'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block ULIP fund switch when annual switch count exceeds product maximum.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('ulip.annualSwitchCount', 'GREATER_THAN', 'product.maxSwitchesPerYear')] }, [
        _a('ASSIGN', 'ulip.switchOutcome', 'BLOCK:ULIP_SWITCH_ABOVE_MAXIMUM'),
      ]))],
  },
  {
    id: 'prod-val-057', name: 'Termination Notice 30 Days', category: 'Product Validation',
    tags: ['gtl', 'product', 'termination'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require 30-day notice period for policy termination by employer.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('termination.initiatedBy', 'EQUALS', 'EMPLOYER'), _c('termination.noticeDays', 'LESS_THAN', '30')] }, [
        _a('ASSIGN', 'termination.outcome', 'REQUIRE:NOTICE_30D'),
      ]))],
  },
  {
    id: 'prod-val-058', name: 'Termination Notice 90 Days', category: 'Product Validation',
    tags: ['gtl', 'product', 'termination'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require 90-day notice period for policy termination by insurer.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('termination.initiatedBy', 'EQUALS', 'INSURER'), _c('termination.noticeDays', 'LESS_THAN', '90')] }, [
        _a('ASSIGN', 'termination.outcome', 'REQUIRE:NOTICE_90D'),
      ]))],
  },
  // ── PROD_Riders_Decline_Waiting ──
  {
    id: 'rdr-010', name: 'ADB Non-SP Credit Life Reject', category: 'Riders',
    tags: ['gtl', 'product', 'rider', 'adb'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject ADB rider attachment for non-single-premium credit life products.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_ACCIDENTAL_DEATH'), _c('product.premiumType', 'NOT_EQUALS', 'SINGLE_PREMIUM'), _c('product.schemeType', 'EQUALS', 'LENDER_BORROWER')] }, [
        _a('ASSIGN', 'rider.outcome', 'BLOCK:ADB_NON_SP_CREDIT_LIFE'),
      ]))],
  },
  {
    id: 'rdr-011', name: 'Rider Term Exceeds Base Term', category: 'Riders',
    tags: ['gtl', 'product', 'rider'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject rider when rider term exceeds base policy term.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.termYears', 'GREATER_THAN', 'base.termYears')] }, [
        _a('ASSIGN', 'rider.outcome', 'BLOCK:RIDER_TERM_EXCEEDS_BASE'),
      ]))],
  },
  {
    id: 'rdr-012', name: 'ADB Decline Hazard Class IV/V', category: 'Riders',
    tags: ['gtl', 'product', 'rider', 'adb', 'hazard'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Decline ADB rider when member hazard class is CLASS_IV or CLASS_V.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_ACCIDENTAL_DEATH'), _c('member.hazardClass', 'IN', 'CLASS_IV,CLASS_V')] }, [
        _a('ASSIGN', 'rider.outcome', 'DECLINE:HAZARD_IV_V'),
      ]))],
  },
  {
    id: 'rdr-013', name: 'CI Decline High Risk', category: 'Riders',
    tags: ['gtl', 'product', 'rider', 'ci'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Decline CI rider when member has active cancer, recent stroke, or severe CV condition.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_CRITICAL_ILLNESS'), _c('member.highRiskCondition', 'IN', 'ACTIVE_CANCER,RECENT_STROKE,SEVERE_CV')] }, [
        _a('ASSIGN', 'rider.outcome', 'DECLINE:CI_HIGH_RISK'),
      ]))],
  },
  {
    id: 'rdr-014', name: 'TPD Decline Triggers', category: 'Riders',
    tags: ['gtl', 'product', 'rider', 'tpd'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Decline TPD rider when member has active disability or is CLASS_V hazard.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_PERMANENT_DISABILITY'), _c('member.tpdTrigger', 'IN', 'ACTIVE_DISABILITY,HAZARD_V')] }, [
        _a('ASSIGN', 'rider.outcome', 'DECLINE:TPD_TRIGGERS'),
      ]))],
  },
  {
    id: 'rdr-015', name: 'WOP Decline Pre-Existing CI/Disability', category: 'Riders',
    tags: ['gtl', 'product', 'rider', 'wop', 'ped'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Decline WOP rider when member has pre-existing CI or disability.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_WAIVER_OF_PREMIUM'), _c('member.ped', 'IN', 'PRE_EXISTING_CI,PRE_EXISTING_DISABILITY')] }, [
        _a('ASSIGN', 'rider.outcome', 'DECLINE:WOP_PED'),
      ]))],
  },
  {
    id: 'rdr-016', name: 'CI Rider 30-Day Waiting Period', category: 'Riders',
    tags: ['gtl', 'product', 'rider', 'ci', 'waiting'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require 30-day waiting period before CI rider claim is admissible.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_CRITICAL_ILLNESS'), _c('claim.daysSinceCoverStart', 'LESS_THAN', '30')] }, [
        _a('ASSIGN', 'claim.outcome', 'REQUIRE:WAIT_30D'),
      ]))],
  },
  {
    id: 'rdr-017', name: 'CI 30-Day Survival Required', category: 'Riders',
    tags: ['gtl', 'product', 'rider', 'ci', 'survival'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Decline CI claim when member survival days after diagnosis is less than 30.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_CRITICAL_ILLNESS'), _c('claim.survivalDays', 'LESS_THAN', '30')] }, [
        _a('ASSIGN', 'claim.outcome', 'DECLINE:CI_SURVIVAL_PERIOD'),
      ]))],
  },
  {
    id: 'rdr-018', name: 'ATPD 180-Day Waiting Period', category: 'Riders',
    tags: ['gtl', 'product', 'rider', 'atpd', 'waiting'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require 180-day waiting period after disability onset before ATPD claim is admissible.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_PERMANENT_DISABILITY'), _c('claim.daysSinceDisability', 'LESS_THAN', '180')] }, [
        _a('ASSIGN', 'claim.outcome', 'REQUIRE:ATPD_WAIT_180D'),
      ]))],
  },
  {
    id: 'rdr-019', name: 'MCS Inbuilt ADB 5-Year Cap 20L', category: 'Riders',
    tags: ['gtl', 'product', 'rider', 'adb', 'mortgage'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'For Mortgage Credit Shield, apply inbuilt ADB for first 5 years capped at min(baseDB, ₹20L).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('productCode', 'EQUALS', 'GTL_MORTGAGE_CREDIT_SHIELD')] }, [
        _a('ASSIGN', 'rider.adbCap', 'REQUIRE:INBUILT_ADB_5Y_CAP_20L'),
      ]))],
  },
  {
    id: 'rdr-020', name: 'Hospi Cash Grid Setup', category: 'Riders',
    tags: ['gtl', 'product', 'rider', 'hospi-cash'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Configure Hospi Cash Benefit: DHCB ₹1000/2000/3000; ICU 100%; minor surg 5×; major surg 20×; cap 90×.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_HOSPI_CASH')] }, [
        _a('ASSIGN', 'rider.hospiCashConfig', 'REQUIRE:HOSPI_CASH_GRID'),
      ]))],
  },
  {
    id: 'rdr-021', name: 'EMI Protect 7-Day Waiting Period', category: 'Riders',
    tags: ['gtl', 'product', 'rider', 'emi', 'waiting'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Decline EMI Protect claim when continuous hospitalisation is less than 7 days.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_EMI_PROTECT'), _c('claim.hospitalisationDays', 'LESS_THAN', '7')] }, [
        _a('ASSIGN', 'claim.outcome', 'DECLINE:EMI_WAIT_7D'),
      ]))],
  },
  // ── PROD_Clauses_Exclusions ──
  {
    id: 'clause-001', name: 'Term Life Clause Pack Default', category: 'Clauses & Exclusions',
    tags: ['gtl', 'product', 'clause'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply CLAUSE_PACK_TERM_LIFE_STANDARD for employer/voluntary GTL products when no clause pack set.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('productCode', 'IN', 'GTL_EMPLOYER_STANDARD,GTL_VOLUNTARY_STANDARD'), _c('policy.clausePack', 'IS_NULL', '')] }, [
        _a('ASSIGN', 'policy.clausePack', 'REQUIRE:TERM_LIFE_CLAUSE_PACK'),
      ]))],
  },
  {
    id: 'clause-002', name: 'Credit Life Clause Pack Default', category: 'Clauses & Exclusions',
    tags: ['gtl', 'product', 'clause', 'credit-life'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply CLAUSE_PACK_CREDIT_LIFE_STANDARD for lender-borrower reducing products when no clause pack set.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('productCode', 'EQUALS', 'GTL_LENDER_BORROWER_REDUCING'), _c('policy.clausePack', 'IS_NULL', '')] }, [
        _a('ASSIGN', 'policy.clausePack', 'REQUIRE:CREDIT_LIFE_CLAUSE_PACK'),
      ]))],
  },
  {
    id: 'clause-003', name: 'Reducing Cover Loan Outstanding Required', category: 'Clauses & Exclusions',
    tags: ['gtl', 'product', 'clause', 'credit-life'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block when reducing cover clause is active but loan outstanding is missing.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('policy.clause', 'EQUALS', 'CLAUSE_REDUCING_COVER'), _c('member.loanOutstanding', 'IS_NULL', '')] }, [
        _a('ASSIGN', 'policy.outcome', 'BLOCK:LOAN_OUTSTANDING_REQUIRED'),
      ]))],
  },
  {
    id: 'clause-004', name: 'Lender as Payee Entity Required', category: 'Clauses & Exclusions',
    tags: ['gtl', 'product', 'clause', 'credit-life'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block at issuance when lender-as-payee clause is active but lender entity is not set.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('policy.clause', 'EQUALS', 'CLAUSE_LENDER_AS_PAYEE'), _c('policy.lenderEntity', 'IS_NULL', '')] }, [
        _a('ASSIGN', 'policy.outcome', 'BLOCK:LENDER_ENTITY_REQUIRED'),
      ]))],
  },
  {
    id: 'clause-005', name: 'Payee Priority Lender First', category: 'Clauses & Exclusions',
    tags: ['gtl', 'product', 'clause', 'claims'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Set payee priority to lender first when MPH is an RBI-regulated entity; residual goes to nominee.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('mph.rbiRegulated', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'claim.payeePriority', 'REQUIRE:PAYEE_LENDER_FIRST'),
      ]))],
  },
  {
    id: 'clause-006', name: 'Loan Closure Option on Foreclosure', category: 'Clauses & Exclusions',
    tags: ['gtl', 'product', 'clause', 'credit-life'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'On loan foreclosure offer surrender option or continue cover till end of term.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('policy.clause', 'EQUALS', 'CLAUSE_COVER_END_ON_LOAN_CLOSURE'), _c('loan.foreclosed', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'policy.loanClosureOption', 'REQUIRE:LOAN_CLOSURE_OPTION'),
      ]))],
  },
  {
    id: 'clause-007', name: 'Worker Class Disallows ADB', category: 'Clauses & Exclusions',
    tags: ['gtl', 'product', 'clause', 'rider'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject ADB rider attachment for MCLASS_WORKER members.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.memberClass', 'EQUALS', 'MCLASS_WORKER'), _c('rider.type', 'EQUALS', 'RDR_ACCIDENTAL_DEATH')] }, [
        _a('ASSIGN', 'rider.outcome', 'BLOCK:WORKER_DISALLOWS_ADB'),
      ]))],
  },
  {
    id: 'clause-008', name: 'CI Rider Manager Class Only', category: 'Clauses & Exclusions',
    tags: ['gtl', 'product', 'clause', 'rider', 'ci'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject CI rider when member class is not MCLASS_MANAGER.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.type', 'EQUALS', 'RDR_CRITICAL_ILLNESS'), _c('member.memberClass', 'NOT_EQUALS', 'MCLASS_MANAGER')] }, [
        _a('ASSIGN', 'rider.outcome', 'BLOCK:CI_MANAGER_ONLY'),
      ]))],
  },
  {
    id: 'clause-009', name: 'Joint Life Not Supported', category: 'Clauses & Exclusions',
    tags: ['gtl', 'product', 'joint-life'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject joint life rider when base product does not support joint life.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('rider.jointLife', 'EQUALS', 'true'), _c('base.jointLifeCapable', 'NOT_EQUALS', 'true')] }, [
        _a('ASSIGN', 'rider.outcome', 'BLOCK:JOINT_LIFE_NOT_SUPPORTED'),
      ]))],
  },
  {
    id: 'clause-010', name: 'Scheme Type Mix Block', category: 'Clauses & Exclusions',
    tags: ['gtl', 'product', 'composition'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject composition when multiple base products have different scheme_type_derived.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('composition.schemeTypeMix', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'composition.outcome', 'BLOCK:SCHEME_TYPE_MIX'),
      ]))],
  },
  {
    id: 'excl-001', name: 'Suicide Exclusion 80% Rule', category: 'Exclusions',
    tags: ['gtl', 'product', 'exclusion', 'suicide', 'claims'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'On suicide within 12 months pay 80% of premiums paid or surrender value, whichever is higher.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('claim.causeOfDeath', 'EQUALS', 'SUICIDE'), _c('claim.monthsSinceCoverStart', 'LESS_THAN_OR_EQUAL', '12')] }, [
        _a('ASSIGN', 'claim.outcome', 'REQUIRE:SUICIDE_RULE'),
      ]))],
  },
  {
    id: 'excl-002', name: 'Mortgage Credit Shield Exclusions', category: 'Exclusions',
    tags: ['gtl', 'product', 'exclusion', 'mortgage', 'claims'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Decline MCS claim when cause of death is in the product exclusion list (war, terrorism, criminal act, etc.).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('productCode', 'EQUALS', 'GTL_MORTGAGE_CREDIT_SHIELD'), _c('claim.causeOfDeath', 'IN', 'WAR,TERRORISM,CIVIL_WAR,ARMED_FORCES_DUTY,CRIMINAL_ACT,INTOXICATION,AVIATION_NON_FARE_PAYING,HAZARDOUS_HOBBY,HAZARDOUS_OCCUPATION,BODILY_OR_MENTAL_INFIRMITY')] }, [
        _a('ASSIGN', 'claim.outcome', 'DECLINE:EXCLUSION_HIT'),
      ]))],
  },
  {
    id: 'excl-003', name: 'ADB 45-Day Grace MCS', category: 'Exclusions',
    tags: ['gtl', 'product', 'exclusion', 'adb', 'mortgage'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Accidental death exclusion does NOT apply for first 45 days on MCS products.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('productCode', 'EQUALS', 'GTL_MORTGAGE_CREDIT_SHIELD'), _c('claim.daysSinceCoverStart', 'LESS_THAN_OR_EQUAL', '45')] }, [
        _a('ASSIGN', 'claim.adbExclusionWaived', 'WAIVE:ADB_45D_GRACE'),
      ]))],
  },
  {
    id: 'excl-004', name: 'Hazardous Occupation EMR', category: 'Exclusions',
    tags: ['gtl', 'product', 'exclusion', 'hazard', 'uw'], createdAt: '2026-06-01T00:00:00', createdBy: 'actuary@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Apply EMR loading and refer to UW for hazardous occupations (mining, deep-sea fishing, forestry, scuba diving).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.occupation', 'IN', 'MINING,DEEP_SEA_FISHING,FORESTRY,SCUBA_DIVING')] }, [
        _a('ASSIGN', 'rating.load', 'LOAD:HAZARDOUS_OCCUPATION_EMR'),
        _a('ASSIGN', 'uw.action', 'REFER_UW:HAZARDOUS_OCCUPATION'),
      ]))],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// A5 · GTL Eligibility & Documents — Non-DMN Rules (73 rules)
// ─────────────────────────────────────────────────────────────────────────────
export const SEED_A5_RULES: Rule[] = [
  // ── ELIG_Census ──
  {
    id: 'elig-census-001', name: 'Min Group Size Never Met', category: 'Census Eligibility',
    tags: ['gtl', 'eligibility', 'census'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block census when headcount is below the product minimum group size.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('census.headcount', 'LESS_THAN', 'product.minGroupSize')] }, [
        _a('ASSIGN', 'census.outcome', 'BLOCK:MIN_GROUP_SIZE_NEVER_MET'),
      ]))],
  },
  {
    id: 'elig-census-003', name: 'Census Incomplete Block', category: 'Census Eligibility',
    tags: ['gtl', 'eligibility', 'census'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block Quote SoR bind when plans count or members count is zero.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'or', conditions: [_c('census.plansCount', 'EQUALS', '0'), _c('census.membersCount', 'EQUALS', '0')] }, [
        _a('ASSIGN', 'census.outcome', 'BLOCK:CENSUS_INCOMPLETE'),
      ]))],
  },
  {
    id: 'elig-census-004', name: 'Census Template Headers Required', category: 'Census Eligibility',
    tags: ['gtl', 'eligibility', 'census', 'template'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require employee template headers (employee_id, full_name, gender, dob, salary) or borrower headers (borrower_id, full_name, gender, dob, loan_outstanding).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('census.requiredHeadersMissing', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'census.outcome', 'REQUIRE:CENSUS_TEMPLATE_HEADERS'),
      ]))],
  },
  {
    id: 'elig-census-008', name: 'Census DQ Below Silver', category: 'Census Eligibility',
    tags: ['gtl', 'eligibility', 'census', 'dq'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Drop out of AUTO_STP_MSME band when census data quality band is BRONZE or RED.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('census.dqBand', 'IN', 'BRONZE,RED')] }, [
        _a('ASSIGN', 'census.stpBand', 'BLOCK:CENSUS_DQ_BELOW_SILVER'),
      ]))],
  },
  {
    id: 'elig-census-009', name: 'Duplicate Member in Census', category: 'Census Eligibility',
    tags: ['gtl', 'eligibility', 'census', 'duplicate'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block when duplicate member detected on (DOB + name + employee_id).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('census.duplicateOnKey', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'census.outcome', 'BLOCK:E-MEMBER-DUPLICATE'),
      ]))],
  },
  {
    id: 'elig-census-010', name: 'Employer and Employee Mix Required', category: 'Census Eligibility',
    tags: ['gtl', 'eligibility', 'census', 'employer-paid'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block employer-paid scheme when employer count < 1 or employee count < 1.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.schemeType', 'EQUALS', 'EMPLOYER_PAID'), _c('census.employerEmployeeMixValid', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'census.outcome', 'REQUIRE:EMPLOYER_EE_MIX'),
      ]))],
  },
  {
    id: 'elig-census-011', name: 'Member Age Outside Product Range', category: 'Census Eligibility',
    tags: ['gtl', 'eligibility', 'census', 'age'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject member when age is outside [productMinEntryAge, productMaxEntryAge].', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.ageInRange', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'member.outcome', 'REQUIRE:AGE_RANGE'),
      ]))],
  },
  // ── ELIG_Member ──
  {
    id: 'elig-mem-001', name: 'Member Required Fields Missing', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'validation'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block row when any of member_id, name, gender, or dob is missing.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.requiredFieldsMissing', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'member.outcome', 'BLOCK:MEMBER_REQUIRED_FIELDS_MISSING'),
      ]))],
  },
  {
    id: 'elig-mem-002', name: 'Employee Missing Salary', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'salary'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block row when member type is EMPLOYEE and salary is missing.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.memberType', 'EQUALS', 'EMPLOYEE'), _c('member.salary', 'IS_NULL', '')] }, [
        _a('ASSIGN', 'member.outcome', 'BLOCK:EMPLOYEE_MISSING_SALARY'),
      ]))],
  },
  {
    id: 'elig-mem-003', name: 'DOB Invalid', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'dob'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block row when DOB is not parseable, is a future date, or results in age outside product range.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.dobValid', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'member.outcome', 'BLOCK:DOB_INVALID'),
      ]))],
  },
  {
    id: 'elig-mem-004', name: 'Gender Value Invalid', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'gender'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block row when gender value is not in {MALE, FEMALE, M, F, OTHER, TRANSGENDER}.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.gender', 'NOT_IN', 'MALE,FEMALE,M,F,OTHER,TRANSGENDER')] }, [
        _a('ASSIGN', 'member.outcome', 'BLOCK:GENDER_INVALID'),
      ]))],
  },
  {
    id: 'elig-mem-006', name: 'Borrower Loan Fields Missing', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'credit-life'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block borrower row when loan_outstanding, loan_sanction_amount, or loan_term_months is missing.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.borrowerLoanFieldsMissing', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'member.outcome', 'BLOCK:BORROWER_LOAN_FIELDS_MISSING'),
      ]))],
  },
  {
    id: 'elig-mem-008', name: 'Joiner Date After Effective Date', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'joiner'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block joiner member when date of joining scheme is after the scheme effective date.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.dateOfJoiningScheme', 'GREATER_THAN', 'scheme.effectiveDate')] }, [
        _a('ASSIGN', 'member.outcome', 'BLOCK:MEMBER_INELIGIBLE_DOJ'),
      ]))],
  },
  {
    id: 'elig-mem-011', name: 'Duplicate Member ID in Draft', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'duplicate'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block when member ID is not unique within the draft envelope.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.idUniqueInDraft', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'member.outcome', 'BLOCK:E-MEMBER-DUPLICATE'),
      ]))],
  },
  {
    id: 'elig-mem-013', name: 'Eligibility Status Not Eligible', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block progression when member eligibility status is not ELIGIBLE.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.eligibilityStatus', 'NOT_EQUALS', 'ELIGIBLE')] }, [
        _a('ASSIGN', 'member.outcome', 'BLOCK:NOT_ELIGIBLE'),
      ]))],
  },
  {
    id: 'elig-mem-014', name: 'PAS Age Range Error GTL-002', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'pas'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block at PAS issuance when member age is outside product range (GTL-002 error).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.ageInRange', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'member.outcome', 'BLOCK:GTL_002_AGE_RANGE'),
      ]))],
  },
  {
    id: 'elig-mem-015', name: 'Claim Manual Age at Death > 65', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'claims'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Route to manual claim investigation when age at death exceeds 65.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.ageAtDeath', 'GREATER_THAN', '65')] }, [
        _a('ASSIGN', 'claim.outcome', 'REQUIRE:CLAIM_MANUAL'),
      ]))],
  },
  {
    id: 'elig-mem-016', name: 'SI Formula Violation', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'si'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block when sum insured violates the product SA formula or cap.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.siFormulaViolation', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'member.outcome', 'BLOCK:E-SI-FORMULA-VIOLATION'),
      ]))],
  },
  {
    id: 'elig-mem-017', name: 'Hazardous Occupation UW Referral', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'hazard', 'uw'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Trigger hazardous occupation UW referral when member occupation flag is set.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.hazardousOccupation', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.action', 'REFER_UW:HAZARDOUS_OCCUPATION'),
      ]))],
  },
  {
    id: 'elig-mem-018', name: 'NRI UW Referral and Declaration', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'nri', 'uw'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Route NRI or foreign national member to UW and require NRI declaration with wet signature.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.nriOrForeignNational', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'uw.action', 'REFER_UW:NRI'),
        _a('ASSIGN', 'docs.required', 'REQUIRE:NRI_DECL'),
      ]))],
  },
  {
    id: 'elig-mem-019', name: 'PEP DD Form Required', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'pep', 'kyc'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require PEP due diligence form when member matches PEP list.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.pepMatch', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'docs.required', 'REQUIRE:PEP_DD_FORM'),
      ]))],
  },
  {
    id: 'elig-mem-020', name: 'Medical Questionnaire and PED Declaration', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'ped', 'medical'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Trigger medical questionnaire and PED declaration when member has disclosed PED or age exceeds non-medical cap.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'or', conditions: [_c('member.hasDisclosedPed', 'EQUALS', 'true'), _c('member.age', 'GREATER_THAN', 'product.nonMedicalAgeCap')] }, [
        _a('ASSIGN', 'uw.action', 'REQUIRE:MEDICAL_QUESTIONNAIRE'),
        _a('ASSIGN', 'docs.required', 'REQUIRE:PED_DECL'),
      ]))],
  },
  {
    id: 'elig-mem-021', name: 'FCL Breach UW Referral', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'fcl', 'uw'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Trigger FCL breach referral to UW when member sum assured exceeds member FCL.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.sumAssured', 'GREATER_THAN', 'member.fcl')] }, [
        _a('ASSIGN', 'uw.action', 'REFER_UW:FCL_BREACH'),
      ]))],
  },
  {
    id: 'elig-mem-024', name: 'Salary Consistency Warning', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'salary'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Issue warning when monthly and annual salary are both present but mismatch beyond tolerance.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.salaryConsistencyMismatch', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'member.warning', 'REQUIRE:SALARY_CONSISTENCY_WARN'),
      ]))],
  },
  {
    id: 'elig-mem-025', name: 'GCL Loan Outstanding Out of Bounds', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'gcl', 'credit-life'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Warn when loan outstanding is outside product bounds (GCL-002).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.loanOutstandingInBounds', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'member.warning', 'REQUIRE:GCL_002_LOAN_BOUNDS'),
      ]))],
  },
  {
    id: 'elig-mem-026', name: 'GCL Loan Tenure Out of Bounds', category: 'Member Eligibility',
    tags: ['gtl', 'eligibility', 'member', 'gcl', 'credit-life'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block and stop when loan term months is outside product bounds (GCL-001 error).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('member.loanTermInBounds', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'member.outcome', 'BLOCK:GCL_001_TENURE'),
      ]))],
  },
  // ── DOC_Gate_Precedence_Ingest ──
  {
    id: 'doc-gate-001', name: 'Hard Pre-Issue Gate Fail', category: 'Document Gate',
    tags: ['gtl', 'documents', 'gate', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Set hard_pre_issue_pass = false and block MPS release when not all MANDATORY_FOR_ISSUANCE evidence is VERIFIED or WAIVED.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('docs.allMandatoryVerifiedOrWaived', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'policy.hardPreIssuePass', 'FAIL:HARD_PRE_ISSUE_PASS'),
      ]))],
  },
  {
    id: 'doc-prec-001', name: 'Document Source Precedence Default', category: 'Document Precedence',
    tags: ['gtl', 'documents', 'precedence'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'When multiple evidence sources exist for same document apply default precedence: MPH > BROKER > SALES_RM > INTERNAL_OPS.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('docs.multipleSourcesForDoc', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'docs.precedence', 'REQUIRE:PRECEDENCE_DEFAULT'),
      ]))],
  },
  {
    id: 'doc-prec-002', name: 'Quote Slip Source Precedence', category: 'Document Precedence',
    tags: ['gtl', 'documents', 'precedence'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'For Quote Slip evidence use BROKER > MPH precedence order.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('docs.documentType', 'EQUALS', 'QUOTE_SLIP')] }, [
        _a('ASSIGN', 'docs.precedence', 'REQUIRE:PRECEDENCE_QUOTE_SLIP'),
      ]))],
  },
  {
    id: 'doc-ingest-001', name: 'Invalid Upload Source', category: 'Document Ingest',
    tags: ['gtl', 'documents', 'ingest'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject document when upload source is not in {PORTAL_UPLOAD, API, INBOUND_MAILBOX, OFFLINE_PHYSICAL}.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('docs.uploadSource', 'NOT_IN', 'PORTAL_UPLOAD,API,INBOUND_MAILBOX,OFFLINE_PHYSICAL')] }, [
        _a('ASSIGN', 'docs.outcome', 'BLOCK:UPLOAD_SOURCE_INVALID'),
      ]))],
  },
  {
    id: 'doc-ingest-002', name: 'OCR Low Confidence Manual Review', category: 'Document Ingest',
    tags: ['gtl', 'documents', 'ingest', 'ocr'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Route to manual review queue when OCR confidence is below 0.60.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('docs.ocrConfidence', 'LESS_THAN', '0.60')] }, [
        _a('ASSIGN', 'docs.outcome', 'REQUIRE:MANUAL_REVIEW'),
      ]))],
  },
  {
    id: 'doc-ingest-003', name: 'OCR Medium Confidence Reviewer Queue', category: 'Document Ingest',
    tags: ['gtl', 'documents', 'ingest', 'ocr'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Route to reviewer queue when OCR confidence is between 0.60 and 0.85.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('docs.ocrConfidence', 'GREATER_THAN_OR_EQUAL', '0.60'), _c('docs.ocrConfidence', 'LESS_THAN', '0.85')] }, [
        _a('ASSIGN', 'docs.outcome', 'REQUIRE:REVIEWER_QUEUE'),
      ]))],
  },
  {
    id: 'doc-ingest-004', name: 'OCR High Confidence Auto-Promote', category: 'Document Ingest',
    tags: ['gtl', 'documents', 'ingest', 'ocr'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Auto-promote document to evidence when OCR confidence is >= 0.85.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('docs.ocrConfidence', 'GREATER_THAN_OR_EQUAL', '0.85')] }, [
        _a('ASSIGN', 'docs.outcome', 'PASS:OCR_AUTO_PROMOTE'),
      ]))],
  },
  // ── SIG_Requirements ──
  {
    id: 'sig-001', name: 'Signatory Invalid', category: 'Signature',
    tags: ['gtl', 'signature', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject wet signature evidence when signatory snapshot ID is missing or authority is not VALID.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('sig.signatureMode', 'EQUALS', 'WET'), _c('sig.signatoryValid', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'sig.outcome', 'BLOCK:SIGNATORY_INVALID'),
      ]))],
  },
  {
    id: 'sig-002', name: 'Sign Date After RCD', category: 'Signature',
    tags: ['gtl', 'signature', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject wet-signed document when signed_on date is after policy RCD.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('sig.signedOn', 'GREATER_THAN', 'policy.rcd')] }, [
        _a('ASSIGN', 'sig.outcome', 'BLOCK:SIGN_AFTER_RCD'),
      ]))],
  },
  {
    id: 'sig-003', name: 'Signatory Authority Expired', category: 'Signature',
    tags: ['gtl', 'signature', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Return E-SIGNATORY-EXPIRED 403 when signatory authority has expired.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('sig.signatoryAuthorityExpired', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'sig.outcome', 'BLOCK:E-SIGNATORY-EXPIRED'),
      ]))],
  },
  {
    id: 'sig-004', name: 'Wet Signature Evidence Required', category: 'Signature',
    tags: ['gtl', 'signature', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require wet-signature evidence for QUOTATION_ACCEPTANCE, PROPOSAL_FORM, BOARD_RESOLUTION, PED_DECL, NRI_DECL, and PEP_DD_FORM documents.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('docs.documentType', 'IN', 'QUOTATION_ACCEPTANCE,PROPOSAL_FORM,BOARD_RESOLUTION,PED_DECL,NRI_DECL,PEP_DD_FORM'), _c('sig.wetSigPresent', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'sig.outcome', 'REQUIRE:WET_SIG_EVIDENCE'),
      ]))],
  },
  {
    id: 'sig-005', name: 'Self-Approval Block SoD-006', category: 'Signature',
    tags: ['gtl', 'signature', 'sod', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block approval when originator ID equals approver ID (SoD-006 segregation of duties).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('approval.originatorId', 'EQUALS', 'approval.approverId')] }, [
        _a('ASSIGN', 'approval.outcome', 'BLOCK:E-UNAUTHORIZED_SELF_APPROVE'),
      ]))],
  },
  {
    id: 'sig-006', name: 'UW Manager Two-Officer SoD-007', category: 'Signature',
    tags: ['gtl', 'signature', 'sod', 'uw'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require two-officer ID for UW_MANAGER or RI_REFERRAL band decisions (SoD-007).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.band', 'IN', 'UW_MANAGER,RI_REFERRAL'), _c('approval.twoOfficerId', 'IS_NULL', '')] }, [
        _a('ASSIGN', 'approval.outcome', 'REQUIRE:TWO_OFFICER'),
      ]))],
  },
  {
    id: 'sig-007', name: 'Plan Change Two-Officer Required', category: 'Signature',
    tags: ['gtl', 'signature', 'sod', 'plan-change'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require two-officer ID for PLAN_CHANGE action type.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('action.type', 'EQUALS', 'PLAN_CHANGE'), _c('approval.twoOfficerId', 'IS_NULL', '')] }, [
        _a('ASSIGN', 'approval.outcome', 'REQUIRE:TWO_OFFICER'),
      ]))],
  },
  {
    id: 'sig-008', name: 'Plan Fork Self-Approval Block', category: 'Signature',
    tags: ['gtl', 'signature', 'sod', 'plan-fork'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block self-approval on plan fork actions.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('action.type', 'EQUALS', 'PLAN_FORK'), _c('approval.originatorId', 'EQUALS', 'approval.approverId')] }, [
        _a('ASSIGN', 'approval.outcome', 'BLOCK:PLAN_FORK_SELF_APPROVAL'),
      ]))],
  },
  {
    id: 'sig-009', name: 'Override Self-Approval Block', category: 'Signature',
    tags: ['gtl', 'signature', 'sod', 'override'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block self-approval on override approve actions.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('action.type', 'EQUALS', 'OVERRIDE_APPROVE'), _c('approval.originatorId', 'EQUALS', 'approval.approverId')] }, [
        _a('ASSIGN', 'approval.outcome', 'BLOCK:OVERRIDE_SELF_APPROVAL'),
      ]))],
  },
  {
    id: 'sig-011', name: 'RHL Wet Signature Waiver', category: 'Signature',
    tags: ['gtl', 'signature', 'waiver', 'rhl'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Waive MPH wet signature requirement for Risk Holding Letter — insurer-produced document.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('docs.documentType', 'EQUALS', 'RISK_HOLDING_LETTER')] }, [
        _a('ASSIGN', 'sig.outcome', 'WAIVE:RHL_WET_SIG'),
      ]))],
  },
  // ── KYC_Requirements ──
  {
    id: 'kyc-001', name: 'PAN Format Invalid', category: 'KYC',
    tags: ['gtl', 'kyc', 'pan', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject when PAN number is present but does not match the pattern ^[A-Z]{5}[0-9]{4}[A-Z]$.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('kyc.panPresent', 'EQUALS', 'true'), _c('kyc.panFormatValid', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'kyc.outcome', 'BLOCK:PAN_FORMAT_INVALID'),
      ]))],
  },
  {
    id: 'kyc-002', name: 'BO Certificate Required', category: 'KYC',
    tags: ['gtl', 'kyc', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require beneficial owner certificate as mandatory pre-issue document on MPH onboarding.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('kyc.boCertificatePresent', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'kyc.outcome', 'REQUIRE:BO_CERTIFICATE'),
      ]))],
  },
  {
    id: 'kyc-003', name: 'Signatory KYC Required', category: 'KYC',
    tags: ['gtl', 'kyc', 'signatory', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require KYC of new signatory as mandatory pre-issue on signatory change.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('kyc.newSignatoryKycMissing', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'kyc.outcome', 'REQUIRE:SIGNATORY_KYC'),
      ]))],
  },
  {
    id: 'kyc-006', name: 'Sanction Screening Required', category: 'KYC',
    tags: ['gtl', 'kyc', 'sanctions', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Run sanction screening service on MPH, member, beneficiary, and claimant onboarding; block on potential match.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('kyc.entityType', 'IN', 'MPH,MEMBER,BENEFICIARY,CLAIMANT')] }, [
        _a('ASSIGN', 'kyc.outcome', 'REQUIRE:SANCTION_SCREENING'),
      ]))],
  },
  {
    id: 'kyc-007', name: 'PEP Due Diligence Form', category: 'KYC',
    tags: ['gtl', 'kyc', 'pep', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require PEP DD form with wet signature and compliance director waiver on PEP match.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('kyc.pepMatch', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'kyc.outcome', 'REQUIRE:PEP_DD_FORM'),
      ]))],
  },
  {
    id: 'kyc-008', name: 'PII Tokenisation Required', category: 'KYC',
    tags: ['gtl', 'kyc', 'pii', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require tokenised storage for any PII field stored in the system.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('data.piiField', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'data.storageOutcome', 'REQUIRE:PII_TOKENISATION'),
      ]))],
  },
  {
    id: 'kyc-009', name: 'CIN Validate for Corporate MPH', category: 'KYC',
    tags: ['gtl', 'kyc', 'cin', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Validate CIN via MOA/AOA when MPH is a corporate entity and CIN is not yet validated.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('mph.corporate', 'EQUALS', 'true'), _c('kyc.cinValidated', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'kyc.outcome', 'REQUIRE:CIN_VALIDATE'),
      ]))],
  },
  {
    id: 'kyc-010', name: 'Claim KYC Pending Block', category: 'KYC',
    tags: ['gtl', 'kyc', 'claims', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block claim STP when beneficiary KYC is pending (E-CLAIM-KYC-PENDING 409).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('claim.beneficiaryKycPending', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'claim.outcome', 'BLOCK:E-CLAIM-KYC-PENDING'),
      ]))],
  },
  {
    id: 'kyc-011', name: 'Nominee KYC Required', category: 'KYC',
    tags: ['gtl', 'kyc', 'claims', 'nominee'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Require nominee KYC as Phase-2 claim document when nominee KYC is pending.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('claim.nomineeKycPending', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'claim.outcome', 'REQUIRE:NOMINEE_KYC'),
      ]))],
  },
  // ── BANK_Verification ──
  {
    id: 'bank-001', name: 'Penny Drop Name Mismatch', category: 'Bank Verification',
    tags: ['gtl', 'bank', 'penny-drop', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'finance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block and route to reviewer queue when penny drop fuzzy match score is below 0.94 (E-PENNY-DROP-NAME-MISMATCH 400).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('bank.pennyDropFuzzyScore', 'LESS_THAN', '0.94')] }, [
        _a('ASSIGN', 'bank.outcome', 'BLOCK:E-PENNY-DROP-NAME-MISMATCH'),
      ]))],
  },
  {
    id: 'bank-002', name: 'Claim STP Bank Verification Manual', category: 'Bank Verification',
    tags: ['gtl', 'bank', 'claims'], createdAt: '2026-06-01T00:00:00', createdBy: 'finance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Route claim to manual investigation when bank verification outcome is not ACCEPT_AUTO.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('bank.verifyOutcome', 'NOT_EQUALS', 'ACCEPT_AUTO')] }, [
        _a('ASSIGN', 'claim.outcome', 'REQUIRE:CLAIM_MANUAL_BANK'),
      ]))],
  },
  {
    id: 'bank-003', name: 'UTR Missing Block', category: 'Bank Verification',
    tags: ['gtl', 'bank', 'float', 'finance'], createdAt: '2026-06-01T00:00:00', createdBy: 'finance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block float transfer when UTR is missing (FT-RECON-001).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('floatTransfer.utr', 'IS_NULL', '')] }, [
        _a('ASSIGN', 'floatTransfer.outcome', 'BLOCK:UTR_MISSING'),
      ]))],
  },
  {
    id: 'bank-004', name: 'Legal Entity Mismatch Block', category: 'Bank Verification',
    tags: ['gtl', 'bank', 'float', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'finance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block float reconciliation when cross-legal entity target does not match payer legal entity ID (FT-INT-002).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('floatTransfer.crossLegalEntityValid', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'floatTransfer.outcome', 'BLOCK:LEGAL_ENTITY_MISMATCH'),
      ]))],
  },
  {
    id: 'bank-007', name: 'Float Tolerance Breach', category: 'Bank Verification',
    tags: ['gtl', 'bank', 'float', 'finance'], createdAt: '2026-06-01T00:00:00', createdBy: 'finance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block float receipt when variance exceeds tolerance band (E-FLOAT-TOLERANCE-BREACH 409).', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('floatReceipt.varianceExceedsTolerance', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'floatReceipt.outcome', 'BLOCK:E-FLOAT-TOLERANCE-BREACH'),
      ]))],
  },
  {
    id: 'bank-009', name: 'Bank Settlement Rejection', category: 'Bank Verification',
    tags: ['gtl', 'bank', 'settlement', 'finance'], createdAt: '2026-06-01T00:00:00', createdBy: 'finance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Capture bank rejection with reason in {BANK_REJECT_INVALID_BENEFICIARY, BANK_REJECT_INVALID_ACCOUNT, INSUFFICIENT_FUNDS, DUPLICATE_UTR, MPH_RECALL, TIMEOUT}.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('settlement.bankRejected', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'settlement.outcome', 'BLOCK:BANK_REJECTION'),
      ]))],
  },
  // ── ELIG_Min_Lives ──
  {
    id: 'elig-min-001', name: 'Min Group Size Not Met at Issuance', category: 'Min Lives',
    tags: ['gtl', 'eligibility', 'min-lives'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block before issuance when headcount is below product minimum group size.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('census.headcount', 'LESS_THAN', 'product.minGroupSize')] }, [
        _a('ASSIGN', 'policy.outcome', 'BLOCK:MIN_GROUP_SIZE_NEVER_MET'),
      ]))],
  },
  {
    id: 'elig-min-002', name: 'Mandatory Participation All Employees', category: 'Min Lives',
    tags: ['gtl', 'eligibility', 'min-lives', 'participation'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block when participation rule is MANDATORY and not all eligible employees are included.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.participationRule', 'EQUALS', 'MANDATORY'), _c('census.allEmployeesIncluded', 'EQUALS', 'false')] }, [
        _a('ASSIGN', 'policy.outcome', 'REQUIRE:ALL_EMPLOYEES_INCLUDED'),
      ]))],
  },
  {
    id: 'elig-min-003', name: 'Opt-In Participation Tracking', category: 'Min Lives',
    tags: ['gtl', 'eligibility', 'min-lives', 'participation'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Track opt-in count vs eligible base when participation rule is OPT_IN.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.participationRule', 'EQUALS', 'OPT_IN')] }, [
        _a('ASSIGN', 'census.tracking', 'REQUIRE:OPT_IN_TRACKING'),
      ]))],
  },
  {
    id: 'elig-min-004', name: 'Cohort-Based Participation Tracking', category: 'Min Lives',
    tags: ['gtl', 'eligibility', 'min-lives', 'participation'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Track participation by cohort or loan tranche when participation rule is COHORT_BASED.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.participationRule', 'EQUALS', 'COHORT_BASED')] }, [
        _a('ASSIGN', 'census.tracking', 'REQUIRE:COHORT_TRACKING'),
      ]))],
  },
  // ── BFREQ_Compatibility ──
  {
    id: 'bfreq-001', name: 'Employer Standard Billing Frequency', category: 'Billing Frequency',
    tags: ['gtl', 'billing', 'frequency', 'compatibility'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject billing frequency not in {MONTHLY, QUARTERLY, YEARLY} for SCHEME_TEMPLATE_EMPLOYER_STANDARD.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.template', 'EQUALS', 'SCHEME_TEMPLATE_EMPLOYER_STANDARD'), _c('billing.frequency', 'NOT_IN', 'MONTHLY,QUARTERLY,YEARLY')] }, [
        _a('ASSIGN', 'billing.outcome', 'BLOCK:BFREQ_NOT_ALLOWED'),
      ]))],
  },
  {
    id: 'bfreq-002', name: 'Employer Flex Billing Frequency', category: 'Billing Frequency',
    tags: ['gtl', 'billing', 'frequency', 'compatibility'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject billing frequency not in {MONTHLY, YEARLY} for SCHEME_TEMPLATE_EMPLOYER_FLEX.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.template', 'EQUALS', 'SCHEME_TEMPLATE_EMPLOYER_FLEX'), _c('billing.frequency', 'NOT_IN', 'MONTHLY,YEARLY')] }, [
        _a('ASSIGN', 'billing.outcome', 'BLOCK:BFREQ_NOT_ALLOWED'),
      ]))],
  },
  {
    id: 'bfreq-003', name: 'Lender Standard Billing Frequency', category: 'Billing Frequency',
    tags: ['gtl', 'billing', 'frequency', 'compatibility'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject billing frequency not in {MONTHLY, YEARLY} for SCHEME_TEMPLATE_LENDER_STANDARD.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('scheme.template', 'EQUALS', 'SCHEME_TEMPLATE_LENDER_STANDARD'), _c('billing.frequency', 'NOT_IN', 'MONTHLY,YEARLY')] }, [
        _a('ASSIGN', 'billing.outcome', 'BLOCK:BFREQ_NOT_ALLOWED'),
      ]))],
  },
  {
    id: 'bfreq-010', name: 'Free-Look Window 30 Days', category: 'Billing Frequency',
    tags: ['gtl', 'billing', 'free-look', 'compliance'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Allow cancellation within 30 days of in-force date under the free-look window.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('policy.cancellationRequested', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'policy.freeLookOutcome', 'REQUIRE:FREE_LOOK_30D'),
      ]))],
  },
  {
    id: 'bfreq-011', name: 'Free-Look Refund Formula', category: 'Billing Frequency',
    tags: ['gtl', 'billing', 'free-look', 'refund'], createdAt: '2026-06-01T00:00:00', createdBy: 'ops@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Compute free-look refund = total_premium - stamp_duty_retained - medical_cost_retained; refund >= 0.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('policy.freeLookCancellation', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'refund.amount', 'REQUIRE:FREE_LOOK_REFUND_FORMULA'),
      ]))],
  },
  // ── Approval_Reason_Codes ──
  {
    id: 'appr-001', name: 'Duplicate Approval Scope Block', category: 'Approval Governance',
    tags: ['gtl', 'approval', 'governance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Block when an approval case already exists for the same scope and version.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('approval.duplicateScopeExists', 'EQUALS', 'true')] }, [
        _a('ASSIGN', 'approval.outcome', 'BLOCK:DUPLICATE_APPROVAL_SCOPE'),
      ]))],
  },
  {
    id: 'appr-002', name: 'Approval Not Pending Reject', category: 'Approval Governance',
    tags: ['gtl', 'approval', 'governance'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject approval action when approval state is not PENDING.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('approval.state', 'NOT_EQUALS', 'PENDING')] }, [
        _a('ASSIGN', 'approval.outcome', 'BLOCK:APPROVAL_NOT_PENDING'),
      ]))],
  },
  {
    id: 'appr-006', name: 'Override Approve Valid Reason Code', category: 'Approval Governance',
    tags: ['gtl', 'approval', 'override', 'reason-code'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject override approve when reason code is not in {STRATEGIC_RELATIONSHIP, REGULATORY_EXCEPTION}.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('approval.action', 'EQUALS', 'OVERRIDE_APPROVE'), _c('approval.reasonCode', 'NOT_IN', 'STRATEGIC_RELATIONSHIP,REGULATORY_EXCEPTION')] }, [
        _a('ASSIGN', 'approval.outcome', 'BLOCK:INVALID_OVERRIDE_REASON'),
      ]))],
  },
  {
    id: 'appr-007', name: 'Override Reject Valid Reason Code', category: 'Approval Governance',
    tags: ['gtl', 'approval', 'override', 'reason-code'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject override reject when reason code is not OUTSIDE_APPETITE.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('approval.action', 'EQUALS', 'OVERRIDE_REJECT'), _c('approval.reasonCode', 'NOT_EQUALS', 'OUTSIDE_APPETITE')] }, [
        _a('ASSIGN', 'approval.outcome', 'BLOCK:INVALID_REJECT_REASON'),
      ]))],
  },
  {
    id: 'appr-008', name: 'UW Decline Valid Reason Code', category: 'Approval Governance',
    tags: ['gtl', 'approval', 'uw', 'reason-code'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject UW decline when reason code is not in {MEDICAL_HIGH_RISK, OCCUPATION_HAZARDOUS, SANCTIONS_OR_UAPA_MATCH, NRI_DECLINE_COUNTRY}.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.action', 'EQUALS', 'DECLINE'), _c('uw.reasonCode', 'NOT_IN', 'MEDICAL_HIGH_RISK,OCCUPATION_HAZARDOUS,SANCTIONS_OR_UAPA_MATCH,NRI_DECLINE_COUNTRY')] }, [
        _a('ASSIGN', 'uw.outcome', 'BLOCK:INVALID_DECLINE_REASON'),
      ]))],
  },
  {
    id: 'appr-009', name: 'UW Postpone Valid Reason Code', category: 'Approval Governance',
    tags: ['gtl', 'approval', 'uw', 'reason-code'], createdAt: '2026-06-01T00:00:00', createdBy: 'compliance@insure.com',
    versions: [mkVer(1, 'ACTIVE', 'Reject UW postpone when reason code is not in {PED_TREATMENT_ONGOING, AWAITING_RI_RESPONSE}.', 'Initial Release', '2026-04-01T00:00:00',
      mkBlockRule({ match: 'and', conditions: [_c('uw.action', 'EQUALS', 'POSTPONE'), _c('uw.reasonCode', 'NOT_IN', 'PED_TREATMENT_ONGOING,AWAITING_RI_RESPONSE')] }, [
        _a('ASSIGN', 'uw.outcome', 'BLOCK:INVALID_POSTPONE_REASON'),
      ]))],
  },
];

export const SEED_TABLES: Table[] = [
  /* ── UC-A · Motor Pricing ── */
  {
    id: 't-mpc', name: 'Motor Premium Cap', category: 'Pricing',
    tags: ['motor', 'cap', 'regulatory'], createdAt: '2026-04-15T08:00:00',
    versions: [{
      id: uid(), version: 1, status: 'ACTIVE',
      description: 'Enforces regulatory caps on motor discounts (max 60%) and loadings (max 100%). Uses priority-order hit policy.',
      changeSummary: 'Initial version', effectiveFrom: '2025-01-01T00:00:00', effectiveUntil: null,
      table: {
        hitPolicy: 'priority_order',
        inputs: [
          { field: 'pricing.totalDiscountPct', operator: 'GREATER_THAN', dataType: 'number', label: 'Total Discount %' },
          { field: 'pricing.totalLoadingPct', operator: 'GREATER_THAN', dataType: 'number', label: 'Total Loading %' },
        ],
        outputs: [
          { field: 'pricing.cappedDiscountPct', dataType: 'number', label: 'Capped Discount %' },
          { field: 'pricing.cappedLoadingPct', dataType: 'number', label: 'Capped Loading %' },
          { field: 'pricing.capApplied', dataType: 'boolean', label: 'Cap Applied' },
        ],
        rows: [
          { id: 1, isEnabled: true, inputs: ['60', ''], outputs: [60, '', 'true'] },
          { id: 2, isEnabled: true, inputs: ['', '100'], outputs: ['', 100, 'true'] },
          { id: 3, isEnabled: true, inputs: ['', ''], outputs: ['', '', 'false'] },
        ],
      },
    }],
  },
  /* ── UC-D · Claims Fraud ── */
  {
    id: 't-cfst', name: 'Claims Fraud Signal Detection', category: 'Claims',
    tags: ['fraud', 'detection', 'collect-all'], createdAt: '2026-01-08T08:00:00',
    versions: [
      {
        id: uid(), version: 1, status: 'INACTIVE',
        description: '3 fraud signals. DOCUMENT_MISMATCH signal missing — added in v2.',
        changeSummary: 'Initial version — 3 signals', effectiveFrom: '2025-03-01T00:00:00', effectiveUntil: null,
        table: {
          hitPolicy: 'collect_all',
          inputs: [
            { field: 'claim.amountRatio', operator: 'GREATER_THAN', dataType: 'number', label: 'Amount Ratio' },
            { field: 'claim.hospitalRiskTier', operator: 'IN', dataType: 'string', label: 'Hospital Risk Tier' },
            { field: 'policy.ageMonths', operator: 'LESS_THAN', dataType: 'number', label: 'Policy Age (months)' },
          ],
          outputs: [
            { field: 'fraud.signal', dataType: 'string', label: 'Signal' },
            { field: 'fraud.points', dataType: 'number', label: 'Points' },
          ],
          rows: [
            { id: 1, isEnabled: true, inputs: ['3', '', ''], outputs: ['HIGH_CLAIM_AMOUNT', 30] },
            { id: 2, isEnabled: true, inputs: ['', 'HIGH,WATCHLIST', ''], outputs: ['HIGH_RISK_PROVIDER', 25] },
            { id: 3, isEnabled: true, inputs: ['', '', '6'], outputs: ['EARLY_CLAIM', 20] },
          ],
        },
      },
      {
        id: uid(), version: 2, status: 'ACTIVE',
        description: 'Collects all matching fraud signals into fraud.detections. Includes DOCUMENT_MISMATCH (35 pts). Null = wildcard.',
        changeSummary: 'Added DOCUMENT_MISMATCH signal (35 pts) from claims audit findings', effectiveFrom: '2025-07-01T00:00:00', effectiveUntil: null,
        table: {
          hitPolicy: 'collect_all',
          inputs: [
            { field: 'claim.amountRatio', operator: 'GREATER_THAN', dataType: 'number', label: 'Amount Ratio' },
            { field: 'claim.hospitalRiskTier', operator: 'IN', dataType: 'string', label: 'Hospital Risk Tier' },
            { field: 'policy.ageMonths', operator: 'LESS_THAN', dataType: 'number', label: 'Policy Age (months)' },
            { field: 'claim.hasDocMismatch', operator: 'EQUALS', dataType: 'boolean', label: 'Doc Mismatch' },
          ],
          outputs: [
            { field: 'fraud.signal', dataType: 'string', label: 'Signal' },
            { field: 'fraud.points', dataType: 'number', label: 'Points' },
          ],
          rows: [
            { id: 1, isEnabled: true, inputs: ['3', '', '', ''], outputs: ['HIGH_CLAIM_AMOUNT', 30] },
            { id: 2, isEnabled: true, inputs: ['', 'HIGH,WATCHLIST', '', ''], outputs: ['HIGH_RISK_PROVIDER', 25] },
            { id: 3, isEnabled: true, inputs: ['', '', '6', ''], outputs: ['EARLY_CLAIM', 20] },
            { id: 4, isEnabled: true, inputs: ['', '', '', 'true'], outputs: ['DOCUMENT_MISMATCH', 35] },
          ],
        },
      },
    ],
  },
  /* ── UC-F · Claims STP ── */
  {
    id: 't-clibc', name: 'Claims Line Item Benefit Cap', category: 'Claims',
    tags: ['stp', 'benefit-cap', 'line-item'], createdAt: '2026-02-10T08:00:00',
    versions: [
      {
        id: uid(), version: 1, status: 'ACTIVE',
        description: 'Caps line item amounts: ROOM_RENT ₹10k, SURGERY ₹50k, PHARMACY ₹15k. Unmatched items pass through uncapped.',
        changeSummary: 'Initial version', effectiveFrom: '2025-05-01T00:00:00', effectiveUntil: null,
        table: {
          hitPolicy: 'first_match',
          inputs: [
            { field: 'lineItem.code', operator: 'EQUALS', dataType: 'string', label: 'Benefit Code' },
            { field: 'lineItem.amount', operator: 'GREATER_THAN', dataType: 'number', label: 'Billed Amount' },
          ],
          outputs: [
            { field: 'lineItem.approvedAmount', dataType: 'number', label: 'Approved Amount' },
            { field: 'lineItem.capApplied', dataType: 'boolean', label: 'Cap Applied' },
          ],
          rows: [
            { id: 1, isEnabled: true, inputs: ['ROOM_RENT', '10000'], outputs: [10000, 'true'] },
            { id: 2, isEnabled: true, inputs: ['SURGERY', '50000'], outputs: [50000, 'true'] },
            { id: 3, isEnabled: true, inputs: ['PHARMACY', '15000'], outputs: [15000, 'true'] },
            { id: 4, isEnabled: true, inputs: ['', ''], outputs: ['lineItem.amount', 'false'] },
          ],
        },
      },
      {
        id: uid(), version: 2, status: 'COMPLIANCE_REVIEW',
        description: 'Proposed per IRDAI 2026: SURGERY cap raised to ₹75k, new ICU cap of ₹20k.',
        changeSummary: 'Revised caps per IRDAI 2026 circular — surgery ₹75k, add ICU ₹20k', effectiveFrom: '2026-01-01T00:00:00', effectiveUntil: null,
        table: {
          hitPolicy: 'first_match',
          inputs: [
            { field: 'lineItem.code', operator: 'EQUALS', dataType: 'string', label: 'Benefit Code' },
            { field: 'lineItem.amount', operator: 'GREATER_THAN', dataType: 'number', label: 'Billed Amount' },
          ],
          outputs: [
            { field: 'lineItem.approvedAmount', dataType: 'number', label: 'Approved Amount' },
            { field: 'lineItem.capApplied', dataType: 'boolean', label: 'Cap Applied' },
          ],
          rows: [
            { id: 1, isEnabled: true, inputs: ['ROOM_RENT', '10000'], outputs: [10000, 'true'] },
            { id: 2, isEnabled: true, inputs: ['SURGERY', '75000'], outputs: [75000, 'true'] },
            { id: 3, isEnabled: true, inputs: ['ICU', '20000'], outputs: [20000, 'true'] },
            { id: 4, isEnabled: true, inputs: ['PHARMACY', '15000'], outputs: [15000, 'true'] },
            { id: 5, isEnabled: true, inputs: ['', ''], outputs: ['lineItem.amount', 'false'] },
          ],
        },
      },
    ],
  },
];

export const SEED_FLOWS: Flow[] = [
  /* ── UC-A · Motor Pricing ── */
  {
    id: 'f-mpof', name: 'Motor Pricing Orchestration', category: 'Pricing',
    tags: ['motor', 'pricing', 'orchestration'], stopOnError: false, createdAt: '2026-03-10T08:00:00',
    versions: [{
      id: uid(), version: 1, status: 'ACTIVE',
      description: 'Sequential flow for motor premium calculation: base lookup → NCB discount → young driver surcharge → cap enforcement.',
      changeSummary: 'Initial version', effectiveFrom: '2025-01-01T00:00:00', effectiveUntil: null,
      flow: {
        mergeStrategy: 'last_writer_wins',
        nodes: [
          { id: 1, type: 'start', name: 'Pricing Start' },
          { id: 2, type: 'rule', name: 'Base Premium Lookup', config: { ruleRef: 'Motor Base Premium Lookup' } },
          { id: 3, type: 'rule', name: 'NCB Discount Lookup', config: { ruleRef: 'Motor NCB Rate Lookup' } },
          { id: 4, type: 'expression', name: 'Apply NCB Discount' },
          { id: 5, type: 'rule', name: 'Young Driver Loading', config: { ruleRef: 'Motor Young Driver Surcharge' } },
          { id: 6, type: 'table', name: 'Premium Cap', config: { tableRef: 'Motor Premium Cap' } },
          { id: 7, type: 'end', name: 'Pricing Complete' },
        ],
        edges: [
          { id: 1, source: 1, target: 2 }, { id: 2, source: 2, target: 3 }, { id: 3, source: 3, target: 4 },
          { id: 4, source: 4, target: 5 }, { id: 5, source: 5, target: 6 }, { id: 6, source: 6, target: 7 },
        ],
      },
    }],
  },
  /* ── UC-E · Renewal Loyalty ── */
  {
    id: 'f-rdf', name: 'Renewal Loyalty Decision', category: 'Operations',
    tags: ['renewal', 'loyalty', 'parallel'], stopOnError: true, createdAt: '2025-12-20T08:00:00',
    versions: [
      {
        id: uid(), version: 1, status: 'ACTIVE',
        description: 'Aggregates claim count, then forks in parallel: zero-claim upgrade and high-claim loading run simultaneously.',
        changeSummary: 'Initial version', effectiveFrom: '2025-04-01T00:00:00', effectiveUntil: null,
        flow: {
          mergeStrategy: 'last_writer_wins',
          nodes: [
            { id: 1, type: 'start', name: 'Renewal Start' },
            { id: 2, type: 'rule', name: 'Aggregate Claim Count', config: { ruleRef: 'Renewal Claim Count Aggregation' } },
            { id: 3, type: 'rule', name: 'Zero-Claim Auto-Upgrade', config: { ruleRef: 'Renewal Zero-Claim Auto-Upgrade' } },
            { id: 4, type: 'rule', name: 'High-Claim Loading', config: { ruleRef: 'Renewal High-Claim Premium Loading' } },
            { id: 5, type: 'end', name: 'Renewal Complete' },
          ],
          edges: [
            { id: 1, source: 1, target: 2 }, { id: 2, source: 2, target: 3 },
            { id: 3, source: 2, target: 4 }, { id: 4, source: 3, target: 5 }, { id: 5, source: 4, target: 5 },
          ],
        },
      },
      {
        id: uid(), version: 2, status: 'DRAFT',
        description: 'Proposed: add grace period alert node and MID_TERM trigger path.',
        changeSummary: 'Add MID_TERM trigger path and grace period alert node', effectiveFrom: '2026-01-01T00:00:00', effectiveUntil: null,
        flow: {
          mergeStrategy: 'last_writer_wins',
          nodes: [
            { id: 1, type: 'start', name: 'Renewal Start' },
            { id: 2, type: 'rule', name: 'Grace Period Alert' },
            { id: 3, type: 'rule', name: 'Aggregate Claim Count', config: { ruleRef: 'Renewal Claim Count Aggregation' } },
            { id: 4, type: 'rule', name: 'Zero-Claim Auto-Upgrade', config: { ruleRef: 'Renewal Zero-Claim Auto-Upgrade' } },
            { id: 5, type: 'rule', name: 'High-Claim Loading', config: { ruleRef: 'Renewal High-Claim Premium Loading' } },
            { id: 6, type: 'end', name: 'Renewal Complete' },
          ],
          edges: [
            { id: 1, source: 1, target: 2 }, { id: 2, source: 2, target: 3 },
            { id: 3, source: 3, target: 4 }, { id: 4, source: 3, target: 5 },
            { id: 5, source: 4, target: 6 }, { id: 6, source: 5, target: 6 },
          ],
        },
      },
    ],
  },
  /* ── UC-F · Claims STP (main + 3 subflows) ── */
  {
    id: 'f-csaf', name: 'Claims STP Adjudication', category: 'Claims',
    tags: ['stp', 'adjudication', 'auto-approve', 'parallel'], stopOnError: false, createdAt: '2025-03-10T08:00:00',
    versions: [{
      id: uid(), version: 1, status: 'ACTIVE',
      description: 'End-to-end STP pipeline: eligibility gate → parallel fraud + network check → claim type subflow → benefit cap loop → auto-approve gate.',
      changeSummary: 'Initial version', effectiveFrom: '2025-05-01T00:00:00', effectiveUntil: null,
      flow: {
        mergeStrategy: 'fail_on_conflict',
        nodes: [
          { id: 1, type: 'start', name: 'Claim Received' },
          { id: 2, type: 'transform', name: 'Normalize Payload' },
          { id: 3, type: 'rule', name: 'Policy Eligibility Gate', config: { ruleRef: 'Claims Policy Eligibility Gate' } },
          { id: 4, type: 'expression', name: 'Compute Deductible' },
          { id: 5, type: 'table', name: 'Fraud Signal Check', config: { tableRef: 'Claims Fraud Signal Detection' } },
          { id: 6, type: 'rule', name: 'Provider Network Classification', config: { ruleRef: 'Claims Provider Network Classification' } },
          { id: 7, type: 'rule', name: 'Fraud Score Threshold', config: { ruleRef: 'Fraud Score Escalation' } },
          { id: 8, type: 'subflow', name: 'Claim Type Router' },
          { id: 9, type: 'loop', name: 'Per-Item Benefit Cap' },
          { id: 10, type: 'expression', name: 'Compute Final Payable' },
          { id: 11, type: 'rule', name: 'STP Auto-Approve Gate', config: { ruleRef: 'Claims STP Decision Gate' } },
          { id: 12, type: 'end', name: 'Adjudication Complete' },
        ],
        edges: [
          { id: 1, source: 1, target: 2 }, { id: 2, source: 2, target: 3 }, { id: 3, source: 3, target: 4 },
          { id: 4, source: 4, target: 5 }, { id: 5, source: 4, target: 6 }, { id: 6, source: 5, target: 7 },
          { id: 7, source: 6, target: 7 }, { id: 8, source: 7, target: 8 }, { id: 9, source: 8, target: 9 },
          { id: 10, source: 9, target: 10 }, { id: 11, source: 10, target: 11 }, { id: 12, source: 11, target: 12 },
        ],
      },
    }],
  },
  {
    id: 'f-chsf', name: 'Claims Hospitalization Processing', category: 'Claims',
    tags: ['stp', 'hospitalization', 'subflow'], stopOnError: true, createdAt: '2025-03-12T08:00:00',
    versions: [
      {
        id: uid(), version: 1, status: 'INACTIVE',
        description: 'Basic hospitalization subflow. Missing DRG validation — caused incorrect ICU room-rent categorisation.',
        changeSummary: 'Initial version — DRG validation absent', effectiveFrom: '2025-05-01T00:00:00', effectiveUntil: null,
        flow: {
          mergeStrategy: 'last_writer_wins',
          nodes: [
            { id: 1, type: 'start', name: 'Hosp Entry' },
            { id: 2, type: 'rule', name: 'Room Rent Cap Check', config: { tableRef: 'Claims Line Item Benefit Cap' } },
            { id: 3, type: 'expression', name: 'Compute Inpatient Payable' },
            { id: 4, type: 'end', name: 'Hosp Exit' },
          ],
          edges: [{ id: 1, source: 1, target: 2 }, { id: 2, source: 2, target: 3 }, { id: 3, source: 3, target: 4 }],
        },
      },
      {
        id: uid(), version: 2, status: 'ACTIVE',
        description: 'Handles inpatient claims: DRG classification, room-rent and surgery cap, ICU surcharge, and inpatient payable computation.',
        changeSummary: 'Added DRG classification node and ICU surcharge expression', effectiveFrom: '2025-08-15T00:00:00', effectiveUntil: null,
        flow: {
          mergeStrategy: 'last_writer_wins',
          nodes: [
            { id: 1, type: 'start', name: 'Hosp Entry' },
            { id: 2, type: 'expression', name: 'DRG Classification' },
            { id: 3, type: 'table', name: 'Room Rent & Surgery Cap', config: { tableRef: 'Claims Line Item Benefit Cap' } },
            { id: 4, type: 'expression', name: 'ICU Surcharge Check' },
            { id: 5, type: 'expression', name: 'Compute Inpatient Payable' },
            { id: 6, type: 'end', name: 'Hosp Exit' },
          ],
          edges: [
            { id: 1, source: 1, target: 2 }, { id: 2, source: 2, target: 3 },
            { id: 3, source: 3, target: 4 }, { id: 4, source: 4, target: 5 }, { id: 5, source: 5, target: 6 },
          ],
        },
      },
    ],
  },
  {
    id: 'f-cosf', name: 'Claims Outpatient Processing', category: 'Claims',
    tags: ['stp', 'outpatient', 'subflow'], stopOnError: false, createdAt: '2025-03-12T08:00:00',
    versions: [{
      id: uid(), version: 1, status: 'ACTIVE',
      description: 'Handles outpatient claims: consultation fee validation, pharmacy cap, diagnostic co-pay, and OP payable computation.',
      changeSummary: 'Initial version', effectiveFrom: '2025-05-01T00:00:00', effectiveUntil: null,
      flow: {
        mergeStrategy: 'last_writer_wins',
        nodes: [
          { id: 1, type: 'start', name: 'OP Entry' },
          { id: 2, type: 'rule', name: 'Consult Fee Validation' },
          { id: 3, type: 'table', name: 'Pharmacy Benefit Cap', config: { tableRef: 'Claims Line Item Benefit Cap' } },
          { id: 4, type: 'expression', name: 'Apply Diagnostic Co-Pay' },
          { id: 5, type: 'expression', name: 'Compute OP Payable' },
          { id: 6, type: 'end', name: 'OP Exit' },
        ],
        edges: [
          { id: 1, source: 1, target: 2 }, { id: 2, source: 2, target: 3 },
          { id: 3, source: 3, target: 4 }, { id: 4, source: 4, target: 5 }, { id: 5, source: 5, target: 6 },
        ],
      },
    }],
  },
  {
    id: 'f-cdsf', name: 'Claims Default Processing', category: 'Claims',
    tags: ['stp', 'default', 'subflow', 'fallback'], stopOnError: false, createdAt: '2025-03-12T08:00:00',
    versions: [
      {
        id: uid(), version: 1, status: 'ACTIVE',
        description: 'Fallback subflow for non-hospitalization, non-outpatient claims. Applies generic benefit caps and routes high-value claims to manual review.',
        changeSummary: 'Initial version', effectiveFrom: '2025-05-01T00:00:00', effectiveUntil: null,
        flow: {
          mergeStrategy: 'last_writer_wins',
          nodes: [
            { id: 1, type: 'start', name: 'Default Entry' },
            { id: 2, type: 'table', name: 'Generic Benefit Cap', config: { tableRef: 'Claims Line Item Benefit Cap' } },
            { id: 3, type: 'expression', name: 'Compute Generic Payable' },
            { id: 4, type: 'rule', name: 'High-Value Referral Check' },
            { id: 5, type: 'end', name: 'Default Exit' },
          ],
          edges: [
            { id: 1, source: 1, target: 2 }, { id: 2, source: 2, target: 3 },
            { id: 3, source: 3, target: 4 }, { id: 4, source: 4, target: 5 },
          ],
        },
      },
      {
        id: uid(), version: 2, status: 'PEER_REVIEW',
        description: 'Proposed: add dental and vision fast-track branches to reduce manual queue volume.',
        changeSummary: 'Add dental and vision fast-track branches', effectiveFrom: '2026-02-01T00:00:00', effectiveUntil: null,
        flow: {
          mergeStrategy: 'last_writer_wins',
          nodes: [
            { id: 1, type: 'start', name: 'Default Entry' },
            { id: 2, type: 'rule', name: 'Claim Type Branch' },
            { id: 3, type: 'table', name: 'Generic Benefit Cap', config: { tableRef: 'Claims Line Item Benefit Cap' } },
            { id: 4, type: 'expression', name: 'Compute Generic Payable' },
            { id: 5, type: 'rule', name: 'High-Value Referral Check' },
            { id: 6, type: 'end', name: 'Default Exit' },
          ],
          edges: [
            { id: 1, source: 1, target: 2 }, { id: 2, source: 2, target: 3 },
            { id: 3, source: 3, target: 4 }, { id: 4, source: 4, target: 5 }, { id: 5, source: 5, target: 6 },
          ],
        },
      },
    ],
  },
];

export const SEED_LOOKUP_TABLES: LookupTable[] = [
  {
    id: 'lkp-state-codes',
    name: 'Australian State Codes',
    category: 'Compliance',
    tags: ['geo', 'state', 'reference'],
    createdAt: '2026-01-10T09:00:00',
    versions: [{
      id: uid(), version: 1, status: 'ACTIVE',
      description: 'Maps Australian state/territory codes to full names and GST rate.',
      changeSummary: 'Initial version',
      effectiveFrom: '2026-01-01T00:00:00',
      effectiveUntil: null,
      keyColumn: { field: 'state_code', label: 'State Code', dataType: 'string' },
      valueColumns: [
        { id: uid(), field: 'state_name',  label: 'State Name',  dataType: 'string' },
        { id: uid(), field: 'gst_rate_pct', label: 'GST Rate %',  dataType: 'number' },
      ],
      rows: [
        { id: uid(), key: 'NSW', values: ['New South Wales',        '10'], isEnabled: true },
        { id: uid(), key: 'VIC', values: ['Victoria',               '10'], isEnabled: true },
        { id: uid(), key: 'QLD', values: ['Queensland',             '10'], isEnabled: true },
        { id: uid(), key: 'SA',  values: ['South Australia',        '10'], isEnabled: true },
        { id: uid(), key: 'WA',  values: ['Western Australia',      '10'], isEnabled: true },
        { id: uid(), key: 'TAS', values: ['Tasmania',               '10'], isEnabled: true },
        { id: uid(), key: 'NT',  values: ['Northern Territory',     '10'], isEnabled: true },
        { id: uid(), key: 'ACT', values: ['Australian Capital Territory', '10'], isEnabled: true },
      ],
    }],
  },
  {
    id: 'lkp-ncb-rates',
    name: 'NCB Discount Rates',
    category: 'Pricing',
    tags: ['motor', 'ncb', 'discount'],
    createdAt: '2026-01-15T10:00:00',
    versions: [
      {
        id: uid(), version: 1, status: 'ARCHIVED',
        description: 'Legacy NCB discount schedule — 5 tiers.',
        changeSummary: 'Initial version',
        effectiveFrom: '2025-01-01T00:00:00',
        effectiveUntil: '2025-12-31T23:59:59',
        keyColumn: { field: 'ncb_years', label: 'NCB Years', dataType: 'number' },
        valueColumns: [
          { id: uid(), field: 'discount_pct', label: 'Discount %', dataType: 'number' },
          { id: uid(), field: 'tier_label',   label: 'Tier',       dataType: 'string' },
        ],
        rows: [
          { id: uid(), key: '0', values: ['0',  'No Bonus'],  isEnabled: true },
          { id: uid(), key: '1', values: ['10', 'Bronze'],    isEnabled: true },
          { id: uid(), key: '2', values: ['20', 'Silver'],    isEnabled: true },
          { id: uid(), key: '3', values: ['30', 'Gold'],      isEnabled: true },
          { id: uid(), key: '4', values: ['40', 'Platinum'],  isEnabled: true },
        ],
      },
      {
        id: uid(), version: 2, status: 'ACTIVE',
        description: 'Updated NCB schedule — 6 tiers with enhanced Platinum.',
        changeSummary: 'Added 5+ year tier with 50% discount',
        effectiveFrom: '2026-01-01T00:00:00',
        effectiveUntil: null,
        keyColumn: { field: 'ncb_years', label: 'NCB Years', dataType: 'number' },
        valueColumns: [
          { id: uid(), field: 'discount_pct', label: 'Discount %', dataType: 'number' },
          { id: uid(), field: 'tier_label',   label: 'Tier',       dataType: 'string' },
        ],
        rows: [
          { id: uid(), key: '0', values: ['0',  'No Bonus'],  isEnabled: true },
          { id: uid(), key: '1', values: ['10', 'Bronze'],    isEnabled: true },
          { id: uid(), key: '2', values: ['20', 'Silver'],    isEnabled: true },
          { id: uid(), key: '3', values: ['30', 'Gold'],      isEnabled: true },
          { id: uid(), key: '4', values: ['40', 'Platinum'],  isEnabled: true },
          { id: uid(), key: '5', values: ['50', 'Platinum+'], isEnabled: true },
        ],
      },
    ],
  },
  {
    id: 'lkp-vehicle-risk',
    name: 'Vehicle Risk Classification',
    category: 'Underwriting',
    tags: ['motor', 'vehicle', 'risk'],
    createdAt: '2026-02-01T08:00:00',
    versions: [{
      id: uid(), version: 1, status: 'ACTIVE',
      description: 'Maps vehicle types to their underwriting risk category and base premium multiplier.',
      changeSummary: 'Initial version',
      effectiveFrom: '2026-01-01T00:00:00',
      effectiveUntil: null,
      keyColumn: { field: 'vehicle_type', label: 'Vehicle Type', dataType: 'string' },
      valueColumns: [
        { id: uid(), field: 'risk_category',    label: 'Risk Category',    dataType: 'string' },
        { id: uid(), field: 'base_multiplier',  label: 'Base Multiplier',  dataType: 'number' },
      ],
      rows: [
        { id: uid(), key: 'sedan',      values: ['Standard',  '1.00'], isEnabled: true },
        { id: uid(), key: 'suv',        values: ['Standard',  '1.05'], isEnabled: true },
        { id: uid(), key: 'sports',     values: ['High Risk',  '1.45'], isEnabled: true },
        { id: uid(), key: 'van',        values: ['Commercial', '1.20'], isEnabled: true },
        { id: uid(), key: 'truck',      values: ['Commercial', '1.35'], isEnabled: true },
        { id: uid(), key: 'motorcycle', values: ['High Risk',  '1.60'], isEnabled: true },
      ],
    }],
  },
];

/* ── UI PRIMITIVES ───────────────────────────────── */
interface BtnProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary' | 'ghost-destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export const Btn: React.FC<BtnProps> = ({ children, variant = 'default', size = 'default', className = '', onClick, disabled, type = 'button', title }) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-40 disabled:pointer-events-none';
  const v = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm',
    outline: 'border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
    ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    'ghost-destructive': 'text-destructive hover:bg-destructive/10 hover:text-destructive',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  };
  const s = { default: 'h-8 px-3.5 text-sm gap-2', sm: 'h-7 px-2.5 text-xs gap-1.5', lg: 'h-9 px-4 text-sm gap-2', icon: 'h-8 w-8 p-0 text-sm' };
  return (
    <button type={type} disabled={disabled} onClick={onClick} title={title} className={cn(base, v[variant], s[size], className)}>
      {children}
    </button>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.DRAFT;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium', m.bg, m.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  );
};

export const Tag: React.FC<{ label: string; onRemove?: () => void }> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-md font-medium">
    {label}
    {onRemove && <button type="button" onClick={onRemove} className="hover:text-primary/70 ml-0.5">×</button>}
  </span>
);

export const SearchBanner: React.FC<{ query: string; count: number; label?: string }> = ({ query, count, label = 'result' }) =>
  query.trim() ? (
    <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-primary/20 text-sm shrink-0">
      <span className="text-foreground">
        Showing results for <span className="font-semibold text-foreground">"{query}"</span>
      </span>
      <span className="text-muted-foreground font-medium">{count} {count === 1 ? label : label + 's'}</span>
    </div>
  ) : null;


export const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode; hint?: string }> = ({ label, required, children, hint }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-foreground">{label}{required && <span className="text-destructive ml-0.5">*</span>}</label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

interface InpProps {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  type?: string;
  id?: string;
  readOnly?: boolean;
}

export const Inp: React.FC<InpProps> = ({ value, onChange, placeholder, disabled, className = '', type = 'text', id, readOnly }) => (
  <input
    id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
    disabled={disabled} readOnly={readOnly}
    style={{ WebkitAppearance: 'none' }}
    className={cn('h-8 px-3 text-sm border border-border rounded-md bg-background placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:bg-muted disabled:text-muted-foreground transition-colors', className)}
  />
);

interface SelProps {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[] | string[];
  disabled?: boolean;
  className?: string;
}

export const Sel: React.FC<SelProps> = ({ value, onChange, options, disabled, className = '' }) => (
  <select
    value={value} onChange={onChange} disabled={disabled}
    style={{ WebkitAppearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
    className={cn('h-8 px-2 pr-7 text-sm border border-border rounded-md bg-background text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:bg-muted transition-colors', className)}
  >
    {(options as Array<{ value: string; label: string } | string>).map(o => {
      const v = typeof o === 'string' ? o : o.value;
      const l = typeof o === 'string' ? o : o.label;
      return <option key={v} value={v}>{l}</option>;
    })}
  </select>
);

interface DSelProps {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string } | string>;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}
export const DSel: React.FC<DSelProps> = ({ value, onChange, options, disabled, className = '', size = 'default' }) => {
  const opts = (options as Array<{ value: string; label: string } | string>).map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  const placeholder = opts.find(o => o.value === '')?.label;
  const realOpts = opts.filter(o => o.value !== '');
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size={size} className={cn('text-sm', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {realOpts.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, children, width = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-card rounded-xl shadow-2xl w-full flex flex-col max-h-[80vh]', width)} style={{ animation: 'fadeIn .15s ease-out' }}>
        <div className="flex items-start justify-between p-5 pb-3 shrink-0 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="ml-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>{children}</div>
      </div>
    </div>
  );
};

export const Toast: React.FC<{ msg: string; onDone: () => void }> = ({ msg, onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-5 right-5 z-50 bg-foreground text-background text-sm px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5" style={{ animation: 'fadeIn .15s ease-out' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
      {msg}
    </div>
  );
};

/* ── ICON SYSTEM ─────────────────────────────────── */
const Ic: React.FC<{ d: string | string[]; size?: number; className?: string; sw?: number }> = ({ d, size = 16, className = '', sw = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

export const IC = {
  Home: (p: { size?: number; className?: string }) => <Ic d={['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10']} {...p} />,
  Policy: (p: { size?: number; className?: string }) => <Ic d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']} {...p} />,
  Claims: (p: { size?: number; className?: string }) => <Ic d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8']} {...p} />,
  Billing: (p: { size?: number; className?: string }) => <Ic d={['M3 6h18', 'M3 12h18', 'M3 18h18']} {...p} />,
  Rules: (p: { size?: number; className?: string }) => <Ic d={['M12 2L2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5']} {...p} />,
  Config: (p: { size?: number; className?: string }) => <Ic d={['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z']} {...p} />,
  Alerts: (p: { size?: number; className?: string }) => <Ic d={['M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0']} {...p} />,
  Plus: (p: { size?: number; className?: string }) => <Ic d="M12 5v14M5 12h14" {...p} />,
  Back: (p: { size?: number; className?: string }) => <Ic d={['M19 12H5', 'M12 19l-7-7 7-7']} {...p} />,
  Search: (p: { size?: number; className?: string }) => <Ic d={['M21 21l-4.35-4.35', 'M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z']} {...p} />,
  Eye: (p: { size?: number; className?: string }) => <Ic d={['M1 12s4-8 11-8 11 8 11 8', 'M1 12s4 8 11 8 11-8 11-8', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z']} {...p} />,
  Edit: (p: { size?: number; className?: string }) => <Ic d={['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']} {...p} />,
  Trash: (p: { size?: number; className?: string }) => <Ic d={['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6']} {...p} />,
  Bolt: (p: { size?: number; className?: string }) => <Ic d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" {...p} />,
  ChevR: (p: { size?: number; className?: string }) => <Ic d="M9 18l6-6-6-6" {...p} />,
  ChevD: (p: { size?: number; className?: string }) => <Ic d="M6 9l6 6 6-6" {...p} />,
  MoreVert: (p: { size?: number; className?: string }) => <Ic d="M12 5v.01M12 12v.01M12 19v.01" {...p} />,
  Play: (p: { size?: number; className?: string }) => <Ic d="M5 3l14 9-14 9V3z" {...p} />,
  ChevU: (p: { size?: number; className?: string }) => <Ic d="M18 15l-6-6-6 6" {...p} />,
  Flow: (p: { size?: number; className?: string }) => <Ic d={['M5 12h14', 'M12 5l7 7-7 7']} {...p} />,
  Table2: (p: { size?: number; className?: string }) => <Ic d={['M3 3h18v18H3z', 'M3 9h18', 'M3 15h18', 'M9 3v18']} {...p} />,
  Activate: (p: { size?: number; className?: string }) => <Ic d={['M9 12l2 2 4-4', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z']} {...p} />,
  Tag: (p: { size?: number; className?: string }) => <Ic d={['M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z', 'M7 7h.01']} {...p} />,
  Grid: (p: { size?: number; className?: string }) => <Ic d={['M10 3H3v7h7V3z', 'M21 3h-7v7h7V3z', 'M21 14h-7v7h7v-7z', 'M10 14H3v7h7v-7z']} {...p} />,
  Dashboard: (p: { size?: number; className?: string }) => <Ic d={['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z']} {...p} />,
  Lookup: (p: { size?: number; className?: string }) => <Ic d={['M4 6h16', 'M4 12h16', 'M4 18h7']} {...p} />,
  Check: (p: { size?: number; className?: string }) => <Ic d="M20 6L9 17l-5-5" {...p} />,
  Zap: (p: { size?: number; className?: string }) => <Ic d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" {...p} />,
  Users: (p: { size?: number; className?: string }) => <Ic d={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']} {...p} />,
  Globe: (p: { size?: number; className?: string }) => <Ic d={['M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z']} {...p} />,
  Copy: (p: { size?: number; className?: string }) => <Ic d={['M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.036v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z']} {...p} />,
  Info: (p: { size?: number; className?: string }) => <Ic d={['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 8v4', 'M12 16h.01']} {...p} />,
  X: (p: { size?: number; className?: string }) => <Ic d="M18 6 6 18M6 6l12 12" {...p} />,
  Upload: (p: { size?: number; className?: string }) => <Ic d={['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12']} {...p} />,
};

/* ── FACT ICON ───────────────────────────────────── */
type IcProps = { size?: number; className?: string };
const _FACT_ICON_MAP: Record<string, { Icon: (p: IcProps) => React.ReactElement; bg: string }> = {
  policy:       { Icon: IC.Policy,   bg: 'bg-blue-600' },
  claim:        { Icon: IC.Claims,   bg: 'bg-indigo-600' },
  driver:       { Icon: IC.Users,    bg: 'bg-violet-600' },
  applicant:    { Icon: IC.Users,    bg: 'bg-purple-600' },
  rider:        { Icon: IC.Bolt,     bg: 'bg-pink-600' },
  pricing:      { Icon: IC.Billing,  bg: 'bg-emerald-600' },
  fraud:        { Icon: IC.Alerts,   bg: 'bg-red-600' },
  renewal:      { Icon: IC.Flow,     bg: 'bg-amber-600' },
  provider:     { Icon: IC.Globe,    bg: 'bg-teal-600' },
  adjudication: { Icon: IC.Activate, bg: 'bg-green-700' },
};
const _FB_BG = ['bg-blue-500','bg-violet-500','bg-rose-500','bg-emerald-500','bg-amber-600','bg-teal-500','bg-pink-600','bg-indigo-500'];
const _strHash = (s: string) => s.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

export const FactIcon: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg' }> = ({ name, size = 'sm' }) => {
  const cfg = _FACT_ICON_MAP[name.toLowerCase()];
  const bg  = cfg?.bg ?? _FB_BG[_strHash(name) % _FB_BG.length];
  const Icon = cfg?.Icon ?? IC.Table2;
  const dim  = size === 'lg' ? 'w-10 h-10 rounded-xl' : size === 'md' ? 'w-9 h-9 rounded-lg' : 'w-8 h-8 rounded-lg';
  const sz   = size === 'lg' ? 16 : size === 'md' ? 15 : 13;
  return (
    <div className={cn(dim, bg, 'flex items-center justify-center shrink-0')}>
      <Icon size={sz} className="text-white" />
    </div>
  );
};

/* ── PRIMARY SIDEBAR ─────────────────────────────── */
const NAV = [
  { key: 'home', Icon: IC.Home, label: 'Home' },
  { key: 'policy', Icon: IC.Policy, label: 'Policy' },
  { key: 'claims', Icon: IC.Claims, label: 'Claims' },
  { key: 'billing', Icon: IC.Billing, label: 'Billing' },
  { key: 'rules', Icon: IC.Rules, label: 'Rules' },
  { key: 'config', Icon: IC.Config, label: 'Config' },
];

export const PrimarySidebar: React.FC<{ active: string; onSelect: (k: string) => void }> = ({ active, onSelect }) => (
  <aside className="w-[64px] bg-background border-r border-border flex flex-col items-center py-3 shrink-0">
    <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center mb-4">
      <IC.Zap size={16} className="text-primary-foreground" />
    </div>
    <div className="flex flex-col gap-1 flex-1 w-full px-2">
      {NAV.map(({ key, Icon, label }) => (
        <button key={key} onClick={() => onSelect(key)}
          className={cn('flex flex-col items-center gap-1 py-2 px-1 rounded-lg w-full transition-colors',
            active === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent')}>
          <Icon size={18} />
          <span className="text-[10px] font-medium leading-none">{label}</span>
        </button>
      ))}
    </div>
    <div className="flex flex-col gap-1 w-full px-2">
      {[{ Icon: IC.Alerts, label: 'Alerts' }, { Icon: IC.Config, label: 'Settings' }].map(({ Icon, label }) => (
        <button key={label} className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg w-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Icon size={18} /><span className="text-[10px] font-medium leading-none">{label}</span>
        </button>
      ))}
    </div>
  </aside>
);

/* ── SECONDARY SIDEBAR ───────────────────────────── */
const RULES_NAV = [
  { section: 'HOME', items: [{ key: 'dashboard', Icon: LayoutDashboard, label: 'Dashboard' }] },
  {
    section: 'AUTHOR', items: [
      { key: 'decisions', Icon: Binary, label: 'Decisions' },
      { key: 'lookup', Icon: TextSearch, label: 'Lookup' },
      { key: 'approvals', Icon: Stamp, label: 'Approvals' },
    ],
  },
  {
    section: 'INSIGHTS', items: [
      { key: 'analytics', Icon: ChartNoAxesCombined, label: 'Analytics' },
      { key: 'health', Icon: SquareActivity, label: 'Health' },
    ],
  },
  {
    section: 'TEST', items: [
      { key: 'sandbox', Icon: Box, label: 'Sandbox' },
      { key: 'environment', Icon: CloudCog, label: 'Environment' },
    ],
  },
  {
    section: 'CONFIGURE', items: [
      { key: 'fields', Icon: Rows3, label: 'Fields & Facts' },
    ],
  },
];

interface SecondarySidebarProps {
  active: string;
  onSelect: (k: string) => void;
}

export const SecondarySidebar: React.FC<SecondarySidebarProps> = ({ active, onSelect }) => (
  <SidebarProvider
    style={{ '--sidebar-width': '200px', width: 'auto', height: '100%', minHeight: 0 } as React.CSSProperties}
  >
    <Sidebar collapsible="none" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 border-b border-sidebar-border px-4 flex justify-start items-center shrink-0">
        <div>
          <p className="text-base font-bold tracking-tight text-foreground leading-none">AXA</p>
          <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mt-0.5">Motor Insurance</p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {RULES_NAV.map(({ section, items }) => (
          <SidebarGroup key={section}>
            <SidebarGroupLabel>{section}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ key, Icon, label }) => (
                  <SidebarMenuItem key={key}>
                    <SidebarMenuButton
                      isActive={active === key}
                      onClick={() => onSelect(key)}
                      size="sm"
                    >
                      <Icon size={15} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  </SidebarProvider>
);
