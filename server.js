var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path')
var port = process.env.PORT || 5000;



app.use(express.static(path.join(__dirname, '/')));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/pages/client.html');
});

function randomstr(len) {
	return Math.random().toString(36).substring(len)
}

io.on('connection', function(socket){
	socket.on('message', function(msg, username){
		io.emit('message', msg, username);
	});
	socket.on('logon', function(){
		pass = randomstr(7) + randomstr(7) + "==="
		console.log(pass)
		io.emit('login', pass)
	})
});

http.listen(port, function(){
	console.log('listening on *:' + port);
});