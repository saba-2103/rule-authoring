**Insurance Rule Engine**

Decision Artifacts Reference

Anaira Decision Document DSL v3.0.0

Derived from UI\_VALIDATION\_USE\_CASES.md · May 2026

# **Overview**

This document catalogues all 28 decision artifacts defined in the Anaira UI Validation Use Cases specification. Each artifact is described in full, including its name, type, governing use case, input fields, conditions, actions, exceptions, and a worked example.

The six use cases cover motor insurance pricing, health maternity waiting periods, critical illness rider underwriting, claims fraud detection, policy renewal loyalty tiers, and group health claims straight-through processing. Together they exercise every artifact kind the Anaira DSL supports — rule, lookup\_table, table, and flow — and every major operator, action, and flow node type.

| Kind | Count | Description |
| :---- | :---- | :---- |
| Rule | 15 | IF/THEN/UNLESS logic artifacts with condition groups and action lists |
| Lookup Table | 4 | Single or composite-key tables mapping input values to output values |
| Decision Table | 3 | Multi-row tables with explicit hit policies (collect\_all, priority\_order, first\_match) |
| Flow | 6 | Orchestration pipelines connecting multiple artifacts into an execution graph |

# **UC-A · Motor Insurance — Dynamic Pricing Engine**

A motor policy premium is calculated in a defined sequence: a base rate from a vehicle × region lookup, a No-Claim Bonus discount based on consecutive claim-free years, a young driver surcharge for drivers under 25, and a regulatory cap on both maximum discount and maximum loading. Seven artifacts — two lookup tables, three rules, one decision table, and one orchestration flow — work together to produce the final premium.

| Artifact | Kind |
| :---- | :---- |
| motor\_ncb\_rate\_table | Lookup Table |
| motor\_base\_premium\_table | Lookup Table |
| motor\_base\_premium\_lookup\_rule | Rule |
| motor\_ncb\_lookup\_rule | Rule |
| motor\_young\_driver\_loading | Rule |
| motor\_premium\_cap\_table | Decision Table |
| motor\_pricing\_orchestration\_flow | Flow |

### **motor\_ncb\_rate\_table**

**\[LOOKUP TABLE\]**

UC-A · Motor Pricing

Single-key lookup table that maps the number of consecutive claim-free years (0 through 5\) to the corresponding No-Claim Bonus (NCB) discount percentage. Used by the NCB lookup rule to fetch the applicable discount before applying it to the base premium.

| INPUTS Fact / Field Type claimFreeYears (key) Integer (0–5) ncbDiscountPct (value) Percentage (0–50%)  |
| :---- |

| CONDITIONS (IF) KEY:   claimFreeYears  →  0 | 1 | 2 | 3 | 4 | 5 VALUE: ncbDiscountPct  →  0% | 20% | 30% | 40% | 45% | 50% |
| :---- |

| ACTIONS (THEN) →  Returns ncbDiscountPct for the matched key |
| :---- |

| WORKED EXAMPLE — motor\_ncb\_rate\_table Input:   claimFreeYears \= 3 Output:  ncbDiscountPct \= 40% Meaning: A driver with 3 consecutive claim-free years receives a 40% NCB discount on their base premium. |
| :---- |

### **motor\_base\_premium\_table**

**\[LOOKUP TABLE\]**

UC-A · Motor Pricing

Composite-key lookup table mapping vehicle type combined with region to a base annual premium amount. The two keys are joined with a pipe delimiter (vehicleType|region) to form a single lookup key. This table is the starting point for all motor premium calculations.

| INPUTS Fact / Field Type vehicleType (key 1\) Enum: Hatchback | SUV | Truck region (key 2\) Enum: Metro | Tier-2 baseAnnualPremium (value) Currency (₹)  |
| :---- |

| CONDITIONS (IF) KEY:   vehicleType | region  (composite, joined with "|") Hatchback | Metro   →  ₹8,000 Hatchback | Tier-2  →  ₹6,500 SUV | Metro         →  ₹14,000 SUV | Tier-2        →  ₹11,500 Truck | Metro       →  ₹18,000 Truck | Tier-2      →  ₹15,000 |
| :---- |

| ACTIONS (THEN) →  Returns baseAnnualPremium for the matched composite key |
| :---- |

| WORKED EXAMPLE — motor\_base\_premium\_table Input:   vehicleType \= "SUV", region \= "Metro" Lookup key: "SUV|Metro" Output:  baseAnnualPremium \= ₹14,000 Meaning: An SUV registered in a metro area starts at ₹14,000 before any discount or loading. |
| :---- |

### **motor\_base\_premium\_lookup\_rule**

**\[RULE\]**

UC-A · Motor Pricing   ·   **Severity:** info

Rule that triggers the base premium lookup. It fires when the vehicle type is present, uses the composite key (vehicleType|region) to query the motor\_base\_premium\_table, and writes the result to pricing.basePremium for use by downstream nodes in the pricing flow.

| INPUTS Fact / Field Type policy.vehicleType String — must be non-null to fire policy.region String — used as second key component  |
| :---- |

| CONDITIONS (IF) IF ALL of:   policy.vehicleType  IS\_NOT\_NULL |
| :---- |

| ACTIONS (THEN) →  LOOKUP motor\_base\_premium\_table using (vehicleType \+ "|" \+ region) as composite key →  WRITE result → pricing.basePremium |
| :---- |

| WORKED EXAMPLE — motor\_base\_premium\_lookup\_rule Input:   policy.vehicleType \= "Hatchback", policy.region \= "Tier-2" Condition met: vehicleType is not null  →  rule fires Lookup key: "Hatchback|Tier-2" Result:  pricing.basePremium \= ₹6,500 |
| :---- |

### **motor\_ncb\_lookup\_rule**

**\[RULE\]**

UC-A · Motor Pricing   ·   **Severity:** info

Rule that fetches the NCB discount rate from the motor\_ncb\_rate\_table using the policyholder's consecutive claim-free years. The discount percentage is written to pricing.ncbDiscountPct and later consumed by the Apply NCB Discount expression node in the orchestration flow.

| INPUTS Fact / Field Type policy.claimFreeYears Integer (0–5) — must be non-null to fire  |
| :---- |

| CONDITIONS (IF) IF ALL of:   policy.claimFreeYears  IS\_NOT\_NULL |
| :---- |

| ACTIONS (THEN) →  LOOKUP motor\_ncb\_rate\_table using claimFreeYears as key →  WRITE result → pricing.ncbDiscountPct |
| :---- |

| WORKED EXAMPLE — motor\_ncb\_lookup\_rule Input:   policy.claimFreeYears \= 4 Condition met  →  rule fires Lookup:  4 claim-free years → ncbDiscountPct \= 45% Result:  pricing.ncbDiscountPct \= 45% |
| :---- |

### **motor\_young\_driver\_loading**

**\[RULE\]**

UC-A · Motor Pricing   ·   **Severity:** info

Applies a 15% surcharge loading to the base premium when the driver is under 25 years of age and a base premium has already been calculated. The rule also records the surcharge reason code in the loadingReasons list for downstream audit and reporting purposes.

| INPUTS Fact / Field Type driver.age Integer — must be \< 25 to trigger pricing.basePremium Currency — must be non-null to trigger  |
| :---- |

| CONDITIONS (IF) IF ALL of:   driver.age              LESS\_THAN 25   pricing.basePremium     IS\_NOT\_NULL |
| :---- |

| ACTIONS (THEN) →  APPLY\_PERCENTAGE 15% surcharge on pricing.basePremium → updates pricing.basePremium →  ADD\_TO\_LIST  "YOUNG\_DRIVER\_SURCHARGE\_15PCT"  →  pricing.loadingReasons →  ADD\_MESSAGE  template referencing driver.age and the applied surcharge rate |
| :---- |

| WORKED EXAMPLE — motor\_young\_driver\_loading Input:   driver.age \= 22, pricing.basePremium \= ₹8,000 (Hatchback, Metro) Both conditions met  →  rule fires Loading:  15% of ₹8,000 \= ₹1,200 surcharge Updated:  pricing.basePremium \= ₹9,200 Reason:   "YOUNG\_DRIVER\_SURCHARGE\_15PCT" added to loadingReasons |
| :---- |

### **motor\_premium\_cap\_table**

**\[TABLE\]**

UC-A · Motor Pricing

Priority-ordered decision table that enforces regulatory caps on motor premium discounts and loadings. A null cell in any input column acts as a wildcard — it matches any value. The first matching row (by priority) wins. The table prevents underpricing (discount \> 60%) and overloading (loading \> 100%).

| INPUTS Fact / Field Type pricing.totalDiscountPct Percentage — evaluated with GREATER\_THAN operator pricing.totalLoadingPct Percentage — evaluated with GREATER\_THAN operator  |
| :---- |

| CONDITIONS (IF) HIT POLICY: priority\_order  (first matching row wins) Row 1 (priority 100):  totalDiscountPct \> 60  →  cap discount at 60%, capApplied \= true Row 2 (priority 90):   totalLoadingPct  \> 100 →  cap loading at 100%, capApplied \= true Row 3 (priority 10):   (both null \= wildcard) →  passthrough, capApplied \= false |
| :---- |

| ACTIONS (THEN) →  OUTPUT: cappedDiscountPct — effective discount after applying cap →  OUTPUT: cappedLoadingPct  — effective loading after applying cap →  OUTPUT: capApplied (boolean) — signals whether capping occurred |
| :---- |

| WORKED EXAMPLE — motor\_premium\_cap\_table Scenario A — discount exceeds cap:   Input: totalDiscountPct \= 65%, totalLoadingPct \= 0%   Row 1 matches (65% \> 60%)  →  cappedDiscountPct \= 60%, capApplied \= true Scenario B — no cap needed:   Input: totalDiscountPct \= 40%, totalLoadingPct \= 10%   Row 3 matches (wildcard)   →  passthrough, capApplied \= false |
| :---- |

### **motor\_pricing\_orchestration\_flow**

**\[FLOW\]**

UC-A · Motor Pricing

Seven-node strictly sequential flow that defines the legal execution order for motor premium calculation. Without this flow, the engine has no instruction on whether the NCB discount applies before or after young driver loading, or whether the cap table sees intermediate or final amounts. The flow makes pricing math order legally unambiguous.

| INPUTS Fact / Field Type policy.vehicleType String policy.region String policy.claimFreeYears Integer driver.age Integer  |
| :---- |

| CONDITIONS (IF) Node 1 (start):       Pricing Start Node 2 (rule):        Base Premium Lookup  →  ruleRef: motor\_base\_premium\_lookup\_rule   onError: stop Node 3 (rule):        NCB Discount Lookup  →  ruleRef: motor\_ncb\_lookup\_rule            onError: stop Node 4 (expression):  Apply NCB Discount   →  formula: basePremium × (1 − ncbDiscountPct/100) → pricing.discountedPremium  onError: stop Node 5 (rule):        Young Driver Loading  →  ruleRef: motor\_young\_driver\_loading       when: driver.age \< 25   onError: continue Node 6 (table):       Premium Cap          →  tableRef: motor\_premium\_cap\_table          onError: continue Node 7 (end):         Pricing Complete Edges: 1→2→3→4→5→6→7 (strictly sequential, no branching) |
| :---- |

| ACTIONS (THEN) →  Produces pricing.basePremium, pricing.discountedPremium, and final capped amounts as flow outputs |
| :---- |

| WORKED EXAMPLE — motor\_pricing\_orchestration\_flow Input: SUV | Metro, claimFreeYears=2, driver.age=23 Node 2: basePremium \= ₹14,000 Node 3: ncbDiscountPct \= 30% Node 4: discountedPremium \= ₹14,000 × 0.70 \= ₹9,800 Node 5: driver.age=23 \< 25  →  loading fires: ₹9,800 × 1.15 \= ₹11,270 Node 6: totalDiscount=30%, totalLoading=15%  →  no cap needed Final:  pricing.discountedPremium \= ₹11,270, capApplied \= false |
| :---- |

# **UC-B · Health Insurance — Maternity Waiting Period**

Maternity benefits activate only after 24 months of continuous coverage. A lapse of more than 30 days resets the clock to zero. Two rules handle this: the eligibility check (a blocker rule that rejects non-qualifying maternity claims) and the lapse reset rule (which resets coverage months on reinstatement).

| Artifact | Kind |
| :---- | :---- |
| health\_maternity\_waiting\_period\_check | Rule |
| health\_maternity\_waiting\_reset\_on\_lapse | Rule |

### **health\_maternity\_waiting\_period\_check**

**\[RULE\]**

UC-B · Maternity Waiting Period   ·   **Severity:** blocker — regulator\_grade audit, retention 2190 days, PII redaction: partial

Blocks maternity benefit claims where the policyholder has not completed the mandatory 24-month continuous coverage waiting period, or where a policy lapse has occurred within the last 24 months. Also validates that the treatment date falls within the active policy window. This is a blocker-severity rule, meaning it terminates the claim pipeline on failure.

| INPUTS Fact / Field Type claim.benefitCode String — must equal "MATERNITY" policy.continuousCoverageMonths Integer — months of uninterrupted coverage policy.hasLapseInLast24Months Boolean claim.treatmentDate Date — must be a fact reference (not a literal) policy.inceptionDate Date — fact reference for lower bound policy.expiryDate Date — fact reference for upper bound  |
| :---- |

| CONDITIONS (IF) Root group (AND):   claim.benefitCode  EQUALS  "MATERNITY" Sub-group 1 (OR — at least one must be true to block):   policy.continuousCoverageMonths  LESS\_THAN  24   policy.hasLapseInLast24Months    EQUALS     true Sub-group 2 (AND — both bounds are fact references, not literals):   claim.treatmentDate  DATE\_BETWEEN  policy.inceptionDate  AND  policy.expiryDate |
| :---- |

| ACTIONS (THEN) →  ASSIGN  claim.eligible \= false →  ADD\_TO\_LIST  "MATERNITY\_WAITING\_PERIOD\_NOT\_SERVED"  →  claim.rejectionReasons →  ADD\_MESSAGE  template referencing continuousCoverageMonths and hasLapseInLast24Months |
| :---- |

| WORKED EXAMPLE — health\_maternity\_waiting\_period\_check Input: benefitCode="MATERNITY", continuousCoverageMonths=18, hasLapseInLast24Months=false        treatmentDate=2026-03-10, inceptionDate=2024-09-01, expiryDate=2027-08-31 Root group: benefitCode \= MATERNITY  ✓ Sub-group 1: continuousCoverageMonths=18 \< 24  ✓  (OR satisfied) Sub-group 2: treatmentDate within policy window  ✓ All conditions met  →  claim.eligible \= false Rejection reason: MATERNITY\_WAITING\_PERIOD\_NOT\_SERVED Message: "Maternity benefits require 24 months of continuous coverage. Current: 18 months." |
| :---- |

### **health\_maternity\_waiting\_reset\_on\_lapse**

**\[RULE\]**

UC-B · Maternity Waiting Period   ·   **Severity:** warning

Detects a policy reinstatement after a lapse gap exceeding 30 days and resets the continuous coverage counter to zero. This rule must run before the maternity eligibility check to ensure the coverage clock is accurate at the time of claim evaluation.

| INPUTS Fact / Field Type policy.lapseGapDays Integer — number of days between lapse and reinstatement policy.reinstatementDate Date — must be non-null  |
| :---- |

| CONDITIONS (IF) IF ALL of:   policy.lapseGapDays      GREATER\_THAN   30   policy.reinstatementDate  IS\_NOT\_NULL |
| :---- |

| ACTIONS (THEN) →  ASSIGN  policy.hasLapseInLast24Months \= true →  ASSIGN  policy.continuousCoverageMonths \= 0  (resets waiting period clock) →  ADD\_MESSAGE  template referencing lapse gap days and reinstatement date |
| :---- |

| WORKED EXAMPLE — health\_maternity\_waiting\_reset\_on\_lapse Input: lapseGapDays \= 45, reinstatementDate \= 2025-08-15 lapseGapDays \= 45 \> 30  ✓ reinstatementDate is not null  ✓ Result: hasLapseInLast24Months \= true, continuousCoverageMonths \= 0 Outcome: Member must now complete a fresh 24-month waiting period before maternity benefits apply. |
| :---- |

# **UC-C · Critical Illness Rider — Eligibility with Exceptions**

A CI rider requires the applicant to be aged 18–60 with no pre-existing conditions, plus at least one of three health branches to be satisfied: standard BMI, borderline BMI with a compensating underwriting score, or well-controlled diabetes. Smokers receive a 25% premium surcharge and doubled waiting period.

| Artifact | Kind |
| :---- | :---- |
| ci\_rider\_eligibility\_with\_exceptions | Rule |
| ci\_rider\_smoker\_loading | Rule |

### **ci\_rider\_eligibility\_with\_exceptions**

**\[RULE\]**

UC-C · Critical Illness Rider   ·   **Severity:** decline — governance: underwriting, audit: enhanced

Multi-layer eligibility rule for the CI rider with four levels of AND/OR nesting and three mutually exclusive eligibility branches. The rule tests age range and absence of pre-existing conditions at the root level, then evaluates one of three BMI/health branches inside an OR group. This is the deepest nesting test case in the validation set.

| INPUTS Fact / Field Type applicant.age Integer — must be 18–60 applicant.preExistingConditions List — must be empty applicant.bmi Decimal — evaluated across three branches applicant.medicalUnderwritingScore Integer — required for borderline BMI branch applicant.isDiabetic Boolean — required for diabetic branch applicant.hba1c Decimal — required for diabetic branch (must be \< 7\) applicant.diabeticComplications List — must be empty for diabetic branch  |
| :---- |

| CONDITIONS (IF) Root (AND):   applicant.age                    BETWEEN  18  AND  60   applicant.preExistingConditions  IS\_EMPTY   Sub-group (OR — at least one branch must be satisfied):     Branch 1 — Standard:       applicant.bmi  LESS\_THAN  32     Branch 2 — Borderline BMI exception:       applicant.bmi                    BETWEEN  32  AND  35       applicant.medicalUnderwritingScore  GREATER\_THAN  85     Branch 3 — Diabetic exception:       applicant.isDiabetic             EQUALS  true       applicant.hba1c                  LESS\_THAN  7       applicant.diabeticComplications  IS\_EMPTY |
| :---- |

| ACTIONS (THEN) →  ASSIGN  rider.ciEligible \= true →  ADD\_MESSAGE  template confirming approval with applicant age and BMI |
| :---- |

| EXCEPTIONS (UNLESS) Borderline BMI exception (handled as Branch 2 in OR group) When:  applicant.bmi BETWEEN 32 AND 35  AND  applicant.medicalUnderwritingScore \> 85 Do:       Standard BMI gate waived — underwriting score of \> 85 compensates for elevated BMI (32–35 range) Diabetic applicant exception (handled as Branch 3 in OR group) When:  applicant.isDiabetic \= true  AND  applicant.hba1c \< 7  AND  diabeticComplications IS\_EMPTY Do:       CI rider approved for well-controlled diabetic — no complications and controlled HbA1c |
| :---- |

| WORKED EXAMPLE — ci\_rider\_eligibility\_with\_exceptions Scenario A — Standard approval:   Age=38, BMI=26, no pre-existing conditions   Root (AND): age 18–60 ✓, preExisting empty ✓   Branch 1: BMI=26 \< 32 ✓  →  ciEligible \= true Scenario B — Borderline BMI override:   Age=45, BMI=34, underwritingScore=92   Root (AND): ✓   Branch 2: BMI 32–35 ✓, score \> 85 ✓  →  ciEligible \= true Scenario C — Declined:   Age=45, BMI=38, underwritingScore=72, not diabetic   Branch 1: BMI ≥ 32 ✗   Branch 2: score ≤ 85 ✗   Branch 3: not diabetic ✗   All branches fail  →  rule does not set ciEligible \= true  →  decline |
| :---- |

### **ci\_rider\_smoker\_loading**

**\[RULE\]**

UC-C · Critical Illness Rider   ·   **Severity:** warning

Applies a 25% premium surcharge and doubles the waiting period for current smokers or recent quitters who have been approved for the CI rider. This rule runs after eligibility is confirmed.

| INPUTS Fact / Field Type applicant.smokingStatus Enum: CURRENT\_SMOKER | RECENT\_QUITTER | NON\_SMOKER | EX\_SMOKER rider.ciEligible Boolean — must be true for rule to fire rider.ciBasePremium Currency rider.waitingPeriodMonths Integer  |
| :---- |

| CONDITIONS (IF) IF ALL of:   applicant.smokingStatus  IN  \["CURRENT\_SMOKER", "RECENT\_QUITTER"\]   rider.ciEligible         EQUALS  true |
| :---- |

| ACTIONS (THEN) →  APPLY\_PERCENTAGE  25%  surcharge on rider.ciBasePremium →  MULTIPLY  rider.waitingPeriodMonths  by  2 →  ADD\_TO\_LIST  "SMOKER\_LOADING\_25PCT"  →  rider.loadingReasons →  ADD\_MESSAGE  template referencing smoking status and applied loading |
| :---- |

| EXCEPTIONS (UNLESS) Ex-smoker (quit more than 5 years ago) When:  applicant.smokingStatus \= "EX\_SMOKER"  AND  yearsQuit \> 5 Do:       No loading applied — ex-smokers who have been quit for over 5 years are treated as non-smokers |
| :---- |

| WORKED EXAMPLE — ci\_rider\_smoker\_loading Input: smokingStatus \= "CURRENT\_SMOKER", ciEligible \= true        ciBasePremium \= ₹12,000, waitingPeriodMonths \= 24 Both conditions met  →  rule fires 25% loading: ₹12,000 × 1.25 \= ₹15,000 Waiting period: 24 × 2 \= 48 months Reason code: SMOKER\_LOADING\_25PCT added to loadingReasons |
| :---- |

# **UC-D · Claims Fraud Signal Detection**

A claim is flagged for manual review if multiple fraud signals fire simultaneously. The collect\_all table appends all matching signals (with point values) to a list. A SUM\_LIST aggregator computes the total score. A final escalation rule creates a task and sets the decision lane to REVIEW when the score reaches 50\.

| Artifact | Kind |
| :---- | :---- |
| claims\_fraud\_signal\_table | Decision Table |
| claims\_fraud\_score\_aggregator | Rule |
| claims\_fraud\_escalation | Rule |

### **claims\_fraud\_signal\_table**

**\[TABLE\]**

UC-D · Claims Fraud Detection   ·   **Severity:** referral — governance: claims, audit: enhanced, retention 3650 days, PII: mask

collect\_all decision table that evaluates every row simultaneously, unlike first\_match which exits on the first hit. Each matching row appends a structured object { signal, points } to the fraud.detections list. The use of a single object-valued output column (rather than separate columns) keeps the signal name and score co-located, enabling SUM\_LIST aggregation in the next step.

| INPUTS Fact / Field Type claim.amountToAverageProcedureRatio Decimal — checked with GREATER\_THAN 3 claim.hospitalRiskTier Enum — checked with IN \[HIGH, WATCHLIST\] policy.ageInMonths Integer — checked with LESS\_THAN 6 claim.hasDocumentMismatch Boolean — checked with EQUALS true  |
| :---- |

| CONDITIONS (IF) HIT POLICY: collect\_all  (ALL matching rows fire — no early exit) Row 1: amountToAverageProcedureRatio \> 3        →  { signal: "HIGH\_CLAIM\_AMOUNT",   points: 30 } Row 2: hospitalRiskTier IN \[HIGH, WATCHLIST\]    →  { signal: "HIGH\_RISK\_PROVIDER",  points: 25 } Row 3: policy.ageInMonths \< 6                  →  { signal: "EARLY\_CLAIM",          points: 20 } Row 4: claim.hasDocumentMismatch \= true         →  { signal: "DOCUMENT\_MISMATCH",   points: 35 } Null cells in any input column \= wildcard (matches any value for that input) |
| :---- |

| ACTIONS (THEN) →  Each matched row appends { signal: "...", points: N } to fraud.detections →  Multiple rows can and do fire on a single claim →  fraud.detections is a list of objects — SUM\_LIST is required to compute totalScore |
| :---- |

| WORKED EXAMPLE — claims\_fraud\_signal\_table Input:   amountToAverageProcedureRatio \= 4.2   (\> 3 → Row 1 fires)   hospitalRiskTier \= "LOW"              (not HIGH/WATCHLIST → Row 2 skips)   policy.ageInMonths \= 4               (\< 6 → Row 3 fires)   claim.hasDocumentMismatch \= true      (= true → Row 4 fires) fraud.detections \= \[   { signal: "HIGH\_CLAIM\_AMOUNT", points: 30 },   { signal: "EARLY\_CLAIM",       points: 20 },   { signal: "DOCUMENT\_MISMATCH", points: 35 } \] Pre-aggregation total: 30 \+ 20 \+ 35 \= 85 points |
| :---- |

### **claims\_fraud\_score\_aggregator**

**\[RULE\]**

UC-D · Claims Fraud Detection   ·   **Severity:** info

Mandatory aggregation step that runs SUM\_LIST over the fraud.detections list, extracting the points field from each signal object and summing them into the scalar fraud.totalScore. Without this rule, fraud.totalScore remains null and the escalation rule silently never fires. This rule must execute after the fraud signal table and before the escalation rule.

| INPUTS Fact / Field Type fraud.detections List\<{ signal: string, points: integer }\> — must be non-empty  |
| :---- |

| CONDITIONS (IF) IF ALL of:   fraud.detections  IS\_NOT\_EMPTY |
| :---- |

| ACTIONS (THEN) →  SUM\_LIST  fraud.detections  itemField: "points"  →  fraud.totalScore →  LOG  fraud.totalScore  with claim ID for audit trail |
| :---- |

| WORKED EXAMPLE — claims\_fraud\_score\_aggregator Input: fraud.detections \= \[   { signal: "HIGH\_CLAIM\_AMOUNT", points: 30 },   { signal: "EARLY\_CLAIM",       points: 20 },   { signal: "DOCUMENT\_MISMATCH", points: 35 } \] SUM\_LIST extracts: 30 \+ 20 \+ 35 \= 85 Result: fraud.totalScore \= 85 Next: escalation rule fires because 85 ≥ 50 |
| :---- |

### **claims\_fraud\_escalation**

**\[RULE\]**

UC-D · Claims Fraud Detection   ·   **Severity:** referral

Final step in the fraud detection chain. Escalates the claim to manual review when the cumulative fraud score reaches or exceeds 50\. Creates a fraud investigation task and routes the claim to the REVIEW decision lane. This rule depends on claims\_fraud\_score\_aggregator having run first.

| INPUTS Fact / Field Type fraud.totalScore Integer — computed by the aggregator rule  |
| :---- |

| CONDITIONS (IF) IF ALL of:   fraud.totalScore  GREATER\_THAN\_OR\_EQUAL  50 |
| :---- |

| ACTIONS (THEN) →  ASSIGN  claim.decisionLane \= "REVIEW" →  CREATE\_TASK  type: "FRAUD\_INVESTIGATION"  with claim ID, total score, and signals list →  ADD\_MESSAGE  template including claim ID, totalScore, and fraud.detections summary |
| :---- |

| EXCEPTIONS (UNLESS) Borderline score on small claims (soft review only) When:  fraud.totalScore \>= 50  AND  fraud.totalScore \< 70  AND  claim.totalAmount \< 5000 Do:       FLAG for soft review only — route to LOW\_PRIORITY\_REVIEW queue, no hard block on payment |
| :---- |

| WORKED EXAMPLE — claims\_fraud\_escalation Input: fraud.totalScore \= 85 (from aggregator) Condition: 85 ≥ 50  ✓  →  rule fires ASSIGN: claim.decisionLane \= "REVIEW" CREATE\_TASK: FRAUD\_INVESTIGATION task created Message: "Claim CLM-2026-00442 escalated. Fraud score: 85\. Signals: HIGH\_CLAIM\_AMOUNT (30), EARLY\_CLAIM (20), DOCUMENT\_MISMATCH (35)." |
| :---- |

# **UC-E · Renewal — Loyalty Tier & No-Claim Bonus Transition**

At annual renewal, claim history over the past three years determines the outcome. Zero claims trigger an automatic tier upgrade and 50% NCB. More than two claims trigger a 20% premium loading and restricted provider network. A parallel flow runs both evaluations simultaneously after aggregating the claim count.

| Artifact | Kind |
| :---- | :---- |
| renewal\_aggregate\_claim\_count | Rule |
| renewal\_auto\_upgrade\_zero\_claim | Rule |
| renewal\_loading\_high\_claim | Rule |
| renewal\_tier\_progression\_table | Lookup Table |
| renewal\_decision\_flow | Flow |

### **renewal\_aggregate\_claim\_count**

**\[RULE\]**

UC-E · Renewal Loyalty   ·   **Severity:** info

Aggregates the total claim count across the previous three policy years using SUM\_LIST over the policy.claimHistory collection. The resulting scalar (renewal.claimCountLast3Years) feeds the upgrade and loading rules downstream. This rule fires only on ANNUAL\_RENEWAL trigger type.

| INPUTS Fact / Field Type renewal.triggerType Enum — must equal "ANNUAL\_RENEWAL" policy.claimHistory List\<{ year: integer, countInPeriod: integer }\> — must be non-null  |
| :---- |

| CONDITIONS (IF) IF ALL of:   renewal.triggerType    EQUALS      "ANNUAL\_RENEWAL"   policy.claimHistory    IS\_NOT\_NULL |
| :---- |

| ACTIONS (THEN) →  SUM\_LIST  policy.claimHistory  itemField: "countInPeriod"  →  renewal.claimCountLast3Years →  LOG  aggregated claim count for renewal decision audit trail |
| :---- |

| WORKED EXAMPLE — renewal\_aggregate\_claim\_count Input: triggerType \= "ANNUAL\_RENEWAL"        claimHistory \= \[{ year: 2024, countInPeriod: 0 }, { year: 2025, countInPeriod: 1 }, { year: 2026, countInPeriod: 0 }\] SUM\_LIST: 0 \+ 1 \+ 0 \= 1 Result: renewal.claimCountLast3Years \= 1 Next: 1 is neither 0 nor \> 2, so neither upgrade nor loading rule fires |
| :---- |

### **renewal\_auto\_upgrade\_zero\_claim**

**\[RULE\]**

UC-E · Renewal Loyalty   ·   **Severity:** info

Automatically upgrades the policy tier to the next level and awards the maximum 50% NCB discount when the policyholder has zero claims in the last three years and the grace period has not expired. Uses the renewal\_tier\_progression\_table to determine the next tier.

| INPUTS Fact / Field Type renewal.claimCountLast3Years Integer — must equal 0 renewal.gracePeriodExpired Boolean — must be false policy.currentTier Enum: BRONZE | SILVER | GOLD | PLATINUM  |
| :---- |

| CONDITIONS (IF) IF ALL of:   renewal.claimCountLast3Years  EQUALS  0   renewal.gracePeriodExpired    EQUALS  false |
| :---- |

| ACTIONS (THEN) →  LOOKUP  renewal\_tier\_progression\_table  using policy.currentTier  →  renewal.nextTier →  ASSIGN  renewal.ncbDiscountPct \= 50 →  ADD\_MESSAGE  showing tier upgrade path and NCB rate awarded |
| :---- |

| EXCEPTIONS (UNLESS) Grace period expired When:  renewal.gracePeriodExpired \= true Do:       Deny auto-upgrade. Route to new underwriting — grace period lapsed, continuity of benefits lost |
| :---- |

| WORKED EXAMPLE — renewal\_auto\_upgrade\_zero\_claim Input: claimCountLast3Years \= 0, gracePeriodExpired \= false, currentTier \= "SILVER" Both conditions met  →  rule fires Lookup: SILVER → nextTier \= GOLD ASSIGN: ncbDiscountPct \= 50% Message: "Congratulations\! Zero claims in 3 years. Tier upgraded: SILVER → GOLD. NCB: 50%." |
| :---- |

### **renewal\_loading\_high\_claim**

**\[RULE\]**

UC-E · Renewal Loyalty   ·   **Severity:** warning

Applies a 20% premium loading and restricts the provider network when the member has made more than two claims in the last three policy years. This rule runs in parallel with the zero-claim upgrade rule — both use the aggregated claimCountLast3Years value from the aggregator rule.

| INPUTS Fact / Field Type renewal.claimCountLast3Years Integer — must be \> 2 renewal.basePremium Currency  |
| :---- |

| CONDITIONS (IF) IF ALL of:   renewal.claimCountLast3Years  GREATER\_THAN  2 |
| :---- |

| ACTIONS (THEN) →  APPLY\_PERCENTAGE  20%  loading on renewal.basePremium →  ASSIGN  renewal.restrictedNetworkRequired \= true →  ADD\_TO\_LIST  "HIGH\_CLAIM\_RENEWAL\_REVIEW"  →  renewal.reviewFlags →  ADD\_MESSAGE  referencing claim count and applied loading rate |
| :---- |

| WORKED EXAMPLE — renewal\_loading\_high\_claim Input: claimCountLast3Years \= 4, renewal.basePremium \= ₹24,000 Condition: 4 \> 2  ✓  →  rule fires Loading: 20% of ₹24,000 \= ₹4,800 Updated premium: ₹28,800 ASSIGN: restrictedNetworkRequired \= true Flag: HIGH\_CLAIM\_RENEWAL\_REVIEW added to reviewFlags |
| :---- |

### **renewal\_tier\_progression\_table**

**\[LOOKUP TABLE\]**

UC-E · Renewal Loyalty

Single-key lookup table that maps the current policy tier to the next tier for auto-upgrade on zero-claim renewal. PLATINUM is the maximum tier — it maps to itself.

| INPUTS Fact / Field Type currentTier (key) Enum: BRONZE | SILVER | GOLD | PLATINUM nextTier (value) Enum: SILVER | GOLD | PLATINUM  |
| :---- |

| CONDITIONS (IF) BRONZE   →  SILVER SILVER   →  GOLD GOLD     →  PLATINUM PLATINUM →  PLATINUM  (maximum tier — no further upgrade) |
| :---- |

| ACTIONS (THEN) →  Returns nextTier for the matched currentTier key |
| :---- |

| WORKED EXAMPLE — renewal\_tier\_progression\_table Input:   currentTier \= "GOLD" Output:  nextTier \= "PLATINUM" Input:   currentTier \= "PLATINUM" Output:  nextTier \= "PLATINUM"  (already at maximum) |
| :---- |

### **renewal\_decision\_flow**

**\[FLOW\]**

UC-E · Renewal Loyalty

Five-node orchestration flow with a parallel fork after claim count aggregation. The zero-claim upgrade and high-claim loading rules run simultaneously on separate branches. Each branch has a when guard so only the applicable rule executes based on the aggregated count.

| INPUTS Fact / Field Type policy.currentTier Enum policy.claimHistory List renewal.triggerType Enum renewal.gracePeriodExpired Boolean  |
| :---- |

| CONDITIONS (IF) Node 1 (start):   Renewal Start Node 2 (rule):    Aggregate Claim Count  →  renewal\_aggregate\_claim\_count   onError: stop (mandatory) Node 3 (rule):    Zero-Claim Auto-Upgrade →  renewal\_auto\_upgrade\_zero\_claim  when: claimCount \= 0   onError: continue Node 4 (rule):    High-Claim Loading      →  renewal\_loading\_high\_claim       when: claimCount \> 2   onError: continue Node 5 (end):     Renewal Complete Edges: 1→2, 2→3 (parallel), 2→4 (parallel), 3→5, 4→5 Join at node 5: wait\_any (at least one branch must complete) |
| :---- |

| ACTIONS (THEN) →  Produces renewal.nextTier, renewal.ncbDiscountPct, renewal.reviewFlags as flow outputs |
| :---- |

| WORKED EXAMPLE — renewal\_decision\_flow Input: currentTier \= "SILVER", claimCountLast3Years \= 0, gracePeriodExpired \= false Node 2: SUM\_LIST → claimCount \= 0 Node 3: claimCount \= 0 → when guard satisfied → fires → SILVER upgrades to GOLD, NCB \= 50% Node 4: claimCount not \> 2 → when guard not satisfied → skipped Node 5: complete |
| :---- |

# **UC-F · Group Health — Claims Straight-Through Processing (STP)**

A 12-node pipeline auto-approves clean, in-network, low-fraud claims in under two seconds. The pipeline normalises the payload, gates on policy eligibility, computes the deductible, runs fraud detection and network classification in parallel, conditionally escalates high-fraud claims, routes to a claim-type-specific subflow, caps per-line-item benefits in a loop, computes the payable amount, and finally gates on the STP approval criteria.

| Artifact | Kind |
| :---- | :---- |
| claims\_policy\_eligibility\_gate | Rule |
| claims\_provider\_network\_check | Rule |
| claims\_stp\_decision\_gate | Rule |
| provider\_network\_tier\_table | Lookup Table |
| claims\_line\_item\_benefit\_cap\_table | Decision Table |
| claims\_stp\_adjudication\_flow | Flow |

### **claims\_policy\_eligibility\_gate**

**\[RULE\]**

UC-F · Claims STP Adjudication   ·   **Severity:** decline — onError: stop (hard gate)

Hard eligibility gate that is the first rule node in the STP pipeline (node 3). If any condition fails, the entire pipeline stops and the claim is declined. Verifies three independent criteria: policy is active, treatment date falls within the active policy window, and a benefit code is present. Both date bounds are evaluated as fact references.

| INPUTS Fact / Field Type policy.status Enum — must equal "ACTIVE" claim.benefitCode String — must be non-null claim.treatmentDate Date — fact reference policy.inceptionDate Date — fact reference (lower bound) policy.expiryDate Date — fact reference (upper bound)  |
| :---- |

| CONDITIONS (IF) IF ALL of:   policy.status        EQUALS       "ACTIVE"   claim.benefitCode    IS\_NOT\_NULL   claim.treatmentDate  DATE\_BETWEEN  policy.inceptionDate  AND  policy.expiryDate |
| :---- |

| ACTIONS (THEN) →  ASSIGN  claim.eligible \= true →  ADD\_MESSAGE  confirmation template with policy ID and benefit code |
| :---- |

| EXCEPTIONS (UNLESS) Pending policy reinstatement When:  policy.status \= "PENDING" Do:       Hold claim — policy reinstatement is in progress. Route to manual queue, do not auto-decline |
| :---- |

| WORKED EXAMPLE — claims\_policy\_eligibility\_gate Input: policy.status \= "ACTIVE", benefitCode \= "HOSPITALIZATION"        treatmentDate \= 2026-04-15, inceptionDate \= 2025-01-01, expiryDate \= 2026-12-31 status \= ACTIVE ✓ benefitCode not null ✓ treatmentDate (2026-04-15) between inception (2025-01-01) and expiry (2026-12-31) ✓ Result: claim.eligible \= true → pipeline continues |
| :---- |

### **claims\_provider\_network\_check**

**\[RULE\]**

UC-F · Claims STP Adjudication   ·   **Severity:** info

Looks up the provider's network tier classification from the provider\_network\_tier\_table using the claim's provider ID as the key. Runs in parallel with the fraud signal table check (nodes 5 and 6). The result (IN\_NETWORK, OUT\_OF\_NETWORK, or GAP) is critical for the final STP gate decision.

| INPUTS Fact / Field Type claim.providerId String — must be non-null  |
| :---- |

| CONDITIONS (IF) IF ALL of:   claim.providerId  IS\_NOT\_NULL |
| :---- |

| ACTIONS (THEN) →  LOOKUP  provider\_network\_tier\_table  using claim.providerId  →  provider.networkTier →  ADD\_MESSAGE  showing network tier classification result |
| :---- |

| WORKED EXAMPLE — claims\_provider\_network\_check Input: claim.providerId \= "PROV-NW-0042" Condition: providerId is not null  ✓  →  rule fires Lookup: PROV-NW-0042 → networkTier \= "IN\_NETWORK" Result: provider.networkTier \= "IN\_NETWORK" Impact: STP gate (node 11\) will check this value alongside fraud score |
| :---- |

### **claims\_stp\_decision\_gate**

**\[RULE\]**

UC-F · Claims STP Adjudication   ·   **Severity:** info

Final gate in the STP pipeline (node 11). A claim auto-approves only when all three conditions hold: fraud score is zero, the provider is in-network, and the deductible remaining is non-negative. Any failure routes the claim to a non-STP lane for human review.

| INPUTS Fact / Field Type fraud.totalScore Integer — must equal 0 provider.networkTier Enum — must equal "IN\_NETWORK" claim.deductibleRemaining Currency — must be ≥ 0 (computed: annualDeductible − deductibleUsedYTD)  |
| :---- |

| CONDITIONS (IF) IF ALL of:   fraud.totalScore          EQUALS               0   provider.networkTier      EQUALS               "IN\_NETWORK"   claim.deductibleRemaining GREATER\_THAN\_OR\_EQUAL 0 |
| :---- |

| ACTIONS (THEN) →  ASSIGN  adjudication.stpPassed \= true →  ASSIGN  claim.decisionLane \= "AUTO\_APPROVE" →  ADD\_MESSAGE  confirmation with claim ID and payable amount |
| :---- |

| EXCEPTIONS (UNLESS) Low fraud score on in-network claim (soft approval) When:  fraud.totalScore \>= 1 AND fraud.totalScore \< 20  AND  provider.networkTier \= "IN\_NETWORK" Do:       Allow STP with low fraud score — flag for post-payment audit review instead of blocking |
| :---- |

| WORKED EXAMPLE — claims\_stp\_decision\_gate Input: fraud.totalScore \= 0, provider.networkTier \= "IN\_NETWORK"        annualDeductible \= 10000, deductibleUsedYTD \= 0  →  deductibleRemaining \= 10000 All three conditions met  ✓  →  rule fires ASSIGN: stpPassed \= true, decisionLane \= "AUTO\_APPROVE" Claim processes in \< 2 seconds without human intervention |
| :---- |

### **provider\_network\_tier\_table**

**\[LOOKUP TABLE\]**

UC-F · Claims STP Adjudication

Lookup table mapping provider IDs (or provider ID patterns) to their network tier classification. Used by the provider network check rule during parallel execution in the STP pipeline.

| INPUTS Fact / Field Type providerId (key) String — can use pattern matching (e.g. prefix) networkTier (value) Enum: IN\_NETWORK | OUT\_OF\_NETWORK | GAP  |
| :---- |

| CONDITIONS (IF) PROV-NW-\*   →  IN\_NETWORK PROV-OON-\*  →  OUT\_OF\_NETWORK PROV-GAP-\*  →  GAP |
| :---- |

| ACTIONS (THEN) →  Returns networkTier for the matched provider ID |
| :---- |

| WORKED EXAMPLE — provider\_network\_tier\_table Input:   providerId \= "PROV-NW-0042" Pattern: matches PROV-NW-\* Output:  networkTier \= "IN\_NETWORK" Impact on STP: IN\_NETWORK is required for AUTO\_APPROVE. OUT\_OF\_NETWORK routes to human review. |
| :---- |

### **claims\_line\_item\_benefit\_cap\_table**

**\[TABLE\]**

UC-F · Claims STP Adjudication

First-match decision table applied per line item inside the loop node (node 9 of the STP flow). For each iteration, the table evaluates the line item's benefit code and billed amount, applies a cap if applicable, and writes the approved amount back to the line item. The loop collects all updated approvedAmount values for the final payable calculation.

| INPUTS Fact / Field Type lineItem.code Enum: ROOM\_RENT | SURGERY | PHARMACY | (wildcard) lineItem.amount Currency — checked with GREATER\_THAN operator  |
| :---- |

| CONDITIONS (IF) HIT POLICY: first\_match  (first matching row wins) Row 1: code \= "ROOM\_RENT"  AND  amount \> 10000  →  approvedAmount \= 10000, capApplied \= true Row 2: code \= "SURGERY"    AND  amount \> 50000  →  approvedAmount \= 50000, capApplied \= true Row 3: code \= "PHARMACY"   AND  amount \> 15000  →  approvedAmount \= 15000, capApplied \= true Row 4: (wildcard — all other codes)             →  approvedAmount \= lineItem.amount, capApplied \= false |
| :---- |

| ACTIONS (THEN) →  WRITE  lineItem.approvedAmount  (per-iteration output) →  WRITE  lineItem.capApplied (boolean) |
| :---- |

| WORKED EXAMPLE — claims\_line\_item\_benefit\_cap\_table Loop iteration for ROOM\_RENT:   Input: code \= "ROOM\_RENT", amount \= 12,000   Row 1 matches: amount 12,000 \> 10,000  →  approvedAmount \= 10,000, capApplied \= true Loop iteration for SURGERY:   Input: code \= "SURGERY", amount \= 30,000   Row 2: 30,000 not \> 50,000  →  skip. Row 4 (wildcard): approvedAmount \= 30,000, capApplied \= false After loop: claim.lineItems contains updated approvedAmount values Expression node: SUM(lineItems\[\*\].approvedAmount) × (1 − coPayPct/100) \= final payableAmount |
| :---- |

### **claims\_stp\_adjudication\_flow**

**\[FLOW\]**

UC-F · Claims STP Adjudication   ·   **Severity:** referral — governance: claims, audit: enhanced

The most complex flow in the validation set. Twelve nodes covering every flow node type: start, transform, rule, expression, table, subflow, loop, and end. Features a mid-flow parallel fork (fraud \+ network run simultaneously) with a wait\_all join, a conditional fraud escalation node with a when guard, a subflow fork by claim type with a default branch, a per-item loop over claim line items, and a final STP gate. Designed to auto-approve clean in-network claims in under 2 seconds.

| INPUTS Fact / Field Type claim.claimId, benefitCode, type, totalAmount, lineItems, treatmentDate, providerId Various policy.policyId, status, inceptionDate, expiryDate, annualDeductible, deductibleUsedYTD, coPayPct Various  |
| :---- |

| CONDITIONS (IF) Node 1  (start):      Claim Received Node 2  (transform):  Normalize Payload  →  ROUND\_2DP on amount, UPPERCASE on providerCode, TRIM on category   onError: stop Node 3  (rule):       Policy Eligibility Gate  →  claims\_policy\_eligibility\_gate   onError: stop (hard gate) Node 4  (expression): Compute Deductible  →  annualDeductible − deductibleUsedYTD → claim.deductibleRemaining   onError: stop Node 5  (table):      Fraud Signal Check  →  claims\_fraud\_signal\_table (collect\_all)   onError: continue Node 6  (rule):       Provider Network Classification  →  claims\_provider\_network\_check   onError: continue          ↑ Nodes 5 and 6 run SIMULTANEOUSLY (parallel fork from Node 4\)          ↑ Node 7 waits for BOTH with joinPolicy: "wait\_all" (AND-join) Node 7  (rule):       Fraud Score Threshold  →  claims\_fraud\_escalation   when: fraud.totalScore ≥ 50   onError: continue Node 8  (subflow):    Claim Type Router  →  HOSPITALIZATION→hosp\_flow | OUTPATIENT→outpatient\_flow | default→default\_flow   onError: stop Node 9  (loop):       Per-Item Benefit Cap  →  iterate claim.lineItems\[\], apply claims\_line\_item\_benefit\_cap\_table per item   onError: continue Node 10 (expression): Compute Final Payable  →  SUM(lineItems\[\*\].approvedAmount) × (1 − coPayPct/100) → claim.payableAmount   onError: stop Node 11 (rule):       STP Auto-Approve Gate  →  claims\_stp\_decision\_gate   onError: continue Node 12 (end):        Adjudication Complete |
| :---- |

| ACTIONS (THEN) →  Produces: claim.decisionLane, claim.approvedAmount, claim.payableAmount, fraud.totalScore, provider.networkTier, adjudication.stpPassed |
| :---- |

| WORKED EXAMPLE — claims\_stp\_adjudication\_flow Clean claim scenario (should AUTO\_APPROVE):   policy.status \= ACTIVE, benefitCode \= HOSPITALIZATION, providerId \= PROV-NW-0042   annualDeductible \= 10000, deductibleUsedYTD \= 0, coPayPct \= 10%   lineItems: \[ROOM\_RENT ₹8000, SURGERY ₹30000, PHARMACY ₹7000\]   No fraud signals (ratio 1.2, LOW risk, policy age 16 months, no doc mismatch)   Node 2: normalise  ✓   Node 3: policy ACTIVE, benefitCode present, date in range  →  eligible \= true   Node 4: deductibleRemaining \= 10000 − 0 \= 10000   Node 5: no fraud signals fire  →  fraud.detections \= \[\]   Node 6: PROV-NW-0042  →  networkTier \= IN\_NETWORK  (parallel with Node 5\)   Node 7: fraud.totalScore \= 0, condition 0 ≥ 50 not met  →  node skipped   Node 8: type \= HOSPITALIZATION  →  hospitalisation subflow   Node 9: ROOM\_RENT ₹8000 (no cap), SURGERY ₹30000 (no cap), PHARMACY ₹7000 (no cap)   Node 10: (8000+30000+7000) × 0.90 \= ₹40,500 payableAmount   Node 11: score=0 ✓, IN\_NETWORK ✓, deductible≥0 ✓  →  AUTO\_APPROVE   Node 12: complete in \< 2 seconds |
| :---- |

# **Appendix A — Facts**

A fact is the top-level entity type that groups related fields. Each fact corresponds to a real-world object involved in an insurance decision. When authoring a condition, the author first selects a fact, then selects a field within that fact.

| Fact | Description |
| :---- | :---- |
| Member | Individual covered under a health or insurance policy. Used in eligibility, dependent age checks, and disability rules. |
| Applicant | Person applying for a new policy or rider (e.g. CI rider). Distinct from an enrolled member — underwriting fields apply here. |
| Driver | The primary driver of an insured motor vehicle. Used exclusively in motor pricing rules. |
| Claim | A request for benefit payment submitted by or on behalf of a member. The central fact in adjudication, fraud, and STP rules. |
| Policy | The insurance contract. Holds status, date bounds, deductible values, tier, claim history, and vehicle/region details. |
| Provider | The healthcare or service provider rendering the treatment. Network status determines STP eligibility. |
| Drug | A pharmaceutical requested via a claim or PA request. Formulary tier and therapeutic class drive step-therapy rules. |
| Plan | The health benefit plan design. Funding type, situs state, and deductible type affect which regulations apply. |
| Fraud | Computed fraud context for a claim. Populated by the fraud signal table and aggregator rule during claim processing. |
| Renewal | Context object for annual policy renewal. Holds trigger type, aggregated claim count, grace period status, and output tier. |
| Pricing | Computed pricing context for motor insurance. Accumulates base premium, discounts, and loadings during the orchestration flow. |

# **Appendix B — Fields**

Fields are the individual attributes of a fact used as condition inputs. Each field belongs to exactly one fact, has a defined data type, and has a specific role in one or more rules.

| Fact | Field ID | Type | Description |
| :---- | :---- | :---- | :---- |
| Member | member.age | Integer | Age of the member in years. Used in dependent age limit (\>26) and CI rider eligibility (18–60). |
| Member | member.relationship | Enum | Relationship to policyholder. Values: self, spouse, child, domestic\_partner. |
| Member | member.is\_disabled | Boolean | Whether the member has a documented disability. Enables the age-26 extension for disabled dependents. |
| Member | member.disability\_onset\_age | Integer | Age at which the disability began. Must be \< 26 to qualify for the dependent extension exception. |
| Member | member.coverage\_gap\_days | Integer | Number of days without coverage in a gap period. Used in continuity and lookback calculations. |
| Member | member.hours\_per\_week | Integer | Average working hours per week. Used in employer group eligibility rules (must be ≥ 30 for most plans). |
| Member | member.employment\_type | Enum | Employment classification. Values: w2, 1099, part\_time, full\_time. 1099 contractors may be ineligible for group plans. |
| Applicant | applicant.age | Integer | Applicant age in years. CI rider requires 18–60 inclusive. |
| Applicant | applicant.bmi | Decimal | Body Mass Index. Standard eligibility requires \< 32; borderline exception allows 32–35 with underwriting score \> 85\. |
| Applicant | applicant.medical\_score | Integer | Medical underwriting score (0–100). Score \> 85 overrides the borderline BMI gate for CI rider. |
| Applicant | applicant.is\_diabetic | Boolean | Whether the applicant is diabetic. Opens a separate eligibility branch requiring controlled HbA1c. |
| Applicant | applicant.hba1c | Decimal | Glycated haemoglobin level. Must be \< 7 for the diabetic exception branch of CI rider eligibility. |
| Applicant | applicant.smoking\_status | Enum | Smoking classification. Values: NON\_SMOKER, CURRENT\_SMOKER, RECENT\_QUITTER, EX\_SMOKER. Smokers receive 25% CI loading. |
| Driver | driver.age | Integer | Driver age in years. Drivers under 25 receive a 15% motor premium surcharge. |
| Claim | claim.benefit\_code | Enum | Type of benefit claimed. Values: HOSPITALIZATION, OUTPATIENT, MATERNITY, SURGERY, PHARMACY, DENTAL. |
| Claim | claim.treatment\_date | Date | Date of treatment. Must fall within policy.inceptionDate and policy.expiryDate. Evaluated as a fact reference, not a literal. |
| Claim | claim.service\_date | Date | Date of service rendered. Used in timely filing and days-since-service calculations. |
| Claim | claim.days\_since\_service | Integer | Computed: days elapsed since service date. Drives timely filing limits (90 days professional, 180 days institutional). |
| Claim | claim.total\_amount | Currency | Total billed amount. Used in fraud signal detection (ratio to average procedure cost). |
| Claim | claim.bill\_type | Enum | Billing classification. Values: professional, institutional, dental. Determines timely filing window. |
| Claim | claim.is\_emergency | Boolean | Whether the claim is an emergency presentation. Affects COB sequencing and network override rules. |
| Claim | claim.has\_doc\_mismatch | Boolean | Whether submitted documents do not match claim data. Triggers DOCUMENT\_MISMATCH fraud signal (35 points). |
| Claim | claim.amount\_ratio | Decimal | Ratio of claim amount to average procedure cost. Ratio \> 3 triggers HIGH\_CLAIM\_AMOUNT fraud signal (30 points). |
| Claim | claim.hospital\_risk\_tier | Enum | Risk classification of the hospital. Values: LOW, MEDIUM, HIGH, WATCHLIST. HIGH/WATCHLIST triggers fraud signal (25 points). |
| Claim | claim.provider\_id | String | Unique identifier for the treating provider. Used as key for provider\_network\_tier\_table lookup. |
| Claim | claim.line\_items | List | List of {code, amount, approvedAmount} objects. Iterated by the per-item benefit cap loop node. |
| Claim | claim.deductible\_remaining | Currency | Computed: annualDeductible − deductibleUsedYTD. Must be ≥ 0 for STP auto-approval. |
| Policy | policy.status | Enum | Current policy status. Values: ACTIVE, LAPSED, CANCELLED, PENDING. ACTIVE is required for STP eligibility. |
| Policy | policy.continuous\_months | Integer | Months of uninterrupted coverage. Must be ≥ 24 for maternity benefits to activate. |
| Policy | policy.has\_lapse | Boolean | Whether a coverage lapse occurred in the last 24 months. Blocks maternity eligibility (OR condition). |
| Policy | policy.lapse\_gap\_days | Integer | Days between lapse and reinstatement. \> 30 days triggers the waiting period reset rule. |
| Policy | policy.age\_months | Integer | Policy age in months. \< 6 months triggers EARLY\_CLAIM fraud signal (20 points). |
| Policy | policy.current\_tier | Enum | Current loyalty tier. Values: BRONZE, SILVER, GOLD, PLATINUM. Used as key in renewal\_tier\_progression\_table. |
| Policy | policy.annual\_deductible | Currency | Total annual deductible amount. Combined with deductibleUsedYTD to compute deductibleRemaining. |
| Policy | policy.deductible\_ytd | Currency | Deductible already consumed in the current plan year. |
| Policy | policy.co\_pay\_pct | Percentage | Member co-pay percentage. Applied in the STP payable amount expression: payable \= sum × (1 − coPayPct/100). |
| Policy | policy.inception\_date | Date | Policy start date. Used as lower bound in DATE\_BETWEEN eligibility check for claim treatment date. |
| Policy | policy.expiry\_date | Date | Policy end date. Used as upper bound in DATE\_BETWEEN eligibility check for claim treatment date. |
| Policy | policy.claim\_history | List | List of {year, countInPeriod} objects. SUM\_LIST aggregates countInPeriod to compute claimCountLast3Years. |
| Policy | policy.claim\_free\_years | Integer | Consecutive years without a motor claim. Key for motor\_ncb\_rate\_table lookup (0–5 → 0–50% discount). |
| Policy | policy.vehicle\_type | Enum | Motor vehicle classification. Values: Hatchback, SUV, Truck. Part of composite key for base premium lookup. |
| Policy | policy.region | Enum | Geographic zone. Values: Metro, Tier-2. Part of composite key for base premium lookup. |
| Provider | provider.network\_status | Enum | Whether the provider is contracted with the plan. Values: in\_network, out\_of\_network, gap. |
| Provider | provider.specialty | String | Clinical specialty. Psychiatrists in qualifying states are exempt from step-therapy requirements. |
| Provider | provider.network\_tier | Enum | Output of provider\_network\_tier\_table lookup. Values: IN\_NETWORK, OUT\_OF\_NETWORK, GAP. IN\_NETWORK required for AUTO\_APPROVE. |
| Drug | drug.formulary\_tier | Integer | Drug formulary tier (1 \= preferred, higher \= less preferred). Tier ≥ 3 triggers PA requirement. |
| Drug | drug.requires\_pa | Boolean | Whether the drug has a prior authorisation requirement. Must be true for step-therapy rule to fire. |
| Drug | drug.therapeutic\_class | String | Drug class (e.g. antidepressant). Used as fallback condition in the step-therapy PA rule. |
| Drug | drug.is\_generic | Boolean | Whether the drug is a generic formulation. Affects formulary tier assignment. |
| Plan | plan.funding\_type | Enum | How the plan is funded. Values: fully\_insured, self\_funded, level\_funded. Determines which state mandates apply. |
| Plan | plan.situs\_state | String | State where the plan is domiciled. Used in step-therapy state override exception. |
| Plan | plan.deductible\_type | Enum | Plan deductible design. Values: embedded, aggregate, hdhp. HDHP plans have IRS HSA embedded deductible restrictions. |
| Plan | plan.group\_size | Integer | Number of employees in the employer group. Affects MSP sequencing and small-group rating rules. |
| Fraud | fraud.detections | List | Populated by fraud\_signal\_table. Each item: {signal: string, points: integer}. SUM\_LIST aggregates to totalScore. |
| Fraud | fraud.total\_score | Integer | Computed by fraud\_score\_aggregator via SUM\_LIST. Score ≥ 50 triggers escalation and REVIEW lane. |
| Renewal | renewal.trigger\_type | Enum | What triggered the renewal evaluation. Values: ANNUAL\_RENEWAL, MID\_TERM, EARLY\_RENEWAL. Must be ANNUAL\_RENEWAL for aggregator to fire. |
| Renewal | renewal.claim\_count | Integer | Computed: SUM of claimHistory\[\*\].countInPeriod. Drives upgrade (= 0\) or loading (\> 2\) branch. |
| Renewal | renewal.grace\_expired | Boolean | Whether the renewal grace period has lapsed. True prevents auto-upgrade even with zero claims. |
| Renewal | renewal.base\_premium | Currency | Base renewal premium before loading or discount. 20% loading applied if claimCount \> 2\. |
| Renewal | renewal.next\_tier | Enum | Output: next policy tier from tier\_progression\_table. Assigned on zero-claim auto-upgrade. |
| Pricing | pricing.base\_premium | Currency | Output of motor\_base\_premium\_lookup\_rule. Starting point for all discount and loading calculations. |
| Pricing | pricing.ncb\_discount\_pct | Percentage | Output of motor\_ncb\_lookup\_rule. Percentage discount for claim-free years (0–50%). |
| Pricing | pricing.discounted\_premium | Currency | Computed: basePremium × (1 − ncbDiscountPct/100). Computed by expression node 4 in pricing flow. |
| Pricing | pricing.loading\_reasons | List\<String\> | Audit list of loading reason codes applied (e.g. YOUNG\_DRIVER\_SURCHARGE\_15PCT). |

# **Appendix C — Operators**

Operators define the comparison logic within a condition. The valid operators for a condition row depend on the data type of the selected field. Date fields expose DATE\_BETWEEN and DATE\_AFTER; boolean fields expose IS\_TRUE and IS\_FALSE; lists expose IS\_EMPTY and IS\_NOT\_EMPTY.

| Operator | Description |
| :---- | :---- |
| **EQUALS** | Exact equality match. Applies to strings, numbers, booleans, and enums. Case-sensitive for strings. |
| **NOT\_EQUALS** | Exact inequality. True when the field value does not match the specified value. |
| **LESS\_THAN** | Strict numeric or date comparison. True when field \< value. Not inclusive of the boundary. |
| **GREATER\_THAN** | Strict numeric or date comparison. True when field \> value. Not inclusive of the boundary. |
| **LESS\_THAN\_OR\_EQUAL** | Numeric or date comparison including the boundary. True when field ≤ value. |
| **GREATER\_THAN\_OR\_EQUAL** | Numeric or date comparison including the boundary. True when field ≥ value. Used in fraud escalation (score ≥ 50). |
| **BETWEEN** | Inclusive range check. True when lower ≤ field ≤ upper. Both bounds can be literals or fact references. |
| **IN** | Membership test. True when the field value appears in a specified list of values. Used for smoking status and hospital risk tier. |
| **NOT\_IN** | Exclusion test. True when the field value does not appear in the specified list. |
| **IS\_NULL** | Nullity check. True when the field has no value assigned. |
| **IS\_NOT\_NULL** | Presence check. True when the field has any value assigned. Used to gate lookup rules. |
| **IS\_EMPTY** | Collection or string emptiness check. True when a list has zero elements or a string has zero length. |
| **IS\_NOT\_EMPTY** | Collection presence check. True when a list has one or more elements. Used to gate the fraud score aggregator. |
| **CONTAINS** | Substring match for strings. True when the field value contains the specified substring. |
| **STARTS\_WITH** | Prefix match for strings. True when the field value begins with the specified prefix. |
| **DATE\_BETWEEN** | Date range check. True when date falls on or between two date bounds. Uniquely, both bounds can be fact references (field paths) rather than literal dates. Used in maternity waiting period and STP eligibility checks. |
| **DATE\_AFTER** | Date comparison. True when the field date is strictly after the specified date. |
| **DATE\_BEFORE** | Date comparison. True when the field date is strictly before the specified date. |
| **MATCHES\_PATTERN** | Regular expression match. True when the field value matches the specified regex pattern. Available for extension; not exercised in the current six use cases. |

# **Appendix D — Output Actions**

Actions define what happens when a rule's conditions are satisfied. Multiple actions can be attached to a single rule and execute in the order listed. Actions can write to fact fields, append to lists, generate messages, create tasks, or evaluate expressions.

| Action | Description |
| :---- | :---- |
| **ASSIGN** | Sets a specific field to a given scalar value. The most common action. Example: ASSIGN claim.eligible \= true. |
| **ADD\_TO\_LIST** | Appends a value to a list field without replacing existing items. Used to accumulate rejection reason codes, loading reason codes, and fraud signal objects. |
| **ADD\_MESSAGE** | Generates a human-readable message from a template, interpolating referenced fact field values. Used in all rules for audit messages and member-facing notifications. |
| **LOOKUP** | Queries a named lookup table or decision table by key and writes the matched value to an output field. Supports single keys and composite keys joined by a delimiter (e.g. vehicleType|region). |
| **APPLY\_PERCENTAGE** | Multiplies a numeric field by (1 \+ pct/100) for surcharges or (1 − pct/100) for discounts, then writes the result back to the same field. Used for the 15% young driver surcharge, 25% CI smoker loading, and 20% renewal loading. |
| **MULTIPLY** | Multiplies a numeric field by a scalar factor and writes the result back. Used to double the CI rider waiting period for smokers: waitingPeriodMonths × 2\. |
| **SUM\_LIST** | Iterates a collection field, extracts a named sub-field (itemField) from each object in the list, sums the extracted values, and writes the scalar result to a target field. Used in fraud score aggregation (sum points from detections) and renewal claim count aggregation (sum countInPeriod from claimHistory). |
| **CREATE\_TASK** | Creates an operational task of a specified type in the external workflow system. Used in fraud escalation to create a FRAUD\_INVESTIGATION task carrying the claim ID, score, and signal list. |
| **EXPRESSION (inline)** | Evaluates an arithmetic formula written as a string and assigns the result to a target field. Formulas can reference multiple fact fields. Examples: basePremium × (1 − ncbDiscountPct/100), annualDeductible − deductibleUsedYTD, SUM(lineItems\[\*\].approvedAmount) × (1 − coPayPct/100). |
| **TRANSFORM** | Normalises raw field values using named transformation functions before rule evaluation begins. Supported functions: ROUND\_2DP (round currency to 2 decimal places), UPPERCASE (convert string to upper case), TRIM (remove leading/trailing whitespace). Used in the STP flow normalisation node. |
| **LOG** | Records a field value or message to the audit trail without modifying any fact. Used in the renewal aggregate claim count rule to log the computed count for downstream audit. |

