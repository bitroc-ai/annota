import { readFile } from 'node:fs/promises';
import process from 'node:process';

const releaseVersion = process.env.RELEASE_VERSION;
if (releaseVersion === undefined) {
  console.error('RELEASE_VERSION is required.');
  process.exit(1);
}

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
if (packageJson.version !== releaseVersion) {
  console.error(
    `Release version ${releaseVersion} does not match package.json version ${String(packageJson.version)}.`
  );
  process.exit(1);
}

process.stdout.write(releaseVersion);
