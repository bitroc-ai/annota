import process from 'node:process';

const identifier = '(?:0|[1-9][0-9]*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)';
const strictReleaseVersion = new RegExp(
  `^(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)\\.(?:0|[1-9][0-9]*)(?:-${identifier}(?:\\.${identifier})*)?$`
);

const candidate = process.env.RELEASE_VERSION_CANDIDATE;
if (candidate === undefined) {
  console.error('RELEASE_VERSION_CANDIDATE is required.');
  process.exit(1);
}

if (!strictReleaseVersion.test(candidate)) {
  console.error(
    'Release version must be strict SemVer without build metadata; prerelease identifiers are supported.'
  );
  process.exit(1);
}

process.stdout.write(candidate);
