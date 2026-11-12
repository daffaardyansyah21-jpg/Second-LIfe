// ============================================================================
// SECOND LIFE — Centralized Assignment Status Engine & Portfolio State Machine
// ============================================================================

                                                                            

const VALID_PORTFOLIO_TRANSITIONS                                             = {
  'Draft': ['Submitted'],
  'Submitted': ['Under School Review', 'Verified', 'Rejected'],
  'Under School Review': ['Verified', 'Rejected'],
  'Verified': ['Published', 'Rejected'],
  'Rejected': ['Draft', 'Submitted'],
  'Published': ['Verified', 'Draft']
};

export function canTransitionPortfolio(current                 , next                 )          {
  return (VALID_PORTFOLIO_TRANSITIONS[current] || []).includes(next);
}

const VALID_ASSIGNMENT_TRANSITIONS                                               = {
  'Draft': ['Submitted for Admin Review', 'Cancelled'],
  'Submitted for Admin Review': ['Approved', 'Draft', 'Cancelled'],
  'Approved': ['Published', 'Cancelled'],
  'Published': ['Student Applied', 'Cancelled', 'Expired'],
  'Student Applied': ['Teacher Approval Pending', 'Published', 'Withdrawn', 'Cancelled'],
  'Teacher Approval Pending': ['Guardian Consent Pending', 'Ready to Start', 'Published', 'Cancelled'],
  'Guardian Consent Pending': ['Ready to Start', 'Published', 'Cancelled'],
  'Ready to Start': ['In Progress', 'Withdrawn', 'Cancelled'],
  'In Progress': ['Submitted', 'Incomplete', 'Cancelled'],
  'Submitted': ['Under Review', 'Accepted', 'Revision Requested', 'Rejected'],
  'Under Review': ['Accepted', 'Revision Requested', 'Rejected'],
  'Revision Requested': ['Submitted', 'Incomplete', 'Cancelled'],
  'Accepted': ['School Verification'],
  'Rejected': ['School Verification', 'Closed'],
  'School Verification': ['Closed'],
  'Closed': [],
  'Cancelled': [],
  'Withdrawn': [],
  'Expired': [],
  'Incomplete': ['Closed']
};

export function canTransitionAssignment(current                  , next                  )          {
  return (VALID_ASSIGNMENT_TRANSITIONS[current] || []).includes(next);
}

export function getSafetyStageForAssignmentStatus(status                  )         {
  switch (status) {
    case 'Draft':
    case 'Submitted for Admin Review':
    case 'Approved':
    case 'Published':
      return 2; // Stage 2 — Assignment Creation (UMKM + Admin)
    case 'Student Applied':
    case 'Teacher Approval Pending':
    case 'Guardian Consent Pending':
    case 'Ready to Start':
      return 3; // Stage 3 — Student and Guardian Approval
    case 'In Progress':
      return 4; // Stage 4 — Supervised Work
    case 'Submitted':
    case 'Under Review':
    case 'Revision Requested':
    case 'Accepted':
    case 'Rejected':
    case 'School Verification':
      return 5; // Stage 5 — Evaluation (UMKM + School)
    case 'Closed':
    case 'Cancelled':
    case 'Withdrawn':
    case 'Expired':
    case 'Incomplete':
      return 6; // Stage 6 — Assignment Closure (Platform Admin)
    default:
      return 2;
  }
}

                                           
                                       
                                
                               
                                 
                             
                                 
                           
                                
 

export function evaluatePassportEligibility(params   
                             
                           
                             
                            
                            
                              
                          
                       
 )                           {
  const missing           = [];

  if (!params.portfolioVerified) missing.push('1. An eligible school-verified initial portfolio');
  if (!params.teacherApproved || !params.guardianConsented) {
    missing.push('2. Assignment approved through required teacher & guardian workflow');
  }
  if (!params.submissionExists) missing.push('3. Student participation and submission deliverable evidence');
  if (!params.evaluationExists) missing.push('4. Structured UMKM evaluation record');
  if (!params.schoolVerified) missing.push('5. Required school/teacher verification of final evidence');
  if (!params.adminClosed) missing.push('6. Proper assignment closure by Platform Administrator');

  return {
    eligibleForVerifiedPassport: missing.length === 0 && params.evaluationAccepted,
    hasEligiblePortfolio: params.portfolioVerified,
    hasApprovedWorkflow: params.teacherApproved && params.guardianConsented,
    hasSubmissionEvidence: params.submissionExists,
    hasUmkmEvaluation: params.evaluationExists,
    hasSchoolVerification: params.schoolVerified,
    hasAdminClosure: params.adminClosed,
    missingRequirements: missing
  };
}
