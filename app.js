var express = require('express')
  , app = express()  
  , server = require('http').createServer(app)
  , path = require('path')
  , io = require('socket.io').listen(server)
  , spawn = require('child_process').spawn;

// all environments
app.set('port', process.env.TEST_PORT || 8080);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//Routes
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

app.get('/remote', function (req, res) {
  res.sendfile(__dirname + '/public/remote.html');
});

app.get('/play/:video_id', function (req, res) {

});

//Socket.io Config
io.set('log level', 2);

server.listen(app.get('port'), function(){
  console.log('Rythembox-Remote Express server listening on port ' + app.get('port'));
});

var ss;
var sc;

//Run and pipe shell script output
function run_shell(cmd, args, cb, end) {
    var spawn = require('child_process').spawn,
        child = spawn(cmd, args),
        me = this;
    child.stdout.on('data', function (buffer) { cb(me, buffer); });
    child.stdout.on('end', end);
}



//Socket.io Server
io.sockets.on('connection', function (socket) {

 socket.on("screen", function(data){
   socket.type = "screen";
   ss = socket;
   console.log("Screen ready...");
 });
 socket.on("remote", function(data){
   socket.type = "remote";
   sc = socket;	
   console.log("Remote ready...");
 });


 socket.on("control", function(data){
	//console.log("Remote Control:\n");
	//console.log(data);
	if (data.action === "debug") {
		console.log("Remote control is synced with node");
	} 
   if(socket.type === "remote"){
     console.log("Control socket is from remote\n");
     if(data.action === "tap"){
         if(ss != undefined){
            ss.emit("controlling", {action:"enter"});
            }
     } else if (data.action === "loader") {
	if (ss != undefined) {
	   ss.emit("controlling", {action:"loader"});
	}
     } else if (data.action === "stoploader") {
	if (ss != undefined) {
	   ss.emit("controlling", {action:"stoploader"});
	}
     } else if (data.action === "select") {
	if (ss != undefined) {
	   ss.emit("controlling", {action:"select"});
	}
     } else if(data.action === "swipeLeft"){
      if(ss != undefined){
          ss.emit("controlling", {action:"goLeft"});
          }
     } else if(data.action === "swipeRight"){
	console.log("Swiped Right\n");
	console.log(data.action);
       if(ss != undefined){
           ss.emit("controlling", {action:"goRight"});
           }
     } else if(data.task === "Play"){
	      if(ss != undefined){
		  var task = data.task;
		  console.log("Tasking with: "+ task);	
		  ss.emit("broadcasting", {task:task});
		  ss.emit("broadcasting", {task:task});
		  socket.emit("control", {task:task});	
		  }
     }
   } else {
	console.log("Control is not from remote\n");
	if(sc != undefined){
		  var task = data.task;
		  console.log("Tasking with: "+ task);	
		  sc.emit("broadcasting", {task:task});
		  sc.emit("loading", {output:task});
		  socket.emit("loading", {output:task});	
	}
	
   }
 });


 socket.on("rhythmbox", function(data){
	var execute_string = "";
	var exec = require('child_process').exec;
    if(data.player === "play-pause"){
    	var com = data.player;
	
	execute_string = "rhythmbox-client --play-pause";
	child =  exec(execute_string, function (error, stdout, stderr){
		

	    });	
	} else if (data.player === "play") {
		execute_string = "rhythmbox-client --play";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			console.log("Error repeating tracks "+ error);
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			console.log("Repeating tracks");
			socket.emit("loading", {output: "playing"});
		}


	    });	
	} else if (data.player === "seek") {
		execute_string = "dbus-send --print-reply --dest=org.mpris.MediaPlayer2.rhythmbox /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Seek int64:10000000";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
		    console.log("Error: "+error);
		} else {
			socket.emit("loading", {output:"seek"});
		}

	    });	
	} else if (data.player === "next") {
		execute_string = "rhythmbox-client --next";
	child =  exec(execute_string, function (error, stdout, stderr){


	    });	
	} else if (data.player === "prev") {
		execute_string = "rhythmbox-client --previous";
	child =  exec(execute_string, function (error, stdout, stderr){


	    });	
	} else if (data.player === "nowplaying") {
		execute_string = "rhythmbox-client --print-playing-format='%ta;%tt;%td;%te'";
	
          exec(execute_string, function (error, stdout, stderr){
		// socket.emit("loading",{output: stdout.toString()});
		 if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
		    info = stdout.split(";");
		    //var Obj = '{"artist":"cuntfoo","title":"foobar"}';
		    if (info[3] !== undefined) {	
		    	var Obj = 	'{"artist":"'+escape(info[0])+'","title":"'+escape(info[1])+'","duration":"'+escape(info[2])+'","elapsed":"'+escape(info[3].trim())+'"}';
		    	socket.emit("loading", {output: Obj});	
		     } else {
			  return;
			}
		     }
		    });	
	} else if (data.player === "vol-up") {
		execute_string = "rhythmbox-client --volume-up";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			
			socket.emit("loading", {output: "Volume: "+ stdout.toString()+""});
			socket.emit('rhythmbox',{player:"print-volume"});
			socket.emit("loading", {output: "Volume is turning up"});
		}

	    });
	 } else if (data.player === "vol-down") {
		execute_string = "rhythmbox-client --volume-down";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			
			socket.emit("loading", {output: "Volume: "+ stdout.toString()+""});
			socket.emit('rhythmbox',{player:"print-volume"});
			socket.emit("loading", {output: "Volume is turning down"});
		}

	    });	
	} else if (data.player === "print-volume") {
		execute_string = "rhythmbox-client --print-volume";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			console.log("Error getting volume");
			socket.emit("loading", {output: "Error fetching data"});
		} else {
			//console.log("Vol: "+stdout.toString());
			socket.emit("loading", {volume:stdout.toString()});
		}

	    });	
	}  else if (data.player === "pause") {
		execute_string = "rhythmbox-client --pause";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			socket.emit("loading", {output: "pause"});
		}

	    });	
	} else if (data.player === "mute") {
		execute_string = "rhythmbox-client --set-volume 0";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			socket.emit("loading", {output: "muted"});
		}

	    });	
	} else if (data.player === "repeat") {
		execute_string = "rhythmbox-client --repeat";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			console.log("Error repeating tracks "+ error);
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			//console.log("Repeating tracks");
			socket.emit("loading", {output: "repeat"});
		}

	    });	
	} else if (data.player === "shuffle") {
		execute_string = "rhythmbox-client --shuffle";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			socket.emit("loading", {output: "shuffle"});
		}

	    });	
	} else if (data.player === "noshuffle") {
		execute_string = "rhythmbox-client --no-shuffle";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			socket.emit("loading", {output: "noshuffle"});
		}

	    });	
	} else if (data.player === "norepeat") {
		execute_string = "rhythmbox-client --no-repeat";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			socket.emit("loading", {output: "norepeat"});
		}

	    });	
	} else if (data.player === "rate_0") {
		execute_string = "rhythmbox-client --set-rating 0";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			socket.emit("loading", {output: "rate_0"});
		}

	    });	
	} else if (data.player === "rate_1") {
		execute_string = "rhythmbox-client --set-rating 1";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			socket.emit("loading", {output: "rate_1"});
		}

	    });	
	} else if (data.player === "rate_2") {
		execute_string = "rhythmbox-client --set-rating 2";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			socket.emit("loading", {output: "rate_2"});
		}

	    });	
	} else if (data.player === "rate_3") {
		execute_string = "rhythmbox-client --set-rating 3";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			socket.emit("loading", {output: "rate_3"});
		}

	    });	
	} else if (data.player === "rate_4") {
		execute_string = "rhythmbox-client --set-rating 4";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			socket.emit("loading", {output: "rate_4"});
		}

	    });	
	} else if (data.player === "rate_5") {
		execute_string = "rhythmbox-client --set-rating 5";
	child =  exec(execute_string, function (error, stdout, stderr){
		if (error !== null) {
			console.log("Error rating "+error);
			socket.emit("loading", {outpuut: "Error fetching data"});
		} else {
			console.log("Rating song with 5");
			socket.emit("loading", {output: "rate_5"});
		}

	    });	
	}
	  
	
    

 });

socket.on("broadcast", function(data){
	if(data != undefined){
	console.log("Broadcasting :"+ data.task);
	console.log(data);	
		var task = data.task;
		sc.emit("loading", {output:task});
		
	}
});
});
