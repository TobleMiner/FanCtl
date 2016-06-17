#!/usr/bin/env node

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var conf = require('./config.json');

var FanCtl = require('./fans.js');

var fanctl = new FanCtl(conf.i2cbus, conf.controllers);

app.use(express.static(__dirname + '/static'));

app.get('/', function(req, res)
{
	res.sendFile(__dirname + '/static/index.html');
});

io.sockets.on('connection', function(socket)
{
	socket.on('connect', function()
	{
		console.log('Client connected');
	});

	socket.emit('connect', {});

	socket.emit('faninit', {'server' : fanctl.uuid,
		'fans' : Object.keys(fanctl.fanindex)});

	fanctl.on('update', function()
	{
		for(key in fanctl.fanindex)
			if(fanctl.fanindex.hasOwnProperty(key))
				socket.emit('fanupdate', fanctl.fanindex[key].getFanData());
	});

	socket.on('setrpm', function(msg)
	{
		fanctl.getFanByUUID(msg.fanid).setRpm(msg.rpm);
	});

	socket.on('setpwm', function(msg)
	{
		fanctl.getFanByUUID(msg.fanid).setDutyCycle(msg.pwm);
	});

	socket.on('disconnect', function()
	{
		console.log('Client disconnected');
	});
});

server.listen(conf.port);
