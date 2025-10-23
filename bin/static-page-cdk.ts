#!/usr/bin/env node

import * as cdk from 'aws-cdk-lib';
import { CertificateStack } from '../lib/certificate-stack';
import { StaticPageCdkStack } from '../lib/static-page-cdk-stack';

const app = new cdk.App();

const domainName = app.node.tryGetContext('domainName');
const region = app.node.tryGetContext('region') || 'eu-north-1';

if (!domainName || !region) {
  throw new Error("Domain name and region must be provided in the context");
}

const certificateStack = new CertificateStack(app, "StaticPageCertificateStack", {
  domainName,
  hostedZoneId: app.node.tryGetContext("hostedZoneId")
});

// Create the main stack (can be in any region)
new StaticPageCdkStack(app, "StaticPageCdkStack", {
  env: { region },
  crossRegionReferences: true,
  certificateArn: certificateStack.certificate.certificateArn
});
