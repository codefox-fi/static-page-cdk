import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import type { Construct } from 'constructs';

export interface CertificateStackProps extends StackProps {
  domainName: string;
  hostedZoneId: string;
}

export class CertificateStack extends Stack {
  public readonly certificate: Certificate;
  
  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, {...props, env: { region: "us-east-1" } });

    const { domainName, hostedZoneId } = props;
    const hostedZone = HostedZone.fromHostedZoneAttributes(this, "HostedZone", { hostedZoneId, zoneName: domainName });
    this.certificate = new Certificate(this, "Certificate", { domainName, validation: CertificateValidation.fromDns(hostedZone) });

    const description = "The ARN of the certificate in us-east-1 for CloudFront";
    new CfnOutput(this, "CertificateArn", { value: this.certificate.certificateArn, description });
  }
}
