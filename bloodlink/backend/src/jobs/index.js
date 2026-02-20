const cron = require('node-cron');
const BloodDonation = require('../models/BloodDonation.model');
const { getIO } = require('../sockets');
const logger = require('../utils/logger');

const initCronJobs = () => {
  // Run every day at midnight - mark expired donations
  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await BloodDonation.updateMany(
        { status: 'APPROVED', isExpired: false, expiryDate: { $lte: new Date() } },
        { $set: { status: 'EXPIRED', isExpired: true } }
      );
      logger.info(`Expired ${result.modifiedCount} donations`);
    } catch (err) {
      logger.error('Expiry cron error:', err);
    }
  });

  // Run every 6 hours - alert on donations expiring within 3 days
  cron.schedule('0 */6 * * *', async () => {
    try {
      const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const expiring = await BloodDonation.find({
        status: 'APPROVED',
        isExpired: false,
        expiryDate: { $lte: threeDaysLater },
      }).populate('donor', 'name bloodGroup');

      if (expiring.length > 0) {
        const io = getIO();
        if (io) {
          io.to('admins').emit('expiry_warning', {
            count: expiring.length,
            donations: expiring.map((d) => ({
              id: d._id, bloodGroup: d.bloodGroup, expiryDate: d.expiryDate,
              donor: d.donor?.name,
            })),
          });
        }
        logger.info(`${expiring.length} donations expiring within 3 days - alert sent`);
      }
    } catch (err) {
      logger.error('Expiry alert cron error:', err);
    }
  });

  logger.info('Cron jobs initialized');
};

module.exports = { initCronJobs };
