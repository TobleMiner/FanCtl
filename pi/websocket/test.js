#!/usr/bin/env node

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var conf = require('./config.json');

var i2c = require('i2c-bus');
var i2c1 = i2c.openSync(1);
var buff = Buffer.alloc(1, 0);
i2c1.i2cWriteSync(42, 1, buff);
i2c1.i2cReadSync(42, 1, buff);
console.log(buff[0]);

app.use(express.static(__dirname + '/static'));

app.get('/', function(req, res)
{
	res.sendFile(__dirname + '/static/index.html');
});

io.sockets.on('connection', function(socket)
{
	socket.on('connect', function()
	{
		console.log(socket.client);
	});

	socket.emit('connect', {});
});

server.listen(conf.port);
