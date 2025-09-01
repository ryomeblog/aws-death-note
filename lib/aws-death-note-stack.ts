import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as fs from 'fs';
import * as path from 'path';

export class AwsDeathNoteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // AppSync API の作成
    const api = new appsync.GraphqlApi(this, 'DeathNoteApi', {
      name: 'aws-death-note-api',
      definition: appsync.Definition.fromFile(path.join(__dirname, '../schema/schema.graphql')),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
        },
      },
    });

    // AppSync APIの削除ポリシーを設定
    (api.node.defaultChild as cdk.CfnResource).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // NONEデータソースの作成
    const noneDataSource = api.addNoneDataSource('NoneDataSource', {
      name: 'NoneDataSource',
      description: 'None data source for direct resolver'
    });

    // AppSync Function の作成
    const helloFunction = new appsync.AppsyncFunction(this, 'HelloFunction', {
      api,
      dataSource: noneDataSource,
      name: 'HelloFunction',
      code: appsync.Code.fromAsset(path.join(__dirname, '../resolvers/Query.hello.js')),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
    });

    // パイプラインリゾルバーの作成
    new appsync.Resolver(this, 'HelloResolver', {
      api,
      typeName: 'Query',
      fieldName: 'hello',
      code: appsync.Code.fromInline(`
        export function request(ctx) {
          return {};
        }
        
        export function response(ctx) {
          return ctx.prev.result;
        }
      `),
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      pipelineConfig: [helloFunction],
    });

    // API Key の出力
    new cdk.CfnOutput(this, 'GraphQLAPIUrl', {
      value: api.graphqlUrl,
      description: 'GraphQL API URL',
    });

    new cdk.CfnOutput(this, 'GraphQLAPIKey', {
      value: api.apiKey || '',
      description: 'GraphQL API Key',
    });

    // S3バケット（静的サイトホスティング用）の作成
    const bucket = new s3.Bucket(this, 'StaticSiteBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: false, // CloudFront経由のみアクセス可能
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    // Basic認証用のCloudFront Function
    const basicAuthFunctionCode = fs.readFileSync(path.join(__dirname, '../functions/basic-auth.js'), 'utf8');
    const basicAuthFunction = new cloudfront.Function(this, 'BasicAuthFunction', {
      code: cloudfront.FunctionCode.fromInline(basicAuthFunctionCode),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // CloudFront Functionの削除ポリシーを設定
    (basicAuthFunction.node.defaultChild as cdk.CfnResource).applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // CloudFrontディストリビューションの作成
    const distribution = new cloudfront.Distribution(this, 'StaticSiteDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          {
            function: basicAuthFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/error.html',
          ttl: cdk.Duration.seconds(10),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: '/error.html',
          ttl: cdk.Duration.seconds(10),
        },
      ],
    });

    // S3バケットポリシーを追加してCloudFrontからのアクセスを許可
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [`${bucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
          },
        },
      })
    );

    // 静的ファイルをS3バケットにデプロイ
    new s3deploy.BucketDeployment(this, 'DeployStaticSite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../static'))],
      destinationBucket: bucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });

    // 出力値の追加
    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: distribution.domainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: bucket.bucketName,
      description: 'S3 Bucket Name for Static Site',
    });

    new cdk.CfnOutput(this, 'S3BucketUrl', {
      value: `https://${distribution.domainName}`,
      description: 'Static Site URL (with Basic Authentication)',
    });
  }
}
