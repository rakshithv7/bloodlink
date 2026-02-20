const User = require('../models/User.model');
const BloodDonation = require('../models/BloodDonation.model');
const { getCompatibleDonors, isDonorEligibleByDate } = require('./bloodCompatibility.service');

/**
 * Find matched donors for a blood request
 * @param {Object} request - BloodRequest document
 * @param {number} radiusKm - Search radius in km (default 20)
 */
const findMatchedDonors = async (request, radiusKm = 20) => {
  const compatibleBloodGroups = getCompatibleDonors(request.bloodGroup);
  const radiusMeters = radiusKm * 1000;

  // Find users with compatible blood groups near the request location
  const candidates = await User.find({
    role: 'USER',
    isActive: true,
    bloodGroup: { $in: compatibleBloodGroups },
    location: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: request.location.coordinates,
        },
        $maxDistance: radiusMeters,
      },
    },
  }).select('name email bloodGroup lastDonationDate location phone');

  // Filter by 90-day gap eligibility
  const eligible = candidates.filter((donor) => isDonorEligibleByDate(donor.lastDonationDate));

  // Calculate distance for each donor
  const [reqLng, reqLat] = request.location.coordinates;
  const withDistance = eligible.map((donor) => {
    const [donLng, donLat] = donor.location.coordinates;
    const dist = haversineDistance(reqLat, reqLng, donLat, donLng);
    return { donor, distance: parseFloat(dist.toFixed(2)) };
  });

  // Sort by distance ascending
  withDistance.sort((a, b) => a.distance - b.distance);

  return withDistance;
};

// Haversine formula for distance in km
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const toRad = (deg) => (deg * Math.PI) / 180;

module.exports = { findMatchedDonors };
