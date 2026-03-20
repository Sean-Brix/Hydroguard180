const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const users = require('../../src/database/users.json');
const residents = require('../../src/database/residents.json');
const alertLevels = require('../../src/database/alert-levels.json');
const waterMonitoring = require('../../src/database/water-monitoring.json');
const settingsData = require('../../src/database/settings.json');
const auditLogs = require('../../src/database/audit-logs.json');

const DEFAULT_ALERT_THRESHOLDS = {
  1: { minWaterLevel: 80, maxWaterLevel: 999 },
  2: { minWaterLevel: 60, maxWaterLevel: 80 },
  3: { minWaterLevel: 40, maxWaterLevel: 60 },
  4: { minWaterLevel: 0, maxWaterLevel: 40 }
};

function calculateAlertLevelForSeed(waterLevel, levels) {
  const levelsBySeverity = [...levels].sort((a, b) => b.level - a.level);
  const minThreshold = Math.min(...levels.map(level => level.minWaterLevel));
  const maxThreshold = Math.max(...levels.map(level => level.maxWaterLevel));

  for (const level of levelsBySeverity) {
    if (waterLevel >= level.minWaterLevel && waterLevel <= level.maxWaterLevel) {
      return level.level;
    }
  }

  if (waterLevel < minThreshold) return levelsBySeverity[0].level;
  if (waterLevel > maxThreshold) return levelsBySeverity[levelsBySeverity.length - 1].level;

  return levelsBySeverity[levelsBySeverity.length - 1].level;
}

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.waterMonitoring.deleteMany();
    await prisma.resident.deleteMany();
    await prisma.user.deleteMany();
    await prisma.alertLevel.deleteMany();
    await prisma.settings.deleteMany();

    // Seed Alert Levels
    console.log('📊 Seeding alert levels...');
    const normalizedAlertLevels = alertLevels.map((level) => {
      const threshold = DEFAULT_ALERT_THRESHOLDS[level.level];
      return {
        ...level,
        minWaterLevel: threshold ? threshold.minWaterLevel : level.minWaterLevel,
        maxWaterLevel: threshold ? threshold.maxWaterLevel : level.maxWaterLevel
      };
    });

    for (const level of normalizedAlertLevels) {
      await prisma.alertLevel.create({
        data: {
          level: level.level,
          name: level.name,
          risk: level.risk,
          color: level.color,
          minWaterLevel: level.minWaterLevel,
          maxWaterLevel: level.maxWaterLevel,
          description: level.description,
          action: level.action,
          protocols: level.protocols
        }
      });
    }
    console.log(`✅ Created ${normalizedAlertLevels.length} alert levels`);

    // Seed Users (with hashed passwords)
    console.log('👥 Seeding users...');
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await prisma.user.create({
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          password: hashedPassword,
          role: user.role,
          fullName: user.fullName,
          status: user.status,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      });
    }
    console.log(`✅ Created ${users.length} users`);

    // Seed Residents
    console.log('🏘️ Seeding residents...');
    for (const resident of residents) {
      await prisma.resident.create({
        data: {
          id: resident.id,
          residentName: resident.residentName,
          address: resident.address,
          contactNumber: resident.contactNumber,
          emergencyContact: resident.emergencyContact,
          householdCount: resident.householdCount,
          notes: resident.notes || '',
          status: resident.status,
          createdAt: new Date(resident.createdAt),
          updatedAt: new Date(resident.updatedAt)
        }
      });
    }
    console.log(`✅ Created ${residents.length} residents`);

    // Seed Water Monitoring
    console.log('💧 Seeding water monitoring data...');
    for (const reading of waterMonitoring) {
      const computedAlertLevel = calculateAlertLevelForSeed(reading.waterLevel, normalizedAlertLevels);

      await prisma.waterMonitoring.create({
        data: {
          id: reading.id,
          timestamp: new Date(reading.timestamp),
          waterLevel: reading.waterLevel,
          waterLevelUnit: reading.waterLevelUnit,
          alertLevel: computedAlertLevel,
          rainfallIndicator: reading.rainfallIndicator,
          deviceStatus: reading.deviceStatus,
          notes: reading.notes || ''
        }
      });
    }
    console.log(`✅ Created ${waterMonitoring.length} water monitoring records`);

    // Seed Settings
    console.log('⚙️ Seeding settings...');
    await prisma.settings.create({
      data: {
        systemName: settingsData.systemName,
        barangay: settingsData.barangay,
        city: settingsData.city,
        logo: settingsData.logo,
        primaryColor: settingsData.primaryColor,
        secondaryColor: settingsData.secondaryColor,
        contact: settingsData.contact,
        alertsEnabled: settingsData.alertsEnabled,
        sensors: settingsData.sensors,
        calibration: settingsData.calibration
      }
    });
    console.log('✅ Created settings');

    // Seed Audit Logs
    console.log('📝 Seeding audit logs...');
    for (const log of auditLogs) {
      await prisma.auditLog.create({
        data: {
          id: log.id,
          timestamp: new Date(log.timestamp),
          userId: log.userId,
          userName: log.userName,
          action: log.action,
          target: log.target,
          details: log.details
        }
      });
    }
    console.log(`✅ Created ${auditLogs.length} audit logs`);

    console.log('✨ Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Alert Levels: ${alertLevels.length}`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Residents: ${residents.length}`);
    console.log(`   - Water Monitoring: ${waterMonitoring.length}`);
    console.log(`   - Audit Logs: ${auditLogs.length}`);
    console.log(`   - Settings: 1`);
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Super Admin:');
    console.log('     Username: superadmin');
    console.log('     Password: Admin@123');
    console.log('   Admin:');
    console.log('     Username: admin');
    console.log('     Password: Admin@123');
    console.log('   Staff:');
    console.log('     Username: staff');
    console.log('     Password: Staff@123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
