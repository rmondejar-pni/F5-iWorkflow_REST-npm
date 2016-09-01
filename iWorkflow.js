//iWorkflow.js
const fs = require('fs');
var request = require('request');
var config = require('./config.js')

// Set default options
this.host   = (typeof config.host   === 'string')  ? config.host   : '127.0.0.1';
this.strict = (typeof config.strict === 'boolean') ? config.strict : true;
this.debug  = (typeof config.debug  === 'boolean') ? config.debug  : false;
// Allow self-signed cert if strict not set
// https://github.com/joyent/node/pull/4023
process.env.NODE_TLS_REJECT_UNAUTHORIZED = (this.strict) ? "1" : "0";

var myArgs = process.argv.slice(2);

if (config.debug) {
  for (var i = 0; i < myArgs.length; i++)  {
    console.log('myArgs'+i+ ': ' +myArgs[i]);
  };
};

switch (myArgs[0]) {
  case 'init':
    if (myArgs[1] === 'help' || myArgs.length < 3)  {
      console.log('Usage: ./iWorkflow.js init [host] [username] [password]')
    }
    else {
      console.log('Firing inti topedos');
      exec_init(myArgs[1],myArgs[2],myArgs[3]);
    }
    break;

  case 'list':
    if (myArgs[0] === 'help' || myArgs.length < 2)  {
      console.log('Usage: ./iWorkflow.js list [tenant|template]')
    }
    else {
      console.log('Firing list torpedos! Not yet implemented.');
//      exec_list(myArgs[2]);
    }
    break;

    case 'deploy':
      if (myArgs[0] === 'help' || myArgs.length < 3)  {
        console.log('Usage: ./iWorkflow.js deploy [file.json]')
      }
      else {
        console.log('This is deploy! Not yet implemented.');
      }
      break;

      case 'delete':
        if (myArgs[0] === 'help' || myArgs.length < 3)  {
          console.log('Usage: ./iWorkflow.js delete [file.json]')
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
    json: true };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    var token = body.token.token;
    if (this.debug) { console.log('token:' +token)};

    //write to config.js
    var conf_data = 'module.exports = {\n\thost: \''+host+'\',\n\ttoken: \''+token+'\',\n\tstrict: '+config.strict+',\n\tdebug: '+config.debug+'\n};';
    if (this.debug) { console.log(conf_data)};

    fs.writeFile('config.js', conf_data, (err) => {
      if (err) throw err;
      console.log('It\'s saved!');
    });
  });
};

function exec_list (type) {
  console.log('In exec_list with args: nothing to do');
};
