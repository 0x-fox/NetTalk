var express = require('express');
var sha256 = require('js-sha256');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path')
var port = process.env.PORT || 5000;
var users = []
const fs = require('fs');
var banned = []
var connectedips = []
function lrem(arr, value) {

   return arr.filter(function(ele){
       return ele != value;
   });

}
class User {
	constructor(name) {
		this.name = name;
		users.push(this);
	}
}

var filterHTML = function(s){return s.replace(/>/g,"&gt;").replace(/</g,"&lt;")};

app.use(express.static(path.join(__dirname, '/')));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/log.html');
});

app.get('/pages/process_get', function(req, res){
    response = {
		author : req.query.author,
		username : req.query.user,
        reason : req.query.reason
    }
	console.log(response)
    res.send("Reported. <a href='javascript:window.history.back();'>Back</a>");
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
	var address = socket.handshake.address.replace('::ffff:', '').replace('::', '')
	connectedips.push(address)
	socket.on('checkConnection', function(username){
		m=0
		for(i=0; i<connectedips.length; i++){
			if(connectedips[i] == address){
				m++
			}
		}

		if(m>1){
			socket.emit('connectionResult', true)
			console.log(true)
		} else {
			console.log(false)
			socket.emit('connectionResult', false)
		}
	})
	socket.on('get_username', function(username){
		try{
		username = filterHTML(username);
		}catch(e){};
		user = new User(username);
		console.log(user.name + " is " + address)
	})
	socket.on('logon', function(username){
		try{
		username = filterHTML(username);
		}catch(e){};
	})
	socket.on('message', function(msg){
		try{
		msg = filterHTML(msg);
		}catch(e){};
		io.emit('message', "<br>"+user.name+"> <b><span style='txt'>"+msg+"</b></span>");
		try{
		console.log(msg.replace("<br>", "").replace("<b>", "").replace("<span style='txt'>", "").replace("</b>", "").replace("</span>", "").replace("<br>", ""))
		}catch(e){};
	});
	socket.on('disconnect', function(){
		socket.emit('disconnect_', user)
		users.splice(users.indexOf(user), 1)
		connectedips.splice(connectedips.indexOf(address), 1)
		try{
		console.log('disconnect ' + address + " (" + user.name + ")")
		}catch(e){}
	})
	socket.on('request_user_list', function() {
		usernamelist = [];
		for (let i = 0; i < users.length; i++) {
			usernamelist.push(users[i].name)
		}
		socket.emit('receive_user_list', usernamelist.join());
	})
	socket.on('check', function(hash){
		var pass = 0;
		hashes = JSON.parse(fs.readFileSync('hashes.json'));
		for(i of Object.keys(hashes)){
			if(i == hash){
				pass = 1
			}
		}
		if(pass == 0){
			socket.emit("checkF")
		}else{
			socket.emit("checkS")
		}
	})
	socket.on('getUser', function(hash){
		var pass = 0;
		var h;
		hashes = JSON.parse(fs.readFileSync('hashes.json'));
		for(i of Object.keys(hashes)){
			if(i == hash){
				h = i
				pass = 1
			}
		}
		if(pass == 0){
			socket.emit("receiveUser", false)
		}else{
			socket.emit("receiveUser", hashes[h])
		}
	})
	socket.on('CheckUserExists', function(data){
		hashes = JSON.parse(fs.readFileSync('hashes.json'));
		u = 0
		for(i of Object.values(hashes)){
			u++
			if(i == data[0]){
				socket.emit('checkF')
				break;
			}else{
				hashes[sha256(data[0]+data[1])] = data[0]
				fs.writeFileSync('hashes.json', JSON.stringify(hashes, null, "\t"));
				socket.emit('checkS')
			}
		}
		if(u==0){
			hashes[sha256(data[0]+data[1])] = data[0]
			fs.writeFileSync('hashes.json', JSON.stringify(hashes, null, "\t"));
			socket.emit('checkS')
		}
			
	})
});


http.listen(port, function(){
	console.log('listening on *:' + port);
});
