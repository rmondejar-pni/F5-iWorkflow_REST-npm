#README for f5-iworkflow_REST-npm
Node package to simplify communication with the F5 iWorkflow REST API.

iWorkflow.js is an iWorkflow REST helper. Use it as a shortcut to perform common actions against the iWorkflow REST API.

Or just use it for examples when writing your own code. I'm not precious about sharing code. :)

Enjoy!

Usage: `iWorkflow.js <command> [options]`

##Commands:
* `iWorkflow.js help` - prints command list
* `iWorkflow.js init` - initialize the environment and build ./config.js
* `iWorkflow.js list` - list iWorkflow resources. Supports Tenants, Templates, deployed Services.
* `iWorkflow.js deploy` - deploy L4-L7 Services
* `iWorkflow.js delete` - delete a deployed L4-L7 Service (deletes from the BIG-IP & iWorkflow)

##Command help:
* `iWorkflow.js help`
* `iWorkflow.js init help`
* `iWorkflow.js list help`
* `iWorkflow.js deploy help`
* `iWorkflow.js delete help`

### iWorkflow.js init
Used to initialize the configuration and obtain an auth token. This command generates the 'config.js' content.

`node iWorkflow.js init [ip_address] [username] [password]`

- ip_address - of the iWorkflow platform
- username - Tenant username to obtain the auth token (which will be written to config.js)
- password - Tenant password for auth token.

You are required to execute the 'init' command before using the other iWorkflow.js commands. When the Auth Token expires you will receive a 401 - Unauthorized message upon which you must execute the 'init' command once again.

An example config.js file:

```
module.exports = {
	host: '10.128.1.130',
	token: 'AOHGNHMWHZWLO7QZWYARPTHXL7',
	strict: false,
	debug: true
};
```

### iWorkflow.js list
The list command it executed to retrieve lists of iWorkflow objects. The objects include: Tenants, Templates, and deployed Services.

`node iWorkflow.js list [tenant|template|service] [options]`

The 'tenant' and 'template' object types require no further options. However, the 'service' object type requires that you specify fir which 'tenant' you would like to list the deployed L4-L7 services. For example, to list the services deployed under 'myTenant1', you would execute:

`node iWorkflow.js list services myTenant1`

### iWorkflow.js deploy
The deploy command is used to create a deployed L4-L7 service using an L4-L7 Service Template. This command requires the inclusion of a JSON formatted input file. The input file will be used to fill out the options within the L4-L7 template. An example input.json is included in the examples directory.

`node iWorkflow.js deploy [tenant] [input_file]`

Example deployment to the 'myTenant1' tenant using a JSON formatted input file named 'input.json':

`node iWorkflow.js deploy myTenant1 ./input.json`

You will find an example input file in the './examples' directory of this repository.

### iWorkflow.js delete
The delete command is used to remove a deployed L4-L7 Service.
