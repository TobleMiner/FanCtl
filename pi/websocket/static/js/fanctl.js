class ConnectionStateView
{
	constructor()
	{
		this.indicator = document.getElementById('state-indicator');
	}

	showState(connected)
	{
		if(connected)
			this.indicator.innerText = 'Connection established ✓';
		else
			this.indicator.innerText = 'Connecting ...';
	}

	update(model)
	{
		this.showState(model.connected);
	}
}

class Model
{
	constructor()
	{
		this.connected = false;
		this.fans = [];
	}
}

class Fan
{
	constructor(id, name, dutyCycle, rpm)
	{
		this.id = id;
		this.name = name;
		this.dutyCycle = typeof(dutyCycle) == 'number' ? dutyCycle : 0;
		this.rpm = typeof(rpm) == 'number' ? rpm : 0;
	}
}

class Controller
{
	constructor(model)
	{
		this.model = model;
		this.views = [];
	}

	addView(view)
	{
		this.views.push(view);
		this.update();
	}

	update()
	{
		this.views.forEach(view => view.update(this.model));
	}

	connect()
	{
		this.model.connected = true;
		this.update();
	}

	disconnect()
	{
		this.model.connected = false;
		this.update();
	}

	initFans(fans)
	{
		this.model.fans = [];
		fans.forEach(fan => this.model.fans[fan.id] = new Fan(fan.id, fan.name));
		this.update();
	}

	updateFan(fan)
	{
		var localFan = this.model.fans[fan.id];
		localFan.rpm = fan.rpm;
		localFan.dutyCycle = fan.dutyCycle;
	}
}


$(document).ready(function()
{
	model = new Model();
	controller = new Controller(model);
	var view = new ConnectionStateView();
	controller.addView(view);

	var socket = io.connect();

	socket.on('connect', function()
	{
		console.log("Connected");
		controller.connect();
	});

	socket.on('faninit', function(fans)
	{
		console.log(fans);
		//controller.initFans(fans.fans);
	});

	socket.on('fanupdate', function(fan)
	{
		console.log(msg);
		controller.updateFan(fan);
	});

	socket.on('disconnect', function()
	{
		console.log("Disconnected");
		controller.disconnect();
	});
});
