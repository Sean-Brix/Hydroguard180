const prisma = require('../db');

// Get all alert levels
exports.getAllAlertLevels = async (req, res) => {
  try {
    const alertLevels = await prisma.alertLevel.findMany({
      orderBy: { level: 'asc' }
    });

    res.json(alertLevels);
  } catch (error) {
    console.error('Get all alert levels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single alert level
exports.getAlertLevelByLevel = async (req, res) => {
  try {
    const { level } = req.params;

    const alertLevel = await prisma.alertLevel.findUnique({
      where: { level: parseInt(level) }
    });

    if (!alertLevel) {
      return res.status(404).json({ error: 'Alert level not found' });
    }

    res.json(alertLevel);
  } catch (error) {
    console.error('Get alert level error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current alert level based on latest water reading
exports.getCurrentAlertLevel = async (req, res) => {
  try {
    // Get the latest water monitoring record
    const latestReading = await prisma.waterMonitoring.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    if (!latestReading) {
      return res.status(404).json({ error: 'No water monitoring data available' });
    }

    // Get the corresponding alert level
    const alertLevel = await prisma.alertLevel.findUnique({
      where: { level: latestReading.alertLevel }
    });

    res.json({
      ...alertLevel,
      currentWaterLevel: latestReading.waterLevel,
      lastUpdate: latestReading.timestamp
    });
  } catch (error) {
    console.error('Get current alert level error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update alert level
exports.updateAlertLevel = async (req, res) => {
  try {
    const { level } = req.params;
    const { name, risk, color, minWaterLevel, maxWaterLevel, description, action, protocols } = req.body;

    const alertLevel = await prisma.alertLevel.update({
      where: { level: parseInt(level) },
      data: {
        name,
        risk,
        color,
        minWaterLevel: parseFloat(minWaterLevel),
        maxWaterLevel: parseFloat(maxWaterLevel),
        description,
        action,
        protocols
      }
    });

    // Recalculate alert levels for all water monitoring records
    await recalculateAllWaterMonitoringAlertLevels();

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        userName: req.user.fullName,
        action: 'Alert Level Updated',
        target: `Alert Level ${level}`,
        details: 'Updated alert level configuration and recalculated all monitoring records'
      }
    });

    res.json(alertLevel);
  } catch (error) {
    console.error('Update alert level error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to recalculate alert levels for all water monitoring records
// NOTE: Thresholds are configured for ultrasonic sensor distance readings
// Lower distance = higher danger (Level 4: 0-40cm), Higher distance = safer (Level 1: 81-999cm)
async function recalculateAllWaterMonitoringAlertLevels() {
  try {
    console.log('Starting recalculation of all water monitoring alert levels...');
    
    // Get all alert levels
    const alertLevels = await prisma.alertLevel.findMany({
      orderBy: { level: 'asc' }
    });

    console.log('Alert levels:', alertLevels.map(a => `Level ${a.level}: ${a.minWaterLevel}-${a.maxWaterLevel}cm`));
    console.log('Note: Thresholds configured for ultrasonic sensor (lower distance = higher danger)');

    const levelsBySeverity = [...alertLevels].sort((a, b) => b.level - a.level);
    const minThreshold = Math.min(...alertLevels.map(level => level.minWaterLevel));
    const maxThreshold = Math.max(...alertLevels.map(level => level.maxWaterLevel));

    // Get all water monitoring records
    const allRecords = await prisma.waterMonitoring.findMany();
    console.log(`Found ${allRecords.length} water monitoring records to recalculate`);

    let updatedCount = 0;

    // Recalculate and update each record
    for (const record of allRecords) {
      let newAlertLevel = levelsBySeverity[levelsBySeverity.length - 1].level;
      
      // Find matching alert level based on distance
      for (const level of levelsBySeverity) {
        if (record.waterLevel >= level.minWaterLevel && record.waterLevel <= level.maxWaterLevel) {
          newAlertLevel = level.level;
          break;
        }
      }

      if (record.waterLevel < minThreshold) {
        newAlertLevel = levelsBySeverity[0].level;
      } else if (record.waterLevel > maxThreshold) {
        newAlertLevel = levelsBySeverity[levelsBySeverity.length - 1].level;
      }

      // Always update to ensure consistency
      if (record.alertLevel !== newAlertLevel) {
        await prisma.waterMonitoring.update({
          where: { id: record.id },
          data: { alertLevel: newAlertLevel }
        });
        console.log(`Updated record ${record.id}: ${record.waterLevel}cm (distance) from Level ${record.alertLevel} to Level ${newAlertLevel}`);
        updatedCount++;
      }
    }

    console.log(`Recalculation complete. Updated ${updatedCount} records.`);
  } catch (error) {
    console.error('Error in recalculateAllWaterMonitoringAlertLevels:', error);
    throw error;
  }
}

// Endpoint to manually trigger recalculation
exports.recalculateAlertLevels = async (req, res) => {
  try {
    await recalculateAllWaterMonitoringAlertLevels();

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        userName: req.user.fullName,
        action: 'Alert Levels Recalculated',
        target: 'All Water Monitoring Records',
        details: 'Manually triggered recalculation of alert levels for all monitoring records'
      }
    });

    res.json({ message: 'Alert levels recalculated successfully' });
  } catch (error) {
    console.error('Recalculate alert levels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
