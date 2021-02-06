import AWS from "aws-sdk";

const cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

export default {
  listUsers: (params) => cognitoidentityserviceprovider.listUsers(params).promise(),
};
