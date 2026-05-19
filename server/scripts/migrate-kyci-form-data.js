#!/usr/bin/env node
'use strict';

/**
 * One-off migration: Cumplimiento Individual drafts saved with legacy Fondos keys
 * (companyName, beneficiaryName, custody*, etc.) → KYCI keys (firstName, lastName, …).
 *
 * SAFETY (Railway / production)
 * ───────────────────────────
 * 1. This script is MANUAL only — it is NOT wired into `npm start` or deploy hooks.
 * 2. Always run --dry-run first against the target DATABASE_URL.
 * 3. Take a DB backup (Railway → Postgres → Backups) before applying.
 * 4. From your machine with prod credentials:
 *      set DATABASE_URL=postgres://...
 *      cd server
 *      node scripts/migrate-kyci-form-data.js --dry-run
 * 5. On Railway shell (Variables already set):
 *      cd server && node scripts/migrate-kyci-form-data.js --dry-run
 *      cd server && node scripts/migrate-kyci-form-data.js
 * 6. Re-run --dry-run after apply; counts for "would migrate" should be 0.
 *
 * Usage:
 *   node server/scripts/migrate-kyci-form-data.js [--dry-run] [--verbose]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sequelize } = require('../config/db');
const FormData = require('../models/FormData');
const {
  isKyciFormType,
  needsKyciDataMigration,
  migrateLegacyKyciData,
} = require('../utils/kyciFormDataMigration');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const verbose = args.has('--verbose');

async function findKyciForms() {
  const rows = await FormData.findAll({
    order: [['updatedAt', 'ASC']],
  });
  return rows.filter((row) => isKyciFormType(row.formType));
}

async function main() {
  const stats = {
    kyciForms: 0,
    legacyDetected: 0,
    migrated: 0,
    skippedAlreadyKyci: 0,
    unchanged: 0,
    errors: 0,
  };

  console.log(`KYCI form-data migration ${dryRun ? '(DRY RUN)' : '(APPLY)'}`);
  console.log('─'.repeat(50));

  try {
    await sequelize.authenticate();
  } catch (err) {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  }

  const forms = await findKyciForms();
  stats.kyciForms = forms.length;
  console.log(`Cumplimiento Individual forms found: ${stats.kyciForms}`);

  for (const form of forms) {
    const data = form.data;
    if (!needsKyciDataMigration(data)) {
      if (verbose) {
        console.log(`  skip ${form.id} — no legacy markers or already has KYCI identity`);
      }
      stats.skippedAlreadyKyci += 1;
      continue;
    }

    stats.legacyDetected += 1;

    try {
      const { data: nextData, migrated, notes } = migrateLegacyKyciData(data);

      if (!migrated) {
        stats.unchanged += 1;
        if (verbose) console.log(`  unchanged ${form.id}`);
        continue;
      }

      if (verbose) {
        console.log(`  ${dryRun ? 'would update' : 'update'} ${form.id} (${form.formType})`);
        notes.forEach((n) => console.log(`    · ${n}`));
      } else {
        console.log(
          `  ${dryRun ? 'would update' : 'update'} ${form.id} — ${notes.length} field(s)`
        );
      }

      if (!dryRun) {
        await form.update({ data: nextData });
      }
      stats.migrated += 1;
    } catch (err) {
      stats.errors += 1;
      console.error(`  error ${form.id}:`, err.message);
    }
  }

  console.log('─'.repeat(50));
  console.log('Summary:');
  console.log(`  KYCI forms total:     ${stats.kyciForms}`);
  console.log(`  Legacy detected:      ${stats.legacyDetected}`);
  console.log(`  ${dryRun ? 'Would migrate' : 'Migrated'}:        ${stats.migrated}`);
  console.log(`  Skipped (no legacy):  ${stats.skippedAlreadyKyci}`);
  console.log(`  Unchanged:            ${stats.unchanged}`);
  console.log(`  Errors:               ${stats.errors}`);

  if (dryRun && stats.migrated > 0) {
    console.log('\nRe-run without --dry-run to apply changes.');
  }

  await sequelize.close();
  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
