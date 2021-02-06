import handler from "./libs/handler-lib";
import cognito from "./libs/cognito-lib";

export const main = handler(async (event, context) => {
  const params = {
    UserPoolId: process.env.userPoolId,
    Filter: "",
    Limit: 10,
    //AttributesToGet: [],
  };
  const result = await cognito.listUsers(params);

  const usersArray = result.Users;

  for (var i = 0; i < usersArray.length; i++) {
    var attributes = usersArray[i].Attributes;
    for (var j = 0; j < attributes.length; j++) {
      if (attributes[j].Name === "email") {
        usersArray[i].Email = attributes[j].Value;
        break;
      }
    }
  }
  //const result = await dynamoDb.query(params);

  // Return the matching list of items in response body
  return usersArray;
});
