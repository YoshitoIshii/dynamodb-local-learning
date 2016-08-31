var AWS = require("aws-sdk");

var useDynamoLocal = process.env.LC_DYNAMODB == "true";
if(useDynamoLocal) {
    console.info("Connect DynamoDB Local");
    AWS.config.endpoint = new AWS.Endpoint('http://localhost:8000');
}

var main = () => {
    var regions = ["us-east-1", "us-west-1", "us-west-2", "ap-northeast-1"];
    regions.forEach((region)=>{
        deleteAllTables(region);
    });
};

var deleteAllTables = (region) => {
    var awsOptions = {apiVersion: '2012-08-10', region: region};
    var dynamodb = new AWS.DynamoDB(awsOptions);

    var tableList = () => {
        return dynamodb.listTables().promise()
        .then((result)=>{
            return Promise.resolve(result.TableNames)
        });
    };

    var deleteTables = tables => {
        var deleted = 0;
        var tableCnt = tables.length;
        if(tableCnt <= 0) {
            console.log(region + ": No table found");
            return Promise.resolve({});
        }
        var onTableDeleted = (tableName) => {
            console.log(region + ": " + tableName + " deleted.");
            deleted ++;
            if(tables.length > 0) {
                deleteTable(tables.shift());
            } 
            if(tableCnt - deleted <= 0) {
                // last table deleted
                console.log(region + ": All tables(" + deleted + ") deleted");
                return Promise.resolve();
            }
        };
        var deleteTable = (tableName) => {
            console.log(region + ": Deleting " + tableName);
            var params = { TableName: tableName };
            return dynamodb.deleteTable(params).promise()
                .then(result => {
                    return dynamodb.waitFor("tableNotExists", params).promise()
                    .then(result=>{
                        return onTableDeleted(tableName);
                    });
                });
        };
        var limit = 10;
        var loops = (limit > tableCnt) ? tableCnt : limit;
        var tableName;
        for (var i = 0; i < limit && (tableName = tables.shift()) ; i++) {
            deleteTable(tableName);
        }
    };
    return Promise.resolve()
        .then(tableList)
        .then(deleteTables);
};
main();

