const prisma = require('../db');
const waterMonitoringEmitter = require('../utils/eventEmitter');

function buildTimestampFilter({ startDate, endDate, days }) {
  if (startDate || endDate) {
    const timestamp = {};
    if (startDate) timestamp.gte = new Date(startDate);
    if (endDate) timestamp.lte = new Date(endDate);
    return Object.keys(timestamp).length ? { timestamp } : {};
  }

  if (days !== undefined) {
    const parsedDays = Number.parseInt(days, 10);
    if (!Number.isNaN(parsedDays) && parsedDays > 0) {
      const timestamp = new Date();
      timestamp.setDate(timestamp.getDate() - parsedDays);
      return { timestamp: { gte: timestamp } };
    }
  }

  return {};
}

// Helper function to determine alert level based on distance reading from ultrasonic sensor
// NOTE: Ultrasonic sensor measures DISTANCE from sensor to water surface
// - Lower distance (cm) = Water is CLOSER to sensor = HIGHER water level = MORE DANGER (Level 4: 0-40cm)
// - Higher distance (cm) = Water is FARTHER from sensor = LOWER water level = SAFER (Level 1: 81-999cm)
// Thresholds in database are configured for ultrasonic sensor distance readings
async function calculateAlertLevel(distance) {
  const alertLevels = await prisma.alertLevel.findMany({
    orderBy: { level: 'asc' }
  });

  // Prioritize higher severity on boundary overlaps (Level 4 before Level 1).
  const levelsBySeverity = [...alertLevels].sort((a, b) => b.level - a.level);

  // Find the matching alert level based on distance
  for (const level of levelsBySeverity) {
    if (distance >= level.minWaterLevel && distance <= level.maxWaterLevel) {
      return level.level;
    }
  }

  const minThreshold = Math.min(...alertLevels.map(level => level.minWaterLevel));
  const maxThreshold = Math.max(...alertLevels.map(level => level.maxWaterLevel));

  if (distance < minThreshold) {
    return levelsBySeverity[0].level;
  }

  if (distance > maxThreshold) {
    return levelsBySeverity[levelsBySeverity.length - 1].level;
  }

  // Fallback to safest level for any unexpected gaps in configuration.
  return levelsBySeverity[levelsBySeverity.length - 1].level;
}

// Get all water monitoring records
exports.getAllWaterMonitoring = async (req, res) => {
  try {
    const { limit = 100, offset = 0, startDate, endDate } = req.query;
    const take = Number.parseInt(limit, 10) || 100;
    const skip = Number.parseInt(offset, 10) || 0;
    const where = buildTimestampFilter({ startDate, endDate });

    const records = await prisma.waterMonitoring.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take,
      skip,
    });

    const total = await prisma.waterMonitoring.count({ where });

    res.json({
      data: records,
      pagination: {
        total,
        limit: take,
        offset: skip,
      },
    });
  } catch (error) {
    console.error('Get all water monitoring error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single water monitoring record
exports.getWaterMonitoringById = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await prisma.waterMonitoring.findUnique({
      where: { id }
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json(record);
  } catch (error) {
    console.error('Get water monitoring error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get latest water monitoring record
exports.getLatestWaterMonitoring = async (req, res) => {
  try {
    const record = await prisma.waterMonitoring.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    if (!record) {
      return res.status(404).json({ error: 'No monitoring data available' });
    }

    res.json(record);
  } catch (error) {
    console.error('Get latest water monitoring error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create water monitoring record (authenticated)
exports.createWaterMonitoring = async (req, res) => {
  try {
    const { waterLevel, waterLevelUnit, rainfallIndicator, deviceStatus, notes } = req.body;

    if (!waterLevel) {
      return res.status(400).json({ error: 'Water level is required' });
    }

    const waterLevelValue = parseFloat(waterLevel);
    
    // Automatically calculate alert level based on water level
    const alertLevel = await calculateAlertLevel(waterLevelValue);

    const record = await prisma.waterMonitoring.create({
      data: {
        waterLevel: waterLevelValue,
        waterLevelUnit: waterLevelUnit || 'cm',
        alertLevel: alertLevel,
        rainfallIndicator: rainfallIndicator || 'None',
        deviceStatus: deviceStatus || 'Online',
        notes: notes || ''
      }
    });

    // Emit SSE event for real-time updates
    waterMonitoringEmitter.emit('new-record', record);

    res.status(201).json(record);
  } catch (error) {
    console.error('Create water monitoring error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create water monitoring record from ESP32 device (unauthenticated)
exports.createFromDevice = async (req, res) => {
  try {
    const { deviceId, waterLevel, waterLevelUnit, rainfallIndicator } = req.body;

    // Verify device ID
    if (deviceId !== 'hydro-001') {
      return res.status(401).json({ error: 'Invalid device ID' });
    }

    if (!waterLevel) {
      return res.status(400).json({ error: 'Water level is required' });
    }

    const waterLevelValue = parseFloat(waterLevel);
    
    // Automatically calculate alert level based on water level
    const alertLevel = await calculateAlertLevel(waterLevelValue);

    const record = await prisma.waterMonitoring.create({
      data: {
        waterLevel: waterLevelValue,
        waterLevelUnit: waterLevelUnit || 'cm',
        alertLevel: alertLevel,
        rainfallIndicator: rainfallIndicator || 'None',
        deviceStatus: 'Online',
        notes: 'Auto-created from ESP32 device'
      }
    });

    // Emit SSE event for real-time updates
    waterMonitoringEmitter.emit('new-record', record);

    res.status(201).json({ 
      success: true,
      message: 'Water level recorded successfully',
      data: record 
    });
  } catch (error) {
    console.error('Device water monitoring error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update water monitoring record
exports.updateWaterMonitoring = async (req, res) => {
  try {
    const { id } = req.params;
    const { waterLevel, waterLevelUnit, rainfallIndicator, deviceStatus, notes } = req.body;

    const updateData = {};

    // If water level is updated, recalculate alert level
    if (waterLevel !== undefined) {
      const waterLevelValue = parseFloat(waterLevel);
      updateData.waterLevel = waterLevelValue;
      updateData.alertLevel = await calculateAlertLevel(waterLevelValue);
    }

    if (waterLevelUnit !== undefined) updateData.waterLevelUnit = waterLevelUnit;
    if (rainfallIndicator !== undefined) updateData.rainfallIndicator = rainfallIndicator;
    if (deviceStatus !== undefined) updateData.deviceStatus = deviceStatus;
    if (notes !== undefined) updateData.notes = notes;

    const record = await prisma.waterMonitoring.update({
      where: { id },
      data: updateData
    });

    res.json(record);
  } catch (error) {
    console.error('Update water monitoring error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete water monitoring record
exports.deleteWaterMonitoring = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.waterMonitoring.delete({
      where: { id }
    });

    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    console.error('Delete water monitoring error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get statistics
exports.getWaterMonitoringStats = async (req, res) => {
  try {
    const { days, startDate, endDate } = req.query;
    const where = buildTimestampFilter({ days, startDate, endDate });

    const [aggregates, groupedAlerts] = await Promise.all([
      prisma.waterMonitoring.aggregate({
        where,
        _count: { _all: true },
        _avg: { waterLevel: true },
        _max: { waterLevel: true },
        _min: { waterLevel: true },
      }),
      prisma.waterMonitoring.groupBy({
        by: ['alertLevel'],
        where,
        _count: { _all: true },
      }),
    ]);

    const alertDistribution = groupedAlerts.reduce((distribution, item) => {
      distribution[item.alertLevel] = item._count._all;
      return distribution;
    }, {});

    res.json({
      totalReadings: aggregates._count._all,
      averageWaterLevel: aggregates._avg.waterLevel ?? 0,
      maxWaterLevel: aggregates._max.waterLevel ?? 0,
      minWaterLevel: aggregates._min.waterLevel ?? 0,
      alertDistribution,
    });
  } catch (error) {
    console.error('Get water monitoring stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
