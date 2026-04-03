const User = require('../models/User.model');

/**
 * Find donors near a location using MongoDB geospatial ($nearSphere)
 * Coordinates are stored silently — users only ever see plain text addresses
 *
 * @param {number} lng            - Hospital longitude
 * @param {number} lat            - Hospital latitude
 * @param {string[]} compatibleGroups - Compatible blood groups for the request
 * @param {number} radiusKm       - Search radius in kilometres (5 / 10 / 25)
 * @param {number} limit          - Max donors to return
 */
const findNearbyDonors = async (lng, lat, compatibleGroups, radiusKm = 10, limit = 20) => {
  const donors = await User.find({
    role:       'USER',
    isActive:   true,
    bloodGroup: { $in: compatibleGroups },
    // Only search donors who have a real location stored (not default [0,0])
    'location.coordinates': { $ne: [0, 0] },
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000, // metres
      },
    },
  })
    .select('name email bloodGroup address location')
    .limit(limit);

  // Attach calculated distance to each result
  return donors.map((donor) => {
    const [dLng, dLat] = donor.location.coordinates;
    const dist = haversineKm(lat, lng, dLat, dLng);
    return { donor, distance: Math.round(dist * 10) / 10 };
  });
};

/**
 * Haversine formula — straight-line distance between two lat/lng points
 * Returns distance in kilometres
 */
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const toRad = (deg) => (deg * Math.PI) / 180;

module.exports = { findNearbyDonors };
