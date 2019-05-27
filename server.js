var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path')
var port = process.env.PORT || 5000;
var users = []
var banned = []

class User {
	constructor(name) {
		this.id = (users.length + 1);
		this.name = name;
		users.push(this);
	}
}

var Core_Bot = new User("Core Bot");

app.use(express.static(path.join(__dirname, '/')));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/pages/client.html');
});

app.get('/pages/process_get', function(req, res){
    response = {
		author : req.query.author,
		username : req.query.user,
        reason : req.query.reason
    }
	//console.log(response)
    res.end(JSON.stringify(response));
});

function randomstr(len) {
	return Math.random().toString(36).substring(len)
}

io.on('connection', function(socket){
	for(i=0;i<banned.length; i++){
		if(banned[i].toString() == socket.handshake.address.replace('::ffff:', '')){
			socket.emit('message', "You are banned from NetTalk. <br>", "Core Bot");
			socket.emit('message', "If you think this is a mistake, appeal on our <a href=\"http://discord.gg/EGXMExr\">discord server</a>.", "Core Bot");
			socket.disconnect()
			return 0;
		}
	}
	var user;
	var address = socket.handshake.address;
	//console.log(address)
	socket.on('get_username', function(username){
		user = username
		user = new User(user);
		//console.log(users)
	})
	socket.on('logon', function(username){
		io.send('<br><b>' + username + '</b> has ntered the chatroom.');
		io.send('<br><b>Core Bot</b>> Hello, ' + username + "!")
	})
	socket.on('message', function(msg, username){
		io.emit('message', msg, username);
		//console.log(msg.replace("<br>", "").replace("<b>", "").replace("<span style='txt'>", "").replace("</b>", "").replace("</span>", "").replace("<br>", ""))
	});
	socket.on('disconnect', function(){
		io.send('<br><b>' + user.name + '</b> has left the chatroom.');
		io.send('<br><b>Core Bot</b>> Bye, ' + user.name + "!")
		socket.emit('disconnect_', user)
		users.splice(users.indexOf(user), 1)
		//console.log(users)
		//console.log('disconnect ' + address)
	})
	socket.on('connection', function(socket){
		io.emit('connection', socket)
	})
	socket.on('reconnect', function(socket){
		io.emit('connection', socket)
	})
	socket.on('request_user_list', function() {
		usernamelist = [];
		for (let i = 0; i < users.length; i++) {
			usernamelist.push(users[i].name)
		}
		socket.emit('receive_user_list', usernamelist.join());
	})
});

http.listen(port, function(){
	console.log('listening on *:' + port);
});
