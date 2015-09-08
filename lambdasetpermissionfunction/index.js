var aws = require("aws-sdk");
 
exports.handler = function(event, context) {

    console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));
    
    // For Delete requests, immediately send a SUCCESS response.
    if (event.RequestType == "Delete") {
        sendResponse(event, context, "SUCCESS");
        return;
    }
 
    var response_status = "SUCCESS"
    ,   response_data = {}
    ,   function_name = event.ResourceProperties.FunctionName
    ,   principal = event.ResourceProperties.Principal
    ,   action = event.ResourceProperties.Action
    ,   source_arn = event.ResourceProperties.SourceArn
    ,   lambda = new aws.Lambda({region: event.ResourceProperties.Region});
    
    var params = {
      Action: action,
      FunctionName: function_name,
      Principal: principal,
      SourceArn: source_arn,
      StatementId: function_name
    };
    lambda.addPermission(params, function(err, data) {
        if (err) {
            response_data = {Error: "Add Permissions call failed"};
            console.log(response_data.Error + ":\n", err);
        }
      else {   
            console.log(data);
            response_status = "SUCCESS";
        }
        sendResponse(event, context, response_status, response_data);
    });
};

// Send response to the pre-signed S3 URL 
function sendResponse(event, context, response_status, response_data) {
 
    var responseBody = JSON.stringify({
        Status: response_status,
        Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
        PhysicalResourceId: context.logStreamName,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: response_data
    });
 
    console.log("RESPONSE BODY:\n", responseBody);
 
    var https = require("https");
    var url = require("url");
 
    var parsedUrl = url.parse(event.ResponseURL);
    var options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: "PUT",
        headers: {
            "content-type": "",
            "content-length": responseBody.length
        }
    };
 
    console.log("SENDING RESPONSE...\n" );
 
    var request = https.request(options, function(response) {
        console.log("STATUS: " + response.statusCode);
        console.log("HEADERS: " + JSON.stringify(response.headers));
        context.done();
    });
 
    request.on("error", function(error) {
        console.log("sendResponse Error:" + error);
        context.done();
    });

    request.write(responseBody);
    request.end();
}
