# Static Page CDK

This CDK project deploys the infrastructure for hosting a static website on AWS with CloudFront and S3.

This is an excellent forkable template for static sites, e.g. landing pages or placeholders.

## Architecture

- **S3 Bucket**: Stores the static website content
- **CloudFront**: Serves the content from the S3 bucket with HTTPS
- **ACM Certificate**: Created in us-east-1 region (required by CloudFront) for HTTPS support
- **Route53**: DNS configuration for the domain

## Project Structure

The project is organized into multiple stacks:

1. **CertificateStack** (`lib/certificate-stack.ts`): Creates the ACM certificate in us-east-1 region
2. **StaticPageCdkStack** (`lib/static-page-cdk-stack.ts`): Creates the S3 bucket, CloudFront distribution, and DNS records

## Reusable Stack Components

### CertificateStack

This stack is responsible for creating and validating the SSL/TLS certificate in the us-east-1 region:

- Creates an ACM certificate for the specified domain name
- Validates the certificate using DNS validation with the specified Route53 hosted zone
- Exports the certificate ARN for use in other stacks
- Always deployed in us-east-1 region (required by CloudFront)

### StaticPageCdkStack

This stack creates all resources needed for hosting a static website:

- **S3 Bucket**: Private bucket with website hosting configuration
- **CloudFront Distribution**: Content delivery network with HTTPS support
- **S3 Deployment**: Automatic deployment of static content from local directory to S3
- **Route53 Records**: DNS A record pointing to the CloudFront distribution
- **Cross-Region Certificate Support**: References the certificate created in us-east-1

## Cross-Region Certificate

This project implements a cross-region certificate setup:

1. The ACM certificate is always created in the us-east-1 region (required by CloudFront) using a dedicated stack
2. The main stack can be deployed in any AWS region
3. The certificate is referenced across regions using its ARN

## Deployment

The application requires some context values for deployment:

```bash
npx cdk deploy --all \
  --context domainName=yourdomain.com \
  --context region=eu-north-1 \
  --context hostedZoneId=Z1234567890ABC \
  --context indexDocument=index.html \
  --context errorDocument=error.html \
  --context deploymentPath=./dist
```

### Context Parameters

|      Key      | Required |  Default  | Description |
| ------------- | -------- | --------- | ----------- |
| `domainName`     | x |               | The domain name for your static website. |
| `region`         | x | `eu-north-1`  | The AWS region for the main stack. If not provided, the default value `eu-north-1` will be used. |
| `hostedZoneId`   |   |               | The ID of the Route53 hosted zone for the domain. If not provided, will create a new hosted zone. |
| `indexDocument`  |   | `index.html`  | The index document for the S3 bucket. |
| `errorDocument`  |   |               | The error document for the S3 bucket. |
| `deploymentPath` |   |               | The local path to the static site files to deploy. If not provided, no files will be uploaded and you have to manage them manually. |

## Customization Options

The StaticPageCdkStack can be customized through props and context:

- **certificateArn**: Pass a custom certificate ARN instead of using the CertificateStack

## CloudFormation Outputs

The stacks expose the following CloudFormation outputs:

- **CertificateArn**: ARN of the ACM certificate in us-east-1
- **BucketName**: Name of the S3 bucket containing the static website
- **DistributionId**: ID of the CloudFront distribution

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
