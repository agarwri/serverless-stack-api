import { CfnOutput } from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as path from 'path';
import * as cognito from "@aws-cdk/aws-cognito";
import * as sst from "@serverless-stack/resources";
import CognitoAuthRoles from "./CognitoAuthRoles";

export default class CognitoStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const { bucketArn } = props;

    const app = this.node.root;

    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true, // Allow users to sign up
      autoVerify: { email: true }, // Verify email addresses by sending a verification code
      signInAliases: { email: true }, // Set email as an alias
    });


    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      generateSecret: false, // Don't need to generate secret for web app running on browsers
    });

    const identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      allowUnauthenticatedIdentities: false, // Don't allow unathenticated users
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    const authenticatedRoles = new CognitoAuthRoles(this, "CognitoAuthRole", {
      identityPool,
      userPool,
      userPoolClient,
    });

    authenticatedRoles.role.addToPolicy(
      // IAM policy granting users permission to a specific folder in the S3 bucket
      new iam.PolicyStatement({
        actions: ["s3:*"],
        effect: iam.Effect.ALLOW,
        resources: [
          bucketArn + "/private/${cognito-identity.amazonaws.com:sub}/*",
        ],
      })
    );


    authenticatedRoles.adminRole.addToPolicy(
      // IAM policy granting admin users permission to all folders in the S3 bucket
      new iam.PolicyStatement({
        actions: ["s3:*"],
        effect: iam.Effect.ALLOW,
        resources: [
          bucketArn + "/private/*/*",
        ],
      })
    );

    const defaultUserPoolGroup = new cognito.CfnUserPoolGroup(this, "DefaultUserPoolGroup", {
      userPoolId: userPool.userPoolId,
      description: "default user group",
      groupName: "DefaultUsers",
      precedence: 1,
      roleArn: authenticatedRoles.role.roleArn,
    });

    const adminUserPoolGroup = new cognito.CfnUserPoolGroup(this, "AdminUserPoolGroup", {
      userPoolId: userPool.userPoolId,
      description: "admin user group",
      groupName: "AdminUsers",
      precedence: 0,
      roleArn: authenticatedRoles.adminRole.roleArn,
    });

    const postConfirmationFn = new lambda.Function(this, 'postConfirmationFn', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`${path.resolve(__dirname)}/lambda`)
    });

    userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmationFn);

    // Export values
    new CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      exportName: app.logicalPrefixedName("UserPoolId"),
    });
    new CfnOutput(this, "UserPoolArn", {
      value: userPool.userPoolArn,
      exportName: app.logicalPrefixedName("UserPoolArn"),
    });
    new CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });
    new CfnOutput(this, "IdentityPoolId", {
      value: identityPool.ref,
    });
    new CfnOutput(this, "AuthenticatedRoleName", {
      value: authenticatedRoles.role.roleName,
      exportName: app.logicalPrefixedName("CognitoAuthRole"),
    });
    new CfnOutput(this, "AdminAuthenticatedRoleName", {
      value: authenticatedRoles.adminRole.roleName,
      exportName: app.logicalPrefixedName("CognitoAdminAuthRole"),
    });
  }
}
