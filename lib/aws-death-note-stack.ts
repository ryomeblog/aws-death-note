import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
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
  }
}
