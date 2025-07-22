import { AllowedMethods, Distribution, PriceClass, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { ARecord, HostedZone, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';

export interface StaticPageCdkStackProps extends StackProps {
  certificateArn?: string;
}

export class StaticPageCdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StaticPageCdkStackProps) {
    super(scope, id, props);

    const domainName: string | undefined = this.node.tryGetContext('domainName');
    if (!domainName) {
      throw new Error('Domain name must be provided in the context');
    }

    const hostedZoneId: string | undefined = this.node.tryGetContext('hostedZoneId');
    let hostedZone: IHostedZone | undefined;
    if (!hostedZoneId) {
      hostedZone = new HostedZone(this, 'StaticPageHostedZone', {
        zoneName: domainName,
      });
    } else {
      hostedZone = HostedZone.fromHostedZoneAttributes(this, 'ImportedHostedZone', {
        hostedZoneId,
        zoneName: domainName,
      });
    }

    const errorDocument: string | undefined = this.node.tryGetContext('errorDocument');
    const indexDocument: string = this.node.tryGetContext('indexDocument') ?? 'index.html';
    const deploymentPath: string | undefined = this.node.tryGetContext('deploymentPath');

    let certificateArn = props?.certificateArn;

    const s3Bucket = new Bucket(this, 'StaticPageBucket', {
      autoDeleteObjects: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      bucketName: `${domainName}-static-page`,
      publicReadAccess: false,
      websiteErrorDocument: errorDocument,
      websiteIndexDocument: indexDocument,
    });

    new CfnOutput(this, 'BucketName', {
      value: s3Bucket.bucketName,
      description: 'The name of the S3 bucket for the static page',
    });

    const distribution = new Distribution(this, 'StaticPageDistribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(s3Bucket),
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      certificate: certificateArn ? Certificate.fromCertificateArn(this, 'ImportedCertificate', certificateArn) : undefined,
      defaultRootObject: indexDocument,
      domainNames: certificateArn ? [domainName] : undefined,
      enabled: true,
      priceClass: PriceClass.PRICE_CLASS_100,
    });

    new CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'The ID of the CloudFront distribution',
    });

    if (deploymentPath) {
      new BucketDeployment(this, 'DeployStaticWebsite', {
        sources: [Source.asset(deploymentPath)],
        destinationBucket: s3Bucket,
        distribution,
        distributionPaths: ['/*'],
      });
    }
  
    if (certificateArn) {
      new ARecord(this, 'SiteAliasRecord', {
        recordName: domainName,
        target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
        zone: hostedZone,
      });
    }
  }
}
