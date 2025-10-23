import { CfnOutput, Stack, type StackProps } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AllowedMethods, Distribution, PriceClass, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { ARecord, HostedZone, type IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import type { Construct } from 'constructs';

export interface StaticPageCdkStackProps extends StackProps {
  certificateArn?: string;
}

export class StaticPageCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StaticPageCdkStackProps) {
    super(scope, id, props);

    const domainName: string | undefined = this.node.tryGetContext("domainName");
    if (!domainName) {
      throw new Error('Domain name must be provided in the context');
    }

    const hostedZoneId: string | undefined = this.node.tryGetContext("hostedZoneId");
    let hostedZone: IHostedZone;
    if (hostedZoneId) {
      hostedZone = HostedZone.fromHostedZoneAttributes(this, "ImportedHostedZone", {
        hostedZoneId,
        zoneName: domainName,
      });
    } else {
      hostedZone = new HostedZone(this, "StaticPageHostedZone", {
        zoneName: domainName,
      });
    }

    const errorDocument: string | undefined = this.node.tryGetContext("errorDocument");
    const indexDocument: string = this.node.tryGetContext("indexDocument") ?? "index.html";
    const deploymentPath: string | undefined = this.node.tryGetContext("deploymentPath");

    const certificateArn = props?.certificateArn;

    const s3Bucket = new Bucket(this, "StaticPageBucket", {
      autoDeleteObjects: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      bucketName: `${domainName}-static-page`,
      publicReadAccess: false,
      websiteErrorDocument: errorDocument,
      websiteIndexDocument: indexDocument,
    });

    new CfnOutput(this, "BucketName", {
      value: s3Bucket.bucketName,
      description: "The name of the S3 bucket for the static page",
    });

    const distribution = new Distribution(this, "StaticPageDistribution", {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(s3Bucket),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      certificate: certificateArn ? Certificate.fromCertificateArn(this, "ImportedCertificate", certificateArn) : undefined,
      defaultRootObject: indexDocument,
      domainNames: certificateArn ? [domainName] : undefined,
      enabled: true,
      priceClass: PriceClass.PRICE_CLASS_100,
    });

    new CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
      description: "The ID of the CloudFront distribution",
    });

    if (deploymentPath) {
      const bucketDeployment = new BucketDeployment(this, "DeployStaticWebsite", {
        sources: [Source.asset(deploymentPath)],
        destinationBucket: s3Bucket,
        distribution,
        distributionPaths: ["/*"],
      });

      // Add CloudFront permissions to the deployment role
      bucketDeployment.handlerRole.addToPrincipalPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: [
            'cloudfront:GetInvalidation',
            'cloudfront:CreateInvalidation'
          ],
          resources: [
            `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`
          ]
        })
      );
    }
  
    if (certificateArn) {
      new ARecord(this, "SiteAliasRecord", {
        recordName: domainName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
        zone: hostedZone,
      });
    }
  }
}
