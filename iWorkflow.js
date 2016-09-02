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
    console.log('myArgs'+i+ ': ' +myArgs[i]);
  };
};

switch (myArgs[0]) {
  case 'init':
    if (myArgs[1] === 'help' || myArgs.length < 3)  {
      console.log('Usage: ./iWorkflow.js init [host] [username] [password]\n');
      console.log('\tThe \'init\' command retrieves an iWorkflow Auth token and creates the config.js file used by other iWorkflow.js commands');
    }
    else {
      exec_init(myArgs[1],myArgs[2],myArgs[3]);
    }
    break;

  case 'list':
    if (myArgs[0] === 'help' || myArgs.length < 2)  {
      console.log('Usage: ./iWorkflow.js list [tenant|template]\n');
      console.log('\tThe \'list\' command retreives Tenant resource names from iWorkflow.');
    }
    else {
      exec_list(myArgs[1]);
    }
    break;

  case 'deploy':
    if (myArgs[0] === 'help' || myArgs.length < 3)  {
      console.log('Usage: ./iWorkflow.js deploy [input.json]\n');
      console.log('\t The \'deploy\' command is used to deploy an L4 - L7 Service using an iWorflow L4 - L7 Services Template. This command requires a JSON formatted input file.');
    }
    else {
      console.log('This is deploy! Not yet implemented.');
    }
    break;

  case 'delete':
    if (myArgs[0] === 'help' || myArgs.length < 3)  {
      console.log('Usage: ./iWorkflow.js delete [file.json]');
    }
    else {
      console.log('This is delete! Not yet implemented.');
    }
    break;

  default:
    console.log('Usage: iWorkflow.js <command> [options]\n');
    console.log('\tiWorkflow.js help  - prints this help');
    console.log('\tiWorkflow.js init help - how to initialize the environment/configuration');
    console.log('\tiWorkflow.js list help');
    console.log('\tiWorkflow.js deploy help');
    console.log('\tiWorkflow.js delete help');
};

function exec_init (host, username, password) {
  if (config.debug) { console.log('In exec_list with Args: ' +host+ ' ' +username+ ' ' +password)};

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
//    if (error) throw new Error(error);
    if (error && response.statusCode == 401) {
       console.log('Invalid credentials\nError:' +error);
     };

    var token = body.token.token;
    if (config.debug) { console.log('token:' +token)};

    //write to config.js
    var conf_data = 'module.exports = {\n\thost: \''+host+'\',\n\ttoken: \''+token+'\',\n\tstrict: '+config.strict+',\n\tdebug: '+config.debug+'\n};';
    if (config.debug) { console.log(conf_data)};

    fs.writeFile('config.js', conf_data, (err) => {
      if (err) throw err;
      console.log('It\'s saved!');
    });
  });
};

function exec_list (type) {
  if (config.debug) { console.log('In exec_list with Args: ' +type)};

  //build options.
  if (type === 'tenant')  {
    var options = { method: 'GET',
//      url: 'https://'+config.host+'/mgmt/shared/authz/roles',
      url: 'https://'+config.host+'/mgmt/shared/authz/roles?$select=displayName&$filter=displayName%20eq%20\'*Cloud%20Tenant*\'',
//      ?$select=displayName&$filter=displayName%20eq%20\'*Cloud%20Tenant*\'
      headers:
       { 'cache-control': 'no-cache',
         'x-f5-auth-token': config.token }
    };

    request(options, function (error, response, body) {
  //    if (error) throw new Error(error);
      console.log('response.statusCode: ' +response.statusCode);
      if (response.statusCode == '401') {
         console.log('Auth Token expired. Re-initialize with \'iWorkflow.js init\'');
       }
       else if (response.statusCode == '200'){
         console.log('data: ' +JSON.parse(body));
//         console.log('stuff: ' +parsedJSON['displayName']);

       }
       else if (error) throw new Error(error);
    });
  }
  else if (type === 'template') {
    var options = {
      method: 'GET',
      url: 'https://'+config.host+'/mgmt/cm/cloud/tenant/templates/iapp/',
      headers:
       { 'cache-control': 'no-cache',
         'x-f5-auth-token': config.token }
    };

    request(options, function (error, response, body) {
      if (error) throw new Error(error);
      console.log(body.name);
    });

  }
};
