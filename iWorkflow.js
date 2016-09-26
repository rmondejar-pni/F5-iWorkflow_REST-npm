//TODO: review error handling
//TODO: create 'handle_error' function. Use switch to handle HTTP statusCode's. Implement across all commands.


//iWorkflow.js
const fs = require('fs');
var request = require('request');
var config = require('./config.js') //Collect environment options

// Allow self-signed cert if strict not set
// https://github.com/joyent/node/pull/4023
process.env.NODE_TLS_REJECT_UNAUTHORIZED = (config.strict) ? "1" : "0";

var myArgs = process.argv.slice(2);

if (config.debug) {
  for (var i = 0; i < myArgs.length; i++)  {
    console.log('DEBUG: myArgs'+i+ ': ' +myArgs[i]);
  };
};

switch (myArgs[0]) {
  case 'init':
    if (myArgs[1] === 'help' || myArgs.length < 3)  {
      console.log('Usage: ./iWorkflow.js init [host] [username] [password]\n');
      console.log('\tThe \'init\' command retrieves an iWorkflow Auth token, and Tenant list, and creates the config.js file used by other iWorkflow.js commands');
    }
    else {
      exec_init(myArgs[1],myArgs[2],myArgs[3]);
    }
    break;

  case 'list':
    if ((myArgs[1] === 'help' || myArgs.length < 2) || (myArgs[1] === 'service' && myArgs.length < 3))  {
      console.log('Usage: ./iWorkflow.js list [tenant|template|service tenant_name]\n');
      console.log('\tThe \'list\' command retreives Tenant resource names, Template resource names, or deployed L4-L7 Services from iWorkflow.');
      console.log('\tThe \'service\' option requires a Tenant name. For example: \'iWorkflow.js list service myTenant1\'');
    }
    else {
      exec_list(myArgs[1],myArgs[2]);
    }
    break;

  case 'deploy':
    if (myArgs[1] === 'help' || myArgs.length < 3)  {
      console.log('Usage: ./iWorkflow.js deploy [tenant] [deploy_input.json]\n');
      console.log('\t The \'deploy\' command is used to deploy an L4 - L7 Service using an iWorflow L4-L7 Services Template. This command requires a JSON formatted input file.');
    }
    else {
      exec_deploy(myArgs[1],myArgs[2]);
    }
    break;

    case 'modify':
      if (myArgs[1] === 'help' || myArgs.length < 4)  {
        console.log('Usage: ./iWorkflow.js modify [tenant] [service] [modify_input.json]\n');
        console.log('\t The \'modify\' command is used to deploy an L4-L7 Service using an iWorkflow L4-L7 Services Template. This command requires a JSON formatted input file.');
      }
      else {
        exec_modify(myArgs[1],myArgs[2],myArgs[3]);
      }
      break;

  case 'delete':
    if (myArgs[1] === 'help' || myArgs.length < 3)  {
      console.log('Usage: ./iWorkflow.js delete [tenant] [service]');
      console.log('\t CAUTION: The \'delete\' command also removes the objects created on BIG-IP devices. Application using those objects will become unavailable.');
    }
    else {
      exec_delete(myArgs[1],myArgs[2]);
    }
    break;

  default:
    console.log('Usage: iWorkflow.js <command> [options]\n');
    console.log('\tiWorkflow.js help  - prints this help');
    console.log('\tiWorkflow.js init help - required to initialize the environment/configuration');
    console.log('\tiWorkflow.js list help');
    console.log('\tiWorkflow.js deploy help');
    console.log('\tiWorkflow.js modify help');
    console.log('\tiWorkflow.js delete help');
};

function exec_init (host, username, password) {
  if (config.debug) { console.log('DEBUG: In exec_init with Args: ' +host+ ' ' +username+ ' ' +password)};

  //build options.
  var options = {
    method: 'POST',
    url: 'https://'+host+'/mgmt/shared/authn/login',
    headers:
     { 'cache-control': 'no-cache',
       'content-type': 'application/json' },
    body:
     { username: username,
       password: password,
       loginProvidername: 'tmos' },
    json: true
  };

  request(options, function (error, response, body) {
    if (error)  {
      handle_error('init','node_err',error);
      process.exit();
    }
    else if (response.statusCode !== 200) {
      handle_error('init','http_error',response);
      process.exit();
    };

    var token = body.token.token;
    if (config.debug) { console.log('DEBUG: You got a shiny new token:' +token)};
    //build the config
    var conf_data = 'module.exports = {\n\thost: \''+host+'\',\n\ttoken: \''+token+'\',\n\tstrict: '+config.strict+',\n\tdebug: '+config.debug+'\n};';
    if (config.debug) { console.log('DEBUG: Config data: ' +conf_data)  };

    //write the config to config.js
    fs.writeFile('config.js', conf_data, (err) => {
      if (err) throw err;
      console.log('Config data written to ./config.js!');
    });
  });
};

function exec_list (type,tenant) {
  if (config.debug) { console.log('DEBUG: In exec_list with Args: ' +type)};

  //build options.
  var options = { method: 'GET',
    headers:
     { 'cache-control': 'no-cache',
       'x-f5-auth-token': config.token
     }
  };

  //Handle the different types of 'list [options]'
  //Querystring to filter on tenants with (Cloud Tenant) in the name, to exlude built-in tenant accounts.
  if (type === 'tenant') { options.url = 'https://'+config.host+'/mgmt/shared/authz/roles?$filter=displayName%20eq%20\'*Cloud%20Tenant*\'' };
  if (type === 'template') { options.url = 'https://'+config.host+'/mgmt/cm/cloud/tenant/templates/iapp/' };
  if (type === 'service') { options.url = 'https://'+config.host+'/mgmt/cm/cloud/tenants/'+tenant+'/services/iapp/' };

  request(options, function (error, response, body) {
    if (error)  {
      handle_error('list','node_err',error);
      process.exit();
    }
    else if (response.statusCode !== 200) {
      handle_error('list','http_error',response);
      process.exit();
    };

    var bodyPar = JSON.parse(body);

    //Process the command options appropriately for each type of object
    for (var i in bodyPar.items)  {
      if (type === 'tenant') { console.log('Tenants: ' +bodyPar.items[i].displayName) };
      if (type === 'template') { console.log('Templates: ' +bodyPar.items[i].name) };
      if (type === 'service') { console.log('Services: ' +bodyPar.items[i].name) };
    };
  });
};

function exec_deploy (tenant, input)  {
  if (config.debug) { console.log('DEBUG: In exec_deploy with Args: ' +tenant+ ' ' +input)};

  var data = fs.readFileSync(input);

  var options = {
    method: 'POST',
    url: 'https://'+config.host+'/mgmt/cm/cloud/tenants/'+tenant+'/services/iapp',
    headers:
     { 'cache-control': 'no-cache',
       'content-type': 'application/json',
       'x-f5-auth-token': config.token },
    body: JSON.parse(data),
    json: true
  };

  if (config.debug) {
    console.log('DEBUG: \n');
    console.log('options.method: ' +options.method);
    console.log('options.url: ' +options.url);
    console.log('options.headers: ' +JSON.stringify(options.headers, ' ', '\t'));  //this is an array.
    console.log('options.body: ' +JSON.stringify(options.body, ' ', '\t'));  //this is an array.
    console.log('options.json: ' +options.json);
  };

  request(options, function (error, response, body) {
    if (error)  {
      handle_error('deploy','node_err',error);
      process.exit();
    }
    else if (response.statusCode !== 200) {
      handle_error('deploy','http_error',response);
      process.exit();
    };
    if (config.debug) { console.log('\nDEBUG: response.body' +JSON.stringify(response.body,' ','\t'))}
    console.log('Response: \n\n' +JSON.stringify('HTTP Response: ' +response.statusCode+ ' ' +response.message));
  });
};

function exec_modify (tenant,service,input) {
  //implement L4-L7 service PATCH. Use add-pool example
  if (config.debug) { console.log('\nDEBUG: In exec_deploy with Args: ' +tenant+ ' ' +service+ ' ' +input)};

  var data = fs.readFileSync(input);

  var options = {
    method: 'PUT',
    url: 'https://'+config.host+'/mgmt/cm/cloud/tenants/'+tenant+'/services/iapp/'+service,
    headers:
     { 'cache-control': 'no-cache',
       'content-type': 'application/json',
       'x-f5-auth-token': config.token },
    body: JSON.parse(data),
    json: true
  };

  if (config.debug) {
    console.log('\nDEBUG: \n');
    console.log('options.method: ' +options.method);
    console.log('options.url: ' +options.url);
    console.log('options.headers: ' +JSON.stringify(options.headers));  //this is an array.
    console.log('options.body: ' +JSON.stringify(options.body));  //this is an array.
    console.log('options.json: ' +options.json);
  };

  request(options, function (error, response, body) {
    if (error)  {
      handle_error('modify','node_err',error);
      process.exit();
    }
    else if (response.statusCode !== 200) {
      handle_error('modify','http_error',response);
      process.exit();
    };

    if (config.debug) { console.log('\nDEBUG: response.body' +JSON.stringify(response.body))};
  });
};

function exec_delete (tenant, service) {

  if (config.debug) { console.log('\nDEBUG: In exec_deploy with Args: ' +tenant)};

  var options = {
    method: 'DELETE',
    url: 'https://'+config.host+'/mgmt/cm/cloud/tenants/'+tenant+'/services/iapp/'+service,
    headers:
     { 'cache-control': 'no-cache',
       'content-type': 'application/json',
       'x-f5-auth-token': config.token },
    json: true
  };

  if (config.debug) {
    console.log('\nDEBUG: \n');
    console.log('options.method: ' +options.method);
    console.log('options.url: ' +options.url);
    console.log('options.headers: ' +JSON.stringify(options.headers));  //this is an array.
    console.log('options.json: ' +options.json);
  };

  request(options, function (error, response, body) {
    if (config.debug) { console.log('\nDEBUG: response.statusCode: ' +response.statusCode) };
    if (response.statusCode == '401') {
      console.log('401 - Unauthorized: Auth Token may have expired. Re-initialize with \'iWorkflow.js init\'');
    }
    else if (response.statusCode == '200')  {
      if (config.debug) { console.log('\nDEBUG: Deletion successful. response.message' +JSON.stringify(response.message))};
    }
    else if (response.statusCode == '404')  {
      if (config.debug) { console.log('\nDEBUG: Deletion unsuccessful. 404 Not found. Check the service: \'' +service+ '\' exists using \'iWorkflow.js list service ' +service+ '\'')};
    }
    else if (error) throw new Error(error);
  });
};

function handle_error (err_from,err_type,err_data)  {
//TODO: recieve error and iterate through the errors arrays looking for data. May need to stringify some of them
  if (config.debug) { console.log('\nDEBUG: In function handle_error()')  };

  console.log('ERROR condition from command: \'' +err_from+ '\'');
  //Get VERBOSE in debug mode.

  if (err_type === 'node_error')  {
    console.log('node error: ' +err_data);
  }
  else if (err_type === 'http_error')  {
    console.log('HTTP error: ' +err_data.statusCode);
    console.log('Error message: ' +err_data.body.message);
  };

  if (config.debug) {console.log('\nDEBUG: \'' +err_from+ '\' generated error: ' +JSON.stringify(err_data, ' ', '\t'))};
};
