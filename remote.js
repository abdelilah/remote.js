#! /usr/bin/env node

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);


var colors = require('colors');
var async = require('async');
var _ = require('lodash');

var cp = require('child_process');
var path = require('path');
var fs = require('fs');



console.log('------------ Remote.js ------------'.magenta);

var configPath = path.resolve(process.argv[2] || (process.cwd() + '/config.json'));
var config = {};
try{
  config = new String(fs.readFileSync(configPath));
  config = JSON.parse(config);
}
catch(e){
  console.log('Failed to parse config file'.red);
  throw e
}


// Combine ENV variables
var env_all = process.env;
if(config.env){
  _.forEach(config.env, function(v, k){
    env_all[k] = v;
  });
}


var port = Number(config.port || 3456);
http.listen(port, function(){
  console.log('Listening on *:' + port);
});


io.on('connection', function(socket){
  var isAuthenticated = false;
  var commands = {};
  console.log(('A client is connected').yellow);

  socket.on('auth', function(key, cb){
    if(config.keys[key]){
      console.log('Authentication success'.bold.green);
      isAuthenticated = true;

      _.forEach(config.keys[key], function(cmd){
        commands[cmd] = config.commands[cmd];
      });

      cb({
        success: "Authenticated successfully",
        commands: commands
      });
    }
    else{
      console.log(('Failed authentication for ' + key.bold).red);
      cb({
        error: "Invalid authentication key"
      });
    }
  });


  socket.on('command', function(command, callback){
    console.log(('Requested to run '+command.bold+' command').yellow);

    if(!isAuthenticated){
      callback({
        error: "Not authenticated"
      });
      return;
    }

    // Generate command ID
    var cmdId = Date.now();
    var commandsToRun = commands[command].commands;
    var executedCommands = 0;
    var cwd = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

    callback({command_id: cmdId});


    async.whilst(
      function(){ return executedCommands < commandsToRun.length; },
      function(nextCommand){
        var cmdExp = commandsToRun[executedCommands].split(' ');
        var cmd = cmdExp.splice(0, 1) + "";

        executedCommands++;

        console.log('Spawning: ' + cmd.magenta);
        console.log('Args: ');
        console.log(cmdExp);

        // Handle change of directory
        if(cmd == "cd"){
          cwd = cmdExp.join(' ');
          nextCommand();
          return;
        }


        try{

          var n = cp.spawn(cmd, cmdExp, {cwd: cwd, env: env_all});

          n.stdout.on('data', function(data) {
            socket.emit('command_out', {
              command_id: cmdId,
              command: command,
              out: new String(data)
            });
          });

          n.stderr.on('data', function(data) {
            console.log(data+"");
            socket.emit('command_err', {
              command_id: cmdId,
              command: command,
              err: new String(data)
            });
          });

          n.on('error', function (err) {
            console.log('An error occured'.red);
            console.log(err);
            nextCommand();
          });
          n.on('end', function (code) {
            nextCommand();
          });
          n.on('close', function (code) {
            nextCommand();
          });

        }
        catch(e){
          console.log('Failed to run command'.red);
          console.log(e);
        }
        
      },
      function(err){
        socket.emit('command_end', cmdId);
      }
    );
    
  });


  socket.on('disconnect', function(){
    isAuthenticated = false;
    commands = {};
    console.log('Client disconnected'.red);
  });
});

