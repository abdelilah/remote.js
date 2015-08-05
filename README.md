# Remote.js

Remote.js is a lightweight script that allows you to execute a set of commands on remote servers.

## Disclaimer

Using the tool opens up potential security risks to your servers just like any other tool for remote access. Please use at your own risk!

## Installation

	npm install -g remote.js

## Configuration and usage

Before using Remote.js we first need to create a configuration file that looks like:

```javascript
{
  "port": 3456, // listening port
  "env": { // add your environment variables
  	"NODE_ENV": "production"
  },
  "commands": { // list of commads sets
    "home": {
      "name": "Home Files",
      "commands": [ "ls -l" ]
    },
    "pwd": {
      "name": "Current directory",
      "commands": [ "pwd" ]
    }
  },
  "keys": { // access keys
    "SomeKeyToAccessSomeCommands": [
      "home"
    ],
    "SomeOtherKeyToAccessSomeCommands": [
      "home",
      "pwd"
    ]
  }
}
```

save your file as **config.json** for example, then run this command: 

	remotejs /path/to/your/config.json


## Client apps

* [Chrome Extension (beta)](https://chrome.google.com/webstore/detail/remotejs/jdckgadegaobgoocoebbcmagpagngnnm)
* Android App (coming soon)

## API

Remote.js uses a simple protocol 
using [socket.io](ttp://socket.io) to communicate with remote clients. The following is a simple implementation using socket.io on the client side:

### Connect

```javascript
var socket = io.connect('http://your_host_or_ip:3456');
```

### Authenticate

```javascript
socket.on('connect', function() {
  socket.emit('auth', server.key, function(result){
    $scope.$apply(function(){
      if(result.success){
        result.commands; // contains a list of your commands as defined in your config file
      }

      if(result.error){
        // handle the error
      }
});
```

### Run commands

```javascript
socket.emit('command', command, function(res){
  var commandId = res.command_id;
});
    
socket.on('command_out', function(co) {
  console.log(co.out);
});

socket.on('command_err', function(ce) {
  console.log(ce.err);
});

socket.on('command_end', function(cmdId) {
  console.log("Finished running the command");
});
```

