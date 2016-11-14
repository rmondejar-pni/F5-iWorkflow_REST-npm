//TODO: Add 'iWorkflow.js list cloud'. This is required for the cloud connector in 'deploy' & 'modify' commands. 

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
    if (myArgs[1] === 'help' || myArgs.length < 4)  {
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

  //Build request options.
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
      handle_error('init','http_err',response);
      process.exit();
    };

    var token = body.token.token;
    console.log('Auth token:' +token);

    //build the config
    var conf_data = 'module.exports = {\n\thost: \''+host+'\',\n\ttoken: \''+token+'\',\n\tstrict: '+config.strict+',\n\tdebug: '+config.debug+'\n};';
    if (config.debug) { console.log('DEBUG: Config data: ' +conf_data)  };

    //write the config to config.js
    fs.writeFile('config.js', conf_data, (err) => {
      if (err) throw err;
      console.log('Config data written to ./config.js\n');
    });
  });
};

function exec_list (type,tenant) {
  if (config.debug) { console.log('DEBUG: In exec_list with Args: ' +type)};

  if (type === 'tenant') {
    console.log('Tenants:')
  }
  else if (type === 'template') {
    console.log('Templates:')
  }
  else if (type === 'service') {
    console.log('\'' +tenant+ '\' services: ')
  }
  else {
    console.log('Invalid option.\n');
    process.exit();
  };

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
      handle_error('list','http_err',response);
      process.exit();
    };

    var bodyPar = JSON.parse(body);

    //Process the command options appropriately for each type of object
    for (var i in bodyPar.items)  {
      if (type === 'tenant') {
        console.log('\t' +bodyPar.items[i].displayName);
        if (config.debug) { console.log('\nDEBUG: ' +JSON.stringify(bodyPar.items[i])+ '\n')};
      };
      if (type === 'template') {
        console.log('\t' +bodyPar.items[i].name)
        if (config.debug) { console.log('\nDEBUG: ' +JSON.stringify(bodyPar.items[i])+ '\n')};
      };
      if (type === 'service') {
        console.log('\t' +bodyPar.items[i].name)
        if (config.debug) { console.log('\nDEBUG: ' +JSON.stringify(bodyPar.items[i])+ '\n')};
      };
    };
    console.log('\n');

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

    console.log('Response: \n\n' +JSON.stringify('HTTP Response: ' +response.statusCode+ ' ' +response.message));
    if (config.debug) { console.log('\nDEBUG: response.body' +JSON.stringify(response.body,' ','\t'))}  // Dump ALL the response data

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

    console.log('Response: \n\n' +JSON.stringify('HTTP Response: ' +response.statusCode+ ' ' +response.message));
    if (config.debug) { console.log('\nDEBUG: response.body' +JSON.stringify(response.body,' ','\t'))}  // Dump ALL the response data

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

    if (error)  {
      handle_error('list','node_err',error);
      process.exit();
    }
    else if (response.statusCode !== 200) {
      handle_error('list','http_error',response);
      process.exit();
    };

    console.log('Response: \n\n' +JSON.stringify('HTTP Response: ' +response.statusCode+ ' ' +response.message));
    if (config.debug) { console.log('\nDEBUG: response.body' +JSON.stringify(response.body,' ','\t'))}  // Dump ALL the response data

  });
};

function handle_error (err_from,err_type,err_data)  {

  if (config.debug) { console.log('\nDEBUG: In function handle_error()')  };

  console.log('ERROR condition from command: \'' +err_from+ '\'');

  if (err_type === 'node_err')  {
    console.log('node error: ' +err_data+ '\n');
  }
  else if (err_type === 'http_err')  {

    var errcode = err_data.statusCode;
    var errmsg = err_data.body.message;
    if (config.debug) { console.log('errmsg: ' +errmsg) };

    switch (errcode) {
      case 401:
        if (errmsg.startsWith('Authentication failed')) {
          console.log(errcode+ ' ' +errmsg+ ' Check credentials.\n');
        }
        else if (errmsg.startsWith('Authorization failed')) {
          console.log('HTTP 401 error. Authorization Failed. Do you have the correct permissions/tenant assignment to perform this action.\n');
        };
        break;

      case 500:
        console.log('HTTP 500 error. Refer to iWorkflow log: /var/log/restjavad.0.log\n');
        break;

      case 404:
        if (err_from === ('delete' || 'deploy')) {
          console.log('\nDEBUG: 404 Not found - ' +err_from+ ' unsuccessful.\n');
        };
        break;

      default:
        if (config.debug) {console.log('\nDEBUG: \'' +err_from+ '\' generated error: ' +JSON.stringify(err_data, ' ', '\t'))};
        console.log('HTTP error: ' +errcode);
        console.log('Error message: ' +errmsg+ '\n');
    };

  };
};
