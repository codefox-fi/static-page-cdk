#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import { StaticPageCdkStack } from '../lib/static-page-cdk-stack';
import { CertificateStack } from '../lib/certificate-stack';

const app = new cdk.App();

const domainName = app.node.tryGetContext('domainName');
const hostedZoneId = app.node.tryGetContext('hostedZoneId');

if (!domainName || !hostedZoneId) {
  throw new Error('Domain name and hosted zone ID must be provided in the context');
}

const certificateStack = new CertificateStack(app, 'StaticPageCertificateStack', {
  domainName,
  hostedZoneId
});

// Create the main stack (can be in any region)
const mainStack = new StaticPageCdkStack(app, 'StaticPageCdkStack', {
  env: app.node.tryGetContext('region') ? { region: app.node.tryGetContext('region') } : undefined,
  crossRegionReferences: true,
  certificateArn: certificateStack.certificate.certificateArn
});
