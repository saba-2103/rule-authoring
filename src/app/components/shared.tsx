import React, { useEffect } from 'react';

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
}

export interface WhenClause {
  match: 'and' | 'or';
  conditions: Condition[];
}

export interface RuleAction {
  id: string;
  type: string;
  field: string;
  value: string;
  config: Record<string, unknown>;
}

export type BlockType = 'IF' | 'ELSE_IF' | 'ELSE';

export interface ConditionalBlock {
  id: string;
  type: BlockType;
  when: WhenClause;
  actions: RuleAction[];
  nested: BlockGroup[];
}

export interface BlockGroup {
  id: string;
  blocks: ConditionalBlock[];
}

export interface RuleContent {
  topGroups: BlockGroup[];
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
  name: string;
  category: string;
  tags: string[];
  stopOnError: boolean;
  createdAt: string;
  versions: FlowVersion[];
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
  when: { match: 'and', conditions: [] },
  actions: [], nested: [],
});
export const mkElseIfBlock = (): ConditionalBlock => ({
  id: uid(), type: 'ELSE_IF',
  when: { match: 'and', conditions: [] },
  actions: [], nested: [],
});
export const mkElseBlock = (): ConditionalBlock => ({
  id: uid(), type: 'ELSE',
  when: { match: 'and', conditions: [] },
  actions: [], nested: [],
});
export const mkBlockGroup = (): BlockGroup => ({ id: uid(), blocks: [mkIfBlock()] });

const mkBlockRule = (when: WhenClause, actions: RuleAction[]): RuleContent => ({
  topGroups: [{ id: uid(), blocks: [{ id: uid(), type: 'IF', when, actions, nested: [] }] }],
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
    for (const action of block.actions) {
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
  for (const g of content.topGroups) walkGroupForInput(g, fields);
  return groupByFact(fields);
}

export function deriveOutputSchema(content: RuleContent): DerivedSchema {
  const fields = new Map<string, { factType: string; name: string; dataType: string }>();
  for (const g of content.topGroups) walkGroupForOutput(g, fields);
  return groupByFact(fields);
}

/* ── SEED DATA ───────────────────────────────────── */
export const SEED_SPACES: Space[] = [
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
    id: 'life-uw', name: 'AXA Life Insurance', description: 'Life insurance underwriting, pricing and compliance rules',
    createdAt: '2025-03-01T00:00:00',
    members: [
      { userId: 'u1', email: 'alice@insure.com', role: 'ADMIN', joinedAt: '2025-03-01T00:00:00' },
      { userId: 'u4', email: 'david@insure.com', role: 'RULE_AUTHOR', joinedAt: '2025-03-10T00:00:00' },
    ],
    enabledFactIds: ['f-applicant', 'f-rider', 'f-pricing'],
  },
  {
    id: 'claims', name: 'Claims Processing', description: 'Claims assessment, settlement and fraud detection rules',
    createdAt: '2025-02-01T00:00:00',
    members: [
      { userId: 'u2', email: 'bob@insure.com', role: 'ADMIN', joinedAt: '2025-02-01T00:00:00' },
      { userId: 'u5', email: 'eve@insure.com', role: 'RULE_EXECUTOR', joinedAt: '2025-02-15T00:00:00' },
    ],
    enabledFactIds: ['f-claim', 'f-policy', 'f-fraud', 'f-provider', 'f-adjudication', 'f-renewal'],
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
const _c = (field: string, op: string, val = '', val2 = ''): Condition => ({ id: uid(), field, operator: op, value: val, secondValue: val2 });
const _a = (type: string, field: string, val = '', cfg: Record<string, unknown> = {}): RuleAction => ({ id: uid(), type, field, value: val, config: cfg });

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
  { section: 'HOME', items: [{ key: 'dashboard', Icon: IC.Dashboard, label: 'Dashboard' }] },
  {
    section: 'RULES', items: [
      { key: 'decisions', Icon: IC.Rules, label: 'Decisions' },
      { key: 'lookup', Icon: IC.Lookup, label: 'Lookup' },
      { key: 'approvals', Icon: IC.Check, label: 'Approvals' },
      { key: 'analytics', Icon: IC.Grid, label: 'Analytics' },
      { key: 'health', Icon: IC.Bolt, label: 'Health' },
    ],
  },
  {
    section: 'MONITOR', items: [
      { key: 'sandbox', Icon: IC.Eye, label: 'Sandbox' },
      { key: 'environments', Icon: IC.Flow, label: 'Environments' },
    ],
  },
  {
    section: 'CONFIG', items: [
      { key: 'fields', Icon: IC.Table2, label: 'Fields & Facts' },
    ],
  },
];

interface SecondarySidebarProps {
  active: string;
  onSelect: (k: string) => void;
}

export const SecondarySidebar: React.FC<SecondarySidebarProps> = ({ active, onSelect }) => (
  <aside className="w-[200px] bg-background border-r border-border flex flex-col shrink-0">
    {/* Wordmark — aligned to primary sidebar logo */}
    <div className="px-4 flex items-center shrink-0" style={{ height: '64px' }}>
      <div>
        <p className="text-base font-bold tracking-tight text-foreground leading-none">AXA</p>
        <p className="text-[9px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mt-0.5">Motor Insurance</p>
      </div>
    </div>
    <div className="flex flex-col gap-0 overflow-y-auto flex-1 py-2 border-t border-border" style={{ scrollbarWidth: 'thin' }}>
      {RULES_NAV.map(({ section, items }) => (
        <div key={section} className="mb-1">
          <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{section}</p>
          {items.map(({ key, Icon, label }) => (
            <button key={key} onClick={() => onSelect(key)}
              className={cn('flex items-center gap-2.5 w-full px-4 py-1.5 text-sm transition-colors text-left',
                active === key ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground')}>
              {active === key
                ? <span className="flex items-center gap-2.5 bg-primary/10 text-primary rounded-lg px-2 py-1 w-full -mx-2"><Icon size={15} />{label}</span>
                : <><Icon size={15} />{label}</>}
            </button>
          ))}
        </div>
      ))}
    </div>
  </aside>
);
