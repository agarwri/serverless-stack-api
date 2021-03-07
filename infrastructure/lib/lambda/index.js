const aws = require('aws-sdk');

exports.handler = async (event, context, callback) => {
  console.log("trying to call the post confirmation function");
  const cognitoidentityserviceprovider = new aws.CognitoIdentityServiceProvider();
  console.log("initialized the provider");
  const addUserParams = {
    GroupName: "DefaultUsers",
    UserPoolId: event.userPoolId,
    Username: event.userName,
  };
  console.log("set up the params");
  try {
    await cognitoidentityserviceprovider.adminAddUserToGroup(addUserParams).promise();
    callback(null, event);
  } catch (e) {
    callback(e);
  }
};
