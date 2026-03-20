const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRecalculation() {
  console.log('🔄 Testing alert level recalculation...\n');

  try {
    // Get current alert levels
    const alertLevels = await prisma.alertLevel.findMany({
      orderBy: { level: 'asc' }
    });

    console.log('📊 Current Alert Level Thresholds:');
    alertLevels.forEach(a => {
      console.log(`   Level ${a.level}: ${a.minWaterLevel}-${a.maxWaterLevel}cm - ${a.name}`);
    });
    console.log('');

    // Get all water monitoring records
    const allRecords = await prisma.waterMonitoring.findMany({
      orderBy: { waterLevel: 'asc' }
    });

    console.log(`📝 Found ${allRecords.length} water monitoring records\n`);

    console.log('🔍 Checking each record:');
    console.log('━'.repeat(80));

    const levelsBySeverity = [...alertLevels].sort((a, b) => b.level - a.level);
    const minThreshold = Math.min(...alertLevels.map(level => level.minWaterLevel));
    const maxThreshold = Math.max(...alertLevels.map(level => level.maxWaterLevel));

    let correctCount = 0;
    let incorrectCount = 0;
    const recordsToUpdate = [];

    for (const record of allRecords) {
      let correctLevel = levelsBySeverity[levelsBySeverity.length - 1].level;
      
      for (const level of levelsBySeverity) {
        if (record.waterLevel >= level.minWaterLevel && record.waterLevel <= level.maxWaterLevel) {
          correctLevel = level.level;
          break;
        }
      }

      if (record.waterLevel < minThreshold) {
        correctLevel = levelsBySeverity[0].level;
      } else if (record.waterLevel > maxThreshold) {
        correctLevel = levelsBySeverity[levelsBySeverity.length - 1].level;
      }

      const isCorrect = record.alertLevel === correctLevel;
      const status = isCorrect ? '✅' : '❌';
      
      console.log(`${status} ID: ${record.id.padEnd(8)} | Water: ${String(record.waterLevel).padEnd(3)}cm | Current Level: ${record.alertLevel} | Should be: ${correctLevel}`);

      if (!isCorrect) {
        incorrectCount++;
        recordsToUpdate.push({
          id: record.id,
          waterLevel: record.waterLevel,
          currentLevel: record.alertLevel,
          correctLevel: correctLevel
        });
      } else {
        correctCount++;
      }
    }

    console.log('━'.repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Correct: ${correctCount}`);
    console.log(`   ❌ Incorrect: ${incorrectCount}`);

    if (incorrectCount > 0) {
      console.log(`\n🔧 Fixing ${incorrectCount} incorrect records...\n`);
      
      for (const record of recordsToUpdate) {
        await prisma.waterMonitoring.update({
          where: { id: record.id },
          data: { alertLevel: record.correctLevel }
        });
        console.log(`   ✅ Updated record ${record.id}: ${record.waterLevel}cm from Level ${record.currentLevel} → Level ${record.correctLevel}`);
      }

      console.log(`\n✨ Successfully updated ${incorrectCount} records!`);
    } else {
      console.log('\n✨ All records are correctly categorized!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRecalculation();
