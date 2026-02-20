// Blood compatibility mapping - SERVER-SIDE ONLY
const COMPATIBILITY = {
  'A+':  { canDonateTo: ['A+', 'AB+'], canReceiveFrom: ['A+', 'A-', 'O+', 'O-'] },
  'A-':  { canDonateTo: ['A+', 'A-', 'AB+', 'AB-'], canReceiveFrom: ['A-', 'O-'] },
  'B+':  { canDonateTo: ['B+', 'AB+'], canReceiveFrom: ['B+', 'B-', 'O+', 'O-'] },
  'B-':  { canDonateTo: ['B+', 'B-', 'AB+', 'AB-'], canReceiveFrom: ['B-', 'O-'] },
  'AB+': { canDonateTo: ['AB+'], canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
  'AB-': { canDonateTo: ['AB+', 'AB-'], canReceiveFrom: ['A-', 'B-', 'AB-', 'O-'] },
  'O+':  { canDonateTo: ['A+', 'B+', 'AB+', 'O+'], canReceiveFrom: ['O+', 'O-'] },
  'O-':  { canDonateTo: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], canReceiveFrom: ['O-'] },
};

/**
 * Get compatible donor blood groups for a given recipient blood group
 */
const getCompatibleDonors = (recipientBloodGroup) => {
  const compat = COMPATIBILITY[recipientBloodGroup];
  if (!compat) throw new Error(`Invalid blood group: ${recipientBloodGroup}`);
  return compat.canReceiveFrom;
};

/**
 * Check if a donor blood group is compatible with a recipient blood group
 */
const isCompatible = (donorBloodGroup, recipientBloodGroup) => {
  const compatibleDonors = getCompatibleDonors(recipientBloodGroup);
  return compatibleDonors.includes(donorBloodGroup);
};

/**
 * Check if donor is eligible (90-day gap since last donation)
 */
const isDonorEligibleByDate = (lastDonationDate) => {
  if (!lastDonationDate) return true;
  const daysSince = (Date.now() - new Date(lastDonationDate).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= 90;
};

module.exports = { COMPATIBILITY, getCompatibleDonors, isCompatible, isDonorEligibleByDate };
